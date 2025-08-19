import api from './api'
import type { 
  Bid, 
  BidCreate, 
  BidUpdate, 
  BidValidation, 
  Position, 
  Trade 
} from '../types/trading'

export const tradingService = {
  // Bid operations
  async createBid(bidData: BidCreate): Promise<Bid> {
    const response = await api.post('/api/v1/trading/bids', bidData)
    return response.data
  },

  async getUserBids(status?: string): Promise<Bid[]> {
    const params = status ? { status } : {}
    const response = await api.get('/api/v1/trading/bids', { params })
    return response.data
  },

  async updateBid(bidId: number, bidUpdate: BidUpdate): Promise<Bid> {
    const response = await api.put(`/api/v1/trading/bids/${bidId}`, bidUpdate)
    return response.data
  },

  async cancelBid(bidId: number): Promise<Bid> {
    const response = await api.delete(`/api/v1/trading/bids/${bidId}`)
    return response.data
  },

  async validateBid(bidData: BidCreate): Promise<BidValidation> {
    const response = await api.post('/api/v1/trading/bids/validate', bidData)
    return response.data
  },

  // Position operations
  async getUserPositions(includeClosed: boolean = false): Promise<Position[]> {
    const response = await api.get('/api/v1/trading/positions', {
      params: { include_closed: includeClosed }
    })
    return response.data
  },

  // Trade operations
  async getUserTrades(limit: number = 50): Promise<Trade[]> {
    const response = await api.get('/api/v1/trading/trades', {
      params: { limit }
    })
    return response.data
  },

  // Market operations (for testing)
  async triggerMarketClearing(tradingDate: string, hourSlot: number): Promise<{ message: string }> {
    const response = await api.post(`/api/v1/trading/market/clear/${tradingDate}/${hourSlot}`)
    return response.data
  },

  async updateRealtimePositions(): Promise<{ message: string }> {
    const response = await api.post('/api/v1/trading/positions/update-realtime')
    return response.data
  }
}
