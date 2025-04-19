// Main script to initialize the application and handle UI interactions

// DOM Ready event
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEyeAnimation();
    setupUIInteractions();
    setupRoomSelector();
    setupAdminTabs();
});

// Initialize the application
async function initApp() {
    console.log("Initializing application...");
    
    // Initialize visualizations
    initVisualizations();
    
    // Initialize charts
    initCharts();
    
    // Fetch initial data and start polling (handled within supabase.js now)
    await fetchInitialData();
    
    // Remove the call to subscribeToUVData as we are now polling
    // subscribeToUVData();
    
    console.log("Application initialized successfully");
}

// Setup eye animation following cursor
function setupEyeAnimation() {
    const eye = document.querySelector('.eye');
    const pupil = document.querySelector('.pupil');
    
    if (!eye || !pupil) return;
    
    document.addEventListener('mousemove', (e) => {
        const eyeRect = eye.getBoundingClientRect();
        const eyeCenterX = eyeRect.left + eyeRect.width / 2;
        const eyeCenterY = eyeRect.top + eyeRect.height / 2;
        
        // Calculate angle between eye center and cursor
        const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);
        
        // Calculate maximum distance pupil can move (25% of eye radius)
        const maxDistance = eyeRect.width * 0.25;
        
        // Calculate new position of pupil
        const pupilX = Math.cos(angle) * maxDistance;
        const pupilY = Math.sin(angle) * maxDistance;
        
        // Apply transform to pupil
        pupil.style.transform = `translate(calc(-50% + ${pupilX}px), calc(-50% + ${pupilY}px))`;
    });
    
    // Blink occasionally
    setInterval(() => {
        eye.style.height = '2px';
        eye.style.marginTop = '19px';
        
        setTimeout(() => {
            eye.style.height = '40px';
            eye.style.marginTop = '0';
        }, 200);
    }, 7000);
}

