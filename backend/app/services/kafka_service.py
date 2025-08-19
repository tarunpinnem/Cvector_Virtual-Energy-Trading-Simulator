"""
Kafka Event Streaming Service for Energy Trading
Handles trading workflow events: bid submission → market clearing → position creation
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class KafkaEventService:
    """Service for handling trading workflow events via Kafka."""
    
    def __init__(self, bootstrap_servers: str = "localhost:9092"):
        self.bootstrap_servers = bootstrap_servers
        self.producer: Optional[KafkaProducer] = None
        self.consumers: Dict[str, KafkaConsumer] = {}
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Topic configuration for energy trading events
        self.topics = {
            "bid_submissions": "energy.trading.bids.submitted",
            "bid_validations": "energy.trading.bids.validated", 
            "market_clearing": "energy.trading.market.clearing",
            "trade_executions": "energy.trading.trades.executed",
            "position_created": "energy.trading.positions.created",
            "position_updated": "energy.trading.positions.updated",
            "portfolio_updated": "energy.trading.portfolio.updated",
            "risk_alerts": "energy.trading.risk.alerts",
            "audit_trail": "energy.trading.audit.trail"
        }
    
    def get_producer(self) -> KafkaProducer:
        """Get or create Kafka producer."""
        if self.producer is None:
            try:
                self.producer = KafkaProducer(
                    bootstrap_servers=self.bootstrap_servers,
                    value_serializer=lambda v: json.dumps(v, default=str).encode('utf-8'),
                    key_serializer=lambda k: str(k).encode('utf-8') if k else None,
                    acks='all',  # Wait for all replicas
                    retries=3,
                    max_in_flight_requests_per_connection=1  # Ensure ordering
                )
                logger.info(f"Connected to Kafka at {self.bootstrap_servers}")
            except Exception as e:
                logger.error(f"Failed to create Kafka producer: {e}")
                raise
        
        return self.producer
    
    async def publish_event(self, topic_key: str, event_data: Dict[str, Any], key: Optional[str] = None):
        """Publish event to Kafka topic."""
        if topic_key not in self.topics:
            raise ValueError(f"Unknown topic key: {topic_key}")
        
        topic = self.topics[topic_key]
        
        # Add metadata to event
        enhanced_event = {
            "event_id": f"{topic_key}_{datetime.utcnow().timestamp()}",
            "event_type": topic_key,
            "timestamp": datetime.utcnow().isoformat(),
            "source": "energy_trading_app",
            **event_data
        }
        
        try:
            producer = self.get_producer()
            
            # Send message asynchronously
            future = producer.send(
                topic=topic,
                value=enhanced_event,
                key=key
            )
            
            # Wait for delivery confirmation
            record_metadata = future.get(timeout=10)
            
            logger.info(f"Event published to {topic} - Partition: {record_metadata.partition}, Offset: {record_metadata.offset}")
            
        except KafkaError as e:
            logger.error(f"Failed to publish event to {topic}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error publishing event: {e}")
            raise
    
    # Specific event publishers for trading workflow
    
    async def publish_bid_submitted(self, bid_data: Dict[str, Any]):
        """Publish bid submission event."""
        await self.publish_event(
            "bid_submissions", 
            {
                "bid_id": bid_data.get("id"),
                "user_id": bid_data.get("user_id"),
                "quantity": bid_data.get("quantity"),
                "price": bid_data.get("price"),
                "bid_type": bid_data.get("bid_type"),
                "trading_date": bid_data.get("trading_date"),
                "hour_slot": bid_data.get("hour_slot"),
                "status": "submitted"
            },
            key=str(bid_data.get("id"))
        )
    
    async def publish_bid_validated(self, bid_id: int, validation_result: Dict[str, Any]):
        """Publish bid validation result."""
        await self.publish_event(
            "bid_validations",
            {
                "bid_id": bid_id,
                "is_valid": validation_result.get("is_valid"),
                "validation_errors": validation_result.get("errors", []),
                "risk_check_passed": validation_result.get("risk_check_passed"),
                "margin_requirement": validation_result.get("margin_requirement")
            },
            key=str(bid_id)
        )
    
    async def publish_market_clearing(self, clearing_data: Dict[str, Any]):
        """Publish market clearing event."""
        await self.publish_event(
            "market_clearing",
            {
                "trading_date": clearing_data.get("trading_date"),
                "hour_slot": clearing_data.get("hour_slot"),
                "clearing_price": clearing_data.get("clearing_price"),
                "total_volume": clearing_data.get("total_volume"),
                "bids_cleared": clearing_data.get("bids_cleared", []),
                "market_type": clearing_data.get("market_type", "day_ahead")
            },
            key=f"{clearing_data.get('trading_date')}_{clearing_data.get('hour_slot')}"
        )
    
    async def publish_trade_executed(self, trade_data: Dict[str, Any]):
        """Publish trade execution event."""
        await self.publish_event(
            "trade_executions",
            {
                "trade_id": trade_data.get("id"),
                "bid_id": trade_data.get("bid_id"),
                "user_id": trade_data.get("user_id"),
                "quantity": trade_data.get("quantity"),
                "execution_price": trade_data.get("price"),
                "total_value": trade_data.get("total_value"),
                "trade_type": trade_data.get("trade_type"),
                "trading_date": trade_data.get("trading_date"),
                "hour_slot": trade_data.get("hour_slot")
            },
            key=str(trade_data.get("id"))
        )
    
    async def publish_position_created(self, position_data: Dict[str, Any]):
        """Publish position creation event."""
        await self.publish_event(
            "position_created",
            {
                "position_id": position_data.get("id"),
                "user_id": position_data.get("user_id"),
                "bid_id": position_data.get("bid_id"),
                "quantity": position_data.get("quantity"),
                "entry_price": position_data.get("entry_price"),
                "trading_date": position_data.get("trading_date"),
                "hour_slot": position_data.get("hour_slot"),
                "expected_settlement_time": position_data.get("expected_settlement_time")
            },
            key=str(position_data.get("id"))
        )
    
    async def publish_position_updated(self, position_data: Dict[str, Any]):
        """Publish position update event (real-time settlements)."""
        await self.publish_event(
            "position_updated",
            {
                "position_id": position_data.get("id"),
                "user_id": position_data.get("user_id"),
                "current_price": position_data.get("current_price"),
                "unrealized_pnl": position_data.get("unrealized_pnl"),
                "realized_pnl": position_data.get("realized_pnl"),
                "settlement_prices": position_data.get("settlement_prices", []),
                "update_reason": position_data.get("update_reason", "real_time_settlement")
            },
            key=str(position_data.get("id"))
        )
    
    async def publish_portfolio_updated(self, portfolio_data: Dict[str, Any]):
        """Publish portfolio update event."""
        await self.publish_event(
            "portfolio_updated",
            {
                "user_id": portfolio_data.get("user_id"),
                "cash_balance": portfolio_data.get("cash_balance"),
                "total_pnl": portfolio_data.get("total_pnl"),
                "daily_pnl": portfolio_data.get("daily_pnl"),
                "unrealized_pnl": portfolio_data.get("unrealized_pnl"),
                "total_exposure": portfolio_data.get("total_exposure"),
                "number_of_positions": portfolio_data.get("number_of_positions"),
                "update_trigger": portfolio_data.get("update_trigger")
            },
            key=str(portfolio_data.get("user_id"))
        )
    
    async def publish_risk_alert(self, alert_data: Dict[str, Any]):
        """Publish risk management alert."""
        await self.publish_event(
            "risk_alerts",
            {
                "user_id": alert_data.get("user_id"),
                "alert_type": alert_data.get("alert_type"),
                "severity": alert_data.get("severity", "medium"),
                "message": alert_data.get("message"),
                "current_value": alert_data.get("current_value"),
                "threshold": alert_data.get("threshold"),
                "recommended_action": alert_data.get("recommended_action")
            },
            key=f"{alert_data.get('user_id')}_{alert_data.get('alert_type')}"
        )
    
    async def publish_audit_event(self, audit_data: Dict[str, Any]):
        """Publish audit trail event."""
        await self.publish_event(
            "audit_trail",
            {
                "user_id": audit_data.get("user_id"),
                "action": audit_data.get("action"),
                "entity_type": audit_data.get("entity_type"),
                "entity_id": audit_data.get("entity_id"),
                "changes": audit_data.get("changes", {}),
                "ip_address": audit_data.get("ip_address"),
                "user_agent": audit_data.get("user_agent")
            },
            key=f"{audit_data.get('user_id')}_{audit_data.get('action')}"
        )
    
    def create_consumer(self, topic_key: str, group_id: str) -> KafkaConsumer:
        """Create a Kafka consumer for a specific topic."""
        if topic_key not in self.topics:
            raise ValueError(f"Unknown topic key: {topic_key}")
        
        topic = self.topics[topic_key]
        
        try:
            consumer = KafkaConsumer(
                topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=group_id,
                value_deserializer=lambda v: json.loads(v.decode('utf-8')),
                key_deserializer=lambda k: k.decode('utf-8') if k else None,
                auto_offset_reset='latest',  # Start from latest messages
                enable_auto_commit=True,
                auto_commit_interval_ms=1000
            )
            
            self.consumers[f"{topic}_{group_id}"] = consumer
            logger.info(f"Created consumer for topic {topic} with group {group_id}")
            
            return consumer
            
        except Exception as e:
            logger.error(f"Failed to create consumer for topic {topic}: {e}")
            raise
    
    def close(self):
        """Close all Kafka connections."""
        if self.producer:
            self.producer.close()
            logger.info("Kafka producer closed")
        
        for consumer in self.consumers.values():
            consumer.close()
        
        self.consumers.clear()
        logger.info("All Kafka consumers closed")

# Global Kafka service instance
kafka_service = KafkaEventService()

# Event processor for handling trading workflow
class TradingEventProcessor:
    """Processes trading events from Kafka streams."""
    
    def __init__(self, kafka_service: KafkaEventService):
        self.kafka_service = kafka_service
        self.running = False
    
    async def start_processing(self):
        """Start processing trading events."""
        self.running = True
        
        # Create consumers for different event types
        consumers = {
            "bid_submissions": self.kafka_service.create_consumer("bid_submissions", "trading_processor"),
            "market_clearing": self.kafka_service.create_consumer("market_clearing", "settlement_processor"),
            "position_updates": self.kafka_service.create_consumer("position_updated", "pnl_processor")
        }
        
        # Start processing in background
        tasks = []
        for event_type, consumer in consumers.items():
            task = asyncio.create_task(self._process_events(event_type, consumer))
            tasks.append(task)
        
        # Wait for all tasks
        await asyncio.gather(*tasks)
    
    async def _process_events(self, event_type: str, consumer: KafkaConsumer):
        """Process events from a specific consumer."""
        while self.running:
            try:
                # Poll for messages
                message_batch = consumer.poll(timeout_ms=1000)
                
                for topic_partition, messages in message_batch.items():
                    for message in messages:
                        await self._handle_event(event_type, message.value)
                
            except Exception as e:
                logger.error(f"Error processing {event_type} events: {e}")
                await asyncio.sleep(1)
    
    async def _handle_event(self, event_type: str, event_data: Dict[str, Any]):
        """Handle individual trading events."""
        try:
            if event_type == "bid_submissions":
                await self._process_bid_submission(event_data)
            elif event_type == "market_clearing":
                await self._process_market_clearing(event_data)
            elif event_type == "position_updates":
                await self._process_position_update(event_data)
            
        except Exception as e:
            logger.error(f"Error handling {event_type} event: {e}")
    
    async def _process_bid_submission(self, event_data: Dict[str, Any]):
        """Process bid submission event."""
        logger.info(f"Processing bid submission: {event_data.get('bid_id')}")
        
        # Validate bid
        # Update risk metrics
        # Send to market clearing queue
        
    async def _process_market_clearing(self, event_data: Dict[str, Any]):
        """Process market clearing event."""
        logger.info(f"Processing market clearing for {event_data.get('trading_date')} hour {event_data.get('hour_slot')}")
        
        # Execute matched trades
        # Create positions
        # Update portfolios
        
    async def _process_position_update(self, event_data: Dict[str, Any]):
        """Process position update event."""
        logger.info(f"Processing position update: {event_data.get('position_id')}")
        
        # Update P&L calculations
        # Check risk limits
        # Send notifications if needed

# Global event processor
event_processor = TradingEventProcessor(kafka_service)
