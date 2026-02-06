interface ExtractedFrames {
  frames: string[]; // base64-encoded JPEG frames
  thumbnail?: string; // base64-encoded JPEG thumbnail
}

export async function extractVideoFrames(
  url: string,
  maxFrames = 5
): Promise<ExtractedFrames> {
  const vpsUrl = process.env.VPS_FRAME_EXTRACTOR_URL;
  const apiKey = process.env.VPS_API_KEY;

  if (!vpsUrl || !apiKey) {
    throw new Error("VPS_FRAME_EXTRACTOR_URL and VPS_API_KEY must be configured");
  }

  const response = await fetch(`${vpsUrl}/api/extract-frames`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ url, maxFrames }),
    signal: AbortSignal.timeout(180_000), // 3 min total timeout
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body.error || `VPS frame extraction failed (${response.status})`
    );
  }

  const data = await response.json();
  return {
    frames: data.frames,
    thumbnail: data.thumbnail,
  };
}
