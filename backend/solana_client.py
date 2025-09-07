import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import pandas as pd
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from utils.config import config
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SolanaDataClient:
    def __init__(self):
        self.rpc_url = config.NOLIMITNODES_RPC_URL
        self.api_key = config.NOLIMITNODES_API_KEY
        self.client = AsyncClient(self.rpc_url)
        self.session = None
        self.token_addresses = config.SOLANA_TOKENS
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
        await self.client.close()
    
    async def get_token_price(self, token_symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch token price from Jupiter aggregator"""
        try:
            token_address = self.token_addresses.get(token_symbol)
            if not token_address:
                logger.error(f"Token {token_symbol} not found in configuration")
                return None
                
            # Using Jupiter Price API for accurate pricing
            jupiter_url = f"https://price.jup.ag/v4/price?ids={token_address}"
            
            async with self.session.get(jupiter_url) as response:
                if response.status == 200:
                    data = await response.json()
                    price_data = data.get('data', {}).get(token_address, {})
                    
                    return {
                        'symbol': token_symbol,
                        'address': token_address,
                        'price': price_data.get('price', 0),
                        'timestamp': datetime.utcnow().isoformat(),
                        'confidence': price_data.get('confidence', 0),
                        'source': 'jupiter'
                    }
                else:
                    logger.error(f"Failed to fetch price for {token_symbol}: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching token price: {e}")
            return None
    
    async def get_token_transactions(self, token_address: str, limit: int = 100) -> List[Dict]:
        """Fetch recent transactions for a token"""
        try:
            pubkey = Pubkey.from_string(token_address)
            
            # Get signatures for the token account
            signatures = await self.client.get_signatures_for_address(
                pubkey,
                limit=limit
            )
            
            transactions = []
            if signatures.value:
                for sig_info in signatures.value[:10]:  # Process first 10 transactions
                    tx = await self.client.get_transaction(
                        sig_info.signature,
                        max_supported_transaction_version=0
                    )
                    
                    if tx.value:
                        transactions.append({
                            'signature': str(sig_info.signature),
                            'slot': sig_info.slot,
                            'timestamp': sig_info.block_time,
                            'success': not sig_info.err,
                            'fee': tx.value.transaction.meta.fee if tx.value.transaction.meta else 0
                        })
            
            return transactions
            
        except Exception as e:
            logger.error(f"Error fetching transactions: {e}")
            return []
    
    async def get_token_volume_24h(self, token_symbol: str) -> Optional[float]:
        """Calculate 24h trading volume for a token"""
        try:
            token_address = self.token_addresses.get(token_symbol)
            if not token_address:
                return None
                
            # For actual implementation, you would aggregate transaction volumes
            # This is a placeholder that returns mock data
            # In production, integrate with Serum DEX or other sources
            
            return {
                'symbol': token_symbol,
                'volume_24h': 1000000.0,  # Mock data
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating volume: {e}")
            return None
    
    async def get_market_trends(self) -> Dict[str, Any]:
        """Analyze market trends across multiple tokens"""
        trends = {
            'timestamp': datetime.utcnow().isoformat(),
            'tokens': {},
            'market_sentiment': 'neutral',
            'trending_tokens': []
        }
        
        # Fetch data for all configured tokens
        for symbol in self.token_addresses.keys():
            price_data = await self.get_token_price(symbol)
            if price_data:
                trends['tokens'][symbol] = {
                    'price': price_data['price'],
                    'volume_24h': (await self.get_token_volume_24h(symbol))['volume_24h']
                }
        
        # Simple trend analysis (to be enhanced with AI)
        prices = [data['price'] for data in trends['tokens'].values() if data['price'] > 0]
        if prices:
            avg_price_change = sum(prices) / len(prices)
            if avg_price_change > 0.05:
                trends['market_sentiment'] = 'bullish'
            elif avg_price_change < -0.05:
                trends['market_sentiment'] = 'bearish'
        
        # Identify trending tokens (placeholder logic)
        trends['trending_tokens'] = list(self.token_addresses.keys())[:3]
        
        return trends
    
    async def get_token_holders(self, token_address: str) -> Optional[Dict]:
        """Get token holder statistics"""
        try:
            # This would require indexer API or chain analysis
            # Placeholder implementation
            return {
                'token_address': token_address,
                'total_holders': 10000,
                'top_holders': [],
                'concentration': 0.3,  # Top 10 holders own 30%
                'timestamp': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error fetching holder data: {e}")
            return None
    
    async def get_defi_metrics(self, protocol: str = 'all') -> Dict[str, Any]:
        """Get DeFi protocol metrics"""
        # Placeholder for DeFi metrics
        return {
            'tvl': 1000000000,  # $1B TVL
            'volume_24h': 50000000,  # $50M volume
            'active_users': 10000,
            'protocol': protocol,
            'timestamp': datetime.utcnow().isoformat()
        }

# Utility function to fetch all market data
async def fetch_market_data():
    """Fetch comprehensive market data for AI analysis"""
    async with SolanaDataClient() as client:
        market_data = {
            'prices': {},
            'volumes': {},
            'trends': await client.get_market_trends(),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Fetch data for each token
        for symbol in config.SOLANA_TOKENS.keys():
            price_data = await client.get_token_price(symbol)
            volume_data = await client.get_token_volume_24h(symbol)
            
            if price_data:
                market_data['prices'][symbol] = price_data
            if volume_data:
                market_data['volumes'][symbol] = volume_data
        
        return market_data