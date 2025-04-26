from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import json
import os
import time
from alpha_vantage.timeseries import TimeSeries
from alpha_vantage.foreignexchange import ForeignExchange
from dotenv import load_dotenv
from datetime import datetime, timedelta
import yfinance as yf
import requests
from bs4 import BeautifulSoup
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from models import db, User, Portfolio, WatchlistItem, Transaction, StockPrediction, PortfolioHolding
from prediction_model import StockPredictor
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash
import random
from functools import lru_cache
import sys

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", 
                                        "http://localhost:5174", "http://127.0.0.1:5174", 
                                        "http://localhost:3000", "http://127.0.0.1:3000"], 
                            "supports_credentials": True}})
USER_DATA_FILE = 'user_data.json'

# Alpha Vantage API key
ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY', 'demo')

# Initialize Alpha Vantage client
ts = TimeSeries(key=ALPHA_VANTAGE_API_KEY, output_format='pandas')
fx = ForeignExchange(key=ALPHA_VANTAGE_API_KEY)

# Demo account configuration
DEMO_BALANCE = 100000  # Starting balance for demo accounts
DEMO_EMAIL = "demo@stockapp.com"
DEMO_PASSWORD = "demo123"

# Indian stock exchange suffixes
INDIAN_EXCHANGES = {
    'NSE': '.NS',  # National Stock Exchange
    'BSE': '.BO',  # Bombay Stock Exchange
}

# Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///stockapp.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'your-secret-key')  # Change in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=1)

# Initialize extensions
jwt = JWTManager(app)
db.init_app(app)

# Create or recreate database tables
with app.app_context():
    # Drop all tables and recreate them to ensure schema is up to date
    db.drop_all()
    db.create_all()

