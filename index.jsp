<div>
<!-- Attributions>
  Font Awesome - http://fortawesome.github.com/Font-Awesome
</Attributions-->

<!-- Templates -->
<script type="text/template" id="resource-list">
  <div id="headerDiv"></div>
  <div id="mapHolder" data-role="none"></div>
  <div id="sidebarDiv" class="ui-content" data-role="content" role="main">
    <ul id="sidebar" data-role="listview" class="ui-listview" data-theme="c">
    </ul>
    <div id="nabs_grid" class="masonry">
    </div>
  </div>
  
  <div data-role="footer" class="ui-footer ui-bar-c" data-position="fixed" data-tap-toggle="false">
     <a id="homeBtn" target="#" class="icon home">Home</a>
     <!-- nextPage button removed after endless page introduction
     <a id="nextPage" target="#" class="icon next ui-btn-right">Next</a>
     --> 
  </div>
</script>  

<script type="text/template" id="resource">
  <div id="headerDiv"></div>
  <div id="resourceViewHolder" data-role="content">
    <div id="resourceImage"></div><br/>
    <ul data-role="listview" data-theme="c" id="resourceView" class="action-list" data-inset="true">
    </ul>
  </div>

  <div data-role="footer" data-position="fixed" data-tap-toggle="false">
     <a id="homeBtn" target="#" class="icon home">Home</a>
     <!--a id="edit" target="#" class="icon next ui-btn-right">Edit</a-->
  </div>
</script>  

<script type="text/template" id="stringPT">
  <span>{{= value }}</span>
</script>

<script type="text/template" id="emailPT">
  <a href="mailto:{{= value }}">{{= value }}</a>
</script>

<script type="text/template" id="emailPET">
  <span><input class="email" value="{{= value }}" /></span>
</script>

<script type="text/template" id="UrlPT">
  <a href="{{= value.href }}">{{= value.linkText }}</a>
</script>

<script type="text/template" id="UrlPET">
  <span><input value="{{= value.href }}" /></span>
</script>

<script type="text/template" id="telPT">
  <a href="tel:{{= value }}">{{= value }}</a>
</script>

<script type="text/template" id="telPET">
  <span><input class="tel" value="{{= value }}" /></span>
</script>

<script type="text/template" id="datePT">
    <span>{{= Utils.getFormattedDate(value) }}</span>
</script>
<!--script type="text/template" id="datePT">
    <span>{{= new Date(value / 1000) }}</span>
</script -->

<script type="text/template" id="datePET">
  <span><input value="{{= new Date(value / 1000) }}" /></span>
</script>

<script type="text/template" id="booleanPT">
  <span>{{= value }}</span>
</script>

<script type="text/template" id="intPT">
  <span>{{= value }}</span>
</script>

<script type="text/template" id="floatPT">
  <span>{{= value }}</span>
</script>

<script type="text/template" id="doublePT">
  <span>{{= value }}</span>
</script>

<script type="text/template" id="moneyPT">
  <span>{{= value.currency + value.value }}</span>
</script>

<script type="text/template" id="durationPT">
  <span>{{= typeof displayName != 'undefined' ? displayName : Utils.getFormattedDate(value) }}</span>
</script>

<script type="text/template" id="complexDatePT">
  <span>{{= typeof displayName != 'undefined' ? displayName : Utils.getFormattedDate(value) }}</span>
</script>

<script type="text/template" id="resourcePT">
  <span><a href="{{= Lablz.pageRoot + '#view/' + encodeURIComponent(value) }}">{{= typeof displayName == 'undefined' ? value : displayName }}</a></span>
</script>

<!--script type="text/template" id="mapItemTemplate">
<span><a href="{{= Lablz.pageRoot + '#view/' + encodeURIComponent(value) }}">{{= typeof displayName == 'undefined' ? value : displayName }} {{= image ? '<br />' + image : '' }} </a></span>
</script-->

<script type="text/template" id="mapItemTemplate">
  <ul style="list-style-type:none">
    <li><span><a href="{{= (Lablz.pageRoot + '#view/' + encodeURIComponent(uri)) }}"> {{= resourceLink }} </a></span></li>
    {{ _.forEach(rows, function(val, key) { }} 
      <li>{{= key }}: {{= val.value }}</li>
    {{ }); }}
    {{ if (typeof image != 'undefined') { }}
    <span><a href="{{= Lablz.pageRoot + '#view/' + encodeURIComponent(uri) }}"> {{= image ? '<br />' + image : '' }} </a></span>
    {{ } }}
  </ul>
</script>

<script type="text/template" id="imagePT">
  <img src="{{= value }}"></img>
</script>

<script type="text/template" id="listItemTemplate">
  <a href = "{{= Lablz.pageRoot + '#view/' + encodeURIComponent(_uri) }}"><img align="middle" src="{{= typeof mediumImage != 'undefined' ? (mediumImage.indexOf('/Image') == 0 ? mediumImage.slice(6) : mediumImage) : typeof featured != 'undefined' ? (featured.indexOf('Image/') == 0 ? featured.slice(6) : featured) : 'icons/blank.png'}}" /><h3>{{= davDisplayName }}</h3></a>
</script>

<script type="text/template" id="listItemTemplateNoImage">
  <a href = "{{= Lablz.pageRoot + '#view/' + encodeURIComponent(_uri) }}"><h3>{{= davDisplayName }}</h3></a>
</script>

<script type="text/template" id="propRowTemplate">
   <li>{{= name }}<div style="float: right; font-weight: normal;">{{= value }}</div></li>
</script>

