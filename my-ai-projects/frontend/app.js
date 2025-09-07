// API Configuration
const API_BASE_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

// Global state
let ws = null;
let currentView = 'dashboard';
let marketData = {};
let charts = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeWebSocket();
    loadInitialData();
    
    // Load dashboard immediately with charts
    setTimeout(() => {
        loadDashboard();
    }, 500);
    
    setInterval(refreshData, 30000); // Refresh every 30 seconds
});

// Navigation
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    
    // Update views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === viewName);
    });
    
    currentView = viewName;
    
    // Load view-specific data
    switch(viewName) {
        case 'dashboard':
            // Delay slightly to ensure view is rendered
            setTimeout(() => {
                loadDashboard();
                // Ensure charts are initialized
                if (window.chartFunctions && !window.priceChart) {
                    window.chartFunctions.initializePriceChart();
                    window.chartFunctions.initializeTrendChart();
                    window.chartFunctions.initializeSignalChart();
                    window.chartFunctions.initializeCorrelationChart();
                    window.chartFunctions.updatePriceChart('SOL');
                }
            }, 50);
            break;
        case 'analysis':
            loadAnalysis();
            break;
        case 'signals':
            loadSignals();
            break;
        case 'trending':
            loadTrending();
            break;
    }
}

// WebSocket Management
function initializeWebSocket() {
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            updateConnectionStatus('connected');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleRealtimeUpdate(data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateConnectionStatus('api-only');
        };
        
        ws.onclose = () => {
            console.log('WebSocket disconnected');
            updateConnectionStatus('api-only');
            // Don't attempt to reconnect if websocket is not available
        };
    } catch (error) {
        console.log('WebSocket not available, using API only');
        updateConnectionStatus('api-only');
    }
}

function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    const indicator = statusElement.querySelector('.status-indicator');
    const text = statusElement.querySelector('.status-text');
    
    switch(status) {
        case 'connected':
            indicator.style.backgroundColor = '#14F195';
            text.textContent = 'Connected';
            break;
        case 'api-only':
            indicator.style.backgroundColor = '#14F195';
            text.textContent = 'API Connected';
            break;
        case 'disconnected':
            indicator.style.backgroundColor = '#FF4444';
            text.textContent = 'Disconnected';
            break;
        case 'error':
            indicator.style.backgroundColor = '#FFA500';
            text.textContent = 'Connection Error';
            break;
        default:
            indicator.style.backgroundColor = '#888';
            text.textContent = 'Connecting...';
    }
}

function handleRealtimeUpdate(data) {
    if (data.type === 'price_update') {
        // Update market data
        if (!marketData.tokens) marketData.tokens = [];
        const tokenIndex = marketData.tokens.findIndex(t => t.symbol === data.symbol);
        if (tokenIndex >= 0) {
            marketData.tokens[tokenIndex].price = data.price;
            marketData.tokens[tokenIndex].volume_24h = data.volume;
        }
        
        // Update display if on dashboard
        if (currentView === 'dashboard') {
            updatePriceDisplay(data.symbol, data.price);
        }
    }
}

// API Helper Functions
async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        showError(`Failed to fetch data from ${endpoint}`);
        return null;
    }
}