def load_user_data():
    try:
        with open(USER_DATA_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Initialize with demo account
        return {
            "users": {
                DEMO_EMAIL: {
                    "watchlist": [],
                    "portfolio": {},
                    "balance": DEMO_BALANCE,
                    "transactions": [],
                    "profile": {
                        "username": "Demo User",
                        "email": DEMO_EMAIL,
                        "is_demo": True
                    }
                }
            }
        }
    except json.JSONDecodeError:
        return {"users": {}}

def save_user_data(data):
    try:
        with open(USER_DATA_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error saving user data: {str(e)}")
        raise

def get_stock_price(ticker, exchange='NSE'):
    try:
        # Add exchange suffix for Indian stocks
        if exchange in INDIAN_EXCHANGES:
            ticker = ticker + INDIAN_EXCHANGES[exchange]
        
        # Try Yahoo Finance first
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period='1d')
            if not hist.empty:
                return float(hist['Close'].iloc[-1])
        except:
            pass
        
        # Fallback to Alpha Vantage
        try:
            data, _ = ts.get_quote_endpoint(symbol=ticker)
            return float(data['05. price'])
        except:
            return None
            
    except Exception as e:
        print(f"Error getting stock price: {str(e)}")
        return None

def get_stock_details(ticker, exchange='NSE'):
    """
    Get detailed information about a stock
    
    Args:
        ticker (str): Stock ticker symbol
        exchange (str): Stock exchange (default: NSE)
        
    Returns:
        dict: Stock details or None if not found
    """
    try:
        # In production, this would call a real stock API service
        # For this mock implementation, we'll generate realistic data based on the ticker
        
        # Use ASCII values of ticker to create deterministic but varied mock data
        seed_value = sum(ord(c) for c in ticker)
        random.seed(seed_value)
        np.random.seed(seed_value)
        
        # Create different categories of stocks with realistic values
        price_base = predict_stock_price(ticker, exchange)['current_price']
        
        # Define common Indian sectors
        sectors = [
            "Information Technology", "Banking & Financial Services", 
            "Oil & Gas", "Automobile", "Pharmaceuticals", "Consumer Goods",
            "Infrastructure", "Metals & Mining", "Telecom", "Power"
        ]
        
        # Define industries within sectors
        industries = {
            "Information Technology": ["IT Services", "Software Development", "Hardware"],
            "Banking & Financial Services": ["Banks", "NBFCs", "Insurance", "Asset Management"],
            "Oil & Gas": ["Exploration", "Refining", "Marketing"],
            "Automobile": ["Passenger Vehicles", "Commercial Vehicles", "Auto Components"],
            "Pharmaceuticals": ["Generics", "API", "R&D", "Healthcare"],
            "Consumer Goods": ["FMCG", "Consumer Durables", "Retail"],
            "Infrastructure": ["Construction", "Real Estate", "Cement"],
            "Metals & Mining": ["Steel", "Aluminum", "Mining"],
            "Telecom": ["Telecom Services", "Equipment"],
            "Power": ["Generation", "Transmission", "Distribution"]
        }
        
        # Select sector based on ticker's first character
        sector_index = ord(ticker[0]) % len(sectors)
        sector = sectors[sector_index]
        
        # Select industry based on remaining characters
        industry_options = industries.get(sector, ["General"])
        industry_index = (sum(ord(c) for c in ticker[1:]) if len(ticker) > 1 else 0) % len(industry_options)
        industry = industry_options[industry_index]
        
        # Calculate realistic stock metrics based on sector and ticker
        market_cap = price_base * (random.randint(100, 500) * 10**6)  # 100M to 5B
        
        # PE ratios vary by sector
        pe_ranges = {
            "Information Technology": (15, 35),
            "Banking & Financial Services": (10, 25),
            "Oil & Gas": (8, 18),
            "Automobile": (12, 25),
            "Pharmaceuticals": (18, 40),
            "Consumer Goods": (30, 60),
            "Infrastructure": (10, 20),
            "Metals & Mining": (5, 15),
            "Telecom": (10, 20),
            "Power": (8, 18)
        }
        pe_range = pe_ranges.get(sector, (10, 30))
        pe_ratio = round(random.uniform(pe_range[0], pe_range[1]), 2)
        
        # EPS based on price and PE ratio
        eps = round(price_base / pe_ratio, 2)
        
        # Dividend yield ranges by sector
        dividend_ranges = {
            "Information Technology": (1.0, 3.0),
            "Banking & Financial Services": (2.0, 5.0),
            "Oil & Gas": (3.0, 7.0),
            "Automobile": (1.5, 4.0),
            "Pharmaceuticals": (0.5, 2.5),
            "Consumer Goods": (1.0, 3.0),
            "Infrastructure": (0.5, 2.0),
            "Metals & Mining": (2.0, 6.0),
            "Telecom": (1.0, 4.0),
            "Power": (3.0, 7.0)
        }
        div_range = dividend_ranges.get(sector, (1.0, 3.0))
        dividend_yield = round(random.uniform(div_range[0], div_range[1]), 2)
        
        # Calculate 52-week high and low
        volatility = 0.15 + (random.random() * 0.25)  # 15-40% volatility
        year_high = round(price_base * (1 + volatility), 2)
        year_low = round(price_base * (1 - volatility), 2)
        
        # Volume metrics
        avg_volume = random.randint(100000, 5000000)
        volume = int(avg_volume * (0.7 + (random.random() * 0.6)))  # 70-130% of avg
        
        # Beta varies by sector
        beta_ranges = {
            "Information Technology": (0.9, 1.5),
            "Banking & Financial Services": (0.8, 1.3),
            "Oil & Gas": (0.7, 1.2),
            "Automobile": (0.8, 1.4),
            "Pharmaceuticals": (0.5, 0.9),
            "Consumer Goods": (0.6, 1.0),
            "Infrastructure": (1.0, 1.5),
            "Metals & Mining": (1.2, 1.8),
            "Telecom": (0.7, 1.2),
            "Power": (0.6, 1.0)
        }
        beta_range = beta_ranges.get(sector, (0.8, 1.2))
        beta = round(random.uniform(beta_range[0], beta_range[1]), 2)
        
        # Generate a realistic company name if not a known stock
        company_name = f"{ticker} {industry} Ltd."
        if len(ticker) >= 3:
            syllables = ["Tech", "Info", "Sys", "Net", "Com", "Tel", "Dig", "Data", 
                        "Fin", "Bank", "Ins", "Cap", "Oil", "Gas", "En", "Power", 
                        "Auto", "Mot", "Med", "Pharma", "Foods", "Con", "Retail", 
                        "Build", "Infra", "Steel", "Metal", "Mine"]
            
            # Use ticker to deterministically generate a name
            name_seed = sum(ord(c) for c in ticker)
            random.seed(name_seed)
            
            if random.random() < 0.5:
                # Format: [Word derived from ticker] [Industry word]
                prefix = ticker.title()
                if len(prefix) > 4:
                    prefix = prefix[:4]
                suffix = syllables[name_seed % len(syllables)]
                company_name = f"{prefix}{suffix} {industry}"
            else:
                # Format: [Industry word] [Word derived from ticker]
                prefix = syllables[(name_seed // 2) % len(syllables)]
                suffix = ticker.title()
                if len(suffix) > 4:
                    suffix = suffix[:4]
                company_name = f"{prefix}{suffix} {industry}"
            
            # Add company type
            company_types = ["Limited", "Corporation", "Enterprises", "Industries", "Group"]
            company_name += f" {company_types[name_seed % len(company_types)]}"
        
        # Generate a company description
        descriptions = [
            f"A leading {industry.lower()} company in the {sector.lower()} sector with strong market presence.",
            f"Established player in {industry.lower()} with innovative solutions for the {sector.lower()} market.",
            f"Pioneer in providing {industry.lower()} services with a focus on quality and customer satisfaction.",
            f"Growing {industry.lower()} business with expansion plans in domestic and international markets.",
            f"Trusted {sector.lower()} company known for reliability and performance in {industry.lower()}."
        ]
        description_index = sum(ord(c) for c in ticker) % len(descriptions)
        description = descriptions[description_index]
        
        return {
            "name": company_name,
            "sector": sector,
            "industry": industry,
            "volume": volume,
            "avg_volume": avg_volume,
            "market_cap": market_cap,
            "pe_ratio": pe_ratio,
            "eps": eps,
            "dividend_yield": dividend_yield,
            "year_high": year_high,
            "year_low": year_low,
            "beta": beta,
            "description": description
        }
    
    except Exception as e:
        print(f"Error generating stock details: {str(e)}")
        return None

def search_stocks(query):
    try:
        results = []
        
        # Search Indian stocks with better error handling
        for exchange, suffix in INDIAN_EXCHANGES.items():
            try:
                stock = yf.Ticker(query + suffix)
                info = stock.info
                if info and 'regularMarketPrice' in info:
                    # Get additional market data
                    hist = stock.history(period='1d')
                    if not hist.empty:
                        current_price = float(hist['Close'].iloc[-1])
                        prev_close = float(hist['Open'].iloc[0])
                        change_percent = ((current_price - prev_close) / prev_close) * 100
                        
                        results.append({
                            'ticker': query,
                            'name': info.get('longName', query),
                            'exchange': exchange,
                            'price': current_price,
                            'changePercent': change_percent,
                            'volume': info.get('regularMarketVolume', 0),
                            'marketCap': info.get('marketCap', 0),
                            'sector': info.get('sector', ''),
                            'industry': info.get('industry', '')
                        })
            except Exception as e:
                print(f"Error searching {exchange} stock {query}: {str(e)}")
                continue
        
        # Search US stocks with better error handling
        try:
            stock = yf.Ticker(query)
            info = stock.info
            if info and 'regularMarketPrice' in info:
                hist = stock.history(period='1d')
                if not hist.empty:
                    current_price = float(hist['Close'].iloc[-1])
                    prev_close = float(hist['Open'].iloc[0])
                    change_percent = ((current_price - prev_close) / prev_close) * 100
                    
                    results.append({
                        'ticker': query,
                        'name': info.get('longName', query),
                        'exchange': 'NYSE',
                        'price': current_price,
                        'changePercent': change_percent,
                        'volume': info.get('regularMarketVolume', 0),
                        'marketCap': info.get('marketCap', 0),
                        'sector': info.get('sector', ''),
                        'industry': info.get('industry', '')
                    })
        except Exception as e:
            print(f"Error searching US stock {query}: {str(e)}")
        
        # Sort results by market cap (largest first)
        results.sort(key=lambda x: x.get('marketCap', 0), reverse=True)
        
        return results
    except Exception as e:
        print(f"Error searching stocks: {str(e)}")
        return []

def get_alpha_vantage_data(ticker, exchange='NSE'):
    """
    Fetch stock data from Alpha Vantage API
    """
    try:
        # Alpha Vantage API key - replace with your actual key
        API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', 'demo')
        
        # Format ticker symbol for Alpha Vantage
        if exchange == 'NSE':
            symbol = f"NSE:{ticker}"
        elif exchange == 'BSE':
            symbol = f"BSE:{ticker}"
        else:
            symbol = ticker
            
        # Call Alpha Vantage API for daily time series
        url = f"https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&outputsize=compact&apikey={API_KEY}"
        response = requests.get(url)
        data = response.json()
        
        # Check if we got valid data
        if "Time Series (Daily)" not in data:
            print(f"No data received from Alpha Vantage for {ticker}")
            return None
            
        # Convert to DataFrame
        time_series = data["Time Series (Daily)"]
        df = pd.DataFrame.from_dict(time_series, orient='index')
        
        # Convert string columns to numeric
        for col in df.columns:
            df[col] = pd.to_numeric(df[col])
            
        # Rename columns
        df.columns = ['open', 'high', 'low', 'close', 'volume']
        
        # Sort by date
        df.index = pd.to_datetime(df.index)
        df = df.sort_index()
        
        return df
    except Exception as e:
        print(f"Error getting Alpha Vantage data for {ticker}: {str(e)}")
        return None

@lru_cache(maxsize=32)
def predict_stock_price(ticker, exchange='NSE'):
    """
    Predict stock price using historical data and statistical methods
    Uses caching to speed up repeated predictions
    """
    try:
        # Skip complex data fetching and use mock prediction most of the time
        # Only try to get real data for well-known tickers
        well_known_tickers = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 
                              'SBIN', 'AAPL', 'MSFT', 'AMZN', 'GOOG', 'TSLA']
        
        if ticker.upper() not in well_known_tickers:
            print(f"Using fast mock prediction for {ticker}")
            return create_mock_prediction(ticker)
        
        print(f"Attempting real prediction for well-known ticker: {ticker}")
        
        # Try to get current price directly without full history
        try:
            if exchange in INDIAN_EXCHANGES:
                symbol = ticker + INDIAN_EXCHANGES[exchange]
            else:
                symbol = ticker
                
            stock = yf.Ticker(symbol)
            current_data = stock.history(period='5d')
            
            if current_data.empty:
                raise Exception(f"No current data for {ticker}")
                
            current_price = float(current_data['Close'].iloc[-1])
            
            # Get just a small sample of historical data for trend calculation
            historical_close = current_data['Close'].values
            if len(historical_close) > 1:
                price_changes = np.diff(historical_close) / historical_close[:-1]
                avg_daily_return = np.mean(price_changes)
                trend = 1 if sum(price_changes) > 0 else -1
                volatility = np.std(price_changes)
            else:
                # Default values if not enough data
                avg_daily_return = 0.001
                trend = 1
                volatility = 0.02
            
            # Simplified confidence calculation
            confidence = max(0.5, min(0.9, 0.7 / (volatility * 10) if volatility > 0 else 0.7))
            
            # Generate future dates and prices more efficiently
            today = datetime.now().date()
            prediction_dates = []
            predicted_prices = []
            
            next_price = current_price
            for i in range(1, 8):
                future_date = today + timedelta(days=i)
                if future_date.weekday() >= 5:  # Skip weekends
                    continue
                    
                prediction_dates.append(future_date.strftime('%Y-%m-%d'))
                
                # Simple deterministic prediction
                daily_return = avg_daily_return * trend * (1 + (((i * 7) % 11) / 100))
                next_price = next_price * (1 + daily_return)
                predicted_prices.append(round(next_price, 2))
            
            # Only save to database occasionally to reduce overhead
            try:
                if random.random() < 0.1:  # Only save 10% of the time
                    for i, pred_date in enumerate(prediction_dates):
                        existing_prediction = StockPrediction.query.filter_by(
                            ticker=ticker, 
                            prediction_date=pred_date
                        ).first()
                        
                        if existing_prediction:
                            existing_prediction.predicted_price = predicted_prices[i]
                            existing_prediction.confidence = confidence
                        else:
                            new_prediction = StockPrediction(
                                ticker=ticker,
                                prediction_date=pred_date,
                                predicted_price=predicted_prices[i],
                                confidence=confidence
                            )
                            db.session.add(new_prediction)
                            
                    db.session.commit()
            except Exception as e:
                print(f"Error saving prediction to database: {str(e)}")
                db.session.rollback()
            
            return {
                'ticker': ticker,
                'current_price': current_price,
                'prediction_dates': prediction_dates,
                'predicted_prices': predicted_prices,
                'confidence': confidence
            }
            
        except Exception as e:
            print(f"Error in real prediction for {ticker}: {str(e)}")
            return create_mock_prediction(ticker)
            
    except Exception as e:
        print(f"Outer error in stock price prediction: {str(e)}")
        return create_mock_prediction(ticker)

@lru_cache(maxsize=100)
def create_mock_prediction(ticker):
    """Create fast mock prediction data"""
    print(f"Creating fast mock prediction for {ticker}")
    
    # Create deterministic values based on ticker
    ticker_sum = sum(ord(c) for c in ticker)
    
    # Fixed price ranges for different ticker categories
    if ticker.upper() in ['RELIANCE', 'TCS', 'HDFC', 'HDFCBANK', 'INFY', 'ITC', 'ICICIBANK', 'KOTAKBANK']:
        base_price = 1500 + (ticker_sum % 3500)
    elif ticker.upper() in ['SBIN', 'BHARTIARTL', 'AXISBANK', 'LT', 'MARUTI', 'HINDUNILVR']:
        base_price = 800 + (ticker_sum % 1200)
    else:
        base_price = 500 + (ticker_sum % 1500)
    
    # Deterministic current price
    current_price = round(base_price * (1 + ((ticker_sum % 100) / 2500)), 2)
    
    # Generate dates for predictions (next 7 business days)
    today = datetime.now().date()
    prediction_dates = []
    predicted_prices = []
    
    # Deterministic trend based on ticker
    trend_direction = 1 if (ticker_sum % 10) > 4 else -1
    trend_strength = (0.002 + ((ticker_sum % 15) / 2000)) * trend_direction
    
    # Generate predictions
    next_price = current_price
    for i in range(1, 8):
        future_date = today + timedelta(days=i)
        if future_date.weekday() >= 5:  # Skip weekends
            continue
            
        prediction_dates.append(future_date.strftime('%Y-%m-%d'))
        
        # Deterministic daily change
        daily_change = next_price * trend_strength * (1 + ((i * ticker_sum) % 11) / 100)
        next_price += daily_change
        predicted_prices.append(round(next_price, 2))
    
    # Deterministic confidence based on ticker
    confidence = 0.6 + ((ticker_sum % 30) / 100)
    
    return {
        'ticker': ticker,
        'current_price': current_price,
        'prediction_dates': prediction_dates,
        'predicted_prices': predicted_prices,
        'confidence': confidence
    }

def get_live_stock_price(ticker, exchange='NSE'):
    try:
        # Add exchange suffix for Indian stocks
        if exchange in INDIAN_EXCHANGES:
            ticker = ticker + INDIAN_EXCHANGES[exchange]
        
        # Get live data from Yahoo Finance
        stock = yf.Ticker(ticker)
        hist = stock.history(period='1d')
        if not hist.empty:
            return {
                'price': float(hist['Close'].iloc[-1]),
                'change': float(hist['Close'].iloc[-1] - hist['Open'].iloc[0]),
                'change_percent': float((hist['Close'].iloc[-1] - hist['Open'].iloc[0]) / hist['Open'].iloc[0] * 100),
                'volume': int(hist['Volume'].iloc[-1]),
                'high': float(hist['High'].iloc[-1]),
                'low': float(hist['Low'].iloc[-1])
            }
        return None
    except Exception as e:
        print(f"Error getting live stock price: {str(e)}")
        return None

def get_live_market_indices():
    try:
        indices = {
            'NIFTY50': {'symbol': '^NSEI', 'name': 'NIFTY 50'},
            'SENSEX': {'symbol': '^BSESN', 'name': 'S&P BSE SENSEX'},
            'NIFTYBANK': {'symbol': '^NSEBANK', 'name': 'NIFTY BANK'},
            'NIFTYIT': {'symbol': '^CNXIT', 'name': 'NIFTY IT'}
        }
        
        results = []
        for key, value in indices.items():
            ticker = yf.Ticker(value['symbol'])
            hist = ticker.history(period='1d')
            if not hist.empty:
                results.append({
                    'symbol': key,
                    'name': value['name'],
                    'price': float(hist['Close'].iloc[-1]),
                    'change_percent': float((hist['Close'].iloc[-1] - hist['Open'].iloc[0]) / hist['Open'].iloc[0] * 100)
                })
        return results
    except Exception as e:
        print(f"Error getting live market indices: {str(e)}")
        return []

def get_moneycontrol_indices():
    try:
        # Get predefined list of indices
        indices = [
            {"symbol": "^NSEI", "name": "NIFTY 50", "exchange": "NSE"},
            {"symbol": "^BSESN", "name": "BSE SENSEX", "exchange": "BSE"},
            {"symbol": "^NSEBANK", "name": "NIFTY BANK", "exchange": "NSE"},
            {"symbol": "^CNXIT", "name": "NIFTY IT", "exchange": "NSE"},
            {"symbol": "^CNXAUTO", "name": "NIFTY AUTO", "exchange": "NSE"}
        ]
        
        result = []
        
        for index in indices:
            try:
                symbol = index["symbol"]
                ticker = yf.Ticker(symbol)
                
                # Get historical data without headers parameter
                hist = ticker.history(period="2d")
                
                if not hist.empty and len(hist) > 0:
                    close_price = hist['Close'].iloc[-1]
                    
                    # Calculate change and change percent if we have enough data
                    if len(hist) > 1:
                        prev_close = hist['Close'].iloc[-2]
                        change = close_price - prev_close
                        change_percent = (change / prev_close) * 100
                    else:
                        change = 0
                        change_percent = 0
                    
                    result.append({
                        "symbol": symbol,
                        "name": index["name"],
                        "price": float(close_price),
                        "change": float(change),
                        "change_percent": float(change_percent)
                    })
                else:
                    # Add mock data if no real data
                    mock_price = 0
                    mock_change = 0
                    mock_change_percent = 0
                    
                    if symbol == "^NSEI":
                        mock_price = 25347.78
                        mock_change = 317.35
                        mock_change_percent = 1.27
                    elif symbol == "^BSESN":
                        mock_price = 83269.58
                        mock_change = 1089.23
                        mock_change_percent = 1.32
                    elif symbol == "^NSEBANK":
                        mock_price = 51324.85
                        mock_change = 567.41
                        mock_change_percent = 1.12
                    elif symbol == "^CNXIT":
                        mock_price = 37562.12
                        mock_change = 829.56
                        mock_change_percent = 2.26
                    elif symbol == "^CNXAUTO":
                        mock_price = 24365.45
                        mock_change = 412.78
                        mock_change_percent = 1.72
                    
                    result.append({
                        "symbol": symbol,
                        "name": index["name"],
                        "price": mock_price,
                        "change": mock_change,
                        "change_percent": mock_change_percent
                    })
            except Exception as e:
                print(f"Error fetching index {symbol}: {str(e)}")
                # Add mock data for missing index
                mock_price = 0
                mock_change = 0
                mock_change_percent = 0
                
                if symbol == "^NSEI":
                    mock_price = 25347.78
                    mock_change = 317.35
                    mock_change_percent = 1.27
                elif symbol == "^BSESN":
                    mock_price = 83269.58
                    mock_change = 1089.23
                    mock_change_percent = 1.32
                elif symbol == "^NSEBANK":
                    mock_price = 51324.85
                    mock_change = 567.41
                    mock_change_percent = 1.12
                elif symbol == "^CNXIT":
                    mock_price = 37562.12
                    mock_change = 829.56
                    mock_change_percent = 2.26
                elif symbol == "^CNXAUTO":
                    mock_price = 24365.45
                    mock_change = 412.78
                    mock_change_percent = 1.72
                
                result.append({
                    "symbol": symbol,
                    "name": index["name"],
                    "price": mock_price,
                    "change": mock_change,
                    "change_percent": mock_change_percent
                })
        
        # If we have no data at all, return default mock data
        if len(result) == 0:
            print("No indices data retrieved, using all mock data")
            result = [
                {
                    "symbol": "^NSEI",
                    "name": "NIFTY 50",
                    "price": 25347.78,
                    "change": 317.35,
                    "change_percent": 1.27
                },
                {
                    "symbol": "^BSESN",
                    "name": "BSE SENSEX",
                    "price": 83269.58,
                    "change": 1089.23,
                    "change_percent": 1.32
                },
                {
                    "symbol": "^NSEBANK",
                    "name": "NIFTY BANK",
                    "price": 51324.85,
                    "change": 567.41,
                    "change_percent": 1.12
                },
                {
                    "symbol": "^CNXIT",
                    "name": "NIFTY IT",
                    "price": 37562.12,
                    "change": 829.56,
                    "change_percent": 2.26
                },
                {
                    "symbol": "^CNXAUTO",
                    "name": "NIFTY AUTO",
                    "price": 24365.45,
                    "change": 412.78,
                    "change_percent": 1.72
                }
            ]
            
        return result
    except Exception as e:
        print(f"Error in get_moneycontrol_indices: {str(e)}")
        # Return default mock data in case of error
        return [
            {
                "symbol": "^NSEI",
                "name": "NIFTY 50",
                "price": 25347.78,
                "change": 317.35,
                "change_percent": 1.27
            },
            {
                "symbol": "^BSESN",
                "name": "BSE SENSEX",
                "price": 83269.58,
                "change": 1089.23,
                "change_percent": 1.32
            },
            {
                "symbol": "^NSEBANK",
                "name": "NIFTY BANK",
                "price": 51324.85,
                "change": 567.41,
                "change_percent": 1.12
            },
            {
                "symbol": "^CNXIT",
                "name": "NIFTY IT",
                "price": 37562.12,
                "change": 829.56,
                "change_percent": 2.26
            },
            {
                "symbol": "^CNXAUTO",
                "name": "NIFTY AUTO",
                "price": 24365.45,
                "change": 412.78,
                "change_percent": 1.72
            }
        ]

def get_moneycontrol_trending_stocks():
    try:
        # List of top Nifty 50 stocks
        stocks = [
            {'symbol': 'RELIANCE', 'name': 'Reliance Industries Ltd.'},
            {'symbol': 'TCS', 'name': 'Tata Consultancy Services Ltd.'},
            {'symbol': 'HDFCBANK', 'name': 'HDFC Bank Ltd.'},
            {'symbol': 'INFY', 'name': 'Infosys Ltd.'},
            {'symbol': 'ICICIBANK', 'name': 'ICICI Bank Ltd.'},
            {'symbol': 'HINDUNILVR', 'name': 'Hindustan Unilever Ltd.'},
            {'symbol': 'ITC', 'name': 'ITC Ltd.'},
            {'symbol': 'SBIN', 'name': 'State Bank of India'},
            {'symbol': 'BHARTIARTL', 'name': 'Bharti Airtel Ltd.'},
            {'symbol': 'KOTAKBANK', 'name': 'Kotak Mahindra Bank Ltd.'}
        ]
        
        result = []
        
        for stock in stocks:
            try:
                # Make sure to add the NSE suffix
                symbol = stock['symbol'] + '.NS'
                ticker = yf.Ticker(symbol)
                
                # Get historical data for 2 days without headers parameter
                hist = ticker.history(period="2d")
                
                if not hist.empty and len(hist) > 0:
                    # Calculate metrics
                    close_price = hist['Close'].iloc[-1]
                    volume = hist['Volume'].iloc[-1] if 'Volume' in hist else 0
                    
                    # Calculate change and change percent
                    if len(hist) > 1:
                        prev_close = hist['Close'].iloc[-2]
                        change = close_price - prev_close
                        change_percent = (change / prev_close) * 100
                    else:
                        change = 0
                        change_percent = 0
                    
                    result.append({
                        'symbol': stock['symbol'],
                        'name': stock['name'],
                        'price': float(close_price),
                        'change': float(change),
                        'changePercent': float(change_percent),
                        'volume': int(volume)
                    })
                else:
                    # Use mock data if API call fails
                    raise Exception(f"No data available for {stock['symbol']}")
            except Exception as e:
                print(f"Error getting trending stock {stock['symbol']}: {str(e)}")
                # Continue to next stock rather than terminating the loop
                continue
                
        # If we don't have enough real data, use mock data
        if len(result) < 5:
            print("Not enough trending stocks data, using mock data")
            return [
                {
                    'symbol': 'RELIANCE',
                    'name': 'Reliance Industries Ltd.',
                    'price': 2956.85,
                    'change': 42.60,
                    'changePercent': 1.46,
                    'volume': 8524631
                },
                {
                    'symbol': 'TCS',
                    'name': 'Tata Consultancy Services Ltd.',
                    'price': 3782.45,
                    'change': 68.30,
                    'changePercent': 1.84,
                    'volume': 2563142
                },
                {
                    'symbol': 'HDFCBANK',
                    'name': 'HDFC Bank Ltd.',
                    'price': 1687.75,
                    'change': 23.45,
                    'changePercent': 1.41,
                    'volume': 7125648
                },
                {
                    'symbol': 'INFY',
                    'name': 'Infosys Ltd.',
                    'price': 1524.30,
                    'change': 31.80,
                    'changePercent': 2.13,
                    'volume': 4256789
                },
                {
                    'symbol': 'ICICIBANK',
                    'name': 'ICICI Bank Ltd.',
                    'price': 1052.65,
                    'change': 18.90,
                    'changePercent': 1.83,
                    'volume': 6853214
                },
                {
                    'symbol': 'HINDUNILVR',
                    'name': 'Hindustan Unilever Ltd.',
                    'price': 2487.10,
                    'change': 35.65,
                    'changePercent': 1.45,
                    'volume': 1845632
                },
                {
                    'symbol': 'ITC',
                    'name': 'ITC Ltd.',
                    'price': 456.70,
                    'change': 8.35,
                    'changePercent': 1.86,
                    'volume': 15234876
                },
                {
                    'symbol': 'SBIN',
                    'name': 'State Bank of India',
                    'price': 768.45,
                    'change': 14.25,
                    'changePercent': 1.89,
                    'volume': 8456321
                },
                {
                    'symbol': 'BHARTIARTL',
                    'name': 'Bharti Airtel Ltd.',
                    'price': 1284.55,
                    'change': 21.40,
                    'changePercent': 1.69,
                    'volume': 3562148
                },
                {
                    'symbol': 'KOTAKBANK',
                    'name': 'Kotak Mahindra Bank Ltd.',
                    'price': 1876.30,
                    'change': 32.75,
                    'changePercent': 1.78,
                    'volume': 2985632
                }
            ]
            
        return result
    except Exception as e:
        print(f"Error fetching trending stocks: {str(e)}")
        # Return mock data in case of any error
        return [
            {
                'symbol': 'RELIANCE',
                'name': 'Reliance Industries Ltd.',
                'price': 2956.85,
                'change': 42.60,
                'changePercent': 1.46,
                'volume': 8524631
            },
            {
                'symbol': 'TCS',
                'name': 'Tata Consultancy Services Ltd.',
                'price': 3782.45,
                'change': 68.30,
                'changePercent': 1.84,
                'volume': 2563142
            },
            # Add more mock data here to ensure at least some data is returned
            {
                'symbol': 'HDFCBANK',
                'name': 'HDFC Bank Ltd.',
                'price': 1687.75,
                'change': 23.45,
                'changePercent': 1.41,
                'volume': 7125648
            },
            {
                'symbol': 'INFY',
                'name': 'Infosys Ltd.',
                'price': 1524.30,
                'change': 31.80,
                'changePercent': 2.13,
                'volume': 4256789
            },
            {
                'symbol': 'ICICIBANK',
                'name': 'ICICI Bank Ltd.',
                'price': 1052.65,
                'change': 18.90,
                'changePercent': 1.83,
                'volume': 6853214
            }
        ]

def get_moneycontrol_news():
    try:
        # Mock data for market news
        return [
            {
                'title': 'Wall Street: Big tech leads stocks relief rally after weekend tariff pause',
                'summary': 'Market watchers are continuing to advise caution, especially amid signs that bond markets are under stress.',
                'source': 'Moneycontrol',
                'date': 'April 14, 2025',
                'url': '#'
            },
            {
                'title': 'US index futures higher by 1.5 percent on temporary tariff relief on electronics',
                'summary': 'While tech-heavy Nasdaq futures are higher, the tariff relief on electronics is short-lived, as Trump clarified on Sunday that the items were "just moving to a different Tariff bucket," suggesting more changes could follow.',
                'source': 'Moneycontrol',
                'date': 'April 14, 2025',
                'url': '#'
            },
            {
                'title': 'Portal to track and transfer dividend, unclaimed shares worth Rs 1 lakh crore by August',
                'summary': 'The IEPFA along with capital market regulator Sebi, is planning to hold \'Niveshak Shivirs\' across major cities in the coming weeks to help resolve issues of investors relating to share transfer and unclaimed dividend.',
                'source': 'Moneycontrol',
                'date': 'April 14, 2025',
                'url': '#'
            },
            {
                'title': 'RBI keeps repo rate unchanged at 6.5% for seventh consecutive time',
                'summary': 'The Reserve Bank of India\'s Monetary Policy Committee voted to keep the repo rate unchanged at 6.5 percent, maintaining its stance for the seventh consecutive meeting.',
                'source': 'Moneycontrol',
                'date': 'April 13, 2025',
                'url': '#'
            },
            {
                'title': 'IT stocks rally ahead of Q4 results, Infosys leads gains',
                'summary': 'Information Technology stocks witnessed strong buying interest ahead of the Q4 results season, with Infosys leading the gains among the frontline IT companies.',
                'source': 'Moneycontrol',
                'date': 'April 13, 2025',
                'url': '#'
            },
            {
                'title': 'India\'s retail inflation eases to 4.7% in March, within RBI target range',
                'summary': 'India\'s retail inflation cooled to 4.7 percent in March, falling within the Reserve Bank of India\'s target range of 2-6 percent, providing some relief to consumers.',
                'source': 'Moneycontrol',
                'date': 'April 12, 2025',
                'url': '#'
            },
            {
                'title': 'FIIs turn net buyers in April, pump in over Rs 12,000 crore in Indian equities',
                'summary': 'Foreign Institutional Investors have turned net buyers in April after being net sellers in March, pumping in over Rs 12,000 crore in Indian equities so far this month.',
                'source': 'Moneycontrol',
                'date': 'April 12, 2025',
                'url': '#'
            },
            {
                'title': 'Gold prices hit fresh all-time high on geopolitical tensions',
                'summary': 'Gold prices surged to a new all-time high as investors sought safe-haven assets amid escalating geopolitical tensions and economic uncertainties.',
                'source': 'Moneycontrol',
                'date': 'April 11, 2025',
                'url': '#'
            },
            {
                'title': 'Oil prices rise as Middle East tensions escalate, supply concerns grow',
                'summary': 'Crude oil prices climbed as escalating tensions in the Middle East raised concerns about potential supply disruptions from the oil-rich region.',
                'source': 'Moneycontrol',
                'date': 'April 11, 2025',
                'url': '#'
            },
            {
                'title': 'Reliance Industries hits new 52-week high on robust Q4 expectations',
                'summary': 'Shares of Reliance Industries touched a fresh 52-week high on expectations of strong Q4 results driven by its retail and telecom businesses, offsetting weakness in the refining segment.',
                'source': 'Moneycontrol',
                'date': 'April 10, 2025',
                'url': '#'
            }
        ]
    except Exception as e:
        print(f"Error fetching news: {str(e)}")
        return []

@app.route("/api/search", methods=["POST"])
def search():
    try:
        data = request.json
        query = data.get("query")
        
        if not query:
            return jsonify({"error": "Query is required"}), 400
        
        results = search_stocks(query)
        return jsonify({"results": results})
        
    except Exception as e:
        print(f"Error in search: {str(e)}")
        return jsonify({"error": "Search failed"}), 500

@app.route("/api/stock/<ticker>", methods=["GET"])
def get_stock(ticker):
    try:
        exchange = request.args.get('exchange', 'NSE')
        details = get_stock_details(ticker, exchange)
        
        if not details:
            return jsonify({"error": "Stock not found"}), 404
        
        return jsonify(details)
        
    except Exception as e:
        print(f"Error getting stock: {str(e)}")
        return jsonify({"error": "Failed to get stock"}), 500

@app.route('/api/predict/<ticker>', methods=['GET'])
def predict(ticker):
    try:
        exchange = request.args.get('exchange', default='NSE', type=str)
        simplify = request.args.get('simplify', default='false', type=str).lower() == 'true'
        
        start_time = time.time()
        
        # If simplify is true, use mock prediction directly for faster response
        if simplify:
            print(f"Using simplified mock prediction for {ticker} as requested")
            prediction_data = create_mock_prediction(ticker)
        else:
            # Get prediction with timeout handling
            prediction_data = predict_stock_price(ticker, exchange)
        
        if not prediction_data:
            print(f"No prediction data for {ticker}")
            return jsonify({
                'success': False,
                'message': 'Unable to generate prediction for ' + ticker
            }), 400
        
        # Get basic stock details (name, etc.) without full details to save time
        try:
            if exchange in INDIAN_EXCHANGES:
                full_ticker = ticker + INDIAN_EXCHANGES[exchange]
            else:
                full_ticker = ticker
                
            stock = yf.Ticker(full_ticker)
            info = stock.info
            
            # Only get essential info
            stock_details = {
                'name': info.get('shortName', ticker),
                'sector': info.get('sector', 'Technology'),
                'industry': info.get('industry', 'Software'),
                'volume': info.get('volume', 100000),
                'market_cap': info.get('marketCap', 1000000000)
            }
        except Exception as e:
            print(f"Error getting stock details: {str(e)}")
            # Provide fallback data
            stock_details = {
                'name': ticker.upper(),
                'sector': 'Technology',
                'industry': 'Software',
                'volume': 100000,
                'market_cap': 1000000000
            }
        
        # Combine prediction with stock details
        result = {
            'success': True,
            'ticker': ticker,
            'exchange': exchange,
            'current_price': prediction_data['current_price'],
            'prediction_dates': prediction_data['prediction_dates'],
            'predicted_prices': prediction_data['predicted_prices'],
            'confidence': prediction_data['confidence']
        }
        
        # Add stock details
        for key, value in stock_details.items():
            result[key] = value
            
        # Log performance
        end_time = time.time()
        print(f"Prediction for {ticker} completed in {end_time - start_time:.2f} seconds")
            
        return jsonify(result)
    except Exception as e:
        print(f"Error in prediction endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while generating the prediction',
            'error': str(e)
        }), 500

@app.route("/api/register", methods=['POST'])
def register():
    try:
        data = request.get_json()
        name = data.get('name')
        password = data.get('password')
        email = data.get('email')

        if not name or not password or not email:
            return jsonify({'error': 'Missing required fields'}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Email already exists'}), 400

        # Create new user
        hashed_password = generate_password_hash(password)
        new_user = User(name=name, password_hash=hashed_password, email=email)
        db.session.add(new_user)
        db.session.commit()

        # Create access token
        access_token = create_access_token(identity=new_user.id)
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {
                'id': new_user.id,
                'email': new_user.email,
                'name': new_user.name
            }
        }), 201

    except Exception as e:
        print(f"Registration error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'error': 'Missing email or password'}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401

        access_token = create_access_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name
            }
        }), 200

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@app.route("/api/buy", methods=["POST"])
def buy_stock():
    try:
        data = request.json
        email = data.get("email")
        ticker = data.get("ticker")
        quantity = int(data.get("quantity", 1))

        if not all([email, ticker, quantity]):
            return jsonify({"error": "Missing required fields"}), 400

        price = get_stock_price(ticker)
        if not price:
            return jsonify({"error": "Could not fetch stock price"}), 400

        total_cost = price * quantity

        db = load_user_data()
        if email not in db["users"]:
            return jsonify({"error": "User not found"}), 404

        user = db["users"][email]
        if user["balance"] < total_cost:
            return jsonify({"error": "Insufficient funds"}), 400

        # Update portfolio
        portfolio = user["portfolio"]
        portfolio[ticker] = portfolio.get(ticker, 0) + quantity

        # Update balance
        user["balance"] -= total_cost

        # Record transaction
        transaction = {
            "type": "buy",
            "ticker": ticker,
            "quantity": quantity,
            "price": price,
            "total": total_cost,
            "timestamp": datetime.now().isoformat()
        }
        user["transactions"].append(transaction)

        save_user_data(db)
        return jsonify({
            "message": f"Successfully bought {quantity} shares of {ticker}",
            "balance": user["balance"]
        })

    except Exception as e:
        print(f"Error in buy_stock: {str(e)}")
        return jsonify({"error": "Failed to buy stock"}), 500

