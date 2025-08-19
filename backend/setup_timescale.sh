#!/bin/bash

# TimescaleDB Setup Script for Virtual Energy Trading Platform
# This script sets up a local TimescaleDB instance for development

echo "🚀 Setting up TimescaleDB for Virtual Energy Trading Platform"
echo "============================================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL first:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "   Or visit: https://www.postgresql.org/download/"
    exit 1
fi

# Check if TimescaleDB extension is available
echo "🔍 Checking for TimescaleDB extension..."

# Start PostgreSQL service if not running
if ! pgrep -x "postgres" > /dev/null; then
    echo "📡 Starting PostgreSQL service..."
    if command -v brew &> /dev/null; then
        # macOS with Homebrew
        brew services start postgresql
    else
        # Linux
        sudo service postgresql start
    fi
    sleep 2
fi

# Create database
echo "📊 Creating energy_trading database..."
createdb energy_trading 2>/dev/null || echo "Database may already exist"

# Create TimescaleDB extension
echo "⚡ Installing TimescaleDB extension..."
psql -d energy_trading -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || {
    echo "❌ TimescaleDB extension not available. Installing TimescaleDB:"
    echo "   Visit: https://docs.timescale.com/install/latest/"
    echo "   macOS: Add TimescaleDB tap and install"
    echo "   Ubuntu: Follow TimescaleDB installation guide"
    echo ""
    echo "🔄 For now, you can run without TimescaleDB (basic mode)"
    exit 1
}

# Test connection
echo "🔌 Testing database connection..."
psql -d energy_trading -c "SELECT version();" > /dev/null && {
    echo "✅ Database connection successful!"
    
    # Show TimescaleDB version
    psql -d energy_trading -c "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb';"
    
    echo ""
    echo "🎉 TimescaleDB setup complete!"
    echo "📝 Database URL: postgresql://postgres@localhost:5432/energy_trading"
    echo "🚀 You can now start the backend server: python3 enhanced_main.py"
    echo ""
    echo "🔧 Optional: Set custom database URL with environment variable:"
    echo "   export TIMESCALE_URL='postgresql://username:password@localhost:5432/energy_trading'"
} || {
    echo "❌ Database connection failed. Please check PostgreSQL installation."
    exit 1
}
