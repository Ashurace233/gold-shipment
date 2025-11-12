// Shipment tracking locations from Florida to UK
// Shipment starts NOW from Florida and arrives in 2 weeks
const startDate = new Date(); // Start from today (NOW)
startDate.setHours(12, 0, 0, 0); // Set to noon today

// Calculate arrival date as 2 weeks (14 days) from start
const arrivalDate = new Date(startDate);
arrivalDate.setDate(arrivalDate.getDate() + 14); // Add 14 days (2 weeks)

// Calculate total days from now until arrival (should be 14 days)
const totalDays = 14;

// Optional: simulate progress along the journey (0 to 1). Set to null to use real time.
const USE_SIMULATED_PROGRESS = true;
const SIMULATED_PROGRESS = 0.40; // 40%
function getNow() {
    if (USE_SIMULATED_PROGRESS === true && typeof SIMULATED_PROGRESS === 'number' && SIMULATED_PROGRESS >= 0 && SIMULATED_PROGRESS <= 1) {
        const startMs = startDate.getTime();
        const endMs = arrivalDate.getTime();
        const simulatedMs = startMs + (endMs - startMs) * SIMULATED_PROGRESS;
        return new Date(simulatedMs);
    }
    return new Date();
}

// Shipment details
const shipmentDetails = {
    itemName: "Gold",
    weight: "300 kg",
    weightInKg: 300
};

// Route locations with days from start (relative to today)
// These percentages represent where in the journey each stop occurs
// Atlantic shipping route from Florida to UK
const routeSchedule = [
    { name: "Port of Miami Harbour, Florida, USA", lat: 25.7667, lng: -80.1667, status: "Origin", daysFromStart: 0 },
    { name: "Bahamas Channel", lat: 24.5000, lng: -75.5000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.10) },
    { name: "Panama Canal, Panama", lat: 9.0800, lng: -79.6800, status: "Canal Transit", daysFromStart: Math.floor(totalDays * 0.20) },
    { name: "Eastern Pacific Ocean", lat: -3.0000, lng: -105.0000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.35) },
    { name: "Central Pacific Gyre", lat: -12.0000, lng: -140.0000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.50) },
    { name: "International Date Line", lat: -18.0000, lng: -179.5000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.65) },
    { name: "South Pacific Ocean", lat: -25.0000, lng: 170.0000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.80) },
    { name: "Tasman Sea Approach", lat: -34.0000, lng: 160.0000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.92) },
    { name: "Port of Sydney, Australia", lat: -33.8688, lng: 151.2093, status: "Destination", daysFromStart: totalDays }
];

// Build routeLocations array from the current routeSchedule
function buildRouteLocations() {
	return routeSchedule.map((route, index) => {
    if (index === routeSchedule.length - 1) {
        return {
            ...route,
            date: arrivalDate
        };
    }
    return {
        ...route,
        date: new Date(startDate.getTime() + route.daysFromStart * 24 * 60 * 60 * 1000)
    };
});
}
let routeLocations = buildRouteLocations();

// Format date for display
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

// Shipment starts from Florida TODAY and counts down to arrival in 2 weeks
// All dates are calculated relative to the current date (startDate = now)

// Valid tracking IDs
const validTrackingIds = [
    '455-666-8867',
    '4556668867', // Also accept without dashes
    '455 666 8867' // Also accept with spaces
];

// Normalize tracking ID (remove dashes, spaces, and convert to lowercase)
function normalizeTrackingId(id) {
    return id.replace(/[-\s]/g, '').toLowerCase();
}

let map;
let marker;
let routeLine;
let currentLocationIndex = 0;
let updateInterval;
const FORCE_TO_FREEPORT = false;
const FREEPORT_COORDS = { lat: 26.5333, lng: -78.7000, name: "Freeport, Grand Bahama, Bahamas", status: "Reached Freeport" };
// Australian port coordinates for issue scenario
const AUSTRALIA_PORT_COORDS = { lat: -33.8688, lng: 151.2093, name: "Port of Sydney, Australia", status: "Issue - Contact Management" };
let traveledLine;
let upcomingLine;

function shouldSimulateIssue() {
    return true;
}