@app.route("/api/sell", methods=["POST"])
def sell_stock():
    try:
        data = request.json
        email = data.get("email")
        ticker = data.get("ticker")
        quantity = int(data.get("quantity", 1))

        if not all([email, ticker, quantity]):
            return jsonify({"error": "Missing required fields"}), 400

        price = get_stock_price(ticker)
        if not price:
            return jsonify({"error": "Could not fetch stock price"}), 400

        total_value = price * quantity

        db = load_user_data()
        if email not in db["users"]:
            return jsonify({"error": "User not found"}), 404

        user = db["users"][email]
        portfolio = user["portfolio"]

        if ticker not in portfolio or portfolio[ticker] < quantity:
            return jsonify({"error": "Not enough shares to sell"}), 400

        # Update portfolio
        portfolio[ticker] -= quantity
        if portfolio[ticker] == 0:
            del portfolio[ticker]

        # Update balance
        user["balance"] += total_value

        # Record transaction
        transaction = {
            "type": "sell",
            "ticker": ticker,
            "quantity": quantity,
            "price": price,
            "total": total_value,
            "timestamp": datetime.now().isoformat()
        }
        user["transactions"].append(transaction)

        save_user_data(db)
        return jsonify({
            "message": f"Successfully sold {quantity} shares of {ticker}",
            "balance": user["balance"]
        })

    except Exception as e:
        print(f"Error in sell_stock: {str(e)}")
        return jsonify({"error": "Failed to sell stock"}), 500