// Setup UI interactions (tab navigation, etc.)
function setupUIInteractions() {
    // Tab navigation for sidebar
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const tabContents = document.querySelectorAll('.tab-content');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            
            // Update active sidebar item
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${viewId}-view`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Simulate some stats for demonstration
    simulateStats();
}

// Setup room selector functionality
function setupRoomSelector() {
    // Get room cards and details panel
    const roomCards = document.querySelectorAll('.room-card');
    const detailsPanel = document.getElementById('room-details-panel');
    const roomsGrid = document.querySelector('.rooms-grid');
    const backButton = document.getElementById('back-to-rooms');
    const roomDetailTitle = document.getElementById('room-detail-title');
    
    if (!roomCards.length || !detailsPanel) return;
    
    // Set up click handlers for room cards
    roomCards.forEach(card => {
        card.addEventListener('click', () => {
            const roomNumber = card.getAttribute('data-room');
            const isDisabled = card.classList.contains('disabled');
            
            if (isDisabled) {
                // For disabled rooms, show the details panel with "coming soon" message
                roomsGrid.classList.add('hidden');
                detailsPanel.classList.remove('hidden');
                roomDetailTitle.textContent = `Room ${roomNumber} Details`;
            } else {
                // For active rooms (Room 1), navigate to dashboard view
                const dashboardItem = document.querySelector('.sidebar-item[data-view="dashboard"]');
                if (dashboardItem) {
                    dashboardItem.click();
                }
            }
        });
    });
    
    // Set up back button
    if (backButton) {
        backButton.addEventListener('click', () => {
            roomsGrid.classList.remove('hidden');
            detailsPanel.classList.add('hidden');
        });
    }
    
    // Sync room 1 count with dashboard people count
    syncRoom1Count();
}

// Sync Room 1 count with the main dashboard people count
function syncRoom1Count() {
    // Get initial value
    const peopleCount = document.getElementById('people-count');
    const room1Count = document.getElementById('room1-count');
    
    if (peopleCount && room1Count) {
        room1Count.textContent = peopleCount.textContent;
        
        // Set up a MutationObserver to watch for changes to people-count
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    room1Count.textContent = peopleCount.textContent;
                }
            });
        });
        
        observer.observe(peopleCount, {
            characterData: true,
            childList: true,
            subtree: true
        });
    }
}

// Simulate stats for noise and air quality (placeholder for future implementation)
function simulateStats() {
    // Get elements
    const noiseLevel = document.getElementById('noise-level');
    const noiseBar = document.getElementById('noise-bar');
    const airQuality = document.getElementById('air-quality');
    const airQualityBar = document.getElementById('air-quality-bar');
    
    if (!noiseLevel || !noiseBar || !airQuality || !airQualityBar) return;
    
    // Function to update stats with random values
    function updateSimulatedStats() {
        // Simulate noise (40-80 dB)
        const noise = Math.floor(Math.random() * 40) + 40;
        noiseLevel.textContent = `${noise} dB`;
        const noisePercentage = (noise / 120) * 100;
        noiseBar.style.width = `${noisePercentage}%`;
        
        // Simulate air quality (0-100 AQI)
        const aqi = Math.floor(Math.random() * 50) + 30;
        airQuality.textContent = `${aqi} AQI`;
        const aqiPercentage = (aqi / 100) * 100;
        airQualityBar.style.width = `${aqiPercentage}%`;
    }
    
    // Initial update
    updateSimulatedStats();
    
    // Update every 5 seconds with slight variations
    setInterval(updateSimulatedStats, 5000);
}

// Setup admin tabs functionality
function setupAdminTabs() {
    const adminTabs = document.querySelectorAll('.admin-tab');
    const adminTabContents = document.querySelectorAll('.admin-tab-content');
    
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-admin-tab');
            
            // Update active tab
            adminTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            adminTabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Set up refresh buttons for the admin charts
    setupAdminChartRefresh();
}

// Setup refresh buttons for admin charts
function setupAdminChartRefresh() {
    // People count refresh button
    const refreshPeopleCountBtn = document.getElementById('refresh-people-count');
    if (refreshPeopleCountBtn) {
        refreshPeopleCountBtn.addEventListener('click', async () => {
            try {
                refreshPeopleCountBtn.disabled = true;
                refreshPeopleCountBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                
                // Fetch last 100 data points
                const peopleData = await fetchLatestPeopleData(100);
                
                if (peopleData) {
                    updatePeopleCountChart(peopleData);
                    showToast('People count data updated successfully', 'success', 'Data Updated');
                }
            } catch (err) {
                console.error('Error refreshing people count data:', err);
                showToast('Failed to refresh people count data', 'error', 'Error');
            } finally {
                refreshPeopleCountBtn.disabled = false;
                refreshPeopleCountBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            }
        });
    }
    
    // Setup other refresh buttons (will be implemented later)
    const refreshSoundBtn = document.getElementById('refresh-sound-level');
    if (refreshSoundBtn) {
        refreshSoundBtn.addEventListener('click', () => {
            showToast('Sound level monitoring coming soon', 'info', 'Coming Soon');
        });
    }
    
    const refreshAirQualityBtn = document.getElementById('refresh-air-quality');
    if (refreshAirQualityBtn) {
        refreshAirQualityBtn.addEventListener('click', () => {
            showToast('Air quality monitoring coming soon', 'info', 'Coming Soon');
        });
    }
    
    const refreshPictureBtn = document.getElementById('refresh-latest-picture');
    if (refreshPictureBtn) {
        refreshPictureBtn.addEventListener('click', () => {
            showToast('Latest picture feature coming soon', 'info', 'Coming Soon');
        });
    }
}

// Main function to update UI with new data
function updateUI(data) {
    // Ensure data is valid before updating UI components
    if (!data) {
        console.warn("updateUI called with invalid data.");
        return;
    }
    updateRoomVisualization(data);
    updateDataDisplay(data);
    // Optionally update charts if needed with latest data point
    // updatePeopleChart(data.uv_coords ? data.uv_coords.length : 0); // Example if you want the main chart to update too
}

// Handle window resize for responsive charts and heatmaps
window.addEventListener('resize', () => {
    // Resize main chart
    if (typeof peopleChart !== 'undefined' && peopleChart) {
        peopleChart.resize();
    }
    
    // Resize heatmap instances
    if (typeof heatmapInstance !== 'undefined' && heatmapInstance && heatmapInstance.canvas) {
        const heatmapContainer = document.getElementById('heatmap-container');
        if (heatmapContainer) {
            // Force redraw - setting data might be necessary if resize isn't enough
            // heatmapInstance.setData(heatmapInstance.getData()); 
            // Or try forcing canvas resize if heatmap.js supports it implicitly
            heatmapInstance.canvas.width = heatmapContainer.clientWidth;
            heatmapInstance.canvas.height = heatmapContainer.clientHeight;
            heatmapInstance.repaint(); // Repaint after resize
            console.log('Main heatmap resized');
        }
    }
    if (typeof miniHeatmapInstance !== 'undefined' && miniHeatmapInstance && miniHeatmapInstance.canvas) {
        const miniHeatmapContainer = document.querySelector('.mini-heatmap');
        if (miniHeatmapContainer) {
            miniHeatmapInstance.canvas.width = miniHeatmapContainer.clientWidth;
            miniHeatmapInstance.canvas.height = miniHeatmapContainer.clientHeight;
            miniHeatmapInstance.repaint();
            console.log('Mini heatmap resized');
        }
    }
});