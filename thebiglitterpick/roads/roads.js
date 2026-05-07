// ---INITIALISATION---

// set up Leaflet map, load data, attach UI
function initialize() {
	//state variables
	let roadLayer; 					// hold Leaflet road layer
	let selectedRoadProps = null;	// store data of currently selected road
	let selectedRoadId = null;		// store ID of currently selected road
	let selectedLayer = null;		// store currently selected road layer

// ---MAP SETUP---

	// MAP
	// create map div with its initial coordinates and zoom
	var map = L.map('map').setView([51.84, -0.225], 10);
	
	// BASEMAP
	// add dark basemap to map
	L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
		attribution: '&copy; OpenStreetMap contributors & CartoDB'
	}).addTo(map);

	// BOUNDARY
	// request Hertfordshire boundary from database and display on map
	fetch('boundary.php')
		.then(res => res.json())
		.then(data => {				
			L.geoJSON(data, {
				style: {			
					color: "grey",
					weight: 3,
					fill: false
				}
			}).addTo(map);
		});

// ---HELPER FUNCTIONS---
	
	// take last report date from database to display in map
	function formatDate(dateString) {
		if (!dateString) return "Never"; //
		return new Date(dateString).toLocaleString(); //
	}

	// show feedback on successful or unsuccessful report submission
	function showPanelMessage(message, type = "success") {
		const msg = document.getElementById("panel-message");
		msg.textContent = message;
		msg.className = type;
		msg.style.display = "block";
	}

	// remove feedback on successful or unsuccessful report submission
	function hidePanelMessage() {
		const msg = document.getElementById("panel-message");
		if (msg) {
			msg.style.display = "none";
			msg.textContent = "";
			msg.className = "";
		}
	}

	// hide panel message on map click
	map.on('click', hidePanelMessage);

