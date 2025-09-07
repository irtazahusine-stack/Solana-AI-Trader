import uvicorn
import asyncio
import logging
from utils.config import config

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main entry point for the backend server"""
    logger.info("Starting Solana AI Trader Backend...")
    
    # Run the FastAPI app
    uvicorn.run(
        "backend.api:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()