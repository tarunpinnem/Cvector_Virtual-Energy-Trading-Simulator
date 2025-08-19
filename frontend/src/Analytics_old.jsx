import React, { useState, useMemo, useEffect } from 'react'

const Analytics = ({ marketData, portfolio, dayAheadBids }) => {
  const [hourlyPrices, setHourlyPrices] = useState([])
  const [priceHistory, setPriceHistory] = useState([])

  // Generate 24-hour price data
  const generate24HourPrices = () => {
    const basePrice = marketData?.currentPrice || 45.2
    const currentHour = new Date().getHours()
    const prices = []

    for (let hour = 0; hour < 24; hour++) {
      let priceMultiplier = 1.0
      
      // Peak hours pattern
      if ((hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22)) {
        priceMultiplier = 1.1 + Math.random() * 0.2
      } else if (hour >= 23 || hour <= 6) {
        priceMultiplier = 0.8 + Math.random() * 0.15
      } else {
        priceMultiplier = 0.9 + Math.random() * 0.2
      }

      prices.push({
        hour,
        price: basePrice * priceMultiplier,
        isPeak: (hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22),
        isCurrent: hour === currentHour
      })
    }
    
    setHourlyPrices(prices)
  }

  // Generate price history for trend visualization
  const generatePriceHistory = () => {
    const basePrice = marketData?.currentPrice || 45.2
    const history = []
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date()
      timestamp.setHours(timestamp.getHours() - i)
      
      const variation = (Math.random() - 0.5) * 8
      const price = Math.max(25, basePrice + variation)
      
      history.push({
        time: timestamp.getHours().toString().padStart(2, '0') + ':00',
        price: price,
        timestamp: timestamp
      })
    }
    
    setPriceHistory(history)
  }

  useEffect(() => {
    generate24HourPrices()
    generatePriceHistory()
    
    const interval = setInterval(() => {
      generate24HourPrices()
      generatePriceHistory()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [marketData])

  // Simple SVG Line Chart Component
  const LineChart = ({ data, width = 800, height = 300, dataKey, color = '#3b82f6', title }) => {
    if (!data || data.length === 0) return null

    const maxValue = Math.max(...data.map(d => d[dataKey]))
    const minValue = Math.min(...data.map(d => d[dataKey]))
    const range = maxValue - minValue || 1
    const padding = 40

    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * (width - 2 * padding) + padding
      const y = height - padding - ((item[dataKey] - minValue) / range) * (height - 2 * padding)
      return `${x},${y}`
    }).join(' ')

    return (
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>{title}</h3>
        <svg width={width} height={height} style={{ border: '1px solid #e5e7eb', borderRadius: '4px' }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(ratio => (
            <line
              key={ratio}
              x1={padding}
              y1={padding + ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={padding + ratio * (height - 2 * padding)}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          ))}
          
          {/* X-axis */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
          
          {/* Y-axis */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
          
          {/* Price line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
          
          {/* Data points */}
          {data.map((item, index) => {
            const x = (index / (data.length - 1)) * (width - 2 * padding) + padding
            const y = height - padding - ((item[dataKey] - minValue) / range) * (height - 2 * padding)
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={item.isCurrent ? 5 : 3}
                fill={item.isCurrent ? '#ef4444' : color}
                stroke={item.isCurrent ? '#dc2626' : 'none'}
                strokeWidth={2}
              />
            )
          })}
          
          {/* Y-axis labels */}
          <text x={padding - 10} y={padding + 5} fontSize="12" fill="#6b7280" textAnchor="end">
            ${maxValue.toFixed(0)}
          </text>
          <text x={padding - 10} y={height - padding + 5} fontSize="12" fill="#6b7280" textAnchor="end">
            ${minValue.toFixed(0)}
          </text>
          
          {/* X-axis labels (every 4 hours) */}
          {data.map((item, index) => {
            if (index % 4 === 0) {
              const x = (index / (data.length - 1)) * (width - 2 * padding) + padding
              return (
                <text
                  key={index}
                  x={x}
                  y={height - padding + 20}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {item.hour !== undefined ? `${item.hour}h` : item.time}
                </text>
              )
            }
            return null
          })}
        </svg>
      </div>
    )
  }

  // Bar chart for bids visualization
  const BidChart = ({ bids, width = 800, height = 300, title }) => {
    if (!bids || bids.length === 0) {
      return (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>{title}</h3>
          <div style={{ 
            width, 
            height, 
            border: '1px solid #e5e7eb', 
            borderRadius: '4px', 
            backgroundColor: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: '16px'
          }}>
            No bids submitted yet
          </div>
        </div>
      )
    }

    const maxPrice = Math.max(...bids.map(bid => bid.price))
    const padding = 40
    const barWidth = (width - 2 * padding) / bids.length - 10

    return (
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>{title}</h3>
        <svg width={width} height={height} style={{ border: '1px solid #e5e7eb', borderRadius: '4px' }}>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(ratio => (
            <line
              key={ratio}
              x1={padding}
              y1={padding + ratio * (height - 2 * padding)}
              x2={width - padding}
              y2={padding + ratio * (height - 2 * padding)}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          ))}
          
          {/* Axes */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
          
          {bids.map((bid, index) => {
            const barHeight = (bid.price / maxPrice) * (height - 2 * padding)
            const x = padding + index * (barWidth + 10) + 5
            const y = height - padding - barHeight
            
            const color = 
              bid.status === 'executed' ? '#10b981' :
              bid.status === 'rejected' ? '#ef4444' : '#f59e0b'
            
            return (
              <g key={bid.id || index}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  opacity={0.8}
                  rx={2}
                />
                
                {/* Hour label */}
                <text
                  x={x + barWidth / 2}
                  y={height - padding + 15}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {bid.hour}h
                </text>
                
                {/* Price label */}
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  fontSize="9"
                  fill="#374151"
                  textAnchor="middle"
                >
                  ${bid.price}
                </text>
                
                {/* Action label */}
                <text
                  x={x + barWidth / 2}
                  y={y + barHeight / 2 + 3}
                  fontSize="8"
                  fill="white"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {bid.action.toUpperCase()}
                </text>
              </g>
            )
          })}
          
          {/* Y-axis labels */}
          <text x={padding - 10} y={padding + 5} fontSize="12" fill="#6b7280" textAnchor="end">
            ${maxPrice.toFixed(0)}
          </text>
          <text x={padding - 10} y={height - padding + 5} fontSize="12" fill="#6b7280" textAnchor="end">
            $0
          </text>
        </svg>
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '15px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Executed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Pending</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>Rejected</span>
          </div>
        </div>
      </div>
    )
  }

  // Portfolio Performance Chart
  const PerformanceChart = ({ positions, width = 800, height = 300 }) => {
    if (!positions || positions.length === 0) {
      return (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>Portfolio Performance</h3>
          <div style={{ 
            width, 
            height, 
            border: '1px solid #e5e7eb', 
            borderRadius: '4px', 
            backgroundColor: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: '16px'
          }}>
            No positions to display
          </div>
        </div>
      )
    }

    const maxPnL = Math.max(...positions.map(p => Math.abs(p.pnl || 0)))
    const padding = 40
    const barWidth = (width - 2 * padding) / positions.length - 10

    return (
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#1f2937', fontSize: '18px' }}>Portfolio Performance by Position</h3>
        <svg width={width} height={height} style={{ border: '1px solid #e5e7eb', borderRadius: '4px' }}>
          {/* Center line (zero) */}
          <line 
            x1={padding} 
            y1={height / 2} 
            x2={width - padding} 
            y2={height / 2} 
            stroke="#6b7280" 
            strokeWidth={1}
            strokeDasharray="5,5"
          />
          
          {/* Axes */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e5e7eb" strokeWidth={1} />
          
          {positions.map((position, index) => {
            const pnl = position.pnl || 0
            const barHeight = Math.abs(pnl / maxPnL) * ((height - 2 * padding) / 2)
            const x = padding + index * (barWidth + 10) + 5
            const y = pnl >= 0 ? height / 2 - barHeight : height / 2
            
            return (
              <g key={position.id || index}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={pnl >= 0 ? '#10b981' : '#ef4444'}
                  opacity={0.8}
                  rx={2}
                />
                
                {/* Position label */}
                <text
                  x={x + barWidth / 2}
                  y={height - padding + 15}
                  fontSize="9"
                  fill="#6b7280"
                  textAnchor="middle"
                >
                  {position.hour}h
                </text>
                
                {/* P&L value */}
                <text
                  x={x + barWidth / 2}
                  y={pnl >= 0 ? y - 5 : y + barHeight + 12}
                  fontSize="9"
                  fill="#374151"
                  textAnchor="middle"
                >
                  ${pnl.toFixed(0)}
                </text>
              </g>
            )
          })}
          
          {/* Y-axis labels */}
          <text x={padding - 10} y={padding + 5} fontSize="12" fill="#6b7280" textAnchor="end">
            +${maxPnL.toFixed(0)}
          </text>
          <text x={padding - 10} y={height / 2 + 5} fontSize="12" fill="#6b7280" textAnchor="end">
            $0
          </text>
          <text x={padding - 10} y={height - padding + 5} fontSize="12" fill="#6b7280" textAnchor="end">
            -${maxPnL.toFixed(0)}
          </text>
        </svg>
      </div>
    )
  }

  // Enhanced analytics with better user insights
  const analytics = useMemo(() => {
    const bids = dayAheadBids || []
    const positions = portfolio?.positions || []
    
    const totalBids = bids.length
    const executedBids = bids.filter(bid => bid.status === 'executed').length
    const successRate = totalBids > 0 ? (executedBids / totalBids * 100).toFixed(1) : 0
    
    // Calculate comprehensive P&L metrics
    let totalPnL = 0
    let realizedPnL = 0 
    let unrealizedPnL = 0
    let winningTrades = 0
    let losingTrades = 0
    let totalTradeValue = 0
    let maxDrawdown = 0
    let peakValue = 0
    let runningPnL = 0
    
    positions.forEach(position => {
      const avgRealTime = (position.realTimeSettlement || []).length > 0 
        ? (position.realTimeSettlement || []).reduce((a, b) => a + b, 0) / (position.realTimeSettlement || []).length
        : marketData.currentPrice
      
      const positionPnL = position.quantity * (avgRealTime - position.dayAheadPrice)
      totalPnL += positionPnL
      totalTradeValue += Math.abs(position.quantity * position.dayAheadPrice)
      
      if ((position.realTimeSettlement || []).length > 0) {
        realizedPnL += positionPnL
        if (positionPnL > 0) winningTrades++
        else if (positionPnL < 0) losingTrades++
      } else {
        unrealizedPnL += positionPnL
      }
      
      // Track drawdown
      runningPnL += positionPnL
      if (runningPnL > peakValue) peakValue = runningPnL
      const currentDrawdown = peakValue - runningPnL
      if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown
    })
    
    // Advanced performance metrics
    const winRate = (winningTrades + losingTrades) > 0 ? (winningTrades / (winningTrades + losingTrades) * 100).toFixed(1) : 0
    const avgTradeSize = totalBids > 0 ? (totalTradeValue / totalBids).toFixed(0) : 0
    const returnOnCapital = (portfolio?.cashBalance || 0) > 0 ? (totalPnL / (portfolio?.cashBalance || 1) * 100).toFixed(2) : 0
    
    // Risk metrics
    const sharpeRatio = calculateSharpeRatio(positions, marketData)
    const valueAtRisk = calculateVaR(positions, marketData)
    const maxPositionSize = Math.max(...positions.map(p => Math.abs(p.quantity * p.dayAheadPrice)), 0)
    const totalExposure = positions.reduce((sum, p) => sum + Math.abs(p.quantity * p.dayAheadPrice), 0)
    const concentrationRisk = totalExposure > 0 ? (maxPositionSize / totalExposure * 100).toFixed(1) : 0
    
    // Market insights
    const marketTrend = analyzeMarketTrends(marketData)
    const opportunityScore = calculateOpportunityScore(marketData, positions)
    const riskScore = calculateRiskScore(concentrationRisk, marketData)
    
    return { 
      totalBids, executedBids, successRate, totalPnL, realizedPnL, unrealizedPnL,
      winningTrades, losingTrades, winRate, avgTradeSize, returnOnCapital,
      maxDrawdown, sharpeRatio, valueAtRisk, concentrationRisk, totalExposure,
      marketTrend, opportunityScore, riskScore
    }
  }, [marketData, portfolio, dayAheadBids])

  // Generate smart recommendations
  const generateRecommendations = () => {
    const recommendations = []
    
    if (analytics.opportunityScore > 75) {
      recommendations.push({
        type: 'opportunity',
        title: 'High Opportunity Detected',
        message: 'Market conditions are favorable for new positions. Consider increasing exposure.',
        action: 'Explore new trading opportunities',
        priority: 'high'
      })
    }
    
    if (analytics.riskScore > 70) {
      recommendations.push({
        type: 'warning',
        title: 'Elevated Risk Level',
        message: 'Current portfolio risk is above normal. Consider reducing position sizes.',
        action: 'Review and reduce exposure',
        priority: 'high'
      })
    }
    
    if (analytics.winRate < 40) {
      recommendations.push({
        type: 'improvement',
        title: 'Trading Performance Alert',
        message: 'Win rate is below optimal. Focus on higher-probability setups.',
        action: 'Refine trading strategy',
        priority: 'medium'
      })
    }
    
    if (analytics.concentrationRisk > 40) {
      recommendations.push({
        type: 'diversification',
        title: 'Concentration Risk',
        message: 'Portfolio is heavily concentrated. Diversify across time periods.',
        action: 'Spread positions across hours',
        priority: 'medium'
      })
    }
    
    if (analytics.marketTrend.confidence > 80) {
      recommendations.push({
        type: 'market',
        title: `Strong ${analytics.marketTrend.direction} Signal`,
        message: `High confidence ${analytics.marketTrend.direction.toLowerCase()} trend detected.`,
        action: analytics.marketTrend.direction.includes('Up') ? 'Consider long positions' : 'Consider short positions',
        priority: 'medium'
      })
    }
    
    return recommendations
  }

  const recommendations = generateRecommendations()

  // Tab content components
  const OverviewTab = () => (
    <div className="overview-tab">
      {/* Smart Alerts Banner */}
      {recommendations.filter(r => r.priority === 'high').length > 0 && (
        <div style={{
          backgroundColor: currentTheme.danger + '15',
          border: `1px solid ${currentTheme.danger}50`,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '25px',
          animation: isAnimated ? 'slideIn 0.5s ease' : 'none'
        }}>
          <h4 style={{ color: currentTheme.danger, margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600' }}>
            Immediate Attention Required
          </h4>
          {recommendations.filter(r => r.priority === 'high').map((rec, index) => (
            <div key={index} style={{ 
              marginBottom: '12px',
              padding: '10px',
              backgroundColor: currentTheme.cardBg,
              borderRadius: '8px',
              color: currentTheme.textPrimary
            }}>
              <strong>{rec.title}:</strong> {rec.message}
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Performance Dashboard */}
      <div style={{
        display: viewMode === 'grid' ? 'grid' : 'flex',
        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fit, minmax(200px, 1fr))' : 'none',
        flexDirection: viewMode === 'cards' ? 'column' : 'row',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Enhanced Total P&L Card */}
        <div 
          className="card-hover"
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            position: 'relative',
            transition: 'all 0.3s ease',
            animation: isAnimated ? 'slideIn 0.5s ease 0.1s' : 'none',
            animationFillMode: 'both',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>Total P&L</div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: analytics.totalPnL >= 0 ? '#10b981' : '#ef4444',
              marginBottom: '8px',
              animation: isAnimated ? 'priceFlicker 3s infinite' : 'none'
            }}>
              ${analytics.totalPnL.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {analytics.winRate}% win rate
            </div>
          </div>
        </div>

        {/* Enhanced Opportunity Score */}
        <div 
          className="card-hover"
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            position: 'relative',
            transition: 'all 0.3s ease',
            animation: isAnimated ? 'slideIn 0.5s ease 0.2s' : 'none',
            animationFillMode: 'both',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>Opportunity Score</div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: analytics.opportunityScore > 70 ? '#10b981' : 
                     analytics.opportunityScore > 40 ? '#f59e0b' : '#ef4444',
              marginBottom: '8px' 
            }}>
              {analytics.opportunityScore}/100
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {analytics.opportunityScore > 70 ? 'Excellent' : 
               analytics.opportunityScore > 40 ? 'Good' : 'Needs attention'}
            </div>
          </div>
        </div>

        {/* Enhanced Risk Score */}
        <div 
          className="card-hover"
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            position: 'relative',
            transition: 'all 0.3s ease',
            animation: isAnimated ? 'slideIn 0.5s ease 0.3s' : 'none',
            animationFillMode: 'both',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>Risk Level</div>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: analytics.riskScore < 30 ? '#10b981' : 
                     analytics.riskScore < 60 ? '#f59e0b' : '#ef4444',
              marginBottom: '8px' 
            }}>
              {analytics.riskScore}/100
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {analytics.riskScore < 30 ? 'Low risk' : 
               analytics.riskScore < 60 ? 'Moderate risk' : 'High risk'}
            </div>
          </div>
        </div>

        {/* Enhanced Market Trend */}
        <div 
          className="card-hover"
          style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center',
            position: 'relative',
            transition: 'all 0.3s ease',
            animation: isAnimated ? 'slideIn 0.5s ease 0.4s' : 'none',
            animationFillMode: 'both',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', fontWeight: '500' }}>Market Trend</div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: analytics.marketTrend.color,
              marginBottom: '8px' 
            }}>
              {analytics.marketTrend.direction}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {analytics.marketTrend.confidence}% confidence
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Interactive Price Chart */}
      <div style={{
        backgroundColor: currentTheme.cardBg,
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        marginBottom: '30px',
        border: `1px solid ${currentTheme.primary}20`,
        animation: isAnimated ? 'slideIn 0.6s ease 0.5s' : 'none',
        animationFillMode: 'both'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h3 style={{ margin: 0, color: currentTheme.textPrimary, fontSize: '20px', fontWeight: '600' }}>
            Market Price Evolution
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['1h', '6h', '24h'].map(period => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '25px',
                  backgroundColor: timeframe === period ? currentTheme.primary : currentTheme.background,
                  color: timeframe === period ? 'white' : currentTheme.textPrimary,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  boxShadow: timeframe === period ? '0 4px 15px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        
        {/* Enhanced Price Visualization with Gradient */}
        <div style={{ 
          position: 'relative', 
          height: '250px', 
          background: `linear-gradient(135deg, ${currentTheme.primary}05, ${currentTheme.success}05)`,
          borderRadius: '16px', 
          padding: '20px',
          border: `2px dashed ${currentTheme.primary}30`
        }}>
          {isAnimated && (
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              height: '4px',
              background: `linear-gradient(90deg, ${currentTheme.primary}, ${currentTheme.success})`,
              borderRadius: '2px',
              animation: 'pulse 2s infinite'
            }}></div>
          )}
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: currentTheme.textSecondary,
            fontSize: '16px',
            textAlign: 'center',
            gap: '15px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px', color: currentTheme.primary, fontWeight: 'bold' }}>↗</div>
            <div style={{ fontWeight: 'bold', color: currentTheme.textPrimary }}>
              Interactive Real-time Price Chart
            </div>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: currentTheme.textSecondary }}>Current</div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: currentTheme.primary,
                  animation: isAnimated ? 'priceFlicker 3s infinite' : 'none'
                }}>
                  ${marketData.currentPrice}/MWh
                </div>
              </div>
              <div style={{ fontSize: '20px', color: currentTheme.textSecondary }}>→</div>
              <div>
                <div style={{ fontSize: '12px', color: currentTheme.textSecondary }}>Next Hour Prediction</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentTheme.success }}>
                  ${analytics.marketTrend.nextHourPrice}/MWh
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Smart Recommendations */}
      <div style={{
        backgroundColor: currentTheme.cardBg,
        padding: '30px',
        borderRadius: '20px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        border: `1px solid ${currentTheme.primary}20`,
        animation: isAnimated ? 'slideIn 0.7s ease 0.6s' : 'none',
        animationFillMode: 'both'
      }}>
        <h3 style={{ margin: '0 0 25px 0', color: currentTheme.textPrimary, fontSize: '20px', fontWeight: '600' }}>
          🤖 AI-Powered Recommendations
        </h3>
        {recommendations.length > 0 ? (
          <div style={{ display: 'grid', gap: '15px' }}>
            {recommendations.map((rec, index) => (
              <div
                key={index}
                style={{
                  padding: '15px',
                  borderRadius: '12px',
                  backgroundColor: 
                    rec.type === 'opportunity' ? '#f6ffed' :
                    rec.type === 'warning' ? '#fff2f0' :
                    rec.type === 'improvement' ? '#fff7e6' :
                    rec.type === 'market' ? '#f0f7ff' : '#f8f9fa',
                  border: `1px solid ${
                    rec.type === 'opportunity' ? '#b7eb8f' :
                    rec.type === 'warning' ? '#ffccc7' :
                    rec.type === 'improvement' ? '#ffd591' :
                    rec.type === 'market' ? '#91d5ff' : '#d9d9d9'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      color: 
                        rec.type === 'opportunity' ? '#52c41a' :
                        rec.type === 'warning' ? '#ff4d4f' :
                        rec.type === 'improvement' ? '#fa8c16' :
                        rec.type === 'market' ? '#1890ff' : '#666'
                    }}>
                      {rec.title}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                      {rec.message}
                    </p>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#999' }}>
                      💡 {rec.action}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    backgroundColor: rec.priority === 'high' ? '#ff4d4f' : '#fa8c16',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    marginLeft: '15px'
                  }}>
                    {rec.priority.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#999',
            backgroundColor: '#fafafa',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '15px' }}>✅</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>All Clear!</div>
            <div style={{ fontSize: '14px' }}>No immediate actions required. Your portfolio is well-positioned.</div>
          </div>
        )}
      </div>
    </div>
  )

  // Performance Tab Component with Enhanced Metrics and Styling
  const PerformanceTab = () => (
    <div className="performance-tab">
      {/* Enhanced Performance Overview Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '25px',
        marginBottom: '35px'
      }}>
        {[
          { 
            title: 'Total P&L', 
            value: `$${analytics.totalPnL.toFixed(2)}`, 
            change: '+12.5%',
            trend: analytics.totalPnL >= 0 ? 'up' : 'down',
            icon: '',
            gradient: analytics.totalPnL >= 0 ? 
              `linear-gradient(135deg, ${currentTheme.success}, ${currentTheme.success}80)` :
              `linear-gradient(135deg, ${currentTheme.error}, ${currentTheme.error}80)`,
            description: 'Overall portfolio performance',
            subValue: `Realized: $${analytics.realizedPnL.toFixed(2)} | Unrealized: $${analytics.unrealizedPnL.toFixed(2)}`
          },
          { 
            title: 'Win Rate', 
            value: `${analytics.winRate}%`, 
            change: '+2.3%',
            trend: 'up',
            icon: '',
            gradient: `linear-gradient(135deg, ${currentTheme.primary}, ${currentTheme.primary}80)`,
            description: 'Successful trade percentage',
            subValue: `${analytics.winningTrades} wins • ${analytics.losingTrades} losses`
          },
          { 
            title: 'Return on Capital', 
            value: `${analytics.returnOnCapital}%`, 
            change: '+0.8%',
            trend: analytics.returnOnCapital >= 0 ? 'up' : 'down',
            icon: '',
            gradient: analytics.returnOnCapital >= 0 ?
              `linear-gradient(135deg, ${currentTheme.info}, ${currentTheme.info}80)` :
              `linear-gradient(135deg, ${currentTheme.error}, ${currentTheme.error}80)`,
            description: 'Capital efficiency metric',
            subValue: `Based on $${(portfolio?.cashBalance || 0).toFixed(0)} balance`
          },
          { 
            title: 'Sharpe Ratio', 
            value: analytics.sharpeRatio, 
            change: '-0.2%',
            trend: 'down',
            icon: '',
            gradient: `linear-gradient(135deg, ${currentTheme.warning}, ${currentTheme.warning}80)`,
            description: 'Risk-adjusted returns',
            subValue: 'Volatility-adjusted performance'
          }
        ].map((metric, index) => (
          <div
            key={metric.title}
            style={{
              background: currentTheme.cardBg,
              padding: '30px',
              borderRadius: '24px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
              border: `1px solid ${currentTheme.primary}20`,
              position: 'relative',
              overflow: 'hidden',
              animation: isAnimated ? `slideInUp 0.6s ease ${index * 0.15}s` : 'none',
              animationFillMode: 'both',
              cursor: 'pointer',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.15)';
            }}
          >
            {/* Enhanced Animated Background Gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '6px',
              background: metric.gradient,
              animation: isAnimated ? 'shimmer 4s infinite, pulse 3s infinite' : 'none'
            }}></div>
            
            {/* Floating Enhanced Icon */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              fontSize: '24px',
              opacity: 0.7,
              animation: isAnimated ? 'float 5s ease-in-out infinite' : 'none',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
            }}>
              {metric.icon}
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}>
              <div style={{
                color: currentTheme.textSecondary,
                fontSize: '15px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {metric.title}
              </div>
              
              <div style={{
                color: currentTheme.textPrimary,
                fontSize: '28px',
                fontWeight: 'bold',
                lineHeight: '1.1',
                marginBottom: '10px',
                animation: isAnimated ? 'priceFlicker 4s infinite' : 'none'
              }}>
                {metric.value}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: metric.trend === 'up' ? currentTheme.success : currentTheme.error,
                  fontSize: '15px',
                  fontWeight: 'bold'
                }}>
                  <span style={{ fontSize: '18px' }}>
                    {metric.trend === 'up' ? '↑' : '↓'}
                  </span>
                  {metric.change}
                </div>
                
                <div style={{
                  color: currentTheme.textSecondary,
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  vs last week
                </div>
              </div>
              
              <div style={{
                color: currentTheme.textSecondary,
                fontSize: '13px',
                fontStyle: 'italic',
                paddingTop: '12px',
                borderTop: `1px solid ${currentTheme.primary}20`,
                marginTop: '5px'
              }}>
                {metric.description}
              </div>
              
              <div style={{
                color: currentTheme.textSecondary,
                fontSize: '12px',
                backgroundColor: `${currentTheme.primary}10`,
                padding: '8px 12px',
                borderRadius: '8px',
                border: `1px solid ${currentTheme.primary}20`
              }}>
                {metric.subValue}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Position Analysis */}
      <div style={{
        backgroundColor: currentTheme.cardBg,
        padding: '35px',
        borderRadius: '24px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        marginBottom: '30px',
        border: `1px solid ${currentTheme.primary}20`,
        animation: isAnimated ? 'slideIn 0.8s ease 0.5s' : 'none',
        animationFillMode: 'both'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <h3 style={{ margin: 0, color: currentTheme.textPrimary, fontSize: '24px', fontWeight: '700' }}>
            Active Positions Portfolio
          </h3>
          <div style={{
            padding: '8px 16px',
            backgroundColor: `${currentTheme.primary}15`,
            color: currentTheme.primary,
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 'bold',
            border: `1px solid ${currentTheme.primary}30`
          }}>
            {(portfolio?.positions || []).length} Position{(portfolio?.positions || []).length !== 1 ? 's' : ''}
          </div>
        </div>

        {(portfolio?.positions || []).length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {(portfolio?.positions || []).map((position, index) => {
              const currentValue = position.quantity * marketData.currentPrice
              const bookValue = position.quantity * position.dayAheadPrice
              const unrealizedPnL = currentValue - bookValue
              const pnlPercent = ((unrealizedPnL / Math.abs(bookValue)) * 100).toFixed(1)
              const isLong = position.quantity > 0
              
              return (
                <div 
                  key={index} 
                  style={{
                    padding: '25px',
                    background: unrealizedPnL >= 0 ? 
                      `linear-gradient(135deg, ${currentTheme.success}10, ${currentTheme.success}05)` :
                      `linear-gradient(135deg, ${currentTheme.error}10, ${currentTheme.error}05)`,
                    borderRadius: '20px',
                    border: `2px solid ${unrealizedPnL >= 0 ? currentTheme.success : currentTheme.error}30`,
                    position: 'relative',
                    overflow: 'hidden',
                    animation: isAnimated ? `fadeInUp 0.6s ease ${index * 0.1}s` : 'none',
                    animationFillMode: 'both',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
                  }}
                >
                  {/* Position Type Indicator */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: isLong ? 
                      `linear-gradient(90deg, ${currentTheme.success}, transparent)` :
                      `linear-gradient(90deg, ${currentTheme.error}, transparent)`
                  }}></div>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    alignItems: 'center',
                    gap: '20px'
                  }}>
                    {/* Position Info */}
                    <div>
                      <div style={{ 
                        display: 'inline-block',
                        padding: '6px 14px',
                        backgroundColor: isLong ? currentTheme.success : currentTheme.error,
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        marginBottom: '10px'
                      }}>
                        {isLong ? '📈 LONG' : '📉 SHORT'} {Math.abs(position.quantity)} MWh
                      </div>
                      <div style={{ 
                        fontSize: '15px', 
                        color: currentTheme.textSecondary,
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'center'
                      }}>
                        <div>Entry: <span style={{ fontWeight: 'bold', color: currentTheme.textPrimary }}>${position.dayAheadPrice}/MWh</span></div>
                        <div>•</div>
                        <div>Current: <span style={{ fontWeight: 'bold', color: currentTheme.textPrimary }}>${marketData.currentPrice}/MWh</span></div>
                      </div>
                    </div>
                    
                    {/* Book Value */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: currentTheme.textSecondary, 
                        marginBottom: '5px',
                        fontWeight: '500'
                      }}>
                        Book Value
                      </div>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        color: currentTheme.textPrimary
                      }}>
                        ${Math.abs(bookValue).toFixed(0)}
                      </div>
                    </div>
                    
                    {/* Current Value */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: currentTheme.textSecondary, 
                        marginBottom: '5px',
                        fontWeight: '500'
                      }}>
                        Current Value
                      </div>
                      <div style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold',
                        color: currentTheme.textPrimary
                      }}>
                        ${Math.abs(currentValue).toFixed(0)}
                      </div>
                    </div>
                    
                    {/* P&L */}
                    <div style={{ 
                      textAlign: 'center',
                      padding: '15px',
                      backgroundColor: unrealizedPnL >= 0 ? `${currentTheme.success}15` : `${currentTheme.error}15`,
                      borderRadius: '16px',
                      border: `1px solid ${unrealizedPnL >= 0 ? currentTheme.success : currentTheme.error}30`
                    }}>
                      <div style={{ 
                        fontSize: '13px', 
                        color: currentTheme.textSecondary, 
                        marginBottom: '5px',
                        fontWeight: '500'
                      }}>
                        Unrealized P&L
                      </div>
                      <div style={{ 
                        fontSize: '22px', 
                        fontWeight: 'bold',
                        color: unrealizedPnL >= 0 ? currentTheme.success : currentTheme.error,
                        marginBottom: '3px'
                      }}>
                        {unrealizedPnL >= 0 ? '+' : ''}${unrealizedPnL.toFixed(2)}
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: unrealizedPnL >= 0 ? currentTheme.success : currentTheme.error,
                        fontWeight: 'bold'
                      }}>
                        ({pnlPercent >= 0 ? '+' : ''}{pnlPercent}%)
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: currentTheme.textSecondary,
            background: `linear-gradient(135deg, ${currentTheme.primary}05, ${currentTheme.primary}02)`,
            borderRadius: '20px',
            border: `2px dashed ${currentTheme.primary}30`
          }}>
            <div style={{ 
              fontSize: '32px', 
              marginBottom: '20px',
              animation: isAnimated ? 'float 3s ease-in-out infinite' : 'none'
            }}>
              📊
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              marginBottom: '10px',
              color: currentTheme.textPrimary
            }}>
              No Active Positions
            </div>
            <div style={{ fontSize: '16px' }}>
              Execute some bids to see position analytics here
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Risk Tab Component  
  const RiskTab = () => (
    <div className="risk-tab">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '25px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <h4 style={{ color: '#ff4d4f', margin: '0 0 15px 0' }}>🚨 Risk Score</h4>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#f0f0f0',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${analytics.riskScore}%`,
                height: '100%',
                backgroundColor: analytics.riskScore < 30 ? '#52c41a' : analytics.riskScore < 60 ? '#fa8c16' : '#ff4d4f',
                borderRadius: '6px',
                transition: 'width 0.5s ease'
              }}></div>
            </div>
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '20px', fontWeight: 'bold' }}>
              {analytics.riskScore}/100
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {analytics.riskScore < 30 ? 'Low risk portfolio with good diversification' :
             analytics.riskScore < 60 ? 'Moderate risk - monitor position sizes' :
             'High risk detected - consider reducing exposure'}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <h4 style={{ color: '#fa8c16', margin: '0 0 15px 0' }}>📊 Concentration Risk</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>
            {analytics.concentrationRisk}%
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Largest position as % of total exposure
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            Total Exposure: ${analytics.totalExposure.toFixed(0)}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <h4 style={{ color: '#722ed1', margin: '0 0 15px 0' }}>📉 Value at Risk</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px', color: '#ff4d4f' }}>
            ${analytics.valueAtRisk}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            95% confidence, 1-day horizon
          </div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            Maximum expected loss
          </div>
        </div>
      </div>

      {/* Risk Management Recommendations */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>🛡️ Risk Management</h3>
        <div style={{ display: 'grid', gap: '15px' }}>
          {analytics.riskScore > 70 && (
            <div style={{
              padding: '15px',
              backgroundColor: '#fff2f0',
              borderRadius: '12px',
              border: '1px solid #ffccc7'
            }}>
              <h4 style={{ color: '#ff4d4f', margin: '0 0 8px 0' }}>High Risk Alert</h4>
              <p style={{ margin: 0, color: '#666' }}>
                Your portfolio risk is elevated. Consider reducing position sizes or diversifying across more time periods.
              </p>
            </div>
          )}
          
          {analytics.concentrationRisk > 50 && (
            <div style={{
              padding: '15px',
              backgroundColor: '#fff7e6',
              borderRadius: '12px',
              border: '1px solid #ffd591'
            }}>
              <h4 style={{ color: '#fa8c16', margin: '0 0 8px 0' }}>Concentration Warning</h4>
              <p style={{ margin: 0, color: '#666' }}>
                High concentration detected. Spread positions across multiple hours to reduce risk.
              </p>
            </div>
          )}
          
          <div style={{
            padding: '15px',
            backgroundColor: '#f6ffed',
            borderRadius: '12px',
            border: '1px solid #b7eb8f'
          }}>
            <h4 style={{ color: '#52c41a', margin: '0 0 8px 0' }}>Best Practices</h4>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#666' }}>
              <li>Keep individual positions under 20% of total portfolio</li>
              <li>Monitor market volatility during peak hours (6-9 PM)</li>
              <li>Use stop-losses when volatility exceeds 10%</li>
              <li>Diversify across different demand periods</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  // Market Tab Component
  const MarketTab = () => (
    <div className="market-tab">
      {/* Market Trend Analysis */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        marginBottom: '25px'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>📈 Market Intelligence</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: analytics.marketTrend.color === '#52c41a' ? '#f6ffed' :
                           analytics.marketTrend.color === '#ff4d4f' ? '#fff2f0' : '#f0f7ff',
            borderRadius: '12px',
            border: `2px solid ${analytics.marketTrend.color}`
          }}>
            <h4 style={{ color: analytics.marketTrend.color, margin: '0 0 10px 0' }}>
              📊 Price Trend: {analytics.marketTrend.direction}
            </h4>
            <div style={{ marginBottom: '8px' }}>
              <strong>Current:</strong> ${marketData.currentPrice}/MWh
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Next Hour:</strong> ${analytics.marketTrend.nextHourPrice}/MWh
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Change:</strong> {analytics.marketTrend.priceTrend >= 0 ? '+' : ''}{analytics.marketTrend.priceTrend}%
            </div>
            <div>
              <strong>Confidence:</strong> {analytics.marketTrend.confidence}%
            </div>
          </div>
          
          <div style={{
            padding: '20px',
            backgroundColor: '#fff7e6',
            borderRadius: '12px',
            border: '1px solid #ffd591'
          }}>
            <h4 style={{ color: '#fa8c16', margin: '0 0 10px 0' }}>⚡ Current Conditions</h4>
            <div style={{ marginBottom: '8px' }}>
              <strong>Demand:</strong> {marketData.demand.toLocaleString()} MW
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Renewable:</strong> {marketData.renewablePercentage.toFixed(1)}%
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Volatility:</strong> {analytics.marketTrend.volatility.toFixed(1)}%
            </div>
            <div>
              <strong>Hour:</strong> {new Date().getHours()}:00 ({new Date().getHours() >= 17 && new Date().getHours() <= 19 ? 'Peak' : 'Off-Peak'})
            </div>
          </div>
        </div>
      </div>

      {/* Market Opportunity Analysis */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>💡 Trading Opportunities</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px' }}>
          <div>
            <h4 style={{ margin: '0 0 15px 0' }}>Opportunity Score</h4>
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(${
                  analytics.opportunityScore > 70 ? '#52c41a' : 
                  analytics.opportunityScore > 40 ? '#fa8c16' : '#ff4d4f'
                } 0deg, ${
                  analytics.opportunityScore > 70 ? '#52c41a' : 
                  analytics.opportunityScore > 40 ? '#fa8c16' : '#ff4d4f'
                } ${analytics.opportunityScore * 3.6}deg, #f0f0f0 ${analytics.opportunityScore * 3.6}deg, #f0f0f0 360deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}>
                  {analytics.opportunityScore}/100
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', color: '#666' }}>
              {analytics.opportunityScore > 70 ? 'Excellent opportunities' :
               analytics.opportunityScore > 40 ? 'Good market conditions' :
               'Limited opportunities'}
            </div>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 15px 0' }}>Market Analysis</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Peak Hours Active:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {new Date().getHours() >= 17 && new Date().getHours() <= 19 ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>High Demand Period:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {marketData.demand > 45000 ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Optimal Volatility:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {analytics.marketTrend.volatility > 3 && analytics.marketTrend.volatility < 8 ? '✅ Yes' : '❌ No'}
                </span>
              </div>
              
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Price Trend Strength:</span>
                <span style={{ fontWeight: 'bold', color: analytics.marketTrend.color }}>
                  {analytics.marketTrend.strength}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Main render
  return (
    <div style={{ padding: '20px', backgroundColor: '#f8f9fa', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Clean Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
          Trading Analytics
        </h1>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
          Price trends and bid performance • Updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Data Visualizations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Hourly Price Chart */}
        <LineChart 
          data={hourlyPrices}
          dataKey="price"
          color="#3b82f6"
          title="Hourly Price Changes (24 Hours)"
          width={900}
          height={300}
        />
        
        {/* Current Bids Chart */}
        <BidChart 
          bids={dayAheadBids || []}
          title="Current Bids Status"
          width={900}
          height={300}
        />
        
        {/* Portfolio Performance */}
        <PerformanceChart 
          positions={portfolio?.positions || []}
          width={900}
          height={300}
        />

        {/* Quick Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          marginTop: '20px'
        }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>Total P&L</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: analytics.totalPnL >= 0 ? '#10b981' : '#ef4444'
            }}>
              ${analytics.totalPnL.toFixed(2)}
            </div>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>Success Rate</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {analytics.successRate}%
            </div>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>Total Bids</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              {analytics.totalBids}
            </div>
          </div>
          
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '5px' }}>Current Price</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
              ${marketData.currentPrice}/MWh
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
            <div style={{ color: currentTheme.textSecondary, fontSize: '14px' }}>
              {tradingModes[tradingMode].emoji} {tradingModes[tradingMode].name} • Real-time market intelligence
            </div>
          </div>
          
          {/* Innovative Control Panel */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* Theme Selector */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.keys(themes).map(themeKey => (
                <button
                  key={themeKey}
                  onClick={() => setTheme(themeKey)}
                  style={{
                    width: '35px',
                    height: '35px',
                    borderRadius: '50%',
                    border: theme === themeKey ? `3px solid ${currentTheme.primary}` : '2px solid #ddd',
                    backgroundColor: themes[themeKey].cardBg,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  title={themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
                >
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(45deg, ${themes[themeKey].primary}, ${themes[themeKey].success})`,
                    opacity: 0.7
                  }}></div>
                </button>
              ))}
            </div>
            
            {/* Trading Mode Selector */}
            <select
              value={tradingMode}
              onChange={(e) => setTradingMode(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '20px',
                border: `2px solid ${currentTheme.primary}`,
                backgroundColor: currentTheme.cardBg,
                color: currentTheme.textPrimary,
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {Object.entries(tradingModes).map(([key, mode]) => (
                <option key={key} value={key}>
                  {mode.emoji} {mode.name}
                </option>
              ))}
            </select>
            
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', backgroundColor: currentTheme.cardBg, borderRadius: '20px', padding: '4px' }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '16px',
                  backgroundColor: viewMode === 'grid' ? currentTheme.primary : 'transparent',
                  color: viewMode === 'grid' ? 'white' : currentTheme.textSecondary,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🔲 Grid
              </button>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '16px',
                  backgroundColor: viewMode === 'cards' ? currentTheme.primary : 'transparent',
                  color: viewMode === 'cards' ? 'white' : currentTheme.textSecondary,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📱 Cards
              </button>
            </div>
            
            {/* Animation Toggle */}
            <button
              onClick={() => setIsAnimated(!isAnimated)}
              style={{
                padding: '8px 12px',
                border: `2px solid ${currentTheme.primary}`,
                borderRadius: '20px',
                backgroundColor: isAnimated ? currentTheme.primary : currentTheme.cardBg,
                color: isAnimated ? 'white' : currentTheme.textPrimary,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {isAnimated ? '🎬' : '⏸️'} {isAnimated ? 'Animated' : 'Static'}
            </button>
          </div>
        </div>

        {/* Real-time Market Pulse */}
        <div style={{
          backgroundColor: currentTheme.cardBg,
          padding: '15px 25px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '20px',
          border: `1px solid ${calculateMarketSentiment().color}`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${calculateMarketSentiment().color}, transparent)`,
            animation: isAnimated ? 'pulse 2s infinite' : 'none'
          }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: currentTheme.textSecondary, marginBottom: '4px' }}>
                  Market Sentiment
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: calculateMarketSentiment().color,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {calculateMarketSentiment().sentiment}
                  <span style={{ fontSize: '12px', opacity: 0.7 }}>
                    ({calculateMarketSentiment().confidence}% confidence)
                  </span>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', color: currentTheme.textSecondary, marginBottom: '4px' }}>
                  Live Price
                </div>
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: currentTheme.textPrimary,
                  animation: isAnimated ? 'priceFlicker 3s infinite' : 'none'
                }}>
                  ${marketData.currentPrice}/MWh
                  <span style={{ 
                    fontSize: '14px', 
                    color: marketData.change24h >= 0 ? currentTheme.success : currentTheme.danger,
                    marginLeft: '8px'
                  }}>
                    {marketData.change24h >= 0 ? '↗' : '↘'} {Math.abs(marketData.change24h).toFixed(2)}%
                  </span>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: '12px', color: currentTheme.textSecondary, marginBottom: '4px' }}>
                  Market Activity
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: currentTheme.success,
                    animation: isAnimated ? 'blink 1s infinite' : 'none'
                  }}></div>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: currentTheme.textPrimary }}>
                    LIVE
                  </span>
                </div>
              </div>
            </div>
            
            {/* AI Insights Preview */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {generateAIInsights().slice(0, 2).map((insight, index) => (
                <div key={index} style={{
                  padding: '8px 12px',
                  backgroundColor: currentTheme.primary,
                  color: 'white',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  opacity: 0.9
                }}>
                  🤖 {insight.title}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Enhanced Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', position: 'relative' }}>
          {[
            { id: 'overview', label: '📊 Overview', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
            { id: 'performance', label: '💰 Performance', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
            { id: 'risk', label: '🛡️ Risk Analysis', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
            { id: 'market', label: '📈 Market Intel', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
            { id: 'ai', label: '🤖 AI Insights', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 24px',
                border: 'none',
                borderRadius: '30px',
                background: activeTab === tab.id ? tab.gradient : currentTheme.cardBg,
                color: activeTab === tab.id ? 'white' : currentTheme.textPrimary,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                boxShadow: activeTab === tab.id ? '0 8px 25px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
                transform: activeTab === tab.id ? 'translateY(-2px)' : 'translateY(0)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {activeTab === tab.id && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  animation: isAnimated ? 'ripple 2s infinite' : 'none'
                }}></div>
              )}
              <span style={{ position: 'relative', zIndex: 2 }}>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced CSS Animations for Modern UI */}
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
          0%, 100% { opacity: 1; }
          50% { opacity: 0.9; }
        }
        
        @keyframes priceFlicker {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.01); opacity: 0.95; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px currentColor; }
          50% { box-shadow: 0 0 15px currentColor; }
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes neuralPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.2); box-shadow: 0 0 15px currentColor; }
        }
        
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
          40%, 43% { transform: translate3d(0, -10px, 0); }
          70% { transform: translate3d(0, -5px, 0); }
          90% { transform: translate3d(0, -2px, 0); }
        }
        
        .card-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-8px) scale(1.02) !important;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25) !important;
        }
        
        .neural-node {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${currentTheme.primary};
          animation: neuralPulse 3s infinite;
          box-shadow: 0 0 10px ${currentTheme.primary}50;
        }
        
        .sentiment-indicator {
          padding: 10px 18px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          animation: glow 4s infinite;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .pattern-badge {
          display: inline-block;
          padding: 6px 14px;
          background: linear-gradient(45deg, ${currentTheme.primary}, ${currentTheme.success});
          color: white;
          border-radius: 18px;
          font-size: 12px;
          font-weight: bold;
          margin: 3px;
          animation: pulse 3s infinite;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        
        .gradient-bg {
          background: linear-gradient(-45deg, ${currentTheme.primary}20, ${currentTheme.success}20, ${currentTheme.info}20, ${currentTheme.warning}20);
          background-size: 400% 400%;
          animation: gradientShift 8s ease infinite;
        }
        
        .floating-element {
          animation: float 6s ease-in-out infinite;
        }
        
        .glowing-border {
          position: relative;
          overflow: hidden;
        }
        
        .glowing-border::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, ${currentTheme.primary}40, transparent);
          animation: shimmer 3s infinite;
        }
      `}</style>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'performance' && <PerformanceTab />}
      {activeTab === 'risk' && <RiskTab />}
      {activeTab === 'market' && <MarketTab />}
      {activeTab === 'ai' && <AIInsightsTab />}
    </div>
  )

  // NEW: AI Insights Tab with Neural Network Simulation
  const AIInsightsTab = () => {
    const aiInsights = generateAIInsights()
    const sentiment = calculateMarketSentiment()
    
    return (
      <div className="ai-insights-tab">
        {/* Neural Network Visualization */}
        <div style={{
          backgroundColor: currentTheme.cardBg,
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          marginBottom: '25px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${currentTheme.primary}, ${currentTheme.success}, ${currentTheme.warning})`,
            animation: isAnimated ? 'pulse 3s infinite' : 'none'
          }}></div>
          
          <h3 style={{ margin: '0 0 25px 0', color: currentTheme.textPrimary, fontSize: '24px' }}>
            🧠 Neural Market Analysis
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '25px' }}>
            {/* Market Sentiment Score */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(${sentiment.color} 0deg, ${sentiment.color} ${sentiment.score * 3.6}deg, #f0f0f0 ${sentiment.score * 3.6}deg, #f0f0f0 360deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px',
                position: 'relative'
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  backgroundColor: currentTheme.cardBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: currentTheme.textPrimary
                }}>
                  {sentiment.score}/100
                </div>
                {isAnimated && (
                  <div style={{
                    position: 'absolute',
                    width: '130px',
                    height: '130px',
                    borderRadius: '50%',
                    border: `2px solid ${sentiment.color}`,
                    animation: 'pulse 2s infinite',
                    opacity: 0.3
                  }}></div>
                )}
              </div>
              <h4 style={{ color: currentTheme.textPrimary, margin: '0 0 5px 0' }}>Market Sentiment</h4>
              <p style={{ color: sentiment.color, fontWeight: 'bold', margin: 0 }}>{sentiment.sentiment}</p>
            </div>
            
            {/* AI Confidence Meter */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `linear-gradient(45deg, ${currentTheme.primary}, ${currentTheme.success})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px',
                position: 'relative'
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  backgroundColor: currentTheme.cardBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: currentTheme.textPrimary
                }}>
                  {sentiment.confidence}%
                </div>
              </div>
              <h4 style={{ color: currentTheme.textPrimary, margin: '0 0 5px 0' }}>AI Confidence</h4>
              <p style={{ color: currentTheme.textSecondary, margin: 0 }}>Neural certainty</p>
            </div>
            
            {/* Prediction Accuracy */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(${currentTheme.success} 0deg, ${currentTheme.success} 306deg, #f0f0f0 306deg, #f0f0f0 360deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px'
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  backgroundColor: currentTheme.cardBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: currentTheme.textPrimary
                }}>
                  85%
                </div>
              </div>
              <h4 style={{ color: currentTheme.textPrimary, margin: '0 0 5px 0' }}>Model Accuracy</h4>
              <p style={{ color: currentTheme.textSecondary, margin: 0 }}>24h predictions</p>
            </div>
          </div>
        </div>

        {/* AI Generated Insights */}
        <div style={{
          backgroundColor: currentTheme.cardBg,
          padding: '25px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          marginBottom: '25px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: currentTheme.textPrimary }}>
            🤖 AI-Generated Market Insights
          </h3>
          
          {aiInsights.length > 0 ? (
            <div style={{ display: 'grid', gap: '15px' }}>
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className="card-hover"
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${currentTheme.primary}15, ${currentTheme.success}10)`,
                    border: `2px solid ${currentTheme.primary}30`,
                    transition: 'all 0.3s ease',
                    animation: isAnimated ? `slideIn 0.5s ease ${index * 0.1}s` : 'none',
                    animationFillMode: 'both'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: currentTheme.primary,
                          animation: isAnimated ? 'blink 2s infinite' : 'none'
                        }}></div>
                        <h4 style={{ 
                          margin: 0, 
                          color: currentTheme.textPrimary,
                          fontSize: '16px',
                          fontWeight: '600'
                        }}>
                          {insight.title}
                        </h4>
                      </div>
                      <p style={{ margin: '0 0 12px 0', color: currentTheme.textSecondary, fontSize: '14px', lineHeight: '1.5' }}>
                        {insight.message}
                      </p>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 'bold', 
                        color: currentTheme.primary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        💡 {insight.action}
                        <div style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: currentTheme.primary,
                          color: 'white',
                          fontSize: '10px'
                        }}>
                          {insight.confidence}% confidence
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: currentTheme.textSecondary,
              backgroundColor: currentTheme.background,
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>🤖</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>AI Analysis in Progress</div>
              <div style={{ fontSize: '14px' }}>Neural networks processing market data...</div>
            </div>
          )}
        </div>

        {/* Advanced Pattern Recognition */}
        <div style={{
          backgroundColor: currentTheme.cardBg,
          padding: '25px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <h3 style={{ margin: '0 0 20px 0', color: currentTheme.textPrimary }}>
            🔍 Pattern Recognition Engine
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: currentTheme.background,
              border: `1px solid ${currentTheme.primary}30`
            }}>
              <h4 style={{ color: currentTheme.textPrimary, margin: '0 0 10px 0' }}>📊 Trend Patterns</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentTheme.success, marginBottom: '5px' }}>
                3 Detected
              </div>
              <div style={{ fontSize: '12px', color: currentTheme.textSecondary }}>
                Bullish flag, Support line, Volume spike
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: currentTheme.background,
              border: `1px solid ${currentTheme.primary}30`
            }}>
              <h4 style={{ color: currentTheme.textPrimary, margin: '0 0 10px 0' }}>⚡ Anomalies</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentTheme.warning, marginBottom: '5px' }}>
                1 Active
              </div>
              <div style={{ fontSize: '12px', color: currentTheme.textSecondary }}>
                Unusual trading volume at 14:30
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: currentTheme.background,
              border: `1px solid ${currentTheme.primary}30`
            }}>
              <h4 style={{ color: currentTheme.textPrimary, margin: '0 0 10px 0' }}>🎯 Signals</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentTheme.primary, marginBottom: '5px' }}>
                5 Strong
              </div>
              <div style={{ fontSize: '12px', color: currentTheme.textSecondary }}>
                2 Buy, 1 Sell, 2 Hold signals
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Analytics
