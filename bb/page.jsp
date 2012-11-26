<!DOCTYPE HTML>
<html class="ui-mobile">
<head>
  <base href="serverName" />
  <title>Backbone Cellar</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0"></meta>
  <link rel="stylesheet" href="lib/jquery.mobile-1.2.0.css" />
  <link rel="stylesheet" href="lib/jquery.mobile.theme-1.2.0.css" />
  <link rel="stylesheet" href="lib/jquery.mobile.structure-1.2.0.css" />
  <!--link rel="stylesheet" href="lib/jqm-icon-pack-2.1.2-fa.css" /-->
  <link rel="stylesheet" href="styles/styles.css"></link>
  <!--script src="http://jsconsole.com/remote.js?39EE1D1C-F93F-40DC-8E4B-28FD49EFC687"></script-->
  <script src="lib/jquery-1.7.2.js"></script>
  <script src="js/jqm-config.js"></script>
  <script src="lib/jquery.mobile-1.2.0.js"></script>
  <script src="lib/underscore.js"></script>
  <!--script> 
   _.templateSettings = {
          interpolate : /\{\{([\s\S]+?)\}\}/g
     };
  </script-->
  
  <script>
  //replaced with solution from here: http://stackoverflow.com/questions/10597480/boolean-checks-in-underscore-templates   
//  _.templateSettings = {
//          evaluate:    /\{\{(.+?)\}\}/g,          
//          interpolate : /\{\{([\s\S]+?)\}\}/g,
//          escape: /\{\{-(.+?)\}\}/g
//      };
  _.templateSettings = {
      evaluate:    /\{\{(.+?)\}\}/g,
      interpolate: /\{\{=(.+?)\}\}/g
  };
  </script>
  <script src="lib/backbone.js"></script>
  <script src="lib/IndexedDBShim.min.js"></script>
  <!-- LEAFLET -->
  <link rel="stylesheet" type="text/css" href="styles/leaflet/leaflet.css" />
  <link rel="stylesheet" type="text/css" href="styles/leaflet/MarkerCluster.Default.css" />
  <script src="leaflet.js"></script>
  <script src="leaflet.markercluster.js"></script>
  <script src="maps.js"></script>
  <!-- END LEAFLET -->
  
  <script src="js/utils.js"></script>   
  <script src="js/base.js"></script>   
  <backboneInitInfo />
  <!-- FETCH MODELS -->
  <!--script>
    var initModels = ["BasketballCourt","Borough"];
  </script-->
  <!-- END FETCH MODELS -->
  <script src="js/views.js"></script>   
  <script src="js/main.js"></script>   
     
</head>
<body class="ui-mobile-viewport ui-overlay-c">
	<file />

<!-- JavaScript -->

</body>
</html>
