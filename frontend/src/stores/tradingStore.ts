import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Portfolio, Bid, Position, Trade, DashboardSummary, PerformanceMetrics } from '../types/trading'

interface TradingStore {
  // Portfolio data
  portfolio: Portfolio | null
  dashboardSummary: DashboardSummary | null
  performanceMetrics: PerformanceMetrics | null
  
  // Trading data
  bids: Bid[]
  positions: Position[]
  trades: Trade[]
  
  // UI state
  selectedBid: Bid | null
  selectedPosition: Position | null
  
  // Loading states
  isLoadingPortfolio: boolean
  isLoadingDashboard: boolean
  isLoadingBids: boolean
  isLoadingPositions: boolean
  isLoadingTrades: boolean
  
  // Actions
  setPortfolio: (portfolio: Portfolio) => void
  setDashboardSummary: (summary: DashboardSummary) => void
  setPerformanceMetrics: (metrics: PerformanceMetrics) => void
  setBids: (bids: Bid[]) => void
  setPositions: (positions: Position[]) => void
  setTrades: (trades: Trade[]) => void
  addBid: (bid: Bid) => void
  updateBid: (bidId: number, updates: Partial<Bid>) => void
  removeBid: (bidId: number) => void
  setSelectedBid: (bid: Bid | null) => void
  setSelectedPosition: (position: Position | null) => void
  setLoadingState: (type: string, loading: boolean) => void
  updatePositionPnL: (positionId: number, currentPrice: number) => void
}

export const useTradingStore = create<TradingStore>()(
  devtools(
    (set) => ({
      // Initial state
      portfolio: null,
      dashboardSummary: null,
      performanceMetrics: null,
      bids: [],
      positions: [],
      trades: [],
      selectedBid: null,
      selectedPosition: null,
      isLoadingPortfolio: false,
      isLoadingDashboard: false,
      isLoadingBids: false,
      isLoadingPositions: false,
      isLoadingTrades: false,

      // Actions
      setPortfolio: (portfolio) =>
        set({ portfolio }, false, 'setPortfolio'),

      setDashboardSummary: (summary) =>
        set({ dashboardSummary: summary }, false, 'setDashboardSummary'),

      setPerformanceMetrics: (metrics) =>
        set({ performanceMetrics: metrics }, false, 'setPerformanceMetrics'),

      setBids: (bids) =>
        set({ bids }, false, 'setBids'),

      setPositions: (positions) =>
        set({ positions }, false, 'setPositions'),

      setTrades: (trades) =>
        set({ trades }, false, 'setTrades'),

      addBid: (bid) =>
        set(
          (state) => ({ bids: [bid, ...state.bids] }),
          false,
          'addBid'
        ),

      updateBid: (bidId, updates) =>
        set(
          (state) => ({
            bids: state.bids.map((bid) =>
              bid.id === bidId ? { ...bid, ...updates } : bid
            ),
          }),
          false,
          'updateBid'
        ),

      removeBid: (bidId) =>
        set(
          (state) => ({
            bids: state.bids.filter((bid) => bid.id !== bidId),
          }),
          false,
          'removeBid'
        ),

      setSelectedBid: (bid) =>
        set({ selectedBid: bid }, false, 'setSelectedBid'),

      setSelectedPosition: (position) =>
        set({ selectedPosition: position }, false, 'setSelectedPosition'),

      setLoadingState: (type, loading) =>
        set(
          { [`isLoading${type.charAt(0).toUpperCase() + type.slice(1)}`]: loading },
          false,
          `setLoading${type}`
        ),

      updatePositionPnL: (positionId, currentPrice) =>
        set(
          (state) => ({
            positions: state.positions.map((position) => {
              if (position.id === positionId) {
                const pnl = position.quantity > 0 
                  ? (currentPrice - position.entry_price) * Math.abs(position.quantity)
                  : (position.entry_price - currentPrice) * Math.abs(position.quantity)
                
                return {
                  ...position,
                  current_price: currentPrice,
                  unrealized_pnl: pnl,
                }
              }
              return position
            }),
          }),
          false,
          'updatePositionPnL'
        ),
    }),
    {
      name: 'trading-store',
    }
  )
)
