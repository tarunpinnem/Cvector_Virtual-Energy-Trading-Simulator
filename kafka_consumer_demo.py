#!/usr/bin/env python3
"""
Kafka Consumer Demo for Energy Trading Platform
Shows real-time Kafka messages for demo purposes
"""

import json
from kafka import KafkaConsumer
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnergyTradingKafkaConsumer:
    def __init__(self):
        self.consumer = None
        self.topics = [
            'energy.trading.bids.submitted',
            'energy.trading.trades.executed',
            'energy.market.prices',
            'energy.portfolio.updates',
            'energy.alerts'
        ]
    
    def connect(self):
        """Connect to Kafka broker."""
        try:
            self.consumer = KafkaConsumer(
                *self.topics,
                bootstrap_servers=['localhost:9092'],
                auto_offset_reset='latest',
                enable_auto_commit=True,
                group_id='energy_trading_demo',
                value_deserializer=lambda x: json.loads(x.decode('utf-8')) if x else None
            )
            logger.info("✅ Connected to Kafka broker at localhost:9092")
            logger.info(f"📡 Subscribed to topics: {', '.join(self.topics)}")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to connect to Kafka: {e}")
            return False
    
    def format_bid_message(self, data):
        """Format bid submission message."""
        return f"""
╔══════════════════════════════════════════════════════════╗
║                    📋 BID SUBMITTED                       ║
╠══════════════════════════════════════════════════════════╣
║ Bid ID: {data.get('bid_id', 'N/A')}                      ║
║ User: {data.get('user_id', 'N/A')}                       ║
║ Hour: {data.get('hour', 'N/A')}                          ║
║ Action: {data.get('action', 'N/A').upper()}              ║
║ Price: ${data.get('price', 0):.2f}/MWh                   ║
║ Quantity: {data.get('quantity', 0)} MWh                  ║
║ Total Value: ${data.get('price', 0) * data.get('quantity', 0):,.2f} ║
║ Status: {data.get('status', 'N/A').upper()}              ║
║ Timestamp: {data.get('timestamp', 'N/A')}                ║
╚══════════════════════════════════════════════════════════╝"""
    
    def format_trade_message(self, data):
        """Format trade execution message."""
        return f"""
╔══════════════════════════════════════════════════════════╗
║                   ⚡ TRADE EXECUTED                       ║
╠══════════════════════════════════════════════════════════╣
║ Trade ID: {data.get('trade_id', 'N/A')}                  ║
║ User: {data.get('user_id', 'N/A')}                       ║
║ Type: {data.get('trade_type', 'N/A').upper()}            ║
║ Execution Price: ${data.get('execution_price', 0):.2f}/MWh ║
║ Quantity: {data.get('quantity', 0)} MWh                  ║
║ Total: ${data.get('total_value', 0):,.2f}                ║
║ Market: {data.get('market', 'N/A')}                      ║
║ Settlement: {data.get('settlement_time', 'N/A')}         ║
╚══════════════════════════════════════════════════════════╝"""
    
    def format_price_message(self, data):
        """Format market price message."""
        return f"""
╔══════════════════════════════════════════════════════════╗
║                   💰 MARKET PRICES                       ║
╠══════════════════════════════════════════════════════════╣
║ Current Price: ${data.get('current_price', 0):.2f}/MWh   ║
║ 24h Change: {data.get('change_24h', 0):+.2f}             ║
║ 24h High: ${data.get('high_24h', 0):.2f}/MWh             ║
║ 24h Low: ${data.get('low_24h', 0):.2f}/MWh               ║
║ Volume: {data.get('volume', 0):,.0f} MWh                 ║
║ Renewable %: {data.get('renewable_pct', 0):.1f}%         ║
╚══════════════════════════════════════════════════════════╝"""
    
    def format_portfolio_message(self, data):
        """Format portfolio update message."""
        return f"""
╔══════════════════════════════════════════════════════════╗
║                  💼 PORTFOLIO UPDATE                     ║
╠══════════════════════════════════════════════════════════╣
║ User: {data.get('user_id', 'N/A')}                       ║
║ Cash Balance: ${data.get('cash_balance', 0):,.2f}        ║
║ Total P&L: ${data.get('total_pnl', 0):+,.2f}             ║
║ Active Positions: {data.get('active_positions', 0)}      ║
║ Day-Ahead Bids: {data.get('day_ahead_bids', 0)}          ║
║ Portfolio Value: ${data.get('portfolio_value', 0):,.2f}  ║
╚══════════════════════════════════════════════════════════╝"""
    
    def format_alert_message(self, data):
        """Format alert message."""
        return f"""
╔══════════════════════════════════════════════════════════╗
║                     🚨 ALERT                            ║
╠══════════════════════════════════════════════════════════╣
║ Type: {data.get('alert_type', 'N/A').upper()}            ║
║ Message: {data.get('message', 'N/A')}                    ║
║ Priority: {data.get('priority', 'N/A').upper()}          ║
║ User: {data.get('user_id', 'N/A')}                       ║
║ Timestamp: {data.get('timestamp', 'N/A')}                ║
╚══════════════════════════════════════════════════════════╝"""
    
    def start_consuming(self):
        """Start consuming messages from Kafka."""
        if not self.consumer:
            if not self.connect():
                return
        
        print("\n" + "="*80)
        print("🚀 KAFKA CONSUMER DEMO - ENERGY TRADING PLATFORM")
        print("="*80)
        print("📊 Listening for real-time Kafka messages...")
        print("💡 Go to your web app and place bids to see messages!")
        print("🛑 Press Ctrl+C to stop")
        print("="*80 + "\n")
        
        try:
            for message in self.consumer:
                topic = message.topic
                data = message.value
                timestamp = datetime.now().strftime("%H:%M:%S")
                
                print(f"\n⏰ [{timestamp}] 📨 Message from topic: {topic}")
                
                if 'bids' in topic:
                    print(self.format_bid_message(data))
                elif 'trades' in topic:
                    print(self.format_trade_message(data))
                elif 'prices' in topic:
                    print(self.format_price_message(data))
                elif 'portfolio' in topic:
                    print(self.format_portfolio_message(data))
                elif 'alerts' in topic:
                    print(self.format_alert_message(data))
                else:
                    print(f"📄 Raw message: {json.dumps(data, indent=2)}")
                
                print(f"\n{'='*60}")
                
        except KeyboardInterrupt:
            print("\n🛑 Stopping Kafka consumer...")
            self.consumer.close()
            print("👋 Goodbye!")

if __name__ == "__main__":
    consumer = EnergyTradingKafkaConsumer()
    consumer.start_consuming()
