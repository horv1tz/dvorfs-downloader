from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
import yt_dlp
import os
import uuid
from urllib.parse import urlparse, parse_qs
from pydantic import BaseModel, validator
import re
import asyncio
import aiofiles
from concurrent.futures import ThreadPoolExecutor
import shutil

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

async def download_video_async(url: str, format_id: str, file_path: str, max_retries: int = 3):
    """Optimized async download video using yt-dlp with retry logic"""
    ydl_opts = {
        'format': format_id,
        'outtmpl': file_path,
        'quiet': True,
        'no_warnings': True,
        'retries': 5,
        'fragment_retries': 5,
        'http_chunk_size': 10485760,  # 10MB chunks for faster streaming
        'concurrent_fragment_downloads': 4,  # Parallel fragment downloads
        'continue': True,  # Resume downloads
        'nooverwrites': False,
        'restrictfilenames': False,
        'outtmpl_na_placeholder': '',
    }

    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=1)

    for attempt in range(max_retries):
        try:
            if attempt > 0:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

            # Run yt-dlp download in thread pool
            await loop.run_in_executor(executor, yt_dlp_download, ydl_opts, url)

            # Verify file exists and has content
            if not await async_file_exists(file_path) or await async_file_size(file_path) == 0:
                raise Exception("Download completed but file is empty or missing")

            return  # Success
        except Exception as e:
            error_msg = f"Download attempt {attempt + 1} failed: {str(e)}"
            print(error_msg)  # Log for debugging

            # Clean up partial file
            if await async_file_exists(file_path):
                await async_file_remove(file_path)

            if attempt == max_retries - 1:
                raise HTTPException(status_code=400, detail=f"Download failed after {max_retries} attempts: {str(e)}")

def yt_dlp_download(opts, url):
    """Synchronous wrapper for yt-dlp download"""
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])

async def async_file_exists(path):
    """Async check if file exists"""
    return await asyncio.get_event_loop().run_in_executor(None, os.path.exists, path)

async def async_file_size(path):
    """Async get file size"""
    if not await async_file_exists(path):
        return 0
    return await asyncio.get_event_loop().run_in_executor(None, os.path.getsize, path)

async def async_file_remove(path):
    """Async remove file"""
    if await async_file_exists(path):
        await asyncio.get_event_loop().run_in_executor(None, os.remove, path)

async def stream_file_response(file_path: str, filename: str, media_type: str, background_tasks: BackgroundTasks):
    """Stream file response with background cleanup"""
    async def file_generator():
        if await async_file_exists(file_path):
            async with aiofiles.open(file_path, 'rb') as f:
                chunk_size = 8192  # 8KB chunks for smooth streaming
                while chunk := await f.read(chunk_size):
                    yield chunk

    background_tasks.add_task(async_file_remove, file_path)

    return StreamingResponse(
        file_generator(),
        media_type=media_type,
        headers={
            'Content-Disposition': f'attachment; filename="{filename}"',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
        }
    )

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
    """Optimized download video/audio file with streaming response"""
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
        # Optimized async download with retry logic
        await download_video_async(request.url, selected_format['format_id'], file_path)

        # Verify file exists and has content
        if not await async_file_exists(file_path) or await async_file_size(file_path) == 0:
            raise HTTPException(status_code=400, detail="Download failed - file not created or empty")

        # Clean filename by replacing problematic characters
        title = info['title'].replace('/', '_').replace('"', '').replace('\\', '')

        # Return streaming response for better handling of large files
        return await stream_file_response(
            file_path=file_path,
            filename=f"{title}.{ext}",
            media_type=f"{'video' if request.format_type == 'video' else 'audio'}/{ext}",
            background_tasks=background_tasks
        )

    except HTTPException:
        raise
    except Exception as e:
        # Clean up partial file
        if await async_file_exists(file_path):
            await async_file_remove(file_path)
        raise HTTPException(status_code=400, detail=f"Download failed: {str(e)}")
