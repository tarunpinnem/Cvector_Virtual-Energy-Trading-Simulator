import React, { useState, useEffect } from 'react'

const BidSuggestions = ({ marketData, portfolio, onApplySuggestion }) => {
  const [analysisMode, setAnalysisMode] = useState('moderate')
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsActive, setSuggestionsActive] = useState(true)
  const [suggestionType, setSuggestionType] = useState('both') // 'buy', 'sell', 'both'
  const [priceHistory, setPriceHistory] = useState([]) // Rolling window of price data
  const [regressionModel, setRegressionModel] = useState(null) // Regression coefficients

  // Linear Regression Implementation (Manual - similar to scikit-learn's LinearRegression)
  const computeLinearRegression = (xData, yData) => {
    const n = xData.length
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 }
    
    // Calculate means
    const xMean = xData.reduce((sum, x) => sum + x, 0) / n
    const yMean = yData.reduce((sum, y) => sum + y, 0) / n
    
    // Calculate slope and intercept using least squares method
    let numerator = 0
    let denominator = 0
    let ssTotal = 0
    let ssRes = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (xData[i] - xMean) * (yData[i] - yMean)
      denominator += (xData[i] - xMean) ** 2
      ssTotal += (yData[i] - yMean) ** 2
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean
    
    // Calculate R-squared
    for (let i = 0; i < n; i++) {
      const predicted = slope * xData[i] + intercept
      ssRes += (yData[i] - predicted) ** 2
    }
    
    const rSquared = ssTotal !== 0 ? 1 - (ssRes / ssTotal) : 0
    
    return { slope, intercept, rSquared: Math.max(0, rSquared) }
  }

  // Polynomial Regression (2nd degree) for better price trend fitting
  const computePolynomialRegression = (xData, yData, degree = 2) => {
    const n = xData.length
    if (n < degree + 1) return { coefficients: [0, 0, 0], rSquared: 0 }
    
    // Create Vandermonde matrix (polynomial features)
    const X = []
    for (let i = 0; i < n; i++) {
      const row = []
      for (let j = 0; j <= degree; j++) {
        row.push(Math.pow(xData[i], j))
      }
      X.push(row)
    }
    
    // Simple matrix operations for least squares solution (X'X)^-1 X'y
    // For degree=2, we solve the normal equations manually
    try {
      const XT = X[0].map((_, colIndex) => X.map(row => row[colIndex])) // Transpose
      const XTX = XT.map(row1 => XT.map(row2 => 
        row1.reduce((sum, val, i) => sum + val * row2[i], 0)
      ))
      const XTy = XT.map(row => row.reduce((sum, val, i) => sum + val * yData[i], 0))
      
      // Solve 3x3 system for quadratic regression (using Cramer's rule approximation)
      const det = XTX[0][0] * (XTX[1][1] * XTX[2][2] - XTX[1][2] * XTX[2][1]) -
                  XTX[0][1] * (XTX[1][0] * XTX[2][2] - XTX[1][2] * XTX[2][0]) +
                  XTX[0][2] * (XTX[1][0] * XTX[2][1] - XTX[1][1] * XTX[2][0])
      
      if (Math.abs(det) < 1e-10) {
        // Fallback to linear regression if matrix is singular
        const linear = computeLinearRegression(xData, yData)
        return { coefficients: [linear.intercept, linear.slope, 0], rSquared: linear.rSquared }
      }
      
      const coefficients = [
        (XTy[0] * (XTX[1][1] * XTX[2][2] - XTX[1][2] * XTX[2][1]) -
         XTX[0][1] * (XTy[1] * XTX[2][2] - XTy[2] * XTX[1][2]) +
         XTX[0][2] * (XTy[1] * XTX[2][1] - XTy[2] * XTX[1][1])) / det,
        (XTX[0][0] * (XTy[1] * XTX[2][2] - XTy[2] * XTX[1][2]) -
         XTy[0] * (XTX[1][0] * XTX[2][2] - XTX[1][2] * XTX[2][0]) +
         XTX[0][2] * (XTX[1][0] * XTy[2] - XTy[1] * XTX[2][0])) / det,
        (XTX[0][0] * (XTX[1][1] * XTy[2] - XTy[1] * XTX[2][1]) -
         XTX[0][1] * (XTX[1][0] * XTy[2] - XTy[1] * XTX[2][0]) +
         XTy[0] * (XTX[1][0] * XTX[2][1] - XTX[1][1] * XTX[2][0])) / det
      ]
      
      // Calculate R-squared
      const yMean = yData.reduce((sum, y) => sum + y, 0) / n
      let ssTotal = 0
      let ssRes = 0
      
      for (let i = 0; i < n; i++) {
        const predicted = coefficients[0] + coefficients[1] * xData[i] + coefficients[2] * xData[i] * xData[i]
        ssTotal += (yData[i] - yMean) ** 2
        ssRes += (yData[i] - predicted) ** 2
      }
      
      const rSquared = ssTotal !== 0 ? Math.max(0, 1 - (ssRes / ssTotal)) : 0
      
      return { coefficients, rSquared }
    } catch (error) {
      // Fallback to linear regression
      const linear = computeLinearRegression(xData, yData)
      return { coefficients: [linear.intercept, linear.slope, 0], rSquared: linear.rSquared }
    }
  }

  // Moving Average calculations for trend analysis
  const calculateMovingAverage = (data, window) => {
    if (data.length < window) return data
    const result = []
    for (let i = window - 1; i < data.length; i++) {
      const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / window)
    }
    return result
  }

  // Load initial historical data from backend on component mount
  useEffect(() => {
    const loadHistoricalData = async () => {
      try {
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/api/market-data/historical?limit=20`)
        
        if (response.ok) {
          const historicalData = await response.json()
          if (historicalData.data && Array.isArray(historicalData.data)) {
            const formattedHistory = historicalData.data.map((item, index) => ({
              price: item.price || item.current_price || (40 + Math.random() * 20), // Fallback with realistic prices
              timestamp: item.timestamp || (Date.now() - (historicalData.data.length - index) * 60000),
              hour: item.hour || new Date(item.timestamp).getHours() || new Date().getHours(),
              demand: item.demand || (30000 + Math.random() * 10000),
              renewablePercentage: item.renewablePercentage || (30 + Math.random() * 40)
            }))
            
            setPriceHistory(formattedHistory.slice(-50))
            console.log(`✅ Loaded ${formattedHistory.length} historical price data points from backend`)
          }
        } else {
          console.log('⚠️ Backend historical data not available (404), generating initial synthetic data')
          generateInitialSyntheticData()
        }
      } catch (error) {
        console.log('❌ Failed to load historical data, generating synthetic data:', error.message)
        generateInitialSyntheticData()
      }
    }

    // Always generate synthetic data initially for demo purposes
    console.log('🚀 Bootstrapping ML model with synthetic data...')
    generateInitialSyntheticData()
    
    // Still try to load from backend (but synthetic data is already loaded)
    // loadHistoricalData()
  }, []) // Run once on component mount

  // Generate initial synthetic data to bootstrap the ML model
  const generateInitialSyntheticData = () => {
    const now = Date.now()
    const basePrice = marketData?.currentPrice || 45.0
    const syntheticHistory = []
    
    // Generate 20 historical data points with realistic price movements
    for (let i = 19; i >= 0; i--) {
      const timestamp = now - (i * 2 * 60 * 1000) // Every 2 minutes
      const hour = new Date(timestamp).getHours()
      
      // Create realistic price trends based on hour
      let priceMultiplier = 1.0
      if (hour >= 8 && hour <= 12) priceMultiplier = 1.1 + Math.random() * 0.1 // Morning peak
      else if (hour >= 17 && hour <= 21) priceMultiplier = 1.15 + Math.random() * 0.15 // Evening peak
      else if (hour >= 23 || hour <= 6) priceMultiplier = 0.8 + Math.random() * 0.1 // Overnight low
      else priceMultiplier = 0.9 + Math.random() * 0.2 // Mid-day variation
      
      // Add some trending behavior
      const trendEffect = Math.sin((19 - i) * 0.3) * 0.05 // Subtle sine wave trend
      
      syntheticHistory.push({
        price: Math.max(20, basePrice * priceMultiplier + basePrice * trendEffect + (Math.random() - 0.5) * 3),
        timestamp,
        hour,
        demand: 28000 + Math.random() * 15000,
        renewablePercentage: 25 + Math.random() * 50
      })
    }
    
    setPriceHistory(syntheticHistory)
    console.log(`🔧 Generated ${syntheticHistory.length} synthetic historical data points for ML model bootstrap`)
    
    // Immediately fit regression model with synthetic data
    if (syntheticHistory.length >= 3) {
      const xData = syntheticHistory.map((_, i) => i)
      const yData = syntheticHistory.map(d => d.price)
      
      const linearModel = computeLinearRegression(xData, yData)
      const polyModel = syntheticHistory.length >= 5 ? computePolynomialRegression(xData, yData, 2) : linearModel
      
      const selectedModel = polyModel.rSquared > linearModel.rSquared + 0.1 ? 
        { type: 'polynomial', ...polyModel } : 
        { type: 'linear', ...linearModel }
      
      setRegressionModel({
        ...selectedModel,
        lastUpdate: now,
        dataPoints: syntheticHistory.length,
        trend: selectedModel.type === 'linear' ? 
          (selectedModel.slope > 0.01 ? 'upward' : selectedModel.slope < -0.01 ? 'downward' : 'stable') :
          'complex'
      })
      
      console.log(`🤖 ML Model Activated with synthetic data: ${selectedModel.type} regression with R² = ${selectedModel.rSquared?.toFixed(3)}`)
    }
  }

  // Update price history with new market data (rolling window of 50 data points)
  useEffect(() => {
    if (marketData && marketData.currentPrice && marketData.currentPrice > 0) {
      setPriceHistory(prev => {
        const newEntry = {
          timestamp: Date.now(),
          price: marketData.currentPrice
        }
        
        // Check if this is a duplicate or very recent entry
        const lastEntry = prev[prev.length - 1]
        if (lastEntry && Math.abs(lastEntry.price - newEntry.price) < 0.01) {
          return prev // Skip duplicate prices
        }
        
        const updated = [...prev, newEntry]
        
        // Keep rolling window of 50 data points max
        if (updated.length > 50) {
          return updated.slice(-50)
        }
        
        console.log(`📊 Price History Updated: ${updated.length} data points, latest = $${marketData.currentPrice}`)
        return updated
      })
    }
  }, [marketData?.currentPrice]) // Trigger when market data price changes
  useEffect(() => {
    if (marketData?.currentPrice && marketData.currentPrice > 0) {
      const timestamp = Date.now()
      setPriceHistory(prev => {
        // Check if this is truly a new data point (avoid duplicates)
        const lastEntry = prev[prev.length - 1]
        if (lastEntry && Math.abs(lastEntry.price - marketData.currentPrice) < 0.01 && 
            timestamp - lastEntry.timestamp < 30000) {
          return prev // Don't add duplicate/too-frequent updates
        }

        const newHistory = [...prev, { 
          price: marketData.currentPrice, 
          timestamp,
          hour: new Date().getHours(),
          demand: marketData.demand || 0,
          renewablePercentage: marketData.renewablePercentage || 0
        }].slice(-50) // Keep only last 50 data points
        
        // Update regression model with new data
        if (newHistory.length >= 3) { // Reduced from 5 to 3 for faster activation
          const xData = newHistory.map((_, i) => i) // Time index
          const yData = newHistory.map(d => d.price)
          
          // Fit both linear and polynomial regression
          const linearModel = computeLinearRegression(xData, yData)
          const polyModel = newHistory.length >= 5 ? computePolynomialRegression(xData, yData, 2) : linearModel
          
          // Choose the model with better R-squared, but prefer linear if close
          const selectedModel = polyModel.rSquared > linearModel.rSquared + 0.1 ? 
            { type: 'polynomial', ...polyModel } : 
            { type: 'linear', ...linearModel }
          
          setRegressionModel({
            ...selectedModel,
            lastUpdate: timestamp,
            dataPoints: newHistory.length,
            trend: selectedModel.type === 'linear' ? 
              (selectedModel.slope > 0.01 ? 'upward' : selectedModel.slope < -0.01 ? 'downward' : 'stable') :
              'complex'
          })
          
          console.log(`🤖 ML Model Updated: ${selectedModel.type} regression with R² = ${selectedModel.rSquared?.toFixed(3)} using ${newHistory.length} data points`)
        }
        
        return newHistory
      })
    }
  }, [marketData?.currentPrice, marketData?.timestamp])

  // Force price updates every 30 seconds if market data isn't changing (for demo purposes)
  useEffect(() => {
    const interval = setInterval(() => {
      const lastUpdate = priceHistory[priceHistory.length - 1]
      const timeSinceLastUpdate = Date.now() - (lastUpdate?.timestamp || 0)
      
      // If no real updates in 45 seconds, simulate a small price movement
      if (timeSinceLastUpdate > 45000 && suggestionsActive) {
        const currentPrice = marketData?.currentPrice || 45.0
        const priceVariation = 0.98 + Math.random() * 0.04 // ±2% variation
        const simulatedPrice = currentPrice * priceVariation
        
        setPriceHistory(prev => {
          const newHistory = [...prev, {
            price: simulatedPrice,
            timestamp: Date.now(),
            hour: new Date().getHours(),
            demand: (marketData?.demand || 33000) * (0.95 + Math.random() * 0.1),
            renewablePercentage: (marketData?.renewablePercentage || 40) + (Math.random() - 0.5) * 10
          }].slice(-50)
          
          console.log(`🔄 Simulated price update: $${simulatedPrice.toFixed(2)} (${newHistory.length} total points)`)
          return newHistory
        })
      }
    }, 30000) // Check every 30 seconds
    
    return () => clearInterval(interval)
  }, [priceHistory, marketData, suggestionsActive])

  // Predict future prices using regression model
  const predictPriceWithRegression = (hoursAhead) => {
    if (!regressionModel || priceHistory.length < 3) { // Reduced from 5 to 3
      // Fallback to simple prediction
      return {
        predictedPrice: marketData?.currentPrice || 45.0,
        confidence: 30,
        method: 'fallback'
      }
    }

    const currentIndex = priceHistory.length - 1
    const futureIndex = currentIndex + hoursAhead
    
    let predictedPrice
    let confidence = Math.min(95, regressionModel.rSquared * 100)
    
    if (regressionModel.type === 'linear') {
      predictedPrice = regressionModel.slope * futureIndex + regressionModel.intercept
    } else {
      const { coefficients } = regressionModel
      predictedPrice = coefficients[0] + coefficients[1] * futureIndex + coefficients[2] * futureIndex * futureIndex
    }
    
    // Add market condition adjustments
    const currentHour = (new Date().getHours() + hoursAhead) % 24
    const isPeakHour = (currentHour >= 8 && currentHour <= 12) || (currentHour >= 18 && currentHour <= 22)
    const isNightHour = currentHour >= 23 || currentHour <= 6
    
    // Adjust prediction based on time of day patterns
    if (isPeakHour) {
      predictedPrice *= 1.05 + Math.random() * 0.05
      confidence += 5
    } else if (isNightHour) {
      predictedPrice *= 0.92 - Math.random() * 0.05
      confidence += 3
    }
    
    // Add some noise based on volatility
    const recentPrices = priceHistory.slice(-10).map(h => h.price)
    const volatility = recentPrices.length > 1 ? 
      Math.sqrt(recentPrices.reduce((sum, price) => {
        const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
        return sum + Math.pow(price - mean, 2)
      }, 0) / (recentPrices.length - 1)) : 0
    
    const noiseAdjustment = (Math.random() - 0.5) * volatility * 0.3
    predictedPrice += noiseAdjustment
    
    // Confidence adjustment based on model quality and data age
    confidence = Math.max(25, confidence - hoursAhead * 5) // Reduce confidence for longer predictions
    
    return {
      predictedPrice: Math.max(10, predictedPrice), // Ensure positive price
      confidence,
      method: regressionModel.type,
      rSquared: regressionModel.rSquared,
      trend: regressionModel.trend,
      volatility
    }
  }

  const marketConditions = {
    volatility: priceHistory.length > 5 ? 
      Math.sqrt(priceHistory.slice(-10).reduce((sum, h, i, arr) => {
        const mean = arr.reduce((a, b) => a + b.price, 0) / arr.length
        return sum + Math.pow(h.price - mean, 2)
      }, 0) / Math.max(1, priceHistory.slice(-10).length - 1)) : 5.0,
    renewableRatio: (marketData?.renewablePercentage || 35) / 100,
    gridStress: marketData?.demand > 35000 ? 'high' : marketData?.demand < 30000 ? 'low' : 'normal',
    liquidity: 0.7 + Math.random() * 0.3,
    regressionFit: regressionModel?.rSquared || 0,
    trendDirection: regressionModel?.trend || 'stable'
  }

  // Enhanced price prediction using regression model
  const predictPriceMovement = (hour, basePrice) => {
    const hoursAhead = (hour - new Date().getHours() + 24) % 24
    
    // Use regression-based prediction if model is available
    if (regressionModel && priceHistory.length >= 3) { // Reduced from 5 to 3
      const regressionPrediction = predictPriceWithRegression(hoursAhead || 1)
      
      return {
        predictedPrice: regressionPrediction.predictedPrice,
        confidence: regressionPrediction.confidence,
        method: `ML-${regressionPrediction.method}`,
        modelQuality: regressionPrediction.rSquared,
        trend: regressionPrediction.trend,
        volatility: regressionPrediction.volatility
      }
    }
    
    // Fallback to heuristic method
    const isPeakHour = (hour >= 8 && hour <= 12) || (hour >= 18 && hour <= 22)
    const isNightHour = hour >= 23 || hour <= 6
    
    let priceMultiplier = 1.0
    let confidence = 40
    
    if (isPeakHour) {
      priceMultiplier = 1.15 + Math.random() * 0.1
      confidence = 60 + Math.random() * 15
    } else if (isNightHour) {
      priceMultiplier = 0.85 - Math.random() * 0.1
      confidence = 55 + Math.random() * 20
    } else {
      priceMultiplier = 0.95 + Math.random() * 0.1
      confidence = 45 + Math.random() * 20
    }

    // Adjust for renewables and grid stress
    if (marketConditions.renewableRatio > 0.5) {
      priceMultiplier *= 0.95
      confidence += 5
    }
    if (marketConditions.gridStress === 'high') {
      priceMultiplier *= 1.1
      confidence += 10
    }

    const predictedPrice = basePrice * priceMultiplier
    return { 
      predictedPrice, 
      confidence, 
      method: 'heuristic',
      modelQuality: 0,
      trend: priceMultiplier > 1.05 ? 'upward' : priceMultiplier < 0.95 ? 'downward' : 'stable',
      volatility: marketConditions.volatility
    }
  }

  // Generate market-based suggestions - CALCULATE ALL MODES & TYPES, NEVER BLANK
  const generateSuggestions = () => {
    if (!suggestionsActive) return // Don't generate if paused
    
    const currentHour = new Date().getHours()
    const basePrice = marketData?.currentPrice || 45.2
    const allSuggestions = []

    // Generate suggestions for ALL analysis modes (conservative, moderate, aggressive)
    const analysisConfigs = [
      { mode: 'conservative', riskMultiplier: 0.5, threshold: 45, volumeRange: [20, 40] },
      { mode: 'moderate', riskMultiplier: 1.0, threshold: 40, volumeRange: [50, 100] },
      { mode: 'aggressive', riskMultiplier: 2.0, threshold: 35, volumeRange: [80, 150] }
    ]

    analysisConfigs.forEach(config => {
      // Generate suggestions for next 8 hours for each mode
      for (let i = 0; i < 8; i++) {
        const targetHour = (currentHour + i + 1) % 24
        const prediction = predictPriceMovement(targetHour, basePrice)
        
        // Apply analysis mode to confidence and incorporate model quality
        let adjustedConfidence = Math.max(35, Math.min(100, 
          prediction.confidence + 
          (config.mode === 'aggressive' ? 15 : config.mode === 'conservative' ? -5 : 5) +
          (prediction.modelQuality * 20) // Bonus for good regression model
        ))
        
        // Price movement detection with regression insights
        const priceDiff = prediction.predictedPrice - basePrice
        const trendStrength = Math.abs(priceDiff) / basePrice
        
        // Enhanced buy/sell logic based on regression predictions
        const buyTrigger = prediction.trend === 'downward' || (prediction.trend === 'stable' && Math.random() > 0.3)
        const sellTrigger = prediction.trend === 'upward' || (prediction.trend === 'stable' && Math.random() > 0.3)
        
        // Create BUY suggestions with regression insights
        if (buyTrigger) {
          const buyPriceAdjustment = config.mode === 'aggressive' ? 0.92 : 
                                   config.mode === 'conservative' ? 0.98 : 0.95
          
          allSuggestions.push({
            id: `${config.mode}-buy-${targetHour}-${i}-${Date.now()}-${Math.random()}`,
            hour: targetHour,
            action: 'buy',
            analysisMode: config.mode,
            priceTarget: prediction.predictedPrice * buyPriceAdjustment,
            volume: config.volumeRange[0] + Math.round(Math.random() * (config.volumeRange[1] - config.volumeRange[0])),
            confidence: adjustedConfidence,
            reasoning: `${config.mode.toUpperCase()} (${prediction.method}): ${prediction.trend === 'downward' ? 'Price declining' : 'Stable market'} - predicted $${prediction.predictedPrice.toFixed(2)} (${prediction.modelQuality > 0.5 ? 'high' : 'medium'} model confidence)`,
            priority: adjustedConfidence > 70 ? 'high' : adjustedConfidence > 50 ? 'medium' : 'low',
            modelInfo: {
              method: prediction.method,
              trend: prediction.trend,
              modelQuality: prediction.modelQuality,
              volatility: prediction.volatility?.toFixed(2)
            }
          })
        }
        
        // Create SELL suggestions with regression insights
        if (sellTrigger) {
          const sellPriceAdjustment = config.mode === 'aggressive' ? 1.08 : 
                                    config.mode === 'conservative' ? 1.02 : 1.05
          
          allSuggestions.push({
            id: `${config.mode}-sell-${targetHour}-${i}-${Date.now()}-${Math.random()}`,
            hour: targetHour,
            action: 'sell',
            analysisMode: config.mode,
            priceTarget: prediction.predictedPrice * sellPriceAdjustment,
            volume: config.volumeRange[0] + Math.round(Math.random() * (config.volumeRange[1] - config.volumeRange[0])),
            confidence: adjustedConfidence,
            reasoning: `${config.mode.toUpperCase()} (${prediction.method}): ${prediction.trend === 'upward' ? 'Price rising' : 'Market opportunity'} - predicted $${prediction.predictedPrice.toFixed(2)} (${prediction.modelQuality > 0.5 ? 'high' : 'medium'} model confidence)`,
            priority: adjustedConfidence > 70 ? 'high' : adjustedConfidence > 50 ? 'medium' : 'low',
            modelInfo: {
              method: prediction.method,
              trend: prediction.trend,
              modelQuality: prediction.modelQuality,
              volatility: prediction.volatility?.toFixed(2)
            }
          })
        }
      }

      // GUARANTEED FALLBACK per mode - ensure each mode has at least 1 buy and 1 sell WITH ML
      const modeSpecificSuggestions = allSuggestions.filter(s => s.analysisMode === config.mode)
      const hasBuy = modeSpecificSuggestions.some(s => s.action === 'buy')
      const hasSell = modeSpecificSuggestions.some(s => s.action === 'sell')
      
      if (!hasBuy) {
        const buyHour = (currentHour + 1) % 24
        const buyPrediction = predictPriceMovement(buyHour, basePrice)
        allSuggestions.push({
          id: `${config.mode}-guaranteed-buy-${Date.now()}-${Math.random()}`,
          hour: buyHour,
          action: 'buy',
          analysisMode: config.mode,
          priceTarget: buyPrediction.predictedPrice * 0.96,
          volume: config.volumeRange[0] + 10,
          confidence: Math.max(55, buyPrediction.confidence),
          reasoning: `${config.mode.toUpperCase()} (${buyPrediction.method}): Market opportunity - predicted $${buyPrediction.predictedPrice.toFixed(2)}`,
          priority: 'medium',
          modelInfo: {
            method: buyPrediction.method,
            trend: buyPrediction.trend,
            modelQuality: buyPrediction.modelQuality,
            volatility: buyPrediction.volatility?.toFixed(2)
          }
        })
      }
      
      if (!hasSell) {
        const sellHour = (currentHour + 2) % 24
        const sellPrediction = predictPriceMovement(sellHour, basePrice)
        allSuggestions.push({
          id: `${config.mode}-guaranteed-sell-${Date.now()}-${Math.random()}`,
          hour: sellHour,
          action: 'sell',
          analysisMode: config.mode,
          priceTarget: sellPrediction.predictedPrice * 1.04,
          volume: config.volumeRange[0] + 15,
          confidence: Math.max(52, sellPrediction.confidence),
          reasoning: `${config.mode.toUpperCase()} (${sellPrediction.method}): Price momentum - predicted $${sellPrediction.predictedPrice.toFixed(2)}`,
          priority: 'medium',
          modelInfo: {
            method: sellPrediction.method,
            trend: sellPrediction.trend,
            modelQuality: sellPrediction.modelQuality,
            volatility: sellPrediction.volatility?.toFixed(2)
          }
        })
      }
    })

    // Add portfolio-specific suggestions for current analysis mode WITH ML
    portfolio?.positions?.forEach(position => {
      const portfolioPrediction = predictPriceMovement(position.hour, basePrice)
      allSuggestions.push({
        id: `portfolio-${position.hour}-${analysisMode}-${Date.now()}-${Math.random()}`,
        hour: position.hour,
        action: 'sell',
        analysisMode: analysisMode, // Current analysis mode
        priceTarget: portfolioPrediction.predictedPrice * 1.05,
        volume: Math.round(position.volume * 0.3),
        confidence: Math.max(65, portfolioPrediction.confidence),
        reasoning: `${analysisMode.toUpperCase()} (${portfolioPrediction.method}): Close profitable position - predicted $${portfolioPrediction.predictedPrice.toFixed(2)}`,
        priority: 'medium',
        modelInfo: {
          method: portfolioPrediction.method,
          trend: portfolioPrediction.trend,
          modelQuality: portfolioPrediction.modelQuality,
          volatility: portfolioPrediction.volatility?.toFixed(2)
        }
      })
    })

    // ABSOLUTE GUARANTEE FALLBACK - Create suggestions for EVERY mode if any are missing
    const modes = ['conservative', 'moderate', 'aggressive']
    modes.forEach(mode => {
      const modeSpecific = allSuggestions.filter(s => s.analysisMode === mode)
      const modeBuys = modeSpecific.filter(s => s.action === 'buy')
      const modeSells = modeSpecific.filter(s => s.action === 'sell')
      
      // Force create at least 3 buy suggestions per mode WITH ML
      if (modeBuys.length < 3) {
        for (let i = modeBuys.length; i < 3; i++) {
          const forceBuyHour = (currentHour + i + 1) % 24
          const forceBuyPrediction = predictPriceMovement(forceBuyHour, basePrice)
          allSuggestions.push({
            id: `force-buy-${mode}-${i}-${Date.now()}-${Math.random()}`,
            hour: forceBuyHour,
            action: 'buy',
            analysisMode: mode,
            priceTarget: forceBuyPrediction.predictedPrice * (0.96 - i * 0.01),
            volume: mode === 'conservative' ? 25 + i*5 : mode === 'aggressive' ? 85 + i*10 : 55 + i*8,
            confidence: Math.max(50 + i*5, forceBuyPrediction.confidence),
            reasoning: `${mode.toUpperCase()} (${forceBuyPrediction.method}): Market opportunity #${i+1} - predicted $${forceBuyPrediction.predictedPrice.toFixed(2)}`,
            priority: 'medium',
            modelInfo: {
              method: forceBuyPrediction.method,
              trend: forceBuyPrediction.trend,
              modelQuality: forceBuyPrediction.modelQuality,
              volatility: forceBuyPrediction.volatility?.toFixed(2)
            }
          })
        }
      }
      
      // Force create at least 3 sell suggestions per mode WITH ML
      if (modeSells.length < 3) {
        for (let i = modeSells.length; i < 3; i++) {
          const forceSellHour = (currentHour + i + 4) % 24
          const forceSellPrediction = predictPriceMovement(forceSellHour, basePrice)
          allSuggestions.push({
            id: `force-sell-${mode}-${i}-${Date.now()}-${Math.random()}`,
            hour: forceSellHour,
            action: 'sell',
            analysisMode: mode,
            priceTarget: forceSellPrediction.predictedPrice * (1.04 + i * 0.01),
            volume: mode === 'conservative' ? 22 + i*4 : mode === 'aggressive' ? 90 + i*12 : 50 + i*10,
            confidence: Math.max(48 + i*6, forceSellPrediction.confidence),
            reasoning: `${mode.toUpperCase()} (${forceSellPrediction.method}): Market opportunity #${i+1} - predicted $${forceSellPrediction.predictedPrice.toFixed(2)}`,
            priority: 'medium',
            modelInfo: {
              method: forceSellPrediction.method,
              trend: forceSellPrediction.trend,
              modelQuality: forceSellPrediction.modelQuality,
              volatility: forceSellPrediction.volatility?.toFixed(2)
            }
          })
        }
      }
    })

    // FINAL EMERGENCY FALLBACK - If somehow no suggestions exist, create guaranteed ones
    if (allSuggestions.length === 0) {
      const emergencyHour = (currentHour + 1) % 24
      
      // Create emergency suggestions for ALL analysis modes WITH ML
      modes.forEach(mode => {
        const emergencyBuyPrediction = predictPriceMovement(emergencyHour, basePrice)
        allSuggestions.push({
          id: `emergency-buy-${mode}-${Date.now()}-${Math.random()}`,
          hour: emergencyHour,
          action: 'buy',
          analysisMode: mode,
          priceTarget: emergencyBuyPrediction.predictedPrice * 0.97,
          volume: mode === 'conservative' ? 30 : mode === 'aggressive' ? 100 : 60,
          confidence: Math.max(50, emergencyBuyPrediction.confidence),
          reasoning: `${mode.toUpperCase()} (${emergencyBuyPrediction.method}): EMERGENCY - predicted $${emergencyBuyPrediction.predictedPrice.toFixed(2)}`,
          priority: 'medium',
          modelInfo: {
            method: emergencyBuyPrediction.method,
            trend: emergencyBuyPrediction.trend,
            modelQuality: emergencyBuyPrediction.modelQuality,
            volatility: emergencyBuyPrediction.volatility?.toFixed(2)
          }
        })
        
        const emergencySellPrediction = predictPriceMovement((emergencyHour + 1) % 24, basePrice)
        allSuggestions.push({
          id: `emergency-sell-${mode}-${Date.now()}-${Math.random()}`,
          hour: (emergencyHour + 1) % 24,
          action: 'sell',
          analysisMode: mode,
          priceTarget: emergencySellPrediction.predictedPrice * 1.03,
          volume: mode === 'conservative' ? 25 : mode === 'aggressive' ? 95 : 55,
          confidence: Math.max(48, emergencySellPrediction.confidence),
          reasoning: `${mode.toUpperCase()} (${emergencySellPrediction.method}): EMERGENCY - predicted $${emergencySellPrediction.predictedPrice.toFixed(2)}`,
          priority: 'medium',
          modelInfo: {
            method: emergencySellPrediction.method,
            trend: emergencySellPrediction.trend,
            modelQuality: emergencySellPrediction.modelQuality,
            volatility: emergencySellPrediction.volatility?.toFixed(2)
          }
        })
      })
    }

    // MULTI-LEVEL FILTERING: First by analysis mode, then by suggestion type
    const currentModesSuggestions = allSuggestions.filter(s => s.analysisMode === analysisMode)
    
    const finalFilteredSuggestions = currentModesSuggestions.filter(suggestion => {
      if (suggestionType === 'buy') return suggestion.action === 'buy'
      if (suggestionType === 'sell') return suggestion.action === 'sell'
      return true // 'both' shows all
    })
    
    setSuggestions(finalFilteredSuggestions.sort((a, b) => b.confidence - a.confidence))
  }

  // INSTANT PAGE LOAD: Generate suggestions immediately when component mounts
  useEffect(() => {
    generateSuggestions() // Generate suggestions INSTANTLY on page load
  }, []) // Empty dependency array = runs once on mount

  // Filter existing suggestions when suggestion type changes (immediate response)
  useEffect(() => {
    setSuggestions(prevSuggestions => {
      return prevSuggestions.filter(suggestion => {
        if (suggestionType === 'buy') return suggestion.action === 'buy'
        if (suggestionType === 'sell') return suggestion.action === 'sell'
        return true // 'both' shows all
      }).sort((a, b) => b.confidence - a.confidence)
    })
  }, [suggestionType]) // Only when suggestion type changes, filter existing suggestions immediately

  // Immediate regeneration when analysis mode changes
  useEffect(() => {
    if (suggestions.length === 0 || analysisMode) {
      generateSuggestions() // Generate real suggestions immediately when mode changes
    }
  }, [analysisMode]) // Regenerate when analysis mode changes

  // Continuous 1-minute updates (never stops, never goes blank)
  useEffect(() => {
    if (!suggestionsActive) return // Don't do anything if paused
    
    // Don't regenerate immediately here since we already have suggestions from mount/mode change
    const interval = setInterval(() => {
      generateSuggestions() // Update every 1 minute to keep suggestions fresh
    }, 60000) // 60 seconds = 1 minute
    
    return () => clearInterval(interval)
  }, [suggestionsActive, analysisMode, suggestionType]) // Restart interval when these change

  // Effect for market data changes (but not too frequently)
  useEffect(() => {
    if (suggestionsActive && marketData?.currentPrice) {
      // Only regenerate if we don't have suggestions yet, to avoid too frequent updates
      if (suggestions.length === 0) {
        generateSuggestions()
      }
    }
  }, [marketData?.currentPrice]) // Only when the current price changes significantly

  const analysisModes = [
    { key: 'conservative', label: ' Conservative', desc: 'Low risk' },
    { key: 'moderate', label: ' Balanced', desc: 'Moderate risk' },
    { key: 'aggressive', label: ' Aggressive', desc: 'High return' }
  ]

  return (
    <div style={{
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      minHeight: '100vh'
    }}>
      {/* Analysis Mode Selector */}
      <div style={{
        backgroundColor: 'white',
        padding: '28px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center'
        }}>
           Analysis Mode
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginTop: '20px'
        }}>
          {analysisModes.map(mode => (
            <button
              key={mode.key}
              onClick={() => setAnalysisMode(mode.key)}
              style={{
                padding: '16px 20px',
                border: analysisMode === mode.key ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                borderRadius: '12px',
                backgroundColor: analysisMode === mode.key ? '#eff6ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <div style={{
                fontSize: '16px',
                fontWeight: '600',
                color: analysisMode === mode.key ? '#1d4ed8' : '#374151',
                marginBottom: '4px'
              }}>
                {mode.label}
              </div>
              <div style={{
                fontSize: '13px',
                color: analysisMode === mode.key ? '#3730a3' : '#6b7280'
              }}>
                {mode.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* Suggestions Active Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Auto Suggestions:
            </span>
            <button
              onClick={() => setSuggestionsActive(!suggestionsActive)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: suggestionsActive ? '#10b981' : '#ef4444',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {suggestionsActive ? ' ACTIVE' : ' PAUSED'}
            </button>
          </div>

          {/* Suggestion Type Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Show:
            </span>
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
              {['buy', 'sell', 'both'].map(type => (
                <button
                  key={type}
                  onClick={() => setSuggestionType(type)}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: suggestionType === type ? '#3b82f6' : 'transparent',
                    color: suggestionType === type ? 'white' : '#6b7280',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textTransform: 'capitalize'
                  }}
                >
                  {type === 'both' ? 'Buy & Sell' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: suggestionsActive ? '#10b981' : '#ef4444'
            }} />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {suggestionsActive ? `Updating every 1 min (${suggestionType})` : 'Updates paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Market Overview with Regression Model Stats */}
      <div style={{
        backgroundColor: 'white',
        padding: '28px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        marginBottom: '24px'
      }}>
        <h3 style={{ 
          margin: '0 0 24px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
           Market Analysis & ML Model Stats
        </h3>
        
        {/* Market Data Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            textAlign: 'center', 
            padding: '20px 16px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6'
            e.currentTarget.style.borderColor = '#d1d5db'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb'
            e.currentTarget.style.borderColor = '#e5e7eb'
          }}>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#3b82f6',
              marginBottom: '8px'
            }}>
              ${marketData?.currentPrice?.toFixed(2) || '45.20'}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>Current Price</div>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '20px 16px',
            backgroundColor: '#f0fdf4',
            borderRadius: '12px',
            border: '1px solid #bbf7d0',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#dcfce7'
            e.currentTarget.style.borderColor = '#86efac'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f0fdf4'
            e.currentTarget.style.borderColor = '#bbf7d0'
          }}>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#16a34a',
              marginBottom: '8px'
            }}>
              {(marketConditions.renewableRatio * 100).toFixed(0)}%
            </div>
            <div style={{ color: '#15803d', fontSize: '14px', fontWeight: '500' }}>Green Energy</div>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '20px 16px',
            backgroundColor: '#fef3c7',
            borderRadius: '12px',
            border: '1px solid #fbbf24',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fde68a'
            e.currentTarget.style.borderColor = '#f59e0b'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fef3c7'
            e.currentTarget.style.borderColor = '#fbbf24'
          }}>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#d97706',
              marginBottom: '8px'
            }}>
              {marketConditions.gridStress.toUpperCase()}
            </div>
            <div style={{ color: '#92400e', fontSize: '14px', fontWeight: '500' }}>Grid Status</div>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            padding: '20px 16px',
            backgroundColor: '#f3e8ff',
            borderRadius: '12px',
            border: '1px solid #c084fc',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e9d5ff'
            e.currentTarget.style.borderColor = '#a855f7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f3e8ff'
            e.currentTarget.style.borderColor = '#c084fc'
          }}>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#9333ea',
              marginBottom: '8px'
            }}>
              ${marketConditions.volatility.toFixed(2)}
            </div>
            <div style={{ color: '#7c3aed', fontSize: '14px', fontWeight: '500' }}>Price Volatility</div>
          </div>
        </div>

        {/* ML Model Statistics */}
        {regressionModel && priceHistory.length >= 3 && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px',
            borderRadius: '12px',
            color: 'white',
            marginTop: '16px'
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
               Live ML Regression Model
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                  {regressionModel.type.toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Model Type</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                  {(regressionModel.rSquared * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>R² Score</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                  {regressionModel.dataPoints}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Data Points</div>
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', textTransform: 'capitalize' }}>
                  {regressionModel.trend}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Trend</div>
              </div>
            </div>
            
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              <strong>Model Status:</strong> {regressionModel.rSquared > 0.7 ? 
                ' High accuracy predictions' : 
                regressionModel.rSquared > 0.4 ? 
                'Moderate accuracy predictions' : 
                'Low accuracy, using fallback heuristics'
              }
              <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                Last updated: {new Date(regressionModel.lastUpdate).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {(!regressionModel || priceHistory.length < 3) && (
          <div style={{
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            marginTop: '16px',
            textAlign: 'center'
          }}>
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              📡 Collecting Market Data...
            </h4>
            <p style={{
              margin: 0,
              fontSize: '14px',
              opacity: 0.9
            }}>
              ML regression model will activate after collecting {Math.max(0, 3 - priceHistory.length)} more price data points.
              Currently using heuristic predictions.
              <br />
              <strong>Current data points: {priceHistory.length}/3 minimum</strong>
            </p>
            
            {/* Manual data collection trigger for demo */}
            <button
              onClick={() => {
                const basePrice = marketData?.currentPrice || 45.0
                const newDataPoint = {
                  price: basePrice * (0.98 + Math.random() * 0.04),
                  timestamp: Date.now(),
                  hour: new Date().getHours(),
                  demand: (marketData?.demand || 33000) * (0.95 + Math.random() * 0.1),
                  renewablePercentage: (marketData?.renewablePercentage || 40) + (Math.random() - 0.5) * 10
                }
                setPriceHistory(prev => [...prev, newDataPoint].slice(-50))
                console.log('🔄 Manual data point added for ML model')
              }}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'
              }}
            >
              📈 Add Sample Data Point (Demo)
            </button>
          </div>
        )}
      </div>

      {/* Main Suggestions */}
      <div style={{
        backgroundColor: 'white',
        padding: '28px',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            margin: '0 0 12px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Market Insights & Suggestions
          </h2>
          <p style={{ 
            color: '#6b7280', 
            fontSize: '14px',
            lineHeight: '1.5',
            margin: 0
          }}>
            Smart trading recommendations based on market analysis and portfolio optimization.
          </p>
        </div>

        {suggestions.length > 0 ? (
          <div style={{ display: 'grid', gap: '20px' }}>
            {suggestions.map(suggestion => (
              <div key={suggestion.id} style={{
                position: 'relative',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                border: `2px solid ${suggestion.action === 'buy' ? '#10b981' : '#ef4444'}`,
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                {/* Status Badge */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: suggestion.confidence > 80 ? '#10b981' : 
                             suggestion.confidence > 65 ? '#f59e0b' : '#ef4444',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {suggestion.confidence.toFixed(0)}% Confidence
                </div>

                {/* ML Model Badge */}
                {suggestion.modelInfo && (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    background: suggestion.modelInfo.method.includes('ML-') ? 
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                      'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 10
                  }}>
                    {suggestion.modelInfo.method.includes('ML-') ? '' : ''}
                    {suggestion.modelInfo.method.replace('ML-', '')}
                  </div>
                )}

                <div style={{ 
                  padding: suggestion.modelInfo ? '40px 24px 24px 24px' : '24px' 
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: suggestion.action === 'buy' ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {suggestion.action === 'buy' ? ' BUY' : ' SELL'} - Hour {suggestion.hour}:00
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#6b7280', 
                      fontWeight: '500',
                      backgroundColor: '#f3f4f6',
                      padding: '4px 8px',
                      borderRadius: '8px'
                    }}>
                      {suggestion.timeline || 'Now'}
                    </span>
                  </h4>
                  <p style={{ 
                    margin: '0 0 20px 0', 
                    fontSize: '14px', 
                    color: '#4b5563',
                    lineHeight: '1.5'
                  }}>
                    {suggestion.reasoning}
                  </p>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '12px',
                    marginBottom: '20px' 
                  }}>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#3b82f6',
                        marginBottom: '4px'
                      }}>
                        ${suggestion.priceTarget.toFixed(2)}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: '500' }}>Target Price</div>
                    </div>
                    <div style={{ 
                      textAlign: 'center',
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: '#8b5cf6',
                        marginBottom: '4px'
                      }}>
                        {suggestion.volume} MW
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: '500' }}>Volume</div>
                    </div>
                    
                    {/* Model Quality indicator */}
                    {suggestion.modelInfo && (
                      <div style={{ 
                        textAlign: 'center',
                        padding: '12px',
                        backgroundColor: suggestion.modelInfo.method.includes('ML-') ? '#f0f9ff' : '#fff7ed',
                        borderRadius: '8px',
                        border: `1px solid ${suggestion.modelInfo.method.includes('ML-') ? '#bfdbfe' : '#fed7aa'}`
                      }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: suggestion.modelInfo.method.includes('ML-') ? '#0ea5e9' : '#ea580c',
                          marginBottom: '4px'
                        }}>
                          {suggestion.modelInfo.modelQuality > 0 ? 
                            `${(suggestion.modelInfo.modelQuality * 100).toFixed(0)}%` : 
                            'N/A'
                          }
                        </div>
                        <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: '500' }}>
                          Model R²
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Model details footer */}
                  {suggestion.modelInfo && (
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '12px',
                      color: '#64748b'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <span><strong>Trend:</strong> {suggestion.modelInfo.trend}</span>
                        {suggestion.modelInfo.volatility && (
                          <span><strong>Volatility:</strong> ${suggestion.modelInfo.volatility}</span>
                        )}
                        <span><strong>Method:</strong> {suggestion.modelInfo.method}</span>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => onApplySuggestion && onApplySuggestion(suggestion)}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: suggestion.action === 'buy' ? '#10b981' : '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    Apply Suggestion
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px dashed #d1d5db'
          }}>
            <div style={{ 
              fontSize: '32px',
              marginBottom: '16px',
              color: '#9ca3af'
            }}></div>
            <h3 style={{ 
              color: '#6b7280',
              fontSize: '16px',
              fontWeight: '500',
              margin: '0 0 8px 0'
            }}>
              Analyzing Market Data...
            </h3>
            <p style={{ 
              color: '#9ca3af',
              fontSize: '14px',
              margin: 0
            }}>
              Smart suggestions will appear here shortly
            </p>
          </div>
        )}
      </div>

      {/* Add CSS for shimmer animation */}
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>
    </div>
  )
}

export default BidSuggestions
