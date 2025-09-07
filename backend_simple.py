#!/usr/bin/env python3
"""
Simplified Solana AI Trader Backend - FastAPI server
"""

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import uvicorn
import json
import asyncio
from datetime import datetime, timedelta
import random
import numpy as np

app = FastAPI(title="Solana AI Trader API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data for tokens
TOKENS = ["SOL", "USDC", "RAY", "BONK", "SRM", "ORCA"]

def generate_mock_price_data(symbol: str, periods: int = 100):
    """Generate mock historical price data"""
    base_prices = {"SOL": 100, "USDC": 1, "RAY": 5, "BONK": 0.00001, "SRM": 3, "ORCA": 2}
    base_price = base_prices.get(symbol, 10)
    
    prices = []
    timestamps = []
    current_price = base_price
    
    for i in range(periods):
        # Random price movement
        change = random.uniform(-0.05, 0.05)
        current_price = current_price * (1 + change)
        current_price = max(current_price, base_price * 0.5)  # Floor at 50% of base
        
        prices.append(current_price)
        timestamps.append((datetime.now() - timedelta(hours=periods-i)).isoformat())
    
    return {"timestamps": timestamps, "prices": prices}

@app.get("/")
async def root():
    return {"message": "Solana AI Trader API", "version": "1.0", "status": "running"}

@app.get("/market/overview")
async def market_overview():
    """Get market overview with all tokens"""
    tokens_data = []
    for token in TOKENS:
        price = {"SOL": 98.5, "USDC": 1.0, "RAY": 4.8, "BONK": 0.000012, "SRM": 2.9, "ORCA": 1.95}.get(token, 10)
        tokens_data.append({
            "symbol": token,
            "price": price + random.uniform(-price*0.02, price*0.02),
            "volume_24h": random.randint(1000000, 50000000),
            "price_change_24h": random.uniform(-10, 10),
            "market_cap": price * random.randint(1000000, 100000000)
        })
    
    return {
        "tokens": tokens_data,
        "total_market_cap": sum(t["market_cap"] for t in tokens_data),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/market/trending")
async def trending_tokens():
    """Get trending tokens"""
    trending = random.sample(TOKENS, 3)
    return {
        "trending": [
            {
                "symbol": token,
                "price": random.uniform(1, 100),
                "volume_24h": random.randint(5000000, 50000000),
                "trending_score": random.uniform(0.7, 1.0)
            }
            for token in trending
        ]
    }

@app.get("/token/{symbol}/price")
async def get_token_price(symbol: str):
    """Get current price for a token"""
    base_prices = {"SOL": 98.5, "USDC": 1.0, "RAY": 4.8, "BONK": 0.000012, "SRM": 2.9, "ORCA": 1.95}
    base_price = base_prices.get(symbol.upper(), 10)
    
    return {
        "symbol": symbol.upper(),
        "price": base_price + random.uniform(-base_price*0.02, base_price*0.02),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/token/{symbol}/history")
async def get_token_history(symbol: str, periods: int = 100):
    """Get historical price data"""
    data = generate_mock_price_data(symbol.upper(), periods)
    return {
        "symbol": symbol.upper(),
        "history": data,
        "periods": periods
    }

@app.get("/token/{symbol}/analysis")
async def get_token_analysis(symbol: str):
    """Get comprehensive analysis for a token"""
    price_data = generate_mock_price_data(symbol.upper(), 100)
    current_price = price_data["prices"][-1]
    
    # Calculate simple metrics
    prices = np.array(price_data["prices"])
    returns = np.diff(prices) / prices[:-1]
    
    return {
        "symbol": symbol.upper(),
        "current_price": current_price,
        "price_history": price_data,
        "technical_indicators": {
            "rsi": random.uniform(30, 70),
            "macd": random.uniform(-0.5, 0.5),
            "signal": random.uniform(-0.5, 0.5),
            "sma_20": np.mean(prices[-20:]),
            "sma_50": np.mean(prices[-50:]) if len(prices) >= 50 else np.mean(prices),
            "bollinger_upper": current_price * 1.1,
            "bollinger_lower": current_price * 0.9
        },
        "risk_metrics": {
            "volatility": float(np.std(returns) * 100),
            "sharpe_ratio": random.uniform(-1, 2),
            "max_drawdown": random.uniform(5, 30),
            "var_95": float(np.percentile(returns, 5) * 100)
        },
        "ai_prediction": {
            "next_hour": current_price * random.uniform(0.98, 1.02),
            "next_day": current_price * random.uniform(0.95, 1.05),
            "next_week": current_price * random.uniform(0.90, 1.10),
            "confidence": random.uniform(0.6, 0.9)
        }
    }

@app.get("/ai/signals/{symbol}")
async def get_trading_signals(symbol: str):
    """Get AI-generated trading signals"""
    signal_types = ["buy", "sell", "hold"]
    signal = random.choice(signal_types)
    
    return {
        "symbol": symbol.upper(),
        "signal": signal,
        "confidence": random.uniform(0.6, 0.95),
        "reasons": [
            "RSI indicates oversold conditions" if signal == "buy" else
            "Price approaching resistance level" if signal == "sell" else
            "Market showing consolidation pattern"
        ],
        "timestamp": datetime.now().isoformat()
    }

@app.get("/ai/insights")
async def get_market_insights():
    """Get AI-generated market insights"""
    insights = [
        "SOL showing strong bullish momentum with 5% gains in the last hour",
        "High trading volume detected in RAY - possible breakout incoming",
        "Market sentiment turning positive after recent developments",
        "BONK experiencing unusual volatility - exercise caution",
        "Overall market showing signs of recovery"
    ]
    
    return {
        "insights": random.sample(insights, 3),
        "market_sentiment": random.choice(["bullish", "bearish", "neutral"]),
        "confidence": random.uniform(0.7, 0.9),
        "timestamp": datetime.now().isoformat()
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates"""
    await websocket.accept()
    try:
        while True:
            # Send price updates every 2 seconds
            await asyncio.sleep(2)
            
            # Generate random price update
            token = random.choice(TOKENS)
            base_prices = {"SOL": 98.5, "USDC": 1.0, "RAY": 4.8, "BONK": 0.000012, "SRM": 2.9, "ORCA": 1.95}
            base_price = base_prices.get(token, 10)
            
            data = {
                "type": "price_update",
                "symbol": token,
                "price": base_price + random.uniform(-base_price*0.02, base_price*0.02),
                "volume": random.randint(100000, 1000000),
                "timestamp": datetime.now().isoformat()
            }
            
            await websocket.send_json(data)
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    print("Starting Solana AI Trader Backend (Simplified)...")
    print("API will be available at http://localhost:8000")
    print("WebSocket available at ws://localhost:8000/ws")
    uvicorn.run(app, host="0.0.0.0", port=8000)