@app.route("/api/watchlist/add", methods=["POST"])
def add_to_watchlist():
    try:
        data = request.json
        email = data.get("email")
        ticker = data.get("ticker")

        if not all([email, ticker]):
            return jsonify({"error": "Missing required fields"}), 400

        db = load_user_data()
        if email not in db["users"]:
            return jsonify({"error": "User not found"}), 404

        user = db["users"][email]
        if ticker not in user["watchlist"]:
            user["watchlist"].append(ticker)
            save_user_data(db)

        return jsonify({"message": f"Added {ticker} to watchlist"})

    except Exception as e:
        print(f"Error in add_to_watchlist: {str(e)}")
        return jsonify({"error": "Failed to add to watchlist"}), 500

@app.route("/api/watchlist/remove", methods=["POST"])
def remove_from_watchlist():
    try:
        data = request.json
        email = data.get("email")
        ticker = data.get("ticker")

        if not all([email, ticker]):
            return jsonify({"error": "Missing required fields"}), 400

        db = load_user_data()
        if email not in db["users"]:
            return jsonify({"error": "User not found"}), 404

        user = db["users"][email]
        if ticker in user["watchlist"]:
            user["watchlist"].remove(ticker)
            save_user_data(db)

        return jsonify({"message": f"Removed {ticker} from watchlist"})

    except Exception as e:
        print(f"Error in remove_from_watchlist: {str(e)}")
        return jsonify({"error": "Failed to remove from watchlist"}), 500

