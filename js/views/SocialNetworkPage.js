//'use strict';
define('views/SocialNetworkPage', [
  'globals',
  'utils',
  'events',
  'views/BasicPageView',
  'views/Header',
  'vocManager',
  'collections/ResourceList'
], function(G, U, Events, BasicPageView, Header, Voc, ResourceList) {
  var accessType = 'model/social/AccessForApplication';
  
  return BasicPageView.extend({
    _netUrls: {},
    initialize: function(options) {
      _.bindAll(this, 'click');
      this.constructor.__super__.initialize.apply(this, arguments);
      
      var self = this;
      Voc.getModels(accessType).done(function() {
        self._getAccessResources().always(self.refresh);
      });

      this.headerButtons = {
        back: true,
        menu: true,
        rightMenu: !G.currentUser.guest,
        login: G.currentUser.guest
      };
      
      this.addChild('header', new Header({
        viewId: this.cid,
        parentView: this,
        model: this.model
      }));

      this.makeTemplate('socialNetButtonTemplate', 'buttonTemplate');
      this.makeTemplate('socialNetworkPageTemplate', 'template');
    },
    
    _getAccessResources: function() {
      var self = this;
      return $.Deferred(function(defer) {        
        var accesses = self.socialAccesses = new ResourceList(null, {
          model: U.getModel(accessType),
          params: {
            contact: G.currentUser._uri
          }
        });
        
        if (G.currentUser.guest)
          return defer.reject();
        
        accesses.fetch({
          success: function() {
            defer.resolve();
          },
          error: function() {
            defer.reject(); 
          }
        });

        defer.promise().always(function() {
          _.each(['updated', 'added', 'reset'], function(event) {
            self.stopListening(accesses, event);
            self.listenTo(accesses, event, function() {
              self.refresh();
            });
          });
        });
      }).promise();      
    },
    
    events: {
      'click [data-role="button"]': 'click'
    },
    
    click: function(e) {
      Events.stopEvent(e);
      var btn = e.currentTarget,
          net = btn.dataset.net,
          url = this._netUrls[net];
      
      if (url) {
        window.location.href = url;
      }
      else {
        // not ready
      }
    },
    
    render: function() {
      var self = this;
      
      this.$el.html(this.template());
      this.assign('#headerDiv', this.header, {
        buttons: this.headerButtons
      });
      
      this.renderButtons();
      $('body').append(this.$el);
    },
    
    renderButtons: function() {
      var accesses = this.socialAccesses,
          self = this,
          counter = 0,
          btns = [],
          frag = document.createDocumentFragment();

      function getGridDiv() {
        return $('<div class="ui-grid-c"></div>');
      };
      
      _.each(G.socialNets, function(net, idx) {
        var btnInfo = {
          net: net.socialNet,
          icon: U.getSocialNetFontIcon(net.socialNet)
        };
        
        if (accesses) {
          var action,
              connected = accesses.where({
                socialNet: net.socialNet,
                connected: true
              }, true),
            
          action = connected ? 'Disconnect' : 'Connect';
          btnInfo.connected = connected;
          btnInfo.href = self._netUrls[net.socialNet] = U.buildSocialNetOAuthUrl(net, action); // sorted alphabetically
          btnInfo.linkText = action;
        }
        
        btns.push(btnInfo);
      });
      
      var style = {
        0: 'a',
        1: 'b',
        2: 'c'
      }
      
      while (btns.length) {
        var block = '';
        _.each(btns.slice(0, 3), function(btn, idx) {          
          btn['class'] = 'ui-block-' + style[idx];
          block += self.buttonTemplate(btn);
        });
        
        block = '<div class="ui-grid-b">{0}</div>'.format(block);
        U.addToFrag(frag, block);
        btns = btns.slice(3);
      }
      
      this.$('#socialButtons').html(frag).trigger('create');
    },

    refresh: function() {
      this.renderButtons();
    }    
  }, {
    displayName: 'SocialNetworkPage'
  });
});