// Supabase configuration and data handling
const SUPABASE_URL = 'https://lmkrpifbfbmasljrxthk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3JwaWZiZmJtYXNsanJ4dGhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzODU3MTMsImV4cCI6MjA1OTk2MTcxM30.lTHwm4dUAmAQMbg7C2EmhP9DPvfVOCnYrU4XjXx9psQ'; // Replace with your Supabase anon key

// Initialize Supabase client - use a different variable name to avoid conflict
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Track connection state and polling
let supabaseConnected = false;
let pollingIntervalId = null;
const POLLING_INTERVAL_MS = 2000; // Fetch data every 2 seconds
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

// Track current data for use by other components
let currentData = null;

// Calibration settings
let calibrationData = {
    sound_a: 1,
    sound_b: 0,
    air_a: 1,
    air_b: 0
};

// Track calibration chart instances
let soundCalibrationChart = null;
let airCalibrationChart = null;

// Create toast container if it doesn't exist
document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Initialize connections by fetching initial data
    fetchInitialData();
});

/**
 * Fetch the latest image from Supabase storage
 * @returns {Promise<string|null>} URL of the latest image or null if no image is found
 */
async function fetchLatestImage() {
    try {
        console.log("Fetching latest image from Supabase storage...");
        
        // Instead of listing all images, directly get image_99.jpg which should be the latest
        // based on the camera upload pattern in camera.ino
        const { data: publicURL } = supabaseClient
            .storage
            .from('images')
            .getPublicUrl('image_99.jpg');
        
        if (publicURL && publicURL.publicUrl) {
            console.log('Latest image URL:', publicURL.publicUrl);
            showToast('Latest image loaded successfully', 'success', 'Image Loaded');
            return publicURL.publicUrl;
        } else {
            console.warn('Could not get public URL for image');
            showToast('Failed to get image URL', 'error', 'Image Error');
            return null;
        }
    } catch (err) {
        console.error('Error in fetchLatestImage:', err);
        showToast('Error retrieving latest image', 'error', 'Image Error');
        return null;
    }
}

// Fetch the most recent UV data point
async function fetchLatestUVData() {
    try {
        const { data, error, status } = await supabaseClient
            .from('people_uv') // Corrected table name
            .select('*')
            .order('created_at', { ascending: false }) // Use created_at instead of timestamp
            .limit(1)
            .single(); // Use .single() to get one record or null

        if (error) {
            // Handle specific error for non-existent table or column
            if (error.code === '42P01') { // Table doesn't exist
                console.error('Error fetching UV data: Table "people_uv" does not exist or RLS prevents access.', error);
                showToast('Required table "people_uv" not found. Check Supabase setup.', 'error', 'Database Error');
                stopPolling();
                return;
            } else if (error.code === '42703') { // Column doesn't exist
                console.error('Error fetching UV data: Column like "created_at" does not exist.', error);
                showToast(`Database column error: ${error.message}. Check table structure.`, 'error', 'Database Error');
                stopPolling();
                return;
            } else {
                console.error('Error fetching UV data:', error);
                showToast(`Failed to fetch data: ${error.message}`, 'error', 'Connection Error');
            }

            supabaseConnected = false;
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                showToast('Max connection errors reached. Stopping updates.', 'error', 'Connection Failed');
                stopPolling();
            }
            return; // Don't update UI on error
        }

        // Reset error count on success
        consecutiveErrors = 0;

        if (!supabaseConnected) {
            supabaseConnected = true;
            showToast('Connection established!', 'success', 'Connection');
        }

        if (data) {
            // Store current data
            currentData = data;
            
            // Update UI with the latest data
            updateUI(data);
        } else {
            // This case might happen if the table is empty
            console.warn('No UV data available');
            // Optionally show a 'no data' state in the UI
        }

    } catch (err) {
        console.error('Error in fetchLatestUVData:', err);
        showToast('Failed to connect to database', 'error', 'Connection Error');
        supabaseConnected = false;
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            showToast('Max connection errors reached. Stopping updates.', 'error', 'Connection Failed');
            stopPolling();
        }
    }
}

// Getter for current data
supabaseClient.getCurrentData = function() {
    return currentData;
};

