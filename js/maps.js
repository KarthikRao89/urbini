(function(root, factory) {
  // Set up Mapper appropriately for the environment.
  if (typeof define === 'function' && define.amd) {
    // AMD
//    if (Lablz && Lablz.require) {
//      debugger;
//      Lablz.require(['jquery', 'leaflet', 'leafletMarkerCluster', '../styles/leaflet/leaflet.css', '../styles/leaflet/MarkerCluster.Default.css'], function($, L) {
//        return (root.Mapper = factory(root, L));
//      });
//    }
//    else {
      define('maps', ['utils', 'leaflet', 'leafletMarkerCluster', '../styles/leaflet/leaflet.css', '../styles/leaflet/MarkerCluster.Default.css'], function(U, L) {
        // Export global even in AMD case in case this script is loaded with
        // others that may still expect a global Mapper.
        return (root.Mapper = factory(root, L));
      });
//    }
  } else {
    var callback = function() {
      root.Mapper = factory(root, L);
    }
    
    if (!window.$) {
       var s = document.createElement('script');
      s.setAttribute('src', 'js/lib/jquery.min.js');
      s.setAttribute('type', 'text/javascript');
      document.getElementsByTagName('head')[0].appendChild(s);
      
      if (s.readyState) { //IE
        s.onreadystatechange = function () {
          if (s.readyState == "loaded" || s.readyState == "complete") {
            s.onreadystatechange = null;
            callback();
          }
        };
      } else { //Others
        s.onload = function () {
          callback();
        };
      }
    }
    else
      callback();
  }
}(this, function(root, L) {
  var M = Mapper = function(mapDivId) {
    this.mapDivId = mapDivId;
    this.defaultStyleId = 22677;
    this.serverName = null;
    this.map = null;
    this.maxZoom = 17;
    this.pointOfInterest = {};
    this.color = null;
    this.shapeJsons = {};
    this.shapeLayers = {};
    this.pointLayers = {};
    this.shapeLayerInfos = {};
    this.pointLayerInfos = {};
    this.infoToLayer = {};
    this.nameToType = {};
    this.mapInfoObjs = [];
    this.layerToDensity = {};
    this.currentLayerDensity = null;
    this.currentLayerName = null;
    this.userAskedFor = {};
    this.layerControl = null;
  //  initialize: function() {
  //    _.bindAll(this, );
  //  },
    
    this.finish = function() {
      var self = this;
      var map = this.map;
      setTimeout(function() {
        map.invalidateSize();
      }, 1);
    };
    
    this.getNextColor = function(seed) {
      var hsv = this.generateColors(1, seed || (this.color ? this.color[0] : 0.7));
      this.color = hsv[0]; 
      var rgb = this.hsv2rgb(hsv[0][0], hsv[0][1], hsv[0][2]);
      return this.rgbToHex(rgb[0], rgb[1], rgb[2]);
    };
    
    this.addBasicMapInfo = function(init) {
      'use strict';
      var self = this;
      var mapInfo = L.control();
      mapInfo.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'mapInfo'); // create a div with a class "info"
        this.update();
        return this._div;
      };
  
      // method that we will use to update the control based on feature properties passed
      init = self.pointOfInterest.name ? init + ' near ' + self.pointOfInterest.name : init;
      init = "<h4>" + init + "</h4>";
      mapInfo.update = function (properties) {
        var html = properties ? properties.name : null;
        this._div.innerHTML = html ? init + html : init;
      };
  
      mapInfo.updateWithHTML = function (html) {
        this._div.innerHTML = html ? init + html : init;
      };
  
      mapInfo.addTo(this.map);
      this.mapInfoObjs.push(mapInfo);
      return mapInfo;
    };
  
    this.addMapInfo = function(type, subType, areaType, areaUnit) {
      'use strict';
      var info = L.control();
      info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'mapInfo'); // create a div with a class "info"
        this.update();
        return this._div;
      };
  
      var init = '<h4>' + type + ' population density</h4>';
      // method that we will use to update the control based on feature properties passed
      info.update = function (props) {
        if (props) {
          if (props.density != null) {
            var name = subType || props.item + (props.item.charAt(props.item.length - 1) != 's' ? 's' : '');
  //            name = props.type ? props.type + ' ' + name : name;
            this._div.innerHTML = init + '<b>' + props.name + '</b><br />' + (Math.round(props.density * 100) / 100) + ' ' + name + ' / ' + areaUnit + '<sup>2</sup>';
          }
  //            this._div.innerHTML = init + '<b>' + areaType + ': ' + props.name + '</b><br />' + (Math.round(props.density * 100) / 100) + ' ' + (subType || props.item) + 's / ' + areaUnit + '<sup>2</sup>';
          else
            this._div.innerHTML = init;
          
  //          if (props.count != null)
  //            this._div.innerHTML += 'Total: ' + props.count + ' ' + (subType || props.item) + 's';
        }
        else
          this._div.innerHTML = init + 'Hover over a ' + areaType;
      };
  
      info.updateWithHTML = function (html) {
        this._div.innerHTML = init + html;
      };
  
      this.mapInfoObjs.push(info);
      info.addTo(this.map);  
    };
  
    this.clearInfos = function(e) {
      'use strict';
      for (var i = 0; i < this.mapInfoObjs.length; i++) {
        this.mapInfoObjs[i].update();
      }  
    };
  
    this.updateInfosForLayer = function(layer) {
      'use strict';
      for (var i = 0; i < this.mapInfoObjs.length; i++) {
        if (layer.feature.properties)
          this.mapInfoObjs[i].update(layer.feature.properties);
      }
    };
  
    this.updateInfosWithHTML = function(html) {
      'use strict';
      for (var i = 0; i < this.mapInfoObjs.length; i++) {
        this.mapInfoObjs[i].updateWithHTML(html);
      }
    };
  
    this.updateInfos = function(e) {
      'use strict';
      var layer = e.target;
      this.updateInfosForLayer(layer);
    };
  
    this.getHighlightFeatureFunction = function() {
      var self = this;
      return function(e) {
        'use strict';
         var layer = e.target;
         layer.setStyle({
           weight: 5,
           color: '#666',
           dashArray: '',
           fillOpacity: 0.7
         });
         
         if (!L.Browser.ie && !L.Browser.opera) {
           layer.bringToFront();
         }
         
         if (layer.feature) {
           self.updateInfosForLayer(layer);
         }
      };
    }
  
    var minResolution = 0.01;
    this.getLeafletMapTileColor = function(d) {
      'use strict';
      var minMax = this.currentLayerDensity;
      var min = minMax[0];
      var max = minMax[1];
      if (max < minResolution)
        return getColorForPercentile(0);
      
      if (min == max)
        min = 0;
  
      var percentile = max == min ? 100 : (d - min) * 100 / (max - min);
      var color = getColorForPercentile(percentile);
      return color;
    };
  
    var percentiles = [0, 10, 20, 40, 66, 75, 90, 95];
    
    function getColorForPercentile(percentile) {
      'use strict';
      var color =
        percentile > percentiles[7] ? '#800026' :
        percentile > percentiles[6]  ? '#BD0026' :
        percentile > percentiles[5]  ? '#E31A1C' :
        percentile > percentiles[4]  ? '#FC4E2A' :
        percentile > percentiles[3]   ? '#FD8D3C' :
        percentile > percentiles[2]   ? '#FEB24C' :
        percentile > percentiles[1]   ? '#FED976' : '#FFEDA0';
        
      return color;
    };
  
    function simpleDashedStyle(feature) {
      'use strict';
      var simple = simpleStyle(feature);
      simple['dashArray'] = '3';
      return simple;
    };
  
    function simpleStyle(feature) {
      'use strict';
      return {
          fillColor: '#efefff',
          weight: 2,
          opacity: 1,
          color: '#5555ff',
          fillOpacity: 0.4
      };
    };
  
    this.getLeafletDensityMapStyleFunction = function() {
      var self = this;
      return function(feature) {
        'use strict';
        return {
            fillColor: self.getLeafletMapTileColor(feature.properties.density),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
      };
    }

// Note: not to show maximize icon in mobile mode    
    this.addSizeButton = function(mapDiv) {
      'use strict';
      var btn = L.control({position: 'bottomleft'});
      btn.onAdd = function (mapObj) {
        var bounds = mapObj.getBounds();;
        // var maxImg = "<img src='icons/map-fullscreen.png' />";
        // var minImg = "<img src='icons/map-unfullscreen.png' />";
        var div = L.DomUtil.create('div', 'resize');
        // div.innerHTML = maxImg;
        div.innerHTML = "&#61541";
        div.className += " leaflet-lablz-control";
        div.onclick = function(e) {
          var maximized = mapDiv.innerHTML.indexOf('map-full') == -1;
          if (maximized) {
            // restore
            mapDiv.style.position = 'relative';
            mapDiv.style.height = "";
            mapDiv.style.width = "";
            document.body.style.overflow = 'auto';
            var parent = document.getElementById("siteResourceList") || document.getElementById("corePageContent") || document.getElementById("sidebarDiv") || document.getElementById("resourceView");
            parent.insertBefore(mapDiv, parent.firstChild);
            // div.innerHTML = maxImg;
            div.innerHTML = "&#61542";
            mapObj.invalidateSize(true);
            mapObj.fitBounds(bounds);
          }
          else {
            // maximize
            var $wnd = jQuery(window);
            // var scroll = getScrollXY();
            // var wDim = getWindowDimension();
            mapDiv.style.position = 'absolute';
            mapDiv.style.top = $wnd.scrollTop() + "px"; // scroll[1] + "px"; 
            mapDiv.style.left = $wnd.scrollLeft() + "px"; // scroll[0] + "px"; 
            mapDiv.style.height = $wnd.height() + "px"; // wDim[1] + "px";
            mapDiv.style.width = "100%";
            document.body.appendChild(mapDiv);
            document.body.style.overflow = 'hidden';
            // div.innerHTML = minImg;
            div.innerHTML = "&#61541";
            mapObj.invalidateSize(true);
          }
        };
        
        return div;
      }
      
      btn.addTo(this.map);  
    };
    
    this.addReZoomButton = function(options) {
      'use strict';
      var rezoom = L.control({position: 'bottomleft'});
      rezoom.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'rezoom');
        // div.innerHTML = "<img src='icons/homePage.png' />";
        div.innerHTML = "&#61461;";
        div.className = "leaflet-lablz-control";
        div.onclick = function(e) {
//          map.invalidateSize(true);
          if (options.bounds)
            map.fitBounds(options.bounds);
//          else {
//            if (options.center)
//              map.setView(options.center);
//            if (options.zoom)
//              map.setZoom(options.zoom);
//          }          
        };
        
        return div;
      }
      
      rezoom.addTo(this.map);
    };
  
    this.addDensityLegend = function(minMax) {
      'use strict';
      if (this.densityLegend)
        this.map.removeControl(this.densityLegend);
      
      var max = minMax[1];
  //      if (max < this.minResolution)
  //        return;
  
      var min = minMax[0];
      if (min == max)
        min = 0;
      
      var legend = L.control({position: 'bottomright'});
      legend.onAdd = function (mapObj) {
        var grades = [];
        var range = max - min;
        var rangeDigits = Math.round(Math.log(range) / Math.log(10));
        var pow = -rangeDigits + 2;
        var multiplier = Math.pow(10, pow);
        if (range == 0) {
          grades.push(max);
        }
        else {
          for (var i = 0; i < percentiles.length; i++) {
            var grade = min + (percentiles[i] / 100) * range;
            grade = Math.round(multiplier * grade) / multiplier;
            
            if (grades.indexOf(grade) == -1)
              grades.push(grade);
          }
        }
        
        var div = L.DomUtil.create('div', 'mapInfo mapLegend'),
  //              grades = percentiles,
            grades,
            labels = [];
  
        // loop through our density intervals and generate a label with a colored square for each interval
        if (grades.length == 1)
          return div;
        
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<p><i style="background:' + getColorForPercentile(100 * ((grades[i] - min) / range + 0.1)) + '"></i> ' +
                grades[i] + (grades[i + 1] ? ' &ndash; ' + grades[i + 1] : '+') + "</p>";
        }
  
        return div;
      };
      
      legend.addTo(this.map);
      this.densityLegend = legend;
    };
    
    this.buildGeoJsonShapeLayers = function(style, lName, autoAdd) {
      'use strict';
      if (!this.shapeJsons || !this.shapeLayerInfos)
        return;
      
      var geoJsonLayers = {};
      var names = lName == null ? Object.keys(this.shapeLayerInfos) : [lName];
      var firstLayer;
      for (var i = 0; i < names.length; i++) {
        var name = names[i];
        if (this.shapeLayers && this.shapeLayers[name]) {
          var l = this.shapeLayers[name];
          var layerCount = 0;
          l.eachLayer(
              function(layer) {
                layerCount++;
              }
          );
          
          if (layerCount > 0)
            continue;
        }
        
        var nameToProps = this.shapeLayerInfos[name];
        var geoJsonLayer = [];
        for (var j = 0; j < nameToProps.length; j++) {
          var props = nameToProps[j];
          var shapeId = props['id'];
          var shapeJson = this.shapeJsons[shapeId];
          var geoJson = JSON.parse(JSON.stringify(shapeJson));
          
          for (var prop in props) {
            if (props.hasOwnProperty(prop))
              geoJson.properties[prop] = props[prop];
          }
          
          geoJsonLayer.push(geoJson);
        }
        
        geoJsonLayers[name] = geoJsonLayer;
  //      }
  //
  //      var counter = 0;
  //      for (var name in geoJsonLayers) {
        var minMax = this.getMinMaxDensityForLayer(name);
        minMax = typeof minMax == 'undefined' ? this.getMinMaxDensity(geoJsonLayers[name]) : minMax;
        if (minMax != null) {
          this.setMinMaxDensity(name, minMax);
          this.currentLayerName = name;
          this.currentLayerDensity = minMax;
        }
        
        if (i == 0 && this.userAskedFor[name])
          firstLayer = name;
        
        var newLayer = this.mkShapeLayerGroup(name, geoJsonLayers[name], minMax, style, this.shapeLayers[name]);
        if (autoAdd || (i == 0 && this.userAskedFor[name]))
          newLayer.addTo(this.map);
        
        this.shapeLayers[name] = newLayer;
  //        counter++;
      }
  
      this.setCurrentLayer(firstLayer || this.currentLayerName);
    };
  
    this.loadLayer = function(name, layerGroup, callback) {
      var layerCount = 0;
      layerGroup.eachLayer(
        function(layer) {
          layerCount++;
        }
      );
      
      if (layerCount > 0)
        return;
      
      var info = this.shapeLayerInfos[name];
      info = info || this.pointLayerInfos[name];
      this.fetchLayer(name, info.query, this[info.toGeoJson], callback);
    };
  
    this.toggleLayerControl = function(on) {
      if (!this.layerControl)
        return;
    
      var base = this.layerControl._baseLayersList;
      if (base) {
        for (var i = 0; i < base.childNodes.length; i++) {
          base.childNodes[i].childNodes[0].disabled = !on;
        }
      }
      
      var overlays = this.layerControl._overlaysList;
      if (overlays) {
        for (var i = 0; i < overlays.childNodes.length; i++) {
          overlays.childNodes[i].childNodes[0].disabled = !on;
        }
      }
    };
  
  
    this.addDelayedLayer = function(name, callback) {
      var self = this;
      var newLayer = new L.layerGroup();
      newLayer.onAdd = function(mapObj) {
        self.userAskedFor[name] = "y";
        self.currentLayerName = name;
        this._map = mapObj;
        self.loadLayer(name, newLayer, callback);
        self.toggleLayerControl(false);
        setTimeout(function () {self.toggleLayerControl(true);}, 5000);
      };
      
      newLayer.onRemove = function(mapObj) {
        this._map = mapObj;
        newLayer.eachLayer(mapObj.removeLayer, mapObj);
      };
  
      return newLayer;
    };
  
    this.mkPointLayerGroup = function(name, geoJsons, layerGroup) {
      var newLayer;
      if (layerGroup) {
        for (var i = 0; i < geoJsons.length; i++) {
          layerGroup.addLayer(geoJsons[i]);
        }
        
        newLayer = layerGroup;
      }
      else
        newLayer = new L.layerGroup(geoJsons);
      
      this.setOnAddRemove(name, newLayer);
      return newLayer;
    };
  
    this.mkShapeLayerGroup = function(name, geoJson, minMax, style, layerGroup) {
      var self = this;
      var layers = this.addGeoJsonShapes(geoJson, style);
      var newLayer;
      if (layerGroup) {
        for (var i = 0; i < layers.length; i++) {
          layerGroup.addLayer(layers[i]);
        }
        
        newLayer = layerGroup;
      }
      else
        newLayer = new L.layerGroup(layers);
      
      this.setOnAddRemove(name, newLayer, minMax);
      return newLayer;
    };
  
    this.setOnAddRemove = function(name, newLayer, minMax) {
      var self = this;
      newLayer.onAdd = function(mapObj) {      
        self.currentLayerName = name;
        this._map = mapObj;
        this.eachLayer(mapObj.addLayer, mapObj);
        if (typeof minMax != 'undefined') {
          self.currentLayerDensity = minMax;
          self.addDensityLegend(minMax);
        }      
      };
      
      newLayer.onRemove = function(mapObj) {
        this._map = mapObj;
        this.eachLayer(mapObj.removeLayer, mapObj);
      };
    };
    
    this.addGeoJsonShapes = function(geoJsons, style, autoAdd) {
      'use strict';
      var layers = [];
      for (var i = 0; i < geoJsons.length; i++) {
        var gj = this.makeLayerFromGeoJsonShape(geoJsons[i], style, autoAdd);
        layers.push(gj);
      }
      
  //      this.shapeLayers = this.shapeLayers ? this.shapeLayers.concat(layers) : layers;
      return layers;
    };
  
    function _getResetHighlight(gj) {
      var self = this;
      return function(e) {
        gj.resetStyle(e.target);
        self.clearInfos(e);
      };
    };
  
    this.getOnEachShapeFeature = function(gj) {
      var self = this;
      return function(feature, layer) {
        layer.on({
          mouseover: self.highlightFeature,
          mouseout: self._getResetHighlight,
          click: self.zoomToFeature
        });
      };
    };
  
    this.makeLayerFromGeoJsonShape = function(geoJson, style, autoAdd) {
      style = style ? style : simpleStyle;
      var gj;
      var self = this;
      var resetHighlight = function(e) {
        gj.resetStyle(e.target);
        self.clearInfos(e);
      };
      
      var zoomToFeature = function(e) {
        self.fitBounds(e.target.getBounds());
      }
  
      var onEachFeature = function(feature, layer) {
        var settings = {
          mouseout: resetHighlight,
          click: zoomToFeature
        };
        
        if (typeof style == 'function' || style.highlightFeature)
          settings.mouseover = self.getHighlightFeatureFunction();
        
        layer.on(settings);
      };
  
      gj = L.geoJson(geoJson, {style: style, onEachFeature: onEachFeature});
      if (autoAdd)
        gj.addTo(this.map);
      
      if (geoJson.properties.html)
        gj.bindPopup(geoJson.properties.html);
      
      return gj;
    };
      
    this.toBasicGeoJsonShape = function(shape) {
      var shapeType = shape.shapeType ? (shape.shapeType.toLowerCase() == 'multipolygon' ? 'MultiPolygon' : 'Polygon') : 'Polygon';
      return {"type" : "Feature", "properties": {"name" : shape.davDisplayName, "html": html}, "geometry": {"type": shapeType, "coordinates": eval('(' + shape.shapeJson + ')')}};
    },
  
    this.toBasicGeoJsonPoint = function(point) {
      return {"type" : "Feature", "properties": {"name" : point.davDisplayName}, "geometry": {"type": "Point", "coordinates": [point.longitude, point.latitude]}};
    };
  
    this.getGradientColor = function(range, val) {
      var r = range[1] - range[0];
      var percent = (val - range[0]) / r;
      var hue = percent * 0.33;  // go from green to red  (red = 0, green = 0.33, with yellow/orange in between)
  //    var saturation = Math.abs(percent - 0.5)/0.5;   // fade to white as it approaches 50
      return this.hsv2rgb(hue, 1, 0.99);
    };
    
    this.getScaledClusterIconCreateFunction = function(options) {
      var self = this;
      var color = options.color;
      var doScale = options.doScale;
      var showCount = options.showCount;
      var gradient = options.gradient;
  
      return function(cluster) {
        var childCount = cluster.getChildCount();
        var children = cluster.getAllChildMarkers();
        var radius;
        var size = 40;
        var diameter = 30;
        custom = true;
        var rgb;
        if (gradient)
          rgb = gradient.color ? self.hexToRGB(gradient.color) : self.getGradientColor(self.gradientInfo.range, children[0].valInRange);
        else
          rgb = self.hexToRGB(color || self.getNextColor(Math.random()));
        
        var background = "background-color: rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", 0.7); color: " + self.getTextColor(rgb[0], rgb[1], rgb[2]) + ";";
        var zoom = cluster._zoom || 10;
        var width;
        var font;
        if (doScale) {
          diameter = 10 + Math.round(100 * Math.log(childCount) / zoom);
          size = diameter + 6; // +10 if marker-cluster padding is 5px 
          width = "width: " + diameter + "px; height: " + diameter + "px; line-height: " + (diameter + 1) + "px;";
          font = "font-size: " + Math.ceil(size / 4 + 5) + "px;" // + (size < 20 ? '8px' : size < 60 ? '15px' : '25px') + ";";
        }
        
        html = '<div style=\"' + (background || '') + (width || '') + (font || '') + '\">' + (showCount && childCount > 1 ? childCount : '') + '</div>';
        
        return new L.DivIcon({ html: html, className: 'marker-cluster marker-cluster-tight marker-cluster-green', iconSize: new L.Point(size, size) });
      }
    };
  
    this.getSimpleClusterIconCreateFunction = function(options) {
      return function(cluster) {
        var childCount = cluster.getChildCount();
        var one = childCount == 1;
        var size = 40;
        var c;
        if (one) {
          size = 15;
          c = 'marker-cluster marker-cluster-tight marker-cluster-green';
        }
        else {
          c = ' marker-cluster-';
          if (childCount < 10) {
            c += 'small';
          } else if (childCount < 100) {
            c += 'medium';
          } else {
            c += 'large';
          }
          
          c = 'marker-cluster ' + c;
        }
  
        var div;
        if (one) {
          var diameter = size - 6;
          div = "<div style=\"width:" + diameter + "px; height: " + diameter + "px; line-height: " + (diameter + 1) + "px; background-color: rgba(0, 255, 0, 0.5);\">";
        }
        else
          div = '<div>';
  
          
        return new L.DivIcon({ html: div + (one ? '' : '<span>' + childCount + '</span>') + '</div>', className: c, iconSize: new L.Point(size, size) });
      }
    };

    function extend(obj) {
      var others = Array.prototype.slice.call(arguments, 1);
      for (var i = 0; i < others.length; i++) {
        var source = others[i];
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }

      return obj;
    };

    var keys = Object.keys || function(obj) {
      if (obj !== Object(obj)) throw new TypeError('Invalid object');
      var ks = [];
      for (var key in obj) 
        if (obj.hasOwnProperty(key)) 
          ks[ks.length] = key;
          
      return ks;
    };

    this.addGeoJsonPoints = function(nameToGeoJson, type, markerOptions, style, behaviorOptions) {
      'use strict';
      if (!markerOptions.disableClusteringAtZoom)
        markerOptions.disableClusteringAtZoom = this.maxZoom;
      
      behaviorOptions = behaviorOptions || {doCluster: false, highlight: false, zoom: false, hexColor: undefined, colorSeed: undefined, icon: undefined};
      var allOptions = extend({}, markerOptions, behaviorOptions);
      var self = this;
      var style = style ? style : simpleStyle;
      var i = 0;
      var layer = [];
      function parseRange(r) {
        var matches = r.match(/([\d\.]+)[^\d]+([\d\.]+)/);
        var from = parseInt(matches[1]);
        var to = parseInt(matches[1]);
        return (from + (to - from) / 2); 
      }
      
      for (var name in nameToGeoJson) {
        var g = nameToGeoJson[name];
        var gj;
        var resetHighlight = function(e) {
          gj.resetStyle(e.target);
        };
        
        var onEachFeature = function(feature, layer) {
          var highlightFeature1 = getHighlightFeatureFunction();
          layer.on({
            mouseover: behaviorOptions.highlight ? highlightFeature1 : self.updateInfos,
            mouseout: behaviorOptions.highlight ? resetHighlight : self.updateInfos,
            click: behaviorOptions.zoom ? zoomToFeature : null
          });
        };
        
        markerOptions = markerOptions || {};
  //        if (!hexColor) {
  //          var colors = this.generateColors(1, behaviorOptions.colorSeed || 0.5);
  //          colorSeed = colors[0][0];
  //          var color = M.hsv2rgb(colors[0][0], colors[0][1], colors[0][2]);
  //          color = M.rgbToHex(color[0], color[1], color[2]);
  //          markerOptions.color = color;
  //        }
        if (behaviorOptions.gradient) {
  //        Math.floor((100 - val) * 120 / 100);
        }
        else if (behaviorOptions.hexColor) {
          var c = behaviorOptions.hexColor;
          markerOptions.color = c;
          var rgb = this.hexToRGB(c);
          behaviorOptions.colorSeed = this.rgb2hsv(rgb[0], rgb[1], rgb[2])[0];
          behaviorOptions.hexColor = null;
        }
        
        var markers;
        if (behaviorOptions.doCluster) {
          if (markerOptions.doScale)
            markerOptions.iconCreateFunction = self.getScaledClusterIconCreateFunction(allOptions);
          else
            markerOptions.iconCreateFunction = self.getSimpleClusterIconCreateFunction(allOptions);
          
          markers = new L.MarkerClusterGroup(markerOptions);
        }
        
        var pointToLayer = this.getPointToLayerFunction(name, markers, allOptions);      
        gj = L.geoJson(g, {style: style, pointToLayer: pointToLayer});
        layer.push(gj);
        var newLayer = this.mkPointLayerGroup(name, layer, this.pointLayers[name]);
        this.pointLayers[name] = newLayer;
        this.nameToType[name] = type;
        
        newLayer.addTo(this.map);
        this.currentLayerName = name;
        i++;
      }
      
    };
    
    this.getPointToLayerFunction = function(layerName, layer, options) {
      var self = this;
      var valInRange;
      if (options.gradient) {
        var r = options.gradient.range;
        valInRange = r[0] + (r[1] - r[0]) / 2;
      }
      
      return function(feature, latlng) {
        var marker;
        if (options.icon)
          marker = L.marker(latlng, {icon: options.icon});
        else
          marker = L.marker(latlng);
        
        var markerStyle = {};
        if (feature.properties.width)
          markerStyle.minWidth = feature.properties.width;
        
        if (feature.properties.height)
          markerStyle.minHeight = feature.properties.height;
          
        if (keys(markerStyle).length > 0)
          marker.bindPopup(feature.properties.html, markerStyle);        
        else
          marker.bindPopup(feature.properties.html);
  
        if (options.gradient) {
          marker.valInRange = valInRange;
        }
        
  //        var name = type + ': ' + feature.properties.name;
        marker.on('mouseover', function(e) {self.updateInfosWithHTML(feature.properties.name);});
        marker.on('mouseout', function(e) {self.clearInfos(e);});
        if (options.doCluster)
          layer.addLayer(marker);
        
        return options.doCluster ? layer : marker;
      };
    }
  
    this.fitBounds = function(mapBounds) {
      if (mapBounds)
        this.map.fitBounds(mapBounds);
    };
  
    this.addMap = function(apiKey, settings, pointOfInterest, events) {
      this.maxZoom = settings.maxZoom || this.maxZoom;
      var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/' + apiKey + '/' + (settings.styleId || this.defaultStyleId) + '/' + '256/{z}/{x}/{y}.png';
      var cloudmadeAttribution = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade'
      var cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom: this.maxZoom, attribution: cloudmadeAttribution});
      this.initialZoom = pointOfInterest ? 10 : 7;
      var mapSettings = {center: settings.center, zoom: this.initialZoom, maxZoom: this.maxZoom, layers: [cloudmade]};
  //    if (settings.bounds)
  //      mapSettings.maxBounds = settings.bounds;
        
  //    if (events) {
  //      for (var e in events) {
  //        this.map.on('load', function(){console.log('hello')});
  //      }
  //    }
        
      if (!pointOfInterest) {
        this.map = new L.Map(this.mapDivId || 'map', mapSettings);
        this.fitBounds(settings.bounds);
        return;
      }
  
      this.pointOfInterest = pointOfInterest;
      if (pointOfInterest.geometry.type == 'Point') {
        var gj = L.geoJson(pointOfInterest, { 
          onEachFeature: function (feature, layer) {
            layer.bindPopup(pointOfInterest.properties.html);
          }
        });
      }
      else
        this.makeLayerFromGeoJsonShape(pointOfInterest, simpleStyle, true);
      
      if (mapSettings.bounds)
        Mapper.adjustBounds(mapSettings.bounds, pointOfInterest.geometry.coordinates, 'Point');
      
      this.map = new L.Map(this.mapDivId || 'map', mapSettings);
      gj.addTo(this.map);
    };  
    
    this.addLayersControlToMap = function(radioLayers, checkboxLayers, options) {
      if ((!radioLayers && !checkboxLayers) ||
          (keys(radioLayers).length == 1 && !checkboxLayers))
        return;
      
      options = options || {position: 'topright'};
      this.layerControl = L.control.layers(radioLayers, checkboxLayers, options).addTo(this.map);
    };
  
    this.addShapesLayer = function(name, shapesArr) {
      this.currentLayerName = name;
      var newLayer = this.mkShapeLayerGroup(name, shapesArr, undefined, undefined, this.shapeLayers[name]).addTo(this.map);      
      this.shapeLayers[name] = newLayer;
    };
  
    this.addDensityLayer = function(name, propsArr) {
      var none = !propsArr || propsArr.length == 0;
      this.shapeLayerInfos[name] = propsArr;
      var minMax = none ? [0, 0] : this.getMinMaxDensityFromPropertiesArray(propsArr);
      this.setMinMaxDensity(name, minMax);
      if (this.userAskedFor[name]) {
        this.currentLayerName = name;
        this.currentLayerDensity = minMax;
        this.addDensityLegend(minMax);
      }
      
      this.buildGeoJsonShapeLayers(this.getLeafletDensityMapStyleFunction(), name);
    };
    
    this.addPointsLayer = function(name, geoJsons) {
      var nameToGJ = {};
      nameToGJ[name] = geoJsons;
      this.addGeoJsonPoints(nameToGJ, name, {disableClusteringAtZoom: this.maxZoom + 1, singleMarkerMode: true, doScale: true, showCount: true, doSpiderfy: false}, null, {doCluster: true, highlight: true, zoom: false, hexColor: this.getNextColor()});      
    };
    
    this.fetchLayer = function(name, query, toGeoJson, callback) {
      var self = this;
      if (!this.serverName) {
        var baseUriO = document.getElementsByTagName('base');
        var baseUri = "";
        if (baseUriO) {
          baseUri = baseUriO[0].href;
          if (baseUri  &&  baseUri.lastIndexOf("/") != baseUri.length - 1)
            baseUri += "/";
        }
        
        this.serverName = baseUri;
      }
  
      var path = query.split("?"),
          ajaxParams = {
            url: this.serverName + "api/v1/" + path[0]
          };
      
      if (path.length > 1)
        ajaxParams.data = U.getQueryParams(path[1]);
      
      U.ajax(ajaxParams, 'maps').done(function(data, status, xhr) {
        var content = xhr.responseText;
        if (!content)
          return;
        
        var data = eval("(" + content + ")");
        if (!data.length)
          return;
        
        var geoJson = {};
        var propsArr = [];
        for (var i = 0; i < data.length; i++) {
          var props = toGeoJson(data[i], name, self);
          if (props)
            propsArr.push(props);
        }
  
        if (typeof callback == 'string')
          callback = self[callback];
        
        callback.apply(self, [name, propsArr]);
        if (self.userAskedFor)
          self.userAskedFor[name] = null;
        
        self.toggleLayerControl(true);        
      }).fail(function() {
        console.debug('failed to get layer data for map');
      });
    };
  
    this.setMinMaxDensity = function(name, minMax) {
      this.layerToDensity[name] = minMax;
    };
    
    this.setCurrentLayer = function(name) {
      this.currentLayerName = name;
      this.currentLayerDensity = this.layerToDensity[name];
    };
    
    this.getMinMaxDensityForLayer = function(name) {
      return this.layerToDensity[name];
    };
   
    this.setWidthHeight = function(geoJson, width, height) {
      var hasWidth = typeof width != 'undefined';
      var hasHeight = typeof height != 'undefined';
      if (!hasWidth || !hasHeight) {
        geoJson.properties.width = 205;
        return;
      }
      
      var offset = Math.max(width, height) / 205;
      width = Math.round(width / offset);
      height = Math.round(height / offset);
      geoJson.properties.width = width;
      geoJson.properties.height = height;
    };
    
    this.setHTML = function(type, geoJson, item, img, linkToMap) {
      var width = geoJson.properties.width;
      var height = geoJson.properties.height;
      var hasWidth = typeof width != 'undefined';
      var hasHeight = typeof height != 'undefined';
      var isShort = item._uri.indexOf('http') != 0;
      var name = type + '<br />' + item.davDisplayName + "<br/>";
      var html = "<a href='";
      if (isShort)
        html += "v/" + item._uri + (linkToMap ? '?-map=y' : '');
      else
        html += "v.html?uri=" + encodeURIComponent(item._uri) + (linkToMap ? '&-map=y' : '');
      
      html += "'>" + name;
      
      if (img)
        html += "<img src='" + this.getImageUrl(img, this.serverName) + "'" + (hasWidth ? " width=\"" + width + "\"" : "") + (hasHeight ? " height=\"" + height + "\"" : "") + " />";
          
      html += "</a>";
      geoJson.properties.html = html;
    };
    
    this.getToGeoJsonFunction = function(clName, shapePropName, countPropName) {
      var self = this;
      return function(item, name) { 
        var shapeUri = item[shapePropName]; 
        if (!shapeUri) 
          return null; 
         
        var shape = self.shapeJsons[shapeUri]; 
        if (!shape) 
          return null; 
         
        var props = {}; 
        props.id = shapeUri; 
        if (clName)
          props.type = clName;
        
        props.item = item['davDisplayName']; 
        props.count = item[countPropName || 'COUNT']; 
        if (typeof props.count != 'undefined' && typeof shape.properties.area != 'undefined') 
          props.density = props.count * offset / shape.properties.area;
        
        return props; 
      };
    };
    
    this.rgb2hsv = function(r,g,b) {
      'use strict';
      var computedH = 0;
      var computedS = 0;
      var computedV = 0;
    
      //remove spaces from input RGB values, convert to int
      r=r/255; g=g/255; b=b/255;
      var minRGB = Math.min(r,Math.min(g,b));
      var maxRGB = Math.max(r,Math.max(g,b));
    
      // Black-gray-white
      if (minRGB==maxRGB) {
       computedV = minRGB;
       return [0,0,computedV];
      }
    
      // Colors other than black-gray-white:
      var d = (r==minRGB) ? g-b : ((b==minRGB) ? r-g : b-r);
      var h = (r==minRGB) ? 3 : ((b==minRGB) ? 1 : 5);
      computedH = 60*(h - d/(maxRGB - minRGB));
      computedS = (maxRGB - minRGB)/maxRGB;
      computedV = maxRGB;
      return [computedH/360,computedS,computedV];
    }
    
    this.componentToHex = function(c) {
      'use strict';
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
    }
    
    this.rgbToHex = function(r, g, b) {
      'use strict';
      return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    };
    
    this.getImageUrl = function(imgUri, serverName) {
      return imgUri == null ? null : 'http://' + serverName + imgUri.substring(imgUri.indexOf('Image') + 5);
    };
    
    //var Aggregation = {
    //  'TreesBySpeciesAndPostalCode' : {'shape': 'postalCodeArea', 'nonShape' : 'species', 'count' : 'treesCount'},
    //  'TreesBySpeciesAndCensusBlock' : {'shape': 'censusBlock', 'nonShape' : 'species', 'count' : 'treesCount'},
    //}
    
    this.getMinMaxDensity = function(geoJsons) {
      var max = 0;
      var min = 0;
      for (var i = 0; i < geoJsons.length; i++) {
        var gj = geoJsons[i];
        var props = gj.properties;
        if (!props || props.density == null)
          continue;
        
        var d = props.density;
        max = max ? Math.max(d, max) : d;
        min = min ? Math.min(d, min) : d;
      }
      
      return [min, max];
    };
    
    this.getMinMaxDensityFromPropertiesArray = function(propsArr) {
      var max = 0;
      var min = 0;
      for (var i = 0; i < propsArr.length; i++) {
        var props = propsArr[i];
        if (!props || props.density == null)
          continue;
        
        var d = props.density;
        max = max ? Math.max(d, max) : d;
        min = min ? Math.min(d, min) : d;
      }
      
      return [min, max];
    }
    
