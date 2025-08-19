import httpx
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import pandas as pd
from app.core.config import settings
from app.schemas.trading import MarketDataResponse, MarketType

class MarketDataService:
    """Service for fetching and managing market data from external APIs."""
    
    def __init__(self):
        self.base_url = settings.GRIDSTATUS_API_URL
        self.api_key = settings.GRIDSTATUS_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def get_real_time_data(self, region: str = "CAISO") -> Dict:
        """Fetch real-time market data."""
        try:
            # Sample real-time data structure
            # In production, this would call actual gridstatus.io API
            mock_data = {
                "price": 45.67 + (datetime.now().minute * 0.5),  # Dynamic pricing
                "load": 25000 + (datetime.now().minute * 10),
                "timestamp": datetime.utcnow(),
                "region": region,
                "market_type": "real_time",
                "change_24h": 2.34,
                "volume": 1250.5
            }
            
            # Add some realistic price volatility
            import random
            mock_data["price"] += random.uniform(-2, 2)
            
            return mock_data
            
        except Exception as e:
            print(f"Error fetching real-time data: {e}")
            # Return fallback data
            return {
                "price": 45.0,
                "load": 25000,
                "timestamp": datetime.utcnow(),
                "region": region,
                "market_type": "real_time",
                "change_24h": 0.0,
                "volume": 0.0
            }
    
    async def get_day_ahead_prices(self, date: datetime, region: str = "CAISO") -> List[Dict]:
        """Fetch day-ahead market prices for a specific date."""
        try:
            # Mock day-ahead hourly prices
            hourly_prices = []
            base_price = 40.0
            
            for hour in range(24):
                # Create realistic price patterns (higher during peak hours)
                if 6 <= hour <= 22:  # Day hours
                    if 17 <= hour <= 21:  # Peak hours
                        price_multiplier = 1.4 + (hour - 17) * 0.1
                    else:
                        price_multiplier = 1.1
                else:  # Night hours
                    price_multiplier = 0.8
                
                price = base_price * price_multiplier
                # Add some randomness
                import random
                price += random.uniform(-3, 3)
                
                hourly_prices.append({
                    "hour": hour,
                    "price": round(price, 2),
                    "date": date.date(),
                    "timestamp": datetime.combine(date.date(), datetime.min.time().replace(hour=hour)),
                    "market_type": "day_ahead",
                    "region": region
                })
            
            return hourly_prices
            
        except Exception as e:
            print(f"Error fetching day-ahead prices: {e}")
            return []
    
    async def get_historical_data(
        self, 
        start_date: datetime, 
        end_date: datetime, 
        market_type: MarketType = MarketType.REAL_TIME,
        region: str = "CAISO"
    ) -> List[Dict]:
        """Fetch historical market data."""
        try:
            historical_data = []
            current_date = start_date
            
            while current_date <= end_date:
                if market_type == MarketType.DAY_AHEAD:
                    # Day-ahead data (hourly)
                    day_data = await self.get_day_ahead_prices(current_date, region)
                    historical_data.extend(day_data)
                else:
                    # Real-time data (5-minute intervals)
                    for hour in range(24):
                        for minute in range(0, 60, 5):  # 5-minute intervals
                            timestamp = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                            
                            # Generate realistic price with some trends and volatility
                            base_price = 45.0
                            daily_trend = (current_date - start_date).days * 0.1  # Slight upward trend
                            hourly_factor = 1.2 if 17 <= hour <= 21 else 0.9  # Peak hours
                            
                            import random
                            price = base_price + daily_trend
                            price *= hourly_factor
                            price += random.uniform(-2, 2)  # Random volatility
                            
                            historical_data.append({
                                "price": round(price, 2),
                                "timestamp": timestamp,
                                "market_type": market_type.value,
                                "region": region,
                                "load": 25000 + random.uniform(-2000, 2000)
                            })
                
                current_date += timedelta(days=1)
            
            return historical_data
            
        except Exception as e:
            print(f"Error fetching historical data: {e}")
            return []
    
    async def get_market_summary(self, region: str = "CAISO") -> Dict:
        """Get market summary with key metrics."""
        try:
            # Get current real-time data
            current_data = await self.get_real_time_data(region)
            
            # Get recent historical data for calculations
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=1)
            historical_data = await self.get_historical_data(start_date, end_date, MarketType.REAL_TIME, region)
            
            if not historical_data:
                return current_data
            
            # Calculate 24h metrics
            prices_24h = [item["price"] for item in historical_data]
            
            summary = {
                "current_price": current_data["price"],
                "price_change_24h": current_data["price"] - prices_24h[0] if prices_24h else 0,
                "price_change_percent": ((current_data["price"] - prices_24h[0]) / prices_24h[0] * 100) if prices_24h and prices_24h[0] > 0 else 0,
                "high_24h": max(prices_24h) if prices_24h else current_data["price"],
                "low_24h": min(prices_24h) if prices_24h else current_data["price"],
                "average_price_24h": sum(prices_24h) / len(prices_24h) if prices_24h else current_data["price"],
                "volume_24h": sum([item.get("volume", 0) for item in historical_data]),
                "volatility_24h": pd.Series(prices_24h).std() if len(prices_24h) > 1 else 0,
                "last_updated": current_data["timestamp"],
                "region": region
            }
            
            return summary
            
        except Exception as e:
            print(f"Error calculating market summary: {e}")
            return await self.get_real_time_data(region)
    
    async def calculate_clearing_price(self, bids: List[Dict], hour_slot: int) -> float:
        """Calculate clearing price for day-ahead market based on supply/demand."""
        try:
            # Simple clearing price calculation
            # In reality, this would be much more complex
            
            buy_bids = [bid for bid in bids if bid["bid_type"] == "buy"]
            sell_bids = [bid for bid in bids if bid["bid_type"] == "sell"]
            
            # Sort bids
            buy_bids.sort(key=lambda x: x["price"], reverse=True)  # Highest price first
            sell_bids.sort(key=lambda x: x["price"])  # Lowest price first
            
            # Find intersection point
            cumulative_buy_quantity = 0
            cumulative_sell_quantity = 0
            clearing_price = 45.0  # Default price
            
            # Simplified clearing mechanism
            for buy_bid in buy_bids:
                cumulative_buy_quantity += buy_bid["quantity"]
                for sell_bid in sell_bids:
                    cumulative_sell_quantity += sell_bid["quantity"]
                    if cumulative_sell_quantity >= cumulative_buy_quantity:
                        clearing_price = (buy_bid["price"] + sell_bid["price"]) / 2
                        break
                if cumulative_sell_quantity >= cumulative_buy_quantity:
                    break
            
            return round(clearing_price, 2)
            
        except Exception as e:
            print(f"Error calculating clearing price: {e}")
            # Return day-ahead price for the hour
            day_ahead_prices = await self.get_day_ahead_prices(datetime.now())
            if day_ahead_prices and hour_slot < len(day_ahead_prices):
                return day_ahead_prices[hour_slot]["price"]
            return 45.0
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
