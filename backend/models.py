from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    balance = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    portfolio = db.relationship('Portfolio', backref='user', uselist=False)
    transactions = db.relationship('Transaction', backref='user')
    watchlist = db.relationship('WatchlistItem', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Portfolio(db.Model):
    __tablename__ = 'portfolios'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    cash_balance = db.Column(db.Float, default=100000.0)  # Initial balance
    total_value = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    holdings = db.relationship('PortfolioHolding', backref='portfolio')

class PortfolioHolding(db.Model):
    __tablename__ = 'portfolio_holdings'
    
    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolios.id'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    average_price = db.Column(db.Float, nullable=False)
    current_price = db.Column(db.Float, nullable=False)
    total_value = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('portfolio_id', 'ticker', name='unique_holding'),
    )

class WatchlistItem(db.Model):
    __tablename__ = 'watchlist'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ticker = db.Column(db.String(20), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'ticker', name='unique_watchlist_item'),
    )

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(4), nullable=False)  # 'BUY' or 'SELL'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'ticker': self.ticker,
            'quantity': self.quantity,
            'price': self.price,
            'transaction_type': self.transaction_type,
            'timestamp': self.timestamp.isoformat()
        }

class StockPrediction(db.Model):
    __tablename__ = 'stock_predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    ticker = db.Column(db.String(20), nullable=False)
    prediction_date = db.Column(db.Date, nullable=False)
    current_price = db.Column(db.Float, nullable=False)
    confidence = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Day 1 prediction
    day_1_date = db.Column(db.String(10), nullable=True)
    day_1_price = db.Column(db.Float, nullable=True)
    
    # Day 2 prediction
    day_2_date = db.Column(db.String(10), nullable=True)
    day_2_price = db.Column(db.Float, nullable=True)
    
    # Day 3 prediction
    day_3_date = db.Column(db.String(10), nullable=True)
    day_3_price = db.Column(db.Float, nullable=True)
    
    # Day 4 prediction
    day_4_date = db.Column(db.String(10), nullable=True)
    day_4_price = db.Column(db.Float, nullable=True)
    
    # Day 5 prediction
    day_5_date = db.Column(db.String(10), nullable=True)
    day_5_price = db.Column(db.Float, nullable=True)
    
    # Day 6 prediction
    day_6_date = db.Column(db.String(10), nullable=True)
    day_6_price = db.Column(db.Float, nullable=True)
    
    # Day 7 prediction
    day_7_date = db.Column(db.String(10), nullable=True)
    day_7_price = db.Column(db.Float, nullable=True)
    
    __table_args__ = (
        db.UniqueConstraint('ticker', 'prediction_date', name='unique_prediction'),
    ) 