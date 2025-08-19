import type { WebSocketMessage, RealTimePriceUpdate, TradeUpdate, PortfolioUpdate, Notification } from '../types/websocket'

export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000
  private isConnecting = false
  private messageHandlers: Map<string, (data: any) => void> = new Map()

  constructor() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Connect to backend WebSocket on port 8000
    this.url = `${wsProtocol}//localhost:8000/ws`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        resolve()
        return
      }

      this.isConnecting = true

      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('📡 WebSocket disconnected:', event.code, event.reason)
          this.isConnecting = false
          this.scheduleReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error)
          this.isConnecting = false
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectInterval}ms`)
      
      setTimeout(() => {
        this.connect().catch(console.error)
      }, this.reconnectInterval)
      
      // Exponential backoff
      this.reconnectInterval = Math.min(this.reconnectInterval * 2, 30000)
    } else {
      console.error('❌ Max reconnection attempts reached')
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handler = this.messageHandlers.get(message.type)
    if (handler) {
      handler(message.data)
    } else {
      console.log('📨 Unhandled WebSocket message:', message.type, message.data)
    }
  }

  // Subscribe to specific message types
  onMarketData(callback: (data: RealTimePriceUpdate) => void): void {
    this.messageHandlers.set('market_data', callback)
  }

  onTradeUpdate(callback: (data: TradeUpdate) => void): void {
    this.messageHandlers.set('trade_update', callback)
  }

  onPortfolioUpdate(callback: (data: PortfolioUpdate) => void): void {
    this.messageHandlers.set('portfolio_update', callback)
  }

  onNotification(callback: (data: Notification) => void): void {
    this.messageHandlers.set('notification', callback)
  }

  // Remove message handler
  off(messageType: string): void {
    this.messageHandlers.delete(messageType)
  }

  // Send message to server
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', message)
    }
  }

  // Get connection status
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Create singleton instance
export const wsService = new WebSocketService()
