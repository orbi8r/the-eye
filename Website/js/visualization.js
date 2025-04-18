// Visualization handling for heatmap and people markers
let heatmapInstance;
let miniHeatmapInstance;
let peopleMarkersContainer;
const MAX_PEOPLE = 40; // Room capacity
const COLORS = [
    'rgba(126, 83, 248, 0.8)',  // Purple
    'rgba(255, 83, 180, 0.8)',  // Pink
    'rgba(83, 216, 255, 0.8)',  // Cyan
    'rgba(83, 248, 170, 0.8)'   // Green
];

// Initialize visualization components
function initVisualizations() {
    // Initialize main heatmap with AI-like colorful glow effect
    const heatmapContainer = document.getElementById('heatmap-container');
    if (heatmapContainer) {
        heatmapInstance = h337.create({
            container: heatmapContainer,
            radius: 60,
            maxOpacity: 0.6,
            minOpacity: 0.1,
            blur: 0.9,
            gradient: {
                0.1: '#5362ff',
                0.4: '#53d8ff',
                0.6: '#7e53f8',
                0.8: '#ff53b4',
                1.0: '#ff53b4'
            }
        });
        // Attempt to set willReadFrequently for performance
        const heatmapCanvas = heatmapContainer.querySelector('canvas');
        if (heatmapCanvas) {
            try {
                heatmapCanvas.getContext('2d', { willReadFrequently: true });
                console.log("Set willReadFrequently for main heatmap canvas.");
            } catch (e) {
                console.warn("Could not set willReadFrequently on main heatmap canvas:", e);
            }
        }
    }
    
    // Initialize mini heatmap for room selector
    const miniHeatmapContainer = document.querySelector('.mini-heatmap');
    if (miniHeatmapContainer) {
        miniHeatmapInstance = h337.create({
            container: miniHeatmapContainer,
            radius: 30,
            maxOpacity: 0.6,
            minOpacity: 0.1,
            blur: 0.9,
            gradient: {
                0.1: '#5362ff',
                0.4: '#53d8ff',
                0.6: '#7e53f8',
                0.8: '#ff53b4',
                1.0: '#ff53b4'
            }
        });
        // Attempt to set willReadFrequently for performance
        const miniHeatmapCanvas = miniHeatmapContainer.querySelector('canvas');
        if (miniHeatmapCanvas) {
            try {
                miniHeatmapCanvas.getContext('2d', { willReadFrequently: true });
                console.log("Set willReadFrequently for mini heatmap canvas.");
            } catch (e) {
                console.warn("Could not set willReadFrequently on mini heatmap canvas:", e);
            }
        }
    }
    
    peopleMarkersContainer = document.getElementById('people-markers');
    
    // Create ambient floating particles for UV cloud effect
    // createAmbientParticles(); // Commented out to remove background circles
    
    // Add loading state initially
    showLoadingState();
    
    console.log("Visualizations initialized");
}