async function postAPI(endpoint, data) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error posting to ${endpoint}:`, error);
        showError(`Failed to post data to ${endpoint}`);
        return null;
    }
}

// Data Loading Functions
async function loadInitialData() {
    const overview = await fetchAPI('/market/overview');
    if (overview) {
        marketData = overview;
        updateMarketDisplay();
    }
}

async function refreshData() {
    switch(currentView) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'analysis':
            loadAnalysis();
            break;
        case 'signals':
            loadSignals();
            break;
        case 'trending':
            loadTrending();
            break;
    }
}

// Dashboard Functions
async function loadDashboard() {
    console.log('Loading dashboard...');
    const overview = await fetchAPI('/market/overview');
    if (overview) {
        displayMarketStats(overview);
        displayTokenGrid(overview.tokens);
        
        // Initialize charts if they haven't been initialized yet
        if (window.chartFunctions) {
            // Update price chart for default token
            window.chartFunctions.updatePriceChart('SOL');
            // Initialize other charts if needed
            if (!window.trendChart) window.chartFunctions.initializeTrendChart();
            if (!window.signalChart) window.chartFunctions.initializeSignalChart();
            if (!window.correlationChart) window.chartFunctions.initializeCorrelationChart();
        }
    }
}

function displayMarketStats(data) {
    const statsGrid = document.getElementById('marketStats');
    if (!statsGrid) return;
    
    // Ensure data exists and has required properties
    if (!data || !data.tokens) {
        console.error('Invalid data passed to displayMarketStats:', data);
        return;
    }
    
    const totalMarketCap = data.total_market_cap || 0;
    const totalVolume = data.tokens.reduce((sum, token) => sum + (token.volume_24h || 0), 0);
    const avgChange = data.tokens.length > 0 ? 
        data.tokens.reduce((sum, token) => sum + (token.price_change_24h || 0), 0) / data.tokens.length : 0;
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Market Cap</div>
            <div class="stat-value">$${formatNumber(totalMarketCap)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">24h Volume</div>
            <div class="stat-value">$${formatNumber(totalVolume)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg 24h Change</div>
            <div class="stat-value ${avgChange >= 0 ? 'positive' : 'negative'}">
                ${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Tokens</div>
            <div class="stat-value">${data.tokens.length}</div>
        </div>
    `;
}

function displayTokenGrid(tokens) {
    const grid = document.getElementById('tokenGrid');
    if (!grid) return;
    
    // Ensure tokens is an array
    if (!Array.isArray(tokens)) {
        console.error('Invalid tokens data:', tokens);
        return;
    }
    
    grid.innerHTML = tokens.map(token => `
        <div class="token-card" data-symbol="${token.symbol}">
            <div class="token-header">
                <h3>${token.symbol}</h3>
                <span class="token-change ${token.price_change_24h >= 0 ? 'positive' : 'negative'}">
                    ${token.price_change_24h >= 0 ? '↑' : '↓'} ${Math.abs(token.price_change_24h).toFixed(2)}%
                </span>
            </div>
            <div class="token-price">$${formatPrice(token.price)}</div>
            <div class="token-volume">Vol: $${formatNumber(token.volume_24h)}</div>
            <button class="analyze-btn" onclick="analyzeToken('${token.symbol}')">Analyze</button>
        </div>
    `).join('');
}

// AI Analysis Functions
async function loadAnalysis() {
    // Load market insights
    const insights = await fetchAPI('/ai/insights');
    if (insights) {
        displayMarketInsights(insights);
    }
    
    // Load analysis for SOL by default
    const analysis = await fetchAPI('/token/SOL/analysis');
    if (analysis) {
        displayTokenAnalysis(analysis);
        
        // Initialize and update trend chart for AI Analysis page
        const analysisTrendCtx = document.getElementById('analysisTrendChart');
        if (analysisTrendCtx && window.chartFunctions) {
            // Initialize analysis trend chart if needed
            if (!window.analysisTrendChart) {
                window.analysisTrendChart = new Chart(analysisTrendCtx.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: ['Now', '1h', '2h', '3h', '4h', '5h', '6h'],
                        datasets: [{
                            label: 'Price Trend',
                            data: [],
                            borderColor: '#14F195',
                            backgroundColor: 'rgba(20, 241, 149, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            y: {
                                grid: { color: '#2A2B38' }
                            },
                            x: {
                                grid: { display: false }
                            }
                        }
                    }
                });
            }
            
            // Update with prediction data
            if (analysis.ai_prediction && analysis.current_price) {
                const basePrice = analysis.current_price;
                const trendData = [
                    basePrice,
                    analysis.ai_prediction.next_hour || basePrice * 1.01,
                    basePrice * 1.02,
                    basePrice * 1.015,
                    basePrice * 1.025,
                    basePrice * 1.03,
                    analysis.ai_prediction.next_day || basePrice * 1.05
                ];
                window.analysisTrendChart.data.datasets[0].data = trendData;
                window.analysisTrendChart.update();
            }
        }
        
        // Display pattern detection
        displayPatternDetection(analysis);
    }
}

function displayMarketInsights(data) {
    const container = document.getElementById('marketInsights');
    if (!container) return;
    
    container.innerHTML = `
        <div class="sentiment-indicator ${data.market_sentiment}">
            Market Sentiment: ${data.market_sentiment.toUpperCase()}
            <span class="confidence">Confidence: ${(data.confidence * 100).toFixed(0)}%</span>
        </div>
        ${data.insights.map(insight => `
            <div class="insight-item">
                <span class="insight-icon">💡</span>
                ${insight}
            </div>
        `).join('')}
    `;
}

function displayTokenAnalysis(data) {
    // Display price predictions
    const predContainer = document.getElementById('pricePredictions');
    if (predContainer && data.ai_prediction) {
        predContainer.innerHTML = `
            <div class="prediction-grid">
                <div class="prediction-card">
                    <div class="pred-label">Next Hour</div>
                    <div class="pred-value">$${data.ai_prediction.next_hour.toFixed(4)}</div>
                    <div class="pred-change">${((data.ai_prediction.next_hour - data.current_price) / data.current_price * 100).toFixed(2)}%</div>
                </div>
                <div class="prediction-card">
                    <div class="pred-label">Next Day</div>
                    <div class="pred-value">$${data.ai_prediction.next_day.toFixed(4)}</div>
                    <div class="pred-change">${((data.ai_prediction.next_day - data.current_price) / data.current_price * 100).toFixed(2)}%</div>
                </div>
                <div class="prediction-card">
                    <div class="pred-label">Next Week</div>
                    <div class="pred-value">$${data.ai_prediction.next_week.toFixed(4)}</div>
                    <div class="pred-change">${((data.ai_prediction.next_week - data.current_price) / data.current_price * 100).toFixed(2)}%</div>
                </div>
            </div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${data.ai_prediction.confidence * 100}%"></div>
                <span class="confidence-text">Confidence: ${(data.ai_prediction.confidence * 100).toFixed(0)}%</span>
            </div>
        `;
    }
    
    // Display risk metrics
    const riskContainer = document.getElementById('riskMetrics');
    if (riskContainer && data.risk_metrics) {
        displayRiskMetrics(data.risk_metrics);
    }
    
    // Display technical indicators
    const techContainer = document.getElementById('technicalIndicators');
    if (techContainer && data.technical_indicators) {
        displayTechnicalIndicators(data.technical_indicators);
    }
}

function displayRiskMetrics(metrics) {
    const container = document.getElementById('riskMetrics');
    if (!container) return;
    
    container.innerHTML = `
        <div class="risk-grid">
            <div class="risk-item">
                <span class="risk-label">Volatility</span>
                <span class="risk-value">${metrics.volatility.toFixed(2)}%</span>
            </div>
            <div class="risk-item">
                <span class="risk-label">Sharpe Ratio</span>
                <span class="risk-value">${metrics.sharpe_ratio.toFixed(2)}</span>
            </div>
            <div class="risk-item">
                <span class="risk-label">Max Drawdown</span>
                <span class="risk-value">${metrics.max_drawdown.toFixed(2)}%</span>
            </div>
            <div class="risk-item">
                <span class="risk-label">VaR (95%)</span>
                <span class="risk-value">${metrics.var_95.toFixed(2)}%</span>
            </div>
        </div>
    `;
}

function displayTechnicalIndicators(indicators) {
    const container = document.getElementById('technicalIndicators');
    if (!container) return;
    
    container.innerHTML = `
        <div class="indicator-grid">
            <div class="indicator-item">
                <span class="indicator-label">RSI</span>
                <span class="indicator-value ${indicators.rsi > 70 ? 'overbought' : indicators.rsi < 30 ? 'oversold' : ''}">${indicators.rsi.toFixed(1)}</span>
            </div>
            <div class="indicator-item">
                <span class="indicator-label">MACD</span>
                <span class="indicator-value">${indicators.macd.toFixed(4)}</span>
            </div>
            <div class="indicator-item">
                <span class="indicator-label">SMA 20</span>
                <span class="indicator-value">$${indicators.sma_20.toFixed(4)}</span>
            </div>
            <div class="indicator-item">
                <span class="indicator-label">SMA 50</span>
                <span class="indicator-value">$${indicators.sma_50.toFixed(4)}</span>
            </div>
        </div>
    `;
}

function displayPatternDetection(analysis) {
    const container = document.getElementById('patternDetection');
    if (!container) return;
    
    // Generate pattern data from technical indicators
    const patterns = [];
    
    if (analysis.technical_indicators) {
        const indicators = analysis.technical_indicators;
        
        // RSI patterns
        if (indicators.rsi > 70) {
            patterns.push({
                type: 'Overbought',
                description: 'RSI indicates overbought conditions',
                strength: 'High',
                action: 'Consider selling'
            });
        } else if (indicators.rsi < 30) {
            patterns.push({
                type: 'Oversold',
                description: 'RSI indicates oversold conditions',
                strength: 'High',
                action: 'Consider buying'
            });
        }
        
        // Moving average patterns
        if (indicators.sma_20 > indicators.sma_50) {
            patterns.push({
                type: 'Golden Cross',
                description: 'Short-term MA above long-term MA',
                strength: 'Medium',
                action: 'Bullish signal'
            });
        } else {
            patterns.push({
                type: 'Death Cross',
                description: 'Short-term MA below long-term MA',
                strength: 'Medium',
                action: 'Bearish signal'
            });
        }
        
        // MACD patterns
        if (indicators.macd > 0) {
            patterns.push({
                type: 'MACD Positive',
                description: 'MACD above signal line',
                strength: 'Medium',
                action: 'Upward momentum'
            });
        }
    }
    
    // Support/Resistance levels
    if (analysis.current_price) {
        patterns.push({
            type: 'Support Level',
            description: `Strong support at $${(analysis.current_price * 0.95).toFixed(2)}`,
            strength: 'High',
            action: 'Watch for bounce'
        });
        patterns.push({
            type: 'Resistance Level',
            description: `Resistance at $${(analysis.current_price * 1.05).toFixed(2)}`,
            strength: 'High',
            action: 'Watch for breakout'
        });
    }
    
    container.innerHTML = patterns.map(pattern => `
        <div class="pattern-item">
            <div class="pattern-type ${pattern.strength.toLowerCase()}">${pattern.type}</div>
            <div class="pattern-description">${pattern.description}</div>
            <div class="pattern-action">${pattern.action}</div>
        </div>
    `).join('') || '<div class="no-patterns">No significant patterns detected</div>';
}

// Trading Signals Functions
async function loadSignals() {
    const signalsContainer = document.getElementById('signalsGrid');
    const refreshBtn = document.getElementById('refreshSignals');
    
    if (!signalsContainer) {
        console.error('Signals container not found');
        return;
    }
    
    // Update button state during loading
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '⏳ Loading...';
    }
    
    signalsContainer.innerHTML = '<div class="loader">🔄 Fetching latest AI signals...</div>';
    
    const tokens = ['SOL', 'RAY', 'BONK', 'USDC', 'SRM', 'ORCA'];
    const signals = [];
    
    for (const token of tokens) {
        const signal = await fetchAPI(`/ai/signals/${token}`);
        if (signal) {
            signals.push({ ...signal, symbol: token });
        }
    }
    
    displayTradingSignals(signals);
    
    // Restore button state
    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '🔄 Get Latest Signals';
    }
    
    // Show success message briefly
    const timestamp = new Date().toLocaleTimeString();
    if (refreshBtn) {
        refreshBtn.innerHTML = `✅ Updated at ${timestamp}`;
        setTimeout(() => {
            refreshBtn.innerHTML = '🔄 Get Latest Signals';
        }, 3000);
    }
}

