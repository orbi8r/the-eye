// Main script to initialize the application and handle UI interactions

// DOM Ready event
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEyeAnimation();
    setupUIInteractions();
    setupRoomSelector();
    setupAdminTabs();
    initQuadrantCalibration();
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
                    
                    // Auto-refresh people count chart when admin view is shown
                    if (viewId === 'admin') {
                        console.log('Admin view activated, refreshing people count chart...');
                        setTimeout(async () => {
                            try {
                                const peopleData = await fetchLatestPeopleData(100);
                                if (peopleData) {
                                    updatePeopleCountChart(peopleData);
                                    showToast('People count chart refreshed', 'success', 'Chart Updated');
                                }
                            } catch (err) {
                                console.error('Error auto-refreshing people count chart:', err);
                            }
                        }, 500);
                    }
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
    
    // Update with data from the cache - this will respect the polling intervals
    async function updateStats() {
        try {
            // Update sound display - read from the cached value
            if (latestSoundValue !== null) {
                const soundRounded = Math.round(latestSoundValue);
                noiseLevel.textContent = `${soundRounded} dB`;
                const noisePercentage = Math.min((soundRounded / 120) * 100, 100);
                noiseBar.style.width = `${noisePercentage}%`;
                
                // Update sound timestamp if available
                const noiseLevelLabel = document.querySelector('.stat-panel:nth-child(2) .progress-labels span:nth-child(2)');
                if (noiseLevelLabel) {
                    if (noiseLevelLabel.textContent === 'Coming Soon') {
                        noiseLevelLabel.textContent = `${soundRounded} dB`;
                    }
                    // Update the label with the time since last update
                    if (lastSoundUpdate) {
                        const timeSinceUpdate = Math.floor((new Date() - lastSoundUpdate) / 1000);
                        if (timeSinceUpdate <= 60) {
                            noiseLevelLabel.textContent = `${soundRounded} dB (${timeSinceUpdate}s ago)`;
                        }
                    }
                }
            }
            
            // Update air quality display - read from the cached value
            if (latestAirQualityValue !== null) {
                const airRounded = Math.round(latestAirQualityValue);
                airQuality.textContent = `${airRounded} AQI`;
                const airPercentage = Math.min((airRounded / 300) * 100, 100);
                airQualityBar.style.width = `${airPercentage}%`;
                
                // Update air quality timestamp if available
                const airQualityLabel = document.querySelector('.stat-panel:nth-child(3) .progress-labels span:nth-child(2)');
                if (airQualityLabel) {
                    if (airQualityLabel.textContent === 'Coming Soon') {
                        airQualityLabel.textContent = `${airRounded} AQI`;
                    }
                    // Update the label with the time since last update
                    if (lastAirQualityUpdate) {
                        const timeSinceUpdate = Math.floor((new Date() - lastAirQualityUpdate) / 1000);
                        if (timeSinceUpdate <= 60) {
                            airQualityLabel.textContent = `${airRounded} AQI (${timeSinceUpdate}s ago)`;
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error updating sensor stats:', err);
        }
    }
    
    // Initial update
    updateStats();
    
    // Update display every second - this just updates the UI with the latest cached values
    // The actual polling from Supabase happens at different intervals set in supabase.js
    setInterval(updateStats, 1000);
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
    
    // Initialize control panel switch handlers
    setupControlSwitches();
    
    // Set up refresh buttons for the admin charts
    setupAdminChartRefresh();
}

// Setup refresh buttons and clear buttons for admin charts
function setupAdminChartRefresh() {
    // Helper function to update row count display
    const updateRowCountDisplay = async (tableName, elementId) => {
        const countElement = document.getElementById(elementId);
        if (countElement) {
            try {
                const count = await getTotalRowCount(tableName);
                countElement.textContent = count;
            } catch (err) {
                console.error(`Error getting row count for ${tableName}:`, err);
                countElement.textContent = 'Error';
            }
        }
    };

    // People count refresh and clear buttons
    const refreshPeopleCountBtn = document.getElementById('refresh-people-count');
    const clearPeopleCountBtn = document.getElementById('clear-people-count');
    if (refreshPeopleCountBtn) {
        refreshPeopleCountBtn.addEventListener('click', async () => {
            try {
                refreshPeopleCountBtn.disabled = true;
                refreshPeopleCountBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                
                // Update row count
                await updateRowCountDisplay('people_uv', 'people-count-total-rows');

                // Hide coming soon message
                const comingSoonMsg = document.querySelector('#people-count-tab .coming-soon-message');
                if (comingSoonMsg) {
                    comingSoonMsg.style.display = 'none';
                }
                
                // Show the chart container
                const chartContainer = document.querySelector('#people-count-tab .chart-container');
                if (chartContainer) {
                    chartContainer.style.display = 'block';
                }
                
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
    if (clearPeopleCountBtn) {
        clearPeopleCountBtn.addEventListener('click', async () => {
            try {
                clearPeopleCountBtn.disabled = true;
                clearPeopleCountBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
                const success = await clearOldestData('people_uv', 100);
                if (success) {
                    // Refresh chart and row count after clearing
                    await refreshPeopleCountBtn.click(); 
                }
            } catch (err) {
                console.error('Error clearing people count data:', err);
                showToast('Failed to clear people count data', 'error', 'Error');
            } finally {
                clearPeopleCountBtn.disabled = false;
                clearPeopleCountBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear Oldest 100';
            }
        });
    }

    // Sound level refresh and clear buttons
    const refreshSoundBtn = document.getElementById('refresh-sound-level');
    const clearSoundBtn = document.getElementById('clear-sound-level');
    if (refreshSoundBtn) {
        refreshSoundBtn.addEventListener('click', async () => {
            try {
                refreshSoundBtn.disabled = true;
                refreshSoundBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

                // Update row count
                await updateRowCountDisplay('sound', 'sound-level-total-rows');
                
                // Hide coming soon message
                const comingSoonMsg = document.querySelector('#sound-level-tab .coming-soon-message');
                if (comingSoonMsg) {
                    comingSoonMsg.style.display = 'none';
                }
                
                // Show the chart container
                const chartContainer = document.querySelector('#sound-level-tab .chart-container');
                if (chartContainer) {
                    chartContainer.style.display = 'block';
                }
                
                // Fetch last 100 sound data points
                const soundData = await fetchLatestSoundData100(100);
                
                if (soundData) {
                    updateSoundLevelChart(soundData);
                    showToast('Sound level data updated successfully', 'success', 'Data Updated');
                }
            } catch (err) {
                console.error('Error refreshing sound level data:', err);
                showToast('Failed to refresh sound level data', 'error', 'Error');
            } finally {
                refreshSoundBtn.disabled = false;
                refreshSoundBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            }
        });
    }
    if (clearSoundBtn) {
        clearSoundBtn.addEventListener('click', async () => {
            try {
                clearSoundBtn.disabled = true;
                clearSoundBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
                const success = await clearOldestData('sound', 100);
                if (success) {
                    // Refresh chart and row count after clearing
                    await refreshSoundBtn.click();
                }
            } catch (err) {
                console.error('Error clearing sound level data:', err);
                showToast('Failed to clear sound level data', 'error', 'Error');
            } finally {
                clearSoundBtn.disabled = false;
                clearSoundBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear Oldest 100';
            }
        });
    }
    
    // Air quality refresh and clear buttons
    const refreshAirQualityBtn = document.getElementById('refresh-air-quality');
    const clearAirQualityBtn = document.getElementById('clear-air-quality');
    if (refreshAirQualityBtn) {
        refreshAirQualityBtn.addEventListener('click', async () => {
            try {
                refreshAirQualityBtn.disabled = true;
                refreshAirQualityBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

                // Update row count
                await updateRowCountDisplay('air_quality', 'air-quality-total-rows');
                
                // Hide coming soon message
                const comingSoonMsg = document.querySelector('#air-quality-tab .coming-soon-message');
                if (comingSoonMsg) {
                    comingSoonMsg.style.display = 'none';
                }
                
                // Show the chart container
                const chartContainer = document.querySelector('#air-quality-tab .chart-container');
                if (chartContainer) {
                    chartContainer.style.display = 'block';
                }
                
                // Fetch last 100 air quality data points
                const airQualityData = await fetchLatestAirQualityData100(100);
                
                if (airQualityData) {
                    updateAirQualityChart(airQualityData);
                    showToast('Air quality data updated successfully', 'success', 'Data Updated');
                }
            } catch (err) {
                console.error('Error refreshing air quality data:', err);
                showToast('Failed to refresh air quality data', 'error', 'Error');
            } finally {
                refreshAirQualityBtn.disabled = false;
                refreshAirQualityBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
            }
        });
    }
    if (clearAirQualityBtn) {
        clearAirQualityBtn.addEventListener('click', async () => {
            try {
                clearAirQualityBtn.disabled = true;
                clearAirQualityBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clearing...';
                const success = await clearOldestData('air_quality', 100);
                if (success) {
                    // Refresh chart and row count after clearing
                    await refreshAirQualityBtn.click();
                }
            } catch (err) {
                console.error('Error clearing air quality data:', err);
                showToast('Failed to clear air quality data', 'error', 'Error');
            } finally {
                clearAirQualityBtn.disabled = false;
                clearAirQualityBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear Oldest 100';
            }
        });
    }
    
    // Add light control refresh button handler
    const refreshLightControlBtn = document.getElementById('refresh-light-control');
    if (refreshLightControlBtn) {
        refreshLightControlBtn.addEventListener('click', async () => {
            try {
                refreshLightControlBtn.disabled = true;
                refreshLightControlBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                
                // Hide coming soon message
                const comingSoonMsg = document.querySelector('#light-control-tab .coming-soon-message');
                if (comingSoonMsg) {
                    comingSoonMsg.style.display = 'none';
                }
                
                // Show the control panel
                const controlPanel = document.querySelector('.light-control-panel');
                if (controlPanel) {
                    controlPanel.style.display = 'block';
                }
                
                // Fetch relay, buzzer, and servo states from Supabase
                const controlData = await fetchRelayBuzzerData();
                
                // Fetch quadrant data to get the active state for auto quadrant switch
                await fetchQuadrantData();
                
                if (controlData) {
                    // Map between UI elements and database columns
                    const columnMap = {
                        '1': 'pin1',
                        '2': 'pin2',
                        '3': 'pin3',
                        '4': 'pin4'
                    };
                    
                    // Update relay switches based on retrieved states
                    const relays = document.querySelectorAll('.relay-switch');
                    relays.forEach(relay => {
                        const relayNumber = relay.getAttribute('data-relay');
                        const columnName = columnMap[relayNumber];
                        if (columnName) {
                            relay.checked = controlData[columnName] || false;
                        }
                    });
                    
                    // Update buzzer switch
                    const buzzerSwitch = document.getElementById('buzzer');
                    if (buzzerSwitch) {
                        buzzerSwitch.checked = controlData.buzz || false;
                    }
                    
                    // Update servo switch
                    const servoSwitch = document.getElementById('servo-switch');
                    if (servoSwitch) {
                        servoSwitch.checked = controlData.servo || false;
                    }
                    
                    // Update auto quadrant switch
                    const autoQuadrantSwitch = document.getElementById('auto-quadrant-switch');
                    if (autoQuadrantSwitch) {
                        autoQuadrantSwitch.checked = quadrantData.active || false;
                    }
                    
                    showToast('Control panel updated successfully', 'success', 'Controls');
                }
            } catch (err) {
                console.error('Error refreshing control panel:', err);
                showToast('Failed to refresh control data', 'error', 'Error');
            } finally {
                refreshLightControlBtn.disabled = false;
                refreshLightControlBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            }
        });
    }
    
    const refreshPictureBtn = document.getElementById('refresh-latest-picture');
    if (refreshPictureBtn) {
        refreshPictureBtn.addEventListener('click', async () => {
            try {
                refreshPictureBtn.disabled = true;
                refreshPictureBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                
                // Get the latest image URL
                const imageUrl = await fetchLatestImage();
                
                if (imageUrl) {
                    // Get elements
                    const latestPicture = document.getElementById('latest-picture');
                    const timestamp = document.getElementById('latest-picture-timestamp');
                    const comingSoonMsg = document.querySelector('#latest-picture-tab .coming-soon-message');
                    
                    // Update image
                    latestPicture.src = imageUrl;
                    latestPicture.alt = 'Latest camera image';
                    
                    // Update timestamp
                    const now = new Date();
                    timestamp.textContent = `Last updated: ${now.toLocaleString()}`;
                    
                    // Hide "coming soon" message
                    if (comingSoonMsg) {
                        comingSoonMsg.style.display = 'none';
                    }

                    // Make sure the image container is visible
                    const pictureContainer = document.querySelector('.latest-picture-container');
                    if (pictureContainer) {
                        pictureContainer.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('Error refreshing latest picture:', err);
                showToast('Failed to refresh latest picture', 'error', 'Error');
            } finally {
                refreshPictureBtn.disabled = false;
                refreshPictureBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            }
        });
    }
    
    // Add calibration refresh button
    const refreshCalibrationBtn = document.getElementById('refresh-calibration');
    if (refreshCalibrationBtn) {
        refreshCalibrationBtn.addEventListener('click', async () => {
            refreshCalibrationBtn.disabled = true;
            refreshCalibrationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            
            // Hide coming soon message
            const comingSoonMsg = document.querySelector('#calibration-tab .coming-soon-message');
            if (comingSoonMsg) {
                comingSoonMsg.style.display = 'none';
            }
            
            // Show the calibration panel
            const calibrationPanel = document.querySelector('.calibration-panel');
            if (calibrationPanel) {
                calibrationPanel.style.display = 'block';
            }
            
            // Fetch calibration data from Supabase
            try {
                const success = await fetchCalibrationData();
                if (success) {
                    showToast('Calibration settings loaded successfully', 'success', 'Calibration');
                } else {
                    showToast('Using default calibration values', 'info', 'Calibration');
                }
            } catch (err) {
                console.error('Error loading calibration data:', err);
                showToast('Error loading calibration data', 'error', 'Calibration Error');
            } finally {
                refreshCalibrationBtn.disabled = false;
                refreshCalibrationBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            }
        });
    }
}

// Initialize control panel switch handlers
function setupControlSwitches() {
    console.log("Setting up control switch handlers");
    
    // Map between UI elements and database columns
    const columnMap = {
        '1': 'pin1',
        '2': 'pin2', 
        '3': 'pin3',
        '4': 'pin4'
    };
    
    // Set up relay switches
    const relaysSwitches = document.querySelectorAll('.relay-switch');
    relaysSwitches.forEach(switchElement => {
        const relayNum = switchElement.getAttribute('data-relay');
        console.log(`Setting up event listener for relay ${relayNum}`);
        
        // Remove any existing event listeners to prevent duplicates
        const newSwitch = switchElement.cloneNode(true);
        switchElement.parentNode.replaceChild(newSwitch, switchElement);
        
        // Since we're using clones, also add a click handler to the slider element
        const sliderElement = newSwitch.nextElementSibling;
        if (sliderElement && sliderElement.classList.contains('slider')) {
            sliderElement.addEventListener('click', function(e) {
                // Stop propagation to avoid multiple trigger
                e.stopPropagation();
                // Toggle the checkbox
                newSwitch.checked = !newSwitch.checked;
                // Trigger the change event manually
                newSwitch.dispatchEvent(new Event('change'));
            });
        }
        
        // Add the switch change event listener
        newSwitch.addEventListener('change', async () => {
            const isChecked = newSwitch.checked;
            console.log(`Relay ${relayNum} toggled to ${isChecked}`);
            
            // Disable the switch during update
            newSwitch.disabled = true;
            
            try {
                // Map the relay number to the correct column name
                const columnName = columnMap[relayNum];
                
                // Update the state in Supabase
                const success = await updateDeviceState(`relay${relayNum}`, isChecked);
                
                // If update failed, revert the UI
                if (!success) {
                    newSwitch.checked = !isChecked;
                    showToast(`Failed to update relay ${relayNum}`, 'error', 'Control Error');
                } else {
                    showToast(`Relay ${relayNum} ${isChecked ? 'activated' : 'deactivated'}`, 'success', 'Controls');
                }
            } catch (err) {
                console.error(`Error toggling relay ${relayNum}:`, err);
                newSwitch.checked = !isChecked; // Revert on error
                showToast(`Error toggling relay ${relayNum}`, 'error', 'Control Error');
            } finally {
                // Re-enable the switch
                newSwitch.disabled = false;
            }
        });
    });
    
    // Set up buzzer switch
    const buzzerSwitch = document.getElementById('buzzer');
    if (buzzerSwitch) {
        console.log("Setting up event listener for buzzer");
        
        // Remove any existing event listeners to prevent duplicates
        const newBuzzer = buzzerSwitch.cloneNode(true);
        buzzerSwitch.parentNode.replaceChild(newBuzzer, buzzerSwitch);
        
        // Since we're using clones, also add a click handler to the slider element
        const sliderElement = newBuzzer.nextElementSibling;
        if (sliderElement && sliderElement.classList.contains('slider')) {
            sliderElement.addEventListener('click', function(e) {
                // Stop propagation to avoid multiple trigger
                e.stopPropagation();
                // Toggle the checkbox
                newBuzzer.checked = !newBuzzer.checked;
                // Trigger the change event manually
                newBuzzer.dispatchEvent(new Event('change'));
            });
        }
        
        // Add new event listener to the cloned switch
        newBuzzer.addEventListener('change', async () => {
            const isChecked = newBuzzer.checked;
            console.log(`Buzzer toggled to ${isChecked}`);
            
            // Disable the switch during update
            newBuzzer.disabled = true;
            
            try {
                // Update the state in Supabase - use 'buzzer' as the device name which will map to 'buzz' in updateDeviceState
                const success = await updateDeviceState('buzzer', isChecked);
                
                // If update failed, revert the UI
                if (!success) {
                    newBuzzer.checked = !isChecked;
                    showToast('Failed to update buzzer', 'error', 'Control Error');
                } else {
                    showToast(`Buzzer ${isChecked ? 'activated' : 'deactivated'}`, 'success', 'Controls');
                }
            } catch (err) {
                console.error('Error toggling buzzer:', err);
                newBuzzer.checked = !isChecked; // Revert on error
                showToast('Error toggling buzzer', 'error', 'Control Error');
            } finally {
                // Re-enable the switch
                newBuzzer.disabled = false;
            }
        });
    }

    // Set up servo switch
    const servoSwitch = document.getElementById('servo-switch');
    if (servoSwitch) {
        console.log("Setting up event listener for servo");

        // Remove any existing event listeners to prevent duplicates
        const newServo = servoSwitch.cloneNode(true);
        servoSwitch.parentNode.replaceChild(newServo, servoSwitch);

        // Add click handler to the slider element
        const sliderElement = newServo.nextElementSibling;
        if (sliderElement && sliderElement.classList.contains('slider')) {
            sliderElement.addEventListener('click', function(e) {
                e.stopPropagation();
                newServo.checked = !newServo.checked;
                newServo.dispatchEvent(new Event('change'));
            });
        }

        // Add new event listener to the cloned switch
        newServo.addEventListener('change', async () => {
            const isChecked = newServo.checked;
            console.log(`Servo toggled to ${isChecked}`);
            
            newServo.disabled = true;
            
            try {
                // Update the state in Supabase using 'servo' as the device name
                const success = await updateDeviceState('servo', isChecked);
                
                if (!success) {
                    newServo.checked = !isChecked;
                    showToast('Failed to update servo', 'error', 'Control Error');
                } else {
                    showToast(`Servo ${isChecked ? 'activated' : 'deactivated'}`, 'success', 'Controls');
                }
            } catch (err) {
                console.error('Error toggling servo:', err);
                newServo.checked = !isChecked; // Revert on error
                showToast('Error toggling servo', 'error', 'Control Error');
            } finally {
                newServo.disabled = false;
            }
        });
    }
    
    // Set up auto quadrant switch
    const autoQuadrantSwitch = document.getElementById('auto-quadrant-switch');
    if (autoQuadrantSwitch) {
        console.log("Setting up event listener for auto quadrant");

        // Remove any existing event listeners to prevent duplicates
        const newAutoQuadrant = autoQuadrantSwitch.cloneNode(true);
        autoQuadrantSwitch.parentNode.replaceChild(newAutoQuadrant, autoQuadrantSwitch);

        // Add click handler to the slider element
        const sliderElement = newAutoQuadrant.nextElementSibling;
        if (sliderElement && sliderElement.classList.contains('slider')) {
            sliderElement.addEventListener('click', function(e) {
                e.stopPropagation();
                newAutoQuadrant.checked = !newAutoQuadrant.checked;
                newAutoQuadrant.dispatchEvent(new Event('change'));
            });
        }

        // Add new event listener to the cloned switch
        newAutoQuadrant.addEventListener('change', async () => {
            const isChecked = newAutoQuadrant.checked;
            console.log(`Auto Quadrant toggled to ${isChecked}`);
            
            newAutoQuadrant.disabled = true;
            
            try {
                // Update the state in Supabase using updateQuadrantActiveState function
                const success = await updateQuadrantActiveState(isChecked);
                
                if (!success) {
                    newAutoQuadrant.checked = !isChecked;
                    showToast('Failed to update auto quadrant', 'error', 'Control Error');
                } else {
                    showToast(`Auto Quadrant ${isChecked ? 'activated' : 'deactivated'}`, 'success', 'Controls');
                }
            } catch (err) {
                console.error('Error toggling auto quadrant:', err);
                newAutoQuadrant.checked = !isChecked; // Revert on error
                showToast('Error toggling auto quadrant', 'error', 'Control Error');
            } finally {
                newAutoQuadrant.disabled = false;
            }
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

/**
 * Initialize quadrant calibration functionality in the Latest Picture tab
 */
function initQuadrantCalibration() {
    // Canvas and controls
    const canvas = document.getElementById('quadrant-calibration-canvas');
    if (!canvas) return;
    
    // Get calibration buttons
    const startButton = document.getElementById('start-quadrant-calibration');
    const clearButton = document.getElementById('clear-quadrant-calibration');
    const saveButton = document.getElementById('save-quadrant-calibration');
    
    // Get input fields for direct coordinate entry
    const x1Input = document.getElementById('x1-input');
    const x2Input = document.getElementById('x2-input');
    const y1Input = document.getElementById('y1-input');
    const y2Input = document.getElementById('y2-input');
    
    // State variables for calibration
    let isCalibrating = false;
    let activeLineType = ''; // 'x1', 'x2', 'y1', or 'y2'
    let hoveredLine = ''; // Track which line the cursor is near
    
    // Initialize input fields with current values
    function updateInputFields() {
        if (x1Input) x1Input.value = quadrantData.x1.toFixed(2);
        if (x2Input) x2Input.value = quadrantData.x2.toFixed(2);
        if (y1Input) y1Input.value = quadrantData.y1.toFixed(2);
        if (y2Input) y2Input.value = quadrantData.y2.toFixed(2);
    }
    
    // Add event listeners for input fields
    if (x1Input) {
        x1Input.addEventListener('change', () => {
            const value = parseFloat(x1Input.value);
            if (!isNaN(value) && value >= 0 && value <= 1) {
                quadrantData.x1 = value;
                updateQuadrantUI();
            } else {
                x1Input.value = quadrantData.x1.toFixed(2);
                showToast('X1 value must be between 0 and 1', 'error', 'Input Error');
            }
        });
    }
    
    if (x2Input) {
        x2Input.addEventListener('change', () => {
            const value = parseFloat(x2Input.value);
            if (!isNaN(value) && value >= 0 && value <= 1) {
                quadrantData.x2 = value;
                updateQuadrantUI();
            } else {
                x2Input.value = quadrantData.x2.toFixed(2);
                showToast('X2 value must be between 0 and 1', 'error', 'Input Error');
            }
        });
    }
    
    if (y1Input) {
        y1Input.addEventListener('change', () => {
            const value = parseFloat(y1Input.value);
            if (!isNaN(value) && value >= 0 && value <= 1) {
                quadrantData.y1 = value;
                updateQuadrantUI();
            } else {
                y1Input.value = quadrantData.y1.toFixed(2);
                showToast('Y1 value must be between 0 and 1', 'error', 'Input Error');
            }
        });
    }
    
    if (y2Input) {
        y2Input.addEventListener('change', () => {
            const value = parseFloat(y2Input.value);
            if (!isNaN(value) && value >= 0 && value <= 1) {
                quadrantData.y2 = value;
                updateQuadrantUI();
            } else {
                y2Input.value = quadrantData.y2.toFixed(2);
                showToast('Y2 value must be between 0 and 1', 'error', 'Input Error');
            }
        });
    }
    
    // Fetch quadrant data when loading the latest picture
    const refreshButton = document.getElementById('refresh-latest-picture');
    if (refreshButton) {
        const originalClickHandler = refreshButton.onclick;
        
        refreshButton.onclick = async function(e) {
            // Call original handler if it exists
            if (originalClickHandler) {
                originalClickHandler.call(this, e);
            } else {
                // Load latest image
                const latestPicture = document.getElementById('latest-picture');
                const imageUrl = await fetchLatestImage();
                if (imageUrl) {
                    latestPicture.src = imageUrl;
                    latestPicture.onload = function() {
                        // Image is loaded, now fetch quadrant data and draw lines
                        fetchQuadrantData();
                    };
                    document.getElementById('latest-picture-timestamp').textContent = 'Retrieved at ' + new Date().toLocaleTimeString();
                } else {
                    latestPicture.src = "#";
                    document.getElementById('latest-picture-timestamp').textContent = 'Failed to load image';
                }
            }
            
            // Make the coming soon message hidden
            const comingSoonMessage = document.querySelector('#latest-picture-tab .coming-soon-message');
            if (comingSoonMessage) {
                comingSoonMessage.style.display = 'none';
            }
        };
    }
    
    // Start calibration button
    startButton.addEventListener('click', () => {
        isCalibrating = true;
        canvas.style.cursor = 'crosshair';
        startButton.disabled = true;
        clearButton.disabled = false;
        
        // Show instructions
        showToast('Click and drag the vertical and horizontal lines to adjust quadrants', 'info', 'Quadrant Calibration');
    });
    
    // Clear calibration button (reset to default)
    clearButton.addEventListener('click', () => {
        isCalibrating = false;
        activeLineType = '';
        startButton.disabled = false;
        
        // Reset to default values
        quadrantData = {
            x1: 0.33, // First vertical line (1/3 of image width)
            x2: 0.66, // Second vertical line (2/3 of image width)
            y1: 0.33, // First horizontal line (1/3 of image height)
            y2: 0.66  // Second horizontal line (2/3 of image height)
        };
        
        updateQuadrantUI();
        updateInputFields();
        showToast('Calibration reset to default values', 'info', 'Quadrant Calibration');
    });
    
    // Save calibration button
    saveButton.addEventListener('click', async () => {
        isCalibrating = false;
        activeLineType = '';
        startButton.disabled = false;
        await saveQuadrantData();
    });

    // Function to find the nearest line to a given point
    function findNearestLine(x, y, canvasWidth, canvasHeight) {
        // Calculate points for the tilted lines
        const line1Start = { x: quadrantData.x1 * canvasWidth, y: 0 };
        const line1End = { x: quadrantData.x2 * canvasWidth, y: canvasHeight };
        
        const line2Start = { x: 0, y: quadrantData.y1 * canvasHeight };
        const line2End = { x: canvasWidth, y: quadrantData.y2 * canvasHeight };
        
        // Calculate distances from point to each line
        const distToLine1 = distanceToLine(x, y, line1Start.x, line1Start.y, line1End.x, line1End.y);
        const distToLine2 = distanceToLine(x, y, line2Start.x, line2Start.y, line2End.x, line2End.y);
        
        // Find the nearest line (within 10 pixels)
        const lines = [
            { type: 'x', distance: distToLine1 }, // Purple diagonal line
            { type: 'y', distance: distToLine2 }  // Pink diagonal line
        ];
        
        const nearest = lines.reduce((min, line) => 
            line.distance < min.distance ? line : min, { distance: 10 });
        
        // Return the type of line if close enough, null otherwise
        return nearest.distance <= 10 ? nearest.type : null;
    }
    
    // Helper function to calculate distance from a point to a line segment
    function distanceToLine(x, y, x1, y1, x2, y2) {
        // Line length squared
        const lengthSquared = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
        if (lengthSquared === 0) return Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
        
        // Calculate projection and clamp to line segment
        const t = Math.max(0, Math.min(1, 
            ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lengthSquared
        ));
        
        // Find the closest point on the line segment
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        
        // Return the distance to this point
        return Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));
    }

    // Mouse move event for line highlighting and dragging
    canvas.addEventListener('mousemove', (e) => {
        if (!isCalibrating) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Calculate position in canvas coordinates
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        if (activeLineType) {
            // Dragging mode - update the active line position
            
            if (activeLineType === 'x') {
                // For the purple diagonal line (x1,0) to (x2,1)
                // Determine if we're closer to the top or bottom endpoint
                const distToTop = Math.sqrt(Math.pow(x - quadrantData.x1 * canvas.width, 2) + Math.pow(y - 0, 2));
                const distToBottom = Math.sqrt(Math.pow(x - quadrantData.x2 * canvas.width, 2) + Math.pow(y - canvas.height, 2));
                
                if (distToTop < distToBottom) {
                    // Dragging the top endpoint (x1,0)
                    quadrantData.x1 = Math.max(0, Math.min(1, x / canvas.width));
                } else {
                    // Dragging the bottom endpoint (x2,1)
                    quadrantData.x2 = Math.max(0, Math.min(1, x / canvas.width));
                }
            } else if (activeLineType === 'y') {
                // For the pink diagonal line (0,y1) to (1,y2)
                // Determine if we're closer to the left or right endpoint
                const distToLeft = Math.sqrt(Math.pow(x - 0, 2) + Math.pow(y - quadrantData.y1 * canvas.height, 2));
                const distToRight = Math.sqrt(Math.pow(x - canvas.width, 2) + Math.pow(y - quadrantData.y2 * canvas.height, 2));
                
                if (distToLeft < distToRight) {
                    // Dragging the left endpoint (0,y1)
                    quadrantData.y1 = Math.max(0, Math.min(1, y / canvas.height));
                } else {
                    // Dragging the right endpoint (1,y2)
                    quadrantData.y2 = Math.max(0, Math.min(1, y / canvas.height));
                }
            }
            
            // Redraw lines with updated positions and update input fields
            updateQuadrantUI();
            updateInputFields();
        } else {
            // Highlight mode - determine if we're near a line
            hoveredLine = findNearestLine(x, y, canvas.width, canvas.height);
            
            // Update cursor based on nearest line
            if (hoveredLine) {
                canvas.style.cursor = 'move';
            } else {
                canvas.style.cursor = 'crosshair';
            }
        }
    });
    
    // Mouse down event to start dragging a line
    canvas.addEventListener('mousedown', (e) => {
        if (!isCalibrating) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Calculate position in canvas coordinates
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Find which line we're clicking on
        activeLineType = findNearestLine(x, y, canvas.width, canvas.height);
        
        // Prevent text selection while dragging
        e.preventDefault();
    });
    
    // Mouse up event for ending line drag
    canvas.addEventListener('mouseup', () => {
        if (!isCalibrating) return;
        activeLineType = '';
    });
    
    // Mouse leave event to stop dragging if cursor leaves canvas
    canvas.addEventListener('mouseleave', () => {
        if (isCalibrating) {
            activeLineType = '';
            canvas.style.cursor = 'default';
        }
    });
}

// Prevent multiple initialization
if (typeof window.appInitialized === 'undefined') {
    window.appInitialized = true;
} else {
    console.warn('main.js loaded multiple times');
}