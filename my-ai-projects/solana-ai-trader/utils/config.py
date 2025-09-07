import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # NoLimitNodes Configuration
    NOLIMITNODES_API_KEY = os.getenv('NOLIMITNODES_API_KEY', '')
    NOLIMITNODES_RPC_URL = os.getenv('NOLIMITNODES_RPC_URL', 'https://api.nolimitnodes.com/solana')
    
    # MongoDB Configuration
    MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'solana_ai_trader')
    
    # API Configuration
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_PORT = int(os.getenv('API_PORT', 8000))
    
    # AI Model Configuration
    MODEL_UPDATE_INTERVAL = int(os.getenv('MODEL_UPDATE_INTERVAL', 3600))
    PREDICTION_CONFIDENCE_THRESHOLD = float(os.getenv('PREDICTION_CONFIDENCE_THRESHOLD', 0.7))
    
    # Solana Configuration
    SOLANA_NETWORK = os.getenv('SOLANA_NETWORK', 'mainnet-beta')
    
    # Popular Solana Token Addresses
    SOLANA_TOKENS = {
        'SOL': 'So11111111111111111111111111111111111111112',
        'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        'SRM': 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
        'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    }
    
    # Technical Indicators Settings
    TECHNICAL_INDICATORS = {
        'RSI_PERIOD': 14,
        'MACD_FAST': 12,
        'MACD_SLOW': 26,
        'MACD_SIGNAL': 9,
        'BB_PERIOD': 20,
        'BB_STD': 2,
        'EMA_SHORT': 9,
        'EMA_LONG': 21,
    }

config = Config()