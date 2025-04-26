import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
import yfinance as yf
from datetime import datetime, timedelta

class StockPredictor:
    def __init__(self, ticker):
        self.ticker = ticker
        self.model = None
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.sequence_length = 60  # Number of days to look back for prediction
        
    def get_historical_data(self, days=365):
        """Fetch historical stock data"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        try:
            stock = yf.Ticker(self.ticker)
            df = stock.history(start=start_date, end=end_date)
            return df['Close'].values.reshape(-1, 1)
        except Exception as e:
            print(f"Error fetching data for {self.ticker}: {str(e)}")
            return None
    
    def prepare_data(self, data):
        """Prepare data for LSTM model"""
        # Scale the data
        scaled_data = self.scaler.fit_transform(data)
        
        # Create sequences
        X, y = [], []
        for i in range(self.sequence_length, len(scaled_data)):
            X.append(scaled_data[i-self.sequence_length:i, 0])
            y.append(scaled_data[i, 0])
        
        return np.array(X), np.array(y)
    
    def build_model(self):
        """Build and compile the LSTM model"""
        self.model = Sequential([
            LSTM(units=50, return_sequences=True, input_shape=(self.sequence_length, 1)),
            Dropout(0.2),
            LSTM(units=50, return_sequences=False),
            Dropout(0.2),
            Dense(units=25),
            Dense(units=1)
        ])
        
        self.model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='mean_squared_error',
            metrics=['mae']
        )
    
    def train(self, epochs=50, batch_size=32):
        """Train the model"""
        data = self.get_historical_data()
        if data is None:
            return False
        
        X, y = self.prepare_data(data)
        
        # Reshape data for LSTM [samples, time steps, features]
        X = np.reshape(X, (X.shape[0], X.shape[1], 1))
        
        if self.model is None:
            self.build_model()
        
        self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=0.1,
            verbose=1
        )
        
        return True
    
    def predict_next_days(self, days=7):
        """Predict stock prices for the next n days"""
        if self.model is None:
            self.build_model()
            success = self.train()
            if not success:
                return None, 0
        
        # Get recent data - use the past 2 years for better historical context
        data = self.get_historical_data(days=365*2)
        if data is None:
            return None, 0
        
        # Scale the data
        scaled_data = self.scaler.transform(data)
        
        # Prepare input sequence
        X = scaled_data[-self.sequence_length:].reshape(1, self.sequence_length, 1)
        
        # Make predictions
        predictions = []
        confidence_scores = []
        
        # Create a copy of X for predictions to avoid modifying the original
        pred_input = X.copy()
        
        for _ in range(days):
            # Predict the next price
            pred = self.model.predict(pred_input, verbose=0)
            predictions.append(pred[0][0])
            
            # Update input sequence by removing oldest day and adding prediction
            pred_input = np.append(pred_input[:, 1:, :], pred.reshape(1, 1, 1), axis=1)
            
            # Track prediction confidence (decreases as we predict further into the future)
            if _ == 0:
                base_confidence = min(100, max(0, 100 - (self.model.history.history['val_loss'][-1] * 100)))
            else:
                # Decrease confidence by 5% for each day into the future
                base_confidence *= 0.95
            
            confidence_scores.append(base_confidence)
        
        # Inverse transform predictions
        predictions = self.scaler.inverse_transform(np.array(predictions).reshape(-1, 1))
        
        # Average confidence score for simplicity
        avg_confidence = sum(confidence_scores) / len(confidence_scores)
        
        return predictions.flatten(), avg_confidence 