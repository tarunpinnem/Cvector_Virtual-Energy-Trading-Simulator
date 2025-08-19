from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.schemas.trading import (
    BidCreate, BidUpdate, BidResponse, BidStatus,
    PositionResponse, TradeResponse, BidValidation
)
from app.services.trading_service import TradingService

router = APIRouter()

@router.post("/bids", response_model=BidResponse)
async def create_bid(
    bid_data: BidCreate,
    user_id: int = 1,  # Simplified - in production, get from JWT token
    db: Session = Depends(get_db)
):
    """Create a new bid for the day-ahead market."""
    try:
        trading_service = TradingService(db)
        bid = await trading_service.create_bid(bid_data, user_id)
        return bid
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/bids", response_model=List[BidResponse])
def get_user_bids(
    status: Optional[BidStatus] = None,
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Get user's bids with optional status filter."""
    try:
        trading_service = TradingService(db)
        bids = trading_service.get_user_bids(user_id, status)
        return bids
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/bids/{bid_id}", response_model=BidResponse)
async def update_bid(
    bid_id: int,
    bid_update: BidUpdate,
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Update an existing bid."""
    try:
        trading_service = TradingService(db)
        bid = await trading_service.update_bid(bid_id, bid_update, user_id)
        return bid
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/bids/{bid_id}", response_model=BidResponse)
async def cancel_bid(
    bid_id: int,
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Cancel a pending bid."""
    try:
        trading_service = TradingService(db)
        bid = await trading_service.cancel_bid(bid_id, user_id)
        return bid
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/bids/validate", response_model=BidValidation)
async def validate_bid(
    bid_data: BidCreate,
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Validate a bid before submission."""
    try:
        errors = []
        warnings = []
        
        # Check timing
        current_time = datetime.now()
        if current_time.hour >= 11:
            errors.append("Day-ahead bids must be submitted before 11 AM")
        
        # Check quantity
        if bid_data.quantity <= 0:
            errors.append("Quantity must be positive")
        elif bid_data.quantity > 100:  # Max 100 MWh per bid
            warnings.append("Large quantity - consider splitting into multiple bids")
        
        # Check price reasonableness
        if bid_data.price <= 0:
            errors.append("Price must be positive")
        elif bid_data.price > 1000:  # $1000/MWh seems excessive
            warnings.append("Price seems unusually high")
        elif bid_data.price < 10:  # Below $10/MWh seems low
            warnings.append("Price seems unusually low")
        
        # Estimate cost
        estimated_cost = bid_data.quantity * bid_data.price if bid_data.bid_type.value == "buy" else None
        
        return BidValidation(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            estimated_cost=estimated_cost
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/positions", response_model=List[PositionResponse])
def get_user_positions(
    include_closed: bool = False,
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Get user's positions."""
    try:
        trading_service = TradingService(db)
        positions = trading_service.get_user_positions(user_id, include_closed)
        return positions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/trades", response_model=List[TradeResponse])
def get_user_trades(
    limit: int = 50,
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Get user's trade history."""
    try:
        trading_service = TradingService(db)
        trades = trading_service.get_user_trades(user_id, limit)
        return trades
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/market/clear/{trading_date}/{hour_slot}")
async def trigger_market_clearing(
    trading_date: str,
    hour_slot: int,
    db: Session = Depends(get_db)
):
    """Manually trigger market clearing for testing purposes."""
    try:
        trading_service = TradingService(db)
        date_obj = datetime.fromisoformat(trading_date)
        await trading_service.execute_day_ahead_clearing(date_obj, hour_slot)
        return {"message": f"Market clearing executed for {trading_date} hour {hour_slot}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/positions/update-realtime")
async def update_realtime_positions(db: Session = Depends(get_db)):
    """Update all positions with current real-time prices."""
    try:
        trading_service = TradingService(db)
        await trading_service.update_real_time_positions()
        return {"message": "Real-time positions updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
