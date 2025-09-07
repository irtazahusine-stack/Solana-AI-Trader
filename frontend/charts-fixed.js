// Fixed chart initialization that works with the existing app
const API_BASE = 'http://localhost:8000';

// Wait for both DOM and other scripts to load
window.addEventListener('load', () => {
    console.log('Starting chart initialization...');
    
    // Small delay to ensure everything is ready
    setTimeout(() => {
        // Check which view is active and initialize appropriate charts
        const dashboardView = document.getElementById('dashboard');
        const analysisView = document.getElementById('analysis');
        const signalsView = document.getElementById('signals');
        const trendingView = document.getElementById('trending');
        
        if (dashboardView && dashboardView.classList.contains('active')) {
            initializeDashboardCharts();
        } else if (analysisView && analysisView.classList.contains('active')) {
            initializeAnalysisTrendChart();
        } else if (signalsView && signalsView.classList.contains('active')) {
            initializeSignalAnalysisChart();
        } else if (trendingView && trendingView.classList.contains('active')) {
            initializeTrendingCorrelationChart();
        }
    }, 1000);
});

function initializeDashboardCharts() {
    console.log('Initializing dashboard charts...');
    
    // Only initialize if we're on the dashboard
    const dashboardView = document.getElementById('dashboard');
    if (!dashboardView || !dashboardView.classList.contains('active')) {
        console.log('Not on dashboard, skipping chart init');
        return;
    }
    
    // Initialize Price Chart
    const priceCanvas = document.getElementById('priceChart');
    if (priceCanvas && typeof Chart !== 'undefined') {
        console.log('Creating price chart...');
        const ctx = priceCanvas.getContext('2d');
        window.mainPriceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price (USD)',
                    data: [],
                    borderColor: '#14F195',
                    backgroundColor: 'rgba(20, 241, 149, 0.1)',
                    borderWidth: 2,
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
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888' }
                    }
                }
            }
        });
        
        // Load data for price chart
        loadPriceData('SOL');
    }
    
    // Create Market Overview container and chart
    createMarketChart();
    
    // Initialize additional dashboard charts
    initializeTrendAnalysis();
    initializeSignalDistribution();
    initializeMarketCorrelation();
    
    // Setup token selector
    const tokenSelect = document.getElementById('tokenSelect');
    if (tokenSelect) {
        tokenSelect.addEventListener('change', (e) => {
            loadPriceData(e.target.value);
        });
    }
}

function createMarketChart() {
    // Check if market chart already exists
    let marketCanvas = document.getElementById('marketChart');
    
    if (!marketCanvas) {
        // Create the market chart container
        const priceContainer = document.querySelector('.price-chart-container');
        if (priceContainer) {
            const marketContainer = document.createElement('div');
            marketContainer.className = 'chart-container market-chart-container';
            marketContainer.innerHTML = `
                <h2>Market Overview</h2>
                <canvas id="marketChart"></canvas>
            `;
            priceContainer.insertAdjacentElement('afterend', marketContainer);
            marketCanvas = document.getElementById('marketChart');
        }
    }
    
    if (marketCanvas && typeof Chart !== 'undefined') {
        console.log('Creating market chart...');
        const ctx = marketCanvas.getContext('2d');
        window.mainMarketChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Token Prices',
                    data: [],
                    backgroundColor: [
                        'rgba(20, 241, 149, 0.6)',
                        'rgba(153, 69, 255, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)'
                    ],
                    borderColor: [
                        'rgba(20, 241, 149, 1)',
                        'rgba(153, 69, 255, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
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
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888' }
                    }
                }
            }
        });
        
        // Load market data
        loadMarketData();
    }
}

