/**
 * Safely sanitizes markdown content by stripping HTML tags,
 * event handlers, and dangerous URI schemes (e.g., javascript:)
 * while preserving code block contents and clean markdown.
 */
export function sanitizeMarkdown(content: string): string {
  if (!content) return '';

  const lines = content.split('\n');
  let inCodeBlock = false;

  const processedLines = lines.map(line => {
    // Check for markdown code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      return line;
    }

    // Keep code block contents exactly as-is, since they are rendered as inert text
    if (inCodeBlock) {
      return line;
    }

    let cleaned = line;

    // 1. Strip script tags and their inner content
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // 2. Strip all other HTML tags (e.g. <iframe>, <img onerror...>)
    cleaned = cleaned.replace(/<\/?[a-zA-Z][^>]*>/g, '');

    // 3. Prevent javascript:, data:, or vbscript: links inside markdown link brackets
    cleaned = cleaned.replace(/\[([^\]]*)\]\((javascript|data|vbscript):[^\)]*\)/gi, '[$1](#)');

    // 4. Remove inline event handler attributes if any slipped through
    cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*(["'])(.*?)\1/gi, '');
    cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*[^\s>]+/gi, '');

    return cleaned;
  });

  return processedLines.join('\n');
}
