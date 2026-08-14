// src/services/metadata/imageDownloader.ts
import * as dns from 'dns';
import * as http from 'http';
import * as https from 'https';
import { logger } from '@/lib/logger';

function isPrivateIp(ip: string): boolean {
  // IPv4 Private Ranges
  if (
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('169.254.') ||
    ip.startsWith('192.168.')
  ) {
    return true;
  }
  
  if (ip.startsWith('172.')) {
    const parts = ip.split('.').map(Number);
    if (parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
  }

  // IPv6 Private / Loopback Ranges
  if (
    ip === '::1' ||
    ip.toLowerCase().startsWith('fc00:') ||
    ip.toLowerCase().startsWith('fe80:')
  ) {
    return true;
  }

  return false;
}

// Custom DNS lookup function that checks for private IP ranges to prevent SSRF and DNS Rebinding
const secureLookup = (hostname: string, options: any, callback: any) => {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err, null, null);
    if (address && isPrivateIp(address)) {
      return callback(new Error(`SSRF Prevention: Access to private IP ${address} is forbidden`), null, null);
    }
    callback(null, address, family);
  });
};

const httpAgent = new http.Agent({ lookup: secureLookup, keepAlive: false });
const httpsAgent = new https.Agent({ lookup: secureLookup, keepAlive: false });

interface DownloadResult {
  buffer: Buffer;
  mimeType: string;
}

/**
 * Validates image magic bytes (MIME sniffing)
 */
function verifyMagicBytes(buffer: Buffer): string {
  if (buffer.length < 4) {
    throw new Error('Sniff error: Buffer too small to verify magic bytes');
  }

  const hex = buffer.toString('hex', 0, 8).toUpperCase();

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (hex.startsWith('89504E470D0A1A0A')) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (hex.startsWith('FFD8FF')) {
    return 'image/jpeg';
  }
  // GIF: 47 49 46 38 ("GIF8")
  if (hex.startsWith('47494638')) {
    return 'image/gif';
  }
  // WebP: RIFF .... WEBP (RIFF is 52 49 46 46, WEBP is 57 45 42 50)
  if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') {
    return 'image/webp';
  }

  throw new Error('MIME validation failed: Buffer magic bytes do not match approved image types (PNG, JPG, GIF, WEBP)');
}

/**
 * Fetches an image securely with DNS rebinding guards, size limits, redirect limits, and magic byte checking.
 */
export async function downloadImageSecurely(urlStr: string, redirectCount = 0): Promise<DownloadResult> {
  if (redirectCount > 3) {
    throw new Error('Redirect limit exceeded: Max 3 redirects allowed');
  }

  const parsedUrl = new URL(urlStr);
  const isHttps = parsedUrl.protocol === 'https:';
  const agent = isHttps ? httpsAgent : httpAgent;

  return new Promise((resolve, reject) => {
    const requestOptions: http.RequestOptions = {
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      agent,
      headers: {
        'User-Agent': 'AniWorld-Metadata-Downloader/1.0',
        'Accept': 'image/*'
      },
      timeout: 5000 // 5 seconds connection timeout
    };

    const reqFn = isHttps ? https.request : http.request;

    const req = reqFn(requestOptions, (res) => {
      // Handle redirects manually to enforce limit and run security checks on target URLs
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, urlStr).toString();
        logger.info(`SecureDownloader: Following redirect to ${redirectUrl}`);
        resolve(downloadImageSecurely(redirectUrl, redirectCount + 1));
        return;
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Server returned HTTP status ${res.statusCode}`));
        return;
      }

      const contentLength = res.headers['content-length'];
      if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        reject(new Error('Payload limit exceeded: Image size exceeds 5MB limit'));
        return;
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;

      res.on('data', (chunk: Buffer) => {
        totalBytes += chunk.length;
        if (totalBytes > 5 * 1024 * 1024) {
          res.destroy(); // Break the connection
          reject(new Error('Payload limit exceeded: Streaming size exceeded 5MB size limit'));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        const fullBuffer = Buffer.concat(chunks);
        try {
          const mimeType = verifyMagicBytes(fullBuffer);
          resolve({ buffer: fullBuffer, mimeType });
        } catch (sniffErr) {
          reject(sniffErr);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
}