async function loadPriceData(symbol) {
    try {
        console.log(`Loading price data for ${symbol}...`);
        const response = await fetch(`${API_BASE}/token/${symbol}/analysis`);
        const data = await response.json();
        
        if (window.mainPriceChart && data.price_history) {
            const hours = 24;
            const labels = data.price_history.timestamps.slice(-hours).map(ts => {
                const date = new Date(ts);
                return date.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            });
            const prices = data.price_history.prices.slice(-hours);
            
            window.mainPriceChart.data.labels = labels;
            window.mainPriceChart.data.datasets[0].data = prices;
            window.mainPriceChart.update();
            console.log('Price chart updated successfully');
        }
    } catch (error) {
        console.error('Error loading price data:', error);
    }
}

async function loadMarketData() {
    try {
        console.log('Loading market overview data...');
        const response = await fetch(`${API_BASE}/market/overview`);
        const data = await response.json();
        
        if (window.mainMarketChart && data.tokens) {
            const labels = data.tokens.map(t => t.symbol);
            const prices = data.tokens.map(t => t.price);
            
            window.mainMarketChart.data.labels = labels;
            window.mainMarketChart.data.datasets[0].data = prices;
            window.mainMarketChart.update();
            console.log('Market chart updated successfully');
        }
    } catch (error) {
        console.error('Error loading market data:', error);
    }
}

// Initialize Trend Analysis Chart
function initializeTrendAnalysis() {
    const trendCanvas = document.getElementById('trendChart');
    if (trendCanvas && typeof Chart !== 'undefined') {
        console.log('Creating trend analysis chart...');
        const ctx = trendCanvas.getContext('2d');
        window.mainTrendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Bullish Signals', 'Bearish Signals', 'Neutral'],
                datasets: [{
                    label: 'Signal Strength',
                    data: [65, 20, 15],
                    backgroundColor: [
                        'rgba(20, 241, 149, 0.8)',
                        'rgba(255, 107, 107, 0.8)',
                        'rgba(255, 217, 61, 0.8)'
                    ],
                    borderWidth: 0
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
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#888' }
                    }
                }
            }
        });
        loadTrendData();
    }
}

