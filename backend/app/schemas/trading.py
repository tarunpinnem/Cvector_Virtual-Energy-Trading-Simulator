from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class BidType(str, Enum):
    """Bid type enumeration."""
    BUY = "buy"
    SELL = "sell"

class BidStatus(str, Enum):
    """Bid status enumeration."""
    PENDING = "pending"
    EXECUTED = "executed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class MarketType(str, Enum):
    """Market type enumeration."""
    DAY_AHEAD = "day_ahead"
    REAL_TIME = "real_time"

# Base schemas
class BidBase(BaseModel):
    """Base schema for bids."""
    bid_type: BidType
    quantity: float = Field(..., gt=0, description="Quantity in MWh")
    price: float = Field(..., gt=0, description="Price in $/MWh")
    hour_slot: int = Field(..., ge=0, le=23, description="Hour of the day (0-23)")
    trading_date: datetime

    @validator('quantity')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be positive')
        return v

    @validator('price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be positive')
        return v

class BidCreate(BidBase):
    """Schema for creating a new bid."""
    pass

class BidUpdate(BaseModel):
    """Schema for updating a bid."""
    quantity: Optional[float] = Field(None, gt=0)
    price: Optional[float] = Field(None, gt=0)
    status: Optional[BidStatus] = None

class BidResponse(BidBase):
    """Schema for bid response."""
    id: int
    user_id: int
    status: BidStatus
    clearing_price: Optional[float] = None
    executed_quantity: float = 0.0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Portfolio schemas
class PortfolioBase(BaseModel):
    """Base schema for portfolio."""
    cash_balance: float = 100000.0
    total_pnl: float = 0.0
    daily_pnl: float = 0.0
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0

class PortfolioResponse(PortfolioBase):
    """Schema for portfolio response."""
    id: int
    user_id: int
    max_drawdown: float
    total_trades: int
    winning_trades: int
    win_rate: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @validator('win_rate', always=True)
    def calculate_win_rate(cls, v, values):
        total_trades = values.get('total_trades', 0)
        winning_trades = values.get('winning_trades', 0)
        if total_trades > 0:
            return (winning_trades / total_trades) * 100
        return 0.0

    class Config:
        from_attributes = True

# Position schemas
class PositionBase(BaseModel):
    """Base schema for positions."""
    quantity: float
    entry_price: float
    trading_date: datetime
    hour_slot: int

class PositionResponse(PositionBase):
    """Schema for position response."""
    id: int
    user_id: int
    bid_id: int
    current_price: Optional[float] = None
    unrealized_pnl: float = 0.0
    realized_pnl: float = 0.0
    is_closed: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Market data schemas
class MarketDataBase(BaseModel):
    """Base schema for market data."""
    market_type: MarketType
    price: float
    load: Optional[float] = None
    timestamp: datetime
    trading_date: datetime
    hour_slot: Optional[int] = None
    region: str = "CAISO"

class MarketDataResponse(MarketDataBase):
    """Schema for market data response."""
    id: int
    data_source: str
    created_at: datetime

    class Config:
        from_attributes = True

# Trade schemas
class TradeResponse(BaseModel):
    """Schema for trade response."""
    id: int
    user_id: int
    bid_id: int
    quantity: float
    price: float
    total_value: float
    pnl: float
    trade_type: BidType
    trading_date: datetime
    hour_slot: int
    executed_at: datetime

    class Config:
        from_attributes = True

# Dashboard schemas
class DashboardSummary(BaseModel):
    """Schema for dashboard summary data."""
    portfolio: PortfolioResponse
    active_positions: List[PositionResponse]
    recent_trades: List[TradeResponse]
    pending_bids: List[BidResponse]
    market_summary: dict

class MarketSummary(BaseModel):
    """Schema for market summary data."""
    current_price: float
    price_change_24h: float
    price_change_percent: float
    volume_24h: float
    high_24h: float
    low_24h: float
    average_price_24h: float
    last_updated: datetime

# Validation schemas
class BidValidation(BaseModel):
    """Schema for bid validation response."""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    estimated_cost: Optional[float] = None

# Analytics schemas
class PerformanceMetrics(BaseModel):
    """Schema for performance analytics."""
    total_return: float
    annual_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    profit_factor: float
    total_trades: int
    average_trade_duration: float  # in hours

class PriceAnalytics(BaseModel):
    """Schema for price analytics."""
    current_price: float
    moving_average_24h: float
    volatility_24h: float
    price_trend: str  # "up", "down", "sideways"
    support_level: float
    resistance_level: float
    rsi: float  # Relative Strength Index

# WebSocket message schemas
class WebSocketMessage(BaseModel):
    """Schema for WebSocket messages."""
    type: str
    data: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class RealTimePrice(BaseModel):
    """Schema for real-time price updates."""
    price: float
    timestamp: datetime
    region: str = "CAISO"
    change_24h: Optional[float] = None
    volume: Optional[float] = None
