import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { MarketData, MarketSummary, PriceAnalytics } from '../types/market'

interface MarketStore {
  // Real-time data
  realTimeData: MarketData | null
  marketSummary: MarketSummary | null
  priceAnalytics: PriceAnalytics | null
  
  // Loading states
  isLoadingRealTime: boolean
  isLoadingSummary: boolean
  isLoadingAnalytics: boolean
  
  // Connection state
  isConnected: boolean
  lastUpdateTime: string | null
  
  // Actions
  setRealTimeData: (data: MarketData) => void
  setMarketSummary: (summary: MarketSummary) => void
  setPriceAnalytics: (analytics: PriceAnalytics) => void
  setLoadingState: (type: 'realTime' | 'summary' | 'analytics', loading: boolean) => void
  setConnected: (connected: boolean) => void
  updateLastUpdateTime: () => void
}

export const useMarketStore = create<MarketStore>()(
  devtools(
    (set) => ({
      // Initial state
      realTimeData: null,
      marketSummary: null,
      priceAnalytics: null,
      isLoadingRealTime: false,
      isLoadingSummary: false,
      isLoadingAnalytics: false,
      isConnected: false,
      lastUpdateTime: null,

      // Actions
      setRealTimeData: (data) =>
        set(
          () => ({
            realTimeData: data,
            lastUpdateTime: new Date().toISOString(),
          }),
          false,
          'setRealTimeData'
        ),

      setMarketSummary: (summary) =>
        set(
          { marketSummary: summary },
          false,
          'setMarketSummary'
        ),

      setPriceAnalytics: (analytics) =>
        set(
          { priceAnalytics: analytics },
          false,
          'setPriceAnalytics'
        ),

      setLoadingState: (type, loading) =>
        set(
          () => ({
            [`isLoading${type.charAt(0).toUpperCase() + type.slice(1)}`]: loading,
          }),
          false,
          `setLoading${type}`
        ),

      setConnected: (connected) =>
        set(
          { isConnected: connected },
          false,
          'setConnected'
        ),

      updateLastUpdateTime: () =>
        set(
          { lastUpdateTime: new Date().toISOString() },
          false,
          'updateLastUpdateTime'
        ),
    }),
    {
      name: 'market-store',
    }
  )
)
