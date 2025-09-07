from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
import asyncio
import json
from datetime import datetime
import logging

from backend.solana_client import SolanaDataClient, fetch_market_data
from models.data_processor import data_processor
from models.ai_model import SolanaAITrader, train_ai_models
from utils.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Solana AI Trader API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global AI model instance
ai_trader = SolanaAITrader()

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Request/Response models
class TokenRequest(BaseModel):
    symbol: str
    
class PredictionRequest(BaseModel):
    symbol: str
    timeframe: Optional[str] = "1h"

class TradingSignalResponse(BaseModel):
    symbol: str
    recommendation: str
    confidence: float
    price_prediction: Dict
    trend_analysis: Dict
    technical_signals: Dict
    timestamp: str

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "Solana AI Trader API",
        "version": "1.0.0",
        "endpoints": [
            "/market/overview",
            "/market/trending",
            "/token/{symbol}/price",
            "/token/{symbol}/analysis",
            "/ai/predict",
            "/ai/signals/{symbol}",
            "/ws"
        ]
    }

@app.get("/market/overview")
async def get_market_overview():
    """Get overview of all tracked Solana tokens"""
    try:
        tokens = list(config.SOLANA_TOKENS.keys())
        market_data = await data_processor.aggregate_market_data(tokens)
        
        return {
            "status": "success",
            "data": {
                "tokens": market_data.to_dict('records'),
                "total_market_cap": market_data['market_cap'].sum(),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error in market overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/market/trending")
async def get_trending_tokens():
    """Get trending Solana tokens"""
    try:
        trending = await data_processor.get_trending_tokens()
        return {
            "status": "success",
            "data": trending
        }
    except Exception as e:
        logger.error(f"Error fetching trending tokens: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/token/{symbol}/price")
async def get_token_price(symbol: str):
    """Get current price for a specific token"""
    try:
        symbol = symbol.upper()
        if symbol not in config.SOLANA_TOKENS:
            raise HTTPException(status_code=404, detail=f"Token {symbol} not supported")
        
        data = await data_processor.get_real_time_data(symbol)
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        logger.error(f"Error fetching token price: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/token/{symbol}/analysis")
async def get_token_analysis(symbol: str):
    """Get comprehensive analysis for a token"""
    try:
        symbol = symbol.upper()
        if symbol not in config.SOLANA_TOKENS:
            raise HTTPException(status_code=404, detail=f"Token {symbol} not supported")
        
        # Fetch historical data
        historical_data = await data_processor.fetch_historical_data(symbol, days=30)
        
        # Identify patterns
        patterns = data_processor.identify_price_patterns(historical_data)
        
        # Calculate risk metrics
        returns = historical_data['close'].pct_change().dropna()
        risk_metrics = data_processor.calculate_risk_metrics(returns)
        
        # Get current data
        current_data = await data_processor.get_real_time_data(symbol)
        
        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "current_price": current_data['price'],
                "patterns": patterns,
                "risk_metrics": risk_metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error in token analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/predict")
async def predict_price(request: PredictionRequest):
    """Get AI price prediction for a token"""
    try:
        symbol = request.symbol.upper()
        if symbol not in config.SOLANA_TOKENS:
            raise HTTPException(status_code=404, detail=f"Token {symbol} not supported")
        
        # Fetch historical data
        historical_data = await data_processor.fetch_historical_data(symbol, days=30)
        
        # Ensure model is trained
        if not ai_trader.price_predictor:
            ai_trader.train_price_predictor(historical_data)
            ai_trader.train_trend_classifier(historical_data)
        
        # Get predictions
        features = ai_trader.prepare_features(historical_data).iloc[-1:]
        predictions = ai_trader.predict_price(features)
        trend = ai_trader.predict_trend(features)
        
        return {
            "status": "success",
            "data": {
                "symbol": symbol,
                "predictions": predictions,
                "trend": trend,
                "timeframe": request.timeframe,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error in price prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/signals/{symbol}")
async def get_trading_signals(symbol: str):
    """Get AI-generated trading signals"""
    try:
        symbol = symbol.upper()
        if symbol not in config.SOLANA_TOKENS:
            raise HTTPException(status_code=404, detail=f"Token {symbol} not supported")
        
        # Fetch historical data
        historical_data = await data_processor.fetch_historical_data(symbol, days=30)
        
        # Ensure model is trained
        if not ai_trader.price_predictor:
            ai_trader.train_price_predictor(historical_data)
            ai_trader.train_trend_classifier(historical_data)
            ai_trader.train_prophet_model(historical_data)
        
        # Generate signals
        signals = ai_trader.generate_trading_signals(historical_data)
        signals['symbol'] = symbol
        
        return {
            "status": "success",
            "data": signals
        }
    except Exception as e:
        logger.error(f"Error generating trading signals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/insights")
async def get_market_insights():
    """Get AI-generated market insights"""
    try:
        # Get market data
        tokens = list(config.SOLANA_TOKENS.keys())
        market_data = await data_processor.aggregate_market_data(tokens)
        
        # Get patterns for SOL as a market indicator
        sol_data = await data_processor.fetch_historical_data('SOL', days=7)
        patterns = data_processor.identify_price_patterns(sol_data)
        
        # Generate insights
        insights = data_processor.generate_insights(market_data, patterns)
        
        return {
            "status": "success",
            "data": {
                "insights": insights,
                "market_sentiment": "bullish" if market_data['price_change_24h'].mean() > 0 else "bearish",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Send market updates every 5 seconds
            market_data = await fetch_market_data()
            await manager.broadcast({
                "type": "market_update",
                "data": market_data,
                "timestamp": datetime.utcnow().isoformat()
            })
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.on_event("startup")
async def startup_event():
    """Initialize models on startup"""
    logger.info("Starting Solana AI Trader API...")
    
    # Load pre-trained models if available
    try:
        ai_trader.load_models()
        logger.info("Pre-trained models loaded successfully")
    except:
        logger.info("No pre-trained models found, will train on first request")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Solana AI Trader API...")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": bool(ai_trader.price_predictor)
    }