// Fetch latest people data points (limited to specified count)
async function fetchLatestPeopleData(limit = 100) {
    try {
        console.log(`Fetching latest ${limit} data points...`);
        
        // Query Supabase for the latest data entries - using people_uv table instead of uv_data
        const { data, error } = await supabaseClient
            .from('people_uv')  // Changed from 'uv_data' to 'people_uv'
            .select('*')
            .order('created_at', { ascending: false })  // Using created_at instead of timestamp
            .limit(limit);
        
        if (error) {
            console.error('Error fetching latest people data:', error);
            showToast('Failed to fetch latest data', 'error', 'Database Error');
            return null;
        }
        
        if (!data || data.length === 0) {
            console.warn('No data returned from database');
            showToast('No data available', 'info', 'Data Query');
            return [];
        }
        
        // Reverse the array to get chronological order (oldest first)
        const sortedData = data.reverse();
        
        // Parse UV coordinates for each data point
        sortedData.forEach(item => {
            if (item.uv_coords && typeof item.uv_coords === 'string') {
                try {
                    item.uv_coords = JSON.parse(item.uv_coords);
                } catch (e) {
                    console.error('Error parsing UV coordinates:', e);
                    item.uv_coords = [];
                }
            }
        });
        
        console.log(`Retrieved ${sortedData.length} data points`);
        return sortedData;
    } catch (err) {
        console.error('Unexpected error fetching latest people data:', err);
        showToast('An unexpected error occurred', 'error', 'Error');
        return null;
    }
}

// Fetch initial data and start polling
async function fetchInitialData() {
    showToast('Connecting to Supabase...', 'info', 'Connection');
    // Fetch calibration data first
    await fetchCalibrationData();
    await fetchLatestUVData(); // Fetch the first data point

    // Start polling only if the initial fetch didn't result in stopping
    if (pollingIntervalId === null && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
        startPollingData();
    }
}

// Start polling for new data
function startPollingData() {
    if (pollingIntervalId) {
        clearInterval(pollingIntervalId); // Clear existing interval if any
    }
    console.log(`Starting data polling every ${POLLING_INTERVAL_MS / 1000} seconds...`);
    pollingIntervalId = setInterval(fetchLatestUVData, POLLING_INTERVAL_MS);
    showToast('Live updates started', 'info', 'Connection');
}

// Stop polling for data
function stopPolling() {
    if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
        supabaseConnected = false; // Mark as disconnected
        console.log("Data polling stopped.");
    }
}

// Fetch historical data for charts and analysis
async function fetchHistoricalData(startDate, endDate) {
    try {
        showToast('Fetching historical data...', 'info', 'Data Request');

        // Get data within date range
        const { data, error } = await supabaseClient
            .from('people_uv') // Corrected table name
            .select('*')
            .gte('created_at', startDate) // Use created_at
            .lte('created_at', endDate)   // Use created_at
            .order('created_at', { ascending: true }); // Use created_at

        if (error) {
            console.error('Error fetching historical data:', error);
            // Add specific check for column error
            if (error.code === '42703') {
                showToast(`Database column error: ${error.message}. Check table structure.`, 'error', 'Database Error');
            } else {
                showToast('Failed to fetch historical data', 'error', 'Data Error');
            }
            return null;
        }

        // Parse UV coordinates for each data point
        if (data && data.length > 0) {
            data.forEach(item => {
                if (item.uv_coords && typeof item.uv_coords === 'string') {
                    try {
                        item.uv_coords = JSON.parse(item.uv_coords);
                    } catch (e) {
                        console.error('Error parsing historical UV coordinates:', e);
                        item.uv_coords = [];
                    }
                }
            });
        }
        
        if (data && data.length > 0) {
            showToast(`Retrieved ${data.length} historical records`, 'success', 'Data');
            return data;
        } else {
            showToast('No historical data found for selected range', 'info', 'Data');
            return [];
        }

    } catch (err) {
        console.error('Error in fetchHistoricalData:', err);
        showToast('Error retrieving historical data', 'error', 'Data Error');
        return null;
    }
}

// Make fetchHistoricalData accessible globally
window.fetchHistoricalData = fetchHistoricalData;

/**
 * Fetch calibration data from Supabase
 * This retrieves the slope (a) and intercept (b) values for sound and air quality calibration
 */
async function fetchCalibrationData() {
    try {
        console.log("Fetching calibration data...");
        showToast('Fetching calibration settings...', 'info', 'Calibration');
        
        const { data, error } = await supabaseClient
            .from('calibration')
            .select('*')
            .eq('id', 'main')
            .single();
        
        if (error) {
            console.error('Error fetching calibration data:', error);
            showToast('Failed to fetch calibration settings', 'error', 'Calibration Error');
            return false;
        }
        
        if (data) {
            console.log('Calibration data retrieved:', data);
            // Update the calibration data object
            calibrationData = {
                sound_a: parseFloat(data.sound_a) || 1,
                sound_b: parseFloat(data.sound_b) || 0,
                air_a: parseFloat(data.air_a) || 1,
                air_b: parseFloat(data.air_b) || 0
            };
            
            updateCalibrationUI();
            showToast('Calibration settings loaded', 'success', 'Calibration');
            return true;
        } else {
            console.warn("No calibration data found");
            showToast('No calibration settings found, using defaults', 'info', 'Calibration');
            return false;
        }
    } catch (err) {
        console.error('Error in fetchCalibrationData:', err);
        showToast('Error retrieving calibration settings', 'error', 'Calibration Error');
        return false;
    }
}