function displayTradingSignals(signals) {
    const container = document.getElementById('signalsGrid');
    if (!container) return;
    
    container.innerHTML = signals.map(signal => `
        <div class="signal-card ${signal.signal}">
            <div class="signal-header">
                <h3>${signal.symbol}</h3>
                <span class="signal-badge ${signal.signal}">${signal.signal.toUpperCase()}</span>
            </div>
            <div class="signal-confidence">
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${signal.confidence * 100}%"></div>
                </div>
                <span>Confidence: ${(signal.confidence * 100).toFixed(0)}%</span>
            </div>
            <div class="signal-reasons">
                ${signal.reasons.map(reason => `<p>• ${reason}</p>`).join('')}
            </div>
            <div class="signal-time">${new Date(signal.timestamp).toLocaleTimeString()}</div>
        </div>
    `).join('');
}

// Trending Functions
async function loadTrending() {
    const trending = await fetchAPI('/market/trending');
    if (trending) {
        displayTrendingTokens(trending.trending);
    }
    
    // Update correlation chart
    if (window.updateCorrelationChart) {
        window.updateCorrelationChart();
    }
}

function displayTrendingTokens(tokens) {
    const container = document.getElementById('trendingList');
    if (!container) return;
    
    container.innerHTML = tokens.map((token, index) => `
        <div class="trending-item">
            <span class="trending-rank">#${index + 1}</span>
            <div class="trending-info">
                <h4>${token.symbol}</h4>
                <p>Price: $${formatPrice(token.price)}</p>
                <p>Volume: $${formatNumber(token.volume_24h)}</p>
            </div>
            <div class="trending-score">
                <div class="score-bar">
                    <div class="score-fill" style="width: ${token.trending_score * 100}%"></div>
                </div>
                <span>${(token.trending_score * 100).toFixed(0)}%</span>
            </div>
        </div>
    `).join('');
}

// Utility Functions
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
}

function formatPrice(price) {
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(8);
}

function updatePriceDisplay(symbol, price) {
    const tokenCard = document.querySelector(`[data-symbol="${symbol}"]`);
    if (tokenCard) {
        const priceElement = tokenCard.querySelector('.token-price');
        if (priceElement) {
            priceElement.textContent = `$${formatPrice(price)}`;
            priceElement.classList.add('price-update');
            setTimeout(() => priceElement.classList.remove('price-update'), 1000);
        }
    }
}

function showError(message) {
    console.error(message);
    // You could implement a toast notification here
}

function updateMarketDisplay() {
    if (currentView === 'dashboard' && marketData.tokens) {
        displayTokenGrid(marketData.tokens);
    }
}

// Global function to analyze a specific token
window.analyzeToken = function(symbol) {
    // Switch to analysis view
    switchView('analysis');
    
    // Load analysis for the selected token
    fetchAPI(`/token/${symbol}/analysis`).then(data => {
        if (data) {
            displayTokenAnalysis(data);
            // Update the token selector if it exists
            const selector = document.getElementById('analysisTokenSelect');
            if (selector) {
                selector.value = symbol;
            }
        }
    });
}

// Refresh signals button handler
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshSignals');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadSignals);
    }
    
    // Analysis token selector
    const analysisSelector = document.getElementById('analysisTokenSelect');
    if (analysisSelector) {
        analysisSelector.addEventListener('change', (e) => {
            fetchAPI(`/token/${e.target.value}/analysis`).then(data => {
                if (data) displayTokenAnalysis(data);
            });
        });
    }
});