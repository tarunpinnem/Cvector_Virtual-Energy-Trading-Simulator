import { useState, useEffect } from 'react'
import { 
  IconThunderbolt, 
  IconSettings,
  IconSafe, 
  IconUp,
  IconDown
} from '@arco-design/web-react/icon'
// @ts-ignore - JSX components without TypeScript declarations
import BidSuggestions from './BidSuggestions'
// @ts-ignore - JSX components without TypeScript declarations
import Analytics from './Analytics'

interface DayAheadBid {
  id: string
  hour: number
  action: 'buy' | 'sell'
  price: number
  quantity: number
  status: 'pending' | 'executed' | 'rejected'
  submittedAt: string
}

interface Position {
  id: string
  hour: number
  quantity: number
  dayAheadPrice: number
  realTimeSettlement: number[]
  pnl: number
  timestamp: string
}

function App() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isConnected, setIsConnected] = useState(false)
  const [activeTab, setActiveTab] = useState('trading') // 'trading', 'suggestions', 'analytics'
  const [currentTheme] = useState<'professional' | 'dark' | 'neon' | 'minimal'>('professional')
  const [isAnimated, setIsAnimated] = useState(true)
  const [tradingPersonality, setTradingPersonality] = useState<'conservative' | 'balanced' | 'aggressive' | 'scalper'>('balanced')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Enhanced Theme System (matching Analytics.jsx)
  // Enterprise Theme System
  const themes = {
    professional: {
      primary: '#2563eb',      // Enterprise blue
      success: '#16a34a',      // Success green  
      warning: '#ea580c',      // Warning orange
      error: '#dc2626',        // Danger red
      info: '#0891b2',         // Info teal
      background: '#f8fafc',   // Light gray background
      cardBg: '#ffffff',       // White cards
      textPrimary: '#1e293b',  // Dark slate
      textSecondary: '#64748b', // Medium slate
      border: '#e2e8f0'        // Light border
    },
    dark: {
      primary: '#3b82f6',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      background: '#0f172a',
      cardBg: '#1e293b',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155'
    },
    neon: {
      primary: '#6366f1',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#f43f5e',
      info: '#14b8a6',
      background: '#0c0a09',
      cardBg: '#1c1917',
      textPrimary: '#fafaf9',
      textSecondary: '#a8a29e',
      border: '#44403c'
    },
    minimal: {
      primary: '#374151',
      success: '#059669',
      warning: '#d97706',
      error: '#b91c1c',
      info: '#0284c7',
      background: '#ffffff',
      cardBg: '#f9fafb',
      textPrimary: '#111827',
      textSecondary: '#6b7280',
      border: '#d1d5db'
    }
  }

  const currentThemeConfig = themes[currentTheme]

  // Trading Personality Modes with Enterprise Styling
  const tradingPersonalities = {
    conservative: {
      name: 'Conservative',
      icon: <IconSafe style={{ fontSize: '8px' }} />,
      color: currentThemeConfig.info,
      description: 'Risk-averse, stable returns',
      priceAdjustment: 0.95,
      quantityMultiplier: 0.7
    },
    balanced: {
      name: 'Balanced',
      icon: <IconSettings style={{ fontSize: '8px' }} />,
      color: currentThemeConfig.primary,
      description: 'Moderate risk, steady growth',
      priceAdjustment: 1.0,
      quantityMultiplier: 1.0
    },
    aggressive: {
      name: 'Aggressive',
      icon: <IconThunderbolt style={{ fontSize: '8px' }} />,
      color: currentThemeConfig.warning,
      description: 'High risk, high reward',
      priceAdjustment: 1.05,
      quantityMultiplier: 1.3
    },
    scalper: {
      name: 'Scalper',
      icon: <IconUp style={{ fontSize: '8px' }} />,
      color: currentThemeConfig.error,
      description: 'Quick profits, high frequency',
      priceAdjustment: 1.02,
      quantityMultiplier: 0.8
    }
  }

  const currentPersonality = tradingPersonalities[tradingPersonality]
  
  const [marketData, setMarketData] = useState({
    currentPrice: 45.67,
    change24h: 2.34,
    high24h: 48.21,
    low24h: 43.15,
    timestamp: new Date().toISOString(),
    gridOperator: 'CAISO',
    region: 'California',
    marketStatus: 'open',
    lastUpdated: new Date().toLocaleTimeString(),
    renewablePercentage: 42.5,
    demand: 35420,
    supply: 37250
  })

  const [portfolio, setPortfolio] = useState({
    cashBalance: 10000,
    positions: [] as Position[]
  })

  const [dayAheadBids, setDayAheadBids] = useState<DayAheadBid[]>([])
  
  const [bidForm, setBidForm] = useState({
    hour: new Date().getHours(),
    action: 'buy' as 'buy' | 'sell',
    price: marketData.currentPrice,
    quantity: 100
  })

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Click outside handler for settings dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSettingsOpen && !(event.target as Element)?.closest('[data-settings-dropdown]')) {
        setIsSettingsOpen(false)
      }
    }

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSettingsOpen])

  // Helper function to save bids to backend
  const saveBidsToBackend = async (bids: DayAheadBid[]) => {
    try {
      console.log('💾 Saving bids to backend:', bids)
      const response = await fetch('http://localhost:8000/api/portfolio/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bids || []),
      })
      if (response.ok) {
        console.log('✅ Bids saved to backend successfully')
      } else {
        console.log('❌ Backend error:', response.status, response.statusText)
      }
    } catch (error) {
      console.log('❌ Backend not available, using localStorage only:', error)
    }
  }

  // Helper function to save portfolio to backend
  const savePortfolioToBackend = async (portfolioData: any) => {
    try {
      await fetch('http://localhost:8000/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioData),
      })
    } catch (error) {
      console.log('Backend not available, using localStorage only')
    }
  }

  // Load persisted data on component mount
  useEffect(() => {
    const loadPersistedData = async () => {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      
      try {
        // Load portfolio data (bids + positions + cash balance)
        const portfolioResponse = await fetch(`${backendUrl}/api/portfolio?user_id=default_user`)
        if (portfolioResponse.ok) {
          const portfolioData = await portfolioResponse.json()
          
          setPortfolio({
            cashBalance: portfolioData.cashBalance || 10000,
            positions: portfolioData.positions || []
          })
          
          setDayAheadBids(portfolioData.dayAheadBids)
          
          console.log('✅ Loaded persisted trading data from backend')
        } else {
          // Fallback to localStorage if backend fails
          const savedPortfolio = localStorage.getItem('energyPortfolio')
          const savedBids = localStorage.getItem('dayAheadBids')
          
          if (savedPortfolio) {
            setPortfolio(JSON.parse(savedPortfolio))
          }
          if (savedBids) {
            setDayAheadBids(JSON.parse(savedBids))
          }
          
          console.log('📋 Loaded trading data from localStorage (backend unavailable)')
        }
      } catch (error) {
        console.log('❌ Failed to load persisted data:', error)
        
        // Fallback to localStorage
        const savedPortfolio = localStorage.getItem('energyPortfolio')
        const savedBids = localStorage.getItem('dayAheadBids')
        
        if (savedPortfolio) {
          setPortfolio(JSON.parse(savedPortfolio))
        }
        if (savedBids) {
          setDayAheadBids(JSON.parse(savedBids))
        }
      }
    }
    
    loadPersistedData()
  }, [])

  // Helper function to check if bidding is allowed
  const isBiddingAllowed = () => {
    const hour = new Date().getHours()
    return hour < 11 // Bidding closes at 11 AM
  }

  // Submit a day-ahead bid
  const submitBid = async () => {
    if (!isBiddingAllowed()) {
      alert('Bidding window is closed. Day-ahead bids must be submitted before 11:00 AM.')
      return
    }

    if ((dayAheadBids || []).length >= 10) {
      alert('Maximum 10 bids per day allowed.')
      return
    }

    const totalCost = bidForm.price * bidForm.quantity
    if (bidForm.action === 'buy' && totalCost > (portfolio.cashBalance || 10000)) {
      alert('Insufficient cash balance.')
      return
    }

    const newBid: DayAheadBid = {
      id: `bid_${Date.now()}`,
      ...bidForm,
      status: 'pending',
      submittedAt: new Date().toISOString()
    }

    // Persist bid to backend
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    try {
      const response = await fetch(`${backendUrl}/api/portfolio/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bidForm,
          userId: 'default_user'
        })
      })

      if (response.ok) {
        const result = await response.json()
        // Use the bid ID from backend
        newBid.id = result.bid.id
        console.log('✅ Bid persisted to backend')
      } else {
        console.log('⚠️ Backend persistence failed, using local storage fallback')
      }
    } catch (error) {
      console.log('❌ Backend unavailable, using local storage fallback')
    }

    setDayAheadBids(prev => [...(prev || []), newBid])

    // Also save to localStorage as backup
    localStorage.setItem('dayAheadBids', JSON.stringify([...(dayAheadBids || []), newBid]))

    // Simulate realistic bid execution based on market conditions
    setTimeout(async () => {
      // Calculate execution probability based on bid price vs market price
      const currentPrice = marketData.currentPrice
      const bidPrice = bidForm.price
      const priceRatio = bidForm.action === 'buy' 
        ? bidPrice / currentPrice  // Buy bids: higher price = more likely to execute
        : currentPrice / bidPrice  // Sell bids: lower price = more likely to execute
      
      // Execution probability: 50% base + 40% based on price competitiveness
      let executionChance = 0.5 + (Math.min(priceRatio, 1.5) - 1) * 0.8
      executionChance = Math.max(0.1, Math.min(0.95, executionChance)) // Keep between 10% and 95%
      
      console.log(`🎯 Bid execution chance: ${(executionChance * 100).toFixed(1)}% (Price: $${bidPrice} vs Market: $${currentPrice})`)
      
      const isExecuted = Math.random() < executionChance
      const newStatus = isExecuted ? 'executed' : 'rejected'
      
      // Update bid status in backend
      try {
        const response = await fetch(`${backendUrl}/api/portfolio/bids/${newBid.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
            executedAt: isExecuted ? new Date().toISOString() : undefined
          })
        })

        if (response.ok) {
          console.log(`✅ Bid status updated in backend: ${newStatus}`)
        }
      } catch (error) {
        console.log('❌ Failed to update bid status in backend')
      }
      
      // Update local state
      setDayAheadBids(prev => 
        (prev || []).map(bid => 
          bid.id === newBid.id 
            ? { ...bid, status: newStatus as 'executed' | 'rejected' }
            : bid
        )
      )

      if (isExecuted) {
        // Add position to portfolio
        const newPosition: Position = {
          id: `pos_${Date.now()}`,
          hour: bidForm.hour,
          quantity: bidForm.action === 'buy' ? bidForm.quantity : -bidForm.quantity,
          dayAheadPrice: bidForm.price,
          realTimeSettlement: [],
          pnl: 0,
          timestamp: new Date().toISOString()
        }

        // Persist position to backend
        try {
          const positionResponse = await fetch(`${backendUrl}/api/portfolio/positions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              hour: bidForm.hour,
              quantity: newPosition.quantity,
              dayAheadPrice: bidForm.price,
              userId: 'default_user'
            })
          })

          if (positionResponse.ok) {
            const result = await positionResponse.json()
            newPosition.id = result.position.id
            console.log('✅ Position persisted to backend')
          }
        } catch (error) {
          console.log('❌ Failed to persist position to backend')
        }

        setPortfolio(prev => ({
          cashBalance: bidForm.action === 'buy' 
            ? (prev?.cashBalance || 10000) - totalCost 
            : (prev?.cashBalance || 10000) + totalCost,
          positions: [...(prev?.positions || []), newPosition]
        }))
        
        console.log(`✅ Bid EXECUTED: ${bidForm.action.toUpperCase()} ${bidForm.quantity} MWh @ $${bidForm.price}`)
      } else {
        console.log(`❌ Bid REJECTED: Price not competitive enough`)
      }
      
      // Update localStorage backup
      localStorage.setItem('dayAheadBids', JSON.stringify(dayAheadBids || []))
    }, 3000) // Increased to 3 seconds for more realistic timing

    // Reset form
    setBidForm(prev => ({
      ...prev,
      hour: (prev.hour + 1) % 24
    }))
  }

  // Handle suggestion application
  const handleApplySuggestion = (suggestion: any) => {
    setBidForm({
      hour: suggestion.hour,
      action: suggestion.action,
      price: suggestion.priceTarget,
      quantity: suggestion.volume
    })
    setActiveTab('trading')
  }

  // Force execute pending bids (for testing)
  const forceExecutePendingBids = () => {
    const pendingBids = (dayAheadBids || []).filter(bid => bid.status === 'pending')
    
    pendingBids.forEach(bid => {
      const totalCost = bid.price * bid.quantity
      
      // Execute the bid
      setDayAheadBids(prev => 
        (prev || []).map(b => 
          b.id === bid.id 
            ? { ...b, status: 'executed' as const }
            : b
        )
      )

      // Add position to portfolio
      const newPosition: Position = {
        id: `pos_${Date.now()}_${bid.id}`,
        hour: bid.hour,
        quantity: bid.action === 'buy' ? bid.quantity : -bid.quantity,
        dayAheadPrice: bid.price,
        realTimeSettlement: [],
        pnl: 0,
        timestamp: new Date().toISOString()
      }

      setPortfolio(prev => ({
        cashBalance: bid.action === 'buy' 
          ? (prev?.cashBalance || 10000) - totalCost 
          : (prev?.cashBalance || 10000) + totalCost,
        positions: [...(prev?.positions || []), newPosition]
      }))
    })
    
    if (pendingBids.length > 0) {
      console.log(`🚀 Force executed ${pendingBids.length} pending bids`)
    }
  }

  // Simulate real-time settlement every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setPortfolio(prev => ({
        ...prev,
        positions: (prev?.positions || []).map(position => {
          // More realistic real-time price variation (±15% around current market)
          const priceVariation = 0.85 + Math.random() * 0.3 // Range: 85% to 115% of market
          const realTimePrice = marketData.currentPrice * priceVariation
          const newSettlement = [...(position.realTimeSettlement || []), realTimePrice]
          const avgSettlement = newSettlement.reduce((a, b) => a + b, 0) / (newSettlement.length || 1)
          
          // Calculate P&L: positive for profitable positions
          // For LONG positions: profit when real-time > day-ahead
          // For SHORT positions: profit when day-ahead > real-time  
          const pnl = position.quantity * (avgSettlement - position.dayAheadPrice)

          return {
            ...position,
            realTimeSettlement: newSettlement.slice(-12), // Keep last 12 settlements (1 hour)
            pnl
          }
        })
      }))
    }, 5000) // Every 5 seconds for demo

    return () => clearInterval(interval)
  }, [marketData.currentPrice])

  // Fetch market data from backend API with caching
  useEffect(() => {
    let lastApiCall = 0
    let cachedData: any = null
    let cacheTimestamp = 0
    const MIN_API_INTERVAL = 2 * 60 * 1000 // 2 minutes between calls
    const CACHE_DURATION = 1 * 60 * 1000 // Cache for 1 minute
    
    const fetchMarketDataFromBackend = async () => {
      try {
        // Check cache first
        const now = Date.now()
        if (cachedData && (now - cacheTimestamp < CACHE_DURATION)) {
          console.log('📋 Using cached frontend data')
          return
        }
        
        // Rate limiting check
        if (now - lastApiCall < MIN_API_INTERVAL) {
          console.log('⏰ Respecting rate limits - skipping call')
          return
        }
        
        lastApiCall = now
        console.log('🔌 Fetching market data from backend...')
        
        // Call our backend API instead of direct external APIs
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/api/market-data/real-time`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Received backend data:', data)
          
          // Check if API data is available
          if (data.data && data.data.error === "API_UNAVAILABLE") {
            console.log('⚠️ GridStatus.io API unavailable, showing unavailable status')
            setMarketData(prev => ({
              ...prev,
              currentPrice: 0,
              change24h: 0,
              high24h: 0,
              low24h: 0,
              gridOperator: data.data.gridOperator || 'API UNAVAILABLE',
              region: data.data.region || 'GridStatus.io Unavailable',
              demand: 0,
              supply: 0,
              renewablePercentage: 0,
              lastUpdated: new Date().toLocaleTimeString(),
              marketStatus: 'api_unavailable'
            }))
            setIsConnected(false)
            return
          }
          
          // Process real API data
          const apiData = data.data || data
          setMarketData(prev => ({
            ...prev,
            currentPrice: apiData.currentPrice || apiData.current_price || 0,
            change24h: apiData.change24h || apiData.change_24h || 0,
            high24h: apiData.high24h || apiData.high_24h || 0,
            low24h: apiData.low24h || apiData.low_24h || 0,
            gridOperator: apiData.gridOperator || 'UNKNOWN',
            region: apiData.region || 'Unknown',
            demand: apiData.demand || 0,
            supply: apiData.supply || (apiData.demand ? apiData.demand * 1.1 : 0),
            renewablePercentage: apiData.renewablePercentage || 0,
            lastUpdated: new Date().toLocaleTimeString(),
            marketStatus: 'open'
          }))
          
          cachedData = apiData
          cacheTimestamp = now
          setIsConnected(apiData.api_status === 'connected')
          console.log(`✅ Successfully fetched from backend (${apiData.data_source})`)
          return
        } else {
          throw new Error(`Backend API failed: ${response.status}`)
        }
        
      } catch (error) {
        console.log('❌ Backend API failed, using frontend simulation')
        updateSimulatedData()
        setIsConnected(false)
      }
    }

    const updateSimulatedData = () => {
      const hour = new Date().getHours()
      const minute = new Date().getMinutes()
      const dayOfWeek = new Date().getDay()
      
      // Realistic California energy patterns
      const demandMultiplier = hour >= 17 && hour <= 19 ? 1.4 : 
                             hour >= 6 && hour <= 9 ? 1.2 : 
                             hour >= 12 && hour <= 15 ? 1.1 :
                             hour >= 2 && hour <= 5 ? 0.7 : 1.0
      
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.85 : 1.0
      const minuteVariation = 1 + (Math.sin(minute / 60 * Math.PI * 2) * 0.03)
      
      const baseDemand = 34000
      const currentDemand = baseDemand * demandMultiplier * weekendFactor * minuteVariation
      
      setMarketData(prev => ({
        ...prev,
        currentPrice: Number((38 + demandMultiplier * 16 + Math.random() * 6).toFixed(2)),
        change24h: Number(((Math.random() - 0.5) * 4.0).toFixed(2)),
        gridOperator: 'DEMO',
        region: 'California (Frontend Simulation)',
        demand: Number(currentDemand.toFixed(0)),
        supply: Number((currentDemand * 1.12).toFixed(0)),
        renewablePercentage: Number((35 + Math.random() * 25).toFixed(1)),
        lastUpdated: new Date().toLocaleTimeString()
      }))
    }

    // Initial fetch
    fetchMarketDataFromBackend()
    
    // Set up intervals
    const backendInterval = setInterval(fetchMarketDataFromBackend, 2 * 60 * 1000) // Try backend every 2 minutes
    const simulationInterval = setInterval(() => {
      if (!isConnected) {
        updateSimulatedData()
      }
    }, 30 * 1000) // Update simulation every 30 seconds when disconnected
    
    return () => {
      clearInterval(backendInterval)
      clearInterval(simulationInterval)
    }
  }, [isConnected])

  // Save portfolio to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('energyPortfolio', JSON.stringify(portfolio))
    // Also save to backend if available
    savePortfolioToBackend(portfolio)
  }, [portfolio])

  // Save bids to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dayAheadBids', JSON.stringify(dayAheadBids || []))
    // Also save to backend if available
    if (dayAheadBids) {
      saveBidsToBackend(dayAheadBids)
    }
  }, [dayAheadBids])

  return (
    <div style={{ 
      padding: '12px', 
      fontFamily: "'Segoe UI', 'Roboto', sans-serif",
      backgroundColor: currentThemeConfig.background,
      minHeight: '100vh',
      maxWidth: '1400px',
      margin: '0 auto',
      transition: 'all 0.3s ease'
    }}>
      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(25px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        @keyframes priceFlicker {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.02); opacity: 0.9; text-shadow: 0 0 15px currentColor; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 8px currentColor; }
          50% { box-shadow: 0 0 25px currentColor; }
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .card-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        }
        
        .theme-selector {
          display: flex;
          gap: 8px;
          padding: 4px;
          background: ${currentThemeConfig.cardBg};
          border-radius: 20px;
          border: 1px solid ${currentThemeConfig.primary}30;
        }
        
        .theme-button {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .theme-button:hover {
          transform: scale(1.3);
          border-color: ${currentThemeConfig.textPrimary};
        }
        
        .personality-badge {
          padding: 8px 16px;
          border-radius: 20px;
          border: 2px solid;
          background: ${currentThemeConfig.cardBg};
          color: ${currentPersonality.color};
          border-color: ${currentPersonality.color};
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: bold;
          font-size: 12px;
        }
        
        .personality-badge:hover {
          background: ${currentPersonality.color};
          color: white;
          transform: scale(1.05);
        }
      `}</style>

      {/* Enhanced Header with Theme Controls */}
      {/* Professional Header */}
      <div style={{ 
        background: currentThemeConfig.cardBg,
        padding: '20px 32px',
        borderRadius: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        marginBottom: '32px',
        border: `1px solid ${currentThemeConfig.border}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Left: Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ 
              color: currentThemeConfig.textPrimary, 
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              letterSpacing: '-0.025em'
            }}>
              Virtual Energy Trading Platform
            </h1>
            <div style={{
              padding: '4px 12px',
              background: currentThemeConfig.primary,
              color: 'white',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.025em'
            }}>
              ENERGY
            </div>
          </div>

          {/* Right: Status + Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Current Time */}
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: currentThemeConfig.textSecondary,
              fontWeight: '500'
            }}>
              <span>Current Time:</span>
              <span style={{ 
                color: currentThemeConfig.textPrimary, 
                fontWeight: '600'
              }}>
                {currentTime.toLocaleTimeString()}
              </span>
            </div>

            {/* Status Pills */}
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <div style={{ 
                padding: '6px 12px', 
                borderRadius: '20px', 
                backgroundColor: isConnected ? '#10b981' : '#ef4444',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'white'
                }}></div>
                {isConnected ? 'Live Data' : 'Simulated'}
              </div>
              
              <div style={{ 
                padding: '6px 12px', 
                borderRadius: '20px', 
                backgroundColor: isBiddingAllowed() ? '#2563eb' : '#6b7280',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'white'
                }}></div>
                {isBiddingAllowed() ? 'Bidding Open' : 'Bidding Closed'}
              </div>
            </div>

            {/* Settings Dropdown */}
            <div style={{ position: 'relative' }} data-settings-dropdown>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                style={{
                  padding: '8px',
                  border: `1px solid ${currentThemeConfig.border}`,
                  backgroundColor: isSettingsOpen ? `${currentThemeConfig.primary}10` : currentThemeConfig.cardBg,
                  color: currentThemeConfig.textPrimary,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <IconSettings style={{ fontSize: '10px' }} />
              </button>

              {isSettingsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '8px',
                  background: currentThemeConfig.cardBg,
                  border: `1px solid ${currentThemeConfig.border}`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  padding: '16px',
                  minWidth: '280px',
                  zIndex: 1000
                }}>
                  {/* Animation Toggle */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: currentThemeConfig.textSecondary,
                      marginBottom: '8px',
                      display: 'block'
                    }}>
                      Animation
                    </label>
                    <button
                      onClick={() => setIsAnimated(!isAnimated)}
                      style={{
                        width: '100%',
                        padding: '8px 16px',
                        border: `1px solid ${currentThemeConfig.border}`,
                        backgroundColor: isAnimated ? currentThemeConfig.primary : currentThemeConfig.cardBg,
                        color: isAnimated ? 'white' : currentThemeConfig.textPrimary,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      {isAnimated ? 'Animated' : 'Static'}
                    </button>
                  </div>

                  {/* Trading Mode */}
                  <div>
                    <label style={{ 
                      fontSize: '14px', 
                      fontWeight: '500',
                      color: currentThemeConfig.textSecondary,
                      marginBottom: '8px',
                      display: 'block'
                    }}>
                      Trading Mode
                    </label>
                    <select
                      value={tradingPersonality}
                      onChange={(e) => setTradingPersonality(e.target.value as 'conservative' | 'balanced' | 'aggressive' | 'scalper')}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: `1px solid ${currentThemeConfig.border}`,
                        backgroundColor: currentThemeConfig.cardBg,
                        color: currentThemeConfig.textPrimary,
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      {Object.entries(tradingPersonalities).map(([key, personality]) => (
                        <option key={key} value={key}>
                          {personality.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Professional Navigation */}
      <div style={{
        background: currentThemeConfig.cardBg,
        borderRadius: '8px',
        padding: '4px',
        marginBottom: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
        border: `1px solid ${currentThemeConfig.border}`,
        display: 'flex',
        gap: '1px'
      }}>
        {[
          { 
            key: 'trading', 
            label: 'Trading', 
            icon: <IconThunderbolt style={{ fontSize: '32px', width: '32px', height: '32px' }} />
          },
          { 
            key: 'suggestions', 
            label: 'Market Insights', 
            icon: <IconUp style={{ fontSize: '32px', width: '32px', height: '32px' }} />
          },
          { 
            key: 'analytics', 
            label: 'Analytics', 
            icon: <IconSettings style={{ fontSize: '32px', width: '32px', height: '32px' }} />
          }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '6px 12px',
              background: activeTab === tab.key ? currentThemeConfig.primary : 'transparent',
              color: activeTab === tab.key ? 'white' : currentThemeConfig.textSecondary,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.background = `${currentThemeConfig.primary}08`;
                e.currentTarget.style.color = currentThemeConfig.textPrimary;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = currentThemeConfig.textSecondary;
              }
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'trading' && (
        <div>
          {/* Enhanced Market Overview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px',
            marginBottom: '12px'
          }}>
          {/* Enhanced Market Data Card */}
          <div className="card-hover" style={{
            background: currentThemeConfig.cardBg,
            padding: '12px',
            borderRadius: '6px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            border: `1px solid ${currentThemeConfig.primary}20`,
            position: 'relative',
            overflow: 'hidden',
            animation: isAnimated ? 'slideInUp 0.6s ease 0.1s' : 'none',
            animationFillMode: 'both'
          }}>
            {/* Animated Header Gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: `linear-gradient(90deg, ${currentThemeConfig.primary}, ${currentThemeConfig.success}, ${currentThemeConfig.info})`,
              animation: isAnimated ? 'shimmer 3s infinite' : 'none'
            }}></div>
            
            {/* Professional Status Indicator */}
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              fontSize: '9px',
              opacity: 0.6,
              animation: isAnimated ? 'float 4s ease-in-out infinite' : 'none',
              color: currentThemeConfig.primary,
              fontWeight: 'bold'
            }}>
              LIVE
            </div>

            <h3 style={{ 
              margin: '0 0 6px 0',
              color: currentThemeConfig.textPrimary,
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {marketData.marketStatus === 'api_unavailable' ? 'GridStatus.io API Unavailable' : 
               isConnected ? 'Live Market Data (GridStatus.io)' : 'GridStatus.io API Only Mode'}
              {marketData.marketStatus === 'api_unavailable' && (
                <span style={{ 
                  backgroundColor: currentThemeConfig.error, 
                  color: 'white', 
                  padding: '2px 4px', 
                  borderRadius: '6px', 
                  fontSize: '8px',
                  fontWeight: '600'
                }}>
                  API DOWN
                </span>
              )}
            </h3>

            {/* Main Price Display */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '6px',
              padding: '6px',
              background: `${currentThemeConfig.primary}08`,
              borderRadius: '4px',
              border: `1px solid ${currentThemeConfig.primary}20`
            }}>
              <div style={{ 
                fontSize: '22px', 
                fontWeight: 'bold',
                color: currentThemeConfig.primary,
                marginBottom: '2px',
                animation: isAnimated ? 'priceFlicker 3s infinite' : 'none',
                letterSpacing: '-0.02em'
              }}>
                {marketData.currentPrice > 0 ? `$${marketData.currentPrice}/MWh` : 'API Unavailable'}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600',
                color: (marketData.change24h || 0) >= 0 ? currentThemeConfig.success : currentThemeConfig.error,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                marginBottom: '6px'
              }}>
                {(marketData.change24h || 0) >= 0 ? <IconUp style={{ width: '64px', height: '64px' }} /> : <IconDown style={{ width: '64px', height: '64px' }} />}
                {(marketData.change24h || 0) >= 0 ? '+' : ''}{(marketData.change24h || 0).toFixed(2)}% (24h)
              </div>
              
              {/* Mini Sparkline Placeholder */}
              <div style={{
                height: '20px',
                background: `${currentThemeConfig.primary}15`,
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                color: currentThemeConfig.textSecondary,
                fontWeight: '500',
                border: `1px solid ${currentThemeConfig.primary}20`
              }}>
                📈 Live updates every 5 minutes
              </div>
            </div>

            {/* 2x2 Grid for Market Details */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '4px' 
            }}>
              <div style={{
                padding: '6px',
                background: currentThemeConfig.cardBg,
                borderRadius: '3px',
                border: `1px solid ${currentThemeConfig.border}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: currentThemeConfig.textSecondary, 
                  marginBottom: '3px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Demand
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: currentThemeConfig.info,
                  marginBottom: '1px'
                }}>
                  {marketData.demand > 0 ? marketData.demand.toLocaleString() : 'N/A'} MW
                </div>
                <div style={{
                  fontSize: '10px',
                  color: currentThemeConfig.textSecondary
                }}>
                  Current grid load
                </div>
              </div>

              <div style={{
                padding: '6px',
                background: currentThemeConfig.cardBg,
                borderRadius: '3px',
                border: `1px solid ${currentThemeConfig.border}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: currentThemeConfig.textSecondary, 
                  marginBottom: '3px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Renewable Energy
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: currentThemeConfig.success,
                  marginBottom: '1px'
                }}>
                  {(marketData.renewablePercentage > 0 ? marketData.renewablePercentage : 0).toFixed(1)}%
                </div>
                <div style={{
                  fontSize: '10px',
                  color: currentThemeConfig.textSecondary
                }}>
                  Clean energy mix
                </div>
              </div>

              <div style={{
                padding: '6px',
                background: currentThemeConfig.cardBg,
                borderRadius: '3px',
                border: `1px solid ${currentThemeConfig.border}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: currentThemeConfig.textSecondary, 
                  marginBottom: '3px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Region
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: currentThemeConfig.textPrimary,
                  marginBottom: '1px'
                }}>
                  {marketData.region}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: currentThemeConfig.textSecondary
                }}>
                  Market zone
                </div>
              </div>

              <div style={{
                padding: '6px',
                background: currentThemeConfig.cardBg,
                borderRadius: '3px',
                border: `1px solid ${currentThemeConfig.border}`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: currentThemeConfig.textSecondary, 
                  marginBottom: '3px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Grid Operator
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  color: currentThemeConfig.textPrimary,
                  marginBottom: '1px'
                }}>
                  {marketData.gridOperator}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: currentThemeConfig.textSecondary
                }}>
                  System operator
                </div>
              </div>
            </div>

            <div style={{ 
              fontSize: '11px', 
              color: currentThemeConfig.textSecondary, 
              marginTop: '6px',
              paddingTop: '4px',
              borderTop: `1px solid ${currentThemeConfig.primary}20`,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              Last updated: {marketData.lastUpdated}
            </div>
          </div>            <div style={{
              backgroundColor: currentThemeConfig.cardBg,
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              border: `1px solid ${currentThemeConfig.border}`
            }}>
              {/* Enterprise Portfolio Stats Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {/* Cash Balance Card */}
                <div style={{
                  background: currentThemeConfig.cardBg,
                  padding: '12px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  border: `1px solid ${currentThemeConfig.primary}20`,
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: currentThemeConfig.textSecondary,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    marginBottom: '6px'
                  }}>
                    Cash Balance
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: currentThemeConfig.primary,
                    marginBottom: '2px'
                  }}>
                    ${(portfolio.cashBalance || 10000).toLocaleString()}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: currentThemeConfig.textSecondary
                  }}>
                    Available
                  </div>
                </div>

                {/* Total P&L Card */}
                <div style={{
                  background: currentThemeConfig.cardBg,
                  padding: '12px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  border: `1px solid ${(portfolio.positions || []).reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? currentThemeConfig.success : currentThemeConfig.error}20`,
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: currentThemeConfig.textSecondary,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    marginBottom: '6px'
                  }}>
                    Total P&L
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: (portfolio.positions || []).reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? currentThemeConfig.success : currentThemeConfig.error,
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    {(portfolio.positions || []).reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? 
                      <IconUp style={{ fontSize: '12px' }} /> : 
                      <IconDown style={{ fontSize: '12px' }} />
                    }
                    ${Math.abs((portfolio.positions || []).reduce((sum, pos) => sum + pos.pnl, 0)).toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: currentThemeConfig.textSecondary
                  }}>
                    {(portfolio.positions || []).reduce((sum, pos) => sum + pos.pnl, 0) >= 0 ? 'Profit' : 'Loss'}
                  </div>
                </div>

                {/* Active Positions Card */}
                <div style={{
                  background: currentThemeConfig.cardBg,
                  padding: '12px',
                  borderRadius: '6px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  border: `1px solid ${currentThemeConfig.info}20`,
                  textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: currentThemeConfig.textSecondary,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    marginBottom: '6px'
                  }}>
                    Active Positions
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: currentThemeConfig.info,
                    marginBottom: '2px'
                  }}>
                    {portfolio.positions?.length || 0}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: currentThemeConfig.textSecondary
                  }}>
                    Contracts
                  </div>
                </div>
              </div>

              {/* Bid Status Summary */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                padding: '16px',
                backgroundColor: `${currentThemeConfig.primary}08`,
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: currentThemeConfig.textPrimary }}>
                    {dayAheadBids?.length || 0}/10
                  </div>
                  <div style={{ fontSize: '10px', color: currentThemeConfig.textSecondary, fontWeight: '500' }}>Total Bids</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: currentThemeConfig.success }}>
                    {(dayAheadBids || []).filter(bid => bid.status === 'executed').length}
                  </div>
                  <div style={{ fontSize: '10px', color: currentThemeConfig.textSecondary, fontWeight: '500' }}>Executed</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: currentThemeConfig.warning }}>
                    {(dayAheadBids || []).filter(bid => bid.status === 'pending').length}
                  </div>
                  <div style={{ fontSize: '10px', color: currentThemeConfig.textSecondary, fontWeight: '500' }}>Pending</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: currentThemeConfig.error }}>
                    {(dayAheadBids || []).filter(bid => bid.status === 'rejected').length}
                  </div>
                  <div style={{ fontSize: '10px', color: currentThemeConfig.textSecondary, fontWeight: '500' }}>Rejected</div>
                </div>
              </div>
            </div>
          </div>

          {/* Trading Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {/* Day-Ahead Bidding */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: `1px solid ${currentThemeConfig.border}`
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                color: currentThemeConfig.textPrimary,
                fontSize: '18px',
                fontWeight: '600'
              }}>
                Day-Ahead Market Bidding
              </h3>
              <p style={{ 
                fontSize: '14px', 
                color: currentThemeConfig.textSecondary, 
                margin: '0 0 20px 0' 
              }}>
                Submit bids before 11:00 AM for next-day delivery. Max 10 bids per day.
              </p>
              
              {!isBiddingAllowed() && (
                <div style={{
                  backgroundColor: `${currentThemeConfig.error}10`,
                  border: `1px solid ${currentThemeConfig.error}30`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <strong style={{ color: currentThemeConfig.error }}>Bidding Window Closed</strong><br />
                  <span style={{ color: currentThemeConfig.textSecondary, fontSize: '14px' }}>
                    Day-ahead bids must be submitted before 11:00 AM for next-day delivery.
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: currentThemeConfig.textPrimary
                  }}>
                    Delivery Hour:
                  </label>
                  <select 
                    value={bidForm.hour}
                    onChange={(e) => setBidForm(prev => ({ ...prev, hour: parseInt(e.target.value) }))}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      border: `1px solid ${currentThemeConfig.border}`,
                      backgroundColor: currentThemeConfig.cardBg,
                      color: currentThemeConfig.textPrimary,
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}:00 - {String(i + 1).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: currentThemeConfig.textPrimary
                  }}>
                    Action:
                  </label>
                  <select 
                    value={bidForm.action}
                    onChange={(e) => setBidForm(prev => ({ ...prev, action: e.target.value as 'buy' | 'sell' }))}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      border: `1px solid ${currentThemeConfig.border}`,
                      backgroundColor: currentThemeConfig.cardBg,
                      color: currentThemeConfig.textPrimary,
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <option value="buy">Buy (Long Position)</option>
                    <option value="sell">Sell (Short Position)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: currentThemeConfig.textPrimary
                  }}>
                    Price ($/MWh):
                  </label>
                  <input
                    type="number"
                    value={bidForm.price}
                    onChange={(e) => setBidForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    step="0.01"
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      border: `1px solid ${currentThemeConfig.border}`,
                      backgroundColor: currentThemeConfig.cardBg,
                      color: currentThemeConfig.textPrimary,
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontSize: '14px',
                    fontWeight: '600',
                    color: currentThemeConfig.textPrimary
                  }}>
                    Quantity (MWh):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setBidForm(prev => ({ ...prev, quantity: Math.max(10, prev.quantity - 10) }))}
                      style={{
                        padding: '10px 12px',
                        border: `1px solid ${currentThemeConfig.border}`,
                        backgroundColor: currentThemeConfig.cardBg,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={bidForm.quantity}
                      onChange={(e) => setBidForm(prev => ({ ...prev, quantity: Math.max(10, parseInt(e.target.value) || 10) }))}
                      min="10"
                      max="1000"
                      step="10"
                      style={{ 
                        flex: 1,
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        border: `1px solid ${currentThemeConfig.border}`,
                        backgroundColor: currentThemeConfig.cardBg,
                        color: currentThemeConfig.textPrimary,
                        fontSize: '14px',
                        textAlign: 'center',
                        fontWeight: '600'
                      }}
                    />
                    <button
                      onClick={() => setBidForm(prev => ({ ...prev, quantity: Math.min(1000, prev.quantity + 10) }))}
                      style={{
                        padding: '10px 12px',
                        border: `1px solid ${currentThemeConfig.border}`,
                        backgroundColor: currentThemeConfig.cardBg,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Preview Card */}
              <div style={{ 
                marginBottom: '20px', 
                padding: '16px', 
                backgroundColor: `${currentThemeConfig.primary}08`, 
                borderRadius: '12px',
                border: `1px solid ${currentThemeConfig.primary}20`
              }}>
                <div style={{ 
                  fontSize: '14px',
                  fontWeight: '600',
                  color: currentThemeConfig.textPrimary,
                  marginBottom: '12px'
                }}>
                  Order Preview
                </div>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  fontSize: '13px'
                }}>
                  <div>
                    <div style={{ color: currentThemeConfig.textSecondary, marginBottom: '2px' }}>Time</div>
                    <div style={{ fontWeight: '600', color: currentThemeConfig.textPrimary }}>
                      {String(bidForm.hour).padStart(2, '0')}:00
                    </div>
                  </div>
                  <div>
                    <div style={{ color: currentThemeConfig.textSecondary, marginBottom: '2px' }}>Action</div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: bidForm.action === 'buy' ? currentThemeConfig.success : currentThemeConfig.error 
                    }}>
                      {bidForm.action === 'buy' ? 'BUY' : 'SELL'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: currentThemeConfig.textSecondary, marginBottom: '2px' }}>Quantity</div>
                    <div style={{ fontWeight: '600', color: currentThemeConfig.textPrimary }}>
                      {bidForm.quantity} MWh
                    </div>
                  </div>
                  <div>
                    <div style={{ color: currentThemeConfig.textSecondary, marginBottom: '2px' }}>Total Value</div>
                    <div style={{ fontWeight: '600', color: currentThemeConfig.primary }}>
                      ${(bidForm.price * bidForm.quantity).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={submitBid}
                disabled={!isBiddingAllowed()}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: isBiddingAllowed() ? currentThemeConfig.primary : currentThemeConfig.border,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isBiddingAllowed() ? 'pointer' : 'not-allowed',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'all 0.2s ease'
                }}
              >
                {isBiddingAllowed() ? 'Submit Day-Ahead Bid' : 'Bidding Window Closed'}
              </button>
            </div>

            {/* Real-Time Market */}
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3>Real-Time Market</h3>
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 15px 0' }}>
                5-minute settlement intervals. Your day-ahead positions are settled against real-time prices.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <h4>Active Positions:</h4>
                {(portfolio.positions || []).length > 0 ? (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {portfolio.positions.map(position => (
                      <div key={position.id} style={{
                        padding: '10px',
                        margin: '5px 0',
                        backgroundColor: position.pnl >= 0 ? '#f6ffed' : '#fff2f0',
                        borderRadius: '6px',
                        border: `1px solid ${position.pnl >= 0 ? '#b7eb8f' : '#ffccc7'}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>
                            <strong>Hour {position.hour}:</strong> {position.quantity > 0 ? 'LONG' : 'SHORT'} {Math.abs(position.quantity)} MWh @ ${position.dayAheadPrice}
                          </span>
                          <span style={{ color: position.pnl >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 'bold' }}>
                            ${position.pnl.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Real-time settlements: {position.realTimeSettlement?.length || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
                    No active positions. Submit day-ahead bids to start trading.
                  </p>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0 }}>Recent Day-Ahead Bids:</h4>
                  {(dayAheadBids || []).filter(bid => bid.status === 'pending').length > 0 && (
                    <button
                      onClick={forceExecutePendingBids}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#fa8c16',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Force Execute ({(dayAheadBids || []).filter(bid => bid.status === 'pending').length})
                    </button>
                  )}
                </div>
                {(dayAheadBids || []).length > 0 ? (
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {dayAheadBids.slice(-5).map(bid => (
                      <div key={bid.id} style={{
                        padding: '8px',
                        margin: '3px 0',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px',
                        borderLeft: `4px solid ${
                          bid.status === 'executed' ? '#52c41a' : 
                          bid.status === 'rejected' ? '#ff4d4f' : '#fa8c16'
                        }`
                      }}>
                        <div style={{ fontSize: '12px' }}>
                          <strong>{bid.action.toUpperCase()}</strong> {bid.quantity} MWh @ ${bid.price} (Hour {bid.hour})
                          <span style={{ 
                            float: 'right', 
                            color: bid.status === 'executed' ? '#52c41a' : 
                                   bid.status === 'rejected' ? '#ff4d4f' : '#fa8c16',
                            fontWeight: 'bold'
                          }}>
                            {bid.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#999', textAlign: 'center', padding: '10px' }}>
                    No bids submitted yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Insights Tab */}
      {activeTab === 'suggestions' && (
        <BidSuggestions 
          marketData={marketData}
          portfolio={portfolio}
          dayAheadBids={dayAheadBids}
          bidForm={bidForm}
          onApplySuggestion={handleApplySuggestion}
        />
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <Analytics 
          marketData={marketData}
          portfolio={portfolio}
          dayAheadBids={dayAheadBids}
        />
      )}
    </div>
  )
}

export default App
