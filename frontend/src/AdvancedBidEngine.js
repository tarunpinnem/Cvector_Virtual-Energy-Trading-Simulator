/**
 * Advanced Bid Suggestion Engine
 * Combines multiple ML-inspired techniques for better predictions
 */

class AdvancedBidEngine {
  constructor() {
    this.models = {
      priceForecaster: new PriceForecaster(),
      riskManager: new RiskManager(),
      portfolioOptimizer: new PortfolioOptimizer(),
      marketRegimeDetector: new MarketRegimeDetector()
    }
    
    this.historicalData = []
    this.modelWeights = { momentum: 0.3, meanReversion: 0.2, fundamental: 0.3, technical: 0.2 }
  }

  /**
   * Generate sophisticated bid suggestions using ensemble methods
   */
  generateSuggestions(marketData, portfolio, preferences) {
    // 1. Detect current market regime
    const regime = this.models.marketRegimeDetector.detectRegime(marketData)
    
    // 2. Multi-horizon price forecasting
    const forecasts = this.generateEnsembleForecasts(marketData, regime)
    
    // 3. Risk-adjusted position sizing
    const riskMetrics = this.models.riskManager.assessRisk(portfolio, marketData)
    
    // 4. Portfolio optimization
    const optimalAllocations = this.models.portfolioOptimizer.optimize(
      forecasts, riskMetrics, preferences
    )
    
    // 5. Generate actionable suggestions
    return this.createActionableSuggestions(forecasts, optimalAllocations, regime)
  }

  /**
   * Ensemble forecasting with multiple models
   */
  generateEnsembleForecasts(marketData, regime) {
    const models = {
      momentum: this.momentumModel(marketData),
      meanReversion: this.meanReversionModel(marketData),
      fundamental: this.fundamentalModel(marketData),
      technical: this.technicalModel(marketData)
    }

    // Adjust weights based on market regime
    const adjustedWeights = this.adjustWeightsForRegime(regime)
    
    return this.combineForecasts(models, adjustedWeights)
  }

  /**
   * Momentum-based forecasting
   */
  momentumModel(marketData) {
    const returns = this.calculateReturns(marketData.priceHistory)
    const momentum = this.calculateMomentum(returns, [1, 4, 24]) // 1h, 4h, 24h
    
    return {
      direction: momentum.signal,
      strength: momentum.strength,
      confidence: momentum.confidence,
      horizon: '1-4 hours'
    }
  }

  /**
   * Mean reversion model
   */
  meanReversionModel(marketData) {
    const price = marketData.currentPrice
    const movingAverage = this.calculateMA(marketData.priceHistory, 24)
    const deviation = (price - movingAverage) / movingAverage
    const zscore = this.calculateZScore(deviation, marketData.priceHistory)
    
    return {
      direction: zscore > 1.5 ? 'sell' : zscore < -1.5 ? 'buy' : 'hold',
      strength: Math.abs(zscore) / 2,
      confidence: Math.min(0.9, Math.abs(zscore) * 0.3),
      horizon: '4-12 hours'
    }
  }

  /**
   * Fundamental analysis model
   */
  fundamentalModel(marketData) {
    const fundamentals = {
      demandSupplyRatio: marketData.demand / marketData.supply,
      renewablePenetration: marketData.renewablePercentage / 100,
      gridStress: this.calculateGridStress(marketData),
      seasonalFactor: this.getSeasonalFactor(),
      weatherImpact: this.getWeatherImpact(marketData)
    }

    const fundamentalScore = this.scoreFundamentals(fundamentals)
    
    return {
      direction: fundamentalScore > 0.1 ? 'buy' : fundamentalScore < -0.1 ? 'sell' : 'hold',
      strength: Math.abs(fundamentalScore),
      confidence: 0.7,
      horizon: '12-24 hours'
    }
  }

  /**
   * Technical analysis model
   */
  technicalModel(marketData) {
    const indicators = {
      rsi: this.calculateRSI(marketData.priceHistory),
      macd: this.calculateMACD(marketData.priceHistory),
      bollinger: this.calculateBollingerBands(marketData.priceHistory),
      volume: this.analyzeVolume(marketData.volumeHistory)
    }

    const technicalSignal = this.combineTechnicalIndicators(indicators)
    
    return {
      direction: technicalSignal.direction,
      strength: technicalSignal.strength,
      confidence: technicalSignal.confidence,
      horizon: '2-8 hours'
    }
  }

