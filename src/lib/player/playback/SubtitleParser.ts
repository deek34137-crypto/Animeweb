import type { ParsedSubtitleTrack, ParsedCue, SubtitleFragment } from '../types';

export interface SubtitleParser {
  parse(content: string): Promise<ParsedSubtitleTrack>;
}

// ─── Timestamp Parser ────────────────────────────────────────────────────────

function parseTime(timeStr: string): number {
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  
  if (parts.length === 3) {
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  } else {
    seconds = parseFloat(clean);
  }
  
  return (isNaN(hours) ? 0 : hours) * 3600 + 
         (isNaN(minutes) ? 0 : minutes) * 60 + 
         (isNaN(seconds) ? 0 : seconds);
}

// ─── Markup / Tag Parser ─────────────────────────────────────────────────────

export function parseMarkup(text: string): SubtitleFragment[] {
  const root: SubtitleFragment = { type: 'text', text: '', children: [] };
  const stack: SubtitleFragment[] = [root];
  
  // Regex to split text by HTML-style tags
  const tagRegex = /(<\/?[a-zA-Z0-9\.\-]+(?: [^>]+)?>)/g;
  const parts = text.split(tagRegex);
  
  for (const part of parts) {
    if (!part) continue;
    
    if (part.startsWith('<') && part.endsWith('>')) {
      const isClose = part.startsWith('</');
      const tagContent = isClose ? part.slice(2, -1) : part.slice(1, -1);
      const spaceIdx = tagContent.indexOf(' ');
      const tagNameAndAttrs = spaceIdx === -1 ? tagContent : tagContent.slice(0, spaceIdx);
      const tagAttrStr = spaceIdx === -1 ? '' : tagContent.slice(spaceIdx + 1);
      
      let tagName = tagNameAndAttrs;
      let className = '';
      if (tagName.includes('.')) {
        const dots = tagName.split('.');
        tagName = dots[0];
        className = dots.slice(1).join(' ');
      }
      
      const normalizedTag = tagName.toLowerCase();
      
      if (isClose) {
        if (stack.length > 1) {
          stack.pop();
        }
      } else {
        let type: SubtitleFragment['type'] = 'text';
        const attributes: Record<string, string> = {};
        
        if (normalizedTag === 'b') type = 'bold';
        else if (normalizedTag === 'i') type = 'italic';
        else if (normalizedTag === 'u') type = 'underline';
        else if (normalizedTag === 'ruby') type = 'ruby';
        else if (normalizedTag === 'rt') type = 'rt';
        else if (normalizedTag === 'c') {
          type = 'class';
          if (className) attributes.class = className;
        } else if (normalizedTag === 'v') {
          type = 'voice';
          if (tagAttrStr) attributes.voice = tagAttrStr;
        } else if (normalizedTag === 'lang') {
          type = 'class';
          if (tagAttrStr) attributes.lang = tagAttrStr;
        }
        
        const newFrag: SubtitleFragment = {
          type,
          text: '',
          children: [],
          attributes: Object.keys(attributes).length > 0 ? attributes : undefined
        };
        
        const current = stack[stack.length - 1];
        current.children = current.children || [];
        current.children.push(newFrag);
        stack.push(newFrag);
      }
    } else {
      const current = stack[stack.length - 1];
      current.children = current.children || [];
      current.children.push({
        type: 'text',
        text: part
      });
    }
  }
  
  return root.children || [];
}

// ─── Base Blocks Parser ─────────────────────────────────────────────────────

function parseBlocks(content: string): ParsedCue[] {
  const cues: ParsedCue[] = [];
  const normalized = content.replace(/\r\n/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let timeLineIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }
    
    if (timeLineIndex === -1) continue;
    
    try {
      const timeLine = lines[timeLineIndex];
      const timeParts = timeLine.split('-->');
      if (timeParts.length < 2) continue;
      
      const startTime = parseTime(timeParts[0]);
      const endTimePart = timeParts[1].trim().split(/\s+/)[0];
      const endTime = parseTime(endTimePart);
      
      const textLines = lines.slice(timeLineIndex + 1);
      const rawText = textLines.join('\n').trim();
      
      if (!rawText) continue;
      
      cues.push({
        id: timeLineIndex > 0 ? lines[0].trim() : undefined,
        startTime,
        endTime,
        fragments: parseMarkup(rawText)
      });
    } catch {
      // Gracefully recover and ignore malformed cues
    }
  }
  
  // Sort cues by start time just to guarantee binary search works
  return cues.sort((a, b) => a.startTime - b.startTime);
}

// ─── WebVTT Parser ──────────────────────────────────────────────────────────

export class VttParser implements SubtitleParser {
  async parse(content: string): Promise<ParsedSubtitleTrack> {
    // Strip WEBVTT header details if present
    let cleanContent = content;
    const headerMatch = content.match(/^WEBVTT[^\n]*/);
    if (headerMatch) {
      cleanContent = content.slice(headerMatch[0].length).trim();
    }
    
    const cues = parseBlocks(cleanContent);
    return { cues };
  }
}

// ─── SRT Parser ─────────────────────────────────────────────────────────────

export class SrtParser implements SubtitleParser {
  async parse(content: string): Promise<ParsedSubtitleTrack> {
    const cues = parseBlocks(content);
    return { cues };
  }
}