// Show loading state for visualizations
function showLoadingState() {
    const roomView = document.querySelector('.room-view');
    if (!roomView) return;
    
    // Check if loading overlay already exists
    if (!document.querySelector('.loading-overlay')) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
            </div>
            <div class="loading-text">Connecting to Supabase...</div>
        `;
        roomView.appendChild(loadingOverlay);
    }
}

// Hide loading state
function hideLoadingState() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (loadingOverlay.parentNode) {
                loadingOverlay.parentNode.removeChild(loadingOverlay);
            }
        }, 500);
    }
}

// Create floating ambient particles for the cloud effect
function createAmbientParticles() {
    const container = document.querySelector('.cloud-effect');
    if (!container) return;
    
    // Create 20 ambient particles
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'uv-particle';
        
        // Random size between 30 and 100
        const size = Math.floor(Math.random() * 70) + 30;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Random position
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        // Random color from our palette
        const colorIndex = Math.floor(Math.random() * COLORS.length);
        particle.style.backgroundColor = COLORS[colorIndex];
        
        // Random animation delay
        particle.style.animationDelay = `${Math.random() * 8}s`;
        
        container.appendChild(particle);
    }
}

// Update room visualization with new UV data
function updateRoomVisualization(data) {
    // Check if data and uv_coords exist
    if (!data || typeof data.uv_coords === 'undefined') {
        console.warn("updateRoomVisualization called with missing data or uv_coords.");
        return;
    }

    let uvCoordsArray = [];
    // Check if uv_coords is a string and needs parsing
    if (typeof data.uv_coords === 'string') {
        try {
            uvCoordsArray = JSON.parse(data.uv_coords);
            // Ensure the parsed result is actually an array
            if (!Array.isArray(uvCoordsArray)) {
                console.error("Parsed uv_coords is not an array:", uvCoordsArray);
                uvCoordsArray = []; // Reset to empty array if parsing result is not an array
            }
        } catch (e) {
            console.error("Error parsing uv_coords JSON string:", e);
            // Optionally show an error to the user or handle it gracefully
            return; // Stop processing if parsing fails
        }
    } else if (Array.isArray(data.uv_coords)) {
        // If it's already an array (e.g., if column type is JSONB and Supabase parses it automatically)
        uvCoordsArray = data.uv_coords;
    } else {
        console.warn("uv_coords is neither a string nor an array:", data.uv_coords);
        return; // Stop if it's an unexpected type
    }

    // Check if the array is empty after potential parsing
    if (!uvCoordsArray || uvCoordsArray.length === 0) {
        // console.log("No UV coordinates to display.");
        // Optionally clear the heatmap or show a 'no people' state
        if (heatmapInstance) {
            heatmapInstance.setData({ max: 1, data: [] });
        }
        if (peopleMarkersContainer) {
            peopleMarkersContainer.innerHTML = '';
        }
        updatePeopleCount(0);
        // Don't hide loading state if there's genuinely no data yet, maybe check connection status?
        // hideLoadingState(); 
        return;
    }

    // Hide loading state if it's still visible and we have data
    hideLoadingState();

    // Clear previous markers
    if (peopleMarkersContainer) {
        peopleMarkersContainer.innerHTML = '';
    }

    // Get container dimensions
    const container = document.querySelector('.room-container');
    if (!container) {
        console.error("Cannot find .room-container element!");
        return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    console.log(`Heatmap container dimensions: width=${width}, height=${height}`); // Log dimensions

    // Check if dimensions are valid
    if (width === 0 || height === 0) {
        console.warn("Heatmap container has zero width or height. Points will not be calculated correctly.");
        // Optionally, wait and retry or just return
        // return;
    }

    // Prepare heatmap data
    const points = [];
    const peopleCount = uvCoordsArray.length;

    // Update each person marker using the parsed array
    uvCoordsArray.forEach((coord, index) => {
        // Check if coord has u and v properties
        if (typeof coord.u !== 'number' || typeof coord.v !== 'number') {
            console.warn(`Invalid coordinate format at index ${index}:`, coord);
            return; // Skip this invalid coordinate
        }
        const { u, v } = coord;

        const x = Math.floor(u * width);
        const y = Math.floor(v * height);

        // Add point for heatmap
        points.push({
            x: x,
            y: y,
            value: 1
        });

        // Create person marker with a glowing effect
        if (peopleMarkersContainer) {
            const marker = document.createElement('div');
            marker.className = 'person-marker';
            marker.style.left = `${u * 100}%`;
            marker.style.top = `${v * 100}%`;

            // Use a random color from our palette for each person
            const colorIndex = index % COLORS.length;
            marker.style.background = `radial-gradient(circle, ${COLORS[colorIndex]} 0%, rgba(255,255,255,0) 70%)`;

            marker.setAttribute('data-person-id', index + 1);

            // Add info on hover
            marker.addEventListener('mouseover', (e) => {
                showInfoLabel(`Person ${index + 1}`, e.clientX, e.clientY);
            });

            marker.addEventListener('mouseout', () => {
                hideInfoLabel();
            });

            peopleMarkersContainer.appendChild(marker);
        }
    });

    console.log("Heatmap points:", JSON.stringify(points)); // Log the generated points

    // Update main heatmap with points and weighted values
    if (heatmapInstance) {
        try {
            heatmapInstance.setData({
                max: 10,
                data: points
            });
            console.log("Heatmap data set successfully.");
        } catch (e) {
            console.error("Error setting heatmap data:", e);
        }
    }

    // Update mini-heatmap in room selector if it exists
    updateMiniHeatmap(uvCoordsArray); // Pass the parsed array

    // Update statistics
    updatePeopleCount(peopleCount);
}

// Update mini-heatmap in room selector
function updateMiniHeatmap(uvCoords) {
    if (!miniHeatmapInstance || !uvCoords) return;
    
    const miniContainer = document.querySelector('.mini-heatmap');
    if (!miniContainer) return;
    
    const width = miniContainer.clientWidth;
    const height = miniContainer.clientHeight;
    
    const miniPoints = uvCoords.map(coord => ({
        x: Math.floor(coord.u * width),
        y: Math.floor(coord.v * height),
        value: 1
    }));
    
    miniHeatmapInstance.setData({
        max: 5,
        data: miniPoints
    });
}

// Show info label (tooltip)
function showInfoLabel(text, x, y) {
    const infoLabel = document.getElementById('info-label');
    if (!infoLabel) return;
    
    infoLabel.textContent = text;
    infoLabel.style.left = `${x + 10}px`;
    infoLabel.style.top = `${y - 30}px`;
    infoLabel.classList.add('show');
}

// Hide info label
function hideInfoLabel() {
    const infoLabel = document.getElementById('info-label');
    if (!infoLabel) return;
    
    infoLabel.classList.remove('show');
}

// Update people count and room fullness statistics
function updatePeopleCount(count) {
    const peopleCountEl = document.getElementById('people-count');
    const roomFullnessEl = document.getElementById('room-fullness');
    const fullnessBar = document.getElementById('room-fullness-bar');
    
    if (!peopleCountEl || !roomFullnessEl || !fullnessBar) return;
    
    // Update people count with animation
    animateCounter(peopleCountEl, parseInt(peopleCountEl.textContent) || 0, count);
    
    // Calculate and update room fullness
    const fullnessPercentage = Math.min(Math.round((count / MAX_PEOPLE) * 100), 100);
    roomFullnessEl.textContent = `${fullnessPercentage}%`;
    
    // Animate the progress bar width
    fullnessBar.style.width = `${fullnessPercentage}%`;
    
    // Change color based on fullness
    if (fullnessPercentage < 30) {
        fullnessBar.style.background = 'linear-gradient(90deg, #53f8aa, #53c2ff)';
    } else if (fullnessPercentage < 70) {
        fullnessBar.style.background = 'linear-gradient(90deg, #53c2ff, #eaf853)';
    } else {
        fullnessBar.style.background = 'linear-gradient(90deg, #eaf853, #f85353)';
    }
}

// Animate counter from start to end
function animateCounter(element, start, end) {
    if (start === end) return;
    
    const duration = 1000;
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        const value = Math.floor(start + (end - start) * progress);
        element.textContent = value;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// Update data display
function updateDataDisplay(data) {
    if (!data) return;
    
    const lastImageEl = document.getElementById('last-image-name');
    const lastUpdateEl = document.getElementById('last-update-time');
    
    if (lastImageEl && lastUpdateEl) {
        lastImageEl.textContent = data.image_name || '-';
        
        // Format timestamp
        const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
        lastUpdateEl.textContent = formatDateTime(timestamp);
    }
}

// Create historical heatmap for specified data range
function createHistoricalHeatmap(historicalData) {
    if (!historicalData || !historicalData.length) {
        console.warn("No historical data available");
        return;
    }
    
    const container = document.getElementById('historical-heatmap');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Create new heatmap instance
    const historicalHeatmap = h337.create({
        container: container,
        radius: 30,
        maxOpacity: 0.8,
        minOpacity: 0.1,
        blur: 0.9,
        gradient: {
            0.1: '#5362ff',
            0.4: '#53d8ff',
            0.6: '#7e53f8',
            0.8: '#ff53b4',
            1.0: '#ff53b4'
        }
    });
    
    // Aggregate all points across the time period
    const points = [];
    historicalData.forEach(data => {
        if (!data.uv_coords) return;
        
        data.uv_coords.forEach(coord => {
            points.push({
                x: Math.floor(coord.u * container.clientWidth),
                y: Math.floor(coord.v * container.clientHeight),
                value: 1
            });
        });
    });
    
    // Set data to heatmap
    historicalHeatmap.setData({
        max: Math.max(10, Math.ceil(points.length / 10)),
        data: points
    });
}

// Format date and time for display
function formatDateTime(date) {
    return new Intl.DateTimeFormat('default', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(date);
}