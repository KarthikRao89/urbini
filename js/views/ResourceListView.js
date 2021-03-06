'use strict';
define('views/ResourceListView', [
  'globals',
  'utils',
  'domUtils',
  'events',
  'views/BasicView',
//  'views/mixins/Scrollable',
  'views/ResourceMasonryItemView',
  'views/ResourceListItemView',
  'collections/ResourceList',
  'lib/fastdom',
  'vocManager',
  'physicsBridge'
], function(G, U, DOM, Events, BasicView, /*Scrollable, */ ResourceMasonryItemView, ResourceListItemView, ResourceList, Q, Voc, Physics) {
  var $wnd = $(window),
      doc = document,
      MASONRY_FN = 'masonry', // in case we decide to switch to Packery or some other plugin
      ITEM_SELECTOR = '.masonry-brick';

  var defaultSlidingWindowOptions = {
    // <MASONRY INITIAL CONFIG>
    slidingWindow: true,
    tilt: 'forward',
//    gradient: true,
//    squeeze: false,
    horizontal: false,
//    fly: true,
//    pop: 'sequential', //other option is 'random'
//    fade: 'random', //other option is 'sequential'
    animateOpacity: true,
    minBricks: 10,
    maxBricks: 10,
    bricksPerPage: 10,
    averageBrickScrollDim: 80,
    averageBrickNonScrollDim: 80,  
    minPagesInSlidingWindow: 3,
    maxPagesInSlidingWindow: 6,
    defaultAddDelta: 1, // in terms of pages
    gutterWidth: 10,
    scrollerType: 'verticalMain'
    // </ MASONRY INITIAL CONFIG>      
  };
  
  return BasicView.extend({
    // CONFIG
    _autoFetch: false,
    autoFinish: false,
//    _flexigroup: true,
    _draggable: true,
    _dragAxis: 'y',
    _scrollbar: true,
    _invisibleLayerThickness: 0, // in pages, 1 == 1 page, 2 == 2 pages, etc. (3 == 3 pages fool!)
    displayMode: 'vanillaList', // other options: 'masonry'
    // END CONFIG
    
//    _brickMarginH: null,
//    _brickMarginV: null,
//    _headOffset: 0,
//    _tailOffset: 0,
    _offsetLeft: 0, // updated after append to DOM
    _offsetTop: 0,  // updated after append to DOM
    _childEls: null,
    _placeholders: null,
    _outOfData: false,
    _adjustmentQueued: false,
//    _failedToRenderCount: 0,
    _scrollable: false, // is set to true when the content is bigger than the container
//    _lastRangeEventSeq: -Infinity,
//    _lastPrefetchEventSeq: -Infinity,
    className: 'scrollable',
    style: { 
      opacity: DOM.maxOpacity,
//      position: 'absolute',
      'transform-origin': '50% 50%'
    },
    stashed: [],
    initialize: function(options) {
      _.bindAll(this, 'render', 'fetchResources', 'refresh', 'setMode', 'onResourceChanged', '_onPhysicsMessage', 'doSearch', 'doFilter');
      options = options || {};
      BasicView.prototype.initialize.call(this, options);
      this.displayMode = options.displayMode || 'vanillaList';
      this._flexigroup = this._flexigroup && this.displayMode != 'vanillaList';
//      this._masonryOptions = _.defaults({
//        gutterWidth: GUTTER_WIDTH
//      }, defaultMasonryOptions);
      
      this.options = _.extend({}, defaultSlidingWindowOptions); // for now
      if (this.displayMode == 'masonry') {
        this._itemClass = ResourceMasonryItemView;
      }
      else {
        this._itemClass = ResourceListItemView;
        this.options.oneElementPerRow = this.options.stretchRow = true;
        this.options.gutterWidth = 0;
      }
      
      this.transformIdx = this.options.horizontal ? 12 : 13;
      this._dragIdx = this.options.horizontal ? 'x' : 'y';
      this.mode = options.mode || G.LISTMODES.DEFAULT;
      var type = this.modelType;
      this.makeTemplate('fileUpload', 'fileUploadTemplate', type);
      var commonTypes = G.commonTypes;
      this.isPhotogrid = this.type == 'photogrid'; //this.parentView.isPhotogrid;
      if (this.isPhotogrid)
        this.displayPerPage = 5;
  
      var vocModel = this.vocModel;
      this.mvProp = this.hashParams.$multiValue;
      this.isMultiValueChooser = !!this.mvProp;
      if (this.mvProp) {
        this.mvVals = [];
        var pr = '$' + this.mvProp;
        var s = this.hashParams[pr];
        s = s.split(',');
        for (var i = 0; i < s.length; i++)
          this.mvVals.push(s[i].trim());
      }
  
      this.isEdit = this.hashParams['$editList'];
      
      var self = this,
          col = this.collection;
      
      _.each(['reset'], function(event) {
        self.stopListening(col, event);
        self.listenTo(col, event, function(resources) {
          resources = U.isCollection(resources) ? resources.models : U.isModel(resources) ? [resources] : resources;
          var options = {
            resources: resources
          };
          
          options[event] = true;
          if (event == 'reset') {
            self._outOfData = false;
            self._isPaging = false;
            if (self._pagingPromise.state() == 'pending')
              self._pagingPromise._canceled = true;
//            self.mason.unsetLimit();
            self._removeBricks(self._displayedRange.from, self._displayedRange.to);
            self._displayedRange.from = self._displayedRange.to = 0;
            self.mason.reset();
//            if (self.mason.isLocked())
//              self.mason['continue']();
          }
          
//          self.refresh(options);
        });
      });
      
      this._displayedRange = {
        from: 0,
        to: 0
      };

      this.itemViewCache = [];
      this._childEls = [];
      this._placeholders = [];
      this._viewport = {
        head: 0,
        tail: G.viewport[this.options.horizontal ? 'width' : 'height']
      };
      
      this.originalParams = _.clone(this.collection.params);
      
//      Physics.here.on('translate.' + this.axis.toLowerCase(), this.getBodyId(), this.onScroll);
//      
//      this.listenTo(this.collection, 'endOfList', function() {
//        this._outOfData = true;
//        if (this.isActive())
//          this.setBrickLimit();
//      }, this);
      
      return this;
    },

    setBrickLimit: function(limit) {
      this.mason.setLimit(limit || this.collection.getTotal() || this.collection.length);
      this.mason['continue']();      
    },

    unsetBrickLimit: function() {
      this.mason.unsetLimit();
      this.mason['continue']();      
    },

    modelEvents: {
      'reset': '_resetSlidingWindow',
      'added': '_onAddedResources'
//        ,
//      'updated': '_onUpdatedResources'
    },
    
    events: {
      'click': 'click'
    },
    
    globalEvents: {
      'searchList': 'doSearch',
      'filterList': 'doFilter'
    },
    
//    _searchDebounce: 100,
//    search: function(page, value) {
//      console.log("SEARCH", value);
//      if (this.getPageView() != page)
//        return;
//
//      var self = this,
//          now = _.now(),
//          lastSearchTime = this._lastSearchTime || now; // debounce first too
//      
//      this._lastSearchTime = now;
//      if (now - lastSearchTime < this._searchDebounce || this.mason.isLocked()) {
//        clearTimeout(this._searchTimeout);
//        this._searchTimeout = setTimeout(function() {
//          self.doSearch(value);
//        }, this._searchDebounce);
//        
//        return;
//      }
//      else
//        this.doSearch(value);
//    },
    
    doSearch: _.debounce(function(page, value) {
      console.log("DO SEARCH", value);
      if (this.getPageView() != page || this._searchValue == value) {
        console.log("ALREADY SEARCHED", value);
        return;
      }
      
      if (this.mason.isLocked()) {
        console.log("SEARCH LOCKED", value);
        return this.doSearch(this.getPageView(), value);
      }
        
      console.log("SEARCHING", value);
      this._searchValue = value;
      var pageView = this.getPageView(),
          col = pageView.collection,
          filtered = pageView.filteredCollection,
          value = this._searchValue,
          valueLowerCase,
          resourceMatches,
          numResults,
          indicatorId,
          hideIndicator;
      
      if (!value) {
        indicatorId = this.showLoadingIndicator(3000); // 3 second timeout
        hideIndicator = this.hideLoadingIndicator.bind(this, indicatorId);

        filtered.reset(col.models, {
          params: this.originalParams
        });
        
        return;
      }
      
      valueLowerCase = value.toLowerCase();
      resourceMatches = col.models.filter(function(res) {
        var dn = U.getDisplayName(res);
        return dn && ~dn.toLowerCase().indexOf(valueLowerCase);
      });
  
      filtered.reset(resourceMatches, {
        params: _.defaults({
          '$like': 'davDisplayName,' + value
        }, this.originalParams)
      });      
    }, 100),
    
    doFilter: _.debounce(function(page, filterParams) {
      // TODO: filter similar to search, except per property instead of for displayName, maybe generalize it so it works for search too
      console.log("DO FILTER", value);
      if (!this._filterParams)
        this._filterParams = _.clone(this.originalParams);
      
      if (this.getPageView() != page || _.isEqual(this._filterParams, filterParams)) {
        console.log("ALREADY FILTERED " + JSON.stringify(filterParams));
        return;
      }
      
      if (this.mason.isLocked()) {
        console.log("FILTER LOCKED", value);
        return this.doFilter(this.getPageView(), filterParams);
      }
        
      console.log("FILTERING", filterParams);
      this._filterParams = filterParams;
      var pageView = this.getPageView(),
          col = pageView.collection,
          filtered = pageView.filteredCollection,
          value = this._searchValue,
          valueLowerCase,
          resourceMatches,
          numResults,
          indicatorId,
          hideIndicator;
      
      if (!_.size(filterParams)) {
        indicatorId = this.showLoadingIndicator(3000); // 3 second timeout
        hideIndicator = this.hideLoadingIndicator.bind(this, indicatorId);

        filtered.reset(col.models, {
          params: this.originalParams
        });
        
        return;
      }
      
      if (typeof value == 'string')
        valueLowerCase = value.toLowerCase();

//      resourceMatches = col.models.filter(function(res) {
//        var dn = U.getDisplayName(res);
//        return dn && ~dn.toLowerCase().indexOf(valueLowerCase);
//      });

      filtered.belongsInCollection = U.buildValueTester(this._filterParams, this.vocModel) || G.trueFn;
      resourceMatches = col.models.filter(filtered.belongsInCollection.bind(filtered));
      filtered.reset(resourceMatches, {
        params: _.defaults(this._filterParams, this.originalParams)
      });      
    }, 100),
    
//    myEvents: {
//      'active': '_onActive'
//    },
//    
//    _onActive: function() {
//      return BasicView.prototype._onActive.apply(this, arguments);
//    },
    
//    windowEvents: {
//      'viewportwidthchanged': '_onWidthChanged'
//    },
//    
//    _onPhysicsMessage: function(event) {
//      var self = this,
//          result;
//      
//      function report() {
//        self.log("STATE: " + self._childEls.map(function(b) { return parseInt(b.dataset.viewid.match(/\d+/)[0])})/*.sort(function(a, b) {return a - b})*/.join(","));
//      };
//      
//      try {
//        result = this.handlePhysicsMessage.apply(this, arguments);
//      } finally {
//        if (_.isPromise(result))
//          result.always(report);
//        else
//          report();
//      }
//    },

    updateTotal: function() {
      if (!this.total) {
        var total = this.collection.getTotal();
        if (total != this.total) {
          this.total = total;
          return true;
        }
      }
    },
    
    _onPhysicsMessage: function(event) {
      if (event.info)
        _.extend(this.options, event.info);

      if (event.type != 'prefetch') {
        if (this.mason.isLocked()) {
//          debugger; // should never happen
          return;
        }
          
        this.mason.lock();
      }

      if (this.updateTotal())
        this.mason.setLimit(this.collection.getTotal());

      switch (event.type) {
        case 'range':
          if (this._displayedRange.to > this._displayedRange.from)
            this._removeBricks(this._displayedRange.from, this._displayedRange.to);
          
          if (event.from < this._displayedRange.from)
            this._displayedRange.from = this._displayedRange.to = event.to;
          else
            this._displayedRange.from = this._displayedRange.to = event.from;
          
          return this._addBricks(event.from, event.to);
        case 'prefetch':
          if (this._isPaging)
            return;
          
          // fall through to 'more'
        case 'more':
//          this._lastRangeEventSeq = event.eventSeq;
          var num = event.quantity,
              from, 
              to;
          
          if (event.head) {
            from = Math.max(this._displayedRange.from - num, 0);
            to = this._displayedRange.from;
          }
          else {
            from = this._displayedRange.to;
            to = from + num;
          }
          
          if (event.type == 'more')
            return this._addBricks(from, to);
          else
            return this.fetchResources(from, to);
          
        case 'less':
          var from, 
              to;
          
          if (event.head) {
            from = this._displayedRange.from;
            to = Math.min(from + event.head, this._displayedRange.to);
            this._removeBricks(from, to);
            this._displayedRange.from += (to - from);
          }
          
          if (event.tail) {
            from = Math.max(this._displayedRange.to - event.tail, this._displayedRange.from);
            to = Math.min(from + event.tail, this._displayedRange.to);
            this._removeBricks(from, to);
            this._displayedRange.to -= (to - from);
          }
          
          this.mason['continue']();
          return;
        default:
          throw "not implemented yet";
      }
    },
    
    click: function(e) {
      var top = e.target,
          params = this.hashParams,
          parentView = this,
          navOptions = {},
          link,
          self,
          type,
          isWebCl,
          isImplementor,
          cloned,
          viewId,
          dataUri;

      while (top && top != this.el && !(viewId = top.dataset.viewid)) {
        dataUri = top.dataset.uri;
        if (dataUri) {
          Events.trigger('navigate', dataUri);
          return;
        }
        
        if (top.tagName == 'A')
          link = top;
        
        top = top.parentNode;
      }

      self = viewId && this.children[viewId]; // list item view
      if (!self || self.mvProp) // ||  self.TAG == 'HorizontalListItemView') 
        return;
      
      if (self.TAG !== 'HorizontalListItemView' && this.displayMode != 'vanillaList'  && !this._flexigroup)
        navOptions.via = self;
      
      if (link) {
        Events.stopEvent(e);
        Events.trigger('navigate', link.href, navOptions);
        return;
      }
      
      Events.stopEvent(e);
      parentView = this;
      type = params['$type'];
      isWebCl = self.doesModelSubclass(G.commonTypes.WebClass);
      isImplementor = type && type.endsWith('system/designer/InterfaceImplementor');
      cloned = self.clonedProperties;
      
      if (self.doesModelSubclass('model/workflow/Alert')) {
        Events.stopEvent(e);
        var prms = {};
        var atype = self.resource.get('alertType');
        var action = atype  &&  atype == 'SyncFail' ? 'edit' : 'view';
        var uri = self.resource.get('forum') || self.resource.getUri();
        Events.trigger('navigate', U.makeMobileUrl(action, uri, {'-info': self.resource.get('davDisplayName')}), navOptions);//, {trigger: true, forceFetch: true});
        return;
      }
      if (self.doesModelSubclass('model/social/QuizQuestion')) {
        var title = _.getParamMap(window.location.hash).$title;
        if (!title)
          title = U.makeHeaderTitle(self.resource.get('davDisplayName'), pModel.displayName);
        var prms = {
          '-info': 'Please choose the answer', 
          $forResource: self.resource.get('_uri'), 
          $propA: 'question',
          $propB: 'answer',
          quiz: self.resource.get('quiz'),
          question: self.resource.get('_uri'),
//            user: G.currentUser._uri,
          $type: self.vocModel.properties['answers'].range,
          $title: self.resource.get('davDisplayName')
        };
        
        Events.trigger('navigate', U.makeMobileUrl('chooser', self.vocModel.properties['options'].range, prms), navOptions); //, {trigger: true, forceFetch: true});
        return;
      }

      // Setting values to TaWith does not work if this block is lower then next if()
      var p1 = params['$propA'];
      var p2 = params['$propB'];
      
      var t = type ? type : self.vocModel.type;
//      var self = this;
      Voc.getModels(t).then(function() {
        var type = t;
        var isIntersection = type ? U.isA(U.getModel(type), 'Intersection') : false;
        isImplementor = type && type.endsWith('system/designer/InterfaceImplementor');

        if (!isImplementor && parentView && parentView.mode == G.LISTMODES.CHOOSER) {
          if (!isIntersection  &&  (!p1  &&  !p2)) {
            debugger;
            Events.stopEvent(e);
            Events.trigger('chose', self.hashParams.$prop, self.model);
            return;
          }
        }
        
        var pModel = type ? U.getModel(type) : null;
        if (params  &&  type  &&   p1  &&  p2/*isIntersection*/) {
          Events.stopEvent(e);
          var rParams = {};
          var pRange = U.getModel(t).properties[p1].range;
          if (U.isAssignableFrom(self.vocModel, pRange)) {
            rParams[p1] = self.resource.get('_uri');
            rParams[p2] = params['$forResource'];
          }
          else {
            rParams[p1] = params['$forResource'];
            rParams[p2] = self.resource.get('_uri');
          }
          self.forResource = params['$forResource'];
          rParams.$title = self.resource.get('davDisplayName');
          if (self.doesModelSubclass(G.commonTypes.WebClass)) {
            if (type.endsWith('system/designer/InterfaceImplementor')) {
  //            Voc.getModels(type).done(function() {
                var m = new (U.getModel('InterfaceImplementor'))();
                var uri = self.resource.get('_uri');
                var props = {interfaceClass: uri, implementor: self.forResource};
                m.save(props, {
                  success: function() {
                    Events.trigger('navigate', U.makeMobileUrl('view', self.forResource), navOptions); //, {trigger: true, forceFetch: true});        
                  }
                });
  //            });
              return;
            }
            rParams[p2 + '.davClassUri'] =  self.resource.get('davClassUri');
          }
          else if (U.isAssignableFrom(pModel, 'model/study/QuizAnswer')) {
            var m = new pModel();
            m.save(rParams, {
              success: function() {
                Events.trigger('navigate', U.makeMobileUrl('view', self.forResource), navOptions); //, {trigger: true, forceFetch: true});        
              }
            });
            return;
          }
          
          Events.trigger('navigate', U.makeMobileUrl('make', type, rParams), navOptions); //, {trigger: true, forceFetch: true});
          return;
  //        self.router.navigate('make/' + encodeURIComponent(type) + '?' + p2 + '=' + encodeURIComponent(self.resource.get('_uri')) + '&' + p1 + '=' + encodeURIComponent(params['$forResource']) + '&' + p2 + '.davClassUri=' + encodeURIComponent(self.resource.get('davClassUri')) +'&$title=' + encodeURIComponent(self.resource.get('davDisplayName')), {trigger: true, forceFetch: true});
        }
        if (isImplementor  &&  self.resource.get('implementor.davClassUri').toLowerCase().indexOf('/' + G.currentApp.appPath.toLowerCase() + '/') != -1) {
          return G.getRejectedPromise();
        }
        if (isIntersection  &&  type.indexOf('/dev/') == -1) {
          var clonedI = cloned.Intersection;
          var a = clonedI.a;
          var b = clonedI.b;

          if (a  &&  b) {
            if (self.hashParams[a]) 
              Events.trigger('navigate', U.makeMobileUrl('view', self.resource.get(b)), navOptions); //, {trigger: true, forceFetch: true});
            else if (self.hashParams[b])
              Events.trigger('navigate', U.makeMobileUrl('view', self.resource.get(a)), navOptions); //, {trigger: true, forceFetch: true});
            else
              return G.getRejectedPromise();
//            else
//              Events.trigger('navigate', U.makeMobileUrl('view', self.resource.getUri())); //, {trigger: true, forceFetch: true});
              
            return;
          } 
        }
        return G.getRejectedPromise();        
      }).then (
        function success () {

        },
        function fail () {
          var m = U.getModel(t); 
          if (U.isAssignableFrom(m, "aspects/tags/Tag")) {
            var params = _.getParamMap(window.location.href);
            var app = params.application;
            var appModel;
            var tag = params['tagUses.tag.tag'];
            var tag = params['tags'];
            var tt = self.resource.get('tag') || U.getDisplayName(self.resource);
            if (app) {
              for (var p in params) {
                if (m.properties[p])
                  delete params[p];
              }
              params.$title = tt;
    //          params['tagUses.tag.tag'] = '*' + self.resource.get('tag') + '*';
    //              params['tagUses.tag.application'] = app;
            }
            else { //if (tag  ||  tags) {
              app = self._hashInfo.type;
//              app = decodeURIComponent(app.substring(0, idx));
            }
            
            if (app) {
              appModel = U.getModel(app);
              if (appModel) {
                var tagProp = U.getCloneOf(appModel, 'Taggable.tags');
                if (tagProp  &&  tt != '* Not Specified *') {
                  params[tagProp] = '*' + tt + '*';
        
                  Events.trigger('navigate', U.makeMobileUrl('list', app, params), navOptions);//, {trigger: true, forceFetch: true});
                  return;
                }
              }
            }
          }
          else if (U.isA(m, 'Reference')) {
            var forResource = U.getCloneOf(m, 'Reference.forResource')[0];
            var uri = forResource && self.resource.get(forResource);
            if (uri) {
              Events.trigger('navigate', U.makeMobileUrl('view', uri), navOptions); //, {trigger: true, forceFetch: true});
              return;
            }
          }
    
          var action = U.isAssignableFrom(m, "InterfaceImplementor") ? 'edit' : 'view';
          Events.trigger('navigate', U.makeMobileUrl(action, self.resource.getUri()), navOptions); //, {trigger: true, forceFetch: true});
    //          else {
    //            var r = _.getParamMap(window.location.href);
    //            this.router.navigate('view/' + encodeURIComponent(r[pr[0]]), {trigger: true, forceFetch: true});
    //          }
        }
      );      
    },

    recycleItemViews: function(views) {
      Array.prepend(this.itemViewCache, views);
    },
    
    getCachedItemView: function() {
      return this.itemViewCache.pop();
    },

    _onAddedResources: function(resources) {
      if (this._outOfData) {
        this._outOfData = false;
        if (this.mason) {
          this.unsetBrickLimit(); 
        }
      }
//      this.adjustSlidingWindow();
    },

//    _onUpdatedResources: function(resources) {
//      debugger;
//      var i = resources.length,
//          res,
//          childView;
//      
//      while (i--) {
//        res = resources[i];
//        childView = this.findChildByResource(res);
//        if (childView)
//          childView.refresh();
//      }
//      
////      this.refresh();
//    },
    
    _resetSlidingWindow: function() {
      debugger;
//      this._outOfData = false;
//      this._displayedRange.from = this._displayedRange.to = 0;
//      this.el.$empty();
//      this.adjustSlidingWindow();
    },

    setHorizontal: function() {
      debugger;
      this.options.horizontal = true;
    },
    
    setVertical: function() {
      debugger;
      this.options.horizontal = true;
    },
    
    render: function() {
      if (!this.rendered) {
        this.imageProperty = U.getImageProperty(this.collection);
//        var scrollbarId = this.options.scrollbar = this.getBodyId() + 'scrollbar',
//            scrollbarOptions = _.clone(this.getContainerBodyOptions());
////        ,
////            containerOptions = this.getContainerBodyOptions();
//        
////        containerOptions._id = containerOptions._id + 'scrollbar';
//        scrollbarOptions._id = scrollbarId;
//        this.html(this.scrollbarTemplate({
//          axis: this.options.horizontal ? 'x' : 'y',
//          id: scrollbarId
//        }));
//        
//        this.scrollbar = this.el.$('#' + scrollbarId)[0];
//        Physics.here.addBody(this.scrollbar, scrollbarId);
////        Physics.there.addBody('point', containerOptions, scrollbarId);
//        Physics.there.addBody('point', scrollbarOptions, scrollbarId);
        
        this.addToWorld(this.options);
//        Q.read(this.checkOffsetTop, this);
      }
      else 
        this.refresh();
    },
  
    checkOffsetTop: function() {
      if (this.el.offsetTop)
        this.invalidateSize();
      else
        Q.defer(1, 'read', this.checkOffsetTop, this);
    },
    
    /**
     * re-render the elements in the sliding window
     */
    refresh: function() {
      debugger;
    },
        
    /** 
    * shorten the dummy div below this page by this page's height/width (if there's a dummy div to shorten)
    * @param force - will add as much as it can, including a half page
    * @return a promise
    */
    _addBricks: function(from, to, force) {
      if (!this._currentAddBatch)
        this._currentAddBatch = [];
      
      if (!this._requestMoreTimePlaced)
        this._requestMoreTimePlaced = _.now();
      
      if (this._outOfData)
        to = Math.min(to, this.collection.length);
      
      if (from >= to) {
        if (this._outOfData) {
          this.log("1. BRICK LIMIT");
          this.setBrickLimit(this.collection.length);
        }
        else {
          debugger;
          this.mason['continue']();
        }
        
        return;
      }
      
      var self = this,
          col = this.collection,
          availableRange = col.getRange(),
          displayed = this._displayedRange,
          preRenderPromise;
      
      if (to > availableRange[1]) {
        if (force) {
          // settle for loading an incomplete page
          to = availableRange[1];
          if (form >= to) {
            // we're out of candy, no need to continue
            this.log("2. BRICK LIMIT");
            this.setBrickLimit(availableRange[1]);
            return;
          }
        }
        else {
//          if (this._outOfData) {
//            this.mason.setLimit(this.collection.length);
//            return;
//          }
          
//          var numToFetch = to - col.length,
//              fetchFrom = col.length, // + this._failedToRenderCount,
//              fetchTo = fetchFrom + numToFetch;
          
          return this.fetchResources(availableRange[1], to).then(this._addBricks.bind(this, from, to, force), this._addBricks.bind(this, from, to, true));
        }
      }
      else if (from < availableRange[0])
        return this.fetchResources(from, availableRange[0]).then(this._addBricks.bind(this, from, to, force), this._addBricks.bind(this, from, to, true));        
//      else if (availableRange[1] - availableRange[0] < (to - from) * 2)
      else if (availableRange[1] < to + this.options.bricksPerPage * this.options.minPagesInSlidingWindow)
        this.prefetch(this.options.bricksPerPage * this.options.minPagesInSlidingWindow);
      
      preRenderPromise = this.preRender(from, to);
      if (_.isPromise(preRenderPromise))
        return preRenderPromise.then(this._doAddBricks.bind(this, from, to));
      else
        return this._doAddBricks(from, to);
    },
    
//    _doAddBricks: function(from, to) {
////      Q.write(function() {
//        this._doAddBricksFoReal(from, to);
////      }, this);
//    },
      
    getBrickTagName: function() {
      return this._preinitializedItem.prototype.tagName || 'div';
    },
    
    _doAddBricks: function(from, to) {
      var self = this,
          el = this.el,
          childTagName = this.getBrickTagName(),
          displayed = this._displayedRange,
          atTheHead = from < displayed.from,
          col = this.collection,
          failed = [],
          childView;
      
      this.log("PAGER", "ADDING", to - from, "BRICKS AT THE", atTheHead ? "HEAD" : "TAIL", "FOR A TOTAL OF", this._displayedRange.to - this._displayedRange.from + to - from);

      for (var i = from; i < to - 1; i++) {
//        var res = col.models[i],
//            liView = this.renderItem(res, atTheHead);
        Q.write(this.renderItem, this, [col.models[i], atTheHead]);
      }
      
      Q.write(function() {
        this.renderItem(col.models[to - 1], atTheHead);
        this.postRender(from, to);
      }, this);

//      added.forEach(function(childView) {
//        childView.el.style.opacity = 0;
//        if (!childView.el.parentNode) {
//          // need to append right away, otherwise we can't figure out its size
//          el.appendChild(childView.el); // we don't care about its position in the list, as it's absolutely positioned
//        }
//  
////        DOM.queueRender(view.el, DOM.opaqueStyle);
//
////          Physics.here.once('render', childView.getBodyId(), function(childEl) {
////            childEl.style.opacity = 1;
////          });
//      });
//      
//      return this.postRender(from, to);
    },
    
    /**
     * Removes "pages" from the DOM and replaces the lost space by creating/padding a dummy div with the height/width of the removed section
     * The reason we keep dummy divs on both sides of the sliding window and not just at the top is to preserve the integrity of the scroll bar, which would otherwise revert back to 0 if you scrolled back up to the top of the page
     */
    _removeBricks: function(from, to) {
      if (from == to)
        return;
      
      var numToRemove = to - from,
          fromTheHead = from == this._displayedRange.from,
          childNodes = this._childEls,
          displayed = this._displayedRange,
          removedViews = [],
          i = fromTheHead ? 0 : childNodes.length - numToRemove,
          end = end = fromTheHead ? numToRemove : childNodes.length;

//      this.log("PAGER", "REMOVING", to - from, "BRICKS FROM THE", fromTheHead ? "HEAD" : "TAIL", "FOR A TOTAL OF", this._displayedRange.to - this._displayedRange.from - (to - from));
      for (; i < end; i++) {
        var childEl = childNodes[i],
            childView;

        if (childEl) {
          childView = this.children[childEl.dataset.viewid];
          if (childView)
            removedViews.push(childView);
          else
            debugger; // this should never happen...
        }
        else {
          debugger; // this should never happen...
        }
      }

//      this.collection.clearRange(from, to);
      this.log("REMOVING BRICK RANGE " + from + "-" + to); 
      this.doRemove(removedViews);
      if (fromTheHead) {
        Array.removeFromTo(this._childEls, 0, numToRemove);
//        displayed.from += removedViews.length;
      }
      else {
        this._childEls.length -= numToRemove;
//        displayed.to -= removedViews.length;
      }

      if (fromTheHead && this.collection.getRange().to - this._displayedRange.to < this.options.bricksPerPage * this.options.minPagesInSlidingWindow)
        this.prefetch(this.options.bricksPerPage * this.options.minPagesInSlidingWindow);
      
//      if (displayed.from > displayed.to) {
//        debugger;
//        displayed.from = displayed.to;
//      }
    },
    
    prefetch: function(num) {
      if (true)
        return;
      
      num = num || this.options.bricksPerPage * this.options.minPagesInSlidingWindow;
      var total = this.collection.getTotal(),
          availableRange = this.collection.getRange();
      
      if (total)
        num = Math.min(num, total - availableRange[1]);
      
      if (num) {
        this.log("Prophylactic prefetching: " + num + " bricks");
        this.fetchResources(availableRange[1], availableRange[1] + num);
      }
    },

    onResourceChanged: function(res) { // attach/detach when sliding window moves
      var itemView = this.findChildByResource(res);
      if (itemView) {
        itemView.render(); // or maybe remove and reappend?
        
//        this.adjustSlidingWindow();
        // expect an extra reflow here
      }
    },

//    getFakeNextPage: function(numResourcesToFetch) {
//      if (this._isPaging)
//        return this._pagingPromise;
//      
////      if (Math.random() < 0.5) {
////        return $.Deferred(function() {          
////          setTimeout(fetchResources)
////        });
////      }
//      
//      var models = [],
//          mock = this.collection.models[4] || this.collection.models[0],
//          uriBase = mock.getUri(),
//          defer = $.Deferred(function(defer) {
//            setTimeout(defer.resolve, 1000);
//          });
//          
//      for (var i = 0; i < numResourcesToFetch; i++) {
//        models.push(new mock.vocModel(_.defaults({
//          _uri: uriBase + G.nextId()
//        }, mock.toJSON())));
//      }
//      
//      this.collection.add(models);
//      this._isPaging = true;
//      this._pagingPromise = defer.promise().done(function() {
//        this._isPaging = false;
//      }.bind(this)); // if we fail to page, then keep isPaging true to prevent more paging
//      
//      return this._pagingPromise;
//    },

    doRemove: function(removedViews) {
      var i = removedViews.length,
          numLeft = this._childEls.length,
          numMax = this.options.maxBricks,
          numToRecycle = Math.min(numMax * 2 - numLeft, i),
          numYetToRecycle = numToRecycle,
//          ids = [],
          recycled = [],
          view;
      
//      this.log("REMOVED BRICKS: " + removedViews.map(function(b) { return parseInt(b.getBodyId().match(/\d+/)[0])}).sort(function(a, b) {return a - b}).join(","));
      while (i--) {
        view = removedViews[i];
        this.stopListening(view.resource);
        if (numYetToRecycle-- >= 0) {
          view.undelegateAllEvents();
//          DOM.queueRender(view.el, DOM.transparentStyle);
          recycled[recycled.length] = view;
        }
        else {
          Physics.here.removeBody(view.getBodyId());
          Q.write(view.destroy, view);
        }
        
//        ids.push(view.getBodyId());
      }

      if (recycled.length) {
        this.recycleItemViews(recycled);
//        this.log("RECYCLED BRICKS: " + recycled.map(function(b) { return parseInt(b.getBodyId().match(/\d+/)[0])}).sort(function(a, b) {return a - b}).join(","));
//        DOM.onNextRender(function() {
//          i = recycled.length;
//          while (i--) {
//            recycled[i].el.style.opacity = 0;
//          }
//        });        
      }
      
//      this.pageView._bodies = _.difference(this.pageView._bodies, ids); // TODO: unyuck the yuck
      this._numBricks -= removedViews.length;
    },
    
//    fetchResources: function(from, to) {
//      if (this._isPaging)
//        return this._pagingPromise;
//      
//      if (!this.collection.length)
//        return this.fetchResources1(0, 1).then(this.fetchResources.bind(this, from, to));
//      
//      var models = [],
//          mock = this.collection.models[Math.random() * this.collection.length | 0],
//          mockJSON = mock.toJSON(),
//          uriBase = mock.getUri(),
//          now = _.now();
//          
//      for (var i = 0; i < 100; i++) {
//        models.push(new mock.vocModel(_.defaults({
//          _uri: uriBase + G.nextId()
//        }, mockJSON)));
//      }
//      
//      console.log("MAKING 100 MODELS TOOK " + (_.now() - now | 0));
//      this.collection.add(models);
//      return G.getResolvedPromise();
//    },

    fetchResources: function(from, to) {
      if (this._isPaging)
        return this._pagingPromise;
      else if (this._outOfData)
        return G.getRejectedPromise();
      
      var self = this,
          col = this.collection,
          before = col.length,
          defer = $.Deferred(),
          firstFetchDfd = this.getPageView()._fetchDfd, // HACK
          nextPagePromise,
          nextPageUrl,
          limit = Math.max(to - from, this.options.minPagesInSlidingWindow * this.options.bricksPerPage, 10),
          pagingPromise;
      
      this._pageRequestTimePlaced = _.now();
      nextPagePromise = col.getNextPage({
        params: {
          $offset: from,
          $limit: limit
        },
        success: function() {
          if (col.length > before)
            defer.resolve();
          else {
            if (!nextPageUrl || !col.isFetching(nextPageUrl)) { // we've failed to fetch anything from the db, wait for the 2nd call to success/error after pinging the server
              // TODO: maybe we got results, but we happen to have already had them, because we had this list stored in a diff order. Complex case, because this means that we don't actually have the resources prior to this $offset
              self.log("couldn't get the next page for collection...");
              defer.reject();
            }
            else
              self.log("fetching more list items from the server...");
          }
        },
        error: function(col, resp, options) {
          switch (resp.code) {
            case 401:
              Events.trigger('req-login');
              return;
            default:
              if (!nextPageUrl || !col.isFetching(nextPageUrl))
                defer.reject();
              
              return;
          }
        }
      });
      
      if (nextPagePromise)
        nextPageUrl = nextPagePromise._url;
      
      this._isPaging = true;
      if (firstFetchDfd && firstFetchDfd.state() == 'pending')
        defer.promise().done(firstFetchDfd.resolve).fail(firstFetchDfd.resolve); // HACK
      
      pagingPromise = this._pagingPromise = defer.promise().always(function() {
        if (pagingPromise._canceled)
          return;
        
        if (!self._loadedFirstPage && !self.isStillLoading()) {
          self._loadedFirstPage = true;
          self.finish();
        }
        
        self._isPaging = false;
        if (defer.state() == 'rejected')
          self._outOfData = true;
        else {
          var time = _.now() - self._requestMoreTimePlaced | 0;
          self.log((col.length - before) + " bricks took " + time + "ms to fetch");
//          if (time > 500)
//            debugger;
          
          delete self._pageRequestTimePlaced;
        }
      }); 
      
      this._pagingPromise._range = 'from: ' + before + ', to: ' + (before + limit);
//      this.log("Fetching next page: " + this._pagingPromise._range);
      return this._pagingPromise;
    },
   
    setMode: function(mode) {
      if (!G.LISTMODES[mode])
        throw "this view doesn't have a mode " + mode;
      
      this.mode = mode;
    },

    getItemViewClass: function() {
      return this._itemClass;
    },
    
    preinitializeItem: function(res) {
      var vocModel = res.vocModel,
          params = {
            parentView: this,
            vocModel: vocModel
          },
          preinitializer = this.getItemViewClass();
          
//      while (preinitializer && !preinitializer.preinitialize) {
//        preinitializer = preinitializer.__super__.constructor;
//      }
        
      if (this.isEdit) {
        params.editCols = this.hashParams['$editCols']; 
        params.edit = true;
      }
      else if (this.isMultiValueChooser) {
        params.mv = true;
        params.tagName = 'div';
        if (G.isJQM()) {
          params.className = "ui-controlgroup-controls";
        }
        else {
          params.className = G.isTopcoat() ? "topcoat-list__item" : (G.isBootstrap() ? "list-group-item" : "");
        }
        params.mvProp = this.mvProp;
      }
      else {
        this._defaultSwatch = G.theme  &&  (G.theme.list  ||  G.theme.swatch);
      }
      
      return preinitializer.preinitialize(params);
    },
    
    renderItem: function(res, info) {
      var liView = this.doRenderItem(res, info);
      this.postRenderItem(liView);
      return liView;
    },
    
    doRenderItem: function(res, prepend) {
      var options,
          liView = this.getCachedItemView(),
          preinitializedItem;
      
      if (!this._initializeItemOptions) {
        this._initializeItemOptions = {
          delegateEvents: false
        };
      }
      
      options = this._initializeItemOptions;
      options.resource = res;
      options.el = null;
      
      if (!this._renderItemOptions)
        this._renderItemOptions = {};

      this._renderItemOptions.unlazifyImages = !this._scrollable;
      
      if (this.isMultiValueChooser) {
        options.checked = _.contains(this.mvVals, res.get('davDisplayName'));
      }
      else if (!this.isEdit) {
        options.swatch = res.get('swatch') || this._defaultSwatch;
      }
      
      if (liView) {
//        this.log("USING RECYCLED LIST ITEM: " + liView.getBodyId());
        liView.reset().initialize(options);
      }
      else {
        if (this._placeholders.length)
          options.el = this._placeholders.pop();
        
        if (this._itemTemplateElement) {
          if (!options.el)
            options.el = this._itemTemplateElement.cloneNode(true);
          else {
            var childNodes = this._itemTemplateElement.childNodes;
            for (var i = 0; i < childNodes.length; i++) {
              options.el.appendChild(childNodes[i].cloneNode(true));
            }
          }
        }
        
        preinitializedItem = this._preinitializedItem;
//        var now = _.now();
        liView = new preinitializedItem(options);
//        this.log("Creating a list item view took " + (_.now() - now));
//        this.log("CREATED NEW LIST ITEM: " + liView.getBodyId());
      }
            
      this.addChild(liView);
      liView.render(this._renderItemOptions);
      
      if (!this._itemTemplateElement && this.displayMode == 'masonry') // remove this when we change ResourceListItemView to update DOM instead of replace it
        this._itemTemplateElement = liView.el;
      
      return liView;
    },
    
    postRenderItem: function(liView) {
      liView.el.style.opacity = 0;
      if (!liView.el.parentNode) {
        // need to append right away, otherwise we can't figure out its size
        this.el.appendChild(liView.el); // we don't care about its position in the list, as it's absolutely positioned
      }
      
      this._currentAddBatch.push(liView);
    },
    
    preRender: function(from, to) {
      if (this._prerendered)
        return;
      
      // override me
      var self = this;
      var ranges = [];
      var first = this.collection.models[from];
      var vocModel = first.vocModel;
      var meta = vocModel.properties;
      if (!this._preinitializedItem)
        this._preinitializedItem = this.preinitializeItem(first);
      
      Q.write(this.addPlaceholders, this);
      if (U.isA(vocModel, 'Intersection')) {
        var ab = U.getCloneOf(vocModel, 'Intersection.a', 'Intersection.b'),
            a = ab['Intersection.a'],
            b = ab['Intersection.b'];
        
        if (a && !U.getModel(a = a[0]))
          ranges.push(meta[a].range);
        if (b && !U.getModel(b = b[0]))
          _.pushUniq(ranges, meta[b].range);
          
//        for (var i = from; i < to; i++) {
//          var resource = this.collection.models[i];
//          var range = model.properties[clonedI[side]].range;
//          var r = U.getLongUri1(range);
//          if (!U.getModel(r))
//            ranges.push(r);
//        }
        
        if (ranges.length) {
          return Voc.getModels(ranges).done(function() {
            self._prerendered = true;
          });
        }
      }
      
      this._prerendered = true;
    },
    
    addPlaceholders: function() {
      if (this._placeholders.length)
        return;
      
      var numBricks = this.displayMode == 'vanillaList' ? 
              (G.viewport.height / 50) * this.options.minPagesInSlidingWindow :
              (G.viewport.width * G.viewport.height / 100 / 100) * this.options.minPagesInSlidingWindow,
          tagName = this.getBrickTagName(),
          placeholder;

      numBricks = Math.max(10, numBricks) | 0;
      while (numBricks--) {
        placeholder = doc.createElement(tagName);
        placeholder.style.position = 'absolute';
        this.el.appendChild(placeholder);
        this._placeholders.push(placeholder);
      }
    },
    
    _updateSize: function() {
      var ot = this.el.offsetTop,
          ol = this.el.offsetLeft,
          w = this._width,
          h = this._height,
          viewport = G.viewport;
      
      this._offsetTop = ot;
      this._offsetLeft = ol;
      this._bounds[0] = this._bounds[1] = 0;
      this._outerHeight = this._height = this._bounds[3] = viewport.height - ot;
      this._outerWidth = this._width = this._bounds[2] = viewport.width - ol;
      if (ot != this._offsetTop || ol != this._offsetLeft || this._height != h || this._width != w) {
        return true;
      }
    },
    
    toBricks: function(views, options) {
      var bricks = [],
          brick,
          lockAxis = _.oppositeAxis(this._scrollAxis),
          view;
      
      for (var i = 0, l = views.length; i < l; i++) {
        view = views[i];
        view._updateSize();
        brick = view.buildViewBrick();
        brick.fixed = !options.flexigroup;
        bricks.push(brick);
      };
      
      return bricks;
    },

    postRender: function(from, to) {
      Q.read(this._doPostRender, this, [from, to]); // need to get new brick sizes
    },
    
    _doPostRender: function(from, to) {
//      if (this.stashed.length) {
//        Array.prepend(added, this.stashed);
//        this.stashed.length = 0;
//      }
      
      var atTheHead = from < this._displayedRange.from,
          childEls = this._childEls,
          addedEls = _.pluck(this._currentAddBatch, 'el'),
          bricks = this.toBricks(this._currentAddBatch, this.options),
          i = bricks.length,
//          bodies = this.pageView._bodies,
          displayed = this._displayedRange,
          view,
          id;
      
      while (i--) {
        view = this._currentAddBatch[i];
        this.listenTo(view.resource, 'change', this.onResourceChanged);
        this.listenTo(view.resource, 'saved', this.onResourceChanged);

        id = view.getBodyId();
//        bodies.push(id);
        Physics.here.addBody(view.el, id);
      }

      if (atTheHead)
        Array.prepend(childEls, addedEls);
      else
        childEls.push.apply(childEls, addedEls);

      this._currentAddBatch.length = 0;
      if (displayed.from == displayed.to) {
        displayed.from = from;
        displayed.to = to;
      }
      else {
        this._displayedRange.from = Math.min(this._displayedRange.from, from);
        this._displayedRange.to = Math.max(this._displayedRange.to, to);
      }
      
      this.log("New range: " + this._displayedRange.from + "-" + this._displayedRange.to);
      if (this._outOfData && this.collection.length == to) {
        this.log("3. BRICK LIMIT");
        this.mason.setLimit(this.collection.length);
      }

//      this.log("ADDING BRICK RANGE " + from + "-" + to + ": " + bricks.map(function(b) { return parseInt(b._id.match(/\d+/)[0])}).sort(function(a, b) {return a - b}).join(","));
      this.addBricksToWorld(bricks, atTheHead); // mason
      if (this._requestMoreTimePlaced) {
        this.log("Bricks took " + (_.now() - this._requestMoreTimePlaced) + " to retrieve");
        delete this._requestMoreTimePlaced;
      }
    },
    
    hasMasonry: function() {
      return this.type == 'masonry';
    }    
  }, {
    displayName: 'ResourceListView'
//      ,
//    _itemView: ResourceListItemView
  });
});
