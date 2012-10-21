
//Lablz.Type = (function () {
//	var loc = window.location.href;
//	return loc.substring(loc.lastIndexOf('/'));
//})();


// Router
var documentReadyCount = 0;
var AppRouter = Backbone.Router.extend({

  routes:{
      ":type":"list",
      "view/:type/:id":"view"
  },

  initialize:function () {
    $('#backButton').on('click', function(event) {
        window.history.back();
        return false;
    });
    this.firstPage = true;
  },
  
  list: function (type) {
    var model = Lablz.shortNameToModel[type];
    if (!model)
      return;
    
    var self = this;
    this.resList = new Lablz.ResourceList({model: model});
    this.resListPage = new Lablz.ListPage({model: this.resList});
    this.resList.fetch({
        add: false, 
        success: function() {
          self.changePage(self.resListPage);
        }
    });
  },

  view: function (type, id) {
    var self = this;
    var success = function(data) {
      self.changePage(new Lablz.ResourceView({model:data}));
    }
    
    if (this.resList) {
      success(this.resList.get(id));
      return this;
    }
    
    var typeCl = Lablz.shortNameToModel[type];
    if (!typeCl)
      return this;
        
		this.res = new typeCl({id: id});
//		this.resView = new Lablz.ResourceView({model:this.res}).render();
		this.res.fetch({success: success});
		
//		var success = function() {
//			app.showView('#content', self.resView);
//      if (self.res.lastFetchOrigin == 'server') {
//        setTimeout(function() {
//          Lablz.indexedDB.addItem(self.res);
//        }, 0);
//      }
//		};
//		
//		var error = function() {
//			var str = '';
//			for (var name in arguments) {
//				str += name + ' = ' + arguments[name] + "\n";
//			}
//			alert(str);
//		};
//		
//		if (!this.resList)
//			this.res.fetch({"success": success, "error": error});
//		else
//			success();
  },
  
  changePage: function(view) {
    console.log("change page: " + view.el.tagName + view.el.id);
    if (view == this.currentView) {
      console.log("Not replacing view with itself");
      return;
    }
    
    if (this.currentView)
        this.currentView.close();
  
//    $(selector).empty().append(view.render().el);
    $(view.el).attr('data-role', 'page');
    view.render();
    $('body').append($(view.el));
    this.currentView = view;
    var transition = $.mobile.defaultPageTransition;
    if (this.firstPage) {
      transition = 'none';
      this.firstPage = false;
    }
    
    $.mobile.changePage($(view.el), {changeHash:false, transition: transition});
    return view;
  },
	
	showView: function(selector, view) {
    if (view == this.currentView) {
      console.log("Not replacing view with itself");
      return;
    }
  
//      $("#backButton").show();
    if (this.currentView)
        this.currentView.close();
	
    //$(selector).empty().append(view.render().el);
    //view.render();
    this.currentView = view;
    return view;
  },
  
});

function init(success, error) {
  var type = window.location.hash.substring(1);
  if (type.indexOf("view") == 0) {
    var firstSlash = type.indexOf("/");
    var secondSlash = type.indexOf("/", firstSlash + 1);
    type = type.slice(firstSlash + 1, secondSlash);
  }
  else {
    var nonLetterIdx = type.search(/[^a-zA-Z]/);
    type = nonLetterIdx == -1 ? type : type.slice(0, nonLetterIdx);
  }
  
  Lablz.indexedDB.open(type, null, success, error);
}

//window.addEventListener("DOMContentLoaded", init, false);
//tpl.loadTemplates(['ListItem', 'View', 'Props', 'string', 'int', 'uri', 'image', 'date'], function() {
if (typeof jq != 'undefined')
  Backbone.setDomLibrary(jq);

$(document).ready(function () {
  console.log('document ready: ' + documentReadyCount++);
  init(
      function() {
        //console.log('document ready: ' + documentReadyCount);
        Lablz.initModels();
        app = new AppRouter();
        Backbone.history.start();
      },
      
      function(err) {
        console.log("failed to init app: " + err);
      }
  );
});


//    $.mobile.pushStateEnabled = false;
//});