  /**
   * Adaptive model weight adjustment based on market regime
   */
  adjustWeightsForRegime(regime) {
    const baseWeights = { ...this.modelWeights }
    
    switch(regime.type) {
      case 'trending':
        baseWeights.momentum *= 1.5
        baseWeights.meanReversion *= 0.5
        break
      case 'ranging':
        baseWeights.meanReversion *= 1.5
        baseWeights.momentum *= 0.5
        break
      case 'volatile':
        baseWeights.technical *= 1.3
        baseWeights.fundamental *= 0.7
        break
      case 'calm':
        baseWeights.fundamental *= 1.3
        baseWeights.technical *= 0.7
        break
    }
    
    return this.normalizeWeights(baseWeights)
  }

  /**
   * Risk-adjusted position sizing using Kelly Criterion
   */
  calculateOptimalPositionSize(forecast, riskMetrics, portfolio) {
    const winProbability = forecast.confidence
    const avgWin = forecast.expectedReturn
    const avgLoss = forecast.maxDrawdown
    
    // Kelly Criterion: f* = (bp - q) / b
    const kellyFraction = (winProbability * avgWin - (1 - winProbability) * avgLoss) / avgWin
    
    // Apply risk constraints
    const maxRisk = riskMetrics.maxRiskPerTrade
    const availableCapital = portfolio.availableCapital
    
    return Math.min(
      kellyFraction * availableCapital,
      maxRisk * availableCapital,
      riskMetrics.maxPositionSize
    )
  }

  /**
   * Create actionable suggestions with sophisticated reasoning
   */
  createActionableSuggestions(forecasts, allocations, regime) {
    return allocations.map((allocation, index) => ({
      id: `advanced-${Date.now()}-${index}`,
      action: allocation.action,
      price: allocation.optimalPrice,
      quantity: allocation.optimalQuantity,
      confidence: allocation.confidence,
      expectedReturn: allocation.expectedReturn,
      maxDrawdown: allocation.maxDrawdown,
      sharpeRatio: allocation.sharpeRatio,
      timeHorizon: allocation.timeHorizon,
      reasoning: this.generateSophisticatedReasoning(allocation, regime),
      riskMetrics: {
        var: allocation.valueAtRisk,
        maxLoss: allocation.maxLoss,
        riskRewardRatio: allocation.riskRewardRatio
      },
      marketFactors: allocation.keyFactors,
      modelContributions: allocation.modelBreakdown,
      executionStrategy: allocation.executionPlan
    }))
  }

  /**
   * Generate sophisticated reasoning for suggestions
   */
  generateSophisticatedReasoning(allocation, regime) {
    const reasons = []
    
    if (allocation.modelBreakdown.momentum > 0.3) {
      reasons.push(`Strong momentum signal (${(allocation.modelBreakdown.momentum * 100).toFixed(1)}%)`)
    }
    
    if (allocation.modelBreakdown.meanReversion > 0.3) {
      reasons.push(`Mean reversion opportunity detected`)
    }
    
    if (regime.volatility > 0.15) {
      reasons.push(`High volatility environment favors ${allocation.action} strategy`)
    }
    
    reasons.push(`Expected Sharpe ratio: ${allocation.sharpeRatio.toFixed(2)}`)
    
    return reasons.join('. ') + '.'
  }
}

// Market Regime Detection
class MarketRegimeDetector {
  detectRegime(marketData) {
    const volatility = this.calculateVolatility(marketData.priceHistory)
    const trend = this.calculateTrend(marketData.priceHistory)
    const momentum = this.calculateMomentum(marketData.priceHistory)
    
    let regimeType = 'calm'
    
    if (volatility > 0.15) regimeType = 'volatile'
    else if (Math.abs(trend) > 0.1) regimeType = 'trending'
    else if (volatility < 0.05 && Math.abs(momentum) < 0.05) regimeType = 'ranging'
    
    return {
      type: regimeType,
      volatility,
      trend,
      momentum,
      confidence: this.calculateRegimeConfidence(volatility, trend, momentum)
    }
  }
}

// Risk Management
class RiskManager {
  assessRisk(portfolio, marketData) {
    return {
      portfolioVaR: this.calculateVaR(portfolio),
      maxDrawdown: this.calculateMaxDrawdown(portfolio),
      sharpeRatio: this.calculateSharpeRatio(portfolio),
      maxRiskPerTrade: 0.02, // 2% max risk per trade
      maxPositionSize: portfolio.totalValue * 0.1, // 10% max position
      correlationRisk: this.assessCorrelationRisk(portfolio, marketData)
    }
  }
}

// Portfolio Optimization
class PortfolioOptimizer {
  optimize(forecasts, riskMetrics, preferences) {
    // Modern Portfolio Theory with Black-Litterman adjustments
    const expectedReturns = forecasts.map(f => f.expectedReturn)
    const covarianceMatrix = this.estimateCovarianceMatrix(forecasts)
    
    return this.meanVarianceOptimization(expectedReturns, covarianceMatrix, riskMetrics)
  }
}

export default AdvancedBidEngine
