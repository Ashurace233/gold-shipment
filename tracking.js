// Shipment tracking locations from Florida to Australia
// Shipment starts NOW from Florida and arrives on November 13, 2025
const arrivalDate = new Date('2025-11-13T12:00:00'); // November 13, 2025, 12:00 PM
const startDate = new Date(); // Start from today (NOW)
startDate.setHours(12, 0, 0, 0); // Set to noon today

// Calculate total days from now until arrival
const totalDays = Math.ceil((arrivalDate - startDate) / (1000 * 60 * 60 * 24));

// Shipment details
const shipmentDetails = {
    itemName: "Gold",
    weight: "750 kg",
    weightInKg: 750
};

// Route locations with days from start (relative to today)
// These percentages represent where in the journey each stop occurs
const routeSchedule = [
    { name: "Port of Miami Harbour, Florida, USA", lat: 25.7667, lng: -80.1667, status: "Origin", daysFromStart: 0 },
    { name: "Port Everglades, Florida, USA", lat: 26.0917, lng: -80.1281, status: "In Transit", daysFromStart: 1 },
    { name: "Caribbean Sea", lat: 20.0000, lng: -75.0000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.13) },
    { name: "Panama Canal, Panama", lat: 9.0800, lng: -79.6800, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.27) },
    { name: "Pacific Ocean", lat: 5.0000, lng: -90.0000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.40) },
    { name: "Pacific Ocean", lat: 10.0000, lng: -130.0000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.60) },
    { name: "Hawaii, USA", lat: 21.3099, lng: -157.8581, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.73) },
    { name: "Pacific Ocean", lat: -10.0000, lng: -165.0000, status: "In Transit", daysFromStart: Math.floor(totalDays * 0.83) },
    { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093, status: "Destination", daysFromStart: totalDays }
];

// Build routeLocations array with actual dates calculated from startDate
const routeLocations = routeSchedule.map((route, index) => {
    // For the last location (Sydney), use the exact arrival date
    if (index === routeSchedule.length - 1) {
        return {
            ...route,
            date: arrivalDate
        };
    }
    // For all other locations, calculate date from startDate
    return {
        ...route,
        date: new Date(startDate.getTime() + route.daysFromStart * 24 * 60 * 60 * 1000)
    };
});

// Format date for display
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

// Shipment starts from Florida TODAY and counts down to arrival on November 13, 2025
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

// Initialize map
function initMap() {
    map = L.map('map').setView([10.0, -120.0], 3);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Draw route line
    const routeCoords = routeLocations.map(loc => [loc.lat, loc.lng]);
    routeLine = L.polyline(routeCoords, {
        color: '#667eea',
        weight: 3,
        opacity: 0.7
    }).addTo(map);

    // Add origin and destination markers
    L.marker([routeLocations[0].lat, routeLocations[0].lng])
        .addTo(map)
        .bindPopup('Origin: Port of Miami Harbour, Florida, USA')
        .openPopup();

    L.marker([routeLocations[routeLocations.length - 1].lat, routeLocations[routeLocations.length - 1].lng])
        .addTo(map)
        .bindPopup('Destination: Sydney, Australia');

    updateShipmentLocation();
}

// Calculate current location based on real date
function calculateCurrentLocation() {
    const now = new Date();
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
    const now = new Date();
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

    // Calculate estimated time based on destination date (November 13, 2025)
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
                <p>${loc.status} - ${formatDate(loc.date)}</p>
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
            document.getElementById('destination').textContent = routeLocations[routeLocations.length - 1].name;
        }
        
        trackingResults.style.display = 'block';

        // Clear existing interval
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        // Initialize map if not already done
        if (!map) {
            initMap();
        } else {
            // Reset to current location based on real date
            updateShipmentLocation();
        }

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