// Check if current time is tomorrow around 7am (between 6:30am and 7:30am)
function isTomorrowAround7AM() {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if it's tomorrow (date is one day after today)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isTomorrow = now.getDate() === tomorrow.getDate() && 
                       now.getMonth() === tomorrow.getMonth() && 
                       now.getFullYear() === tomorrow.getFullYear();
    
    if (!isTomorrow) {
        return false;
    }
    
    // Check if time is around 7am (between 6:30am and 7:30am)
    const hour = now.getHours();
    const minute = now.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    const targetTime = 7 * 60; // 7:00 AM in minutes
    const window = 30; // 30 minutes window
    
    return Math.abs(timeInMinutes - targetTime) <= window;
}

// Initialize map
function initMap() {
    // Check if map element exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not loaded');
        return;
    }

    // Ensure map element is visible and has dimensions
    const container = mapElement.parentElement;
    if (container && container.style.display === 'none') {
        container.style.display = 'block';
    }
    
    // Force display of map element
    mapElement.style.display = 'block';
    mapElement.style.width = '100%';
    mapElement.style.height = '500px';

    // Remove any existing map instance
    if (map) {
        map.remove();
        map = null;
    }

    // Center map on Atlantic route (between Florida and UK)
    try {
        map = L.map('map', {
            zoomControl: true,
            attributionControl: true
        }).setView([40.0, -40.0], 3);
    } catch (error) {
        console.error('Error initializing map:', error);
        return;
    }
    
    // Add tile layer with error handling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    }).addTo(map);

    // Wait a moment for tiles to load, then draw route
    setTimeout(() => {
		// Prepare full route coords (used for fitting bounds and future splitting)
    const routeCoords = routeLocations.map(loc => [loc.lat, loc.lng]);

    // Add origin and destination markers
    L.marker([routeLocations[0].lat, routeLocations[0].lng])
        .addTo(map)
            .bindPopup('Origin: Port of Miami Harbour, Florida, USA');

    L.marker([routeLocations[routeLocations.length - 1].lat, routeLocations[routeLocations.length - 1].lng])
        .addTo(map)
            .bindPopup('Destination: Port of Sydney, Australia');

        // Fit map to show entire route
        if (routeCoords.length > 0) {
			map.fitBounds(routeCoords, { padding: [50, 50] });
        }

		// Initialize split route lines (traveled: solid, upcoming: dashed)
		traveledLine = L.polyline([], {
			color: '#1f78ff',
			weight: 4,
			opacity: 0.9
		}).addTo(map);

		upcomingLine = L.polyline([], {
			color: '#1f78ff',
			weight: 4,
			opacity: 0.6,
			dashArray: '8,8'
		}).addTo(map);

    updateShipmentLocation();
    }, 200);
}

// Calculate current location based on real date
function calculateCurrentLocation() {
    const now = getNow();
    let currentIndex = 0;
    
    // If current date is before shipment start, show origin
    if (now < routeLocations[0].date) {
        return 0;
    }
    
    // If current date is after arrival, show destination
    if (now >= routeLocations[routeLocations.length - 1].date) {
        return routeLocations.length - 1;
    }
    
    // Find the current location based on date
    for (let i = 0; i < routeLocations.length; i++) {
        if (now >= routeLocations[i].date) {
            currentIndex = i;
        } else {
            break;
        }
    }
    
    return currentIndex;
}

