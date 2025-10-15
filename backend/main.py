from fastapi import FastAPI

app = FastAPI(title="Dvorfs Downloader Backend", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "Welcome to Dvorfs Downloader Backend"}
