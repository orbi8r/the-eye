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
            updateUI(data); // Update UI with the latest data
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

// Fetch historical data for charts and analysis (for admin view) - Remains largely the same
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

    // Auto-dismiss after 5 seconds (except for errors)
    if (type !== 'error') {
        setTimeout(() => {
            if (toast.classList.contains('show')) {
                toast.classList.remove('show');

                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 400);
            }
        }, 5000);
    }
}