//NOTES TO SELF
//a teamdigitale access token is required
//possibility to do progressive rendering from ajax url of table
//possibility to add a filter on a field
//improve button subentrato/presubentro/standby (when zoom >5.7 it doesn't work as of now)
//check data data_subentro e data_presubentro have been correctly set
//map tooltip for a city: check that "in presubentro dal" is correct
//there is no data on AIRE
//possibility to load anpr_zone.geojson first and then asynchronously anpr.geojson

function loadJSON(fileName, callback) {   
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', fileName, true); 
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);  
}
//load data
loadJSON("anpr_zone.geojson", function(response_zone) {
    loadJSON("anpr.geojson", function(response) {
	// Parse JSON string into object
	var json_zone = JSON.parse(response_zone);
	var json = JSON.parse(response);

	//1.DRAW MAP
	mapboxgl.accessToken = 'pk.eyJ1IjoiZW5qYWxvdCIsImEiOiJjaWhtdmxhNTIwb25zdHBsejk0NGdhODJhIn0.2-F2hS_oTZenAWc0BMf_uw';
	var map = new mapboxgl.Map({
	    container: 'map',
	    style: 'mapbox://styles/mapbox/streets-v9',
	    center: [12.5113,41.8919],
	    zoom: 4.5,
	    minZoom: 4.5,
	    maxZoom: 12
	});
	
	map.on("load", function() {
	    // Add a geojson point source.
	    map.addSource("anpr", {
		"type": "geojson",
		"data": json
	    });
	    
	    map.addSource("anpr_zone", {
		"type": "geojson",
		"data": json_zone
            });
	    
	    var layers = map.getStyle().layers;
	    // Find the index of the first symbol layer in the map style
	    var firstSymbolId = null;
	    for (var i = 0; i < layers.length; i++) {
		if (layers[i].type === "symbol") {
		    self.firstSymbolId = layers[i].id;
		    break;
		}
	    }
	    
	    map.addLayer({
		"id": "anpr-comuni",
		"type": "circle",
		"source": "anpr",
		"minzoom": 5.7,
		"paint": {
                    "circle-radius": [
			'interpolate',
			['linear'],
			['zoom'],
			5, 0,
			14, 20
                    ],
                    "circle-color": [
			"case",
			["has", "data_subentro"],
			"rgb(33, 153, 35)",
			["has", "data_presubentro"],
			"rgb(255, 165, 0)",
			"black"
		    ],
                    "circle-opacity": {
			"stops": [[5.7, 0], [6, 0.6]]
		    }
		}
            }, firstSymbolId);
	    
	    map.addLayer({
		"id": "anpr-nome-zona",
		"type": "symbol",
		"source": "anpr_zone",
		"minzoom": 4.5,
		"maxzoom": 5.7,
		"layout": {
                    "text-field": "{COMUNE}",
                    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                    "text-size": 20,
                    "text-offset": [0, -2],
                    "text-anchor": "center"
		}
            }, firstSymbolId);

	    var toggleableLayerIds = [ "comuni subentrati", "comuni in presubentro", "comuni in standby" ];
	    var toggleableLayerColors = [ "rgb(33, 153, 35)", "rgb(255, 165, 0)", "black" ];
	    var toggleableLayerProperty = [ "subentro", "presubentro", "standby" ];
	    var toggleableLayerVisibility = ["visible", "none", "none" ];
	    for (i = 0; i < toggleableLayerIds.length; i++) {
		var id = toggleableLayerIds[i];
		var color = toggleableLayerColors[i];
		var property = toggleableLayerProperty[i];
		var visibility = toggleableLayerVisibility[i];
		
		map.addLayer({
		    "id": "anpr_" + property,
		    "type": "circle",
		    "source": "anpr_zone",
		    "minzoom": 4.5,
		    "paint": {
			"circle-radius": ['interpolate', ['linear'], ['zoom'], 0, 0, 6, ["round", ["*", ["case", property=="standby", ["-", 1, ["/" , ["+", ["get", "subentro"], ["get", "presubentro"]] , ["get", "n_COMUNI"]]], ["/" , ["get", property], ["get", "n_COMUNI"]]], 150]]],
			"circle-color": color,
			"circle-opacity": {
			    "stops": [[5, 0.6], [5.7, 0.6], [6, 0]]
			}
		    },
		    "layout": {
			"visibility": visibility
		    }
		}, firstSymbolId);
		
		map.addLayer({
		    "id": "anpr_label_" + property,
		    "type": "symbol",
		    "source": "anpr_zone",
		    "minzoom": 4.5,
		    "maxzoom": 5.7,
		    "layout": {
			"text-field":  ["concat", ["to-string", ["round", ["*", ["case", property=="standby", ["-", 1, ["/" , ["+", ["get", "subentro"], ["get", "presubentro"]] , ["get", "n_COMUNI"]]], ["/" , ["get", property], ["get", "n_COMUNI"]]], 100]]], "%"],
			"text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
			"text-size": 20,
			"text-offset": [0, 0],
			"text-anchor": "center",
			"visibility": visibility
		    }
		}, firstSymbolId);

		//2.ADD BUTTONS TO TOGGLE LAYERS WHEN ZOOM <5.7
		var link = document.createElement('a');
		link.href = '#';
		link.className = 'active';
		link.textContent = id;
		link.style.backgroundColor = color;
		
		link.onclick = function (e) {
                    var l = toggleableLayerIds.indexOf(this.textContent);
		    var clickedProperty = toggleableLayerProperty[l];
                    var clickedLayer = "anpr_" + clickedProperty;
                    var clickedLabel = "anpr_label_" + clickedProperty;
                    e.preventDefault();
                    e.stopPropagation();
                    var clickedVisibility = map.getLayoutProperty(clickedLayer, 'visibility');
		    
                    for (var c = 0; c < toggleableLayerProperty.length; c++) {
			var layer = "anpr_" + toggleableLayerProperty[c];
			var labelLayer = "anpr_label_" + toggleableLayerProperty[c];
			
			map.setLayoutProperty(layer, 'visibility', 'none');
			map.setLayoutProperty(labelLayer, 'visibility', 'none');
                    }
                    if (clickedVisibility == 'none') {
			this.className = 'active';
			map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
			map.setLayoutProperty(clickedLabel, 'visibility', 'visible');
                    }
		};
		
		document.getElementById('menu').appendChild(link);
		
	    };

	    //3.ADD POPUP ON EACH COMUNE
	    var popup = new mapboxgl.Popup({
		closeButton: false,
		closeOnClick: false
	    });
	    
	    map.on('mouseenter', 'anpr-comuni', function(e) {
		// Change the cursor style as a UI indicator.
		map.getCanvas().style.cursor = 'pointer';
		
		var coordinates = e.features[0].geometry.coordinates.slice();
		var state = ((e.features[0].properties.data_subentro!=undefined)? "subentrato" : ((e.features[0].properties.data_presubentro!=undefined)? "in presubentro" : "in standby"));
		var description = "<b>Comune di " + e.features[0].properties.COMUNE + "</b>" +
		    "<br>" +
		    "Stato: " + state +
		    ((e.features[0].properties.data_subentro!=undefined)? (" in data " + e.features[0].properties.data_subentro + "<br>") : "") +
		    ((e.features[0].properties.data_presubentro!=undefined && e.features[0].properties.data_subentro==undefined)? (" dal " + e.features[0].properties.data_presubentro + "<br>") : "") +
		    "<br>" +
		    "Numero di abitanti: " + e.features[0].properties.popolazione +
		    "<br>";
		
		// Ensure that if the map is zoomed out such that multiple
		// copies of the feature are visible, the popup appears
		// over the copy being pointed to.
		while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
		    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
		}
		
		// Populate the popup and set its coordinates
		// based on the feature found.
		popup.setLngLat(coordinates)
		    .setHTML(description)
		    .addTo(map);
	    });
	    
	    map.on('mouseleave', 'anpr-comuni', function() {
		map.getCanvas().style.cursor = '';
		popup.remove();
	    });
	    
	    map.addControl(new MapboxGeocoder({
		accessToken: mapboxgl.accessToken,
		placeholder: "Cerca un Comune"
	    }));
	    
	    map.addControl(new mapboxgl.NavigationControl());
	});


	//4.FILL TABLE
	var data = json.features.map(f => f.properties);
	
	$("#table").tabulator({
	    "pagination":true,
	    "progressiveRender":true,
	    //progressiveRender:"remote", //enable progressive rendering
            //ajaxURL:"/data/page", //set the ajax URL
	    "columns":[
		{"title":"Nome Comune", "field":"COMUNE", "width":200, "frozen":true},
		{"title":"Data subentro", "field":"data_subentro", "align":"center", "width":150, "sorter":"string", "sorterParams":{"format":"yyyy-MM-ddTHH:mm:ss.fffZ", "alignEmptyValues":"bottom"}},
		{"title":"Data presubentro", "field":"data_presubentro", "align":"center", "width":150, "sorter":"string", "sorterParams":{"format":"yyyy-MM-ddTHH:mm:ss.fffZ", "alignEmptyValues":"bottom"}},
		{"title":"Provincia", "field":"PROVINCIA","sorter":"string", "width":100},
		{"title":"Regione", "field":"REGIONE", "sorter":"string", "width":90},
                {"title":"Zona", "field":"ZONA", "sorter":"string", "width":90},
                {"title":"Numero abitanti", "field":"popolazione", "align":"center", "sorter":"number", "width":150},
	    ]
	});
	
	$("#table").tabulator("setData", data);
	
	
	//5.FILTER DATA FOR CHART WITH COMUNI SUBENTRATI 
	var popolazioneSubentro = [];
	var comuniSubentro = [];
	var minDate = new Date("05/12/2000");
	
	data.filter(d => d.data_subentro !== undefined)
	    .map(d => ({
		    x: new Date(d.data_subentro),
		    y: d.popolazione
	    }))
            .sort((a,b) => (a.x - b.x))
	    .reduce((a,b) => {			
		if (b.x > minDate){
		    popolazioneSubentro.push({x: b.x, y:a.popolazione +b.y});
		    comuniSubentro.push({x: b.x,y:a.n_COMUNI+1});
		    minDate = b.x;
		}
		return {popolazione:a.popolazione+b.y, n_COMUNI: a.n_COMUNI+1}
	    },{popolazione: 0, n_COMUNI: 0});

	//6.DRAW CHART WITH COMUNI SUBENTRATI
	const chartSubentro = {
	    // Labels should be Date objects
	    //labels: datiSubentro.map(d => new Date(d.data_subentro)),
	    datasets: [{
		fill: true,
                label: 'Comuni subentrati',
                data: comuniSubentro,
                borderColor: "rgb(33, 153, 35)",
                backgroundColor: "rgba(33, 153, 35, 0.7)",
                lineTension: 0,
                yAxisID: 'B',
            },{
		fill: true,
		label: 'Popolazione subentrata',
		data: popolazioneSubentro,
		borderColor: "rgb(33, 64, 35)",
		backgroundColor: "rgba(33, 64, 35, 0.7)",
		lineTension: 0,
		yAxisID: 'A',
	    }]
	}
	
	const chartSubentroOptions = {
	    type: 'line',
	    data: chartSubentro,
	    options: {
		elements: { point: { radius: 0 } },
		fill: false,
		responsive: true,
		maintainAspectRatio: true,
		scales: {
		    xAxes: [{
			type: 'time',
			display: true,
			scaleLabel: {
			    display: false,
			    labelString: "Data",
			},
			gridLines: {
			    color: "rgba(0, 0, 0, 0)",
			}
		    }],
		    yAxes: [{
			id: 'A',
			position: 'left',
			ticks: {
			    beginAtZero: true,
			},
			display: true,
			scaleLabel: {
			    display: false,
			    labelString: "Popolazione subentrata",
			},
			gridLines: {
			    color: "rgba(0, 0, 0, 0)",
			}
		    },{
			id: 'B',
                        position: 'right',
                        ticks: {
                            beginAtZero: true,
                        },
                        display: true,
                        scaleLabel: {
                            display: false,
                            labelString: "Comuni subentrati",
                        }
		    }]
		}
	    }
	}
	const ctxSubentro = document.getElementById('chartSubentroCanvas').getContext('2d');
        ctxSubentro.canvas.width  = window.innerWidth/2;
        ctxSubentro.canvas.height = window.innerHeight/2;
	new Chart(ctxSubentro, chartSubentroOptions);

	//7.FILTER DATA FOR CHART WITH COMUNI IN PRESUBENTRO                                            
        var popolazionePresubentro = [];
        var comuniPresubentro = [];
        minDate = new Date("05/12/2000");

        data.filter(d => d.data_presubentro !== undefined)
            .map(d => ({
                    x: new Date(d.data_presubentro),
                    y: d.popolazione
            }))
            .sort((a,b) => (a.x - b.x))
            .reduce((a,b) => {
                if (b.x > minDate){
                    popolazionePresubentro.push({x: b.x, y:a.popolazione +b.y});
                    comuniPresubentro.push({x: b.x,y:a.n_COMUNI+1});
                    minDate = b.x;
                }
                return {popolazione:a.popolazione+b.y, n_COMUNI: a.n_COMUNI+1}
            },{popolazione: 0, n_COMUNI: 0});

	//8.DRAW CHART WITH COMUNI IN PRESUBENTRO
        const chartPresubentroData = {
            datasets: [{
		fill: true,
                label: 'Comuni in presubentro',
                data: comuniPresubentro,
                borderColor: "rgb(255, 165, 0)",
                backgroundColor: "rgba(255, 165, 0, 0.7)",
                lineTension: 0,
                yAxisID: 'B',
	    },{
                fill: true,
                label: 'Popolazione in presubentro',
                data: popolazionePresubentro,
                borderColor: "rgb(205, 133, 63)",
                backgroundColor: "rgba(205, 133, 63, 0.7)",
                lineTension: 0,
                yAxisID: 'A',
            }]
        }

        const chartPresubentroOptions = {
            type: 'line',
            data: chartPresubentroData,
            options: {
                elements: { point: { radius: 0 } },
                fill: false,
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    xAxes: [{
                        type: 'time',
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: "Data",
                        },
                        gridLines: {
                            color: "rgba(0, 0, 0, 0)",
                        }
                    }],
                    yAxes: [{
                        id: 'A',
                        position: 'left',
                        ticks: {
                            beginAtZero: true,
                        },
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: "Popolazione in presubentro",
                        },
                        gridLines: {
                            color: "rgba(0, 0, 0, 0)",
                        }
                    },{
                        id: 'B',
                        position: 'right',
                        ticks: {
                            beginAtZero: true,
                        },
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: "Comuni in presubentro"
                        }
                    }]
                }
            }
        }
        const ctxPresubentro = document.getElementById('chartPresubentroCanvas').getContext('2d');
        ctxPresubentro.canvas.width  = window.innerWidth/2;
        ctxPresubentro.canvas.height = window.innerHeight/2;
        new Chart(ctxPresubentro, chartPresubentroOptions);

    });
});
