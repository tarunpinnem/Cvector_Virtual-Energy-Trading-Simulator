from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta

from app.schemas.trading import MarketDataResponse, MarketSummary, PriceAnalytics
from app.services.market_data_service import MarketDataService

router = APIRouter()

# Create a global instance to reuse
market_service = MarketDataService()

@router.get("/real-time", response_model=dict)
async def get_real_time_data(region: str = "CAISO"):
    """Get current real-time market data."""
    try:
        data = await market_service.get_real_time_data(region)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching real-time data: {str(e)}")

@router.get("/day-ahead/{date}")
async def get_day_ahead_prices(date: str, region: str = "CAISO"):
    """Get day-ahead market prices for a specific date."""
    try:
        date_obj = datetime.fromisoformat(date)
        prices = await market_service.get_day_ahead_prices(date_obj, region)
        return {"date": date, "region": region, "hourly_prices": prices}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching day-ahead prices: {str(e)}")

@router.get("/historical")
async def get_historical_data(
    start_date: str,
    end_date: str,
    market_type: str = "real_time",
    region: str = "CAISO"
):
    """Get historical market data."""
    try:
        start_obj = datetime.fromisoformat(start_date)
        end_obj = datetime.fromisoformat(end_date)
        
        # Validate date range
        if end_obj < start_obj:
            raise HTTPException(status_code=400, detail="End date must be after start date")
        
        if (end_obj - start_obj).days > 90:
            raise HTTPException(status_code=400, detail="Date range cannot exceed 90 days")
        
        from app.schemas.trading import MarketType
        market_type_enum = MarketType.REAL_TIME if market_type == "real_time" else MarketType.DAY_AHEAD
        
        data = await market_service.get_historical_data(start_obj, end_obj, market_type_enum, region)
        
        return {
            "start_date": start_date,
            "end_date": end_date,
            "market_type": market_type,
            "region": region,
            "data_points": len(data),
            "data": data
        }
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching historical data: {str(e)}")

@router.get("/summary", response_model=dict)
async def get_market_summary(region: str = "CAISO"):
    """Get comprehensive market summary with key metrics."""
    try:
        summary = await market_service.get_market_summary(region)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching market summary: {str(e)}")

@router.get("/analytics/price")
async def get_price_analytics(region: str = "CAISO"):
    """Get advanced price analytics and indicators."""
    try:
        # Get recent data for calculations
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=7)  # Last 7 days
        
        historical_data = await market_service.get_historical_data(
            start_date, end_date, region=region
        )
        
        if not historical_data:
            raise HTTPException(status_code=404, detail="No data available for analytics")
        
        # Calculate analytics
        prices = [item["price"] for item in historical_data]
        current_price = await market_service.get_real_time_data(region)
        
        # Simple moving average
        ma_24h = sum(prices[-288:]) / len(prices[-288:]) if len(prices) >= 288 else sum(prices) / len(prices)  # 24h = 288 5-min intervals
        
        # Volatility (standard deviation)
        import statistics
        volatility = statistics.stdev(prices) if len(prices) > 1 else 0
        
        # Simple RSI calculation
        rsi = calculate_rsi(prices) if len(prices) > 14 else 50
        
        # Support and resistance levels (simplified)
        support_level = min(prices[-288:]) if len(prices) >= 288 else min(prices)
        resistance_level = max(prices[-288:]) if len(prices) >= 288 else max(prices)
        
        # Trend analysis
        recent_prices = prices[-72:]  # Last 6 hours
        if len(recent_prices) >= 2:
            trend = "up" if recent_prices[-1] > recent_prices[0] else "down"
            if abs(recent_prices[-1] - recent_prices[0]) < (volatility * 0.5):
                trend = "sideways"
        else:
            trend = "sideways"
        
        analytics = {
            "current_price": current_price["price"],
            "moving_average_24h": round(ma_24h, 2),
            "volatility_24h": round(volatility, 2),
            "price_trend": trend,
            "support_level": round(support_level, 2),
            "resistance_level": round(resistance_level, 2),
            "rsi": round(rsi, 2),
            "region": region,
            "last_updated": datetime.utcnow().isoformat()
        }
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating price analytics: {str(e)}")

@router.get("/load-forecast")
async def get_load_forecast(region: str = "CAISO", hours_ahead: int = 24):
    """Get load forecast data."""
    try:
        # Mock load forecast data
        forecast_data = []
        current_time = datetime.utcnow()
        base_load = 25000  # Base load in MW
        
        for i in range(hours_ahead):
            forecast_time = current_time + timedelta(hours=i)
            hour = forecast_time.hour
            
            # Create realistic load pattern
            if 6 <= hour <= 22:  # Day hours
                if 17 <= hour <= 21:  # Peak hours
                    load_multiplier = 1.4
                else:
                    load_multiplier = 1.1
            else:  # Night hours
                load_multiplier = 0.7
            
            forecasted_load = base_load * load_multiplier
            
            # Add some variation
            import random
            forecasted_load += random.uniform(-1000, 1000)
            
            forecast_data.append({
                "timestamp": forecast_time.isoformat(),
                "forecasted_load_mw": round(forecasted_load, 2),
                "confidence": random.uniform(85, 95)  # Confidence percentage
            })
        
        return {
            "region": region,
            "forecast_horizon_hours": hours_ahead,
            "generated_at": current_time.isoformat(),
            "forecast": forecast_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating load forecast: {str(e)}")

def calculate_rsi(prices: List[float], period: int = 14) -> float:
    """Calculate Relative Strength Index."""
    if len(prices) < period + 1:
        return 50.0  # Neutral RSI
    
    gains = []
    losses = []
    
    for i in range(1, len(prices)):
        change = prices[i] - prices[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
    
    if len(gains) < period:
        return 50.0
    
    avg_gain = sum(gains[-period:]) / period
    avg_loss = sum(losses[-period:]) / period
    
    if avg_loss == 0:
        return 100.0
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi
