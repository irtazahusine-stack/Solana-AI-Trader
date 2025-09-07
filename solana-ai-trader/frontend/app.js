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

// WebSocket Connection
function initializeWebSocket() {
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        updateConnectionStatus(true);
        console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onclose = () => {
        updateConnectionStatus(false);
        console.log('WebSocket disconnected');
        // Reconnect after 5 seconds
        setTimeout(initializeWebSocket, 5000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };
}

function updateConnectionStatus(connected) {
    const indicator = document.querySelector('.status-indicator');
    const text = document.querySelector('.status-text');
    
    if (connected) {
        indicator.classList.add('connected');
        text.textContent = 'Connected';
    } else {
        indicator.classList.remove('connected');
        text.textContent = 'Disconnected';
    }
}

function handleWebSocketMessage(data) {
    if (data.type === 'market_update') {
        marketData = data.data;
        updateMarketDisplay();
    }
}

// API Calls
async function fetchAPI(endpoint) {
    try {
        const response = await axios.get(`${API_BASE_URL}${endpoint}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        showError(`Failed to fetch data from ${endpoint}`);
        return null;
    }
}

async function postAPI(endpoint, data) {
    try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
        return response.data;
    } catch (error) {
        console.error(`Error posting to ${endpoint}:`, error);
        showError(`Failed to send data to ${endpoint}`);
        return null;
    }
}

// Data Loading Functions
async function loadInitialData() {
    const overview = await fetchAPI('/market/overview');
    if (overview) {
        marketData = overview.data;
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
    const overview = await fetchAPI('/market/overview');
    if (overview) {
        displayMarketStats(overview.data);
        displayTokenGrid(overview.data.tokens);
    }
}

function displayMarketStats(data) {
    const statsGrid = document.getElementById('marketStats');
    const totalMarketCap = data.total_market_cap || 0;
    const totalVolume = data.tokens.reduce((sum, token) => sum + (token.volume_24h || 0), 0);
    const avgChange = data.tokens.reduce((sum, token) => sum + (token.price_change_24h || 0), 0) / data.tokens.length;
    
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
            <div class="stat-label">Average 24h Change</div>
            <div class="stat-value ${avgChange >= 0 ? 'positive' : 'negative'}">${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Tokens</div>
            <div class="stat-value">${data.tokens.length}</div>
        </div>
    `;
}

function displayTokenGrid(tokens) {
    const grid = document.getElementById('tokenGrid');
    grid.innerHTML = tokens.map(token => `
        <div class="token-card">
            <div class="token-header">
                <span class="token-symbol">${token.symbol}</span>
                <span class="price-change ${token.price_change_24h >= 0 ? 'positive' : 'negative'}">
                    ${token.price_change_24h >= 0 ? '+' : ''}${token.price_change_24h.toFixed(2)}%
                </span>
            </div>
            <div class="token-price">$${formatPrice(token.price)}</div>
            <div class="token-volume">Vol: $${formatNumber(token.volume_24h)}</div>
        </div>
    `).join('');
}

// Analysis Functions
async function loadAnalysis() {
    const insights = await fetchAPI('/ai/insights');
    if (insights) {
        displayMarketInsights(insights.data);
    }
    
    // Load predictions for SOL
    const predictions = await postAPI('/ai/predict', { symbol: 'SOL' });
    if (predictions) {
        displayPricePredictions(predictions.data);
    }
    
    // Load analysis for SOL
    const analysis = await fetchAPI('/token/SOL/analysis');
    if (analysis) {
        displayRiskMetrics(analysis.data.risk_metrics);
        displayPatterns(analysis.data.patterns);
    }
}

function displayMarketInsights(data) {
    const container = document.getElementById('marketInsights');
    container.innerHTML = data.insights.map(insight => `
        <div class="insight-item">${insight}</div>
    `).join('');
}

function displayPricePredictions(data) {
    const container = document.getElementById('pricePredictions');
    const predictions = data.predictions;
    
    container.innerHTML = `
        <div class="prediction-item">
            <strong>Random Forest:</strong> $${predictions.random_forest?.toFixed(2) || 'N/A'}
        </div>
        <div class="prediction-item">
            <strong>Prophet:</strong> $${predictions.prophet?.toFixed(2) || 'N/A'}
        </div>
        <div class="prediction-item">
            <strong>Ensemble:</strong> $${predictions.ensemble?.toFixed(2) || 'N/A'}
        </div>
        <div class="trend-info">
            <strong>Trend:</strong> <span class="${data.trend.trend}">${data.trend.trend}</span>
            <br>
            <strong>Confidence:</strong> ${(data.trend.confidence * 100).toFixed(1)}%
        </div>
    `;
}

function displayRiskMetrics(metrics) {
    const container = document.getElementById('riskMetrics');
    container.innerHTML = `
        <div class="metric-item">
            <strong>Volatility:</strong> ${(metrics.volatility * 100).toFixed(2)}%
        </div>
        <div class="metric-item">
            <strong>Sharpe Ratio:</strong> ${metrics.sharpe_ratio.toFixed(2)}
        </div>
        <div class="metric-item">
            <strong>Max Drawdown:</strong> ${(metrics.max_drawdown * 100).toFixed(2)}%
        </div>
        <div class="metric-item">
            <strong>VaR (95%):</strong> ${(metrics.var_95 * 100).toFixed(2)}%
        </div>
    `;
}

function displayPatterns(patterns) {
    const container = document.getElementById('patternDetection');
    container.innerHTML = patterns.map(pattern => {
        if (pattern.type === 'support_resistance') {
            return `
                <div class="pattern-item">
                    <strong>Support/Resistance</strong><br>
                    Support: $${pattern.support.toFixed(2)}<br>
                    Resistance: $${pattern.resistance.toFixed(2)}<br>
                    Position: ${(pattern.position * 100).toFixed(1)}%
                </div>
            `;
        } else if (pattern.type === 'trend') {
            return `
                <div class="pattern-item">
                    <strong>Trend: ${pattern.direction}</strong><br>
                    Strength: ${pattern.strength.toFixed(1)}%
                </div>
            `;
        }
    }).join('');
}

// Trading Signals Functions
async function loadSignals() {
    const tokens = ['SOL', 'RAY', 'BONK'];
    const signalsGrid = document.getElementById('signalsGrid');
    signalsGrid.innerHTML = '<div class="loader">Loading signals...</div>';
    
    const signals = await Promise.all(
        tokens.map(symbol => fetchAPI(`/ai/signals/${symbol}`))
    );
    
    displaySignals(signals.filter(s => s !== null));
}

function displaySignals(signalsData) {
    const grid = document.getElementById('signalsGrid');
    grid.innerHTML = signalsData.map(response => {
        const signal = response.data;
        const recClass = signal.recommendation.toLowerCase();
        
        return `
            <div class="signal-card ${recClass}">
                <h3>${signal.symbol}</h3>
                <div class="signal-recommendation">${signal.recommendation}</div>
                <div class="signal-confidence">
                    <span>Confidence:</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${signal.confidence * 100}%"></div>
                    </div>
                    <span>${(signal.confidence * 100).toFixed(1)}%</span>
                </div>
                <div class="signal-details">
                    <div>RSI: ${signal.technical_signals.rsi.value.toFixed(2)} (${signal.technical_signals.rsi.signal})</div>
                    <div>MACD: ${signal.technical_signals.macd.signal}</div>
                    <div>Trend: ${signal.trend_analysis.trend}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Trending Functions
async function loadTrending() {
    const trending = await fetchAPI('/market/trending');
    if (trending) {
        displayTrendingTokens(trending.data);
    }
}

function displayTrendingTokens(tokens) {
    const list = document.getElementById('trendingList');
    list.innerHTML = tokens.map((token, index) => `
        <div class="trending-item">
            <span class="trending-rank">#${index + 1}</span>
            <div class="trending-info">
                <h3>${token.symbol}</h3>
                <div>Price: $${formatPrice(token.price)}</div>
                <div>24h Volume: $${formatNumber(token.volume_24h)}</div>
            </div>
            <div class="trending-score">
                <span>Score: ${(token.trending_score * 100).toFixed(0)}</span>
                <span>=%</span>
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
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
}

function showError(message) {
    console.error(message);
    // You could implement a toast notification here
}

function updateMarketDisplay() {
    if (currentView === 'dashboard' && marketData.prices) {
        // Update live prices if on dashboard
        const tokens = Object.values(marketData.prices);
        displayTokenGrid(tokens);
    }
}

// Refresh signals button
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refreshSignals');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadSignals();
        });
    }
});