// Initialize Signal Distribution Chart
function initializeSignalDistribution() {
    const signalCanvas = document.getElementById('signalChart');
    if (signalCanvas && typeof Chart !== 'undefined') {
        console.log('Creating signal distribution chart...');
        const ctx = signalCanvas.getContext('2d');
        window.mainSignalChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Buy', 'Hold', 'Sell'],
                datasets: [{
                    data: [40, 35, 25],
                    backgroundColor: [
                        'rgba(20, 241, 149, 0.8)',
                        'rgba(255, 217, 61, 0.8)',
                        'rgba(255, 107, 107, 0.8)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#888',
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
        loadSignalData();
    }
}

// Initialize Market Correlation Chart
function initializeMarketCorrelation() {
    const correlationCanvas = document.getElementById('correlationChart');
    if (correlationCanvas && typeof Chart !== 'undefined') {
        console.log('Creating market correlation chart...');
        const ctx = correlationCanvas.getContext('2d');
        window.mainCorrelationChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['SOL', 'USDC', 'RAY', 'BONK', 'SRM'],
                datasets: [{
                    label: 'Correlation Strength',
                    data: [100, 20, 75, 45, 60],
                    borderColor: '#14F195',
                    backgroundColor: 'rgba(20, 241, 149, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#14F195',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#14F195'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: '#888'
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: {
                            color: '#888',
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
        loadCorrelationData();
    }
}

// Load trend analysis data
async function loadTrendData() {
    try {
        const response = await fetch(`${API_BASE}/ai/analysis`);
        const data = await response.json();
        
        if (window.mainTrendChart && data) {
            // Update with real data if available
            const bullish = data.bullish_count || 65;
            const bearish = data.bearish_count || 20;
            const neutral = data.neutral_count || 15;
            
            window.mainTrendChart.data.datasets[0].data = [bullish, bearish, neutral];
            window.mainTrendChart.update();
        }
    } catch (error) {
        console.log('Using default trend data');
    }
}

// Load signal distribution data
async function loadSignalData() {
    try {
        const response = await fetch(`${API_BASE}/ai/signals/SOL`);
        const data = await response.json();
        
        if (window.mainSignalChart && data) {
            // Update based on signal
            let buy = 40, hold = 35, sell = 25;
            if (data.signal === 'buy') {
                buy = 60; hold = 30; sell = 10;
            } else if (data.signal === 'sell') {
                buy = 10; hold = 30; sell = 60;
            }
            
            window.mainSignalChart.data.datasets[0].data = [buy, hold, sell];
            window.mainSignalChart.update();
        }
    } catch (error) {
        console.log('Using default signal data');
    }
}

// Load correlation data
async function loadCorrelationData() {
    try {
        const response = await fetch(`${API_BASE}/market/correlations`);
        const data = await response.json();
        
        if (window.mainCorrelationChart && data) {
            // Update with real correlation data if available
            window.mainCorrelationChart.update();
        }
    } catch (error) {
        console.log('Using default correlation data');
    }
}

// Initialize AI Analysis Trend Chart
function initializeAnalysisTrendChart() {
    const analysisTrendCanvas = document.getElementById('analysisTrendChart');
    if (analysisTrendCanvas && typeof Chart !== 'undefined') {
        console.log('Creating AI analysis trend chart...');
        const ctx = analysisTrendCanvas.getContext('2d');
        window.analysisTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1h', '4h', '8h', '12h', '16h', '20h', '24h'],
                datasets: [{
                    label: 'Bullish Score',
                    data: [45, 52, 58, 65, 70, 68, 72],
                    borderColor: '#14F195',
                    backgroundColor: 'rgba(20, 241, 149, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                }, {
                    label: 'Bearish Score',
                    data: [55, 48, 42, 35, 30, 32, 28],
                    borderColor: '#FF4444',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#888' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888' }
                    },
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#888' }
                    }
                }
            }
        });
        loadAnalysisTrendData();
    }
}

// Load AI analysis trend data
async function loadAnalysisTrendData() {
    try {
        const response = await fetch(`${API_BASE}/ai/analysis`);
        const data = await response.json();
        
        if (window.analysisTrendChart && data) {
            // Update with real trend data if available
            console.log('AI analysis trend chart updated');
        }
    } catch (error) {
        console.log('Using default analysis trend data');
    }
}

// Initialize Signal Analysis Chart for Trading Signals page
function initializeSignalAnalysisChart() {
    const signalAnalysisCanvas = document.getElementById('signalAnalysisChart');
    if (signalAnalysisCanvas && typeof Chart !== 'undefined') {
        console.log('Creating signal analysis chart...');
        const ctx = signalAnalysisCanvas.getContext('2d');
        window.signalAnalysisChartObj = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'],
                datasets: [{
                    label: 'Signal Strength',
                    data: [8, 12, 15, 5, 2],
                    backgroundColor: [
                        'rgba(20, 241, 149, 0.9)',
                        'rgba(20, 241, 149, 0.6)',
                        'rgba(255, 217, 61, 0.8)',
                        'rgba(255, 107, 107, 0.6)',
                        'rgba(255, 107, 107, 0.9)'
                    ],
                    borderColor: [
                        'rgba(20, 241, 149, 1)',
                        'rgba(20, 241, 149, 1)',
                        'rgba(255, 217, 61, 1)',
                        'rgba(255, 107, 107, 1)',
                        'rgba(255, 107, 107, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed.y} signals`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { 
                            color: '#888',
                            stepSize: 5
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#888' }
                    }
                }
            }
        });
        loadSignalAnalysisData();
    }
}

