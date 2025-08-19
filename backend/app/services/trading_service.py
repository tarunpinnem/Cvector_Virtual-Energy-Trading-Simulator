from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.models.trading import Bid, Position, Portfolio, Trade, User
from app.schemas.trading import BidCreate, BidUpdate, BidStatus, BidType
from app.services.market_data_service import MarketDataService
from app.core.config import settings

class TradingService:
    """Service for handling trading operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.market_service = MarketDataService()
    
    async def create_bid(self, bid_data: BidCreate, user_id: int) -> Bid:
        """Create a new bid for the day-ahead market."""
        
        # Validate bid timing (must be before 11 AM)
        current_time = datetime.now()
        if current_time.hour >= settings.DAY_AHEAD_CUTOFF_HOUR:
            raise ValueError("Day-ahead bids must be submitted before 11 AM")
        
        # Check if user has reached bid limit for this hour
        existing_bids = self.db.query(Bid).filter(
            Bid.user_id == user_id,
            Bid.hour_slot == bid_data.hour_slot,
            Bid.trading_date == bid_data.trading_date.date(),
            Bid.status == BidStatus.PENDING
        ).count()
        
        if existing_bids >= settings.MAX_BIDS_PER_HOUR:
            raise ValueError(f"Maximum {settings.MAX_BIDS_PER_HOUR} bids per hour allowed")
        
        # Create the bid
        db_bid = Bid(
            user_id=user_id,
            bid_type=bid_data.bid_type,
            quantity=bid_data.quantity,
            price=bid_data.price,
            hour_slot=bid_data.hour_slot,
            trading_date=bid_data.trading_date,
            status=BidStatus.PENDING
        )
        
        self.db.add(db_bid)
        self.db.commit()
        self.db.refresh(db_bid)
        
        return db_bid
    
    async def update_bid(self, bid_id: int, bid_update: BidUpdate, user_id: int) -> Bid:
        """Update an existing bid."""
        
        bid = self.db.query(Bid).filter(
            Bid.id == bid_id,
            Bid.user_id == user_id,
            Bid.status == BidStatus.PENDING
        ).first()
        
        if not bid:
            raise ValueError("Bid not found or cannot be modified")
        
        # Check if it's still within the cutoff time
        current_time = datetime.now()
        if current_time.hour >= settings.DAY_AHEAD_CUTOFF_HOUR:
            raise ValueError("Cannot modify bids after 11 AM cutoff")
        
        # Update fields
        if bid_update.quantity is not None:
            bid.quantity = bid_update.quantity
        if bid_update.price is not None:
            bid.price = bid_update.price
        if bid_update.status is not None:
            bid.status = bid_update.status
        
        bid.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(bid)
        
        return bid
    
    async def cancel_bid(self, bid_id: int, user_id: int) -> Bid:
        """Cancel a pending bid."""
        
        bid = self.db.query(Bid).filter(
            Bid.id == bid_id,
            Bid.user_id == user_id,
            Bid.status == BidStatus.PENDING
        ).first()
        
        if not bid:
            raise ValueError("Bid not found or cannot be cancelled")
        
        bid.status = BidStatus.CANCELLED
        bid.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(bid)
        
        return bid
    
    async def execute_day_ahead_clearing(self, trading_date: datetime, hour_slot: int):
        """Execute day-ahead market clearing for a specific hour."""
        
        # Get all pending bids for the hour
        pending_bids = self.db.query(Bid).filter(
            Bid.trading_date == trading_date.date(),
            Bid.hour_slot == hour_slot,
            Bid.status == BidStatus.PENDING
        ).all()
        
        if not pending_bids:
            return
        
        # Convert to dict format for clearing price calculation
        bid_data = [{
            "bid_type": bid.bid_type.value,
            "quantity": bid.quantity,
            "price": bid.price,
            "id": bid.id
        } for bid in pending_bids]
        
        # Calculate clearing price
        clearing_price = await self.market_service.calculate_clearing_price(bid_data, hour_slot)
        
        # Execute bids that meet the clearing price
        for bid in pending_bids:
            if self._bid_meets_clearing_price(bid, clearing_price):
                await self._execute_bid(bid, clearing_price)
            else:
                bid.status = BidStatus.REJECTED
                self.db.commit()
    
    def _bid_meets_clearing_price(self, bid: Bid, clearing_price: float) -> bool:
        """Check if a bid meets the clearing price criteria."""
        if bid.bid_type == BidType.BUY:
            return bid.price >= clearing_price
        else:  # SELL
            return bid.price <= clearing_price
    
    async def _execute_bid(self, bid: Bid, clearing_price: float):
        """Execute a bid at the clearing price."""
        
        # Update bid status
        bid.status = BidStatus.EXECUTED
        bid.clearing_price = clearing_price
        bid.executed_quantity = bid.quantity
        bid.updated_at = datetime.utcnow()
        
        # Create position
        position = Position(
            user_id=bid.user_id,
            bid_id=bid.id,
            quantity=bid.quantity if bid.bid_type == BidType.BUY else -bid.quantity,
            entry_price=clearing_price,
            trading_date=bid.trading_date,
            hour_slot=bid.hour_slot
        )
        
        # Create trade record
        trade = Trade(
            user_id=bid.user_id,
            bid_id=bid.id,
            quantity=bid.quantity,
            price=clearing_price,
            total_value=bid.quantity * clearing_price,
            trade_type=bid.bid_type,
            trading_date=bid.trading_date,
            hour_slot=bid.hour_slot
        )
        
        self.db.add(position)
        self.db.add(trade)
        
        # Update portfolio
        await self._update_portfolio_after_trade(bid.user_id, trade)
        
        self.db.commit()
    
    async def _update_portfolio_after_trade(self, user_id: int, trade: Trade):
        """Update user portfolio after a trade."""
        
        portfolio = self.db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
        if not portfolio:
            # Create portfolio if it doesn't exist
            portfolio = Portfolio(user_id=user_id)
            self.db.add(portfolio)
        
        # Update trade statistics
        portfolio.total_trades += 1
        
        # Update cash balance (simplified)
        if trade.trade_type == BidType.BUY:
            portfolio.cash_balance -= trade.total_value
        else:
            portfolio.cash_balance += trade.total_value
        
        portfolio.updated_at = datetime.utcnow()
    
    async def update_real_time_positions(self):
        """Update all open positions with real-time prices."""
        
        # Get all open positions
        open_positions = self.db.query(Position).filter(Position.is_closed == False).all()
        
        # Get current real-time price
        market_data = await self.market_service.get_real_time_data()
        current_price = market_data["price"]
        
        for position in open_positions:
            # Update current price
            position.current_price = current_price
            
            # Calculate unrealized P&L
            if position.quantity > 0:  # Long position
                position.unrealized_pnl = (current_price - position.entry_price) * abs(position.quantity)
            else:  # Short position
                position.unrealized_pnl = (position.entry_price - current_price) * abs(position.quantity)
            
            position.updated_at = datetime.utcnow()
        
        self.db.commit()
    
    def get_user_positions(self, user_id: int, include_closed: bool = False) -> List[Position]:
        """Get user's positions."""
        query = self.db.query(Position).filter(Position.user_id == user_id)
        
        if not include_closed:
            query = query.filter(Position.is_closed == False)
        
        return query.order_by(Position.created_at.desc()).all()
    
    def get_user_bids(self, user_id: int, status: Optional[BidStatus] = None) -> List[Bid]:
        """Get user's bids."""
        query = self.db.query(Bid).filter(Bid.user_id == user_id)
        
        if status:
            query = query.filter(Bid.status == status)
        
        return query.order_by(Bid.created_at.desc()).all()
    
    def get_user_trades(self, user_id: int, limit: int = 50) -> List[Trade]:
        """Get user's trade history."""
        return self.db.query(Trade).filter(
            Trade.user_id == user_id
        ).order_by(Trade.executed_at.desc()).limit(limit).all()