<script type="text/template" id="propRowTemplate2">
   <li>{{= name }}<div style="font-weight: normal;">{{= value }}</div></li>
</script>

<script type="text/template" id="propGroupsDividerTemplate">
   <li data-role="list-divider">{{= value }}</li>
</script>

<!--script type="text/template" id="viewTemplate">
	<div>
		{{ for (var name in props) { }} 
			{{ if (props.hasOwnProperty(name)) { }}
				<div class="propRow">{{ name }}: {{ props[name] }}</div>
			{{ } }}
		{{ } }}
	</div>
</script-->

<script type="text/template" id="mapItButtonTemplate">
  <a id="mapIt" target="#" data-role="button" data-icon="map" class="icon next">Map It</a>
</script>

<script type="text/template" id="mapTemplate">
  <div id="map" class="map" data-role="none"></div>
</script>

<script type="text/template" id="backButtonTemplate">
  <a id="back" target="#" data-role="button" data-icon="back" class="back">Back</a>
</script>

<script type="text/template" id="logoutButtonTemplate">
  <a id="logout" data-role="button" data-icon="logout" class="icon next" href="{{= 'j_security_check?j_signout=true&amp;returnUri=' + encodeURIComponent(window.location.href) }}">Logout</a>
</script>

<script type="text/template" id="aroundMeButtonTemplate">
  <a id="aroundMe" target="#" data-role="button" class="icon next">Around Me</a>
</script>

<script type="text/template" id="headerTemplate">
  <div id="header" data-role="header" class="ui-header ui-bar-c" role="banner" data-position="fixed" data-tap-toggle="false">
    <div data-role="controlgroup" data-type="horizontal" id="headerLeft" class="ui-btn-left"></div>
    <div id="errMsg"></div>
    <h1 id="pageTitle">{{= this.pageTitle }}</h1>
    <div data-role="controlgroup" data-type="horizontal" id="headerRight" class="ui-btn-right"></div>
  </div>
</script>


<!--script type="text/template" id="resourceEdit">
<div id="headerDiv"></div>
<div id="resourceEditView" data-role="content">
  <form data-ajax="false" action="#">
    <ul data-role="listview" data-theme="c" id="resourceEditView" class="action-list" data-inset="true"></ul>
    <button id="save" target="#" class="ui-btn-left">Save</button>
    <button id="cancel" target="#" class="ui-btn-right">Cancel</button>
  </form>
</div>

<div data-role="footer">
   <a target="#welcome" class="icon home">Home</a>
</div>
</script-->  

<!--script type="text/template" id="stringPET">
<label for="{{= shortName }}">{{= name }}</label>
<span><input id="{{= shortName }}" value="{{= value }}" /></span>
</script-->

<script type="text/template" id="loginTemplate">
  <authenticateByFacebook mobile="y" />
</script>

<script type="text/template" id="masonry-mod-list-item">
  <div class="nab nabBoard masonry-brick" style="cursor: default" id="uri0">
    <div class="anab">
      <div class="galleryItem_css3">
        <a href="{{= typeof rUri == 'undefined' ? 'about:blank' : rUri }}">
          <img border="0" src="{{= typeof resourceMediumImage == 'undefined' ? 'icons/blank.png' : resourceMediumImage }}"></img>
        </a>
      </div>
    </div>
    <table width="100%" class="modP">
      <tr>
        <td class="urbien" width="1%">
          <a href="{{= modifiedBy }}">
            <img border="0" src="{{= typeof v_modifiedByPhoto != 'undefined' ? v_modifiedByPhoto : icons/blank.png }}"></img>
          </a>
        </td>
        <td>
          <span class="action">{{= typeof v_action == 'undefined' ? '' : v_action }}</span>&#160;
          <div id="resourceHolder"><a href="{{= rUri }}" class="pLink">Healthy living</a></div>
          <br/><br/>&#160;
          <span class="commentListDate">{{= Utils.getFormattedDate(dateModified) }}</span>
        </td>
      </tr>
    </table>
    <table width="100%">
      <tr>
      <td colspan="2">
        <div class="lc">
          <div id="buttons">
          {{ if (typeof v_showCommentsFor != 'undefined') { }}
            <a class="lc" href="{{= 'mkResource.html?type=http://www.hudsonfog.com/voc/model/portal/Comment&amp;-commentList=y&amp;bUri=sql%3furi%3d' +  encodeURIComponent(v_showCommentsFor) }}">
              <img src="http://public.urbien.com/icons/comment.png" title="Comment"></img>
            </a>&#160;&#160;
          {{ } }}
            <a class="lc" href="{{= 'mkResource.html?.vote=Like&-changeInplace=y&type=http://www.hudsonfog.com/voc/aspects/tags/Vote&bUri=http://urbien.com/sql%3furi%3d' + encodeURIComponent(v_showCommentsFor) }}"> 
              <img src="http://public.urbien.com/icons/like.png" title="Like"></img>
            </a>&#160;&#160;&#160;
            <a class='renab' href="nabit?-inPage=y&originalImageUrl=http://urbien.com/wf/ThirtyDayTrial/240BAA89D9A398AEC2A359D2BCCEA7A9/thumbnail/app-as-dragon-on-the-data-gold.jpg_featured.jpg&sourceUrl=http://urbien.com/sql/www.hudsonfog.com/voc/commerce/urbien/ThirtyDayTrial%3fid%3d41118">
              <img src="http://s3.amazonaws.com/public.urbien.com/icons/pin1.png" />Nab
            </a>
          </div>
        </div>
      </td>
      </tr>
    </table>
  </div>
</script>

</div>