@app.route("/api/watchlist", methods=["GET"])
def get_watchlist():
    try:
        email = request.args.get("email")

        if not email:
            return jsonify({"error": "Email is required"}), 400

        db = load_user_data()
        if email not in db["users"]:
            return jsonify({"error": "User not found"}), 404

        user = db["users"][email]
        return jsonify({"watchlist": user["watchlist"]})

    except Exception as e:
        print(f"Error in get_watchlist: {str(e)}")
        return jsonify({"error": "Failed to get watchlist"}), 500

@app.route('/api/portfolio', methods=['GET'])
def get_portfolio():
    try:
        email = request.args.get("email")

        if not email:
            return jsonify({"error": "Email is required"}), 400

        db = load_user_data()
        if email not in db["users"]:
            return jsonify({"error": "User not found"}), 404

        user = db["users"][email]
        portfolio = user["portfolio"]
        total_value = 0

        # Calculate current value of portfolio
        for ticker, quantity in portfolio.items():
            price = get_stock_price(ticker)
            if price:
                total_value += price * quantity

        return jsonify({
            "portfolio": portfolio,
            "balance": user["balance"],
            "total_value": total_value + user["balance"]
        })

    except Exception as e:
        print(f"Error in get_portfolio: {str(e)}")
        return jsonify({"error": "Failed to get portfolio"}), 500

