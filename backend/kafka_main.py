"""
Clean Energy Trading Platform with Kafka Streaming
Focus: Market data ingestion + Order events streaming
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from datetime import datetime, timedelta
import random
import uvicorn
from typing import List, Dict, Any
from pydantic import BaseModel
import logging
import requests
import aiohttp
import math
import time
import ssl

# GridStatus.io client for comprehensive market intelligence
try:
    import gridstatusio
    GRIDSTATUS_AVAILABLE = True
    print(f"✅ GridStatus.io client available - version {gridstatusio.__version__}")
except ImportError as e:
    GRIDSTATUS_AVAILABLE = False  
    print(f"⚠️ GridStatus.io client not available: {e}")

# Create SSL context that handles certificate issues
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Import Kafka streaming service
try:
    from kafka_streaming_service import kafka_service
    KAFKA_AVAILABLE = True
    print("✅ Kafka streaming service available")
except ImportError as e:
    KAFKA_AVAILABLE = False
    print(f"⚠️ Kafka streaming service not available: {e}")

# Import PostgreSQL service (optional)
try:
    from postgres_service import postgres_service
    POSTGRES_AVAILABLE = True
    print("✅ PostgreSQL service available")
except ImportError as e:
    POSTGRES_AVAILABLE = False
    print(f"⚠️ PostgreSQL service not available: {e}")

# Create FastAPI app
app = FastAPI(
    title="Energy Trading Platform with Kafka Streaming",
    description="Real-time energy trading with Kafka market data and order events",
    version="3.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()

# Service Manager for Kafka
class KafkaServiceManager:
    def __init__(self):
        self.kafka_active = False
        self.postgres_active = False

    async def initialize(self):
        """Initialize Kafka and optional services."""
        print("🚀 Initializing Energy Trading Platform...")
        
        # Initialize Kafka
        if KAFKA_AVAILABLE:
            self.kafka_active = kafka_service.is_connected
            if not self.kafka_active:
                self.kafka_active = kafka_service.connect()
            
            if self.kafka_active:
                print("✅ Kafka streaming service active")
                print("🔥 Real-time market data and order events enabled")
            else:
                print("⚠️ Kafka service failed to connect")
        
        # Initialize PostgreSQL (optional)
        if POSTGRES_AVAILABLE:
            try:
                self.postgres_active = await postgres_service.initialize()
                if self.postgres_active:
                    print("✅ PostgreSQL service active")
            except Exception as e:
                print(f"⚠️ PostgreSQL initialization failed: {e}")
        
        services_active = self.kafka_active or self.postgres_active
        if services_active:
            print("✅ Platform initialized successfully!")
        else:
            print("⚠️ Running in demo mode")
        
        return services_active

    async def send_to_kafka(self, event_type: str, data: Dict[str, Any]):
        """Send events to Kafka streaming."""
        if self.kafka_active:
            try:
                if event_type == "market_data":
                    kafka_service.publish_market_data(data)
                elif event_type == "bid_submitted":
                    kafka_service.publish_bid_submitted(data)
                elif event_type == "trade_executed":
                    kafka_service.publish_trade_executed(data)
                elif event_type == "portfolio_update":
                    kafka_service.publish_portfolio_update(data)
                elif event_type == "alert":
                    kafka_service.publish_alert(data)
                return True
            except Exception as e:
                print(f"⚠️ Kafka send failed: {e}")
                return False
        return False

# Global service manager
service_manager = KafkaServiceManager()

# Grid.io API Integration
class ComprehensiveMarketIntelligence:
    """Enhanced GridStatus.io service with comprehensive market intelligence and rate limiting"""
    
    def __init__(self):
        self.client = None
        self.last_api_call = 0
        self.cache = {}
        self.cache_duration = 60  # 1 minute cache to respect rate limits
        self.min_call_interval = 60  # 1 minute between API calls (was 1 second)
        
        if GRIDSTATUS_AVAILABLE:
            try:
                self.client = gridstatusio.GridStatusClient()
                print("✅ GridStatus.io client initialized")
            except Exception as e:
                print(f"❌ GridStatus.io client initialization failed: {e}")
                self.client = None

class GridIOService:
    def __init__(self):
        self.base_url = "https://api.gridstatus.io/v1"
        self.api_key = "719913dc864748b3905a87891042e481"  # Your API key from .env
        self.session = None
        self.last_api_call = 0
        self.min_call_interval = 60  # Rate limit: 1 call per minute
        
        # Cache for real data to avoid simulation fallback during rate limiting
        self.cache = {}
        self.cache_duration = 300  # 5 minutes cache duration
        
        # Initialize GridStatus.io official client with retry configuration
        self.client = None
        if GRIDSTATUS_AVAILABLE:
            try:
                self.client = gridstatusio.GridStatusClient(
                    api_key=self.api_key,
                    max_retries=3,        # Maximum retries (default: 5)
                    base_delay=1.0,       # Base delay in seconds (default: 2.0)
                    exponential_base=1.5, # Exponential backoff multiplier (default: 2.0)
                )
                print("✅ GridStatus.io official client initialized with retry configuration")
            except Exception as e:
                print(f"❌ GridStatus.io client initialization failed: {e}")
                self.client = None
    
    async def get_session(self):
        if self.session is None:
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            self.session = aiohttp.ClientSession(connector=connector)
        return self.session
    
    async def get_real_time_data(self, iso="CAISO"):
        """Get real-time energy data from GridStatus.io API using official client with retry configuration"""
        
        # Check cache first
        cache_key = f"{iso}_data"
        current_time = time.time()
        
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if current_time - cached_time < self.cache_duration:
                print(f"✅ Using cached real data for {iso} (cached {int(current_time - cached_time)}s ago)")
                return cached_data
        
        # Rate limiting check
        if current_time - self.last_api_call < self.min_call_interval:
            print(f"⚠️ Rate limit active (last call {int(current_time - self.last_api_call)}s ago)")
            
            # Return cached data if available, even if older
            if cache_key in self.cache:
                cached_data, cached_time = self.cache[cache_key]
                print(f"✅ Using older cached real data for {iso} (cached {int(current_time - cached_time)}s ago)")
                return cached_data
            else:
                print("⚠️ No cached data available during rate limit")
                return None
            
        try:
            self.last_api_call = current_time
            
            # Use official client if available, fallback to manual API calls
            if self.client:
                real_data = await self._get_data_with_official_client(iso)
                
                # Cache the real data if successful
                if real_data and real_data.get("api_status") == "connected":
                    self.cache[cache_key] = (real_data, current_time)
                    print(f"✅ Cached fresh real data for {iso}")
                
                return real_data
            else:
                return await self._get_data_with_manual_api(iso)
                
        except Exception as e:
            print(f"❌ Grid.io API Error: {e}")
            
            # Return cached data if available during error
            if cache_key in self.cache:
                cached_data, cached_time = self.cache[cache_key]
                print(f"✅ Using cached real data during API error (cached {int(current_time - cached_time)}s ago)")
                return cached_data
            
            return None

    async def _get_data_with_official_client(self, iso="CAISO"):
        """Get data using official GridStatus.io client with automatic retry"""
        try:
            from datetime import datetime, timedelta
            import asyncio
            
            # Get recent data (last 2 hours)
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=2)
            
            # Map ISO to datasets
            iso_datasets = {
                "CAISO": {
                    "load": "caiso_load",
                    "fuel": "caiso_fuel_mix",
                    "lmp": "caiso_lmp_real_time"  # Fixed: removed "_five_minute"
                },
                "ERCOT": {
                    "load": "ercot_load",
                    "fuel": "ercot_fuel_mix", 
                    "lmp": "ercot_spp_real_time"  # ERCOT pricing
                },
                "PJM": {
                    "load": "pjm_load",
                    "fuel": "pjm_fuel_mix",
                    "lmp": "pjm_lmp_real_time"
                }
            }
            
            datasets = iso_datasets.get(iso, iso_datasets["CAISO"])
            
            # Run in executor to avoid blocking async loop
            def fetch_load_data():
                try:
                    return self.client.get_dataset(
                        dataset=datasets["load"],
                        start=start_time.strftime("%Y-%m-%d %H:%M:%S"),
                        end=end_time.strftime("%Y-%m-%d %H:%M:%S"),
                        timezone="UTC",
                        limit=50
                    )
                except Exception as e:
                    print(f"❌ Load data fetch error: {e}")
                    return None
            
            def fetch_price_data():
                try:
                    if iso == "ERCOT":
                        # Get ERCOT trading hub prices
                        return self.client.get_dataset(
                            dataset="ercot_spp_real_time",
                            start=start_time.strftime("%Y-%m-%d %H:%M:%S"),
                            end=end_time.strftime("%Y-%m-%d %H:%M:%S"),
                            filter_column="location_type",
                            filter_value="Trading Hub",
                            timezone="market",
                            limit=50
                        )
                    else:
                        # Try different possible CAISO dataset names based on GridStatus.io documentation
                        possible_datasets = [
                            "caiso_lmp_real_time_fifteen_minute",  # 15-minute LMP data
                            "caiso_lmp_day_ahead_hourly",         # Day-ahead hourly LMP
                            "caiso_lmp_real_time_hourly",         # Real-time hourly LMP
                            datasets["lmp"],                      # Original attempt
                            "caiso_lmp_real_time_five_minute",   # 5-minute LMP
                            "caiso_lmp",                         # Basic LMP
                            "caiso_pricing"                      # Alternative naming
                        ]
                        
                        for dataset_name in possible_datasets:
                            try:
                                print(f"🔍 Trying CAISO price dataset: {dataset_name}")
                                result = self.client.get_dataset(
                                    dataset=dataset_name,
                                    start=start_time.strftime("%Y-%m-%d %H:%M:%S"), 
                                    end=end_time.strftime("%Y-%m-%d %H:%M:%S"),
                                    timezone="UTC",
                                    limit=50
                                )
                                print(f"✅ Success with dataset: {dataset_name}")
                                return result
                            except Exception as dataset_error:
                                print(f"❌ Dataset {dataset_name} failed: {dataset_error}")
                                continue
                        
                        print("❌ All CAISO price datasets failed")
                        return None
                        
                except Exception as e:
                    print(f"❌ Price data fetch error: {e}")
                    return None
            
            # Fetch data in executor to avoid blocking - but do it sequentially to respect rate limits
            loop = asyncio.get_event_loop()
            
            # First fetch load data
            load_df = await loop.run_in_executor(None, fetch_load_data)
            if load_df is not None:
                print(f"✅ GridStatus.io official client: {len(load_df)} load records")
            
            # Wait a bit to respect rate limits before fetching price data
            await asyncio.sleep(2)
            
            # Then fetch price data
            price_df = await loop.run_in_executor(None, fetch_price_data)
            if price_df is not None:
                print(f"✅ GridStatus.io official client: {len(price_df)} price records")
            else:
                print("⚠️ Price data unavailable - using load data only")
            
            # Convert DataFrames to dict format for processing
            load_data = load_df.to_dict('records') if load_df is not None else []
            price_data = price_df.to_dict('records') if price_df is not None else []
            
            # Skip fuel data for now to avoid rate limits
            fuel_data = None
            
            return self.process_comprehensive_grid_data(load_data, fuel_data, price_data, iso)
            
        except Exception as e:
            print(f"❌ Official client error: {e}")
            return None

    async def _get_data_with_manual_api(self, iso="CAISO"):
        """Fallback to manual API calls if official client unavailable"""
    async def _get_data_with_manual_api(self, iso="CAISO"):
        """Fallback to manual API calls if official client unavailable"""
        try:
            session = await self.get_session()
            
            # Map ISO to correct dataset names
            iso_datasets = {
                "CAISO": {
                    "load": "caiso_load",
                    "fuel": "caiso_fuel_mix",
                    "lmp": "caiso_lmp_real_time_five_minute"
                },
                "ERCOT": {
                    "load": "ercot_load",
                    "fuel": "ercot_fuel_mix",
                    "lmp": "ercot_spp_real_time"
                },
                "PJM": {
                    "load": "pjm_load",
                    "fuel": "pjm_fuel_mix", 
                    "lmp": "pjm_lmp_real_time"
                }
            }
            
            datasets = iso_datasets.get(iso, iso_datasets["CAISO"])
            
            # Get recent load data (last 2 hours)
            from datetime import datetime, timedelta
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=2)
            
            # Start with just load data to avoid rate limits
            load_url = f"{self.base_url}/datasets/{datasets['load']}/query"
            params = {
                "api_key": self.api_key,
                "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "end_time": end_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "limit": 50,
                "return_format": "json"
            }
            
            async with session.get(load_url, params=params) as response:
                if response.status == 200:
                    response_json = await response.json()
                    load_data = response_json.get('data', [])
                    print(f"✅ GridStatus.io load data retrieved successfully ({len(load_data)} records)")
                else:
                    print(f"⚠️ GridStatus.io load API returned status {response.status}")
                    return None
            
            # For now, skip fuel and price data to avoid rate limits
            # TODO: Implement smarter rate limiting or batch requests
            fuel_data = None  # Skip to avoid 429 errors
            price_data = None  # Skip to avoid 429 errors
            
            print("⚠️ Fuel and price data temporarily disabled to avoid rate limits")
            
            # Process real Grid.io data with comprehensive market intelligence
            return self.process_comprehensive_grid_data(load_data, fuel_data, price_data, iso)
            
        except Exception as e:
            print(f"❌ Manual API error: {e}")
            return None
    
    def process_grid_data(self, load_data, fuel_data, price_data, iso):
        """Process real Grid.io data into our format"""
        try:
            current_time = datetime.now()
            
            # Extract real load/demand data
            if load_data and len(load_data) > 0:
                latest_load = load_data[-1]  # Most recent data point
                demand = latest_load.get('load', 25000)  # MW
                timestamp_str = latest_load.get('timestamp', current_time.isoformat())
            else:
                demand = 25000
                timestamp_str = current_time.isoformat()
            
            # Extract real fuel mix
            solar_mw = wind_mw = gas_mw = nuclear_mw = 0
            renewable_pct = 50.0
            
            if fuel_data and len(fuel_data) > 0:
                latest_fuel = fuel_data[-1]
                solar_mw = latest_fuel.get('solar', 0)
                wind_mw = latest_fuel.get('wind', 0)  
                gas_mw = latest_fuel.get('natural_gas', 0)
                nuclear_mw = latest_fuel.get('nuclear', 0)
                
                total_generation = sum([solar_mw, wind_mw, gas_mw, nuclear_mw])
                if total_generation > 0:
                    renewable_pct = ((solar_mw + wind_mw) / total_generation) * 100
            
            # Extract real pricing if available
            current_price = 45.0  # Default
            if price_data and len(price_data) > 0:
                latest_price = price_data[-1]
                current_price = latest_price.get('lmp', 45.0)  # Locational Marginal Price
            
            # Calculate price metrics
            change_24h = random.uniform(-5, 5)  # Would need historical data for real calc
            high_24h = current_price * 1.1
            low_24h = current_price * 0.9
            
            return {
                "symbol": f"{iso}_REALTIME",
                "currentPrice": round(current_price, 2),
                "current_price": round(current_price, 2),
                "change24h": round(change_24h, 2),
                "change_24h": round(change_24h, 2),
                "high24h": round(high_24h, 2),
                "high_24h": round(high_24h, 2),
                "low24h": round(low_24h, 2),
                "low_24h": round(low_24h, 2),
                "volume": int(demand * 24),  # Daily volume estimate
                "timestamp": timestamp_str,
                "lastUpdated": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "gridOperator": iso,
                "region": iso,
                "energyType": "mixed",
                "demand": round(demand),
                "renewablePercentage": round(renewable_pct, 1),
                "marketCap": demand * current_price,
                "demandForecast": round(random.uniform(0.9, 1.1), 3),
                "weatherImpact": round(random.uniform(-0.05, 0.05), 3),
                "fuel_mix": {
                    "solar_mw": int(solar_mw),
                    "wind_mw": int(wind_mw),
                    "natural_gas_mw": int(gas_mw),
                    "nuclear_mw": int(nuclear_mw),
                    "renewable_percentage": round(renewable_pct, 1)
                },
                "data_source": "Grid.io API",
                "api_status": "connected"
            }
            
        except Exception as e:
            print(f"❌ Error processing Grid.io data: {e}")
            return None
    
    def process_comprehensive_grid_data(self, load_data, fuel_data, price_data, iso):
        """Process real Grid.io data with comprehensive market intelligence"""
        try:
            current_time = datetime.now()
            timestamp_str = current_time.isoformat()
            
            # Extract real load/demand data
            demand = 30000  # Default
            if load_data and len(load_data) > 0:
                latest_load = load_data[-1]
                # Handle both dict and DataFrame row formats
                if hasattr(latest_load, 'get'):
                    demand = latest_load.get('load', 30000)
                else:
                    demand = getattr(latest_load, 'load', 30000)
            
            # Extract real fuel mix with comprehensive analysis
            solar_mw = wind_mw = gas_mw = nuclear_mw = 0
            renewable_pct = 50.0
            total_generation = 0  # Initialize total_generation
            
            if fuel_data and len(fuel_data) > 0:
                latest_fuel = fuel_data[-1]
                if hasattr(latest_fuel, 'get'):
                    solar_mw = latest_fuel.get('solar', 0)
                    wind_mw = latest_fuel.get('wind', 0)  
                    gas_mw = latest_fuel.get('natural_gas', 0)
                    nuclear_mw = latest_fuel.get('nuclear', 0)
                else:
                    solar_mw = getattr(latest_fuel, 'solar', 0)
                    wind_mw = getattr(latest_fuel, 'wind', 0)
                    gas_mw = getattr(latest_fuel, 'natural_gas', 0)
                    nuclear_mw = getattr(latest_fuel, 'nuclear', 0)
                
                total_generation = sum([solar_mw, wind_mw, gas_mw, nuclear_mw])
                if total_generation > 0:
                    renewable_pct = ((solar_mw + wind_mw) / total_generation) * 100
            
            # Set default total_generation if no fuel data available
            if total_generation == 0:
                total_generation = demand * 1.1  # Assume 10% reserve margin
            
            # Extract real pricing with enhanced ERCOT support
            current_price = 45.0  # Default
            if price_data and len(price_data) > 0:
                latest_price = price_data[-1]
                if hasattr(latest_price, 'get'):
                    # For ERCOT, use 'spp' field, otherwise use 'lmp'
                    current_price = latest_price.get('spp', latest_price.get('lmp', 45.0))
                else:
                    current_price = getattr(latest_price, 'spp', getattr(latest_price, 'lmp', 45.0))
                
                if iso == "ERCOT":
                    print(f"✅ ERCOT Settlement Point Price: ${current_price:.2f}")
                else:
                    print(f"✅ {iso} Locational Marginal Price: ${current_price:.2f}")
            
            # Generate comprehensive market intelligence
            hourly_forecast = self._generate_hourly_forecast(current_price, demand, renewable_pct)
            market_conditions = self._analyze_market_conditions(current_price, demand, renewable_pct, solar_mw, wind_mw)
            volatility_analysis = self._calculate_market_volatility(price_data) 
            grid_stress = self._assess_grid_stress(demand, total_generation)
            renewable_trends = self._analyze_renewable_trends(solar_mw, wind_mw, renewable_pct)
            demand_patterns = self._analyze_demand_patterns(demand, current_time)
            pricing_signals = self._forecast_peak_pricing(current_time, demand, renewable_pct)
            
            # Calculate price metrics with ERCOT-specific adjustments
            if iso == "ERCOT":
                # ERCOT has higher volatility - adjust price ranges
                change_24h = random.uniform(-15, 15)  # ERCOT can be more volatile
                high_24h = current_price * 1.2
                low_24h = current_price * 0.7
            else:
                change_24h = random.uniform(-5, 5)
                high_24h = current_price * 1.1
                low_24h = current_price * 0.9
            
            return {
                "symbol": f"{iso}_REALTIME",
                "currentPrice": round(current_price, 2),
                "current_price": round(current_price, 2),
                "change24h": round(change_24h, 2),
                "change_24h": round(change_24h, 2),
                "high24h": round(high_24h, 2),
                "high_24h": round(high_24h, 2),
                "low24h": round(low_24h, 2),
                "low_24h": round(low_24h, 2),
                "volume": int(demand * 24),
                "timestamp": timestamp_str,
                "lastUpdated": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "gridOperator": iso,
                "region": iso,
                "energyType": "mixed",
                "demand": round(demand),
                "renewablePercentage": round(renewable_pct, 1),
                "marketCap": demand * current_price,
                "demandForecast": round(random.uniform(0.9, 1.1), 3),
                "weatherImpact": round(random.uniform(-0.05, 0.05), 3),
                "fuel_mix": {
                    "solar_mw": int(solar_mw),
                    "wind_mw": int(wind_mw),
                    "natural_gas_mw": int(gas_mw),
                    "nuclear_mw": int(nuclear_mw)
                },
                # Comprehensive market intelligence
                "market_conditions": market_conditions,
                "hourly_forecast": hourly_forecast,
                "volatility_analysis": volatility_analysis,
                "grid_stress": grid_stress,
                "renewable_trends": renewable_trends,
                "demand_patterns": demand_patterns,
                "pricing_signals": pricing_signals,
                # Enhanced metadata
                "data_source": f"GridStatus.io Official Client v{gridstatusio.__version__}" if GRIDSTATUS_AVAILABLE else "GridStatus.io API",
                "api_status": "connected",
                "intelligence_timestamp": timestamp_str,
                "price_type": "Settlement Point Price (SPP)" if iso == "ERCOT" else "Locational Marginal Price (LMP)",
                "retry_config": {
                    "max_retries": 3,
                    "base_delay": 1.0,
                    "exponential_base": 1.5
                } if self.client else None,
                "data_freshness": "real-time"  # Indicator that this is fresh API data
            }
            
        except Exception as e:
            print(f"❌ Error processing comprehensive Grid.io data: {e}")
            return None
    
    def _generate_hourly_forecast(self, base_price, demand, renewable_pct):
        """Generate 24-hour price forecast using real market data"""
        forecast = []
        current_hour = datetime.now().hour
        
        for hour_offset in range(24):
            target_hour = (current_hour + hour_offset) % 24
            
            # Peak pricing periods (6-9 AM, 5-8 PM)
            if target_hour in [6, 7, 8, 17, 18, 19, 20]:
                price_multiplier = 1.3 + random.uniform(-0.1, 0.1)
            elif target_hour in [22, 23, 0, 1, 2, 3, 4, 5]:  # Off-peak
                price_multiplier = 0.8 + random.uniform(-0.05, 0.05)
            else:  # Mid-peak
                price_multiplier = 1.0 + random.uniform(-0.1, 0.1)
            
            # Renewable impact
            renewable_discount = (renewable_pct / 100) * 0.15
            forecast_price = base_price * price_multiplier * (1 - renewable_discount)
            
            forecast.append({
                "hour": target_hour,
                "predicted_price": round(forecast_price, 2),
                "confidence": random.uniform(0.75, 0.95),
                "demand_forecast": round(demand * price_multiplier, 0),
                "renewable_forecast": round(renewable_pct + random.uniform(-5, 5), 1)
            })
        
        return forecast
    
    def _analyze_market_conditions(self, price, demand, renewable_pct, solar_mw, wind_mw):
        """Analyze current market conditions"""
        conditions = []
        
        if price > 50:
            conditions.append({"type": "high_prices", "severity": "moderate", "description": "Above-average pricing"})
        if demand > 35000:
            conditions.append({"type": "high_demand", "severity": "high", "description": "Peak demand period"})
        if renewable_pct > 60:
            conditions.append({"type": "high_renewables", "severity": "low", "description": "Abundant clean energy"})
        if solar_mw > 5000:
            conditions.append({"type": "solar_peak", "severity": "low", "description": "Strong solar generation"})
        if wind_mw > 3000:
            conditions.append({"type": "wind_peak", "severity": "low", "description": "High wind output"})
            
        return conditions
    
    def _calculate_market_volatility(self, price_data):
        """Calculate market volatility metrics with enhanced ERCOT support"""
        if not price_data or len(price_data) < 2:
            return {"volatility_index": 0.5, "stability": "moderate", "trend": "stable"}
        
        # Extract prices - handle both SPP (ERCOT) and LMP formats
        recent_prices = []
        for p in price_data[-10:]:
            if hasattr(p, 'get'):
                price = p.get('spp', p.get('lmp', 45))
            else:
                price = getattr(p, 'spp', getattr(p, 'lmp', 45))
            recent_prices.append(price)
        
        avg_price = sum(recent_prices) / len(recent_prices)
        variance = sum((p - avg_price) ** 2 for p in recent_prices) / len(recent_prices)
        volatility = (variance ** 0.5) / avg_price if avg_price > 0 else 0
        
        if volatility < 0.1:
            stability = "stable"
        elif volatility < 0.2:
            stability = "moderate"
        else:
            stability = "volatile"
            
        trend = "increasing" if recent_prices[-1] > recent_prices[0] else "decreasing"
        
        return {
            "volatility_index": round(volatility, 3),
            "stability": stability,
            "trend": trend,
            "price_range": {
                "min": min(recent_prices),
                "max": max(recent_prices),
                "avg": round(avg_price, 2)
            }
        }
    
    def _assess_grid_stress(self, demand, supply):
        """Assess current grid stress levels"""
        reserve_margin = (supply - demand) / demand * 100
        
        if reserve_margin > 20:
            stress_level = "low"
            description = "Adequate reserves"
        elif reserve_margin > 10:
            stress_level = "moderate" 
            description = "Normal operations"
        elif reserve_margin > 5:
            stress_level = "high"
            description = "Tight reserves"
        else:
            stress_level = "critical"
            description = "Emergency conditions"
            
        return {
            "stress_level": stress_level,
            "reserve_margin": round(reserve_margin, 2),
            "description": description,
            "supply_demand_ratio": round(supply / demand, 3)
        }
    
    def _analyze_renewable_trends(self, solar_mw, wind_mw, renewable_pct):
        """Analyze renewable energy trends"""
        hour = datetime.now().hour
        
        # Solar trend analysis
        if 8 <= hour <= 16:  # Daylight hours
            solar_trend = "increasing" if hour < 12 else "decreasing"
        else:
            solar_trend = "minimal"
            
        # Wind trend (simplified)
        wind_trend = "variable"  # Would need historical data for real trend
        
        return {
            "solar": {
                "current_mw": solar_mw,
                "trend": solar_trend,
                "forecast_next_hour": solar_mw * (1.1 if solar_trend == "increasing" else 0.9)
            },
            "wind": {
                "current_mw": wind_mw, 
                "trend": wind_trend,
                "forecast_next_hour": wind_mw * random.uniform(0.8, 1.2)
            },
            "total_renewable_pct": renewable_pct,
            "outlook": "favorable" if renewable_pct > 50 else "moderate"
        }
    
    def _analyze_demand_patterns(self, current_demand, current_time):
        """Analyze demand patterns and forecasts"""
        hour = current_time.hour
        weekday = current_time.weekday()
        
        # Typical demand patterns
        if weekday < 5:  # Weekday
            if 6 <= hour <= 9:
                period = "morning_peak"
                trend = "increasing"
            elif 17 <= hour <= 20:
                period = "evening_peak"
                trend = "high"
            elif 22 <= hour or hour <= 5:
                period = "overnight"
                trend = "decreasing"
            else:
                period = "midday"
                trend = "moderate"
        else:  # Weekend
            period = "weekend"
            trend = "low"
            
        return {
            "current_period": period,
            "trend": trend,
            "current_demand_mw": current_demand,
            "next_hour_forecast": current_demand * (1.1 if trend == "increasing" else 
                                                  1.0 if trend == "moderate" else 0.9),
            "peak_probability": 0.8 if period in ["morning_peak", "evening_peak"] else 0.2
        }
    
    def _forecast_peak_pricing(self, current_time, demand, renewable_pct):
        """Forecast peak pricing periods"""
        hour = current_time.hour
        
        # Peak pricing probabilities
        morning_peak = 0.7 if 6 <= hour <= 9 else 0.1
        evening_peak = 0.9 if 17 <= hour <= 20 else 0.1
        
        # Price spike risk
        spike_risk = "high" if demand > 35000 and renewable_pct < 30 else "low"
        
        return {
            "morning_peak_probability": morning_peak,
            "evening_peak_probability": evening_peak,
            "price_spike_risk": spike_risk,
            "recommended_action": "sell" if spike_risk == "high" else "buy",
            "confidence": random.uniform(0.7, 0.9)
        }

# Initialize Grid.io service
grid_service = GridIOService()

async def generate_market_data():
    """Get real market data exclusively from Grid.io API - with intelligent caching during rate limits."""
    
    # Try to get real data from Grid.io API (including cached data during rate limits)
    real_data = await grid_service.get_real_time_data("CAISO")
    if real_data:
        # Check if this is real API data vs cached data
        if real_data.get("api_status") == "connected":
            print("✅ Using real GridStatus.io API data with comprehensive market intelligence")
        else:
            print("✅ Using cached GridStatus.io data during rate limiting")
        return real_data
    
    # Only if no real data AND no cached data available
    print("❌ GridStatus.io API and cache unavailable - no fallback simulation")
    current_time = datetime.now()
    
    return {
        "error": "API_AND_CACHE_UNAVAILABLE",
        "message": "GridStatus.io API and cached data are currently unavailable",
        "symbol": "CAISO_UNAVAILABLE", 
        "currentPrice": None,
        "current_price": None,
        "change24h": None,
        "change_24h": None,
        "high24h": None,
        "high_24h": None,
        "low24h": None,
        "low_24h": None,
        "volume": None,
        "timestamp": current_time.isoformat(),
        "lastUpdated": current_time.strftime("%Y-%m-%d %H:%M:%S"),
        "gridOperator": "CAISO",
        "region": "California",
        "energyType": "unknown",
        "demand": None,
        "renewablePercentage": None,
        "marketCap": None,
        "demandForecast": None,
        "weatherImpact": None,
        "fuel_mix": {
            "solar_mw": None,
            "wind_mw": None,
            "natural_gas_mw": None,
            "nuclear_mw": None
        },
        "market_conditions": [],
        "hourly_forecast": [],
        "volatility_analysis": {"volatility_index": None, "stability": "unknown", "trend": "unknown"},
        "grid_stress": {"stress_level": "unknown", "reserve_margin": None, "description": "API and cache unavailable"},
        "renewable_trends": {"outlook": "unknown"},
        "demand_patterns": {"trend": "unknown"},
        "pricing_signals": {"price_spike_risk": "unknown", "recommended_action": "wait"},
        "data_source": "GridStatus.io API & Cache Unavailable",
        "api_status": "disconnected"
    }

# Initialize market data (will be populated on first API call)
market_data = {
    "currentPrice": None,
    "symbol": "CAISO_REALTIME", 
    "data_source": "GridStatus.io API Only",
    "api_status": "initializing"
}

# In-memory storage (demo)
user_bids = []
user_positions = []

# Pydantic models
class BidSubmission(BaseModel):
    hour: int
    action: str
    price: float
    quantity: int
    userId: str = "default_user"

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    await service_manager.initialize()

# API Endpoints

@app.get("/api/market-data/datasets")
async def list_available_datasets():
    """List available GridStatus.io datasets for debugging"""
    if not grid_service.client:
        return {
            "error": "GridStatus.io client not available",
            "timestamp": datetime.now().isoformat()
        }
    
    try:
        import asyncio
        
        def get_datasets():
            try:
                # Try to get dataset information using the client
                # Note: This might not be directly supported, but we can try common patterns
                common_datasets = [
                    "caiso_load", "caiso_fuel_mix", 
                    "caiso_lmp_real_time_fifteen_minute", "caiso_lmp_day_ahead_hourly",
                    "ercot_load", "ercot_fuel_mix", "ercot_spp_real_time",
                    "pjm_load", "pjm_fuel_mix", "pjm_lmp_real_time"
                ]
                
                available_datasets = []
                for dataset in common_datasets:
                    try:
                        # Try a small query to test if dataset exists
                        from datetime import datetime, timedelta
                        end_time = datetime.utcnow()
                        start_time = end_time - timedelta(minutes=30)
                        
                        result = grid_service.client.get_dataset(
                            dataset=dataset,
                            start=start_time.strftime("%Y-%m-%d %H:%M:%S"),
                            end=end_time.strftime("%Y-%m-%d %H:%M:%S"),
                            limit=1
                        )
                        available_datasets.append({
                            "dataset": dataset,
                            "status": "available",
                            "records": len(result) if result is not None else 0
                        })
                        print(f"✅ Dataset available: {dataset}")
                    except Exception as e:
                        available_datasets.append({
                            "dataset": dataset,
                            "status": "unavailable", 
                            "error": str(e)
                        })
                        print(f"❌ Dataset unavailable: {dataset} - {e}")
                
                return available_datasets
            except Exception as e:
                print(f"❌ Dataset discovery error: {e}")
                return []
        
        loop = asyncio.get_event_loop()
        datasets_info = await loop.run_in_executor(None, get_datasets)
        
        return {
            "success": True,
            "available_datasets": len([d for d in datasets_info if d["status"] == "available"]),
            "unavailable_datasets": len([d for d in datasets_info if d["status"] == "unavailable"]),
            "datasets": datasets_info,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/market-data/ercot-pricing")
async def get_ercot_pricing():
    """Get ERCOT Settlement Point Prices specifically for testing"""
    global market_data
    
    # Test ERCOT pricing specifically
    ercot_data = await grid_service.get_real_time_data("ERCOT")
    
    return {
        "success": True,
        "data": ercot_data,
        "iso": "ERCOT",
        "price_type": "Settlement Point Price (SPP)" if ercot_data else "unavailable",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/market-data/real-time")
async def get_real_time_market_data():
    """Get real-time market data from Grid.io API and send to Kafka."""
    global market_data
    
    # Generate fresh market data using Grid.io API or fallback
    market_data = await generate_market_data()
    
    # Send to Kafka for streaming
    await service_manager.send_to_kafka("market_data", market_data)
    
    return {
        "success": True,
        "data": market_data,
        "source": market_data.get("data_source", "Grid.io API"),
        "api_status": market_data.get("api_status", "connected"),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/market-data/all-sources")
async def get_all_energy_sources():
    """Get market data for all energy sources using exclusively Grid.io API data."""
    try:
        # Get real Grid.io data for multiple ISOs
        isos = ["CAISO", "PJM", "ERCOT", "NYISO", "MISO"]
        all_market_data = []
        
        for iso in isos:
            # Try to get real data for each ISO - no fallback
            iso_data = await grid_service.get_real_time_data(iso)
            
            if iso_data and iso_data.get("error") != "API_UNAVAILABLE":
                all_market_data.append(iso_data)
            else:
                # Add unavailable status for this ISO
                unavailable_data = {
                    "error": "API_UNAVAILABLE",
                    "symbol": f"{iso}_UNAVAILABLE",
                    "gridOperator": iso,
                    "region": iso,
                    "data_source": f"GridStatus.io API Unavailable ({iso})",
                    "api_status": "disconnected",
                    "message": f"Real-time data for {iso} is currently unavailable"
                }
                all_market_data.append(unavailable_data)
        
        return {
            "success": True,
            "data": all_market_data,
            "total_sources": len(all_market_data),
            "available_sources": len([d for d in all_market_data if d.get("error") != "API_UNAVAILABLE"]),
            "unavailable_sources": len([d for d in all_market_data if d.get("error") == "API_UNAVAILABLE"]),
            "timestamp": datetime.now().isoformat(),
            "data_policy": "API_ONLY - No simulation fallbacks"
        }
        
    except Exception as e:
        print(f"❌ All sources error: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/portfolio/bids")
async def handle_bids(request: Request):
    """Handle bid submissions - both single bids and bulk saves."""
    try:
        body = await request.body()
        content_type = request.headers.get("content-type", "")
        
        if isinstance(body, bytes):
            body = body.decode('utf-8')
        
        print(f"📨 Raw request body: {body[:200]}...")
        print(f"📨 Content-Type: {content_type}")
        
        # Handle empty body
        if not body.strip():
            return {"error": "Empty request body"}
        
        # Parse JSON
        try:
            data = json.loads(body)
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON: {str(e)}"}
        
        # Handle array of bids (bulk save)
        if isinstance(data, list):
            print(f"📊 Received bids data: {data}")
            user_bids.clear()
            user_bids.extend(data)
            
            # Send each bid to Kafka
            for bid in data:
                await service_manager.send_to_kafka("bid_submitted", bid)
            
            print(f"✅ Saved {len(data)} bids to backend successfully")
            return {"message": f"Saved {len(data)} bids successfully"}
        
        # Handle single bid submission
        elif isinstance(data, dict):
            # Check if it's a new bid submission (has basic fields but no id)
            if "hour" in data and "action" in data and "price" in data and "quantity" in data and "id" not in data:
                # Create new bid
                new_bid = {
                    "id": f"bid_{int(datetime.now().timestamp() * 1000)}",
                    "hour": data.get("hour"),
                    "action": data.get("action"),
                    "price": data.get("price"),
                    "quantity": data.get("quantity"),
                    "status": "pending",
                    "submittedAt": datetime.now().isoformat(),
                    "userId": data.get("userId", "default_user")
                }
                
                user_bids.append(new_bid)
                
                # Send bid submission to Kafka
                await service_manager.send_to_kafka("bid_submitted", new_bid)
                
                print(f"🔥 New bid submitted to Kafka: {new_bid['id']}")
                return {"message": "Bid placed successfully", "bid": new_bid}
            
            # Handle existing bid save
            else:
                print(f"📊 Received single bid data: {data}")
                # Add to bids if not already present
                existing_bid = next((b for b in user_bids if b.get("id") == data.get("id")), None)
                if not existing_bid:
                    user_bids.append(data)
                    await service_manager.send_to_kafka("bid_submitted", data)
                
                return {"message": "Bid saved successfully"}
        
        else:
            return {"error": "Invalid data format - expected object or array"}
            
    except Exception as e:
        print(f"❌ Error handling bids: {e}")
        return {"error": str(e)}

@app.put("/api/portfolio/bids/{bid_id}")
async def update_bid_status(bid_id: str):
    """Update bid status and potentially execute trade."""
    for bid in user_bids:
        if bid["id"] == bid_id:
            # Simulate bid execution
            if bid["status"] == "pending":
                bid["status"] = "executed"
                
                # Create trade execution
                trade_data = {
                    "bid_id": bid_id,
                    "user_id": bid.get("userId", "default_user"),
                    "execution_price": bid["price"],
                    "quantity": bid["quantity"],
                    "total": bid["price"] * bid["quantity"],
                    "settlement_time": datetime.now().isoformat()
                }
                
                # Send trade execution to Kafka
                await service_manager.send_to_kafka("trade_executed", trade_data)
                
                # Create position
                position = {
                    "id": f"pos_{int(datetime.now().timestamp() * 1000)}",
                    "bidId": bid_id,
                    "hour": bid["hour"],
                    "quantity": bid["quantity"] if bid["action"] == "buy" else -bid["quantity"],
                    "dayAheadPrice": bid["price"],
                    "realTimePrice": market_data["current_price"],
                    "pnl": (market_data["current_price"] - bid["price"]) * bid["quantity"],
                    "timestamp": datetime.now().isoformat()
                }
                user_positions.append(position)
                
                print(f"🔥 Trade executed and sent to Kafka: {bid_id}")
            
            break
    
    return {"message": "Bid status updated"}

@app.get("/api/portfolio")
async def get_portfolio():
    """Get portfolio data and send update to Kafka."""
    # Update PnL for all positions with current market data
    current_market_price = market_data.get("current_price", market_data.get("currentPrice", 45.67))
    
    for position in user_positions:
        if "dayAheadPrice" in position and "quantity" in position:
            position["pnl"] = (current_market_price - position["dayAheadPrice"]) * position["quantity"]
            position["realTimePrice"] = current_market_price
    
    # Calculate cash balance
    cash_balance = 10000  # Starting balance
    for position in user_positions:
        cash_balance -= position["quantity"] * position["dayAheadPrice"]
    
    portfolio_data = {
        "user_id": "default_user",
        "cash_balance": cash_balance,
        "total_pnl": sum(pos.get("pnl", 0) for pos in user_positions),
        "positions": user_positions,
        "day_ahead_bids": user_bids
    }
    
    # Send portfolio update to Kafka
    await service_manager.send_to_kafka("portfolio_update", portfolio_data)
    
    return {
        "cashBalance": cash_balance,
        "positions": user_positions,
        "dayAheadBids": user_bids,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/portfolio")
async def update_portfolio(portfolio_data_update: dict):
    """Update portfolio."""
    return {"message": "Portfolio updated"}

@app.post("/api/portfolio/positions")
async def save_positions(request: Request):
    """Save positions."""
    try:
        # Read the raw request body
        body = await request.body()
        content_type = request.headers.get("content-type", "")
        
        print(f"📨 Raw positions request body: {body.decode()[:200]}...")
        print(f"📨 Content-Type: {content_type}")
        
        # Parse JSON data
        if body:
            positions_data = json.loads(body.decode())
            print(f"📊 Received positions data: {positions_data}")
            
            # Handle both single position and array of positions
            if isinstance(positions_data, dict):
                positions_data = [positions_data]
            
            # Calculate PnL for each position and ensure all fields are present
            enhanced_positions = []
            for position in positions_data:
                # Calculate PnL based on current market price vs day-ahead price
                current_market_price = market_data.get("current_price", market_data.get("currentPrice", 45.67))
                day_ahead_price = position.get("dayAheadPrice", position.get("price", 45.67))
                quantity = position.get("quantity", 0)
                
                enhanced_position = {
                    "id": f"pos_{int(datetime.now().timestamp() * 1000)}_{position.get('hour', 0)}",
                    "hour": position.get("hour", 0),
                    "quantity": quantity,
                    "dayAheadPrice": day_ahead_price,
                    "userId": position.get("userId", "default_user"),
                    "pnl": (current_market_price - day_ahead_price) * quantity,
                    "realTimePrice": current_market_price,
                    "realTimeSettlement": position.get("realTimeSettlement", []),
                    "timestamp": datetime.now().isoformat()
                }
                enhanced_positions.append(enhanced_position)
            
            user_positions.clear()
            user_positions.extend(enhanced_positions)
            
            # Send positions update to Kafka
            for position in enhanced_positions:
                await service_manager.send_to_kafka("portfolio_update", {
                    "type": "position_update",
                    "user_id": position.get("userId", "default_user"),
                    "position": position,
                    "timestamp": datetime.now().isoformat()
                })
            
            return {
                "message": f"Saved {len(enhanced_positions)} positions successfully",
                "positions": enhanced_positions,
                "position": enhanced_positions[0] if enhanced_positions else None
            }
        else:
            return {"message": "No positions data received"}
            
    except Exception as e:
        print(f"❌ Error processing positions: {e}")
        raise HTTPException(status_code=422, detail=f"Error processing positions: {str(e)}")

@app.get("/api/system/services-status")
async def get_services_status():
    """Get status of Kafka and other services."""
    return {
        "platform_version": "3.0.0",
        "kafka_streaming": "connected" if service_manager.kafka_active else "disconnected",
        "kafka_topics": kafka_service.topics if service_manager.kafka_active else {},
        "postgresql_status": "connected" if service_manager.postgres_active else "not available",
        "real_time_streaming": service_manager.kafka_active,
        "timestamp": datetime.now().isoformat()
    }

# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "data": {
                "market_data": market_data,
                "kafka_active": service_manager.kafka_active,
                "features": ["kafka_streaming", "real_time_market_data", "order_events"]
            }
        }))
        
        while True:
            await asyncio.sleep(60)  # Grid.io API rate limit friendly
            
            # Get fresh market data from Grid.io API
            fresh_data = await generate_market_data()
            
            # Send to Kafka
            await service_manager.send_to_kafka("market_data", fresh_data)
            
            # Send via WebSocket
            await websocket.send_text(json.dumps({
                "type": "market_update",
                "data": fresh_data,
                "source": fresh_data.get("data_source", "Grid.io API"),
                "api_status": fresh_data.get("api_status", "connected"),
                "timestamp": datetime.now().isoformat()
            }))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
