"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '../components/LanguageSwitcher';
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

const DEBUG_VAR: Record<string, unknown> = {};
if (typeof window !== 'undefined') {
  // Для отладки: добавляем доступность переменной в window
  (DEBUG_VAR as Record<string, unknown>).API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_BACKEND || "http://localhost:8000";
  (window as typeof window & { API_BASE_URL?: string }).API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_BACKEND || "http://localhost:8000";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_BACKEND || "http://localhost:8000";
const DOWNLOAD_URL = API_BASE_URL;

export default function Home() {
  const t = useTranslations();

  const [url, setUrl] = useState("");
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
      if (err instanceof Error) {
        if (err.message === "Failed to fetch video information") {
          setError(t('failedToFetchVideoInfo'));
        } else if (err.message === "Download failed") {
          setError(t('downloadFailed'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('anErrorOccurred'));
      }
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

      setSuccess(t('downloadCompleted'));
    } catch (err) {
      setError("❌ " + (err instanceof Error ? err.message : "Download failed"));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-30">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
            {t('title')}
          </h1>
          <p className="text-sm opacity-70" style={{ color: "var(--foreground)" }}>
            {t('subtitle')}
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
                {t('youtubeUrl')}
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-4 border-2 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                placeholder={t('urlPlaceholder')}
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
                  {t('loading')}
                </span>
              ) : (
                t('getVideoInfo')
              )}
            </button>

            <div>
              <label htmlFor="format" className="block text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                {t('formatType')}
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
                <option value="video">{t('videoFormat')}</option>
                <option value="audio">{t('audioFormat')}</option>
              </select>
            </div>

            {availableFormats.length > 0 && (
              <div>
                <label htmlFor="quality-select" className="block text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                  {t('qualityOptions')}
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
                        ? t('audioQuality', { formatNote: format.format_note, ext: format.ext.toUpperCase() })
                        : t('videoQuality', {
                            quality: format.quality,
                            resolution: format.resolution || "",
                            size: (format.filesize / 1048576).toFixed(1),
                            ext: format.ext.toUpperCase(),
                            muteIndicator: format.acodec === "none" ? t('muteIndicator') : ""
                          })
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
                  <p>{t('uploader', { uploader: videoInfo.uploader })}</p>
                  <p>{t('views', { views: videoInfo.view_count?.toLocaleString() || '0' })}</p>
                  <p>{t('duration', { 
                    minutes: Math.floor(videoInfo.duration / 60), 
                    seconds: (videoInfo.duration % 60).toString().padStart(2, '0') 
                  })}</p>
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
                  {t('downloading')}
                </span>
              ) : videoInfo ? t('downloadNow') : t('selectVideoToDownload')
              }
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-sm opacity-60" style={{ color: "var(--foreground)" }}>
          {t('withLove')}
        </div>
      </div>

      {/* Support Button - Fixed position bottom right */}
      <a
        href="https://t.me/DvorfsSupport"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 group"
        title="Technical Support"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-110 hover:shadow-3xl"
          style={{
            backgroundColor: "var(--secondary)",
            color: "var(--primary)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}
        >
          <svg
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
            className="transition-transform duration-300 group-hover:rotate-12"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-.962 4.093-1.362 5.426-.168.568-.476.701-.76.711-.901.04-1.59-.614-2.456-1.205-1.071-.78-1.674-1.265-2.71-2.029-.627-.459-.224-.713.137-.962.34-.233.85-.49.85-.49s.285-.108.444-.207c.07-.05.131-.116.177-.189.531-.878-.5-1.518-.5-1.518s-.66-.407-2.058-.407c-1.397 0-1.93.407-1.93.407s-.84.641-.5 1.518c.045.073.107.139.177.189.159.099.444.207.444.207s.51.257.85.49c.361.23.404.695.137.962-.627.459-2.71 2.029-2.71 2.029s-.901.796-2.456 1.205c-.284-.01-.592-.143-.76-.711-.4-1.333-1.182-4.709-1.362-5.426-.11-.448.138-.808.651-.819.493-.01 1.07.582 1.07.582s.387.146.429.146.135-.062.335-.146.492-.146.492-.146.577-.594 1.07-.582c.513.011.761.371.651.819z"/>
          </svg>
        </div>

        {/* Tooltip */}
        <div
          className="absolute bottom-full right-0 mb-2 px-3 py-1 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap"
          style={{
            backgroundColor: "var(--foreground)",
            color: "var(--primary)"
          }}
        >
          Техническая поддержка
          <div
            className="absolute top-full right-4 mt-1 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent"
            style={{ borderTopColor: "var(--foreground)" }}
          ></div>
        </div>
      </a>
    </div>
  );
}