@app.route("/api/profile", methods=["POST"])
def update_profile():
    try:
        data = request.json
        email = data.get("email")
        profile_data = data.get("profile")

        if not all([email, profile_data]):
            return jsonify({"error": "Missing required fields"}), 400

        db = load_user_data()
        if email not in db["users"]:
            return jsonify({"error": "User not found"}), 404

        user = db["users"][email]
        user["profile"].update(profile_data)
        save_user_data(db)

        return jsonify({"message": "Profile updated successfully"})

    except Exception as e:
        print(f"Error in update_profile: {str(e)}")
        return jsonify({"error": "Failed to update profile"}), 500

@app.route('/api/market/indices', methods=['GET'])
def market_indices():
    try:
        indices = get_moneycontrol_indices()
        return jsonify(indices)
    except Exception as e:
        print(f"Error in market indices endpoint: {str(e)}")
        return jsonify([])

@app.route('/api/market/trending', methods=['GET'])
def market_trending():
    try:
        trending = get_moneycontrol_trending_stocks()
        return jsonify(trending)
    except Exception as e:
        print(f"Error in trending endpoint: {str(e)}")
        return jsonify([])

@app.route('/api/market/news', methods=['GET'])
def market_news():
    try:
        news = get_moneycontrol_news()
        return jsonify(news)
    except Exception as e:
        print(f"Error in news endpoint: {str(e)}")
        # Return mock data in case of error
        return jsonify([
            {
                'title': 'Wall Street: Big tech leads stocks relief rally after weekend tariff pause',
                'summary': 'Market watchers are continuing to advise caution, especially amid signs that bond markets are under stress.',
                'source': 'Moneycontrol',
                'date': 'April 14, 2025',
                'url': '#'
            },
            {
                'title': 'US index futures higher by 1.5 percent on temporary tariff relief on electronics',
                'summary': 'While tech-heavy Nasdaq futures are higher, the tariff relief on electronics is short-lived, as Trump clarified on Sunday that the items were "just moving to a different Tariff bucket," suggesting more changes could follow.',
                'source': 'Moneycontrol',
                'date': 'April 14, 2025',
                'url': '#'
            },
            {
                'title': 'RBI keeps repo rate unchanged at 6.5% for seventh consecutive time',
                'summary': 'The Reserve Bank of India\'s Monetary Policy Committee voted to keep the repo rate unchanged at 6.5 percent, maintaining its stance for the seventh consecutive meeting.',
                'source': 'Moneycontrol',
                'date': 'April 13, 2025',
                'url': '#'
            }
        ])

@app.route('/api/trade', methods=['POST'])
def trade():
    try:
        data = request.json
        email = data.get("email")
        ticker = data.get("ticker")
        quantity = int(data.get("quantity", 1))
        action = data.get("action")  # "buy" or "sell"

        if not all([email, ticker, quantity, action]):
            return jsonify({"error": "Missing required fields"}), 400

        if action not in ["buy", "sell"]:
            return jsonify({"error": "Invalid action"}), 400

        if action == "buy":
            return buy_stock()
        else:
            return sell_stock()

    except Exception as e:
        print(f"Error in trade: {str(e)}")
        return jsonify({"error": "Failed to execute trade"}), 500

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    if origin in ["http://localhost:5173", "http://127.0.0.1:5173", 
                  "http://localhost:5174", "http://127.0.0.1:5174", 
                  "http://localhost:3000", "http://127.0.0.1:3000"]:
        response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

if __name__ == "__main__":
    # Create user_data.json if it doesn't exist
    if not os.path.exists(USER_DATA_FILE):
        with open(USER_DATA_FILE, 'w') as f:
            json.dump(load_user_data(), f, indent=4)
    
    app.run(debug=True)
