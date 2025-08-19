from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum
from datetime import datetime

class BidType(str, enum.Enum):
    """Enumeration for bid types."""
    BUY = "buy"
    SELL = "sell"

class BidStatus(str, enum.Enum):
    """Enumeration for bid status."""
    PENDING = "pending"
    EXECUTED = "executed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class MarketType(str, enum.Enum):
    """Enumeration for market types."""
    DAY_AHEAD = "day_ahead"
    REAL_TIME = "real_time"

class User(Base):
    """User model for trader accounts."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    bids = relationship("Bid", back_populates="user")
    positions = relationship("Position", back_populates="user")
    portfolio = relationship("Portfolio", back_populates="user", uselist=False)

class Portfolio(Base):
    """Portfolio model for tracking user's trading performance."""
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    cash_balance = Column(Float, default=100000.0)  # Starting with $100k
    total_pnl = Column(Float, default=0.0)
    daily_pnl = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="portfolio")

class Bid(Base):
    """Bid model for day-ahead market orders."""
    __tablename__ = "bids"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bid_type = Column(Enum(BidType), nullable=False)
    quantity = Column(Float, nullable=False)  # MWh
    price = Column(Float, nullable=False)  # $/MWh
    hour_slot = Column(Integer, nullable=False)  # Hour of the day (0-23)
    trading_date = Column(DateTime, nullable=False)  # Date for which the bid is placed
    status = Column(Enum(BidStatus), default=BidStatus.PENDING)
    clearing_price = Column(Float, nullable=True)  # Price at which bid was cleared
    executed_quantity = Column(Float, default=0.0)  # Actual quantity executed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="bids")
    positions = relationship("Position", back_populates="bid")

class Position(Base):
    """Position model for tracking energy contracts."""
    __tablename__ = "positions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bid_id = Column(Integer, ForeignKey("bids.id"), nullable=False)
    quantity = Column(Float, nullable=False)  # MWh
    entry_price = Column(Float, nullable=False)  # $/MWh (day-ahead clearing price)
    current_price = Column(Float, nullable=True)  # Current real-time price
    unrealized_pnl = Column(Float, default=0.0)
    realized_pnl = Column(Float, default=0.0)
    is_closed = Column(Boolean, default=False)
    trading_date = Column(DateTime, nullable=False)
    hour_slot = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="positions")
    bid = relationship("Bid", back_populates="positions")

class MarketData(Base):
    """Market data model for storing real-time and historical prices."""
    __tablename__ = "market_data"
    
    id = Column(Integer, primary_key=True, index=True)
    market_type = Column(Enum(MarketType), nullable=False)
    price = Column(Float, nullable=False)  # $/MWh
    load = Column(Float, nullable=True)  # MW
    timestamp = Column(DateTime, nullable=False)
    trading_date = Column(DateTime, nullable=False)
    hour_slot = Column(Integer, nullable=True)  # For day-ahead data
    region = Column(String(20), default="CAISO")  # Market region
    data_source = Column(String(50), default="gridstatus")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Trade(Base):
    """Trade model for executed transactions."""
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bid_id = Column(Integer, ForeignKey("bids.id"), nullable=False)
    quantity = Column(Float, nullable=False)  # MWh
    price = Column(Float, nullable=False)  # $/MWh
    total_value = Column(Float, nullable=False)  # Total trade value
    pnl = Column(Float, default=0.0)  # Profit/Loss for this trade
    trade_type = Column(Enum(BidType), nullable=False)
    trading_date = Column(DateTime, nullable=False)
    hour_slot = Column(Integer, nullable=False)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Add indexes for better query performance
    __table_args__ = (
        {"sqlite_autoincrement": True},
    )
