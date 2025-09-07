import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import asyncio
from backend.solana_client import SolanaDataClient
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self):
        self.client = SolanaDataClient()
        self.processed_data = {}
        
    async def fetch_historical_data(self, token_symbol: str, days: int = 30) -> pd.DataFrame:
        """Fetch and process historical data for a token"""
        logger.info(f"Fetching historical data for {token_symbol}...")
        
        # Generate synthetic historical data for demo
        # In production, this would fetch real historical data
        dates = pd.date_range(end=datetime.now(), periods=days*24, freq='H')
        
        # Simulate price movements
        np.random.seed(42)
        base_price = {'SOL': 100, 'USDC': 1, 'RAY': 5, 'BONK': 0.00001}.get(token_symbol, 10)
        
        prices = [base_price]
        for _ in range(len(dates) - 1):
            change = np.random.normal(0, 0.02)  # 2% volatility
            new_price = prices[-1] * (1 + change)
            prices.append(max(new_price, base_price * 0.5))  # Floor at 50% of base
        
        # Create OHLCV data
        df = pd.DataFrame({
            'timestamp': dates,
            'open': prices,
            'high': [p * (1 + abs(np.random.normal(0, 0.01))) for p in prices],
            'low': [p * (1 - abs(np.random.normal(0, 0.01))) for p in prices],
            'close': [p * (1 + np.random.normal(0, 0.005)) for p in prices],
            'volume': [np.random.randint(1000000, 10000000) for _ in prices]
        })
        
        df.set_index('timestamp', inplace=True)
        return df
    
    async def get_real_time_data(self, token_symbol: str) -> Dict:
        """Fetch real-time data for a token"""
        async with self.client as client:
            price_data = await client.get_token_price(token_symbol)
            volume_data = await client.get_token_volume_24h(token_symbol)
            
            return {
                'symbol': token_symbol,
                'price': price_data['price'] if price_data else 0,
                'volume_24h': volume_data['volume_24h'] if volume_data else 0,
                'timestamp': datetime.utcnow().isoformat(),
                'price_change_24h': np.random.uniform(-5, 5)  # Mock data
            }
    
    async def aggregate_market_data(self, tokens: List[str]) -> pd.DataFrame:
        """Aggregate market data for multiple tokens"""
        market_data = []
        
        async with self.client as client:
            for token in tokens:
                data = await self.get_real_time_data(token)
                market_data.append(data)
        
        df = pd.DataFrame(market_data)
        df['market_cap'] = df['price'] * 1000000  # Mock market cap
        df['dominance'] = df['market_cap'] / df['market_cap'].sum() * 100
        
        return df
    
    def calculate_correlations(self, price_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """Calculate price correlations between tokens"""
        prices = pd.DataFrame()
        
        for token, df in price_data.items():
            prices[token] = df['close']
        
        return prices.corr()
    
    def identify_price_patterns(self, df: pd.DataFrame) -> List[Dict]:
        """Identify common price patterns"""
        patterns = []
        
        # Simple pattern detection
        close_prices = df['close'].values
        
        # Detect support/resistance levels
        rolling_min = df['close'].rolling(window=20).min()
        rolling_max = df['close'].rolling(window=20).max()
        
        current_price = close_prices[-1]
        support = rolling_min.iloc[-1]
        resistance = rolling_max.iloc[-1]
        
        patterns.append({
            'type': 'support_resistance',
            'support': support,
            'resistance': resistance,
            'current_price': current_price,
            'position': (current_price - support) / (resistance - support) if resistance != support else 0.5
        })
        
        # Detect trend
        sma_short = df['close'].rolling(window=10).mean().iloc[-1]
        sma_long = df['close'].rolling(window=30).mean().iloc[-1]
        
        if sma_short > sma_long:
            patterns.append({'type': 'trend', 'direction': 'upward', 'strength': (sma_short/sma_long - 1) * 100})
        else:
            patterns.append({'type': 'trend', 'direction': 'downward', 'strength': (1 - sma_short/sma_long) * 100})
        
        return patterns
    
    def prepare_training_data(self, df: pd.DataFrame, target_col: str = 'close') -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare data for ML training"""
        # Create features
        df['returns'] = df[target_col].pct_change()
        df['log_returns'] = np.log(df[target_col] / df[target_col].shift(1))
        df['volume_change'] = df['volume'].pct_change()
        
        # Lag features
        for i in range(1, 6):
            df[f'close_lag_{i}'] = df[target_col].shift(i)
            df[f'volume_lag_{i}'] = df['volume'].shift(i)
        
        # Remove NaN values
        df.dropna(inplace=True)
        
        # Features and target
        feature_cols = [col for col in df.columns if col not in [target_col, 'open', 'high', 'low']]
        X = df[feature_cols]
        y = df[target_col].shift(-1)  # Predict next period
        
        # Remove last row (no target)
        X = X[:-1]
        y = y[:-1]
        
        return X, y
    
    def calculate_risk_metrics(self, returns: pd.Series) -> Dict[str, float]:
        """Calculate risk metrics for returns"""
        return {
            'volatility': returns.std() * np.sqrt(365),  # Annualized
            'sharpe_ratio': (returns.mean() * 365) / (returns.std() * np.sqrt(365)) if returns.std() > 0 else 0,
            'max_drawdown': (returns.cumsum().cummax() - returns.cumsum()).max(),
            'var_95': np.percentile(returns, 5),
            'cvar_95': returns[returns <= np.percentile(returns, 5)].mean()
        }
    
    async def get_trending_tokens(self) -> List[Dict]:
        """Identify trending tokens based on various metrics"""
        async with self.client as client:
            market_trends = await client.get_market_trends()
            
            trending = []
            for token in market_trends.get('trending_tokens', []):
                token_data = market_trends['tokens'].get(token, {})
                trending.append({
                    'symbol': token,
                    'price': token_data.get('price', 0),
                    'volume_24h': token_data.get('volume_24h', 0),
                    'trending_score': np.random.uniform(0.7, 1.0)  # Mock trending score
                })
            
            return sorted(trending, key=lambda x: x['trending_score'], reverse=True)
    
    def generate_insights(self, market_data: pd.DataFrame, patterns: List[Dict]) -> List[str]:
        """Generate human-readable insights from data"""
        insights = []
        
        # Market sentiment insight
        avg_change = market_data.get('price_change_24h', pd.Series()).mean()
        if avg_change > 2:
            insights.append("Market showing strong bullish momentum with average gains over 2%")
        elif avg_change < -2:
            insights.append("Market experiencing bearish pressure with average losses over 2%")
        else:
            insights.append("Market trading sideways with mixed signals")
        
        # Volume insight
        high_volume_tokens = market_data[market_data['volume_24h'] > market_data['volume_24h'].mean() * 2]
        if not high_volume_tokens.empty:
            tokens = ', '.join(high_volume_tokens['symbol'].tolist())
            insights.append(f"High trading activity detected in: {tokens}")
        
        # Pattern insights
        for pattern in patterns:
            if pattern['type'] == 'support_resistance':
                position = pattern['position']
                if position > 0.8:
                    insights.append("Price approaching resistance level - consider taking profits")
                elif position < 0.2:
                    insights.append("Price near support level - potential buying opportunity")
            elif pattern['type'] == 'trend':
                if pattern['direction'] == 'upward' and pattern['strength'] > 5:
                    insights.append(f"Strong upward trend detected ({pattern['strength']:.1f}% above long-term average)")
        
        return insights

# Singleton instance
data_processor = DataProcessor()