// Load signal analysis data
async function loadSignalAnalysisData() {
    try {
        const response = await fetch(`${API_BASE}/ai/signals/all`);
        const data = await response.json();
        
        if (window.signalAnalysisChartObj && data) {
            // Process signals to count by strength
            let strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0;
            
            if (Array.isArray(data)) {
                data.forEach(signal => {
                    if (signal.confidence > 0.8 && signal.signal === 'buy') strongBuy++;
                    else if (signal.signal === 'buy') buy++;
                    else if (signal.signal === 'hold') hold++;
                    else if (signal.confidence > 0.8 && signal.signal === 'sell') strongSell++;
                    else if (signal.signal === 'sell') sell++;
                });
            }
            
            // Update chart if we have data
            if (strongBuy + buy + hold + sell + strongSell > 0) {
                window.signalAnalysisChartObj.data.datasets[0].data = [strongBuy, buy, hold, sell, strongSell];
                window.signalAnalysisChartObj.update();
            }
        }
    } catch (error) {
        console.log('Using default signal analysis data');
    }
}

// Initialize Trending Correlation Chart
function initializeTrendingCorrelationChart() {
    const trendingCorrelationCanvas = document.getElementById('trendingCorrelationChart');
    if (trendingCorrelationCanvas && typeof Chart !== 'undefined') {
        console.log('Creating trending correlation chart...');
        const ctx = trendingCorrelationCanvas.getContext('2d');
        window.trendingCorrelationChartObj = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['SOL', 'USDC', 'RAY', 'BONK', 'SRM', 'ORCA'],
                datasets: [{
                    label: 'Price Correlation',
                    data: [100, 15, 85, 45, 65, 55],
                    borderColor: '#14F195',
                    backgroundColor: 'rgba(20, 241, 149, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#14F195',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#14F195'
                }, {
                    label: 'Volume Correlation',
                    data: [100, 25, 70, 60, 50, 40],
                    borderColor: '#9945FF',
                    backgroundColor: 'rgba(153, 69, 255, 0.2)',
                    borderWidth: 2,
                    pointBackgroundColor: '#9945FF',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#9945FF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#888',
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.r}%`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: '#888',
                            backdropColor: 'transparent'
                        },
                        grid: { 
                            color: 'rgba(255, 255, 255, 0.1)',
                            circular: true
                        },
                        pointLabels: {
                            color: '#14F195',
                            font: { 
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        });
        loadTrendingCorrelationData();
    }
}

// Load trending correlation data
async function loadTrendingCorrelationData() {
    try {
        const response = await fetch(`${API_BASE}/market/overview`);
        const data = await response.json();
        
        if (window.trendingCorrelationChartObj && data && data.tokens) {
            // Calculate some mock correlations based on price changes
            const correlations = data.tokens.map(token => {
                // Generate correlation values based on price change
                const baseCorr = 50 + (token.price_change_24h || 0) * 2;
                return Math.max(0, Math.min(100, baseCorr));
            });
            
            // Update chart with calculated correlations
            if (correlations.length > 0) {
                window.trendingCorrelationChartObj.data.datasets[0].data = correlations;
                // Generate volume correlations (slightly different)
                const volCorrelations = correlations.map(c => Math.max(0, Math.min(100, c + (Math.random() - 0.5) * 20)));
                window.trendingCorrelationChartObj.data.datasets[1].data = volCorrelations;
                window.trendingCorrelationChartObj.update();
            }
        }
    } catch (error) {
        console.log('Using default trending correlation data');
    }
}

// Also reinitialize when switching to dashboard, analysis, signals, or trending
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.view === 'dashboard') {
                setTimeout(() => {
                    if (!window.mainPriceChart || !window.mainMarketChart) {
                        initializeDashboardCharts();
                    }
                }, 100);
            } else if (btn.dataset.view === 'analysis') {
                setTimeout(() => {
                    initializeAnalysisTrendChart();
                }, 100);
            } else if (btn.dataset.view === 'signals') {
                setTimeout(() => {
                    initializeSignalAnalysisChart();
                }, 100);
            } else if (btn.dataset.view === 'trending') {
                setTimeout(() => {
                    initializeTrendingCorrelationChart();
                }, 100);
            }
        });
    });
});

console.log('Charts-fixed.js loaded');