// ---CORE FEATURES---

	// SUBMIT REPORT
	// send a report to the backend and update information and map
	function submitReport(roadId, rating) {
		// display feedback to user
		showPanelMessage("Submitting...", "success");
		// send POST request to backend API to update and receive new data
		fetch('submit_report.php', {
			method: 'POST',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({ road_id: roadId, rating: rating })
		})
		// convert JSON from server to JavaScript
		.then(res => res.json())
		// handle successful response
		.then(updatedProps => {
			// update message
			showPanelMessage("Report submitted!", "success");
			// store updated road data
			selectedRoadProps = updatedProps;
			// refresh information panel with new data
			updateRoadPanel(updatedProps);
			// update map layer
			if (selectedLayer) {
				selectedLayer.feature.properties = updatedProps;
			}
			// force map refresh shortly after
			setTimeout(() => {
				loadRoads();
			}, 300);
		})
		// handle unsuccessful response
		.catch(() => {
			showPanelMessage("Error submitting report", "error");
		});
	}

	// LOAD ROADS
	// fetch road data from database and display on map
	function loadRoads() {
		// get current visible map area (bounding box)
		const bounds = map.getBounds();
		// get current zoom level
		const zoom = map.getZoom();
		// get only relevant data considering bounding box and zoom level
		fetch(`roads.php?minx=${bounds.getWest()}&miny=${bounds.getSouth()}&maxx=${bounds.getEast()}&maxy=${bounds.getNorth()}&zoom=${zoom}`)
		// convert JSON from database to JavaScript
		.then(res => res.json())
		// handle returned road dataset
		.then(data => {
			// remove roads that already exist to prevent duplicates
			if (roadLayer) map.removeLayer(roadLayer);
			// convert to display on map
			roadLayer = L.geoJSON(data, {
				// style each road dependent on rating
				style: function(feature) {
						// extract litter rating
						const rating = feature.properties.rating_letter;
						// assign colours
						const colors = {
							A: "#29b363",
							B: "#f0c20c",
							C: "#e67d20",
							D: "#bf382a"
						};
						// set default colour for unrated segments
						let color = colors[rating] || "#cccaca";
					// style segments
					return {
						color,
						weight: 6,
						lineCap: "round",
						lineJoin: "round"
					};
				},
				// 
				onEachFeature: function(feature, layer) {
					// keep selection despite any action
					if (selectedRoadId && feature.properties.id === selectedRoadId) {
						layer.setStyle({ weight: 10, color: "#555" });
						selectedLayer = layer;
					}
					// attach interactive events to each segment
					layer.on({
						// highlight road on hover
						mouseover: function() {
							if (selectedLayer !== layer) {
								layer.setStyle({ weight: 12, color: "#333" });
							}
						},
						// reset style when mouse leaves unless selected
						mouseout: function() {
							if (selectedLayer !== layer) {
								roadLayer.resetStyle(layer);
							}
						},
						// function for road click
						click: function() {
							// reset previous selection styling
							if (selectedLayer) {
								roadLayer.resetStyle(selectedLayer);
							}
							// highlight newly selected segment
							layer.setStyle({ weight: 10, color: "#555" });
							// store currently selected layer and its data
							selectedLayer = layer;
							selectedRoadProps = feature.properties;
							selectedRoadId = feature.properties.id;
							// update information panel with road properties
							updateRoadPanel(feature.properties);
							// smooth zoom to better see selected road
							const center = layer.getBounds().getCenter();
							let targetZoom = Math.max(16, map.getZoom());
							map.flyTo(center, targetZoom, {
								duration: 1.3,
								easeLinearity: 0.2
							});
						}
					});
				}
			// display roads
			}).addTo(map);
		});
	}

	// PANEL
	// display information panel showing road attributes
	var roadInfoControl = L.control({ position: 'topright' });
	// define what is rendered
	roadInfoControl.onAdd = function () {
		// create a HTML div but with Leaflet CSS class
		const div = L.DomUtil.create('div', 'road-info-control');
		// set initial text
		div.innerHTML = `
		<div id="road-info-content">Click a road to view details and submit a rating.</div>
		<div id="panel-message"></div>
		`;
		// prevent interacting with map when clicking within the panel
		L.DomEvent.disableClickPropagation(div);
		// convert to Leaflet to display
		return div;
	};
	// add panel to map
	roadInfoControl.addTo(map);
	// escape function to prevent HTML injection or XSS attacks
	function escapeHTML(str) {
		return str.replace(/[&<>"']/g, function(m) {
			return ({
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;'
			})[m];
		});
	}
	// update information panel when road is clicked
	function updateRoadPanel(props) {
		const content = document.getElementById("road-info-content");
		// replace HTML in panel with data from selected road segment
		content.innerHTML = `
		<b>Road ID:</b> ${props.id}<br><br>
		<b>Name:</b> ${escapeHTML(props.name ?? "Unnamed Road")}<br>
		<b>Average Rating:</b> ${props.rating_letter ?? "Unrated"}<br>
		<b>Reports:</b> ${props.report_count ?? 0}<br>
		<b>Last reported:</b><br><span>${formatDate(props.last_reported)}</span><br><br>
			<select id="panel-rating">
				<option value="A">A - Excellent</option>
				<option value="B">B - Good</option>
				<option value="C">C - Average</option>
				<option value="D">D - Poor</option>
			</select>
		<br><br>
		<button id="submit-panel-report">Submit</button>
		`;
		// attach click event on click button
		const btn = document.getElementById("submit-panel-report");
		btn.onclick = () => {
			// read selected rating from drop down menu
			const rating = document.getElementById("panel-rating").value;
			// send rating and road ID to backend for processing
			submitReport(props.id, rating);
		};
	}

	// LEGEND
	// create a legend
	var legend = L.control({ position: 'bottomright' });
	// define what is displayed in legend control
	legend.onAdd = function () {
		// create container div
		const div = L.DomUtil.create('div', 'info legend');
		// insert legends HTML content (ratings and their colours)
		div.innerHTML = `
		<div class="legend-box">
			<b>Litter Rating</b><br><br>
				<i class="legend-icon legend-a"></i> A (Excellent)<br>
				<i class="legend-icon legend-b"></i> B (Good)<br>
				<i class="legend-icon legend-c"></i> C (Average)<br>
				<i class="legend-icon legend-d"></i> D (Poor)<br>
				<i class="legend-icon legend-u"></i> Unrated
		</div>
		`;
		// convert to Leaflet to display
		return div;
	};
	// add to map
	legend.addTo(map);

	// SCALE
	// add a scale bar
	L.control.scale().addTo(map);

	// SEARCH
	// create container to search for addresses
	// custom positioning of container
	const searchContainer = L.DomUtil.create('div', 'search-container');
	// attach container
	map.getContainer().appendChild(searchContainer);
	// define HTML structure of search bar with bar and locate button
	searchContainer.innerHTML = `
		<div class="search-bar">
			<div id="geocoder-container"></div>
			<button id="locate-btn">Find My Location</button>
		</div>
	`;
	// create geocoder
	const geocoder = L.Control.geocoder({
		// placeholder text
		placeholder: "Search Address",
		// show results when typing
		defaultMarkGeocode: true,
		// keep search box expanded
		collapsed: false
	})
	// when a result is selected
	.on('markgeocode', function(e) {
		// smoothly move map to selected location
		map.flyTo(e.geocode.center, 16, { duration: 1.5 });
	})
	// add to map
	.addTo(map);
	// move into container
	document.getElementById("geocoder-container")
	.appendChild(geocoder.getContainer());

	// LOCATE BUTTON
	// user selects and their location is found
	document.getElementById("locate-btn").addEventListener("click", function () {
		// use browser geolocation
		navigator.geolocation.getCurrentPosition(function (pos) {
			// extract coordinates
			const lat = pos.coords.latitude;
			const lng = pos.coords.longitude;
			// smoothly move map view to location
			map.flyTo([lat, lng], 16, { duration: 1.5 });
			// add a marker and popup to display user location
			L.marker([lat, lng])
			.addTo(map)
			.bindPopup("You are here")
			.openPopup();
		});
	});
	
	// clear old search results blocking view
	map.getContainer().addEventListener("click", function () {
		const results = document.querySelector('.leaflet-control-geocoder-alternatives');
		if (results) {
			results.innerHTML = "";
		}
	});

	// ensure clicking inside search box does not move map
	if (searchContainer) {
		L.DomEvent.disableClickPropagation(searchContainer);
		L.DomEvent.disableScrollPropagation(searchContainer);
	}

	// recalculate map size after layoud changes to prevent rendering issues
	setTimeout(() => {
		map.invalidateSize();
	}, 200);

	// LOAD
	// load initial road dataset when map first initialises
	loadRoads();
	// reload data when map is moved
	map.on('moveend', loadRoads);

}
