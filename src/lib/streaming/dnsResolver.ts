import https from 'https';
import dns from 'dns';

/**
 * Custom DNS Lookup function to resolve specific streaming hosts using 1.1.1.1 / 8.8.8.8
 */
const customLookup = (hostname: string, options: any, callback: any) => {
  const bypassHosts = ['anineko.to', 'vibeplayer.site', 'bibiemb.xyz', 'otakuhg.site', 'otakuvid.online'];
  
  // Normalize callback and options arguments to handle polymorphic calls safely
  let actualOptions = options;
  let actualCallback = callback;
  if (typeof options === 'function') {
    actualCallback = options;
    actualOptions = {};
  }
  if (typeof actualOptions === 'number') {
    actualOptions = { family: actualOptions };
  }

  if (bypassHosts.some(h => hostname.endsWith(h))) {
    const resolver = new dns.Resolver();
    resolver.setServers(['1.1.1.1', '8.8.8.8']);
    
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        // Fallback to native system DNS
        dns.lookup(hostname, options, callback);
      } else {
        if (actualOptions.all) {
          const results = addresses.map(addr => ({ address: addr, family: 4 }));
          actualCallback(null, results);
        } else {
          actualCallback(null, addresses[0], 4);
        }
      }
    });
  } else {
    // Non-bypass hosts use standard lookup
    dns.lookup(hostname, options, callback);
  }
};

const agent = new https.Agent({
  lookup: customLookup,
  keepAlive: true,
});

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * Custom HTTPS fetch wrapper that uses the DNS bypass agent and handles redirects
 */
export function fetchHtmlWithDns(urlStr: string, options: FetchOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    
    const reqOptions: https.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://anineko.to/',
        ...(options.headers || {}),
      },
      agent: agent,
      timeout: options.timeout || 8000,
    };

    const req = https.request(reqOptions, (res) => {
      // Handle HTTP redirects (301, 302, 307, 308)
      if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, urlStr).toString();
        }
        fetchHtmlWithDns(redirectUrl, options).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode && res.statusCode >= 400) {
        const err: any = new Error(`HTTP Error ${res.statusCode} for ${urlStr}`);
        err.status = res.statusCode;
        err.url = urlStr;
        reject(err);
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (err: any) => {
      err.url = urlStr;
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      const err: any = new Error(`Request timeout for ${urlStr}`);
      err.status = 408;
      err.url = urlStr;
      reject(err);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}
