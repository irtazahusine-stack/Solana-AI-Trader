import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import ta
from prophet import Prophet
import tensorflow as tf
from tensorflow import keras
from datetime import datetime, timedelta
import joblib
import logging
from typing import Dict, List, Tuple, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SolanaAITrader:
    def __init__(self):
        self.price_predictor = None
        self.trend_classifier = None
        self.scaler = StandardScaler()
        self.prophet_model = None
        self.lstm_model = None
        self.feature_columns = []
        
    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical indicators for the dataframe"""
        # Ensure we have OHLCV data
        if not all(col in df.columns for col in ['open', 'high', 'low', 'close', 'volume']):
            logger.warning("Missing OHLCV data, using available price data")
            df['high'] = df['close']
            df['low'] = df['close']
            df['open'] = df['close']
            
        # RSI
        df['rsi'] = ta.momentum.RSIIndicator(close=df['close'], window=14).rsi()
        
        # MACD
        macd = ta.trend.MACD(close=df['close'])
        df['macd'] = macd.macd()
        df['macd_signal'] = macd.macd_signal()
        df['macd_diff'] = macd.macd_diff()
        
        # Bollinger Bands
        bb = ta.volatility.BollingerBands(close=df['close'])
        df['bb_high'] = bb.bollinger_hband()
        df['bb_low'] = bb.bollinger_lband()
        df['bb_mid'] = bb.bollinger_mavg()
        
        # Moving Averages
        df['ema_9'] = ta.trend.EMAIndicator(close=df['close'], window=9).ema_indicator()
        df['ema_21'] = ta.trend.EMAIndicator(close=df['close'], window=21).ema_indicator()
        df['sma_50'] = ta.trend.SMAIndicator(close=df['close'], window=50).sma_indicator()
        
        # Volume indicators
        df['volume_ema'] = ta.trend.EMAIndicator(close=df['volume'], window=20).ema_indicator()
        df['volume_ratio'] = df['volume'] / df['volume_ema']
        
        # Price features
        df['price_change'] = df['close'].pct_change()
        df['high_low_ratio'] = df['high'] / df['low']
        df['close_open_ratio'] = df['close'] / df['open']
        
        # Volatility
        df['volatility'] = df['close'].rolling(window=20).std()
        
        # Support and Resistance levels
        df['support'] = df['low'].rolling(window=20).min()
        df['resistance'] = df['high'].rolling(window=20).max()
        
        return df.fillna(method='ffill').fillna(0)
    
    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for ML models"""
        df = self.calculate_technical_indicators(df)
        
        # Select features for training
        self.feature_columns = [
            'rsi', 'macd', 'macd_signal', 'macd_diff',
            'bb_high', 'bb_low', 'bb_mid',
            'ema_9', 'ema_21', 'sma_50',
            'volume_ratio', 'price_change',
            'high_low_ratio', 'close_open_ratio',
            'volatility'
        ]
        
        return df[self.feature_columns]
    
    def train_price_predictor(self, df: pd.DataFrame):
        """Train Random Forest model for price prediction"""
        logger.info("Training price prediction model...")
        
        # Prepare features
        X = self.prepare_features(df)
        y = df['close'].shift(-1)  # Predict next period's close price
        
        # Remove NaN values
        valid_idx = ~(X.isna().any(axis=1) | y.isna())
        X = X[valid_idx]
        y = y[valid_idx]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, shuffle=False
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.price_predictor = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.price_predictor.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_score = self.price_predictor.score(X_train_scaled, y_train)
        test_score = self.price_predictor.score(X_test_scaled, y_test)
        
        logger.info(f"Price Predictor - Train R: {train_score:.4f}, Test R: {test_score:.4f}")
        
    def train_trend_classifier(self, df: pd.DataFrame):
        """Train Gradient Boosting model for trend classification"""
        logger.info("Training trend classification model...")
        
        # Prepare features
        X = self.prepare_features(df)
        
        # Create trend labels (1: bullish, 0: bearish)
        df['future_return'] = df['close'].shift(-5) / df['close'] - 1
        y = (df['future_return'] > 0.02).astype(int)  # 2% threshold for bullish
        
        # Remove NaN values
        valid_idx = ~(X.isna().any(axis=1) | y.isna())
        X = X[valid_idx]
        y = y[valid_idx]
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, shuffle=False
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.trend_classifier = GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        self.trend_classifier.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_accuracy = self.trend_classifier.score(X_train_scaled, y_train)
        test_accuracy = self.trend_classifier.score(X_test_scaled, y_test)
        
        logger.info(f"Trend Classifier - Train Accuracy: {train_accuracy:.4f}, Test Accuracy: {test_accuracy:.4f}")
    
    def train_prophet_model(self, df: pd.DataFrame):
        """Train Prophet model for time series forecasting"""
        logger.info("Training Prophet model...")
        
        # Prepare data for Prophet
        prophet_df = pd.DataFrame({
            'ds': df.index,
            'y': df['close']
        })
        
        # Initialize and train Prophet
        self.prophet_model = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
            changepoint_prior_scale=0.05
        )
        
        self.prophet_model.fit(prophet_df)
        logger.info("Prophet model trained successfully")
    
    def build_lstm_model(self, input_shape: Tuple[int, int]):
        """Build LSTM model for advanced price prediction"""
        model = keras.Sequential([
            keras.layers.LSTM(50, return_sequences=True, input_shape=input_shape),
            keras.layers.Dropout(0.2),
            keras.layers.LSTM(50, return_sequences=True),
            keras.layers.Dropout(0.2),
            keras.layers.LSTM(25),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(1)
        ])
        
        model.compile(
            optimizer='adam',
            loss='mean_squared_error',
            metrics=['mae']
        )
        
        return model
    
    def predict_price(self, current_features: pd.DataFrame) -> Dict[str, float]:
        """Predict next price using ensemble of models"""
        predictions = {}
        
        # Random Forest prediction
        if self.price_predictor:
            scaled_features = self.scaler.transform(current_features[self.feature_columns])
            rf_prediction = self.price_predictor.predict(scaled_features)[0]
            predictions['random_forest'] = rf_prediction
        
        # Prophet prediction
        if self.prophet_model:
            future_df = self.prophet_model.make_future_dataframe(periods=1)
            forecast = self.prophet_model.predict(future_df)
            prophet_prediction = forecast['yhat'].iloc[-1]
            predictions['prophet'] = prophet_prediction
        
        # Ensemble prediction (weighted average)
        if predictions:
            ensemble_prediction = np.mean(list(predictions.values()))
            predictions['ensemble'] = ensemble_prediction
        
        return predictions
    
    def predict_trend(self, current_features: pd.DataFrame) -> Dict[str, Any]:
        """Predict market trend and trading signals"""
        if not self.trend_classifier:
            return {'trend': 'neutral', 'confidence': 0.5}
        
        scaled_features = self.scaler.transform(current_features[self.feature_columns])
        
        # Get prediction and probability
        trend_prediction = self.trend_classifier.predict(scaled_features)[0]
        trend_probability = self.trend_classifier.predict_proba(scaled_features)[0]
        
        trend = 'bullish' if trend_prediction == 1 else 'bearish'
        confidence = max(trend_probability)
        
        return {
            'trend': trend,
            'confidence': confidence,
            'probabilities': {
                'bearish': trend_probability[0],
                'bullish': trend_probability[1]
            }
        }
    
    def generate_trading_signals(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate comprehensive trading signals"""
        latest_data = df.iloc[-1]
        features = self.prepare_features(df).iloc[-1:] 
        
        signals = {
            'timestamp': datetime.utcnow().isoformat(),
            'price_prediction': self.predict_price(features),
            'trend_analysis': self.predict_trend(features),
            'technical_signals': {},
            'recommendation': 'HOLD',
            'confidence': 0.5
        }
        
        # Technical indicator signals
        signals['technical_signals']['rsi'] = {
            'value': latest_data.get('rsi', 50),
            'signal': 'oversold' if latest_data.get('rsi', 50) < 30 else 'overbought' if latest_data.get('rsi', 50) > 70 else 'neutral'
        }
        
        signals['technical_signals']['macd'] = {
            'value': latest_data.get('macd_diff', 0),
            'signal': 'bullish' if latest_data.get('macd_diff', 0) > 0 else 'bearish'
        }
        
        # Generate recommendation
        bullish_signals = 0
        bearish_signals = 0
        
        if signals['trend_analysis']['trend'] == 'bullish':
            bullish_signals += 2
        else:
            bearish_signals += 2
            
        if signals['technical_signals']['rsi']['signal'] == 'oversold':
            bullish_signals += 1
        elif signals['technical_signals']['rsi']['signal'] == 'overbought':
            bearish_signals += 1
            
        if signals['technical_signals']['macd']['signal'] == 'bullish':
            bullish_signals += 1
        else:
            bearish_signals += 1
        
        # Make recommendation
        if bullish_signals > bearish_signals + 1:
            signals['recommendation'] = 'BUY'
            signals['confidence'] = bullish_signals / (bullish_signals + bearish_signals)
        elif bearish_signals > bullish_signals + 1:
            signals['recommendation'] = 'SELL'
            signals['confidence'] = bearish_signals / (bullish_signals + bearish_signals)
        else:
            signals['recommendation'] = 'HOLD'
            signals['confidence'] = 0.5
        
        return signals
    
    def save_models(self, path: str = './models/saved/'):
        """Save trained models"""
        import os
        os.makedirs(path, exist_ok=True)
        
        if self.price_predictor:
            joblib.dump(self.price_predictor, f'{path}price_predictor.pkl')
        if self.trend_classifier:
            joblib.dump(self.trend_classifier, f'{path}trend_classifier.pkl')
        if self.scaler:
            joblib.dump(self.scaler, f'{path}scaler.pkl')
        if self.prophet_model:
            with open(f'{path}prophet_model.pkl', 'wb') as f:
                joblib.dump(self.prophet_model, f)
        
        logger.info(f"Models saved to {path}")
    
    def load_models(self, path: str = './models/saved/'):
        """Load pre-trained models"""
        try:
            self.price_predictor = joblib.load(f'{path}price_predictor.pkl')
            self.trend_classifier = joblib.load(f'{path}trend_classifier.pkl')
            self.scaler = joblib.load(f'{path}scaler.pkl')
            with open(f'{path}prophet_model.pkl', 'rb') as f:
                self.prophet_model = joblib.load(f)
            logger.info("Models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading models: {e}")

# Utility function to train all models
def train_ai_models(historical_data: pd.DataFrame) -> SolanaAITrader:
    """Train all AI models with historical data"""
    ai_trader = SolanaAITrader()
    
    # Ensure datetime index
    if 'timestamp' in historical_data.columns:
        historical_data['timestamp'] = pd.to_datetime(historical_data['timestamp'])
        historical_data.set_index('timestamp', inplace=True)
    
    # Train models
    ai_trader.train_price_predictor(historical_data)
    ai_trader.train_trend_classifier(historical_data)
    ai_trader.train_prophet_model(historical_data)
    
    return ai_trader