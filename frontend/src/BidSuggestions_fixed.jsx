import React, { useState, useEffect } from 'react'

const BidSuggestions = ({ marketData, portfolio, onApplySuggestion }) => {
  const [analysisMode, setAnalysisMode] = useState('moderate')
  const [suggestions, setSuggestions] = useState([])

  const marketConditions = {
    volatility: 8.5 + Math.random() * 4,
    renewableRatio: 0.35 + Math.random() * 0.3,
    gridStress: Math.random() > 0.7 ? 'high' : Math.random() > 0.3 ? 'normal' : 'low',
    liquidity: 0.7 + Math.random() * 0.3
  }

  // Simple price prediction
  const predictPriceMovement = (hour, basePrice) => {
    const isPeakHour = (hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22)
    const isNightHour = hour >= 23 || hour <= 6
    
    let priceMultiplier = 1.0
    let confidence = 50
    
    if (isPeakHour) {
      priceMultiplier = 1.05 + (Math.random() * 0.15)
      confidence = 70
    } else if (isNightHour) {
      priceMultiplier = 0.85 + (Math.random() * 0.10)
      confidence = 65
    } else {
      priceMultiplier = 0.95 + (Math.random() * 0.10)
      confidence = 55
    }
    
    priceMultiplier += (Math.random() - 0.5) * 0.05
    confidence += Math.random() * 20 - 10
    
    return {
      price: basePrice * priceMultiplier,
      confidence: Math.min(90, Math.max(30, confidence)),
      trend: priceMultiplier > 1.02 ? 'up' : priceMultiplier < 0.98 ? 'down' : 'stable'
    }
  }

  // Portfolio risk assessment
  const assessPortfolioRisk = () => {
    const positions = portfolio.positions || []
    const totalExposure = positions.reduce((sum, pos) => sum + Math.abs(pos.quantity * pos.dayAheadPrice), 0)
    const netPosition = positions.reduce((sum, pos) => sum + pos.quantity, 0)
    
    return {
      totalExposure,
      netPosition,
      isOverexposed: totalExposure > (portfolio.cashBalance || 10000) * 2,
      riskCapacity: (portfolio.cashBalance || 10000) - totalExposure * 0.2,
      bias: netPosition > 100 ? 'long' : netPosition < -100 ? 'short' : 'neutral'
    }
  }

  // Score opportunity
  const scoreOpportunity = (prediction, currentPrice, action, riskAssessment) => {
    let score = prediction.confidence
    
    const priceDiff = prediction.price - currentPrice
    const priceChange = (priceDiff / currentPrice) * 100
    
    if (action === 'buy' && priceChange > 2) {
      score += Math.min(20, priceChange * 3)
    } else if (action === 'sell' && priceChange < -1) {
      score += Math.min(20, Math.abs(priceChange) * 3)
    }
    
    if (riskAssessment.isOverexposed) score -= 30
    if (riskAssessment.riskCapacity < 5000) score -= 15
    
    return Math.min(100, Math.max(0, score))
  }

  // Generate quick suggestions
  const generateQuickBidSuggestions = () => {
    const newSuggestions = []
    const currentPrice = marketData.currentPrice
    const currentHour = new Date().getHours()
    const riskAssessment = assessPortfolioRisk()
    
    for (let hour = currentHour; hour < currentHour + 4; hour++) {
      const actualHour = hour % 24
      const prediction = predictPriceMovement(actualHour, currentPrice)
      const priceDiff = prediction.price - currentPrice
      const priceChangePercent = (priceDiff / currentPrice) * 100
      
      const baseSize = analysisMode === 'conservative' ? 50 : 
                      analysisMode === 'moderate' ? 100 : 150
      const confidenceMultiplier = prediction.confidence / 100
      
      // BUY opportunities
      if (priceChangePercent > 3 && !riskAssessment.isOverexposed) {
        const suggestedQuantity = Math.floor(baseSize * confidenceMultiplier)
        const score = scoreOpportunity(prediction, currentPrice, 'buy', riskAssessment)
        
        if (score > 65 && suggestedQuantity > 20) {
          newSuggestions.push({
            id: `buy-${actualHour}`,
            hour: actualHour,
            action: 'buy',
            suggestedPrice: Number((prediction.price * 0.97).toFixed(2)),
            suggestedQuantity,
            expectedProfit: Number((priceDiff * suggestedQuantity * 0.85).toFixed(2)),
            confidence: Number(score.toFixed(1)),
            reasoning: `Expected ${priceChangePercent.toFixed(1)}% price increase at ${actualHour}:00`,
            riskLevel: score > 80 ? 'Low' : score > 65 ? 'Medium' : 'High',
            marketFactors: ['Peak Hours', 'High Demand'],
            timeline: `${Math.abs(actualHour - currentHour)}h ahead`
          })
        }
      }
      
      // SELL opportunities
      if (priceChangePercent < -2 || (portfolio.positions.length > 0 && priceChangePercent > 4)) {
        const suggestedQuantity = Math.floor(baseSize * confidenceMultiplier)
        const score = scoreOpportunity(prediction, currentPrice, 'sell', riskAssessment)
        
        if (score > 60 && suggestedQuantity > 20) {
          const isProfit = portfolio.positions.length > 0 && priceChangePercent > 0
          newSuggestions.push({
            id: `sell-${actualHour}`,
            hour: actualHour,
            action: 'sell',
            suggestedPrice: Number((prediction.price * 1.03).toFixed(2)),
            suggestedQuantity,
            expectedProfit: Number((isProfit ? priceDiff : -priceDiff) * suggestedQuantity * 0.8).toFixed(2),
            confidence: Number(score.toFixed(1)),
            reasoning: isProfit ? 
              `Take profits: ${priceChangePercent.toFixed(1)}% gain expected` :
              `Price drop expected: ${Math.abs(priceChangePercent).toFixed(1)}%`,
            riskLevel: score > 80 ? 'Low' : score > 60 ? 'Medium' : 'High',
            marketFactors: ['Price Movement', 'Market Timing'],
            timeline: `${Math.abs(actualHour - currentHour)}h ahead`
          })
        }
      }
    }
    
    return newSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
  }

  useEffect(() => {
    setSuggestions(generateQuickBidSuggestions())
  }, [marketData, portfolio, analysisMode])

  return (
    <div>
      {/* Analysis Mode Selector */}
      <div style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h4 style={{ margin: '0 0 15px 0' }}>🎯 Analysis Settings</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { key: 'conservative', label: '🛡️ Conservative', desc: 'Lower risk, stable returns' },
            { key: 'moderate', label: '⚖️ Moderate', desc: 'Balanced risk-reward' },
            { key: 'aggressive', label: '🚀 Aggressive', desc: 'Higher risk, max returns' }
          ].map(mode => (
            <button
              key={mode.key}
              onClick={() => setAnalysisMode(mode.key)}
              style={{
                flex: 1,
                padding: '12px',
                border: `2px solid ${analysisMode === mode.key ? '#1890ff' : '#d9d9d9'}`,
                backgroundColor: analysisMode === mode.key ? '#1890ff' : 'white',
                color: analysisMode === mode.key ? 'white' : '#333',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              <div>{mode.label}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Market Overview */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3>📊 Market Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
              ${marketData.currentPrice?.toFixed(2) || '45.20'}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>Current Price</div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
              {(marketConditions.renewableRatio * 100).toFixed(0)}%
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>Green Energy</div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fa8c16' }}>
              {marketConditions.gridStress.toUpperCase()}
            </div>
            <div style={{ color: '#666', fontSize: '12px' }}>Grid Status</div>
          </div>
        </div>
      </div>

      {/* Main Suggestions */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2>📈 Market Insights & Suggestions</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Real-time market analysis and trading opportunities based on grid conditions, 
          demand patterns, and portfolio optimization.
        </p>

        {suggestions.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {suggestions.map(suggestion => (
              <div key={suggestion.id} style={{
                position: 'relative',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                border: `2px solid ${suggestion.action === 'buy' ? '#52c41a' : '#ff4d4f'}`,
                overflow: 'hidden'
              }}>
                {/* Score Badge */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  backgroundColor: suggestion.confidence > 80 ? '#52c41a' : 
                                 suggestion.confidence > 65 ? '#fa8c16' : '#ff4d4f',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {suggestion.confidence.toFixed(0)}% Score
                </div>

                <div style={{ padding: '25px' }}>
                  <h4 style={{
                    margin: '0 0 12px 0',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: suggestion.action === 'buy' ? '#52c41a' : '#ff4d4f'
                  }}>
                    {suggestion.action === 'buy' ? '📈 BUY SIGNAL' : '📉 SELL SIGNAL'} - Hour {suggestion.hour}:00
                    <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
                      ({suggestion.timeline || 'Now'})
                    </span>
                  </h4>
                  <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
                    {suggestion.reasoning}
                  </p>
                  
                  {/* Market Factors */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    {(suggestion.marketFactors || []).map((factor, idx) => (
                      <span key={idx} style={{
                        backgroundColor: '#1890ff',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {factor}
                      </span>
                    ))}
                  </div>
                
                  {/* Trade Details */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '15px', 
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '12px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                        ${suggestion.suggestedPrice}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Price</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#722ed1' }}>
                        {suggestion.suggestedQuantity} MWh
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Quantity</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        color: parseFloat(suggestion.expectedProfit) >= 0 ? '#52c41a' : '#ff4d4f' 
                      }}>
                        ${Math.abs(parseFloat(suggestion.expectedProfit)).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Profit</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 'bold', 
                        color: suggestion.riskLevel === 'Low' ? '#52c41a' : 
                               suggestion.riskLevel === 'Medium' ? '#fa8c16' : '#ff4d4f'
                      }}>
                        {suggestion.riskLevel}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Risk</div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onApplySuggestion(suggestion)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      backgroundColor: suggestion.action === 'buy' ? '#52c41a' : '#ff4d4f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    Apply This Suggestion
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '50px',
            color: '#999',
            backgroundColor: '#f8f8f8',
            borderRadius: '12px'
          }}>
            <h3>📊 Analyzing Market Conditions...</h3>
            <p>Processing current market data for trading opportunities.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BidSuggestions
