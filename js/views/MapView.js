//'use strict';
define('views/MapView', [
  'globals',
  'underscore', 
  'events', 
  'utils',
  'views/BasicView'
], function(G, _, Events, U, BasicView) {
  var MapView = BasicView.extend({
//    css: [
//      'leaflet.css', 
//      'MarkerCluster.Default.css'
//    ],
//    cssListeners: [],
    loadedCSS: false,
    initialize: function (options) {
      _.bindAll(this, 'render', 'show', 'hide','toggleMap', 'resetMap', 'onSwipe', 'onDrag', 'resize');
      BasicView.prototype.initialize.apply(this, arguments);
      this.listenTo(Events, "mapIt", this.toggleMap);
//      this.listenTo(Events, "pageChange", this.resetMap);
      
      var self = this,
          dfds = [],
          readyDfd = $.Deferred(),
          modulesDfd = U.require(['maps', 'leaflet', 'leafletMarkerCluster', '../styles/leaflet/leaflet.css', '../styles/leaflet/MarkerCluster.Default.css']);
      
//      if (this.collection && !this.vocModel.derived && this.collection.params['-layer']) {
//        var aggDfd = $.Deferred();
//        dfds.push(aggDfd.promise());
//        U.ajax({url: this.collection.getUrl() + '&$map=y', type: 'GET'}).done(function(data, status, xhr) {
//          self.aggregationData = data.data[0];
//        }).fail(function(xhr, status, msg) {
//          debugger;
//        }).always(aggDfd.resolve);      
//      }
      
      this.ready = readyDfd.promise();
      dfds.push(modulesDfd.promise());
      $.when.apply($, dfds).always(readyDfd.resolve);
    },
    events: {
      'swipe'             : 'onSwipe',
      'drag'              : 'onDrag'
    },
    
    windowEvents: {
      'orientationchange' : 'resize',
      'resize'            : 'resize'
    },
    
    resize: function() {
      if (!this.mapper)
        return;
      
      if (window.innerWidth > window.innerHeight) // landscape
        this.$('#map').$css('height', window.innerHeight * 0.6);
      else
        this.$('#map').$css('height', window.innerHeight * 0.4);
      
      this.resetMap();
    },
    onDrag: function(e) {
      Events.stopEvent(e);
    },
    onSwipe: function(e) {
      Events.stopEvent(e);
    },
//    click: Events.defaultClickHandler,  
    render: function (eventName) {
      var self = this, 
          args = arguments;
      
//      if (this.collection && this.vocModel.derived) {
//        var aggDfd = $.Deferred();
//        dfds.push(aggDfd.promise());
//        
//      }
      
      this.ready.done(function() {
        self.renderHelper.apply(self, args);
      });
    },
    renderHelper: function() {
      L.Icon.Default.imagePath = 'images/leaflet';
//      if (!this.loadedCSS) {
//        this.cssListeners.push(self.render);
//        return this;
//      }
      
      var res = this.resource || this.collection;
      var vocModel = this.vocModel;
      if (res.isA("Shape")) {
        this.remove();
        return this;
      }
      
      var metadata = {};
      var gj = this.collectionToGeoJSON(res, metadata);
      if (!gj || !_.size(gj))
        return;
      
      var bbox = metadata.bbox;
      var center = this.getCenterLatLon(bbox);
      
      var pMap = U.getHashParams();
      var poi = pMap['-item'];
      var isMe = poi == 'me';
      var latLon; 
      if (poi) {
        coords = [parseFloat(pMap.longitude), parseFloat(pMap.latitude)];
        center = [coords[1], coords[0]];
        poi = this.getBasicGeoJSON('Point', coords);
        if (isMe) {
          poi.properties.name = 'Your location';
          poi.properties.html = '<a href="' + G.pageRoot + '#view/profile">You are here</a>';
        }
      }
        
  //    this.$el.html(this.template());
  
      var div = document.createElement('div');
      div.className = 'map';
      div.id = 'map';
  
      var map = this.mapper = new Mapper(div);
      map.addMap(G.cloudMadeApiKey, {maxZoom: poi ? 10 : null, center: center, bounds: bbox}, poi);
      var zoom = map.initialZoom;
  //        , {'load': function() {
  //      Events.trigger('mapReady', this.resource);
  //      this.$el.append(frag);
  //      console.log('render map');      
  //    }});
  
      var clusterStyle = {singleMarkerMode: true, doScale: false, showCount: true, doSpiderfy: false};
      var style = {doCluster: true, highlight: true, zoom: false};
      var name = vocModel.shortName;
      var geoJson = {};
      geoJson[name] = gj;
      map.addGeoJsonPoints(geoJson, null, clusterStyle, null, style);
//      map.addSizeButton(this.$el[0]);
//      map.addReZoomButton({zoom: zoom, center: center});
      map.addReZoomButton({bounds: bbox})
      var dName = vocModel.displayName;
      dName = dName.endsWith('s') ? dName : dName + 's';
      var basicInfo = map.addBasicMapInfo(dName);
      var frag = document.createDocumentFragment();
      frag.appendChild(div);
      map.finish();
      
      Events.trigger('mapReady', res);
      this.el.appendChild(frag);
      this.hide();
      this.resize();
      return this;
    },
    resetMap: function() {
      this.mapper && this.mapper.map.invalidateSize();
    },
    toggleMap: function(e) {
      if (e.active) {
        this.show();
        this.resetMap();
      }
      else {
        this.hide();
      }
    },
    
    show: function() {
      this.el.style.display = 'block';
      return this;
    },
    
    hide: function() {
      this.el.style.display = 'none';
      return this;    
    },
    getMapItemHTML: function(res) {
      var grid = U.getCols(res, 'grid');
    
      var resourceLink;
      for (var row in grid) {
        if (grid[row].resourceLink) {
          resourceLink = grid[row].value;
          delete grid[row];
        }
      }
      
      resourceLink = resourceLink || res.get('davDisplayName');
      var data = {resourceLink: resourceLink, uri: res.getUri(), rows: grid, displayName: U.getDisplayName(res) };
      
      if (res.isA("ImageResource")) {
        var medImg = res.get('mediumImage') || res.get('featured');
        if (medImg) {
          var width = res.get('originalWidth');
          var height = res.get('originalHeight');
          if (width && height) {
            var imgOffset = Math.max(width, height) / 205;
            width = Math.round(width / imgOffset);
            height = Math.round(height / imgOffset);
          }
          
          var tmpl_data = this.getBaseTemplateData();
          tmpl_data.value = _.decode(medImg);
          width && (tmpl_data.width = width);
          height && (tmpl_data.height = height);
          data.image = this.makeTemplate("imagePT", "imagePT")(tmpl_data);
//          _.extend(data, {U: U, G: G});
          return this.makeTemplate("mapItemTemplate", "mapItemTemplate")(data);
        }
      }
      
      return this.makeTemplate("mapItemTemplate", "mapItemTemplate")(data);
    },
    collectionToGeoJSON: function(model, metadata) {
      var gj = [];
      _.each(model.models, function(m){
        var mGJ = this.modelToGeoJSON(m, metadata);
        if (mGJ)
          gj.push(mGJ);
      }.bind(this));
      
      return gj;
    },
    modelToGeoJSON: function(model, metadata) {
      if (U.isCollection(model))
        return this.collectionToGeoJSON(model);
      
      var isShape = model.isA("Shape");
      var coords, area;
      if (isShape) {
        coords = model.get('shapeJson');
        if (!coords)
          return null;
        
        area = model.get('area');
      }
      else {
        var lon = model.get('longitude');
        if (!lon)
          return null;
        
        coords = [lon, model.get('latitude')];  
      }
      
        
      var type = this.getShapeType(coords);
      if (metadata) {
        var bbox;
        if (isShape)
          bbox = [[model.get('lowestLatitude'), model.get('lowestLongitude')], [model.get('highestLatitude'), model.get('highestLongitude')]];
        else {
          bbox = [coords[1], coords[0]];
          bbox = [bbox, bbox];
        }
        
        if (metadata.bbox) {
          var b = metadata.bbox;
          Mapper.adjustBounds(b, coords, isShape ? 'Polygon' : 'Point');
        }
        else
          metadata.bbox = bbox; 
      }
      
      var json = this.getBasicGeoJSON(type, coords);
      json.properties.name = model.constructor.displayName + " " + model.get('davDisplayName');
      if (area)
        json.properties.area = area;
      
      json.properties.html = this.getMapItemHTML(model);
      return json;
    },
    
    getCenterLatLon: function(bbox) {
      return [(bbox[1][0] + bbox[0][0]) / 2, (bbox[1][1] + bbox[0][1]) / 2];
    },
    
    /**
     * @param coords: points should be in lon, lat order
     */
    getBasicGeoJSON: function(shapeType, coords) {
      return {
        "type": "Feature",
        "properties": {
        },
        "geometry": {
          "type": shapeType,
          "coordinates": coords
        }
      };
    },
    
    getShapeType: function(rings) {
      var depth = this.getDepth(rings);
      switch (depth) {
      case 1:
        return "Point";
      case 2:
        return null;
      case 3:
        return "Polygon";
      case 4:
        return "MultiPolygon";
      default:
        return null;
      }
    },
    
    getDepth: function(arr) {
      var depth = 1;
      for (var i = 0; i < arr.length; i++) {
        var sub = arr[i];
        if (_.isArray(sub))
          depth = Math.max(depth, U.getDepth(sub) + 1);
        else
          return depth;
      }
      
      return depth;
    }
  },
  {
    displayName: 'MapView'
  });
  
  return MapView;
});