// Update shipment location based on real dates with smooth interpolation
function updateShipmentLocation() {
	// Rebuild route from current schedule so any changes take effect immediately
	routeLocations = buildRouteLocations();
    const now = getNow();
    currentLocationIndex = calculateCurrentLocation();
    
    if (currentLocationIndex >= routeLocations.length) {
        currentLocationIndex = routeLocations.length - 1;
    }

    let currentLocation;
    let displayLocation;
    
    // Interpolate position between two stops for smooth movement
    if (currentLocationIndex < routeLocations.length - 1) {
        const currentStop = routeLocations[currentLocationIndex];
        const nextStop = routeLocations[currentLocationIndex + 1];
        
        const timeAtCurrent = currentStop.date.getTime();
        const timeAtNext = nextStop.date.getTime();
        const timeNow = now.getTime();
        
        // Calculate progress percentage between stops (0 to 1)
        const progress = Math.min(1, Math.max(0, (timeNow - timeAtCurrent) / (timeAtNext - timeAtCurrent)));
        
        // Interpolate latitude and longitude
        const lat = currentStop.lat + (nextStop.lat - currentStop.lat) * progress;
        const lng = currentStop.lng + (nextStop.lng - currentStop.lng) * progress;
        
        currentLocation = {
            lat: lat,
            lng: lng,
            name: progress < 0.5 ? currentStop.name : nextStop.name,
            status: currentStop.status
        };
        displayLocation = currentLocation;
    } else {
        currentLocation = routeLocations[currentLocationIndex];
        displayLocation = currentLocation;
    }
    
	// Force current location to Freeport if requested
	if (FORCE_TO_FREEPORT) {
		currentLocation = {
			lat: FREEPORT_COORDS.lat,
			lng: FREEPORT_COORDS.lng,
			name: FREEPORT_COORDS.name,
			status: FREEPORT_COORDS.status
		};
		displayLocation = currentLocation;
	}
	
	// Check if issue condition should be simulated or triggered
	const hasIssue = shouldSimulateIssue();
	if (hasIssue) {
		currentLocation = {
			lat: AUSTRALIA_PORT_COORDS.lat,
			lng: AUSTRALIA_PORT_COORDS.lng,
			name: AUSTRALIA_PORT_COORDS.name,
			status: AUSTRALIA_PORT_COORDS.status
		};
		displayLocation = currentLocation;
		currentLocationIndex = routeLocations.length - 1;
	}
	
	// Update split route so lines correspond to the marker position
	(function updateSplitRoute() {
		// Build traveled coords up to current index
		const traveledCoords = [];
		for (let i = 0; i <= currentLocationIndex; i++) {
			traveledCoords.push([routeLocations[i].lat, routeLocations[i].lng]);
		}
		// Ensure endpoint equals the current marker location (so line meets the red dot)
		if (traveledCoords.length === 0) {
			traveledCoords.push([currentLocation.lat, currentLocation.lng]);
		} else {
			traveledCoords[traveledCoords.length - 1] = [currentLocation.lat, currentLocation.lng];
		}

		// Build upcoming coords starting at current location
		const upcomingCoords = [];
		upcomingCoords.push([currentLocation.lat, currentLocation.lng]);
		for (let i = currentLocationIndex + 1; i < routeLocations.length; i++) {
			upcomingCoords.push([routeLocations[i].lat, routeLocations[i].lng]);
		}

		if (traveledLine) traveledLine.setLatLngs(traveledCoords);
		if (upcomingLine) upcomingLine.setLatLngs(upcomingCoords);
	})();
    
    // Remove existing marker
    if (marker) {
        map.removeLayer(marker);
    }

    // Add new marker with custom red icon
    const redIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: red; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    marker = L.marker([currentLocation.lat, currentLocation.lng], { icon: redIcon }).addTo(map);

    marker.bindPopup(`Current Location: ${displayLocation.name}`).openPopup();

    // Update map view - zoom out slightly to show more of the route
    const zoomLevel = currentLocationIndex >= routeLocations.length - 1 ? 5 : 4;
    map.setView([currentLocation.lat, currentLocation.lng], zoomLevel);

    // Update UI
    updateTrackingInfo(displayLocation);
    updateTimeline();
    updateWarningMessage();
}

// Show/hide warning message based on issue condition
function updateWarningMessage() {
    const warningDiv = document.getElementById('issueWarning');
    if (warningDiv) {
        const hasIssue = shouldSimulateIssue();
        if (hasIssue) {
            warningDiv.classList.remove('hidden');
        } else {
            warningDiv.classList.add('hidden');
        }
    }
}

function initSimulationControls() {
    // This function is no longer needed as simulation controls are removed.
    // Keeping it here for now, but it will not be called.
}

function updateSimulationControls() {
    // This function is no longer needed as simulation controls are removed.
    // Keeping it here for now, but it will not be called.
}

function toggleIssueSimulation(forceOn) {
    // This function is no longer needed as simulation controls are removed.
    // Keeping it here for now, but it will not be called.
}

// Update tracking information
function updateTrackingInfo(location) {
    if (document.getElementById('currentLocation')) {
    document.getElementById('currentLocation').textContent = location.name;
    }
    if (document.getElementById('status')) {
    document.getElementById('status').textContent = location.status;
    document.getElementById('status').className = 'status-badge ' + 
        (location.status === 'Destination' ? 'completed' : 'active');
    }

    // Calculate estimated time based on destination date (2 weeks from start)
    const now = new Date();
    const destinationTime = routeLocations[routeLocations.length - 1].date;
    const timeDiff = destinationTime - now;
    
    if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const weeks = Math.floor(days / 7);
        const remainingDays = days % 7;
        
        // Show arrival date
        const arrivalDateStr = formatDate(destinationTime);
        
        if (weeks > 0) {
            document.getElementById('estimatedTime').textContent = `${weeks} week${weeks > 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''} (${arrivalDateStr})`;
        } else if (days > 0) {
            document.getElementById('estimatedTime').textContent = `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} (${arrivalDateStr})`;
        } else {
            document.getElementById('estimatedTime').textContent = `${hours} hour${hours !== 1 ? 's' : ''} (${arrivalDateStr})`;
        }
    } else {
        document.getElementById('estimatedTime').textContent = 'Arrived on ' + formatDate(destinationTime);
    }
}

