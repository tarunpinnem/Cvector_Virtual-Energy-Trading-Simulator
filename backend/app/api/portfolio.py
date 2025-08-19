from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict

from app.core.database import get_db
from app.schemas.trading import PortfolioResponse, PerformanceMetrics, DashboardSummary
from app.models.trading import Portfolio, Position, Trade, Bid, BidStatus
from app.services.trading_service import TradingService
from app.services.market_data_service import MarketDataService

router = APIRouter()

@router.get("/", response_model=PortfolioResponse)
def get_portfolio(
    user_id: int = 1,  # Simplified - in production, get from JWT token
    db: Session = Depends(get_db)
):
    """Get user's portfolio information."""
    try:
        portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
        
        if not portfolio:
            # Create default portfolio
            portfolio = Portfolio(user_id=user_id)
            db.add(portfolio)
            db.commit()
            db.refresh(portfolio)
        
        return portfolio
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching portfolio: {str(e)}")

@router.get("/dashboard")
async def get_dashboard_summary(
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard summary."""
    try:
        # Get portfolio
        portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
        if not portfolio:
            portfolio = Portfolio(user_id=user_id)
            db.add(portfolio)
            db.commit()
            db.refresh(portfolio)
        
        # Get active positions
        active_positions = db.query(Position).filter(
            Position.user_id == user_id,
            Position.is_closed == False
        ).limit(10).all()
        
        # Get recent trades
        recent_trades = db.query(Trade).filter(
            Trade.user_id == user_id
        ).order_by(Trade.executed_at.desc()).limit(10).all()
        
        # Get pending bids
        pending_bids = db.query(Bid).filter(
            Bid.user_id == user_id,
            Bid.status == BidStatus.PENDING
        ).order_by(Bid.created_at.desc()).limit(10).all()
        
        # Get market summary
        market_service = MarketDataService()
        market_summary = await market_service.get_market_summary()
        
        # Calculate portfolio metrics
        total_position_value = sum([
            abs(pos.quantity) * (pos.current_price or pos.entry_price) 
            for pos in active_positions
        ])
        
        total_unrealized_pnl = sum([pos.unrealized_pnl for pos in active_positions])
        
        dashboard = {
            "portfolio": {
                "id": portfolio.id,
                "user_id": portfolio.user_id,
                "cash_balance": portfolio.cash_balance,
                "total_pnl": portfolio.total_pnl,
                "daily_pnl": portfolio.daily_pnl,
                "unrealized_pnl": total_unrealized_pnl,
                "realized_pnl": portfolio.realized_pnl,
                "max_drawdown": portfolio.max_drawdown,
                "total_trades": portfolio.total_trades,
                "winning_trades": portfolio.winning_trades,
                "win_rate": (portfolio.winning_trades / portfolio.total_trades * 100) if portfolio.total_trades > 0 else 0,
                "total_position_value": total_position_value,
                "created_at": portfolio.created_at,
                "updated_at": portfolio.updated_at
            },
            "active_positions": [
                {
                    "id": pos.id,
                    "quantity": pos.quantity,
                    "entry_price": pos.entry_price,
                    "current_price": pos.current_price,
                    "unrealized_pnl": pos.unrealized_pnl,
                    "trading_date": pos.trading_date,
                    "hour_slot": pos.hour_slot,
                    "created_at": pos.created_at
                } for pos in active_positions
            ],
            "recent_trades": [
                {
                    "id": trade.id,
                    "quantity": trade.quantity,
                    "price": trade.price,
                    "total_value": trade.total_value,
                    "pnl": trade.pnl,
                    "trade_type": trade.trade_type,
                    "executed_at": trade.executed_at
                } for trade in recent_trades
            ],
            "pending_bids": [
                {
                    "id": bid.id,
                    "bid_type": bid.bid_type,
                    "quantity": bid.quantity,
                    "price": bid.price,
                    "hour_slot": bid.hour_slot,
                    "trading_date": bid.trading_date,
                    "status": bid.status,
                    "created_at": bid.created_at
                } for bid in pending_bids
            ],
            "market_summary": market_summary
        }
        
        return dashboard
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard: {str(e)}")

@router.get("/performance", response_model=Dict)
def get_performance_metrics(
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Get detailed performance metrics."""
    try:
        # Get all trades for calculations
        trades = db.query(Trade).filter(Trade.user_id == user_id).all()
        portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
        
        if not trades or not portfolio:
            return {
                "total_return": 0.0,
                "annual_return": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown": 0.0,
                "win_rate": 0.0,
                "profit_factor": 0.0,
                "total_trades": 0,
                "average_trade_duration": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0,
                "average_win": 0.0,
                "average_loss": 0.0
            }
        
        # Calculate metrics
        total_pnl = sum([trade.pnl for trade in trades])
        winning_trades = [trade for trade in trades if trade.pnl > 0]
        losing_trades = [trade for trade in trades if trade.pnl < 0]
        
        win_rate = len(winning_trades) / len(trades) * 100 if trades else 0
        
        gross_profit = sum([trade.pnl for trade in winning_trades]) if winning_trades else 0
        gross_loss = abs(sum([trade.pnl for trade in losing_trades])) if losing_trades else 1
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else 0
        
        largest_win = max([trade.pnl for trade in winning_trades]) if winning_trades else 0
        largest_loss = min([trade.pnl for trade in losing_trades]) if losing_trades else 0
        
        average_win = gross_profit / len(winning_trades) if winning_trades else 0
        average_loss = gross_loss / len(losing_trades) if losing_trades else 0
        
        # Calculate returns (simplified)
        initial_balance = 100000  # Starting balance
        total_return = (portfolio.cash_balance + total_pnl - initial_balance) / initial_balance * 100
        
        # Simple annualized return calculation
        if trades:
            days_trading = (trades[-1].executed_at - trades[0].executed_at).days
            annual_return = total_return * (365 / max(days_trading, 1))
        else:
            annual_return = 0
        
        metrics = {
            "total_return": round(total_return, 2),
            "annual_return": round(annual_return, 2),
            "sharpe_ratio": 0.0,  # Would need risk-free rate and volatility
            "max_drawdown": portfolio.max_drawdown,
            "win_rate": round(win_rate, 2),
            "profit_factor": round(profit_factor, 2),
            "total_trades": len(trades),
            "average_trade_duration": 24.0,  # Simplified - 24 hours for day-ahead
            "largest_win": round(largest_win, 2),
            "largest_loss": round(largest_loss, 2),
            "average_win": round(average_win, 2),
            "average_loss": round(abs(average_loss), 2),
            "gross_profit": round(gross_profit, 2),
            "gross_loss": round(gross_loss, 2)
        }
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating performance metrics: {str(e)}")

@router.get("/risk-metrics")
def get_risk_metrics(
    user_id: int = 1,  # Simplified
    db: Session = Depends(get_db)
):
    """Get risk management metrics."""
    try:
        # Get active positions
        positions = db.query(Position).filter(
            Position.user_id == user_id,
            Position.is_closed == False
        ).all()
        
        portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
        
        if not portfolio:
            return {"error": "Portfolio not found"}
        
        # Calculate risk metrics
        total_exposure = sum([abs(pos.quantity * (pos.current_price or pos.entry_price)) for pos in positions])
        max_position_size = max([abs(pos.quantity) for pos in positions]) if positions else 0
        
        # Value at Risk (simplified - 1% of portfolio)
        var_1_percent = portfolio.cash_balance * 0.01
        
        # Position concentration
        position_values = [abs(pos.quantity * (pos.current_price or pos.entry_price)) for pos in positions]
        max_position_exposure = max(position_values) if position_values else 0
        concentration_ratio = (max_position_exposure / total_exposure * 100) if total_exposure > 0 else 0
        
        risk_metrics = {
            "total_exposure": round(total_exposure, 2),
            "max_position_size_mwh": round(max_position_size, 2),
            "max_position_value": round(max_position_exposure, 2),
            "concentration_ratio": round(concentration_ratio, 2),
            "var_1_percent": round(var_1_percent, 2),
            "leverage_ratio": round(total_exposure / portfolio.cash_balance, 2) if portfolio.cash_balance > 0 else 0,
            "margin_utilization": round((total_exposure / portfolio.cash_balance * 100), 2) if portfolio.cash_balance > 0 else 0,
            "open_positions": len(positions),
            "risk_limit_status": {
                "position_size_ok": max_position_size <= 1000,  # Max 1000 MWh
                "daily_loss_ok": abs(portfolio.daily_pnl) <= 50000,  # Max $50k daily loss
                "concentration_ok": concentration_ratio <= 25  # Max 25% in single position
            }
        }
        
        return risk_metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating risk metrics: {str(e)}")
