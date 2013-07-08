//'use strict';
define('views/Header', [
  'globals',
  'events', 
  'utils',
  'vocManager',
  'views/BasicView'
//  ,
//  'views/BackButton',
//  'views/LoginButton',
//  'views/AddButton',
//  'views/MapItButton',
//  'views/AroundMeButton',
//  'views/MenuButton',
//  'views/PublishButton'
], function(G, Events, U, Voc, BasicView/*, BackButton, LoginButton, AddButton, MapItButton, AroundMeButton, MenuButton, PublishButton*/) {
  var SPECIAL_BUTTONS = ['enterTournament', 'forkMe', 'publish', 'doTry', 'testPlug', 'resetTemplate', 'installApp'];
  var commonTypes = G.commonTypes;
  return BasicView.extend({
    template: 'headerTemplate',
    initialize: function(options) {
      _.bindAll(this, 'render', /*'makeWidget', 'makeWidgets',*/ 'fileUpload', '_updateInfoErrorBar', 'checkErrorList', 'sendToCall');
      this.constructor.__super__.initialize.apply(this, arguments);
      options = options || {};
      _.extend(this, options);
      this.viewId = options.viewId;
      this.locationHref = window.location.hash;
      if (this.resource) {
        this.resource.on('change', function(res, options) {
//          G.log(this.TAG, 'events', 'change event received for', U.getDisplayName(this.resource));
          if (options && options.skipRefresh)
            return;
          
          this.refresh();
        }, this);
      }

      if (this.buttons)
        this.getButtonViews();
      
//      this.calcTitle();
      this.makeTemplate('errorListTemplate', 'errorListTemplate', this.modelType);
      this.makeTemplate('callInProgressHeaderTemplate', 'callInProgressHeaderTemplate', this.modelType);

      _.each(['info', 'error'], function(event) {
        var handler = this._updateInfoErrorBar;
        Events.off(event, handler);
        Events.on(event, handler);
      }.bind(this));

      this.autoFinish = false;
      this.isEdit = /^(edit|make)\//.test(this.hash);
      this.isChat = U.isChatPage();

      var self = this;
      if (!this.isChat) {
        Events.on('newRTCCall', function(call) {
          self.refresh();
        });
  
        Events.on('endRTCCall', function() {
          self.refresh();
        });
      }

      return this;
    },
    
    getButtonViews: function() {
      var res = this.resource;
      var vocModel = this.vocModel;
      var type = vocModel && vocModel.type;
      
//      _.extend(this, options);
      this.makeTemplate('headerErrorBar', 'headerErrorBar', type);
      this.makeTemplate(this.template, 'template', type);
      this.makeTemplate('fileUpload', 'fileUploadTemplate', type);
      this.info = this.hashParams['-info'];
      
      var buttons = this.buttons;
      if (!this.hash.startsWith('chat') && res && _.any(_.values(_.pick(commonTypes, 'App', 'Handler', 'Jst')), function(type) { return U.isAssignableFrom(res.vocModel, type); })) {
        buttons.publish = true;
      }
      
      if (this.hash.startsWith('chooser')  &&  U.isAssignableFrom(this.vocModel, G.commonTypes.WebClass)) {
        buttons.publish = true;
      }
      var btnOptions = {
        model: this.model, 
        parentView: this,
        viewId: this.viewId
      };
      
      var reqdButtons = [];
      buttons = U.filterObj(buttons, function(key, val) {
        return val;
      });
      
      for (var btn in buttons) {
        btn = btn.camelize(true); // capitalize first letter
        reqdButtons.push('views/{0}Button'.format(btn));
      }
      
      this.buttonViews = {};
      this.readyDfd = $.Deferred();
      this.ready = this.readyDfd.promise();
      U.require(reqdButtons, function() {
        var btns = arguments;
        var i = 0;
        for (var btn in buttons) {
          var model = arguments[i++];
          this.buttonViews[btn] = this.buttonViews[btn] || this.addChild(btn + 'BtnView', new model(btnOptions));
        }
        
        this.readyDfd.resolve();
      }.bind(this));
    },
    
    checkErrorList: function(e) {
      var $errList = this.$('#errList');
      var errList = $errList[0];
      if (errList && errList.children.length <= 1)
        this.$('#headerErrorBar').html("");
    },

    _updateInfoErrorBar: function(options) {
      options = options || {};
      var res = options.resource, col = options.collection;
      if ((res && res !== this.model) || (col && col !== this.model))
        return;

      var page = options.page;
      if (page && !this.isPageView(page))
        return;
      
//      if (typeof options === 'string') {
//        this.renderError({error: options});
//        return;
//      }

      var error = options.error;
      if (options.errors) {
        error = this.errorListTemplate({
          errors: options.errors
        });
      }
      
      this.renderError(_.extend({
        error: error,
        info: options.info,
        withIcon: false
      }, _.omit(options, 'errors')));
    },
    
    calcTitle: function() {
      if (typeof this.pageTitle !== 'undefined') {
        this.title = this.pageTitle;
        return this;
      }
      
      // only use hash the first time
      var hash = this.hash = this.hash || window.location.hash; 
      hash = hash && hash.slice(1);
      var res = this.model;
      var title;
      if (hash && G.tabs) {
        var decHash = decodeURIComponent(hash);
        var matches = _.filter(G.tabs, function(t) {
          return t.hash == hash || decodeURIComponent(t.hash) == decHash
        });
        
        if (matches.length)
          title = matches[0].title;
      }
      
      if (!title) {
        if (hash) {
          title = this.hashParams.$title;
//          title = params.$title  &&  title.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/, ":").replace(/&nbsp;/g, " ");
        }

        if (!title && res) {
          if (U.isCollection(res)) 
            title = U.getPlural(res);
          else {
            title = U.getDisplayName(res);
            if (hash  &&  hash.indexOf('make/') == 0) {
//              title = this.pageTitle;
            }
            else {
              title = U.isAssignableFrom(this.vocModel, "Contact") ? title : U.makeHeaderTitle(this.vocModel['displayName'], title);
//              this.pageTitle = this.vocModel['displayName'] + ": " + this.pageTitle;
            }
          }
        }
      }
      
      this.title = title;
      return this;
    },
    events: {
      'change #fileUpload'        : 'fileUpload',
      'click #categories'         : 'showCategories',
      'click #moreRanges'         : 'showMoreRanges',
      'click #backToCall'         : 'backToCall',
      'click #hangUp'             : 'hangUp',
//      'click #installApp'         : 'installApp',
      'click #sendToCall'         : 'sendToCall'
    },
    
    fileUpload: function(e) {
      Events.stopEvent(e);      
      debugger;
      $('#fileUpload').attr('action', G.serverName + '/mkresource');
//      var returnUri = $('$returnUri');
//      if (returnUri) {
//        var fn = $(':file').value;
//        var idx = fn.lastIndexOf('/');
//        $('$returnUri').attr('value', returnUri + '&originalImage=' + encodeURIComponent(G.pageRoot + '/wf/' + params['$location']) + fn.slice(idx));
//      }
      document.forms["fileUpload"].submit();
      /*
      $.ajax({
        url     : G.serverName + '/mkresource',
        type    : 'POST',
        enctype: 'multipart/form-data',
        data    : $('#fileUpload').serialize(),
        success : function( data ) {
           alert('Submitted');
        },
        error   : function( xhr, err ) {
           alert('Error');     
        }
      });
      */    

    },
    showMoreRanges: function(e) {
      Events.stopEvent(e);
      if (this.hashParams['$more']) {
        delete this.hashParams['$more']; 
        this.hashParams['$less'] = 'y'; 
      }
      else {
        delete this.hashParams['$less']; 
        this.hashParams['$more'] = 'y'; 
      }
      this.router.navigate(U.makeMobileUrl('chooser', this.vocModel.type, this.hashParams), {trigger: true, replace: true, forceFetch: true});
    },
    showCategories: function(e) {
      Events.stopEvent(e);
      var self = this;
      Voc.getModels("aspects/tags/Tag").done(function() {
//        var options = U.getParamMap(self.locationHref);
//        var uri = U.makeMobileUrl('list', U.getModel("Tag").type, _.extend({application: self.vocModel.type, $title: "Categories"}, options));
        var uri = U.makeMobileUrl('list', U.getModel("Tag").type, {application: self.vocModel.type, $title: "Categories"}); //, $orderBy: "tagUsesCount", $asc: "-1"});
        self.router.navigate(uri, {trigger: true, replace: true, forceFetch: true});
      }).fail(function() {
        self.router.navigate(U.makeMobileUrl('list', self.vocModel.type));
      });
    },
    
    refresh: function() {
      this.refreshCallInProgressHeader();
      this.refreshTitle();
      this.calcSpecialButtons();
      this.renderSpecialButtons();
      this.error = null;
      this.renderError();
      return this;
    },
    
    render: function(options) {
      options = options || {};
      if (!this.buttons || options.buttons) {
        this.buttons = options.buttons;
        this.isGeo = _.size(_.pick(this.buttons, 'mapIt', 'aroundMe'));
        this.getButtonViews();
      }
        
      var args = arguments;
      this.ready.done(function() {
        this.renderHelper.apply(this, args);
        this.finish();
      }.bind(this)); 
    },

    refreshCallInProgressHeader: function() {
      var cip = G.callInProgress;
      var $cipDiv = this.parentView.$('div#callInProgress');
      if (!cip || window.location.href == cip.url) {
        $cipDiv.html("");
        return;
      }
      
      $cipDiv.html(this.callInProgressHeaderTemplate(cip));
      (function pulse(){
        if (!G.callInProgress)
          return;
        
        $cipDiv.delay(250).fadeTo('slow', 0.9).delay(250).fadeTo('slow', 1,  pulse);
      })();
      (function anime(){
        if (!G.callInProgress) 
          return;
        $cipDiv.css({marginTop: '-42px'});
        $cipDiv.animate({marginTop: '+=42px'}, 2000); //.delay(5000).animate({marginTop: '-42px'}, 1, anime);
      })();
      
//      $cipDiv.find('#backToCall').css('cursor', 'pointer').click(function() {
//        window.location.href = $('a', this).attr('href');
//      });
    },

    backToCall: function(e) {
      Events.stopEvent(e);
      var cip = G.callInProgress,
          url = cip.url,
          hashIdx = url.indexOf('#'),
          path = url.slice(0, hashIdx),
          hash = url.slice(hashIdx + 1);
          
      if (window.location.href.startsWith(path))
        Events.trigger('navigate', hash);
      else
        window.location.href = url;
    },

    hangUp: function(e) {
      Events.trigger('hangUp');
    },

    sendToCall: function(e) {
      Events.stopEvent(e);
      if (this.resource) {
        Events.trigger('messageForCall:resource', {
          _uri: this.resource.getUri(),
          displayName: U.getDisplayName(this.resource)
        });
      }
      else {
        Events.trigger('messageForCall:list', {
          title: this.getPageTitle(),
          hash: this.hash
        }); 
      }
    },

    refreshTitle: function() {
      this.calcTitle();
      this.$('#pageTitle').html(this.title);
    },

    calcSpecialButtons: function() {
      var commonTypes = G.commonTypes,
          res = this.resource,
          self = this;
      
      if (this.isEdit || this.isChat)
        return;

      _.each(SPECIAL_BUTTONS, function(btnName) {
        this[btnName] = false;
      }.bind(this));
      
      if (res  &&  !this.isAbout) {
//        if (this.isEdit && this.vocModel.type === G.commonTypes.Jst) {
//          var tName = res.get('templateName');
//          this.resetTemplate = tName && this.getOriginalTemplate(tName);
//        }
      
        var user = G.currentUser._uri;
        if (U.isAssignableFrom(this.vocModel, commonTypes.App)) {
          var appOwner = U.getLongUri1(res.get('creator') || user);
          var lastPublished = res.get('lastPublished');
          if ((user == appOwner || U.isUserInRole(U.getUserRole(), 'admin', res))  &&  (!lastPublished || (lastPublished  &&  res.get('lastModifiedWebClass') > lastPublished)))
            this.publish = true;
          
          var noWebClasses = !res.get('lastModifiedWebClass')  &&  res.get('dashboard') != null  &&  res.get('dashboard').indexOf('http') == 0;
          var wasPublished = res.get('lastModifiedWebClass') < res.get('lastPublished');
          if (/*res.getUri()  != G.currentApp._uri  &&  */ (noWebClasses ||  wasPublished)) {
            this.doTry = true;
            this.forkMe = true;
          }
          
          if (G.inFirefoxOS && navigator.mozApps) {
            debugger;
            var appSelf = navigator.mozApps.getSelf();
            appSelf.onerror = function() {
              debugger;
              self.installApp = true;
            };
            
            appSelf.onsuccess = function() {
              debugger;
            };
          }
        }

        else if (!G.currentUser.guest) {
          if (U.isAssignableFrom(this.vocModel, commonTypes.Handler)) {
//          var plugOwner = U.getLongUri1(res.get('submittedBy') || user);
//          if (user == plugOwner)
            if (!this.resource.isNew())
              this.testPlug = true;            
          }
          else {
            if (U.isAssignableFrom(this.vocModel, U.getLongUri1("media/publishing/Video"))  &&  this.hashParams['-tournament'])
              this.enterTournament = true;
          }
        }
      }
    },
    
    renderSpecialButtons: function() {
      if (this.isEdit || this.isChat)
        return;
      
      _.each(SPECIAL_BUTTONS, function(btn) {
        this.$('#{0}Btn'.format(btn)).html("").hide();
      }.bind(this));
      
      var pBtn = this.buttonViews.publish;
      if (this.publish) {
        this.assign('div#publishBtn', pBtn);
        this.$('div#publishBtn').show();
      }
      else if (pBtn) {
        this.$('div#publishBtn').hide();
        var options = SPECIAL_BUTTONS.slice().remove('publish');
        _.each(options, function(option) {
          var method = 'hide';
          if (this[option]) {
            this.assign('div#{0}Btn'.format(option), pBtn, _.pick(this, option));
            method = 'show';
          }
          
          this.$('#{0}Btn'.format(option))[method]();
        }.bind(this));
      }
      
      var hash = window.location.hash;
      var isChooser =  hash  &&  hash.indexOf('#chooser/') == 0;
      if (isChooser  &&  U.isAssignableFrom(this.vocModel, "Image")) {
        var forResource = this.hashParams['forResource'];
        var location = this.hashParams['$location'];
        var returnUri = this.hashParams['$returnUri'];
        var pr = this.hashParams['$prop'];
        if (forResource  &&  location  &&  pr) {
          var type = U.getTypeUri(forResource);      
          var cModel = U.getModel(type);
          var self = this;
          if (!cModel) {
            Voc.getModels(type).done(function() {
              cModel = U.getModel(type);
              if (cModel  &&  !cModel.properties[pr].readOnly) {
                var frag = document.createDocumentFragment();
                var rules = ' data-formEl="true"';
                U.addToFrag(frag, self.fileUploadTemplate({name: pr, forResource: forResource, rules: rules, type: type, location: location, returnUri: returnUri }));
                self.$el.append(frag);
              }
            });
          }
          else {
            var frag = document.createDocumentFragment();
            var rules = ' data-formEl="true"';
            U.addToFrag(frag, self.fileUploadTemplate({name: pr, forResource: forResource, rules: rules, type: type, location: location }));
            self.$el.append(frag);
          }
          
        }
      }
      
//      if (!this.publish  &&  !this.doTry  &&  !this.forkMe  &&  !this.testPlug  &&  !this.enterTournament  && ) 
      if (!_.any(SPECIAL_BUTTONS, function(b) { return this[b]; }.bind(this)))
        this.noButtons = true;      
    },
    
    renderError: function(options) {
      var errDiv = this.$('#headerErrorBar');
      errDiv.html("");
      
      options = options || {};
      var error = options.error;
      if (!error) {
        error = this.resource && this.resource.get('_error');
        if (error)
          error = error.details;
        else
          error = this.error;
      }
      
      var info = options.info || this.info;
      if (error == null && info == null)
        return this;
      
      var length = Math.max(error ? error.length : 0, info ? info.length : 0);
      errDiv.html(this.headerErrorBar({error: error, info: info, withIcon: options.withIcon !== false}));
      errDiv.trigger('create');
      errDiv.show();
      this.error = null;
      this.info = null;
      this.$('#errList').find('.closeparent').click(this.checkErrorList);
      
      var persistByDefault = !!(this.hashParams['-info'] || this.hashParams['-errMsg']);
      if (options.persist === false || (_.isUndefined(options.persist) && !persistByDefault)) {
        setTimeout(function() {        
          $(errDiv).fadeOut(2000, function() {
            errDiv.html("");
          });
        }, length * 80);
      }
      
      return this;
    },
    
    renderHelper: function() {
      if (window.location.hash.indexOf("#menu") != -1)
        return this;

      var res = this.resource; // undefined, if this is a header for a collection view
      var error = res && res.get('_error');
      if (error)
        this.error = error.details;

      this.calcSpecialButtons();
      if (this.rendered)
        this.$el.html("");
      
      if (U.isAssignableFrom(this.vocModel, G.commonTypes.App) && !res)
        this.categories = true;
      else if (!res) {
        var hash = window.location.hash;
        var isChooser =  hash  &&  hash.indexOf('#chooser/') == 0;
        if (isChooser  &&  U.isAssignableFrom(this.vocModel, commonTypes.WebClass)  &&  this.hashParams['$prop'] == 'range') { 
          this.moreRanges = true;
          if (this.hashParams['$more'])
            this.moreRangesTitle = 'Less ranges';
          else
            this.moreRangesTitle = 'More ranges';
        }
      }

      if (!this.publish  &&  this.doTry  &&  this.forkMe)
        this.$el.html(this.template({className: 'ui-grid-b'}));
      else
        this.$el.html(this.template());

      this.refreshTitle();
//      this.$el.prevObject.attr('data-title', this.pageTitle);
//      this.$el.prevObject.attr('data-theme', G.theme.list);
      this.pageView.$el.attr('data-title', this.pageTitle);
      this.pageView.$el.attr('data-theme', G.theme.list);
      var frag = document.createDocumentFragment();
      var btns = this.buttonViews;
      var numBtns = _.size(btns);
      var isMapItToggleable = !!this.collection;
      var btnNames = ['menu', 'back', 'mapIt', 'aroundMe', 'add', 'video', 'chat', 'login'];
      if (numBtns < 6)
        btnNames.push('rightMenu');
      else
        btnNames.splice(1, 0, 'rightMenu');
      _.each(btnNames, function(btnName) {
        var btn = btns[btnName];
        if (!btn)
          return;
        
        var btnOptions = {};
        if (btnName === 'mapIt') {
//          this.isGeo = this.isGeo && this.collection && _.any(this.collection.models, function(m) {  return !_.isUndefined(m.get('latitude')) || !_.isUndefined(m.get('shapeJson'));  });
          if (!this.isGeo)
            return;
          
          btnOptions.toggleable = isMapItToggleable;
        }
         
        frag.appendChild(btn.render(_.extend({force: true}, btnOptions)).el);        
      }.bind(this));      
      
      var $ul = this.$('#headerUl');
      $ul.html(frag);
      
      this.renderError();
      this.renderSpecialButtons();
      
      this.$el.trigger('create');
      if (this.isEdit  ||  this.isChat  ||  this.noButtons) {
        this.$el.find('#headerButtons').attr('class', 'hidden');
//        
      }
      if (!this.noButtons  &&  !this.categories  &&  !this.moreRanges) {
        this.$el.find('#name').removeClass('resTitle');
        if (this.resource) {
          var pt = this.$el.find('#pageTitle');
          if (pt) {
            pt.css('padding-bottom', '4px');
            pt.css('border-bottom', '1px solid rgba(255,255,255,0.5)');
          }
        }
        /* this.$el.find('#pageTitle').css('margin-bottom', '0px'); */
      }
      if (this.noButtons) 
        this.$el.find('h4').css('margin-top', '10px');
      else
        this.$el.find('h4').css('margin-top', '4px');
      // HACK
      // this hack is to fix loss of ui-bar-... class loss on header subdiv when going from masonry view to single resource view 
      var header = this.$('.ui-header');
      var barClass = 'ui-bar-{0}'.format(G.theme.header);
      if (!header.hasClass(barClass))
        header.addClass(barClass);
      
      // END HACK
      
      this.refreshCallInProgressHeader();
      this.finish();
      return this;
    }
  },
  {
    displayName: 'Header'
  });
});
