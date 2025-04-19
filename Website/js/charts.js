// Charts and data visualization for historical UV data
let peopleChart;
let timeSeriesChart;
let heatmapDistribution;
let peopleCountChart;

// Initialize charts
function initCharts() {
    // Create charts for dashboard and admin views
    setupPeopleChart();
    
    // Setup time selector for historical data
    setupTimeSelector();
    
    console.log("Charts initialized");
}

// Setup the main people count chart
function setupPeopleChart() {
    const ctx = document.getElementById('people-chart');
    if (!ctx) return;
    
    peopleChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: generateTimeLabels(24),
            datasets: [{
                label: 'People Count',
                data: generateMockData(24, 0, 30),
                borderColor: '#7e53f8',
                backgroundColor: createGradient(ctx, '#7e53f8', 'transparent'),
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#ff53b4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5, // Control aspect ratio for better visibility
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#9ba1b0'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0b0c14',
                    titleColor: '#e6e9ef',
                    bodyColor: '#9ba1b0',
                    borderColor: '#7e53f8',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9ba1b0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ba1b0',
                        maxTicksLimit: 12
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Setup time selector for historical data
function setupTimeSelector() {
    const timeSelector = document.getElementById('time-selector');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const loadDataBtn = document.getElementById('load-historical-data');
    
    if (!timeSelector || !loadDataBtn) return;
    
    // Set default dates to today and yesterday
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (startDateInput) {
        startDateInput.valueAsDate = yesterday;
    }
    
    if (endDateInput) {
        endDateInput.valueAsDate = today;
    }
    
    // Handle load data button click
    loadDataBtn.addEventListener('click', async () => {
        if (!startDateInput || !endDateInput) return;
        
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        
        // Validate dates
        if (!startDate || !endDate) {
            showToast('Please select start and end dates', 'error', 'Date Selection');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showToast('Start date cannot be after end date', 'error', 'Date Selection');
            return;
        }
        
        // Fetch historical data and update charts
        const historicalData = await fetchHistoricalData(startDate, endDate);
        if (historicalData) {
            updateHistoricalCharts(historicalData);
        }
    });
}

// Update historical charts with data
function updateHistoricalCharts(data) {
    if (!data || !data.length) {
        console.warn("No historical data to display");
        return;
    }
    
    // Create historical heatmap
    createHistoricalHeatmap(data);
    
    // Create time series chart
    createTimeSeriesChart(data);
    
    // Create occupancy distribution chart
    createOccupancyDistribution(data);
    
    // Create heatmap distribution
    createHeatmapDistribution(data);
}

// Create time series chart for people count over time
function createTimeSeriesChart(data) {
    const ctx = document.getElementById('time-series-chart');
    if (!ctx) return;
    
    // Extract timestamps and people counts
    const timestamps = data.map(item => new Date(item.timestamp));
    const peopleCounts = data.map(item => item.uv_coords ? item.uv_coords.length : 0);
    
    // Destroy previous chart if it exists
    if (timeSeriesChart) {
        timeSeriesChart.destroy();
    }
    
    // Create new chart
    timeSeriesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'People Count Over Time',
                data: peopleCounts,
                borderColor: '#53d8ff',
                backgroundColor: createGradient(ctx, '#53d8ff', 'transparent'),
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ff53b4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#9ba1b0'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0b0c14',
                    titleColor: '#e6e9ef',
                    bodyColor: '#9ba1b0',
                    borderColor: '#53d8ff',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9ba1b0'
                    },
                    title: {
                        display: true,
                        text: 'Number of People',
                        color: '#9ba1b0'
                    }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: determineTimeUnit(timestamps),
                        tooltipFormat: 'MMM d, yyyy, HH:mm'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ba1b0',
                        maxTicksLimit: 10
                    },
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#9ba1b0'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Create occupancy distribution chart (peak hours)
function createOccupancyDistribution(data) {
    const ctx = document.getElementById('occupancy-chart');
    if (!ctx) return;
    
    // Process data to get hourly distribution
    const hourlyDistribution = processHourlyDistribution(data);
    
    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourlyDistribution.labels,
            datasets: [{
                label: 'Average Occupancy',
                data: hourlyDistribution.averages,
                backgroundColor: createGradients(ctx, hourlyDistribution.averages),
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#0b0c14',
                    titleColor: '#e6e9ef',
                    bodyColor: '#9ba1b0',
                    borderColor: '#7e53f8',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9ba1b0'
                    },
                    title: {
                        display: true,
                        text: 'Average People Count',
                        color: '#9ba1b0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ba1b0'
                    },
                    title: {
                        display: true,
                        text: 'Hour of Day',
                        color: '#9ba1b0'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Create heatmap distribution for popular areas
function createHeatmapDistribution(data) {
    const ctx = document.getElementById('distribution-chart');
    if (!ctx) return;
    
    // Calculate the distribution of UV coordinates
    const distribution = calculateUVDistribution(data);
    
    // Draw distribution on canvas
    const canvas = ctx;
    const context = canvas.getContext('2d');
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background
    context.fillStyle = 'rgba(11, 12, 20, 0.4)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw room outline
    context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    context.lineWidth = 2;
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Draw the hotspots
    distribution.forEach(spot => {
        const x = spot.u * canvas.width;
        const y = spot.v * canvas.height;
        const radius = Math.min(30, Math.max(10, spot.count * 2));
        
        // Create gradient
        const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(126, 83, 248, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 83, 180, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 83, 180, 0)');
        
        // Draw circle
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = gradient;
        context.fill();
    });
    
    // Add legend
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.font = '12px Arial';
    context.fillText('Popular Areas Heatmap', 15, 25);
}

// Calculate UV distribution for heatmap
function calculateUVDistribution(data) {
    // Create a grid (10x10) to aggregate data points
    const grid = Array(10).fill().map(() => Array(10).fill(0));
    
    // Count occurrences in each grid cell
    data.forEach(item => {
        if (!item.uv_coords) return;
        
        item.uv_coords.forEach(coord => {
            const gridX = Math.floor(coord.u * 10);
            const gridY = Math.floor(coord.v * 10);
            
            if (gridX >= 0 && gridX < 10 && gridY >= 0 && gridY < 10) {
                grid[gridY][gridX]++;
            }
        });
    });
    
    // Convert grid to hotspots
    const hotspots = [];
    
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            if (grid[y][x] > 0) {
                hotspots.push({
                    u: (x + 0.5) / 10,  // Center of the grid cell
                    v: (y + 0.5) / 10,  // Center of the grid cell
                    count: grid[y][x]
                });
            }
        }
    }
    
    return hotspots;
}

// Update the people count chart with new data
function updatePeopleChart(data) {
    if (!peopleChart || !data) return;
    
    // Shift data for the people chart
    const chartData = peopleChart.data.datasets[0].data;
    chartData.shift();
    chartData.push(data);
    
    // Update labels
    const labels = peopleChart.data.labels;
    labels.shift();
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    labels.push(timeStr);
    
    // Update chart
    peopleChart.update();
}

// Create or update the people count chart in the admin panel
function updatePeopleCountChart(data) {
    const ctx = document.getElementById('people-count-chart');
    if (!ctx) return;
    
    // Extract timestamps and people counts
    const timestamps = data.map(item => new Date(item.timestamp));
    const peopleCounts = data.map(item => item.uv_coords ? item.uv_coords.length : 0);
    
    // Destroy previous chart if it exists
    if (peopleCountChart) {
        peopleCountChart.destroy();
    }
    
    // Create new chart
    peopleCountChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'People Count',
                data: peopleCounts,
                borderColor: '#7e53f8',
                backgroundColor: createGradient(ctx, '#7e53f8', 'transparent'),
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#ff53b4'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#9ba1b0'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#0b0c14',
                    titleColor: '#e6e9ef',
                    bodyColor: '#9ba1b0',
                    borderColor: '#7e53f8',
                    borderWidth: 1,
                    callbacks: {
                        title: function(tooltipItems) {
                            return new Date(tooltipItems[0].parsed.x).toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9ba1b0'
                    },
                    title: {
                        display: true,
                        text: 'Number of People',
                        color: '#9ba1b0'
                    }
                },
                x: {
                    type: 'time',
                    time: {
                        unit: 'minute',
                        tooltipFormat: 'MMM d, yyyy, HH:mm:ss'
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#9ba1b0',
                        maxTicksLimit: 10,
                        autoSkip: true
                    },
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#9ba1b0'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    console.log('People count chart updated with', data.length, 'data points');
}

// Process hourly distribution of people count
function processHourlyDistribution(data) {
    const hourCounts = Array(24).fill(0);
    const hourTotals = Array(24).fill(0);
    
    // Aggregate data by hour
    data.forEach(item => {
        if (!item.uv_coords) return;
        
        const date = new Date(item.timestamp);
        const hour = date.getHours();
        
        hourCounts[hour] += item.uv_coords.length;
        hourTotals[hour]++;
    });
    
    // Calculate averages
    const averages = hourCounts.map((count, index) => 
        hourTotals[index] > 0 ? Math.round(count / hourTotals[index]) : 0
    );
    
    // Create labels (24-hour format)
    const labels = Array(24).fill().map((_, i) => `${i.toString().padStart(2, '0')}:00`);
    
    return { labels, averages };
}

// Determine appropriate time unit based on date range
function determineTimeUnit(dates) {
    if (!dates || dates.length < 2) return 'hour';
    
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const diffHours = (lastDate - firstDate) / (1000 * 60 * 60);
    
    if (diffHours <= 24) return 'hour';
    if (diffHours <= 72) return 'day';
    return 'day';
}

// Create gradient for chart background
function createGradient(ctx, color, endColor) {
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, ctx.height);
    gradient.addColorStop(0, color + '40'); // 25% opacity
    gradient.addColorStop(1, endColor || 'rgba(0, 0, 0, 0)');
    return gradient;
}

// Create gradients for bar chart based on values (higher value = warmer color)
function createGradients(ctx, values) {
    if (!values || !values.length) return [];
    
    const maxValue = Math.max(...values);
    
    return values.map(value => {
        const ratio = value / maxValue;
        const r = Math.round(83 + (255 - 83) * ratio);
        const g = Math.round(248 - (248 - 83) * ratio);
        const b = Math.round(170 - (170 - 83) * ratio);
        return `rgba(${r}, ${g}, ${b}, 0.7)`;
    });
}

// Generate time labels for the past n hours
function generateTimeLabels(count) {
    const labels = [];
    const now = new Date();
    
    for (let i = count - 1; i >= 0; i--) {
        const time = new Date(now);
        time.setHours(now.getHours() - i);
        labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    
    return labels;
}

// Generate mock data for initial chart display
function generateMockData(count, min, max) {
    return Array(count).fill().map(() => Math.floor(Math.random() * (max - min + 1)) + min);
}