"use client";

import { useState, useEffect } from "react";
// import * as anime from "animejs";

interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize: number;
  format_note: string;
  vcodec: string;
  acodec: string;
  quality: number;
  format_type: string;
}

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  view_count: number;
  formats: VideoFormat[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_BACKEND || "http://localhost:8000";
const DOWNLOAD_URL = process.env.NEXT_PUBLIC_API_URL_DOWNLOAD || "http://localhost:8000";

export default function Home() {
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [formatType, setFormatType] = useState<string>("video");
  const [isLoading, setIsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Clear error and success messages when URL changes
    if (error || success) {
      setError("");
      setSuccess("");
    }
  }, [url]);

  const availableFormats = videoInfo?.formats.filter(format => format.format_type === formatType) || [];

  const handleFormatTypeChange = (newFormatType: string) => {
    setFormatType(newFormatType);
    // Update selected format when format type changes
    const formats = videoInfo?.formats.filter(format => format.format_type === newFormatType) || [];
    if (formats.length > 0) {
      setSelectedFormat(formats[0].format_id);
    } else {
      setSelectedFormat("");
    }
  };

  const fetchVideoInfo = async () => {
    setIsLoading(true);
    setError("");
    setVideoInfo(null);
    setSelectedFormat("");

    try {
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

      const data = await response.json();
      setVideoInfo(data);

      // Auto-select best available format
      const formats = data.formats.filter((format: VideoFormat) => format.format_type === formatType);
      if (formats.length > 0) {
        setSelectedFormat(formats[0].format_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadVideo = async () => {
    if (!videoInfo || !selectedFormat) return;

    setDownloading(true);
    setError("");

    try {
      const selectedFormatData = availableFormats.find(format => format.format_id === selectedFormat);
      if (!selectedFormatData) return;

      const response = await fetch(`${DOWNLOAD_URL}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          quality: selectedFormatData.quality.toString(),
          format_type: formatType,
        }),
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Create download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${videoInfo.title}.${
        formatType === "audio" ? "m4a" : "mp4"
      }`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setSuccess("✅ Download completed successfully!");
    } catch (err) {
      setError("❌ " + (err instanceof Error ? err.message : "Download failed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            DVORFS DOWNLOADER
          </h1>
          <p className="text-sm opacity-70" style={{ color: "var(--foreground)" }}>
            Download YouTube videos effortlessly
          </p>
        </div>

        <div
          className="shadow-xl rounded-2xl p-8 border-2"
          style={{
            backgroundColor: "var(--primary)",
            borderColor: "rgba(0,0,0,0.1)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}
        >
          <div className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                YouTube URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-4 border-2 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--foreground)",
                  borderColor: "rgba(0,0,0,0.2)",
                  fontFamily: "Arial, sans-serif"
                }}
              />
            </div>

            <button
              onClick={fetchVideoInfo}
              disabled={isLoading || !url}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                backgroundColor: "var(--secondary)",
                color: "var(--primary)",
                fontFamily: "Arial, sans-serif"
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                "Get Video Info"
              )}
            </button>

            <div>
              <label htmlFor="format" className="block text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                Format Type
              </label>
              <select
                id="format"
                value={formatType}
                onChange={(e) => handleFormatTypeChange(e.target.value)}
                className="w-full p-4 border-2 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--foreground)",
                  borderColor: "rgba(0,0,0,0.2)",
                  fontFamily: "Arial, sans-serif"
                }}
              >
                <option value="video">🎥 Video (MP4)</option>
                <option value="audio">🎵 Audio (M4A/MP3)</option>
              </select>
            </div>

            {availableFormats.length > 0 && (
              <div>
                <label htmlFor="quality-select" className="block text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                  Quality Options
                </label>
                <select
                  id="quality-select"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full p-4 border-2 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--foreground)",
                    borderColor: "rgba(0,0,0,0.2)",
                    fontFamily: "Arial, sans-serif"
                  }}
                >
                  {availableFormats.map((format) => (
                    <option key={format.format_id} value={format.format_id}>
                      {format.format_type === "audio"
                        ? `🎵 ${format.format_note} (${format.ext.toUpperCase()})`
                        : `🎥 ${format.quality}p ${format.resolution ? `• ${format.resolution}` : ""} • ${(format.filesize / 1048576).toFixed(1)} MB • ${format.ext.toUpperCase()}`
                      }
                    </option>
                  ))}
                </select>
              </div>
            )}

            {videoInfo && (
              <div
                className="p-6 rounded-xl border-2"
                style={{
                  backgroundColor: "var(--secondary)",
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "var(--primary)"
                }}
              >
                <h3 className="font-bold text-lg mb-3 line-clamp-2">{videoInfo.title}</h3>
                <div className="text-sm space-y-2">
                  <p>👤 <span className="font-medium">{videoInfo.uploader}</span></p>
                  <p>👁️ <span className="font-medium">{videoInfo.view_count?.toLocaleString()}</span> views</p>
                  <p>⏱️ <span className="font-medium">{Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')}</span> min</p>
                </div>
                {videoInfo.thumbnail && (
                  <div className="mt-4">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            )}

            {error && (
              <div
                className="p-4 rounded-xl border-2 text-center font-medium"
                style={{
                  backgroundColor: "#ffe6e6",
                  borderColor: "#ff9999",
                  color: "#cc0000"
                }}
              >
                ❌ {error}
              </div>
            )}

            {success && (
              <div
                className="p-4 rounded-xl border-2 text-center font-medium"
                style={{
                  backgroundColor: "#e6ffe6",
                  borderColor: "#99ff99",
                  color: "#00cc00"
                }}
              >
                {success}
              </div>
            )}

            <button
              onClick={downloadVideo}
              disabled={!videoInfo}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                backgroundColor: videoInfo ? "var(--secondary)" : "rgba(28,28,28,0.3)",
                color: "var(--primary)",
                fontFamily: "Arial, sans-serif"
              }}
            >
              {downloading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </span>
              ) : videoInfo ? "⬇️ Download Now" : "Select Video to Download"
              }
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-sm opacity-60" style={{ color: "var(--foreground)" }}>
          With ❤️ by horvitz
        </div>
      </div>
    </div>
  );
}