/**
 * Update UI with calibration values
 */
function updateCalibrationUI() {
    // Update input fields with calibration values
    const soundSlope = document.getElementById('sound-slope');
    const soundIntercept = document.getElementById('sound-intercept');
    const airSlope = document.getElementById('air-slope');
    const airIntercept = document.getElementById('air-intercept');
    
    if (soundSlope) soundSlope.value = calibrationData.sound_a;
    if (soundIntercept) soundIntercept.value = calibrationData.sound_b;
    if (airSlope) airSlope.value = calibrationData.air_a;
    if (airIntercept) airIntercept.value = calibrationData.air_b;
    
    // Update calibration graphs
    updateCalibrationGraphs();
}

/**
 * Save calibration data to Supabase
 */
async function saveCalibrationData(type, a, b) {
    try {
        console.log(`Saving ${type} calibration: a=${a}, b=${b}`);
        showToast(`Saving ${type} calibration...`, 'info', 'Calibration');
        
        // Prepare update data based on type
        const updateData = {};
        if (type === 'sound') {
            updateData.sound_a = a;
            updateData.sound_b = b;
        } else if (type === 'air') {
            updateData.air_a = a;
            updateData.air_b = b;
        }
        
        const { data, error } = await supabaseClient
            .from('calibration')
            .upsert({ 
                id: 'main', 
                ...updateData 
            }, { 
                onConflict: 'id' 
            });
        
        if (error) {
            console.error(`Error saving ${type} calibration:`, error);
            showToast(`Failed to save ${type} calibration`, 'error', 'Calibration Error');
            return false;
        }
        
        // Update local calibration data
        if (type === 'sound') {
            calibrationData.sound_a = parseFloat(a);
            calibrationData.sound_b = parseFloat(b);
        } else if (type === 'air') {
            calibrationData.air_a = parseFloat(a);
            calibrationData.air_b = parseFloat(b);
        }
        
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} calibration saved successfully`, 'success', 'Calibration');
        
        // Update the calibration graphs
        updateCalibrationGraphs();
        
        return true;
    } catch (err) {
        console.error(`Error in saveCalibrationData for ${type}:`, err);
        showToast(`Error saving ${type} calibration`, 'error', 'Calibration Error');
        return false;
    }
}

/**
 * Apply calibration formula to raw sensor value
 * @param {string} type - 'sound' or 'air'
 * @param {number} rawValue - The raw sensor value
 * @returns {number} - The calibrated value
 */
function applyCalibration(type, rawValue) {
    if (type === 'sound') {
        return calibrationData.sound_a * rawValue + calibrationData.sound_b;
    } else if (type === 'air') {
        return calibrationData.air_a * rawValue + calibrationData.air_b;
    }
    return rawValue; // Return raw value if type is not recognized
}

/**
 * Update calibration graphs with current values
 * This creates visual representation of the linear calibration equations
 */
function updateCalibrationGraphs() {
    // Generate data points for sound calibration graph
    const soundMin = 0;
    const soundMax = 100;
    const soundDataPoints = generateCalibrationDataPoints(
        calibrationData.sound_a, 
        calibrationData.sound_b, 
        soundMin, 
        soundMax
    );
    
    // Generate data points for air quality calibration graph
    const airMin = 0;
    const airMax = 100;
    const airDataPoints = generateCalibrationDataPoints(
        calibrationData.air_a, 
        calibrationData.air_b, 
        airMin, 
        airMax
    );
    
    // Update or create sound calibration chart
    updateCalibrationChart(
        'sound-calibration-graph',
        soundCalibrationChart,
        soundDataPoints,
        'Sound Calibration',
        'Raw Sensor Value',
        'Calibrated dB',
        (chart) => { soundCalibrationChart = chart; }
    );
    
    // Update or create air quality calibration chart
    updateCalibrationChart(
        'air-calibration-graph',
        airCalibrationChart,
        airDataPoints,
        'Air Quality Calibration',
        'Raw Sensor Value',
        'Calibrated AQI',
        (chart) => { airCalibrationChart = chart; }
    );
}

/**
 * Generate data points for calibration graph
 * @param {number} a - Slope
 * @param {number} b - Intercept
 * @param {number} min - Minimum x value
 * @param {number} max - Maximum x value
 * @returns {Array} Array of point objects {x, y}
 */
function generateCalibrationDataPoints(a, b, min, max) {
    const points = [];
    const step = (max - min) / 10;
    
    for (let x = min; x <= max; x += step) {
        const y = a * x + b;
        points.push({ x, y });
    }
    
    return points;
}

/**
 * Update or create a calibration chart
 * @param {string} canvasId - ID of the canvas element
 * @param {Chart} chart - Existing Chart instance if any
 * @param {Array} data - Data points
 * @param {string} title - Chart title
 * @param {string} xLabel - X-axis label
 * @param {string} yLabel - Y-axis label
 * @param {Function} setChart - Callback to store chart instance
 */
function updateCalibrationChart(canvasId, chart, data, title, xLabel, yLabel, setChart) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Create new chart
    const newChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: title,
                data: data,
                backgroundColor: 'rgba(123, 97, 255, 0.5)',
                borderColor: 'rgba(123, 97, 255, 1)',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                showLine: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xLabel,
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yLabel,
                        color: '#FFFFFF'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#FFFFFF'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#FFFFFF'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `(${context.parsed.x.toFixed(1)}, ${context.parsed.y.toFixed(1)})`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: data[0].y,
                            yMax: data[data.length - 1].y,
                            xMin: data[0].x,
                            xMax: data[data.length - 1].x,
                            borderColor: 'rgba(123, 97, 255, 0.8)',
                            borderWidth: 2
                        }
                    }
                }
            }
        }
    });
    
    // Store chart instance
    setChart(newChart);
}

// Initialize event listeners for calibration forms
document.addEventListener('DOMContentLoaded', () => {
    // Sound calibration save button
    const saveSoundBtn = document.getElementById('save-sound-calibration');
    if (saveSoundBtn) {
        saveSoundBtn.addEventListener('click', async () => {
            const slope = parseFloat(document.getElementById('sound-slope').value);
            const intercept = parseFloat(document.getElementById('sound-intercept').value);
            
            if (isNaN(slope) || isNaN(intercept)) {
                showToast('Please enter valid numbers for calibration values', 'error', 'Validation Error');
                return;
            }
            
            await saveCalibrationData('sound', slope, intercept);
        });
    }
    
    // Air quality calibration save button
    const saveAirBtn = document.getElementById('save-air-calibration');
    if (saveAirBtn) {
        saveAirBtn.addEventListener('click', async () => {
            const slope = parseFloat(document.getElementById('air-slope').value);
            const intercept = parseFloat(document.getElementById('air-intercept').value);
            
            if (isNaN(slope) || isNaN(intercept)) {
                showToast('Please enter valid numbers for calibration values', 'error', 'Validation Error');
                return;
            }
            
            await saveCalibrationData('air', slope, intercept);
        });
    }
    
    // Preview changes when input values change
    const sensorInputs = document.querySelectorAll('#sound-slope, #sound-intercept, #air-slope, #air-intercept');
    sensorInputs.forEach(input => {
        input.addEventListener('change', () => {
            const soundSlope = parseFloat(document.getElementById('sound-slope').value) || calibrationData.sound_a;
            const soundIntercept = parseFloat(document.getElementById('sound-intercept').value) || calibrationData.sound_b;
            const airSlope = parseFloat(document.getElementById('air-slope').value) || calibrationData.air_a;
            const airIntercept = parseFloat(document.getElementById('air-intercept').value) || calibrationData.air_b;
            
            // Generate preview data with current input values
            const soundDataPoints = generateCalibrationDataPoints(soundSlope, soundIntercept, 0, 100);
            const airDataPoints = generateCalibrationDataPoints(airSlope, airIntercept, 0, 100);
            
            // Update charts with preview data
            updateCalibrationChart(
                'sound-calibration-graph',
                soundCalibrationChart,
                soundDataPoints,
                'Sound Calibration (Preview)',
                'Raw Sensor Value',
                'Calibrated dB',
                (chart) => { soundCalibrationChart = chart; }
            );
            
            updateCalibrationChart(
                'air-calibration-graph',
                airCalibrationChart,
                airDataPoints,
                'Air Quality Calibration (Preview)',
                'Raw Sensor Value',
                'Calibrated AQI',
                (chart) => { airCalibrationChart = chart; }
            );
        });
    });
});

// Show toast notification - Remains the same
function showToast(message, type = 'info', title = 'Notification') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Set icon based on type
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${iconClass}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to container
    toastContainer.appendChild(toast);

    // Show after a short delay (for animation)
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('show');

        // Remove from DOM after animation
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 400);
    });

    // Auto-dismiss all toasts after a shorter time (including errors)
    // Use different times based on notification type
    const dismissTime = type === 'error' ? 4000 : 3000;
    
    setTimeout(() => {
        if (toast.classList.contains('show')) {
            toast.classList.remove('show');

            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400);
        }
    }, dismissTime);
}