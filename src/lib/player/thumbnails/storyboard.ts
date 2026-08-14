export interface StoryboardCue {
  startTime: number; // in seconds
  endTime: number;   // in seconds
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Parses timestamp string (e.g. "00:01:23.456" or "01:23.456") to seconds.
 */
function parseTimestamp(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  let hrs = 0;
  let mins = 0;
  let secs = 0;

  if (parts.length === 3) {
    hrs = parseInt(parts[0], 10);
    mins = parseInt(parts[1], 10);
    secs = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    mins = parseInt(parts[0], 10);
    secs = parseFloat(parts[1]);
  } else {
    secs = parseFloat(parts[0]);
  }

  return hrs * 3600 + mins * 60 + secs;
}

/**
 * WebVTT Storyboard parser.
 */
export function parseStoryboardVTT(vttContent: string, baseUrl: string = ""): StoryboardCue[] {
  const cues: StoryboardCue[] = [];
  const lines = vttContent.replace(/\r\n/g, "\n").split("\n");

  let currentCue: Partial<StoryboardCue> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Ignore header
    if (line === "WEBVTT" || line === "") continue;

    // Time ranges: "00:00.000 --> 00:02.000"
    if (line.includes("-->")) {
      const parts = line.split("-->");
      currentCue.startTime = parseTimestamp(parts[0]);
      currentCue.endTime = parseTimestamp(parts[1]);
      continue;
    }

    // Image URL cues: "sprite.jpg#xywh=0,0,120,68"
    if (line.includes("#xywh=")) {
      const [urlPart, coordsPart] = line.split("#xywh=");
      const coords = coordsPart.split(",").map((c) => parseInt(c, 10));

      // Resolve relative image URLs against baseUrl
      let imageUrl = urlPart;
      if (baseUrl && !urlPart.startsWith("http") && !urlPart.startsWith("/")) {
        imageUrl = `${baseUrl}/${urlPart}`;
      }

      if (
        currentCue.startTime !== undefined &&
        currentCue.endTime !== undefined &&
        coords.length === 4
      ) {
        cues.push({
          startTime: currentCue.startTime,
          endTime: currentCue.endTime,
          imageUrl,
          x: coords[0],
          y: coords[1],
          width: coords[2],
          height: coords[3],
        });
      }
      currentCue = {};
    }
  }

  return cues;
}

/**
 * Search storyboard cues for the cue matching target time.
 */
export function getStoryboardCueAt(cues: StoryboardCue[], time: number): StoryboardCue | null {
  if (!cues || cues.length === 0) return null;

  // Binary search for optimal performance
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cue = cues[mid];

    if (time >= cue.startTime && time <= cue.endTime) {
      return cue;
    } else if (time < cue.startTime) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return null;
}
