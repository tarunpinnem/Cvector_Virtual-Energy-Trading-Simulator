"""
TimescaleDB Service for Energy Trading Time-Series Data
Handles efficient storage and querying of market data, prices, and trading metrics
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
import psycopg2
from psycopg2.extras import RealDictCursor, execute_values
import asyncio
import asyncpg
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class MarketDataPoint:
    """Data structure for market price points."""
    timestamp: datetime
    market_type: str  # 'day_ahead', 'real_time'
    price: float  # $/MWh
    load: Optional[float] = None  # MW
    region: str = "CAISO"
    source: str = "gridstatus"

@dataclass
class FuelMixPoint:
    """Data structure for fuel mix data points."""
    timestamp: datetime
    total_generation: float
    solar_mw: float
    wind_mw: float
    natural_gas_mw: float
    nuclear_mw: Optional[float] = None
    hydro_mw: Optional[float] = None
    other_mw: Optional[float] = None
    renewable_percentage: float = 0.0
    region: str = "CAISO"

@dataclass
class PositionSnapshot:
    """Data structure for position P&L snapshots."""
    timestamp: datetime
    position_id: int
    user_id: int
    quantity: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float
    settlement_price: Optional[float] = None

class TimescaleDBService:
    """Service for handling time-series data with TimescaleDB."""
    
    def __init__(self, connection_string: str = None):
        if connection_string is None:
            # Default local connection
            connection_string = "postgresql://postgres:password@localhost:5432/energy_trading_ts"
        
        self.connection_string = connection_string
        self.pool: Optional[asyncpg.Pool] = None
        
    async def initialize(self):
        """Initialize TimescaleDB connection and create tables."""
        try:
            # Create connection pool
            self.pool = await asyncpg.create_pool(self.connection_string)
            
            # Create tables and hypertables
            await self._create_tables()
            
            logger.info("TimescaleDB initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize TimescaleDB: {e}")
            raise
    
    async def _create_tables(self):
        """Create TimescaleDB tables and hypertables."""
        
        # Market data hypertable
        market_data_ddl = """
        CREATE TABLE IF NOT EXISTS market_data_ts (
            timestamp TIMESTAMPTZ NOT NULL,
            market_type VARCHAR(20) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            load_mw DECIMAL(10,1),
            region VARCHAR(10) DEFAULT 'CAISO',
            source VARCHAR(50) DEFAULT 'gridstatus',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Create hypertable if not exists
        SELECT create_hypertable('market_data_ts', 'timestamp', if_not_exists => TRUE);
        
        -- Create indexes for efficient queries
        CREATE INDEX IF NOT EXISTS idx_market_data_ts_market_type_time 
        ON market_data_ts (market_type, timestamp DESC);
        
        CREATE INDEX IF NOT EXISTS idx_market_data_ts_region_time 
        ON market_data_ts (region, timestamp DESC);
        """
        
        # Fuel mix hypertable
        fuel_mix_ddl = """
        CREATE TABLE IF NOT EXISTS fuel_mix_ts (
            timestamp TIMESTAMPTZ NOT NULL,
            total_generation DECIMAL(10,1) NOT NULL,
            solar_mw DECIMAL(10,1) DEFAULT 0,
            wind_mw DECIMAL(10,1) DEFAULT 0,
            natural_gas_mw DECIMAL(10,1) DEFAULT 0,
            nuclear_mw DECIMAL(10,1) DEFAULT 0,
            hydro_mw DECIMAL(10,1) DEFAULT 0,
            other_mw DECIMAL(10,1) DEFAULT 0,
            renewable_percentage DECIMAL(5,2) DEFAULT 0,
            region VARCHAR(10) DEFAULT 'CAISO',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        SELECT create_hypertable('fuel_mix_ts', 'timestamp', if_not_exists => TRUE);
        
        CREATE INDEX IF NOT EXISTS idx_fuel_mix_ts_region_time 
        ON fuel_mix_ts (region, timestamp DESC);
        """
        
        # Position P&L snapshots hypertable
        position_pnl_ddl = """
        CREATE TABLE IF NOT EXISTS position_pnl_ts (
            timestamp TIMESTAMPTZ NOT NULL,
            position_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            quantity DECIMAL(10,2) NOT NULL,
            entry_price DECIMAL(10,2) NOT NULL,
            current_price DECIMAL(10,2) NOT NULL,
            unrealized_pnl DECIMAL(12,2) NOT NULL,
            realized_pnl DECIMAL(12,2) DEFAULT 0,
            settlement_price DECIMAL(10,2),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        SELECT create_hypertable('position_pnl_ts', 'timestamp', if_not_exists => TRUE);
        
        CREATE INDEX IF NOT EXISTS idx_position_pnl_ts_position_time 
        ON position_pnl_ts (position_id, timestamp DESC);
        
        CREATE INDEX IF NOT EXISTS idx_position_pnl_ts_user_time 
        ON position_pnl_ts (user_id, timestamp DESC);
        """
        
        # Portfolio performance hypertable
        portfolio_performance_ddl = """
        CREATE TABLE IF NOT EXISTS portfolio_performance_ts (
            timestamp TIMESTAMPTZ NOT NULL,
            user_id INTEGER NOT NULL,
            total_pnl DECIMAL(12,2) NOT NULL,
            daily_pnl DECIMAL(12,2) NOT NULL,
            cash_balance DECIMAL(12,2) NOT NULL,
            total_exposure DECIMAL(12,2) NOT NULL,
            unrealized_pnl DECIMAL(12,2) NOT NULL,
            realized_pnl DECIMAL(12,2) NOT NULL,
            number_of_positions INTEGER DEFAULT 0,
            win_rate DECIMAL(5,2) DEFAULT 0,
            sharpe_ratio DECIMAL(8,4),
            max_drawdown DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        SELECT create_hypertable('portfolio_performance_ts', 'timestamp', if_not_exists => TRUE);
        
        CREATE INDEX IF NOT EXISTS idx_portfolio_performance_ts_user_time 
        ON portfolio_performance_ts (user_id, timestamp DESC);
        """
        
        # Trading volume and activity hypertable
        trading_activity_ddl = """
        CREATE TABLE IF NOT EXISTS trading_activity_ts (
            timestamp TIMESTAMPTZ NOT NULL,
            region VARCHAR(10) DEFAULT 'CAISO',
            total_volume_mwh DECIMAL(12,2) NOT NULL,
            total_value_usd DECIMAL(15,2) NOT NULL,
            avg_price DECIMAL(10,2) NOT NULL,
            number_of_trades INTEGER NOT NULL,
            buy_volume DECIMAL(12,2) DEFAULT 0,
            sell_volume DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        SELECT create_hypertable('trading_activity_ts', 'timestamp', if_not_exists => TRUE);
        
        CREATE INDEX IF NOT EXISTS idx_trading_activity_ts_region_time 
        ON trading_activity_ts (region, timestamp DESC);
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(market_data_ddl)
            await conn.execute(fuel_mix_ddl)
            await conn.execute(position_pnl_ddl)
            await conn.execute(portfolio_performance_ddl)
            await conn.execute(trading_activity_ddl)
            
            logger.info("TimescaleDB tables and hypertables created successfully")
    
    # Market Data Operations
    
    async def insert_market_data(self, data_points: List[MarketDataPoint]):
        """Insert market data points into TimescaleDB."""
        if not data_points:
            return
        
        insert_query = """
        INSERT INTO market_data_ts (timestamp, market_type, price, load_mw, region, source)
        VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        async with self.pool.acquire() as conn:
            for point in data_points:
                await conn.execute(
                    insert_query,
                    point.timestamp, point.market_type, point.price, 
                    point.load, point.region, point.source
                )
        
        logger.debug(f"Inserted {len(data_points)} market data points")
    
    async def get_recent_market_data(self, market_type: str, hours: int = 24, region: str = "CAISO") -> List[Dict]:
        """Get recent market data for analysis."""
        query = """
        SELECT timestamp, price, load_mw, source
        FROM market_data_ts
        WHERE market_type = $1 
          AND region = $2
          AND timestamp >= $3
        ORDER BY timestamp DESC
        LIMIT 1000
        """
        
        since = datetime.utcnow() - timedelta(hours=hours)
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, market_type, region, since)
            return [dict(row) for row in rows]
    
    async def get_price_statistics(self, market_type: str, days: int = 7) -> Dict[str, float]:
        """Get price statistics for a time period."""
        query = """
        SELECT 
            AVG(price) as avg_price,
            MIN(price) as min_price,
            MAX(price) as max_price,
            STDDEV(price) as price_volatility,
            COUNT(*) as data_points
        FROM market_data_ts
        WHERE market_type = $1
          AND timestamp >= $2
        """
        
        since = datetime.utcnow() - timedelta(days=days)
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, market_type, since)
            return dict(row) if row else {}
    
    # Fuel Mix Operations
    
    async def insert_fuel_mix(self, data_points: List[FuelMixPoint]):
        """Insert fuel mix data points."""
        if not data_points:
            return
        
        insert_query = """
        INSERT INTO fuel_mix_ts (
            timestamp, total_generation, solar_mw, wind_mw, natural_gas_mw,
            nuclear_mw, hydro_mw, other_mw, renewable_percentage, region
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        """
        
        async with self.pool.acquire() as conn:
            for point in data_points:
                await conn.execute(
                    insert_query,
                    point.timestamp, point.total_generation, point.solar_mw,
                    point.wind_mw, point.natural_gas_mw, point.nuclear_mw,
                    point.hydro_mw, point.other_mw, point.renewable_percentage, point.region
                )
        
        logger.debug(f"Inserted {len(data_points)} fuel mix data points")
    
    async def get_renewable_trends(self, days: int = 30) -> List[Dict]:
        """Get renewable energy trends over time."""
        query = """
        SELECT 
            DATE_TRUNC('hour', timestamp) as hour,
            AVG(renewable_percentage) as avg_renewable_pct,
            AVG(solar_mw) as avg_solar,
            AVG(wind_mw) as avg_wind,
            AVG(total_generation) as avg_total
        FROM fuel_mix_ts
        WHERE timestamp >= $1
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour DESC
        """
        
        since = datetime.utcnow() - timedelta(days=days)
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, since)
            return [dict(row) for row in rows]
    
    # Position P&L Operations
    
    async def insert_position_snapshot(self, snapshots: List[PositionSnapshot]):
        """Insert position P&L snapshots."""
        if not snapshots:
            return
        
        insert_query = """
        INSERT INTO position_pnl_ts (
            timestamp, position_id, user_id, quantity, entry_price,
            current_price, unrealized_pnl, realized_pnl, settlement_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """
        
        async with self.pool.acquire() as conn:
            for snapshot in snapshots:
                await conn.execute(
                    insert_query,
                    snapshot.timestamp, snapshot.position_id, snapshot.user_id,
                    snapshot.quantity, snapshot.entry_price, snapshot.current_price,
                    snapshot.unrealized_pnl, snapshot.realized_pnl, snapshot.settlement_price
                )
        
        logger.debug(f"Inserted {len(snapshots)} position snapshots")
    
    async def get_position_pnl_history(self, position_id: int, hours: int = 24) -> List[Dict]:
        """Get P&L history for a specific position."""
        query = """
        SELECT timestamp, current_price, unrealized_pnl, realized_pnl, settlement_price
        FROM position_pnl_ts
        WHERE position_id = $1
          AND timestamp >= $2
        ORDER BY timestamp DESC
        """
        
        since = datetime.utcnow() - timedelta(hours=hours)
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, position_id, since)
            return [dict(row) for row in rows]
    
    async def get_user_pnl_timeline(self, user_id: int, days: int = 7) -> List[Dict]:
        """Get user's P&L timeline."""
        query = """
        SELECT 
            DATE_TRUNC('hour', timestamp) as hour,
            SUM(unrealized_pnl) as total_unrealized_pnl,
            SUM(realized_pnl) as total_realized_pnl,
            COUNT(DISTINCT position_id) as active_positions
        FROM position_pnl_ts
        WHERE user_id = $1
          AND timestamp >= $2
        GROUP BY DATE_TRUNC('hour', timestamp)
        ORDER BY hour DESC
        """
        
        since = datetime.utcnow() - timedelta(days=days)
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, user_id, since)
            return [dict(row) for row in rows]
    
    # Portfolio Performance Operations
    
    async def insert_portfolio_performance(self, user_id: int, performance_data: Dict[str, Any]):
        """Insert portfolio performance snapshot."""
        insert_query = """
        INSERT INTO portfolio_performance_ts (
            timestamp, user_id, total_pnl, daily_pnl, cash_balance,
            total_exposure, unrealized_pnl, realized_pnl, number_of_positions,
            win_rate, sharpe_ratio, max_drawdown
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                insert_query,
                datetime.utcnow(), user_id,
                performance_data.get('total_pnl', 0),
                performance_data.get('daily_pnl', 0),
                performance_data.get('cash_balance', 0),
                performance_data.get('total_exposure', 0),
                performance_data.get('unrealized_pnl', 0),
                performance_data.get('realized_pnl', 0),
                performance_data.get('number_of_positions', 0),
                performance_data.get('win_rate', 0),
                performance_data.get('sharpe_ratio'),
                performance_data.get('max_drawdown', 0)
            )
        
        logger.debug(f"Inserted portfolio performance for user {user_id}")
    
    async def get_portfolio_metrics(self, user_id: int, days: int = 30) -> Dict[str, Any]:
        """Get portfolio performance metrics over time."""
        query = """
        SELECT 
            MAX(total_pnl) - MIN(total_pnl) as pnl_range,
            AVG(total_pnl) as avg_pnl,
            STDDEV(daily_pnl) as daily_volatility,
            MAX(max_drawdown) as max_drawdown,
            AVG(win_rate) as avg_win_rate,
            COUNT(*) as snapshots
        FROM portfolio_performance_ts
        WHERE user_id = $1
          AND timestamp >= $2
        """
        
        since = datetime.utcnow() - timedelta(days=days)
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, user_id, since)
            return dict(row) if row else {}
    
    # Analytics and Continuous Aggregations
    
    async def create_continuous_aggregates(self):
        """Create continuous aggregates for real-time analytics."""
        
        # Hourly market data aggregate
        hourly_market_agg = """
        CREATE MATERIALIZED VIEW IF NOT EXISTS market_data_hourly
        WITH (timescaledb.continuous) AS
        SELECT 
            time_bucket('1 hour', timestamp) AS hour,
            market_type,
            region,
            AVG(price) as avg_price,
            MIN(price) as min_price,
            MAX(price) as max_price,
            AVG(load_mw) as avg_load,
            COUNT(*) as data_points
        FROM market_data_ts
        GROUP BY hour, market_type, region;
        
        SELECT add_continuous_aggregate_policy('market_data_hourly',
            start_offset => INTERVAL '1 day',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour',
            if_not_exists => TRUE);
        """
        
        # Daily portfolio performance aggregate
        daily_portfolio_agg = """
        CREATE MATERIALIZED VIEW IF NOT EXISTS portfolio_performance_daily
        WITH (timescaledb.continuous) AS
        SELECT 
            time_bucket('1 day', timestamp) AS day,
            user_id,
            LAST(total_pnl, timestamp) as end_of_day_pnl,
            MAX(total_pnl) - MIN(total_pnl) as daily_pnl_range,
            AVG(total_exposure) as avg_exposure,
            MAX(number_of_positions) as max_positions
        FROM portfolio_performance_ts
        GROUP BY day, user_id;
        
        SELECT add_continuous_aggregate_policy('portfolio_performance_daily',
            start_offset => INTERVAL '7 days',
            end_offset => INTERVAL '1 day',
            schedule_interval => INTERVAL '1 day',
            if_not_exists => TRUE);
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(hourly_market_agg)
            await conn.execute(daily_portfolio_agg)
            
        logger.info("Created TimescaleDB continuous aggregates")
    
    async def close(self):
        """Close TimescaleDB connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("TimescaleDB connection pool closed")

# Global TimescaleDB service instance
timescale_service = TimescaleDBService()

# Data ingestion service
class TimeSeriesDataIngestion:
    """Service for ingesting real-time data into TimescaleDB."""
    
    def __init__(self, timescale_service: TimescaleDBService):
        self.timescale_service = timescale_service
        self.ingestion_buffers = {
            'market_data': [],
            'fuel_mix': [],
            'position_snapshots': []
        }
        self.buffer_size = 100
        self.flush_interval = 30  # seconds
    
    async def start_ingestion(self):
        """Start the data ingestion process."""
        # Flush buffers periodically
        asyncio.create_task(self._periodic_flush())
        
        logger.info("TimescaleDB data ingestion started")
    
    async def ingest_market_data(self, price: float, load: float = None, market_type: str = "real_time"):
        """Ingest market data point."""
        point = MarketDataPoint(
            timestamp=datetime.utcnow(),
            market_type=market_type,
            price=price,
            load=load
        )
        
        self.ingestion_buffers['market_data'].append(point)
        
        if len(self.ingestion_buffers['market_data']) >= self.buffer_size:
            await self._flush_market_data()
    
    async def ingest_fuel_mix(self, fuel_mix_data: Dict[str, Any]):
        """Ingest fuel mix data point."""
        point = FuelMixPoint(
            timestamp=datetime.utcnow(),
            total_generation=fuel_mix_data.get('total_generation', 0),
            solar_mw=fuel_mix_data.get('solar_mw', 0),
            wind_mw=fuel_mix_data.get('wind_mw', 0),
            natural_gas_mw=fuel_mix_data.get('natural_gas_mw', 0),
            renewable_percentage=fuel_mix_data.get('renewable_percentage', 0)
        )
        
        self.ingestion_buffers['fuel_mix'].append(point)
        
        if len(self.ingestion_buffers['fuel_mix']) >= self.buffer_size:
            await self._flush_fuel_mix()
    
    async def ingest_position_snapshot(self, position_data: Dict[str, Any]):
        """Ingest position P&L snapshot."""
        snapshot = PositionSnapshot(
            timestamp=datetime.utcnow(),
            position_id=position_data['position_id'],
            user_id=position_data['user_id'],
            quantity=position_data['quantity'],
            entry_price=position_data['entry_price'],
            current_price=position_data['current_price'],
            unrealized_pnl=position_data['unrealized_pnl'],
            realized_pnl=position_data.get('realized_pnl', 0),
            settlement_price=position_data.get('settlement_price')
        )
        
        self.ingestion_buffers['position_snapshots'].append(snapshot)
        
        if len(self.ingestion_buffers['position_snapshots']) >= self.buffer_size:
            await self._flush_position_snapshots()
    
    async def _periodic_flush(self):
        """Periodically flush all buffers."""
        while True:
            await asyncio.sleep(self.flush_interval)
            await self._flush_all_buffers()
    
    async def _flush_all_buffers(self):
        """Flush all ingestion buffers."""
        await self._flush_market_data()
        await self._flush_fuel_mix()
        await self._flush_position_snapshots()
    
    async def _flush_market_data(self):
        """Flush market data buffer."""
        if self.ingestion_buffers['market_data']:
            await self.timescale_service.insert_market_data(self.ingestion_buffers['market_data'])
            self.ingestion_buffers['market_data'].clear()
    
    async def _flush_fuel_mix(self):
        """Flush fuel mix buffer."""
        if self.ingestion_buffers['fuel_mix']:
            await self.timescale_service.insert_fuel_mix(self.ingestion_buffers['fuel_mix'])
            self.ingestion_buffers['fuel_mix'].clear()
    
    async def _flush_position_snapshots(self):
        """Flush position snapshots buffer."""
        if self.ingestion_buffers['position_snapshots']:
            await self.timescale_service.insert_position_snapshot(self.ingestion_buffers['position_snapshots'])
            self.ingestion_buffers['position_snapshots'].clear()

# Global data ingestion service
data_ingestion = TimeSeriesDataIngestion(timescale_service)
