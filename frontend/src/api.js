// API functions for Dvorfs Downloader

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_BACKEND;

// Function to fetch video information
export async function fetchVideoInfo(url) {
  const response = await fetch(`${API_BASE_URL}/video/info`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch video information");
  }

  return response.json();
}

// Function to download video/audio
export async function downloadVideo(url, quality, formatType) {
  const response = await fetch(`${API_BASE_URL}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      quality,
      format_type: formatType,
    }),
  });

  if (!response.ok) {
    throw new Error("Download failed");
  }

  return response.blob();
}

// Export base URL for debugging or other uses
export { API_BASE_URL };
