// Chart.js configuration and chart management
let priceChart = null;
let trendChart = null;
let signalChart = null;
let correlationChart = null;

// Chart.js default configuration
Chart.defaults.color = '#B8BCC8';
Chart.defaults.borderColor = '#2A2B38';
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializePriceChart();
    setupTokenSelector();
});

// Price Chart
function initializePriceChart() {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;
    
    priceChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Price',
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
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1E1F2B',
                    titleColor: '#FFFFFF',
                    bodyColor: '#B8BCC8',
                    borderColor: '#2A2B38',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Price: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#2A2B38',
                        drawBorder: false
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: {
                        color: '#2A2B38',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

// Update price chart with new data
async function updatePriceChart(symbol) {
    if (!priceChart) return;
    
    try {
        // Fetch historical data
        const response = await fetchAPI(`/token/${symbol}/analysis`);
        if (!response || !response.data) return;
        
        // Generate mock historical data for demo
        const hours = 24;
        const labels = [];
        const prices = [];
        const basePrice = response.data.current_price || 100;
        
        for (let i = hours; i >= 0; i--) {
            const date = new Date();
            date.setHours(date.getHours() - i);
            labels.push(date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            
            // Simulate price movement
            const randomChange = (Math.random() - 0.5) * 0.05; // ±5% variation
            const price = basePrice * (1 + randomChange);
            prices.push(price);
        }
        
        // Update chart
        priceChart.data.labels = labels;
        priceChart.data.datasets[0].data = prices;
        priceChart.data.datasets[0].label = `${symbol} Price`;
        priceChart.update('active');
        
    } catch (error) {
        console.error('Error updating price chart:', error);
    }
}

// Token selector
function setupTokenSelector() {
    const selector = document.getElementById('tokenSelect');
    if (!selector) return;
    
    selector.addEventListener('change', (e) => {
        updatePriceChart(e.target.value);
    });
    
    // Load initial chart
    updatePriceChart(selector.value);
}

// Trend Analysis Chart
function initializeTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx || trendChart) return;
    
    trendChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Bullish Signals', 'Bearish Signals', 'Neutral'],
            datasets: [{
                label: 'Signal Strength',
                data: [0, 0, 0],
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
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#2A2B38',
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Update trend chart with AI analysis
function updateTrendChart(trendData) {
    if (!trendChart) {
        initializeTrendChart();
    }
    
    if (trendChart && trendData) {
        // Example: Update with trend analysis data
        const bullishScore = trendData.trend === 'bullish' ? trendData.confidence * 100 : 20;
        const bearishScore = trendData.trend === 'bearish' ? trendData.confidence * 100 : 20;
        const neutralScore = trendData.trend === 'neutral' ? trendData.confidence * 100 : 20;
        
        trendChart.data.datasets[0].data = [bullishScore, bearishScore, neutralScore];
        trendChart.update('active');
    }
}

// Signal Distribution Chart
function initializeSignalChart() {
    const ctx = document.getElementById('signalChart');
    if (!ctx || signalChart) return;
    
    signalChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Buy', 'Hold', 'Sell'],
            datasets: [{
                data: [0, 0, 0],
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
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });
}

// Update signal distribution
function updateSignalChart(signals) {
    if (!signalChart) {
        initializeSignalChart();
    }
    
    if (signalChart && signals) {
        const counts = { buy: 0, hold: 0, sell: 0 };
        
        signals.forEach(signal => {
            const rec = signal.data.recommendation.toLowerCase();
            if (counts.hasOwnProperty(rec)) {
                counts[rec]++;
            }
        });
        
        signalChart.data.datasets[0].data = [counts.buy, counts.hold, counts.sell];
        signalChart.update('active');
    }
}

// Correlation Matrix Chart
function initializeCorrelationChart() {
    const ctx = document.getElementById('correlationChart');
    if (!ctx || correlationChart) return;
    
    // This would typically show a heatmap of token correlations
    // For demo, we'll use a radar chart
    correlationChart = new Chart(ctx.getContext('2d'), {
        type: 'radar',
        data: {
            labels: ['SOL', 'USDC', 'RAY', 'SRM', 'BONK'],
            datasets: [{
                label: 'Correlation Strength',
                data: [100, 20, 75, 60, 40],
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
                legend: {
                    display: false
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    },
                    grid: {
                        color: '#2A2B38'
                    },
                    pointLabels: {
                        color: '#B8BCC8',
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Real-time chart updates
function handleRealtimeUpdate(data) {
    if (!priceChart || !data.prices) return;
    
    const selectedToken = document.getElementById('tokenSelect')?.value;
    if (!selectedToken || !data.prices[selectedToken]) return;
    
    const price = data.prices[selectedToken].price;
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Add new data point
    if (priceChart.data.labels.length > 24) {
        priceChart.data.labels.shift();
        priceChart.data.datasets[0].data.shift();
    }
    
    priceChart.data.labels.push(time);
    priceChart.data.datasets[0].data.push(price);
    priceChart.update('active');
}

// Export functions for use in app.js
window.chartFunctions = {
    updatePriceChart,
    updateTrendChart,
    updateSignalChart,
    initializeTrendChart,
    initializeSignalChart,
    initializeCorrelationChart,
    handleRealtimeUpdate
};