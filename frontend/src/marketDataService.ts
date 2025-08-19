import { useState, useEffect } from 'react'

interface MarketData {
  currentPrice: number
  change24h: number
  high24h: number
  low24h: number
  timestamp: string
  gridOperator: string
  region: string
  marketStatus: string
  lastUpdated: string
  renewablePercentage: number
  demand: number
  supply: number
  dataSource?: string
}

class MarketDataService {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private cacheDuration = 5 * 60 * 1000 // 5 minutes
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  async getMarketData(): Promise<MarketData> {
    const cacheKey = 'market_data'
    const now = Date.now()
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      if (now - cached.timestamp < this.cacheDuration) {
        console.log('📋 Using cached market data')
        return cached.data
      }
    }

    try {
      console.log('🔌 Fetching market data from backend...')
      const response = await fetch(`${this.baseUrl}/api/market-data/real-time`, {
        headers: {
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Backend API failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Cache the result
      this.cache.set(cacheKey, { data, timestamp: now })
      
      console.log(`✅ Successfully fetched data from backend (${data.dataSource})`)
      return data

    } catch (error) {
      console.log('❌ Backend API failed, using fallback simulation')
      return this.generateFallbackData()
    }
  }

  private generateFallbackData(): MarketData {
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const dayOfWeek = now.getDay()
    
    // Realistic California energy patterns
    const demandMultiplier = hour >= 17 && hour <= 19 ? 1.4 : 
                           hour >= 6 && hour <= 9 ? 1.2 : 
                           hour >= 12 && hour <= 15 ? 1.1 :
                           hour >= 2 && hour <= 5 ? 0.7 : 1.0
    
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.85 : 1.0
    const minuteVariation = 1 + (Math.sin(minute / 60 * Math.PI * 2) * 0.03)
    
    const baseDemand = 34000
    const currentDemand = baseDemand * demandMultiplier * weekendFactor * minuteVariation
    const currentPrice = 38 + demandMultiplier * 16 + Math.random() * 6
    
    return {
      currentPrice: Number(currentPrice.toFixed(2)),
      change24h: Number(((Math.random() - 0.5) * 4.0).toFixed(2)),
      high24h: Number((currentPrice * 1.15).toFixed(2)),
      low24h: Number((currentPrice * 0.85).toFixed(2)),
      timestamp: now.toISOString(),
      gridOperator: 'DEMO',
      region: 'California (Frontend Fallback)',
      marketStatus: 'open',
      lastUpdated: now.toLocaleTimeString(),
      renewablePercentage: Number((35 + Math.random() * 25).toFixed(1)),
      demand: Number(currentDemand.toFixed(0)),
      supply: Number((currentDemand * 1.12).toFixed(0)),
      dataSource: 'frontend_fallback'
    }
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService()

// Custom hook for market data
export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let interval: number

    const fetchData = async () => {
      try {
        const data = await marketDataService.getMarketData()
        setMarketData(data)
        setIsConnected(data.dataSource !== 'frontend_fallback')
      } catch (error) {
        console.error('Error fetching market data:', error)
        setIsConnected(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchData()

    // Set up polling interval (every 2 minutes for demo)
    interval = window.setInterval(fetchData, 2 * 60 * 1000)

    return () => {
      if (interval) window.clearInterval(interval)
    }
  }, [])

  return { marketData, isConnected, isLoading }
}
