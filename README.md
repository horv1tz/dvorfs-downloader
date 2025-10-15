# Dvorfs Downloader

Web application for downloading video and audio from YouTube, with plans to support more platforms later.

## Project Structure

- `backend/` - FastAPI backend with yt-dlp
- `frontend/` - Next.js frontend with Tailwind CSS and Anime.js
- `docs/` - Documentation including SOW.md

## Setup

### Prerequisites
- Docker and Docker Compose
- Node.js and Python (for local development)

### Running with Docker
```bash
docker-compose up --build
```

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Technology Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, Anime.js, i18n
- **Backend:** FastAPI, Python, yt-dlp
- **Deployment:** Docker, Docker Compose