// Update timeline
function updateTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';

    routeLocations.forEach((loc, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        if (index < currentLocationIndex) {
            timelineItem.classList.add('completed');
        } else if (index === currentLocationIndex) {
            timelineItem.classList.add('active');
        }

        const icon = index === 0 ? '🚢' : 
                    index === routeLocations.length - 1 ? '✅' : 
                    index < currentLocationIndex ? '✓' : '📍';

        timelineItem.innerHTML = `
            <div class="timeline-icon">${icon}</div>
            <div class="timeline-content">
                <h4>${loc.name}</h4>
                <p>${loc.status}</p>
            </div>
        `;

        timeline.appendChild(timelineItem);
    });
}

// Track shipment function
function trackShipment() {
    const trackingId = document.getElementById('trackingInput').value.trim();
    
    if (!trackingId) {
        alert('Please enter a tracking ID');
        return;
    }

    // Show loading spinner with random duration (1-4 seconds)
    const loadingDuration = Math.random() * 3000 + 1000; // 1-4 seconds
    const loadingSpinner = document.getElementById('loadingSpinner');
    const trackingResults = document.getElementById('trackingResults');
    const errorMessage = document.getElementById('errorMessage');
    
    loadingSpinner.style.display = 'flex';
    trackingResults.style.display = 'none';
    errorMessage.style.display = 'none';

    // Hide loading and show results after variable duration
    setTimeout(() => {
        loadingSpinner.style.display = 'none';
        
        // Validate tracking ID
        const normalizedInput = normalizeTrackingId(trackingId);
        const isValid = validTrackingIds.some(validId => normalizeTrackingId(validId) === normalizedInput);
        
        if (!isValid) {
            // Show error message for invalid tracking ID
            errorMessage.style.display = 'block';
            trackingResults.style.display = 'none';
            
            // Clear any existing intervals
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
            return;
        }

        // Valid tracking ID - show shipment details
        errorMessage.style.display = 'none';
        document.getElementById('trackingId').textContent = trackingId;
        
        // Update shipment details with gold item name and weight
        if (document.getElementById('itemName')) {
            document.getElementById('itemName').textContent = shipmentDetails.itemName;
        }
        if (document.getElementById('itemWeight')) {
            document.getElementById('itemWeight').textContent = shipmentDetails.weight;
        }
        if (document.getElementById('origin')) {
            document.getElementById('origin').textContent = routeLocations[0].name;
        }
        if (document.getElementById('destination')) {
            document.getElementById('destination').textContent = 'Port of Sydney, Australia';
        }
        
        trackingResults.style.display = 'block';
        
        initSimulationControls();
        updateSimulationControls();

        // Update warning message if needed
        updateWarningMessage();

        // Clear existing interval
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        // Initialize map if not already done
        // Use setTimeout to ensure container is visible before initializing map
        setTimeout(() => {
        if (!map) {
            initMap();
                // Invalidate size multiple times to ensure proper rendering
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize();
                        // Invalidate again after a short delay
                        setTimeout(() => {
                            if (map) {
                                map.invalidateSize();
                            }
                        }, 200);
                    }
                }, 300);
        } else {
            // Reset to current location based on real date
                map.invalidateSize(); // Ensure map size is correct
                setTimeout(() => {
                    if (map) {
                        map.invalidateSize();
            updateShipmentLocation();
        }
                }, 100);
            }
        }, 100);

        // Update location periodically based on real date
        updateInterval = setInterval(() => {
            updateShipmentLocation();
        }, 5000); // Update every 5 seconds to show smooth progress
    }, loadingDuration);
}

// Check for tracking ID in URL parameters
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const trackingId = urlParams.get('id');
    
    // Don't auto-track on page load, wait for user to search
    if (trackingId) {
        document.getElementById('trackingInput').value = trackingId;
        // Don't auto-search, let user click the button
    }
});

