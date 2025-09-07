#!/usr/bin/env python3
"""
Simple test server to verify FastAPI is working
"""

from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Solana AI Trader - Test Server")

@app.get("/")
async def root():
    return {"message": "Solana AI Trader API is running!", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Solana AI Trader"}

if __name__ == "__main__":
    print("Starting simple test server on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)