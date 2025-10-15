from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import yt_dlp
import os
import uuid
from urllib.parse import urlparse, parse_qs
from pydantic import BaseModel, validator
import re

app = FastAPI(title="Dvorfs Downloader Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3030", "http://127.0.0.1:3000", "*"],  # Frontend URLs and docker
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoInfoRequest(BaseModel):
    url: str

    @validator('url')
    def validate_url(cls, v):
        if not v.startswith('https://www.youtube.com/watch?v='):
            raise ValueError('Only YouTube URLs are supported')
        # Extract video ID
        parsed = urlparse(v)
        if parsed.hostname != 'www.youtube.com' or parsed.path != '/watch':
            raise ValueError('Invalid YouTube URL format')
        query = parse_qs(parsed.query)
        if 'v' not in query:
            raise ValueError('Missing video ID')
        return v

class DownloadRequest(BaseModel):
    url: str
    quality: str = "720"  # 144, 240, 360, 480, 720, 1080, 1440, 2160, best
    format_type: str = "video"  # video or audio

def extract_video_info(url: str):
    """Extract video information using yt-dlp"""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            return {
                'title': info.get('title', 'Unknown'),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail', ''),
                'uploader': info.get('uploader', 'Unknown'),
                'view_count': info.get('view_count', 0),
                'formats': [
                    {
                        'format_id': f.get('format_id', ''),
                        'ext': f.get('ext', ''),
                        'resolution': f.get('resolution', ''),
                        'filesize': f.get('filesize', 0),
                        'format_note': f.get('format_note', ''),
                        'vcodec': f.get('vcodec', ''),
                        'acodec': f.get('acodec', ''),
                        'quality': f.get('height', 0) if f.get('height') else 0,
                        'format_type': 'audio' if f.get('vcodec') == 'none' else 'video'
                    }
                    for f in info.get('formats', [])
                    if f.get('ext') in ['mp4', 'm4a', 'webm']
                ]
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to extract video info: {str(e)}")

def download_video(url: str, format_id: str, file_path: str):
    """Download video using yt-dlp"""
    ydl_opts = {
        'format': format_id,
        'outtmpl': file_path,
        'quiet': True,
        'no_warnings': True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.download([url])
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=400, detail=f"Download failed: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Welcome to Dvorfs Downloader Backend"}

@app.post("/video/info")
async def get_video_info(request: VideoInfoRequest):
    """Get video information and available formats"""
    info = extract_video_info(request.url)
    return info

@app.post("/download")
async def download_video_endpoint(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Download video/audio file"""
    info = extract_video_info(request.url)

    # Select format based on quality and type
    selected_format = None
    target_quality = int(request.quality) if request.quality.isdigit() else None

    if request.format_type == "audio":
        # Select best audio quality
        audio_formats = [f for f in info['formats'] if f['format_type'] == 'audio']
        if audio_formats:
            selected_format = max(audio_formats, key=lambda x: x.get('filesize', 0))
    else:
        # Video download - select by quality
        video_formats = [f for f in info['formats'] if f['format_type'] == 'video']
        if target_quality:
            # Find exact quality or closest higher
            matching = [f for f in video_formats if f['quality'] == target_quality]
            if matching:
                selected_format = max(matching, key=lambda x: x.get('filesize', 0))
            else:
                # Find next higher quality or best available
                higher_qualities = [f for f in video_formats if f['quality'] >= target_quality]
                if higher_qualities:
                    selected_format = min(higher_qualities, key=lambda x: x['quality'])
                else:
                    selected_format = max(video_formats, key=lambda x: x['quality'])
        else:
            # Best video quality
            selected_format = max(video_formats, key=lambda x: x['quality'])

    if not selected_format:
        raise HTTPException(status_code=400, detail="No suitable format found")

    # Generate filename with correct extension
    ext = selected_format['ext']
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = f"/tmp/{filename}"

    try:
        # Download with selected format
        download_video(request.url, selected_format['format_id'], file_path)

        # Check if file was created
        if not os.path.exists(file_path):
            raise HTTPException(status_code=400, detail="Download failed - file not created")

        # Add cleanup task
        background_tasks.add_task(os.remove, file_path)

        # Clean filename by replacing problematic characters
        title = info['title'].replace('/', '_').replace('"', '').replace('\\', '')

        response = FileResponse(
            path=file_path,
            filename=f"{title}.{ext}",
            media_type=f"{'video' if request.format_type == 'video' else 'audio'}/{ext}"
        )

        # Add CORS headers for file downloads
        response.headers["Access-Control-Allow-Origin"] = "*"

        return response

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Download failed: {str(e)}")