//    // concats "two" to "one" in new object
//    this.merge = function(one, two) {
//      if (!one && !two)
//        return undefined;
//      
//      var obj = {};
//      if (one) {
//        for (var prop in one) {
//          if (one.hasOwnProperty(prop))
//            obj[prop] = one[prop];
//        }
//      }
//      
//      if (two) {
//        for (var prop in two) {
//          if (two.hasOwnProperty(prop))
//            obj[prop] = two[prop];
//        }
//      }
//      
//      return obj;
//    }
    
    this.hexToRGB = function(h) {
      'use strict';
      var num = (h.charAt(0)=="#") ? h.substring(1,7): h;
      return [parseInt(num.substring(0,2),16), parseInt(num.substring(2,4),16), parseInt(num.substring(4,6), 16)];
    };
    
    this.hsv2rgb = function(h, s, v) {
      'use strict';
      //Adapted from http://www.easyrgb.com/math.html
      //hsv values = 0 - 1, rgb values = 0 - 255
      var r, g, b;
      var RGB = new Array();
      if (s == 0) {
          var r = Math.round(v * 255);
          RGB = [r, r, r];
      } else {
          var var_r, var_g, var_b;
          // h must be < 1
          var var_h = h * 6;
          if (var_h == 6) var_h = 0;
          //Or ... var_i = floor( var_h )
          var var_i = Math.floor(var_h);
          var var_1 = v * (1 - s);
          var var_2 = v * (1 - s * (var_h - var_i));
          var var_3 = v * (1 - s * (1 - (var_h - var_i)));
          if (var_i == 0) {
              var_r = v;
              var_g = var_3;
              var_b = var_1;
          } else if (var_i == 1) {
              var_r = var_2;
              var_g = v;
              var_b = var_1;
          } else if (var_i == 2) {
              var_r = var_1;
              var_g = v;
              var_b = var_3
          } else if (var_i == 3) {
              var_r = var_1;
              var_g = var_2;
              var_b = v;
          } else if (var_i == 4) {
              var_r = var_3;
              var_g = var_1;
              var_b = v;
          } else {
              var_r = v;
              var_g = var_1;
              var_b = var_2;
          }
          //rgb results = 0 ÷ 255  
          RGB = [Math.round(var_r * 255), Math.round(var_g * 255), Math.round(var_b * 255)];
      }
      
      return RGB;
    };
    
    this.getTextColor = function(bgR, bgG, bgB) {
      'use strict';
      var d = 0;
      
      // Counting the perceptive luminance - human eye favors green color... 
      var a = 1 - ( 0.299 * bgR + 0.587 * bgG + 0.114 * bgB)/255;
    
      if (a < 0.5)
        d = 80; // bright colors - black font
      else
        d = 255; // dark colors - white font
    
      return this.rgbToHex(d, d, d);
    };

    this.golden_ratio_conjugate = 0.618033988749895;
    this.generateColors = function(total, seed) {
      'use strict';
      var r = [];
      var third, secondThird;
      if (total < 3) {
        third = 1;
      }
      else {
        third = total / 3;
        secondThird = third * 2;
      }
      
      var sum = 0;
      var h = seed || Math.random();
      for (var i = 0; i < total; i++) {
        h += this.golden_ratio_conjugate;
        h %= 1;
        var s, v;
        if (i < third) {
          s = 0.5;
          v = 0.95;
        }
        else if (i < secondThird) {
          s = 0.99;
          v = 0.8;
        }
        else {
          s = 0.3;
          v = 0.99;
        }
        
        r.push([h, s, v]);
      }
      
      return r;
    };
  };

  /**
   * item should be a geoJson object or a coordinates array with lon, lat order
   */
  Mapper.adjustBounds = function(b, item, type) {
    var bbox = Mapper.getBoundingBox(item, type);
    b[0][0] = Math.min(b[0][0], bbox[0][0]);
    b[0][1] = Math.min(b[0][1], bbox[0][1]);
    b[1][0] = Math.max(b[1][0], bbox[1][0]);
    b[1][1] = Math.max(b[1][1], bbox[1][1]);
    return b;
  };
  
  Mapper.getBoundingBox = function(item, type) {
    var coords = item.geometry ? item.geometry.coords : item;
    if (!coords.length)
      return null;
    
    switch (type || item.geometry.type) {
    case 'Point':
      var a = [coords[1], coords[0]];
      return [a, a];
    case 'Polygon':
      var bbox = Mapper.getBoundingBox(coords[0], 'Point');
      for (var i = 1; i < coords.length; i++) {
        bbox = Mapper.adjustBounds(bbox, coords[i], 'Point');
      }
      
      return bbox;
    case 'MultiPolygon':
    case 'Polygon':
      var bbox = Mapper.getBoundingBox(coords[0], 'Polygon');
      for (var i = 1; i < coords.length; i++) {
        bbox = Mapper.adjustBounds(bbox, coords[i], 'Polygon');
      }
      
      return bbox;
    }
  };

  return Mapper;
}));
//});
