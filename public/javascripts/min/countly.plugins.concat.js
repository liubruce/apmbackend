;window.MobileDashboardView = countlyView.extend({
    selectedView:"#draw-total-sessions",
    initialize:function () {
        this.curMap = "map-list-sessions";
        this.template = Handlebars.compile($("#dashboard-template").html());
    },
    beforeRender: function() {
        this.maps = {
            "map-list-sessions": {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"},
            "map-list-users": {id:'total', label:jQuery.i18n.map["sidebar.analytics.users"], type:'number', metric:"u"},
            "map-list-new": {id:'total', label:jQuery.i18n.map["common.table.new-users"], type:'number', metric:"n"}
        };
		return $.when(countlyUser.initialize(), countlyCarrier.initialize(), countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("users"), countlyTotalUsers.initialize("countries")).then(function () {});
    },
    afterRender: function() {
        if(countlyGlobal["config"].use_google){
            var self = this;
            countlyLocation.drawGeoChart({height:290, metric:self.maps[self.curMap]});
        }
    },
    pageScript:function () {
        $("#total-user-estimate-ind").on("click", function() {
            CountlyHelpers.alert($("#total-user-estimate-exp").html(), "black");
        });

        $(".widget-content .inner").click(function () {
            $(".big-numbers").removeClass("active");
            $(".big-numbers .select").removeClass("selected");
            $(this).parent(".big-numbers").addClass("active");
            $(this).find('.select').addClass("selected");
        });

        $(".bar-inner").on({
            mouseenter:function () {
                var number = $(this).parent().next();

                number.text($(this).data("item"));
                number.css({"color":$(this).css("background-color")});
            },
            mouseleave:function () {
                var number = $(this).parent().next();

                number.text(number.data("item"));
                number.css({"color":$(this).parent().find(".bar-inner:first-child").css("background-color")});
            }
        });

        var self = this;
        $(".big-numbers .inner").click(function () {
            var elID = $(this).find('.select').attr("id");

            if (self.selectedView == "#" + elID) {
                return true;
            }

            self.selectedView = "#" + elID;
            self.drawGraph();
        });
        
        if(countlyGlobal["config"].use_google){
            this.countryList();
            $(".map-list .cly-button-group .icon-button").click(function(){
                $(".map-list .cly-button-group .icon-button").removeClass("active");
                $(this).addClass("active");
                self.curMap = $(this).attr("id");
                countlyLocation.refreshGeoChart(self.maps[self.curMap]);
                self.countryList();
            });
        }

        app.localize();
    },
    drawGraph:function() {
        var sessionDP = {};

        switch (this.selectedView) {
            case "#draw-total-users":
                sessionDP = countlySession.getUserDPActive();
                break;
            case "#draw-new-users":
                sessionDP = countlySession.getUserDPNew();
                break;
            case "#draw-total-sessions":
                sessionDP = countlySession.getSessionDPTotal();
                break;
            case "#draw-time-spent":
                sessionDP = countlySession.getDurationDPAvg();
                break;
            case "#draw-total-time-spent":
                sessionDP = countlySession.getDurationDP();
                break;
            case "#draw-avg-events-served":
                sessionDP = countlySession.getEventsDPAvg();
                break;
        }

        _.defer(function () {
            countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
        });
    },
    renderCommon:function (isRefresh, isDateChange) {
        var sessionData = countlySession.getSessionData(),
            locationData = countlyLocation.getLocationData({maxCountries:10}),
            sessionDP = countlySession.getSessionDPTotal();

        this.locationData = locationData;
        sessionData["page-title"] = countlyCommon.getDateRange();
        sessionData["usage"] = [
            {
                "title":jQuery.i18n.map["common.total-sessions"],
                "material-icon": "timeline",
                "data":sessionData.usage['total-sessions'],
                "id":"draw-total-sessions",
                "help":"dashboard.total-sessions"
            },
            {
                "title":jQuery.i18n.map["common.total-users"],
                "ion-icon": "ion-person-stalker",
                "data":sessionData.usage['total-users'],
                "id":"draw-total-users",
                "help":"dashboard.total-users"
            },
            {
                "title":jQuery.i18n.map["common.new-users"],
                "ion-icon": "ion-person-add",
                "data":sessionData.usage['new-users'],
                "id":"draw-new-users",
                "help":"dashboard.new-users"
            },
            {
                "title":jQuery.i18n.map["dashboard.time-spent"],
                "ion-icon": "ion-android-time",
                "data":sessionData.usage['total-duration'],
                "id":"draw-total-time-spent",
                "help":"dashboard.total-time-spent"
            },
            {
                "title":jQuery.i18n.map["dashboard.avg-time-spent"],
                "material-icon": "timelapse",
                "data":sessionData.usage['avg-duration-per-session'],
                "id":"draw-time-spent",
                "help":"dashboard.avg-time-spent2"
            },
            {
                "title":jQuery.i18n.map["dashboard.avg-reqs-received"],
                "material-icon": "compare_arrows",
                "data":sessionData.usage['avg-events'],
                "id":"draw-avg-events-served",
                "help":"dashboard.avg-reqs-received"
            }
        ];
        sessionData["bars"] = [
            {
                "title":jQuery.i18n.map["common.bar.top-platform"],
                "data":countlyDeviceDetails.getPlatformBars(),
                "help":"dashboard.top-platforms"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-resolution"],
                "data":countlyDeviceDetails.getResolutionBars(),
                "help":"dashboard.top-resolutions"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-carrier"],
                "data":countlyCarrier.getCarrierBars(),
                "help":"dashboard.top-carriers"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-users"],
                "data":countlySession.getTopUserBars(),
                "help":"dashboard.top-users"
            }
        ];

        this.templateData = sessionData;

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if(!countlyGlobal["config"].use_google){
                $(".map-list.geo-switch").hide();
            }
            $(this.selectedView).parents(".big-numbers").addClass("active");
            this.pageScript();

            if (!isDateChange) {
                this.drawGraph();
            }
        }
        if(!countlyGlobal["config"].use_google){
            this.countryTable(isRefresh);
        }
    },
    restart:function () {
        this.refresh(true);
    },
    refresh:function (isFromIdle) {

        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
            $(".widget-header .title").replaceWith(newPage.find(".widget-header .title"));

            $("#big-numbers-container").find(".big-numbers").each(function(i, el) {
                var newEl = $(newPage.find("#big-numbers-container .big-numbers")[i]);

                if (isFromIdle) {
                    $(el).find(".number").replaceWith(newEl.find(".number"));
                } else {
                    var currNumberEl = $(el).find(".number .value"),
                        currNumberVal = parseFloat(currNumberEl.text()) || 0,
                        currNumPost = currNumberEl.text().replace(currNumberVal, ''),
                        targetValue = parseFloat(newEl.find(".number .value").text()),
                        targetPost = newEl.find(".number .value").text().replace(targetValue, '');

                    if (targetValue != currNumberVal) {
                        if (targetValue < currNumberVal || (targetPost.length && targetPost != currNumPost)) {
                            $(el).find(".number").replaceWith(newEl.find(".number"));
                        } else {
                            jQuery({someValue: currNumberVal, currEl: currNumberEl}).animate({someValue: targetValue}, {
                                duration: 2000,
                                easing:'easeInOutQuint',
                                step: function() {
                                    if ((targetValue + "").indexOf(".") == -1) {
                                        this.currEl.text(Math.round(this.someValue) + targetPost);
                                    } else {
                                        this.currEl.text(parseFloat((this.someValue).toFixed(1)) + targetPost);
                                    }
                                }
                            });
                        }
                    }
                }

                $(el).find(".trend").replaceWith(newEl.find(".trend"));
                $(el).find(".spark").replaceWith(newEl.find(".spark"));
            });

            self.drawGraph();

            $(".usparkline").peity("bar", { width:"100%", height:"30", colour:"#6BB96E", strokeColour:"#6BB96E", strokeWidth:2 });
            $(".dsparkline").peity("bar", { width:"100%", height:"30", colour:"#C94C4C", strokeColour:"#C94C4C", strokeWidth:2 });

            if (newPage.find("#map-list-right").length == 0) {
                $("#map-list-right").remove();
            }

            if ($("#map-list-right").length) {
                $("#map-list-right").replaceWith(newPage.find("#map-list-right"));
            } else {
                $(".widget.map-list").prepend(newPage.find("#map-list-right"));
            }

            self.pageScript();
        });
    },
    countryList:function(){
        var self = this;
        $("#map-list-right").empty();
        var country;
        for(var i = 0; i < self.locationData.length; i++){
            country = self.locationData[i];
            $("#map-list-right").append('<div class="map-list-item">'+
                '<div class="flag" style="background-image:url(\''+countlyGlobal["cdn"]+'images/flags/'+country.code+'.png\');"></div>'+
                '<div class="country-name">'+country.country+'</div>'+
                '<div class="total">'+country[self.maps[self.curMap].metric]+'</div>'+
            '</div>');
        }
    },
    countryTable:function(refresh){
        var self = this;
        if(!refresh){
            $(".map-list").after('<table id="countries-alternative" class="d-table help-zone-vb" cellpadding="0" cellspacing="0"></table>');
            this.country_dtable = $('#countries-alternative').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": self.locationData,
                "iDisplayLength": 10,
                "aoColumns": [
                        { "mData": "country_flag", "sType":"string", "sTitle": jQuery.i18n.map["countries.table.country"]},
                        { "mData": "t", "sType":"numeric", "sTitle": jQuery.i18n.map["allapps.total-sessions"]},
                        { "mData": "u", "sType":"numeric", "sTitle": jQuery.i18n.map["allapps.total-users"]},
                        { "mData": "n", "sType":"numeric", "sTitle": jQuery.i18n.map["allapps.new-users"]},
                        
                    ]
            }));
            this.country_dtable.stickyTableHeaders();
            this.country_dtable.fnSort( [ [1,'desc'] ] );
            $("#countries-alternative_wrapper .dataTable-top .search-table-data").hide();
            $("#countries-alternative_wrapper .dataTable-top .save-table-data").hide();
            $("#countries-alternative_wrapper .dataTable-top .dataTables_paginate").hide();
            $("#countries-alternative_wrapper .dataTable-top .DTTT_container").hide();
            $("#countries-alternative_wrapper .dataTable-top").append("<div style='font:13px Ubuntu,Helvetica,sans-serif; color:#636363; text-shadow:0 1px #F6F6F6; margin-right:10px; padding: 10px; float: right;'><a href='#/analytics/countries'>"+jQuery.i18n.map["common.go-to-countries"]+"&nbsp;&nbsp;&nbsp;<i class='fa fa-chevron-right' aria-hidden='true'></i></a></div>");
            $("#countries-alternative_wrapper .dataTable-top").append("<div style='font:15px Ubuntu,Helvetica,sans-serif; color:#636363; text-shadow:0 1px #F6F6F6; letter-spacing:-1px; margin-left:10px; margin-top: 8px; text-transform: uppercase;'>"+jQuery.i18n.map["sidebar.analytics.countries"]+"</div>");
        }
        else{
            CountlyHelpers.refreshTable(self.country_dtable, countlyLocation.getLocationData({maxCountries:10}));
        }
    },
    destroy:function () {
        $("#content-top").html("");
    }
});

app.addAppType("mobile", MobileDashboardView);

$( document ).ready(function() {
    var menu = '<a href="#/all" id="allapps-menu" class="item analytics">'+
		'<div class="logo ion-android-apps"></div>'+
		'<div class="text" data-localize="mobile.allapps.title"></div>'+
	'</a>';
	$('#mobile-type a').first().before(menu);
    
    menu = '<a href="#/analytics/platforms" class="item">'+
		'<div class="logo platforms"></div>'+
		'<div class="text" data-localize="sidebar.analytics.platforms"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/carriers" class="item">'+
		'<div class="logo carrier"></div>'+
		'<div class="text" data-localize="sidebar.analytics.carriers"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/versions" class="item">'+
		'<div class="logo app-versions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.app-versions"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/resolutions" class="item">'+
		'<div class="logo resolutions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.resolutions"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/devices" class="item">'+
		'<div class="logo devices"></div>'+
		'<div class="text" data-localize="sidebar.analytics.devices"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/countries" class="item">'+
		'<div class="logo country"></div>'+
		'<div class="text" data-localize="sidebar.analytics.countries"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/sessions" class="item">'+
		'<div class="logo sessions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.sessions"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').prepend(menu);
    
	menu = '<a href="#/analytics/users" class="item">'+
		'<div class="logo users"></div>'+
		'<div class="text" data-localize="sidebar.analytics.users"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').prepend(menu);
    
    $("#mobile-type #engagement-menu").show();
    
    menu =      '<a href="#/analytics/loyalty" class="item">' +
                    '<div class="logo loyalty"></div>' +
                    '<div class="text" data-localize="sidebar.analytics.user-loyalty"></div>' +
                '</a>' +
                '<a href="#/analytics/frequency" class="item">' +
                    '<div class="logo frequency"></div>' +
                    '<div class="text" data-localize="sidebar.analytics.session-frequency"></div>' +
                '</a>' +
                '<a href="#/analytics/durations" class="item">' +
                    '<div class="logo durations"></div>' +
                    '<div class="text" data-localize="sidebar.engagement.durations"></div>' +
                '</a>';
	$('#mobile-type #engagement-submenu').append(menu);
    
    
});;(function (countlyWebDashboard, $, undefined) {

    //Private Properties
    var _users = [],
        _appId = "";

    //Public Methods
    countlyWebDashboard.initialize = function () {
        if(_appId != countlyCommon.ACTIVE_APP_ID){
            countlyWebDashboard.reset();
            _appId = countlyCommon.ACTIVE_APP_ID;
        }
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_PARTS.data.r,
			data:{
				"api_key":countlyGlobal.member.api_key,
				"app_id":countlyCommon.ACTIVE_APP_ID,
				"method":"latest_users"
			},
			dataType:"jsonp",
			success:function (json) {
				_users = json;
			}
		});
    };
    
    countlyWebDashboard.refresh = countlyWebDashboard.initialize;
    
    countlyWebDashboard.reset = function(){
        _users = [];
    };
    
    countlyWebDashboard.getLatestUsers = function(){
        return _users;
    };
	
}(window.countlyWebDashboard = window.countlyWebDashboard || {}, jQuery));;window.WebDashboardView = countlyView.extend({
    selectedView:"#draw-total-sessions",
    initialize:function () {
        this.curMap = "map-list-sessions";
        this.template = Handlebars.compile($("#dashboard-template").html());
    },
    beforeRender: function() {
        this.maps = {
            "map-list-sessions": {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"},
            "map-list-users": {id:'total', label:jQuery.i18n.map["sidebar.analytics.users"], type:'number', metric:"u"},
            "map-list-new": {id:'total', label:jQuery.i18n.map["common.table.new-users"], type:'number', metric:"n"}
        };
        var defs = [countlyUser.initialize(), countlyDeviceDetails.initialize(), countlyWebDashboard.initialize(), countlyTotalUsers.initialize("users"), countlyTotalUsers.initialize("countries")];
        if(typeof window.countlyBrowser != "undefined")
            defs.push(countlyBrowser.initialize());
        if(typeof window.countlySources != "undefined")
            defs.push(countlySources.initialize());
        
		return $.when.apply($, defs).then(function () {});
    },
    afterRender: function() {
        if(countlyGlobal["config"].use_google){
            var self = this;
            countlyLocation.drawGeoChart({height:290, metric:self.maps[self.curMap]});
        }
    },
    pageScript:function () {
        $("#total-user-estimate-ind").on("click", function() {
            CountlyHelpers.alert($("#total-user-estimate-exp").html(), "black");
        });

        $(".widget-content .inner").click(function () {
            $(".big-numbers").removeClass("active");
            $(".big-numbers .select").removeClass("selected");
            $(this).parent(".big-numbers").addClass("active");
            $(this).find('.select').addClass("selected");
        });

        $(".bar-inner").on({
            mouseenter:function () {
                var number = $(this).parent().next();

                number.text($(this).data("item"));
                number.css({"color":$(this).css("background-color")});
            },
            mouseleave:function () {
                var number = $(this).parent().next();

                number.text(number.data("item"));
                number.css({"color":$(this).parent().find(".bar-inner:first-child").css("background-color")});
            }
        });

        var self = this;
        $(".big-numbers .inner").click(function () {
            var elID = $(this).find('.select').attr("id");

            if (self.selectedView == "#" + elID) {
                return true;
            }

            self.selectedView = "#" + elID;
            self.drawGraph();
        });
        
        if(countlyGlobal["config"].use_google){
            this.countryList();
            $(".map-list .cly-button-group .icon-button").click(function(){
                $(".map-list .cly-button-group .icon-button").removeClass("active");
                $(this).addClass("active");
                self.curMap = $(this).attr("id");
                countlyLocation.refreshGeoChart(self.maps[self.curMap]);
                self.countryList();
            });
        }

        app.localize();
    },
    drawGraph:function() {
        var sessionDP = {};

        switch (this.selectedView) {
            case "#draw-total-users":
                sessionDP = countlySession.getUserDPActive();
                break;
            case "#draw-new-users":
                sessionDP = countlySession.getUserDPNew();
                break;
            case "#draw-total-sessions":
                sessionDP = countlySession.getSessionDPTotal();
                break;
            case "#draw-time-spent":
                sessionDP = countlySession.getDurationDPAvg();
                break;
            case "#draw-total-time-spent":
                sessionDP = countlySession.getDurationDP();
                break;
            case "#draw-avg-events-served":
                sessionDP = countlySession.getEventsDPAvg();
                break;
        }

        _.defer(function () {
            countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
        });
    },
    renderCommon:function (isRefresh, isDateChange) {
        var sessionData = countlySession.getSessionData(),
            locationData = countlyLocation.getLocationData({maxCountries:7}),
            sessionDP = countlySession.getSessionDPTotal();

        this.locationData = locationData;
        sessionData["page-title"] = countlyCommon.getDateRange();
        sessionData["usage"] = [
            {
                "title":jQuery.i18n.map["common.total-sessions"],
                "material-icon": "timeline",
                "data":sessionData.usage['total-sessions'],
                "id":"draw-total-sessions",
                "help":"dashboard.total-sessions"
            },
            {
                "title":jQuery.i18n.map["common.total-users"],
                "ion-icon": "ion-person-stalker",
                "data":sessionData.usage['total-users'],
                "id":"draw-total-users",
                "help":"dashboard.total-users"
            },
            {
                "title":jQuery.i18n.map["common.new-users"],
                "ion-icon": "ion-person-add",
                "data":sessionData.usage['new-users'],
                "id":"draw-new-users",
                "help":"dashboard.new-users"
            },
            {
                "title":jQuery.i18n.map["dashboard.time-spent"],
                "ion-icon": "ion-android-time",
                "data":sessionData.usage['total-duration'],
                "id":"draw-total-time-spent",
                "help":"dashboard.total-time-spent"
            },
            {
                "title":jQuery.i18n.map["dashboard.avg-time-spent"],
                "material-icon": "timelapse",
                "data":sessionData.usage['avg-duration-per-session'],
                "id":"draw-time-spent",
                "help":"dashboard.avg-time-spent2"
            },
            {
                "title":jQuery.i18n.map["dashboard.avg-reqs-received"],
                "material-icon": "compare_arrows",
                "data":sessionData.usage['avg-events'],
                "id":"draw-avg-events-served",
                "help":"dashboard.avg-reqs-received"
            }
        ];
        sessionData["bars"] = [
            {
                "title":jQuery.i18n.map["common.bar.top-platform"],
                "data":countlyDeviceDetails.getPlatformBars(),
                "help":"dashboard.top-platforms"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-sources"],
                "data":(typeof countlySources != "undefined") ? countlySources.getBars() : [],
                "help":"dashboard.top-sources"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-browsers"],
                "data":(typeof countlyBrowser != "undefined") ? countlyBrowser.getBars() : [],
                "help":"dashboard.top-browsers"
            },
            {
                "title":jQuery.i18n.map["common.bar.top-users"],
                "data":countlySession.getTopUserBars(),
                "help":"dashboard.top-users"
            }
        ];

        this.templateData = sessionData;

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if(!countlyGlobal["config"].use_google){
                $(".map-list.geo-switch").hide();
            }
            $(".map-list").after('<table id="last-visitors" class="d-table help-zone-vb" cellpadding="0" cellspacing="0"></table>');
            var users = countlyWebDashboard.getLatestUsers();
            var sort = 3;
            var columns = [
				{ "mData": function(row){var c = (!row["cc"]) ? "Unknown" : row["cc"]; if(c != "Unknown") c = '<div class="flag" style="background-image: url(images/flags/'+ c.toLowerCase() + '.png);"></div>'+c; if(row["cty"] != "Unknown") c += " ("+row["cty"]+")"; return c;}, "sType":"string", "sTitle": jQuery.i18n.map["countries.table.country"], "bSortable":false },
                { "mData": function(row){return (!row["p"]) ? jQuery.i18n.map["common.unknown"] : row["p"]}, "sType":"string", "sTitle": jQuery.i18n.map["platforms.table.platform"] , "bSortable":false }
            ];
            
            if(users[0] && users[0].brw){
                columns.push({ "mData": function(row){return (!row["brw"]) ? jQuery.i18n.map["common.unknown"] : row["brw"]}, "sType":"string", "sTitle": jQuery.i18n.map["web.browser"] , "bSortable":false });
                sort++;
            }
            
            if(users[0] && users[0].lv){
                columns.push({ "mData": function(row){return (!row["lv"]) ? jQuery.i18n.map["common.unknown"] : row["lv"]}, "sType":"string", "sTitle": jQuery.i18n.map["web.views.view"] , "bSortable":false, "sClass": "break web-20" });
                sort++;
            }
            
            if(users[0] && users[0].src){
                columns.push({ "mData": function(row){if(!row["src"]) return jQuery.i18n.map["common.unknown"]; else if(row["src"].indexOf("http") == 0) return "<a href='"+row["src"]+"' target='_blank'>"+((typeof countlySources != "undefined") ? countlySources.getSourceName(row["src"]) : row["src"])+"</a>"; else return (typeof countlySources != "undefined") ? countlySources.getSourceName(row["src"]) : row["src"];}, "sType":"string", "sTitle": jQuery.i18n.map["web.from-source"] , "bSortable":false, "sClass": "break web-20" });
                sort++;
            }
            
            columns.push({ "mData": function(row){return (!row["sc"]) ? 0 : row["sc"]}, "sType":"numeric", "sTitle": jQuery.i18n.map["web.total-sessions"] , "bSortable":false },
				{ "mData": function(row, type){if(type == "display") return (row["ls"]) ? countlyCommon.formatTimeAgo(row["ls"]) : jQuery.i18n.map["web.never"]; else return (row["ls"]) ? row["ls"] : 0;}, "sType":"numeric", "sTitle": jQuery.i18n.map["web.last-seen"] , "bSortable":false },
				{ "mData": function(row){return countlyCommon.formatTime((row["tsd"]) ? parseInt(row["tsd"]) : 0);}, "sType":"numeric", "sTitle": jQuery.i18n.map["web.time-spent"], "bSortable":false });
            
            this.latestdtable = $('#last-visitors').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": users,
                "iDisplayLength": 10,
                "aoColumns": columns
            }));
			this.latestdtable.stickyTableHeaders();
            this.latestdtable.fnSort( [ [sort,'desc'] ] );
            $("#last-visitors_wrapper .dataTable-top .search-table-data").hide();
            $("#last-visitors_wrapper .dataTable-top .save-table-data").hide();
            $("#last-visitors_wrapper .dataTable-top").append("<div style='font:15px Ubuntu,Helvetica,sans-serif; color:#636363; text-shadow:0 1px #F6F6F6; letter-spacing:-1px; margin-left:10px; margin-top: 8px; text-transform: uppercase;'>"+jQuery.i18n.map["web.latest-visitors"]+"</div>");
            
            $(this.selectedView).parents(".big-numbers").addClass("active");
            this.pageScript();

            if (!isDateChange) {
                this.drawGraph();
            }
        }
        if(!countlyGlobal["config"].use_google){
            this.countryTable(isRefresh);
        }
    },
    restart:function () {
        this.refresh(true);
    },
    refresh:function (isFromIdle) {

        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            
            CountlyHelpers.refreshTable(self.latestdtable, countlyWebDashboard.getLatestUsers());

            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
            $(".widget-header .title").replaceWith(newPage.find(".widget-header .title"));

            $("#big-numbers-container").find(".big-numbers").each(function(i, el) {
                var newEl = $(newPage.find("#big-numbers-container .big-numbers")[i]);

                if (isFromIdle) {
                    $(el).find(".number").replaceWith(newEl.find(".number"));
                } else {
                    var currNumberEl = $(el).find(".number .value"),
                        currNumberVal = parseFloat(currNumberEl.text()) || 0,
                        currNumPost = currNumberEl.text().replace(currNumberVal, ''),
                        targetValue = parseFloat(newEl.find(".number .value").text()),
                        targetPost = newEl.find(".number .value").text().replace(targetValue, '');

                    if (targetValue != currNumberVal) {
                        if (targetValue < currNumberVal || (targetPost.length && targetPost != currNumPost)) {
                            $(el).find(".number").replaceWith(newEl.find(".number"));
                        } else {
                            jQuery({someValue: currNumberVal, currEl: currNumberEl}).animate({someValue: targetValue}, {
                                duration: 2000,
                                easing:'easeInOutQuint',
                                step: function() {
                                    if ((targetValue + "").indexOf(".") == -1) {
                                        this.currEl.text(Math.round(this.someValue) + targetPost);
                                    } else {
                                        this.currEl.text(parseFloat((this.someValue).toFixed(1)) + targetPost);
                                    }
                                }
                            });
                        }
                    }
                }

                $(el).find(".trend").replaceWith(newEl.find(".trend"));
                $(el).find(".spark").replaceWith(newEl.find(".spark"));
            });

            self.drawGraph();

            $(".usparkline").peity("bar", { width:"100%", height:"30", colour:"#6BB96E", strokeColour:"#6BB96E", strokeWidth:2 });
            $(".dsparkline").peity("bar", { width:"100%", height:"30", colour:"#C94C4C", strokeColour:"#C94C4C", strokeWidth:2 });

            if (newPage.find("#map-list-right").length == 0) {
                $("#map-list-right").remove();
            }

            if ($("#map-list-right").length) {
                $("#map-list-right").replaceWith(newPage.find("#map-list-right"));
            } else {
                $(".widget.map-list").prepend(newPage.find("#map-list-right"));
            }

            self.pageScript();
        });
    },
    countryList:function(){
        var self = this;
        $("#map-list-right").empty();
        var country;
        for(var i = 0; i < self.locationData.length; i++){
            country = self.locationData[i];
            $("#map-list-right").append('<div class="map-list-item">'+
                '<div class="flag" style="background-image:url(\''+countlyGlobal["cdn"]+'images/flags/'+country.code+'.png\');"></div>'+
                '<div class="country-name">'+country.country+'</div>'+
                '<div class="total">'+country[self.maps[self.curMap].metric]+'</div>'+
            '</div>');
        }
    },
    countryTable:function(refresh){
        var self = this;
        if(!refresh){
            $(".map-list").after('<table id="countries-alternative" class="d-table help-zone-vb" cellpadding="0" cellspacing="0"></table>');
            this.country_dtable = $('#countries-alternative').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": self.locationData,
                "iDisplayLength": 10,
                "aoColumns": [
                        { "mData": "country_flag", "sType":"string", "sTitle": jQuery.i18n.map["countries.table.country"]},
                        { "mData": "t", "sType":"numeric", "sTitle": jQuery.i18n.map["allapps.total-sessions"]},
                        { "mData": "u", "sType":"numeric", "sTitle": jQuery.i18n.map["allapps.total-users"]},
                        { "mData": "n", "sType":"numeric", "sTitle": jQuery.i18n.map["allapps.new-users"]},
                        
                    ]
            }));
            this.country_dtable.stickyTableHeaders();
            this.country_dtable.fnSort( [ [1,'desc'] ] );
            $("#countries-alternative_wrapper .dataTable-top .search-table-data").hide();
            $("#countries-alternative_wrapper .dataTable-top .save-table-data").hide();
            $("#countries-alternative_wrapper .dataTable-top .dataTables_paginate").hide();
            $("#countries-alternative_wrapper .dataTable-top .DTTT_container").hide();
            $("#countries-alternative_wrapper .dataTable-top").append("<div style='font:13px Ubuntu,Helvetica,sans-serif; color:#636363; text-shadow:0 1px #F6F6F6; margin-right:10px; padding: 10px; float: right;'><a href='#/analytics/countries'>"+jQuery.i18n.map["common.go-to-countries"]+"&nbsp;&nbsp;&nbsp;<i class='fa fa-chevron-right' aria-hidden='true'></i></a></div>");
            $("#countries-alternative_wrapper .dataTable-top").append("<div style='font:15px Ubuntu,Helvetica,sans-serif; color:#636363; text-shadow:0 1px #F6F6F6; letter-spacing:-1px; margin-left:10px; margin-top: 8px; text-transform: uppercase;'>"+jQuery.i18n.map["sidebar.analytics.countries"]+"</div>");
        }
        else{
            CountlyHelpers.refreshTable(self.country_dtable, countlyLocation.getLocationData({maxCountries:10}));
        }
    },
    destroy:function () {
        $("#content-top").html("");
    }
});

app.addAppType("web", WebDashboardView);

$( document ).ready(function() {
    var menu = '<a href="#/all" id="allapps-menu" class="item analytics active">'+
		'<div class="logo ion-android-apps"></div>'+
		'<div class="text" data-localize="web.all-websites"></div>'+
	'</a>';
	$('#web-type a').first().before(menu);
    
    menu = '<a href="#/analytics/platforms" class="item">'+
		'<div class="logo platforms"></div>'+
		'<div class="text" data-localize="sidebar.analytics.platforms"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
     menu = '<a href="#/analytics/versions" class="item">'+
		'<div class="logo app-versions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.versions"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/resolutions" class="item">'+
		'<div class="logo resolutions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.resolutions"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/countries" class="item">'+
		'<div class="logo country"></div>'+
		'<div class="text" data-localize="sidebar.analytics.countries"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
    menu = '<a href="#/analytics/sessions" class="item">'+
		'<div class="logo sessions"></div>'+
		'<div class="text" data-localize="sidebar.analytics.sessions"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
	menu = '<a href="#/analytics/users" class="item">'+
		'<div class="logo users"></div>'+
		'<div class="text" data-localize="sidebar.analytics.users"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').prepend(menu);
    
    $("#web-type #engagement-menu").show();
    
    menu =      '<a href="#/analytics/loyalty" class="item">' +
                    '<div class="logo loyalty"></div>' +
                    '<div class="text" data-localize="sidebar.analytics.user-loyalty"></div>' +
                '</a>' +
                '<a href="#/analytics/frequency" class="item">' +
                    '<div class="logo frequency"></div>' +
                    '<div class="text" data-localize="sidebar.analytics.session-frequency"></div>' +
                '</a>' +
                '<a href="#/analytics/durations" class="item">' +
                    '<div class="logo durations"></div>' +
                    '<div class="text" data-localize="sidebar.engagement.durations"></div>' +
                '</a>';
	$('#web-type #engagement-submenu').append(menu);
    
    app.addAppSwitchCallback(function(appId){
        if(countlyGlobal["apps"][appId].type == "web"){
            //views = page views
            jQuery.i18n.map["drill.lv"] = jQuery.i18n.map["web.drill.lv"];
            jQuery.i18n.map["views.title"] = jQuery.i18n.map["web.views.title"];
            jQuery.i18n.map["views.view"] = jQuery.i18n.map["web.views.view"];
            //crashes = errors
            jQuery.i18n.map["crashes.title"] = jQuery.i18n.map["web.crashes.title"];
            jQuery.i18n.map["crashes.unresolved-crashes"] = jQuery.i18n.map["web.crashes.unresolved-crashes"];
            jQuery.i18n.map["crashes.groupid"] = jQuery.i18n.map["web.crashes.groupid"];
            jQuery.i18n.map["crashes.crashed"] = jQuery.i18n.map["web.crashes.crashed"];
            jQuery.i18n.map["crashes.last-crash"] = jQuery.i18n.map["web.crashes.last-crash"];
            jQuery.i18n.map["crashes.online"] = jQuery.i18n.map["web.crashes.online"];
            jQuery.i18n.map["crashes.muted"] = jQuery.i18n.map["web.crashes.muted"];
            jQuery.i18n.map["crashes.background"] = jQuery.i18n.map["web.crashes.background"];
            jQuery.i18n.map["crashes.back-to-crashes"] = jQuery.i18n.map["web.crashes.back-to-crashes"];
            jQuery.i18n.map["crashes.back-to-crash"] = jQuery.i18n.map["web.crashes.back-to-crash"];
            jQuery.i18n.map["crashes.crashes-by"] = jQuery.i18n.map["web.crashes.crashes-by"];
            jQuery.i18n.map["crashes.unique"] = jQuery.i18n.map["web.crashes.unique"];
            jQuery.i18n.map["crashes.rate"] = jQuery.i18n.map["web.crashes.rate"];
            jQuery.i18n.map["crashes.top-crash"] = jQuery.i18n.map["web.crashes.top-crash"];
            jQuery.i18n.map["crashes.new-crashes"] = jQuery.i18n.map["web.crashes.new-crashes"];
            jQuery.i18n.map["crashes.fatality"] = jQuery.i18n.map["web.crashes.fatality"];
            jQuery.i18n.map["crashes.nonfatal-crashes"] = jQuery.i18n.map["web.crashes.nonfatal-crashes"];
            jQuery.i18n.map["crashes.confirm-delete"] = jQuery.i18n.map["web.crashes.confirm-delete"];
            jQuery.i18n.map["revenue.iap"] = jQuery.i18n.map["web.revenue.iap"];
            jQuery.i18n.map["revenue.tooltip"] = jQuery.i18n.map["web.revenue.tooltip"];
            jQuery.i18n.map["placeholder.iap-event-key"] = jQuery.i18n.map["web.placeholder.iap-event-key"];
            jQuery.i18n.map["placeholder.iap-help"] = jQuery.i18n.map["web.placeholder.iap-help"];
            jQuery.i18n.map["management-applications.iap-event"] = jQuery.i18n.map["web.management-applications.iap-event"];
            jQuery.i18n.map["drill.crash"] = jQuery.i18n.map["web.drill.crash"];
            jQuery.i18n.map["drill.crash-segments"] = jQuery.i18n.map["web.drill.crash-segments"];
            jQuery.i18n.map["userdata.crashes"] = jQuery.i18n.map["web.userdata.crashes"];
            //users = visitors
            jQuery.i18n.map["common.total-users"] = jQuery.i18n.map["web.common.total-users"];
            jQuery.i18n.map["common.new-users"] = jQuery.i18n.map["web.common.new-users"];
            jQuery.i18n.map["common.returning-users"] = jQuery.i18n.map["web.common.returning-users"];
            jQuery.i18n.map["common.number-of-users"] = jQuery.i18n.map["web.common.number-of-users"];
            jQuery.i18n.map["common.table.total-users"] = jQuery.i18n.map["web.common.table.total-users"];
            jQuery.i18n.map["common.table.new-users"] = jQuery.i18n.map["web.common.table.new-users"];
            jQuery.i18n.map["common.table.returning-users"] = jQuery.i18n.map["web.common.table.returning-users"];
            jQuery.i18n.map["common.bar.top-users"] = jQuery.i18n.map["web.common.bar.top-users"];
            jQuery.i18n.map["sidebar.analytics.users"] = jQuery.i18n.map["web.sidebar.analytics.users"];
            jQuery.i18n.map["sidebar.analytics.user-loyalty"] = jQuery.i18n.map["web.sidebar.analytics.user-loyalty"];
            jQuery.i18n.map["users.title"] = jQuery.i18n.map["web.users.title"];
            jQuery.i18n.map["allapps.total-users"] = jQuery.i18n.map["web.allapps.total-users"];
            jQuery.i18n.map["allapps.new-users"] = jQuery.i18n.map["web.allapps.new-users"];
            jQuery.i18n.map["crashes.users"] = jQuery.i18n.map["web.crashes.users"];
            jQuery.i18n.map["crashes.affected-users"] = jQuery.i18n.map["web.crashes.affected-users"];
            jQuery.i18n.map["crashes.public-users"] = jQuery.i18n.map["web.crashes.public-users"];
            jQuery.i18n.map["drill.users"] = jQuery.i18n.map["web.drill.users"];
            jQuery.i18n.map["drill.times-users"] = jQuery.i18n.map["web.drill.times-users"];
            jQuery.i18n.map["drill.sum-users"] = jQuery.i18n.map["web.drill.sum-users"];
            jQuery.i18n.map["funnels.total-users"] = jQuery.i18n.map["web.funnels.total-users"];
            jQuery.i18n.map["funnels.users"] = jQuery.i18n.map["web.funnels.users"];
            jQuery.i18n.map["common.online-users"] = jQuery.i18n.map["web.common.online-users"];
            jQuery.i18n.map["live.new-users"] = jQuery.i18n.map["web.live.new-users"];
            jQuery.i18n.map["populator.amount-users"] = jQuery.i18n.map["web.populator.amount-users"];
            jQuery.i18n.map["sidebar.engagement.retention"] = jQuery.i18n.map["web.sidebar.engagement.retention"];
            jQuery.i18n.map["retention.users-first-session"] = jQuery.i18n.map["web.retention.users-first-session"];
            jQuery.i18n.map["userdata.title"] = jQuery.i18n.map["web.userdata.title"];
            jQuery.i18n.map["userdata.users"] = jQuery.i18n.map["web.userdata.users"];
            jQuery.i18n.map["userdata.user"] = jQuery.i18n.map["web.userdata.user"];
            jQuery.i18n.map["userdata.back-to-list"] = jQuery.i18n.map["web.userdata.back-to-list"];
            jQuery.i18n.map["userdata.no-users"] = jQuery.i18n.map["web.userdata.no-users"];          
            jQuery.i18n.map["attribution.per-user"] = jQuery.i18n.map["web.attribution.per-user"];
            jQuery.i18n.map["attribution.user-conversion"] = jQuery.i18n.map["web.attribution.user-conversion"];
            jQuery.i18n.map["attribution.organic"] = jQuery.i18n.map["web.attribution.organic"];
            jQuery.i18n.map["reports.total_users"] = jQuery.i18n.map["web.reports.total_users"];
            jQuery.i18n.map["reports.new_users"] = jQuery.i18n.map["web.reports.new_users"];
            jQuery.i18n.map["reports.paying_users"] = jQuery.i18n.map["web.reports.paying_users"];
            jQuery.i18n.map["reports.messaging_users"] = jQuery.i18n.map["web.reports.messaging_users"];
            jQuery.i18n.map["reports.returning_users"] = jQuery.i18n.map["web.reports.returning_users"];
            jQuery.i18n.map["common.per-user"] = jQuery.i18n.map["web.common.per-user"];
            jQuery.i18n.map["common.per-paying-user"] = jQuery.i18n.map["web.common.per-paying-user"];
            jQuery.i18n.map["common.users"] = jQuery.i18n.map["web.common.users"];
            jQuery.i18n.map["attribution.installs"] = jQuery.i18n.map["web.attribution.installs"];
            jQuery.i18n.map["attribution.cost-install"] = jQuery.i18n.map["web.attribution.cost-install"];
            jQuery.i18n.map["sources.title"] = jQuery.i18n.map["web.sources.title"];
            jQuery.i18n.map["sources.source"] = jQuery.i18n.map["web.sources.source"];
            
        }
    });
});;(function (countlyPlugins, $, undefined) {

    //Private Properties
    var _pluginsData = {};
    var _configsData = {};
    var _userConfigsData = {};
    var _themeList = [];

    //Public Methods
    countlyPlugins.initialize = function (id) {
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/o/plugins",
			data:{
                api_key:countlyGlobal['member'].api_key
            },
			success:function (json) {
				_pluginsData = json;
			}
		});
    };
    
    countlyPlugins.toggle = function (plugins, callback) {
		$.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/plugins",
			data:{
				plugin:JSON.stringify(plugins),
				api_key:countlyGlobal['member'].api_key
			},
			success:function (json) {
				if(callback)
					callback(json);
			},
			error: function(xhr, textStatus, errorThrown){
				var ret = textStatus+" ";
				ret += xhr.status+": "+$(xhr.responseText).text();
				if(errorThrown)
					ret += errorThrown+"\n";
				if(callback)
					callback(ret);
			}
		});
    };
    
    countlyPlugins.initializeConfigs = function (id) {
		return $.when(
            $.ajax({
                type:"GET",
                url:countlyCommon.API_URL + "/o/themes",
                data:{
                    api_key:countlyGlobal['member'].api_key
                },
                success:function (json) {
                    _themeList = json;
                }
            }),
            $.ajax({
                type:"GET",
                url:countlyCommon.API_URL + "/o/configs",
                data:{
                    api_key:countlyGlobal['member'].api_key
                },
                success:function (json) {
                    _configsData = json;
                }
            })
        ).then(function(){
            return true;
        });
    };
    
    countlyPlugins.updateConfigs = function (configs, callback) {
		$.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/configs",
			data:{
                configs:JSON.stringify(configs),
                api_key:countlyGlobal['member'].api_key
            },
			success:function (json) {
				_configsData = json;
                if(callback)
                    callback(null, json);
			},
			error:function (json) {
                if(callback)
                    callback(true, json);
			}
		});
    };
    
    countlyPlugins.initializeUserConfigs = function (id) {
		return $.when(
            $.ajax({
                type:"GET",
                url:countlyCommon.API_URL + "/o/themes",
                data:{
                    api_key:countlyGlobal['member'].api_key
                },
                success:function (json) {
                    _themeList = json;
                }
            }),
            $.ajax({
                type:"GET",
                url:countlyCommon.API_URL + "/o/userconfigs",
                data:{
                    api_key:countlyGlobal['member'].api_key
                },
                success:function (json) {
                    _userConfigsData = json;
                }
            })
        ).then(function(){
            return true;
        });
    };
    
    countlyPlugins.updateUserConfigs = function (configs, callback) {
		$.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/userconfigs",
			data:{
                configs:JSON.stringify(configs),
                api_key:countlyGlobal['member'].api_key
            },
			success:function (json) {
				_userConfigsData = json;
                if(callback)
                    callback(null, json);
			},
			error:function (json) {
                if(callback)
                    callback(true, json);
			}
		});
    };
	
	countlyPlugins.getData = function () {
		return _pluginsData;
    };
    
    countlyPlugins.getConfigsData = function () {
		return _configsData;
    };
    
    countlyPlugins.getUserConfigsData = function () {
		return _userConfigsData;
    };
    
    countlyPlugins.getThemeList = function () {
		return _themeList;
    };
	
}(window.countlyPlugins = window.countlyPlugins || {}, jQuery));;window.PluginsView = countlyView.extend({
    initialize:function () {
        this.filter = (store.get("countly_pluginsfilter")) ? store.get("countly_pluginsfilter") : "plugins-all";
    },
    beforeRender: function() {
        if(this.template)
            return $.when(countlyPlugins.initialize()).then(function () {});
        else{
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/plugins/templates/plugins.html', function(src){
                self.template = Handlebars.compile(src);
            }), countlyPlugins.initialize()).then(function () {});
        }
    },
    renderCommon:function (isRefresh) {

        var pluginsData = countlyPlugins.getData();
        this.templateData = {
            "page-title":jQuery.i18n.map["plugins.title"]
        };
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#"+this.filter).addClass("selected").addClass("active");
            $.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
                if(!$(oSettings.nTable).hasClass("plugins-filter"))
                    return true;
                if(self.filter == "plugins-enabled") {
                    return aData[4]
                }
                if(self.filter == "plugins-disabled") {
                    return !aData[4]
                }
                return true;
            });

            this.dtable = $('#plugins-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": pluginsData,
                "aoColumns": [
                    { "mData": function(row, type){return row.title;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.name"]},
                    { "mData": function(row, type){return row.description;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.description"] },
                    { "mData": function(row, type){return row.version;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.version"], "sClass":"center" },
                    { "mData": function(row, type){if(!row.enabled) return jQuery.i18n.map["plugins.disabled"]; else return jQuery.i18n.map["plugins.enabled"];}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.status"], "sClass":"center" },
                    { "mData": function(row, type){if(type == "display"){ var prepackagedClass = row.prepackaged ? 'disabled' : 'btn-plugins'; if(!row.enabled) return '<a class="icon-button green btn-header '+prepackagedClass+'" id="plugin-'+row.code+'">'+jQuery.i18n.map["plugins.enable"]+'</a>'; else return '<a class="icon-button red btn-header '+prepackagedClass+'" id="plugin-'+row.code+'">'+jQuery.i18n.map["plugins.disable"]+'</a>';}else return row.enabled;}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.state"], "sClass":"shrink center"},
                    { "mData": function(row, type){if(row.homepage != "") return '<a class="icon-button btn-header light" href="'+ row.homepage + '" target="_blank">'+jQuery.i18n.map["plugins.homepage"]+'</a>'; else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["plugins.homepage"], "sClass":"shrink center"}
                ]
            }));
            this.dtable.stickyTableHeaders();
            this.dtable.fnSort( [ [0,'asc'] ] );
        }
    },
    refresh:function (){
    },
    togglePlugin: function(plugins){
        var self = this;
        var overlay = $("#overlay").clone();
        $("body").append(overlay);
        overlay.show();
        var loader = $(this.el).find("#loader");
        loader.show();
        countlyPlugins.toggle(plugins, function(res){
            var msg = {clearAll:true};
            if(res == "Success" || res == "Errors"){
                var seconds = 10;
                if(res == "Success"){
                    msg.title = jQuery.i18n.map["plugins.success"];
                    msg.message = jQuery.i18n.map["plugins.restart"]+" "+seconds+" "+jQuery.i18n.map["plugins.seconds"];
                    msg.info = jQuery.i18n.map["plugins.finish"];
                    msg.delay = seconds*1000;
                }
                else if(res == "Errors"){
                    msg.title = jQuery.i18n.map["plugins.errors"];
                    msg.message = jQuery.i18n.map["plugins.errors-msg"];
                    msg.info = jQuery.i18n.map["plugins.restart"]+" "+seconds+" "+jQuery.i18n.map["plugins.seconds"];
                    msg.sticky = true;
                    msg.type = "error";
                }
                setTimeout(function(){
                    window.location.reload(true);
                }, seconds*1000);
            }
            else{
                overlay.hide();
                loader.hide();
                msg.title = jQuery.i18n.map["plugins.error"];
                msg.message = res;
                msg.info = jQuery.i18n.map["plugins.retry"];
                msg.sticky = true;
                msg.type = "error";
            }
            CountlyHelpers.notify(msg);
        });
    },
    filterPlugins: function(filter){
        this.filter = filter;
        store.set("countly_pluginsfilter", filter);
        $("#"+this.filter).addClass("selected").addClass("active");
        this.dtable.fnDraw();
    }
});

window.ConfigurationsView = countlyView.extend({
    userConfig: false,
    initialize:function () {
        this.predefinedInputs = {};
        this.predefinedLabels = {
            "frontend":jQuery.i18n.map["configs.frontend"],
            "api":jQuery.i18n.map["configs.api"],
            "apps":jQuery.i18n.map["configs.apps"],
            "logs": jQuery.i18n.map["configs.logs"],
            "frontend-production":jQuery.i18n.map["configs.frontend-production"],
            "frontend-session_timeout":jQuery.i18n.map["configs.frontend-session_timeout"],
            "frontend-theme":jQuery.i18n.map["configs.frontend-theme"],
            "frontend-use_google":jQuery.i18n.map["configs.frontend-use_google"],
            "frontend-code":jQuery.i18n.map["configs.frontend-code"],
            "api-domain":jQuery.i18n.map["configs.api-domain"],
            "api-safe":jQuery.i18n.map["configs.api-safe"],
            "api-session_duration_limit":jQuery.i18n.map["configs.api-session_duration_limit"],
            "api-city_data":jQuery.i18n.map["configs.api-city_data"],
            "api-event_limit":jQuery.i18n.map["configs.api-event_limit"],
            "api-event_segmentation_limit":jQuery.i18n.map["configs.api-event_segmentation_limit"],
            "api-event_segmentation_value_limit":jQuery.i18n.map["configs.api-event_segmentation_value_limit"],
            "api-sync_plugins":jQuery.i18n.map["configs.api-sync_plugins"],
            "api-session_cooldown":jQuery.i18n.map["configs.api-session_cooldown"],
            "api-total_users":jQuery.i18n.map["configs.api-total_users"],
            "apps-country":jQuery.i18n.map["configs.apps-country"],
            "apps-category":jQuery.i18n.map["configs.apps-category"]
        };
        this.configsData = {};
        this.cache = {};
        this.changes = {};
        
        //register some common system config inputs
        this.registerInput("apps-category", function(value){
            var categories = app.manageAppsView.getAppCategories();
            var select = '<div class="cly-select" id="apps-category">'+
                '<div class="select-inner">'+
                    '<div class="text-container">';
            if(!categories[value])
                select += '<div class="text"></div>';
            else
                select += '<div class="text">'+categories[value]+'</div>';
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';
                    
                for(var i in categories){
                    select += '<div data-value="'+i+'" class="segmentation-option item">'+categories[i]+'</div>';
                }

            select += '</div>'+
                '</div>'+
            '</div>';
            return select;
        });
        
        this.registerInput("apps-country", function(value){
            var zones = app.manageAppsView.getTimeZones();
            var select = '<div class="cly-select" id="apps-country">'+
                '<div class="select-inner">'+
                    '<div class="text-container">';
            if(!zones[value])
                select += '<div class="text"></div>';
            else
                select += '<div class="text"><div class="flag" style="background-image:url(images/flags/'+value.toLowerCase()+'.png)"></div>'+zones[value].n+'</div>';
            
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';
                    
                for(var i in zones){
                    select += '<div data-value="'+i+'" class="segmentation-option item"><div class="flag" style="background-image:url(images/flags/'+i.toLowerCase()+'.png)"></div>'+zones[i].n+'</div>';
                }

            select += '</div>'+
                '</div>'+
            '</div>';
            return select;
        });
        
        this.registerInput("frontend-theme", function(value){
            var themes = countlyPlugins.getThemeList();
            var select = '<div class="cly-select" id="frontend-theme">'+
                '<div class="select-inner">'+
                    '<div class="text-container">';
            if(value && value.length)
                select += '<div class="text">'+value+'</div>';
            else
                select += '<div class="text">'+jQuery.i18n.map["configs.no-theme"]+'</div>';
            
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';
                    
                for(var i = 0; i < themes.length; i++){
                    if(themes[i] == "")
                        select += '<div data-value="" class="segmentation-option item">'+jQuery.i18n.map["configs.no-theme"]+'</div>';
                    else
                        select += '<div data-value="'+themes[i]+'" class="segmentation-option item">'+themes[i]+'</div>';
                }

            select += '</div>'+
                '</div>'+
            '</div>';
            return select;
        });
        
        //register some common system config inputs
        this.registerInput("logs-default", function(value){
            var categories = ['debug', 'info', 'warn', 'error'];
            var select = '<div class="cly-select" id="logs-default">'+
                '<div class="select-inner">'+
                    '<div class="text-container">';
            if(value && value.length)
                select += '<div class="text">'+jQuery.i18n.map["configs.logs."+value]+'</div>';
            else
                select += '<div class="text">'+Query.i18n.map["configs.logs.warn"]+'</div>';
            select += '</div>'+
                    '<div class="right combo"></div>'+
                '</div>'+
                '<div class="select-items square">'+
                    '<div>';
                    
                for(var i = 0; i < categories.length; i++){
                    select += '<div data-value="'+categories[i]+'" class="segmentation-option item">'+jQuery.i18n.map["configs.logs."+categories[i]]+'</div>';
                }

            select += '</div>'+
                '</div>'+
            '</div>';
            return select;
        });
        
        this.registerInput("apps-timezone", function(value){
            return null;
        });
    },
    beforeRender: function() {
        if(this.template)
            if(this.userConfig)
                return $.when(countlyPlugins.initializeUserConfigs()).then(function () {});
            else
                return $.when(countlyPlugins.initializeConfigs()).then(function () {});
        else{
            var self = this;
            if(this.userConfig)
                return $.when($.get(countlyGlobal["path"]+'/plugins/templates/configurations.html', function(src){
                    self.template = Handlebars.compile(src);
                }), countlyPlugins.initializeUserConfigs()).then(function () {});
            else
                return $.when($.get(countlyGlobal["path"]+'/plugins/templates/configurations.html', function(src){
                    self.template = Handlebars.compile(src);
                }), countlyPlugins.initializeConfigs()).then(function () {});
        }
    },
    renderCommon:function (isRefresh) {
        if(this.userConfig)
            this.configsData = countlyPlugins.getUserConfigsData();
        else
            this.configsData = countlyPlugins.getConfigsData();
        var configsHTML;
        var title = jQuery.i18n.map["plugins.configs"];
        if(this.userConfig)
            title = jQuery.i18n.map["plugins.user-configs"];
        if(this.namespace && this.configsData[this.namespace]){
            configsHTML = this.generateConfigsTable(this.configsData[this.namespace], "-"+this.namespace);
            title = this.getInputLabel(this.namespace, this.namespace) + " " + title;
        }
        else
            configsHTML = this.generateConfigsTable(this.configsData);
        
        
        this.templateData = {
            "page-title":title,
            "configs":configsHTML,
            "namespace":this.namespace,
            "user": this.userConfig
        };
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.changes = {};
            this.cache = JSON.parse(JSON.stringify(this.configsData));
            
            $(".configs #username").val($("#menu-username").text());
            $(".configs #api-key").val($("#user-api-key").val());
            
            $("#configs-back").click(function(){
                window.history.back();
            });

            $(".boolean-selector>.button").click(function () {
                var dictionary = {"plugins.enable":true, "plugins.disable":false};
                var cur = $(this);
                if (cur.hasClass("selected")) {
                    return true;
                }
                var prev = cur.parent(".button-selector").find(">.button.selected");
                prev.removeClass("selected").removeClass("active");
                cur.addClass("selected").addClass("active");
                var id = $(this).parent(".button-selector").attr("id");
                var value = dictionary[$(this).data("localize")];
                self.updateConfig(id, value);
            });
            
            $(".configs input").keyup(function () {
                var id = $(this).attr("id");
                var value = $(this).val();
                if($(this).attr("type") == "number")
                    value = parseFloat(value);
                self.updateConfig(id, value);
            });
            
            $(".configs .segmentation-option").on("click", function () {
                var id = $(this).closest(".cly-select").attr("id");
                var value = $(this).data("value");
                self.updateConfig(id, value);
            });
            
            $(".configs .account-settings .input input").keyup(function () {
                $("#configs-apply-changes").removeClass("settings-changes");
                $(".configs .account-settings .input input").each(function(){
                    var id = $(this).attr("id");
                    switch(id){
                        case "username":
                            if(this.value != $("#menu-username").text())
                                $("#configs-apply-changes").addClass("settings-changes");
                            break;
                        case "api-key":
                            if(this.value != $("#user-api-key").val())
                                $("#configs-apply-changes").addClass("settings-changes");
                            break;
                        default:
                            if(this.value != "")
                                $("#configs-apply-changes").addClass("settings-changes");
                            break;
                    }
                    if($("#configs-apply-changes").hasClass("settings-changes"))
                        $("#configs-apply-changes").show();
                    else if(!$("#configs-apply-changes").hasClass("configs-changes"))
                        $("#configs-apply-changes").hide();
                });
            });
            
            $("#configs-apply-changes").click(function () {
                if(self.userConfig){
                    var username = $(".configs #username").val(),
                        old_pwd = $(".configs #old_pwd").val(),
                        new_pwd = $(".configs #new_pwd").val(),
                        re_new_pwd = $(".configs #re_new_pwd").val(),
                        api_key = $(".configs #api-key").val();
                    
                    var ignoreError = false;
                    
                    if((new_pwd.length && re_new_pwd.length) || api_key.length || username.length){
                        ignoreError = true;
                    }
                    
                    if ((new_pwd.length || re_new_pwd.length) && !old_pwd.length) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["user-settings.old-password-match"],
                            message: jQuery.i18n.map["configs.not-saved"],
                            type: "error"
                        });
                        return true;
                    }
    
                    if (new_pwd != re_new_pwd) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["user-settings.password-match"],
                            message: jQuery.i18n.map["configs.not-saved"],
                            type: "error"
                        });
                        return true;
                    }
    
                    $.ajax({
                        type:"POST",
                        url:countlyGlobal["path"]+"/user/settings",
                        data:{
                            "username":username,
                            "old_pwd":old_pwd,
                            "new_pwd":new_pwd,
                            "api_key":api_key,
                            _csrf:countlyGlobal['csrf_token']
                        },
                        success:function (result) {
                            var saveResult = $(".configs #settings-save-result");
    
                            if (result == "username-exists") {
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["management-users.username.exists"],
                                    message: jQuery.i18n.map["configs.not-saved"],
                                    type: "error"
                                });
                                return true;
                            } else if (!result) {
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["user-settings.alert"],
                                    message: jQuery.i18n.map["configs.not-saved"],
                                    type: "error"
                                });
                                return true;
                            } else {
                                $(".configs #old_pwd").val("");
                                $(".configs #new_pwd").val("");
                                $(".configs #re_new_pwd").val("");
                                $("#menu-username").text(username);
                                $("#user-api-key").val(api_key);
                                countlyGlobal["member"].username = username;
                                countlyGlobal["member"].api_key = api_key;
                            }
                            countlyPlugins.updateUserConfigs(self.changes, function(err, services){
                                if(err && !ignoreError){
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["configs.not-changed"],
                                        message: jQuery.i18n.map["configs.not-saved"],
                                        type: "error"
                                    });
                                }
                                else{
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["configs.changed"],
                                        message: jQuery.i18n.map["configs.saved"]
                                    });
                                    self.configsData = JSON.parse(JSON.stringify(self.cache));
                                    $("#configs-apply-changes").hide();
                                    self.changes = {};
                                }
                            });
                        }
                    });
                }
                else{
                    countlyPlugins.updateConfigs(self.changes, function(err, services){
                        if(err){
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.not-changed"],
                                message: jQuery.i18n.map["configs.not-saved"],
                                type: "error"
                            });
                        }
                        else{
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.changed"],
                                message: jQuery.i18n.map["configs.saved"]
                            });
                            self.configsData = JSON.parse(JSON.stringify(self.cache));
                            $("#configs-apply-changes").hide();
                            self.changes = {};
                        }
                    });
                }
            });
        }
    },
    updateConfig: function(id, value){
        var configs = id.split("-");
                
        //update cache
        var data = this.cache;
        for(var i = 0; i < configs.length; i++){
            if(typeof data[configs[i]] == "undefined"){
                break;
            }
            else if(i == configs.length-1){
                data[configs[i]] = value;
            }
            else{
                data = data[configs[i]];
            }
        }
        
        //add to changes
        var data = this.changes;
        for(var i = 0; i < configs.length; i++){
            if(i == configs.length-1){
                data[configs[i]] = value;
            }
            else if(typeof data[configs[i]] == "undefined"){
                data[configs[i]] = {};
            }
            data = data[configs[i]];
        }
        $("#configs-apply-changes").removeClass("configs-changes");
        if(JSON.stringify(this.configsData) != JSON.stringify(this.cache)){
            $("#configs-apply-changes").addClass("configs-changes");
        }
        else{
            this.changes = {};
        }  
        
        if($("#configs-apply-changes").hasClass("configs-changes"))
            $("#configs-apply-changes").show();
        else if(!$("#configs-apply-changes").hasClass("settings-changes"))
            $("#configs-apply-changes").hide();
    },
    generateConfigsTable: function(configsData, id){
        id = id || "";
        var first = true;
        if(id != ""){
            first = false;
        }
        var configsHTML = "";
        if(!first)
            configsHTML += "<table class='d-table help-zone-vb' cellpadding='0' cellspacing='0'>";
        for(var i in configsData){
            if(typeof configsData[i] == "object"){
                if(configsData[i] != null){
                    var label = this.getInputLabel((id+"-"+i).substring(1), i);
                    if(label)
                        configsHTML += "<tr><td>"+label+"</td><td>"+this.generateConfigsTable(configsData[i], id+"-"+i)+"</td></tr>";
                }
                else{
                    var input = this.getInputByType((id+"-"+i).substring(1), "");
                    var label = this.getInputLabel((id+"-"+i).substring(1), i);
                    if(input && label)
                        configsHTML += "<tr><td>"+label+"</td><td>"+input+"</td></tr>";
                }
            }
            else{
                var input = this.getInputByType((id+"-"+i).substring(1), configsData[i]);
                var label = this.getInputLabel((id+"-"+i).substring(1), i);
                if(input && label)
                    configsHTML += "<tr><td>"+label+"</td><td>"+input+"</td></tr>";
            }
        }
        if(!first)
            configsHTML += "</table>";
        return configsHTML;
    },
    getInputLabel: function(id, value){
        var ns = id.split("-")[0];
        if(ns != "frontend" && ns != "api" && ns != "apps" && ns != "logs" && countlyGlobal["plugins"].indexOf(ns) == -1){
            return null;
        }
        var ret = "";
        if(jQuery.i18n.map["configs.help."+id])
            ret = "<span class='config-help'>"+jQuery.i18n.map["configs.help."+id]+"</span>";
        if(typeof this.predefinedLabels[id] != "undefined")
            return "<div>"+this.predefinedLabels[id]+"</div>"+ret;
        else
            return "<div>"+value+"</div>"+ret;
    },
    getInputByType: function(id, value){
        if(this.predefinedInputs[id]){
            return this.predefinedInputs[id](value);
        }
        else if(typeof value == "boolean"){
            var input = '<div id="'+id+'" class="button-selector boolean-selector">';
            if(value){
                input += '<div class="button active selected" data-localize="plugins.enable"></div>';
                input += '<div class="button" data-localize="plugins.disable"></div>';
            }
            else{
                input += '<div class="button" data-localize="plugins.enable"></div>';
                input += '<div class="button active selected" data-localize="plugins.disable"></div>';
            }
            input += '</div>';
            return input;
        }
        else if(typeof value == "number"){
            return "<input type='number' id='"+id+"' value='"+value+"'/>";
        }
        else
            return "<input type='text' id='"+id+"' value='"+value+"'/>";
    },
    registerInput: function(id, callback){
        this.predefinedInputs[id] = callback;
    },
    registerLabel: function(id, html){
        this.predefinedLabels[id] = html;
    },
    refresh:function (){
    }
});

//register views
app.pluginsView = new PluginsView();
app.configurationsView = new ConfigurationsView();
if(countlyGlobal["member"].global_admin){
    app.route('/manage/plugins', 'plugins', function () {
        this.renderWhenReady(this.pluginsView);
    });
    
    app.route('/manage/configurations', 'configurations', function () {
        this.configurationsView.namespace = null;
        this.configurationsView.userConfig = false;
        this.renderWhenReady(this.configurationsView);
    });
    
    app.route('/manage/configurations/:namespace', 'configurations_namespace', function (namespace) {
        this.configurationsView.namespace = namespace;
        this.configurationsView.userConfig = false;
        this.renderWhenReady(this.configurationsView);
    });
} 
app.route('/manage/user-settings', 'user-settings', function () {
    this.configurationsView.namespace = null;
    this.configurationsView.userConfig = true;
    this.renderWhenReady(this.configurationsView);
});

app.route('/manage/user-settings/:namespace', 'user-settings_namespace', function (namespace) {
    this.configurationsView.namespace = namespace;
    this.configurationsView.userConfig = true;
    this.renderWhenReady(this.configurationsView);
});


app.addPageScript("/manage/plugins", function(){
   $("#plugins-selector").find(">.button").click(function () {
        if ($(this).hasClass("selected")) {
            return true;
        }

        $(".plugins-selector").removeClass("selected").removeClass("active");
        var filter = $(this).attr("id");
        app.activeView.filterPlugins(filter);
    });
    var plugins = countlyGlobal["plugins"].slice();
    $("#plugins-table").on("click", ".btn-plugins", function () {
        var show = false;
        var plugin = this.id.toString().replace(/^plugin-/, '');
        if($(this).hasClass("green")){
            $(this).removeClass("green").addClass("red");
            $(this).text(jQuery.i18n.map["plugins.disable"]);
            plugins.push(plugin);
        }
        else if($(this).hasClass("red")){
            $(this).removeClass("red").addClass("green");
            $(this).text(jQuery.i18n.map["plugins.enable"]);
            var index = $.inArray(plugin, plugins);
            plugins.splice(index, 1);
        }
        if(plugins.length != countlyGlobal["plugins"].length)
            show = true;
        else{
            for(var i = 0; i < plugins.length; i++){
                if($.inArray(plugins[i], countlyGlobal["plugins"]) == -1){
                    show = true;
                    break;
                }
            }
        }
        if(show)
            $(".btn-plugin-enabler").show();
        else
            $(".btn-plugin-enabler").hide();
    });
    $("#plugins-selector").on("click", ".btn-plugin-enabler", function () {
        var plugins = {};
        $(".btn-plugins").each(function(){
            var plugin = this.id.toString().replace(/^plugin-/, '');
            var state = ($(this).hasClass("green")) ? false : true;
            plugins[plugin] = state;
        })
        var text = jQuery.i18n.map["plugins.confirm"];
        var msg = {title:jQuery.i18n.map["plugins.processing"], message: jQuery.i18n.map["plugins.wait"], info:jQuery.i18n.map["plugins.hold-on"], sticky:true};
        CountlyHelpers.confirm(text, "red", function (result) {
            if (!result) {
                return true;
            }
            CountlyHelpers.notify(msg);
            app.activeView.togglePlugin(plugins);
        });
    });
});

$( document ).ready(function() {
    if(countlyGlobal["member"] && countlyGlobal["member"]["global_admin"]){
        var menu = '<a href="#/manage/plugins" class="item">'+
            '<div class="logo-icon fa fa-puzzle-piece"></div>'+
            '<div class="text" data-localize="plugins.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
        
        var menu = '<a href="#/manage/configurations" class="item">'+
            '<div class="logo-icon fa fa-wrench"></div>'+
            '<div class="text" data-localize="plugins.configs"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});;CountlyHelpers.createMetricModel(window.countlyDensity = window.countlyDensity || {}, {name: "density", estOverrideMetric: "densities"}, jQuery);;window.DensityView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyDensity.initialize(), countlyTotalUsers.initialize("densities")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var densityData = countlyDensity.getData();

        this.templateData = {
            "page-title":jQuery.i18n.map["density.title"],
            "logo-class":"densities",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "chart-helper":"density.chart"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                $(".widget-header .left .title").after(addDrill("up.dnst"));
            }

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": densityData.chartData,
                "aoColumns": [
                    { "mData": "density", sType:"session-duration", "sTitle": jQuery.i18n.map["density.table.density"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
            countlyCommon.drawGraph(densityData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(densityData.chartDPNew, "#dashboard-graph2", "pie");
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var densityData = countlyDensity.getData();

            countlyCommon.drawGraph(densityData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(densityData.chartDPNew, "#dashboard-graph2", "pie");
			CountlyHelpers.refreshTable(self.dtable, densityData.chartData);
        });
    }
});

//register views
app.densityView = new DensityView();

app.route("/analytics/density", 'desity', function () {
	this.renderWhenReady(this.densityView);
});

$( document ).ready(function() {
	var menu = '<a href="#/analytics/density" class="item">'+
		'<div class="logo densities"></div>'+
		'<div class="text" data-localize="sidebar.analytics.densities"></div>'+
	'</a>';
	$('#mobile-type #analytics-submenu').append(menu);
});;(function () {
    var langmap;
    $.ajax({
        type:"GET",
        url:countlyCommon.API_PARTS.data.r+"/langmap",
        dataType:"json",
        success:function (json) {
            langmap = json;
        }
    });

    function getLanguageName(code){
        if(langmap && langmap[code]){
            return langmap[code].englishName
        }
        else
            return code;
    }

    CountlyHelpers.createMetricModel(window.countlyLanguage = window.countlyLanguage || {getLanguageName:getLanguageName}, {name: "langs", estOverrideMetric:"languages"}, jQuery, getLanguageName);
}());;window.LanguageView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyLanguage.initialize(), countlyTotalUsers.initialize("languages")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var languageData = countlyLanguage.getData();

        this.templateData = {
            "page-title":jQuery.i18n.map["languages.title"],
            "logo-class":"languages",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "chart-helper":"languages.chart",
            "table-helper":""
        };

        languageData.chartData.forEach(function(row){
            if (row.language in countlyGlobalLang.languages) row.language = countlyGlobalLang.languages[row.language].englishName;
        });

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                $(".widget-header .left .title").after(addDrill("up.la"));
            }
            countlyCommon.drawGraph(languageData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(languageData.chartDPNew, "#dashboard-graph2", "pie");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": languageData.chartData,
                "aoColumns": [
                    { "mData": "langs", "sTitle": jQuery.i18n.map["languages.table.language"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            newPage = $("<div>" + self.template(self.templateData) + "</div>");

            var languageData = countlyLanguage.getData();
            countlyCommon.drawGraph(languageData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(languageData.chartDPNew, "#dashboard-graph2", "pie");

            CountlyHelpers.refreshTable(self.dtable, languageData.chartData);
            app.localize();
        });
    }
});

//register views
app.languageView = new LanguageView();

app.route("/analytics/languages", "languages", function () {
    this.renderWhenReady(this.languageView);
});

$( document ).ready(function() {
	Handlebars.registerHelper('languageTitle', function (context, options) {
        return countlyGlobalLang.languages[context];
    });

	var menu = '<a href="#/analytics/languages" class="item">'+
		'<div class="logo languages"></div>'+
		'<div class="text" data-localize="sidebar.analytics.languages"></div>'+
	'</a>';
	$('.sidebar-menu:not(#iot-type) #analytics-submenu').append(menu);
});;CountlyHelpers.createMetricModel(window.countlyBrowser = window.countlyBrowser || {}, {name: "browser", estOverrideMetric: "browsers"}, jQuery);;window.BrowserView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyBrowser.initialize(), countlyTotalUsers.initialize("browsers")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var data = countlyBrowser.getData();

        this.templateData = {
            "page-title":jQuery.i18n.map["browser.title"],
            "font-logo-class":"fa-globe",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "chart-helper":"browser.chart"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                $(".widget-header .left .title").after(addDrill("up.brw"));
            }

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "aoColumns": [
                    { "mData": "browser", sType:"session-duration", "sTitle": jQuery.i18n.map["browser.table.browser"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var data = countlyBrowser.getData();

            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
			CountlyHelpers.refreshTable(self.dtable, data.chartData);
        });
    }
});

//register views
app.browserView = new BrowserView();

app.route("/analytics/browser", 'browser', function () {
	this.renderWhenReady(this.browserView);
});

$( document ).ready(function() {
	var menu = '<a href="#/analytics/browser" class="item">'+
		'<div class="logo-icon fa fa-globe"></div>'+
		'<div class="text" data-localize="browser.title"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').append(menu);
});;(function () {
    var stores;
    $.ajax({
        type:"GET",
        url:countlyCommon.API_PARTS.data.r+"/sources",
        dataType:"json",
        success:function (json) {
            stores = json;
        }
    });

    function getSourceName(code, data, separate){
        code = code.replace(/&#46;/g, '.');
        if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
            //ignore incorrect Android values, which are numbers
            if(!isNaN(parseFloat(code)) && isFinite(code))
                return jQuery.i18n.map["common.unknown"];
            if(separate)
                return code;
            if(stores && stores[code]){
                return stores[code];
            }
            else{
                for(var i in stores){
                    if(code.indexOf(i) == 0){
                        return stores[i];
                    }
                }
                return code;
            }
        }
        else{
            if(code.indexOf("://") == -1){
                if(separate)
                    return jQuery.i18n.map["sources.organic"]+" ("+code+")";
                return jQuery.i18n.map["sources.direct"];
            }
            else if(separate)
                return code;
            code = code.replace("://www.", "://");
            var matches = code.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
            var domain = matches && matches[1] || code;
            
            if(domain.indexOf("google.") == 0)
                domain = "Google";
            else if(domain.indexOf("search.yahoo.") > -1)
                domain = "Yahoo";
            else if(domain.indexOf("search.ask.") > -1)
                domain = "Ask";
            return domain;
        }
    }

    window.countlySources = window.countlySources || {};
    window.countlySources.getSourceName=getSourceName;
    CountlyHelpers.createMetricModel(window.countlySources, {name: "sources", estOverrideMetric:"sources"}, jQuery, getSourceName);
}());;window.SourcesView = countlyView.extend({
    beforeRender: function() {
        this.dataMap = {};
        return $.when(countlySources.initialize(), countlyTotalUsers.initialize("sources")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        this.updateDataMap();
        this.templateData = {
            "page-title":jQuery.i18n.map["sources.title"],
            "font-logo-class":"fa-crosshairs",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "chart-helper":"sources.chart"
        };

        if (!isRefresh) {
            var data = countlySources.getData();
            $(this.el).html(this.template(this.templateData));
            if(typeof addDrill != "undefined"){
                $(".widget-header .left .title").after(addDrill("up.src"));
            }
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
					$(nRow).attr("id", aData.sources.replace(/\./g, '-').replace(/ /g, '_').replace(/[^\w]/g,''));
				},
                "aoColumns": [
                    { "mData": "sources", sType:"string", "sTitle": jQuery.i18n.map["sources.source"], "sClass": "break source-40" },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"], "sClass": "source-20" },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"], "sClass": "source-20" },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"], "sClass": "source-20" }
                ]
            }));

            this.dtable.stickyTableHeaders();
            this.dtable.fnSort( [ [1,'desc'] ] );
            this.dtable.addClass("source-table");
            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
            
            CountlyHelpers.expandRows(this.dtable, this.expandTable, this);
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var data = countlySources.getData();

            countlyCommon.drawGraph(data.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(data.chartDPNew, "#dashboard-graph2", "pie");
			CountlyHelpers.refreshTable(self.dtable, data.chartData);
            CountlyHelpers.reopenRows(self.dtable, self.expandTable, self);
        });
    },
    expandTable: function( d, self ) {
		// `d` is the original data object for the row
		var str = '';
		if(d && d.sources && self.dataMap[d.sources]){
			str += '<div class="datatablesubrow">'+
				'<table cellpadding="5" cellspacing="0" border="0" class="subtable">';
                    str += '<tr>';
                    str += '<th class="source-40">' + jQuery.i18n.map["sources.source"] + '</th>';
					str += '<th class="source-20">' + jQuery.i18n.map["common.table.total-sessions"] + '</th>';
					str += '<th class="source-20">' + jQuery.i18n.map["common.table.total-users"] + '</th>';
					str += '<th class="source-20">' + jQuery.i18n.map["common.table.new-users"] + '</th>';
					str += '</tr>';
					for(var i in self.dataMap[d.sources]){
						str += '<tr>';
                            if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile" || self.dataMap[d.sources][i].sources.indexOf("://") == -1)
                                str += '<td class="source-40">' + self.dataMap[d.sources][i].sources + '</td>';
                            else
                                str += '<td class="source-40"><a href="' + self.dataMap[d.sources][i].sources + '" target="_blank">' + self.dataMap[d.sources][i].sources + '</a></td>';
							str += '<td class="source-20">' + self.dataMap[d.sources][i].t + '</td>';
							str += '<td class="source-20">' + self.dataMap[d.sources][i].u + '</td>';
							str += '<td class="source-20">' + self.dataMap[d.sources][i].n + '</td>';
						str += '</tr>';
					}
				str += '</table>'+
			'</div>';
		}
		return str;
	},
    updateDataMap: function(){
        var cleanData = countlySources.getData(true).chartData;
        var source;
        for(var i in cleanData){
            source = countlySources.getSourceName(cleanData[i].sources);
            if(!this.dataMap[source])
                this.dataMap[source] = {};
            this.dataMap[source][cleanData[i].sources] = cleanData[i];
        }
    }
});

//register views
app.sourcesView = new SourcesView();

app.route("/analytics/sources", 'sources', function () {
	this.renderWhenReady(this.sourcesView);
});

$( document ).ready(function() {
	var menu = '<a href="#/analytics/sources" class="item">'+
		'<div class="logo-icon fa fa-crosshairs"></div>'+
		'<div class="text" data-localize="sources.title"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').append(menu);
	$('#mobile-type #analytics-submenu').append(menu);
});;(function (countlyMetric, _name, $) {
	//Private Properties
	var _periodObj = {},
		_Db = {},
		_metrics = [],
        _frequency = [],
        _actionData = {},
		_activeAppKey = 0,
		_initialized = false,
        _segment = null,
        _segments = [],
		_period = null;

	//Public Methods
	countlyMetric.initialize = function () {
		if (_initialized &&  _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
			return this.refresh();
		}

		_period = countlyCommon.getPeriodForAjax();

		if (!countlyCommon.DEBUG) {
			_activeAppKey = countlyCommon.ACTIVE_APP_KEY;
			_initialized = true;

			return $.when(
                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":"get_view_segments",
                        "period":_period
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        if(json && json.segments){
                            for(var i = 0; i < json.segments.length; i++){
                                json.segments[i] = json.segments[i].replace(/&#46;/g, ".");
                            }
                            _segments = json.segments;
                        }
                    }
                }),
                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":_name,
                        "segmentation": _segment,
                        "period":_period
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        _Db = json;
                        setMeta();
                    }
                })
            ).then(function(){
                return true;
            });
		} else {
			_Db = {"2012":{}};
			return true;
		}
	};

	countlyMetric.refresh = function () {
		_periodObj = countlyCommon.periodObj;

		if (!countlyCommon.DEBUG) {

			if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
				_activeAppKey = countlyCommon.ACTIVE_APP_KEY;
				return this.initialize();
			}
            
            if(!_initialized)
                return this.initialize();

			return $.when(
                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":"get_view_segments",
                        "period":_period
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        if(json && json.segments){
                            for(var i = 0; i < json.segments.length; i++){
                                json.segments[i] = json.segments[i].replace(/&#46;/g, ".");
                            }
                            _segments = json.segments;
                        }
                    }
                }),
                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":_name,
                        "segmentation": _segment,
                        "action":"refresh"
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        countlyCommon.extendDbObj(_Db, json);
                        extendMeta();
                    }
                })
            ).then(function(){
                return true;
            });
		} else {
			_Db = {"2012":{}};

			return true;
		}
	};

	countlyMetric.reset = function () {
		_Db = {};
        _frequency = [];
        _actionData = {};
        _segment - null;
        _initialized = false;
		setMeta();
	};
    
    countlyMetric.setSegment = function(segment){
        _segment = segment.replace(/\./g, "&#46;");
    };
    
    countlyMetric.getSegments = function(){
        return _segments;
    };
    
    countlyMetric.loadActionsData = function (view) {
		_period = countlyCommon.getPeriodForAjax();

		return $.when(
            $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r,
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "method":"get_view_segments",
                    "period":_period
                },
                dataType:"jsonp",
                success:function (json) {
                    if(json && json.segments){
                        for(var i = 0; i < json.segments.length; i++){
                            json.segments[i] = json.segments[i].replace(/&#46;/g, ".");
                        }
                        _segments = json.segments;
                    }
                }
            }),
            $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.data.r+"/actions",
                data:{
                    "api_key":countlyGlobal.member.api_key,
                    "app_id":countlyCommon.ACTIVE_APP_ID,
                    "view":view,
                    "segment": _segment,
                    "period":_period
                },
                dataType:"json",
                success:function (json) {
                    _actionData = json;
                }
            })
        ).then(function(){
            return true;
        });
	};
    
    countlyMetric.testUrl = function(url, callback){
        $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/urltest",
            data:{
                "url":url
            },
            dataType:"json",
            success:function (json) {
                if(callback)
                    callback(json.result);
            }
        });
    };
    
    countlyMetric.getActionsData = function (view) {
        return _actionData;
    };
    
    countlyMetric.getChartData = function(path, metric, name){
		var chartData = [
                { data:[], label:name, color:'#DDDDDD', mode:"ghost" },
                { data:[], label:name, color:'#333933' }
            ],
            dataProps = [
                {
                    name:"p"+metric,
                    func:function (dataObj) {
                        return dataObj[metric]
                    },
                    period:"previous"
                },
                { name:metric}
            ];

        return countlyCommon.extractChartData(_Db, countlyMetric.clearObject, chartData, dataProps, path);
	};

	countlyMetric.getData = function (clean) {

		var chartData = countlyCommon.extractTwoLevelData(_Db, _metrics, this.clearObject, [
			{
				name:_name,
				func:function (rangeArr, dataObj) {
                    return rangeArr;
				}
			},
			{ "name":"u" },
			{ "name":"t" },
			{ "name":"s" },
			{ "name":"b" },
			{ "name":"e" },
			{ "name":"d" },
			{ "name":"n" }
		]);

        chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, _name);

		return chartData;
	};

	countlyMetric.clearObject = function (obj) {
		if (obj) {
			if (!obj["u"]) obj["u"] = 0;
			if (!obj["t"]) obj["t"] = 0;
			if (!obj["n"]) obj["n"] = 0;
			if (!obj["s"]) obj["s"] = 0;
			if (!obj["e"]) obj["e"] = 0;
			if (!obj["b"]) obj["b"] = 0;
			if (!obj["d"]) obj["d"] = 0;
		}
		else {
			obj = {"u":0, "t":0, "n":0, "s":0, "e":0, "b":0, "d":0};
		}

		return obj;
	};

	countlyMetric.getBars = function () {
		return countlyCommon.extractBarData(_Db, _metrics, this.clearObject, fetchValue);
	};
    
    countlyMetric.getViewFrequencyData = function () {
        var _sessionDb = countlySession.getSessionDb();
        if(_frequency.length){
            if (_sessionDb['meta']) {
                _frequency = countlyCommon.union(_frequency, _sessionDb['meta']['v-ranges']);
            }
        }
        else{
            if (_sessionDb['meta']) {
                _frequency = (_sessionDb['meta']['v-ranges']) ? _sessionDb['meta']['v-ranges'] : [];
            } else {
                _frequency = [];
            }
        }
        var chartData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

        chartData.chartData = countlyCommon.extractRangeData(_sessionDb, "vc", _frequency, countlyMetric.explainFrequencyRange);

        var durations = _.pluck(chartData.chartData, "vc"),
            durationTotals = _.pluck(chartData.chartData, "t"),
            chartDP = [
                {data:[]}
            ];

        chartDP[0]["data"][0] = [-1, null];
        chartDP[0]["data"][durations.length + 1] = [durations.length, null];

        chartData.chartDP.ticks.push([-1, ""]);
        chartData.chartDP.ticks.push([durations.length, ""]);

        for (var i = 0; i < durations.length; i++) {
            chartDP[0]["data"][i + 1] = [i, durationTotals[i]];
            chartData.chartDP.ticks.push([i, durations[i]]);
        }

        chartData.chartDP.dp = chartDP;

        for (var i = 0; i < chartData.chartData.length; i++) {
            chartData.chartData[i]["percent"] = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i]["percent"]) + "px;'></div>" + chartData.chartData[i]["percent"] + "%";
        }

        return chartData;
    };
    
    countlyMetric.explainFrequencyRange = function (index) {
        var visits = jQuery.i18n.map["views.visits"].toLowerCase();
        var range = [
            "1 - 2 " + visits,
            "3 - 5 " + visits,
            "6 - 10 " + visits,
            "11 - 15 " + visits,
            "16 - 30 " + visits,
            "31 - 50 " + visits,
            "51 - 100 " + visits,
            "> 100 " + visits
        ];

        return range[index];
    };

    countlyMetric.getFrequencyIndex = function (value) {
        var visits = jQuery.i18n.map["views.visits"].toLowerCase();

        var range = [
            "1 - 2 " + visits,
            "3 - 5 " + visits,
            "6 - 10 " + visits,
            "11 - 15 " + visits,
            "16 - 30 " + visits,
            "31 - 50 " + visits,
            "51 - 100 " + visits,
            "> 100 " + visits
        ];

        return range.indexOf(value);
    };

	function setMeta() {
		if (_Db['meta']) {
			_metrics = (_Db['meta'][_name]) ? _Db['meta'][_name] : [];
		} else {
			_metrics = [];
		}
	}

	function extendMeta() {
		if (_Db['meta']) {
			_metrics = countlyCommon.union(_metrics, _Db['meta'][_name]);
		}
	}

})(window.countlyViews = window.countlyViews || {}, "views", jQuery);;'use strict';

if (typeof module !== 'undefined') module.exports = simpleheat;

function simpleheat(canvas) {
    if (!(this instanceof simpleheat)) return new simpleheat(canvas);

    this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

    this._ctx = canvas.getContext('2d');
    this._width = canvas.width;
    this._height = canvas.height;

    this._max = 1;
    this._data = [];
}

simpleheat.prototype = {

    defaultRadius: 25,

    defaultGradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
    },

    data: function (data) {
        this._data = data;
        return this;
    },

    max: function (max) {
        this._max = max;
        return this;
    },

    add: function (point) {
        this._data.push(point);
        return this;
    },

    clear: function () {
        this._data = [];
        return this;
    },

    radius: function (r, blur) {
        blur = blur === undefined ? 15 : blur;

        // create a grayscale blurred circle image that we'll use for drawing points
        var circle = this._circle = document.createElement('canvas'),
            ctx = circle.getContext('2d'),
            r2 = this._r = r + blur;

        circle.width = circle.height = r2 * 2;

        ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
        ctx.shadowBlur = blur;
        ctx.shadowColor = 'black';

        ctx.beginPath();
        ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        return this;
    },

    resize: function () {
        this._width = this._canvas.width;
        this._height = this._canvas.height;
    },

    gradient: function (grad) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 1;
        canvas.height = 256;

        for (var i in grad) {
            gradient.addColorStop(i, grad[i]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        this._grad = ctx.getImageData(0, 0, 1, 256).data;

        return this;
    },

    draw: function (minOpacity) {
        if (!this._circle) this.radius(this.defaultRadius);
        if (!this._grad) this.gradient(this.defaultGradient);

        var ctx = this._ctx;

        ctx.clearRect(0, 0, this._width, this._height);

        // draw a grayscale heatmap by putting a blurred circle at each data point
        for (var i = 0, len = this._data.length, p; i < len; i++) {
            p = this._data[i];
            ctx.globalAlpha = Math.max(p[2] / this._max, minOpacity === undefined ? 0.05 : minOpacity);
            ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
        }

        // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
        var colored = ctx.getImageData(0, 0, this._width, this._height);
        this._colorize(colored.data, this._grad);
        ctx.putImageData(colored, 0, 0);

        return this;
    },

    _colorize: function (pixels, gradient) {
        for (var i = 0, len = pixels.length, j; i < len; i += 4) {
            j = pixels[i + 3] * 4; // get gradient color from opacity value

            if (j) {
                pixels[i] = gradient[j];
                pixels[i + 1] = gradient[j + 1];
                pixels[i + 2] = gradient[j + 2];
            }
        }
    }
};;window.ViewsView = countlyView.extend({
    selectedMetric:"u",
    selectedView:null,
    selectedViews:[],
	selectedApps: {all:true},
	selectedCount: 0,
    ids:{},
    lastId:0,
    beforeRender: function() {
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/views/templates/views.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyViews.initialize()).then(function () {});
    },
    getProperties: function(metric){
        return {
            "u":jQuery.i18n.map["common.table.total-users"],
            "n":jQuery.i18n.map["common.table.new-users"],
            "t":jQuery.i18n.map["views.total-visits"],
            "d":jQuery.i18n.map["views.duration"],
            "s":jQuery.i18n.map["views.starts"],
            "e":jQuery.i18n.map["views.exits"],
            "b":jQuery.i18n.map["views.bounces"] 
        }
    },
    renderCommon:function (isRefresh) {
        var self = this;
        var data = countlyViews.getData();
        var props = this.getProperties();
        var usage = [];
        
        for(var i in props){
            usage.push({
                    "title":props[i],
                    "id":"view-metric-"+i
                });
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["views.title"],
            "font-logo-class":"fa-eye",
            "active-segmentation": jQuery.i18n.map["views.all-segments"],
            "segmentations": countlyViews.getSegments(),
            "usage":usage
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            
            var columns = [
                { "mData": function(row, type){if(type == "display"){ return row.views+"<div class='color'></div>";} else return row.views;}, sType:"string", "sTitle": jQuery.i18n.map["views.table.view"] , "sClass": "break", "sWidth": "30%"},
                { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] },
                { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["views.total-visits"] },
                { "mData": function(row, type){if(row.d == 0 || row.t == 0) return 0; else return row.d/row.t;}, sType:"formatted-num", "mRender":function(d) { return countlyCommon.timeString(d/60); }, "sTitle": jQuery.i18n.map["views.avg-duration"] },
                { "mData": "s", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["views.starts"] },
                { "mData": "e", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["views.exits"] },
                { "mData": "b", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["views.bounces"] }
            ];
            
            if(typeof addDrill != "undefined"){
                $(".widget-header .left .title").after(addDrill("up.lv"));
                if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "web"){
                    columns.push({ "mData": function(row, type){return '<a href="#/analytics/views/action-map/'+row.views+'" class="icon-button green btn-header btn-view-map" data-localize="views.table.view" style="margin:0px; padding:2px;">View</a>';}, sType:"string", "sTitle": jQuery.i18n.map["views.action-map"], "sClass":"shrink center"  });
                }
            }

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    if(!self.selectedView){
                        self.selectedView = aData.views;
                        self.selectedViews.push(self.selectedView);
                    }

                    if(_.contains(self.selectedViews, aData.views))
                        $(nRow).addClass("selected");
                    
                    if(!self.ids[aData.views]){
                        self.ids[aData.views] = "view_"+self.lastId;
                        self.lastId++;
                    }
                    $(nRow).attr("id", self.ids[aData.views]);
                },
                "aoColumns": columns
            }));

            $(".d-table").stickyTableHeaders();
            $(".dataTable-bottom").append("<div clas='dataTables_info' style='float: right; margin-top:2px; margin-right: 10px;'>"+jQuery.i18n.map["views.maximum-items"]+" ("+countlyCommon.GRAPH_COLORS.length+")</div>")
            
            $('.views-table tbody').on("click", "tr", function (event){
                var row = $(this);
                
                self.selectedView = row.find("td").first().text();
                if(_.contains(self.selectedViews, self.selectedView)){
                    var index = self.selectedViews.indexOf(self.selectedView);
                    self.selectedViews.splice(index, 1);
                    row.removeClass("selected");
                    row.find(".color").css("background-color", "transparent");
                }
                else if(self.selectedViews.length < countlyCommon.GRAPH_COLORS.length){
                    self.selectedViews.push(self.selectedView);
                    row.addClass("selected");
                }
                if(self.selectedViews.length == 0)
                    $("#empty-graph").show();
                else
                    $("#empty-graph").hide();
                self.drawGraph();
            });
            
            $("#view-metric-"+this.selectedMetric).parents(".big-numbers").addClass("active");
            
            $(".widget-content .inner").click(function () {
                $(".big-numbers").removeClass("active");
                $(".big-numbers .select").removeClass("selected");
                $(this).parent(".big-numbers").addClass("active");
                $(this).find('.select').addClass("selected");
            });
            
            $(".segmentation-option").on("click", function () {
                countlyViews.reset();
				countlyViews.setSegment($(this).data("value"));
                self.refresh();
			});
    
            $(".big-numbers .inner").click(function () {
                var elID = $(this).find('.select').attr("id").replace("view-metric-", "");
    
                if (self.selectedMetric == elID) {
                    return true;
                }
    
                self.selectedMetric = elID;
                self.drawGraph();
            });
            
            this.drawGraph();
        }
    },
    drawGraph: function(){
        var props = this.getProperties();
        var dp = [];
        for(var i = 0;  i < this.selectedViews.length; i++){
            var color = countlyCommon.GRAPH_COLORS[i];
            var data = countlyViews.getChartData(this.selectedViews[i], this.selectedMetric, props[this.selectedMetric]).chartDP;
            data[1].color = color;
            $("#"+this.ids[this.selectedViews[i]]+" .color").css("background-color", color);
            if(this.selectedViews.length == 1){
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                data[0].color = "rgba("+parseInt(result[1], 16)+","+parseInt(result[2], 16)+","+parseInt(result[3], 16)+",0.5"+")";
                dp.push(data[0])
            }
            dp.push(data[1]);
        }
        countlyCommon.drawTimeGraph(dp, "#dashboard-graph");
    },
    refresh:function () {
        var self = this;
        $.when(countlyViews.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var data = countlyViews.getData();
            CountlyHelpers.refreshTable(self.dtable, data.chartData);
            self.drawGraph();
        });
    }
});

window.ViewFrequencyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var durationData = countlyViews.getViewFrequencyData();

        this.templateData = {
            "page-title":jQuery.i18n.map["views.view-frequency"],
            "font-logo-class":"fa-eye"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": durationData.chartData,
                "aoColumns": [
                    { "mData": "vc", sType:"view-frequency", "sTitle": jQuery.i18n.map["views.view-frequency"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-sessions"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
            
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyUser.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var durationData = countlyViews.getViewFrequencyData();
            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, durationData.chartData);
        });
    }
});

window.ActionMapView = countlyView.extend({
    actionType: "",
    curSegment: 0,
    beforeRender: function() {
        var self = this;
        return $.when($.get(countlyGlobal["path"]+'/views/templates/actionmap.html', function(src){
			self.template = Handlebars.compile(src);
		}), countlyViews.loadActionsData(this.view)).then(function () {});
    },
    getData: function(data){
        var heat = [];
        var point;
        var width = $("#view-canvas-map").prop('width');
        var height = $("#view-canvas-map").prop('height');
        for(var i = 0; i < data.length; i++){
            point = data[i].sg;
            if(point.type == this.actionType)
                heat.push([parseInt((point.x/point.width)*width), parseInt((point.y/point.height)*height), data[i].c])
        }
        return heat;
    },
    getMaxHeight: function(data){
        var width = $("#view-map").width();
        var lowest = {w:0, h:0};
        var highest = {w:100000, h:5000};
        for(var i = 0; i < data.length; i++){
            if(width == data[i].sg.width)
                return data[i].sg.height;
            else if(width > data[i].sg.width && lowest.w < data[i].sg.width){
                lowest.w = data[i].sg.width;
                lowest.h = data[i].sg.height;
            }
        }

        if(lowest.h > 0)
            return lowest.h;
        
        for(var i = 0; i < data.length; i++){
            if(width < data[i].sg.width && highest.w > data[i].sg.width){
                highest.w = data[i].sg.width;
                highest.h = data[i].sg.height;
            }
        }
        
        return highest.h;
    },
    getResolutions: function(data){
        var res = ["Normal"];
        var exist = {};
        for(var i = 0; i < data.length; i++){
            if(!exist[data[i].sg.width+" x "+data[i].sg.height]){
                exist[data[i].sg.width+" x "+data[i].sg.height] = true;
                res.push(data[i].sg.width+" x "+data[i].sg.height);
            }
        }
        return res;
    },
    resize: function(){
        $('#view-canvas-map').prop('width', $("#view-map").width());
        $('#view-canvas-map').prop('height', $("#view-map").height());
        if(this.map)
            this.map.resize();
    },
    loadIframe: function(){
        var self = this;
        var segments = countlyViews.getActionsData().domains;
        var url = location.protocol+"//"+segments[self.curSegment]+self.view;
        if($("#view_loaded_url").val().length == 0)
            $("#view_loaded_url").val(url);
        countlyViews.testUrl(url, function(result){
            if(result){
                $("#view-map iframe").attr("src", "/o/urlredir?url="+encodeURIComponent(url));
                $("#view_loaded_url").val(url);
            }
            else{
                self.curSegment++;
                if(segments[self.curSegment]){
                    self.loadIframe();
                }
                else{
                    $("#view_loaded_url").show();
                    CountlyHelpers.alert(jQuery.i18n.map["views.cannot-load"], "red");
                }
            }
        });
    },
    renderCommon:function (isRefresh) {
        var data = countlyViews.getActionsData();
        this.actionType = data.types[0] || jQuery.i18n.map["views.select-action-type"];
        var segments = countlyViews.getSegments();
        var self = this;
        this.templateData = {
            "page-title":jQuery.i18n.map["views.action-map"],
            "font-logo-class":"fa-eye",
            "first-type":this.actionType,
            "active-segmentation": jQuery.i18n.map["views.all-segments"],
            "segmentations": segments,
            "data":data
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#view-map").height(this.getMaxHeight(data.data));
            this.resize();
            this.loadIframe();
            this.map = simpleheat("view-canvas-map");
            this.map.data(this.getData(data.data));
            var r = Math.max((48500-35*data.data.length)/900, 5);
            this.map.radius(r, r*1.6);
            this.map.draw();
            
            $("#date-selector").after('<a class="icon-button light btn-header btn-back-view" data-localize="views.back"><i class="fa fa-chevron-left"></i> Back</a>');
            app.localize();
            $('.btn-back-view').off('click').on('click', function(){
                window.location.hash = "/analytics/views";
            });
            
            $("#view_reload_url").on("click", function () {
				$("#view-map iframe").attr("src", "/o/urlredir?url="+encodeURIComponent($("#view_loaded_url").val()));
			});
            
            $("#view_loaded_url").keyup(function(event){
                if(event.keyCode == 13){
                    $("#view_reload_url").click();
                }
            });
            
            $("#action-map-type .segmentation-option").on("click", function () {
				self.actionType = $(this).data("value");
                self.refresh();
			});
            
            $("#action-map-resolution .segmentation-option").on("click", function () {
                switch ($(this).data("value")) {
                    case "Normal":
                        $("#view-map").width("100%");
                        $("#view-map").height(4500);
                        $("#view-map").prependTo("#view-map-container");
                        break;
                    case "Fullscreen":
                        $("#view-map").width("100%");
                        $("#view-map").height(4500);
                        $("#view-map").prependTo(document.body);
                        break;
                    default:
                        var parts = $(this).data("value").split(" x ");
                        $("#view-map").width(parts[0]);
                        $("#view-map").height(parts[1]);
                        $("#view-map").prependTo("#view-map-container");
                }
				self.resize();
                self.refresh();
			});
            
            $("#view-segments .segmentation-option").on("click", function () {
                countlyViews.reset();
				countlyViews.setSegment($(this).data("value"));
                self.refresh();
			});
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyViews.loadActionsData(this.view)).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            var data = countlyViews.getActionsData();
            if(self.map){
                self.map.clear();
                self.map.data(self.getData(data.data));
                var r = Math.max((48500-35*data.data.length)/900, 5);
                self.map.radius(r, r*1.6);
                self.map.draw();
            }
        });
    }
});
//register views
app.viewsView = new ViewsView();
app.viewFrequencyView = new ViewFrequencyView();
app.actionMapView = new ActionMapView();

app.route("/analytics/views", 'views', function () {
	this.renderWhenReady(this.viewsView);
});

app.route("/analytics/view-frequency", 'views', function () {
	this.renderWhenReady(this.viewFrequencyView);
});

app.route("/analytics/views/action-map/*view", 'views', function (view) {
    this.actionMapView.view = view;
	this.renderWhenReady(this.actionMapView);
});

$( document ).ready(function() {
    if(!production){
        CountlyHelpers.loadJS("views/javascripts/simpleheat.js");
    }
    jQuery.fn.dataTableExt.oSort['view-frequency-asc']  = function(x, y) {
        x = countlyViews.getFrequencyIndex(x);
        y = countlyViews.getFrequencyIndex(y);

        return ((x < y) ? -1 : ((x > y) ?  1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['view-frequency-desc']  = function(x, y) {
        x = countlyViews.getFrequencyIndex(x);
        y = countlyViews.getFrequencyIndex(y);

        return ((x < y) ?  1 : ((x > y) ? -1 : 0));
    };
	var menu = '<a href="#/analytics/views" class="item">'+
		'<div class="logo-icon fa fa-eye"></div>'+
		'<div class="text" data-localize="views.title"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').append(menu);
	$('#mobile-type #analytics-submenu').append(menu);
    
    var menu = '<a href="#/analytics/view-frequency" class="item">'+
		'<div class="logo-icon fa fa-eye"></div>'+
		'<div class="text" data-localize="views.view-frequency"></div>'+
	'</a>';
	$('#web-type #engagement-submenu').append(menu);
	$('#mobile-type #engagement-submenu').append(menu);
});;;(function(k,f,c,j,d,l,g){/*! Jssor */
    new(function(){this.$DebugMode=d;this.$Log=function(c,d){var a=k.console||{},b=this.$DebugMode;if(b&&a.log)a.log(c);else b&&d&&alert(c)};this.$Error=function(b,d){var c=k.console||{},a=this.$DebugMode;if(a&&c.error)c.error(b);else a&&alert(b);if(a)throw d||new Error(b);};this.$Fail=function(a){throw new Error(a);};this.$Assert=function(b,c){var a=this.$DebugMode;if(a)if(!b)throw new Error("Assert failed "+c||"");};this.$Trace=function(c){var a=k.console||{},b=this.$DebugMode;b&&a.log&&a.log(c)};this.$Execute=function(b){var a=this.$DebugMode;a&&b()};this.$LiveStamp=function(c,d){var b=this.$DebugMode;if(b){var a=f.createElement("DIV");a.setAttribute("id",d);c.$Live=a}};this.$C_AbstractProperty=function(){throw new Error("The property is abstract, it should be implemented by subclass.");};this.$C_AbstractMethod=function(){throw new Error("The method is abstract, it should be implemented by subclass.");};function a(b){if(b.constructor===a.caller)throw new Error("Cannot create instance of an abstract class.");}this.$C_AbstractClass=a});var e=k.$JssorEasing$={$EaseSwing:function(a){return-c.cos(a*c.PI)/2+.5},$EaseLinear:function(a){return a},$EaseInQuad:function(a){return a*a},$EaseOutQuad:function(a){return-a*(a-2)},$EaseInOutQuad:function(a){return(a*=2)<1?1/2*a*a:-1/2*(--a*(a-2)-1)},$EaseInCubic:function(a){return a*a*a},$EaseOutCubic:function(a){return(a-=1)*a*a+1},$EaseInOutCubic:function(a){return(a*=2)<1?1/2*a*a*a:1/2*((a-=2)*a*a+2)},$EaseInQuart:function(a){return a*a*a*a},$EaseOutQuart:function(a){return-((a-=1)*a*a*a-1)},$EaseInOutQuart:function(a){return(a*=2)<1?1/2*a*a*a*a:-1/2*((a-=2)*a*a*a-2)},$EaseInQuint:function(a){return a*a*a*a*a},$EaseOutQuint:function(a){return(a-=1)*a*a*a*a+1},$EaseInOutQuint:function(a){return(a*=2)<1?1/2*a*a*a*a*a:1/2*((a-=2)*a*a*a*a+2)},$EaseInSine:function(a){return 1-c.cos(a*c.PI/2)},$EaseOutSine:function(a){return c.sin(a*c.PI/2)},$EaseInOutSine:function(a){return-1/2*(c.cos(c.PI*a)-1)},$EaseInExpo:function(a){return a==0?0:c.pow(2,10*(a-1))},$EaseOutExpo:function(a){return a==1?1:-c.pow(2,-10*a)+1},$EaseInOutExpo:function(a){return a==0||a==1?a:(a*=2)<1?1/2*c.pow(2,10*(a-1)):1/2*(-c.pow(2,-10*--a)+2)},$EaseInCirc:function(a){return-(c.sqrt(1-a*a)-1)},$EaseOutCirc:function(a){return c.sqrt(1-(a-=1)*a)},$EaseInOutCirc:function(a){return(a*=2)<1?-1/2*(c.sqrt(1-a*a)-1):1/2*(c.sqrt(1-(a-=2)*a)+1)},$EaseInElastic:function(a){if(!a||a==1)return a;var b=.3,d=.075;return-(c.pow(2,10*(a-=1))*c.sin((a-d)*2*c.PI/b))},$EaseOutElastic:function(a){if(!a||a==1)return a;var b=.3,d=.075;return c.pow(2,-10*a)*c.sin((a-d)*2*c.PI/b)+1},$EaseInOutElastic:function(a){if(!a||a==1)return a;var b=.45,d=.1125;return(a*=2)<1?-.5*c.pow(2,10*(a-=1))*c.sin((a-d)*2*c.PI/b):c.pow(2,-10*(a-=1))*c.sin((a-d)*2*c.PI/b)*.5+1},$EaseInBack:function(a){var b=1.70158;return a*a*((b+1)*a-b)},$EaseOutBack:function(a){var b=1.70158;return(a-=1)*a*((b+1)*a+b)+1},$EaseInOutBack:function(a){var b=1.70158;return(a*=2)<1?1/2*a*a*(((b*=1.525)+1)*a-b):1/2*((a-=2)*a*(((b*=1.525)+1)*a+b)+2)},$EaseInBounce:function(a){return 1-e.$EaseOutBounce(1-a)},$EaseOutBounce:function(a){return a<1/2.75?7.5625*a*a:a<2/2.75?7.5625*(a-=1.5/2.75)*a+.75:a<2.5/2.75?7.5625*(a-=2.25/2.75)*a+.9375:7.5625*(a-=2.625/2.75)*a+.984375},$EaseInOutBounce:function(a){return a<1/2?e.$EaseInBounce(a*2)*.5:e.$EaseOutBounce(a*2-1)*.5+.5},$EaseGoBack:function(a){return 1-c.abs(2-1)},$EaseInWave:function(a){return 1-c.cos(a*c.PI*2)},$EaseOutWave:function(a){return c.sin(a*c.PI*2)},$EaseOutJump:function(a){return 1-((a*=2)<1?(a=1-a)*a*a:(a-=1)*a*a)},$EaseInJump:function(a){return(a*=2)<1?a*a*a:(a=2-a)*a*a}},h=k.$Jease$={$Swing:e.$EaseSwing,$Linear:e.$EaseLinear,$InQuad:e.$EaseInQuad,$OutQuad:e.$EaseOutQuad,$InOutQuad:e.$EaseInOutQuad,$InCubic:e.$EaseInCubic,$OutCubic:e.$EaseOutCubic,$InOutCubic:e.$EaseInOutCubic,$InQuart:e.$EaseInQuart,$OutQuart:e.$EaseOutQuart,$InOutQuart:e.$EaseInOutQuart,$InQuint:e.$EaseInQuint,$OutQuint:e.$EaseOutQuint,$InOutQuint:e.$EaseInOutQuint,$InSine:e.$EaseInSine,$OutSine:e.$EaseOutSine,$InOutSine:e.$EaseInOutSine,$InExpo:e.$EaseInExpo,$OutExpo:e.$EaseOutExpo,$InOutExpo:e.$EaseInOutExpo,$InCirc:e.$EaseInCirc,$OutCirc:e.$EaseOutCirc,$InOutCirc:e.$EaseInOutCirc,$InElastic:e.$EaseInElastic,$OutElastic:e.$EaseOutElastic,$InOutElastic:e.$EaseInOutElastic,$InBack:e.$EaseInBack,$OutBack:e.$EaseOutBack,$InOutBack:e.$EaseInOutBack,$InBounce:e.$EaseInBounce,$OutBounce:e.$EaseOutBounce,$InOutBounce:e.$EaseInOutBounce,$GoBack:e.$EaseGoBack,$InWave:e.$EaseInWave,$OutWave:e.$EaseOutWave,$OutJump:e.$EaseOutJump,$InJump:e.$EaseInJump};k.$JssorDirection$={$TO_LEFT:1,$TO_RIGHT:2,$TO_TOP:4,$TO_BOTTOM:8,$HORIZONTAL:3,$VERTICAL:12,$GetDirectionHorizontal:function(a){return a&3},$GetDirectionVertical:function(a){return a&12},$IsHorizontal:function(a){return a&3},$IsVertical:function(a){return a&12}};var b=k.$Jssor$=new function(){var h=this,Ab=/\S+/g,L=1,jb=2,nb=3,mb=4,rb=5,M,s=0,i=0,t=0,z=0,A=0,D=navigator,vb=D.appName,o=D.userAgent,y=f.documentElement,q=parseFloat;function Jb(){if(!M){M={$Touchable:"ontouchstart"in k||"createTouch"in f};var a;if(D.pointerEnabled||(a=D.msPointerEnabled))M.$TouchActionAttr=a?"msTouchAction":"touchAction"}return M}function v(h){if(!s){s=-1;if(vb=="Microsoft Internet Explorer"&&!!k.attachEvent&&!!k.ActiveXObject){var e=o.indexOf("MSIE");s=L;t=q(o.substring(e+5,o.indexOf(";",e)));/*@cc_on z=@_jscript_version@*/;i=f.documentMode||t}else if(vb=="Netscape"&&!!k.addEventListener){var d=o.indexOf("Firefox"),b=o.indexOf("Safari"),g=o.indexOf("Chrome"),c=o.indexOf("AppleWebKit");if(d>=0){s=jb;i=q(o.substring(d+8))}else if(b>=0){var j=o.substring(0,b).lastIndexOf("/");s=g>=0?mb:nb;i=q(o.substring(j+1,b))}else{var a=/Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/i.exec(o);if(a){s=L;i=t=q(a[1])}}if(c>=0)A=q(o.substring(c+12))}else{var a=/(opera)(?:.*version|)[ \/]([\w.]+)/i.exec(o);if(a){s=rb;i=q(a[2])}}}return h==s}function r(){return v(L)}function T(){return r()&&(i<6||f.compatMode=="BackCompat")}function Bb(){return v(jb)}function lb(){return v(nb)}function Eb(){return v(mb)}function qb(){return v(rb)}function gb(){return lb()&&A>534&&A<535}function H(){v();return A>537||i>42||s==L&&i>=11}function R(){return r()&&i<9}function hb(a){var b,c;return function(f){if(!b){b=d;var e=a.substr(0,1).toUpperCase()+a.substr(1);n([a].concat(["WebKit","ms","Moz","O","webkit"]),function(h,d){var b=a;if(d)b=h+e;if(f.style[b]!=g)return c=b})}return c}}function fb(b){var a;return function(c){a=a||hb(b)(c)||b;return a}}var N=fb("transform");function ub(a){return{}.toString.call(a)}var K;function Gb(){if(!K){K={};n(["Boolean","Number","String","Function","Array","Date","RegExp","Object"],function(a){K["[object "+a+"]"]=a.toLowerCase()})}return K}function n(b,d){var a,c;if(ub(b)=="[object Array]"){for(a=0;a<b.length;a++)if(c=d(b[a],a,b))return c}else for(a in b)if(c=d(b[a],a,b))return c}function F(a){return a==j?String(a):Gb()[ub(a)]||"object"}function sb(a){for(var b in a)return d}function B(a){try{return F(a)=="object"&&!a.nodeType&&a!=a.window&&(!a.constructor||{}.hasOwnProperty.call(a.constructor.prototype,"isPrototypeOf"))}catch(b){}}function p(a,b){return{x:a,y:b}}function yb(b,a){setTimeout(b,a||0)}function C(b,d,c){var a=!b||b=="inherit"?"":b;n(d,function(c){var b=c.exec(a);if(b){var d=a.substr(0,b.index),e=a.substr(b.index+b[0].length+1,a.length-1);a=d+e}});a=c+(!a.indexOf(" ")?"":" ")+a;return a}function U(b,a){if(i<9)b.style.filter=a}h.$Device=Jb;h.$IsBrowserIE=r;h.$IsBrowserIeQuirks=T;h.$IsBrowserFireFox=Bb;h.$IsBrowserSafari=lb;h.$IsBrowserChrome=Eb;h.$IsBrowserOpera=qb;h.$IsBrowserBadTransform=gb;h.$IsBrowser3dSafe=H;h.$IsBrowserIe9Earlier=R;h.$GetTransformProperty=hb("transform");h.$BrowserVersion=function(){return i};h.$BrowserEngineVersion=function(){return t||i};h.$WebKitVersion=function(){v();return A};h.$Delay=yb;h.$Inherit=function(a,b){b.call(a);return E({},a)};function bb(a){a.constructor===bb.caller&&a.$Construct&&a.$Construct.apply(a,bb.caller.arguments)}h.$Construct=bb;h.$GetElement=function(a){if(h.$IsString(a))a=f.getElementById(a);return a};function u(a){return a||k.event}h.$GetEvent=u;h.$EvtSrc=function(b){b=u(b);var a=b.target||b.srcElement||f;if(a.nodeType==3)a=h.$ParentNode(a);return a};h.$EvtTarget=function(a){a=u(a);return a.relatedTarget||a.toElement};h.$EvtWhich=function(a){a=u(a);return a.which||([0,1,3,0,2])[a.button]||a.charCode||a.keyCode};h.$MousePosition=function(a){a=u(a);return{x:a.pageX||a.clientX||0,y:a.pageY||a.clientY||0}};h.$PageScroll=function(){var a=f.body;return{x:(k.pageXOffset||y.scrollLeft||a.scrollLeft||0)-(y.clientLeft||a.clientLeft||0),y:(k.pageYOffset||y.scrollTop||a.scrollTop||0)-(y.clientTop||a.clientTop||0)}};h.$WindowSize=function(){var a=f.body;return{x:a.clientWidth||y.clientWidth,y:a.clientHeight||y.clientHeight}};function G(c,d,a){if(a!==g)c.style[d]=a==g?"":a;else{var b=c.currentStyle||c.style;a=b[d];if(a==""&&k.getComputedStyle){b=c.ownerDocument.defaultView.getComputedStyle(c,j);b&&(a=b.getPropertyValue(d)||b[d])}return a}}function db(b,c,a,d){if(a!==g){if(a==j)a="";else d&&(a+="px");G(b,c,a)}else return q(G(b,c))}function Kb(b,c,a){return db(b,c,a,d)}function m(c,a){var d=a?db:G,b;if(a&4)b=fb(c);return function(e,f){return d(e,b?b(e):c,f,a&2)}}function Db(b){if(r()&&t<9){var a=/opacity=([^)]*)/.exec(b.style.filter||"");return a?q(a[1])/100:1}else return q(b.style.opacity||"1")}function Fb(b,a,f){if(r()&&t<9){var h=b.style.filter||"",i=new RegExp(/[\s]*alpha\([^\)]*\)/g),e=c.round(100*a),d="";if(e<100||f)d="alpha(opacity="+e+") ";var g=C(h,[i],d);U(b,g)}else b.style.opacity=a==1?"":c.round(a*100)/100}var O={$Rotate:["rotate"],$RotateX:["rotateX"],$RotateY:["rotateY"],$SkewX:["skewX"],$SkewY:["skewY"]};if(!H())O=E(O,{$ScaleX:["scaleX",2],$ScaleY:["scaleY",2],$TranslateZ:["translateZ",1]});function P(d,a){var c="";if(a){if(r()&&i&&i<10){delete a.$RotateX;delete a.$RotateY;delete a.$TranslateZ}b.$Each(a,function(d,b){var a=O[b];if(a){var e=a[1]||0;if(Q[b]!=d)c+=" "+a[0]+"("+d+(["deg","px",""])[e]+")"}});if(H()){if(a.$TranslateX||a.$TranslateY||a.$TranslateZ)c+=" translate3d("+(a.$TranslateX||0)+"px,"+(a.$TranslateY||0)+"px,"+(a.$TranslateZ||0)+"px)";if(a.$ScaleX==g)a.$ScaleX=1;if(a.$ScaleY==g)a.$ScaleY=1;if(a.$ScaleX!=1||a.$ScaleY!=1)c+=" scale3d("+a.$ScaleX+", "+a.$ScaleY+", 1)"}}d.style[N(d)]=c}h.$CssTransformOrigin=m("transformOrigin",4);h.$CssBackfaceVisibility=m("backfaceVisibility",4);h.$CssTransformStyle=m("transformStyle",4);h.$CssPerspective=m("perspective",6);h.$CssPerspectiveOrigin=m("perspectiveOrigin",4);h.$CssScale=function(a,b){if(r()&&t<9||t<10&&T())a.style.zoom=b==1?"":b;else{var c=N(a),f="scale("+b+")",e=a.style[c],g=new RegExp(/[\s]*scale\(.*?\)/g),d=C(e,[g],f);a.style[c]=d}};var pb=0,kb=0;h.$WindowResizeFilter=function(b,a){return R()?function(){var g=d,c=T()?b.document.body:b.document.documentElement;if(c){var f=c.offsetWidth-pb,e=c.offsetHeight-kb;if(f||e){pb+=f;kb+=e}else g=l}g&&a()}:a};h.$MouseOverOutFilter=function(b,a){return function(c){c=u(c);var e=c.type,d=c.relatedTarget||(e=="mouseout"?c.toElement:c.fromElement);(!d||d!==a&&!h.$IsChild(a,d))&&b(c)}};h.$AddEvent=function(a,c,d,b){a=h.$GetElement(a);if(a.addEventListener){c=="mousewheel"&&a.addEventListener("DOMMouseScroll",d,b);a.addEventListener(c,d,b)}else if(a.attachEvent){a.attachEvent("on"+c,d);b&&a.setCapture&&a.setCapture()}};h.$RemoveEvent=function(a,c,d,b){a=h.$GetElement(a);if(a.removeEventListener){c=="mousewheel"&&a.removeEventListener("DOMMouseScroll",d,b);a.removeEventListener(c,d,b)}else if(a.detachEvent){a.detachEvent("on"+c,d);b&&a.releaseCapture&&a.releaseCapture()}};h.$FireEvent=function(c,b){var a;if(f.createEvent){a=f.createEvent("HTMLEvents");a.initEvent(b,l,l);c.dispatchEvent(a)}else{var d="on"+b;a=f.createEventObject();c.fireEvent(d,a)}};h.$CancelEvent=function(a){a=u(a);a.preventDefault&&a.preventDefault();a.cancel=d;a.returnValue=l};h.$StopEvent=function(a){a=u(a);a.stopPropagation&&a.stopPropagation();a.cancelBubble=d};h.$CreateCallback=function(d,c){var a=[].slice.call(arguments,2),b=function(){var b=a.concat([].slice.call(arguments,0));return c.apply(d,b)};return b};h.$InnerText=function(a,b){if(b==g)return a.textContent||a.innerText;var c=f.createTextNode(b);h.$Empty(a);a.appendChild(c)};h.$InnerHtml=function(a,b){if(b==g)return a.innerHTML;a.innerHTML=b};h.$GetClientRect=function(b){var a=b.getBoundingClientRect();return{x:a.left,y:a.top,w:a.right-a.left,h:a.bottom-a.top}};h.$ClearInnerHtml=function(a){a.innerHTML=""};h.$EncodeHtml=function(b){var a=h.$CreateDiv();h.$InnerText(a,b);return h.$InnerHtml(a)};h.$DecodeHtml=function(b){var a=h.$CreateDiv();h.$InnerHtml(a,b);return h.$InnerText(a)};h.$SelectElement=function(c){var b;if(k.getSelection)b=k.getSelection();var a=j;if(f.createRange){a=f.createRange();a.selectNode(c)}else{a=f.body.createTextRange();a.moveToElementText(c);a.select()}b&&b.addRange(a)};h.$DeselectElements=function(){if(f.selection)f.selection.empty();else k.getSelection&&k.getSelection().removeAllRanges()};h.$Children=function(d,c){for(var b=[],a=d.firstChild;a;a=a.nextSibling)(c||a.nodeType==1)&&b.push(a);return b};function tb(a,c,e,b){b=b||"u";for(a=a?a.firstChild:j;a;a=a.nextSibling)if(a.nodeType==1){if(Y(a,b)==c)return a;if(!e){var d=tb(a,c,e,b);if(d)return d}}}h.$FindChild=tb;function W(a,d,f,b){b=b||"u";var c=[];for(a=a?a.firstChild:j;a;a=a.nextSibling)if(a.nodeType==1){Y(a,b)==d&&c.push(a);if(!f){var e=W(a,d,f,b);if(e.length)c=c.concat(e)}}return c}function ob(a,c,d){for(a=a?a.firstChild:j;a;a=a.nextSibling)if(a.nodeType==1){if(a.tagName==c)return a;if(!d){var b=ob(a,c,d);if(b)return b}}}h.$FindChildByTag=ob;function ib(a,c,e){var b=[];for(a=a?a.firstChild:j;a;a=a.nextSibling)if(a.nodeType==1){(!c||a.tagName==c)&&b.push(a);if(!e){var d=ib(a,c,e);if(d.length)b=b.concat(d)}}return b}h.$FindChildrenByTag=ib;h.$GetElementsByTag=function(b,a){return b.getElementsByTagName(a)};function E(){var e=arguments,d,c,b,a,h=1&e[0],f=1+h;d=e[f-1]||{};for(;f<e.length;f++)if(c=e[f])for(b in c){a=c[b];if(a!==g){a=c[b];var i=d[b];d[b]=h&&(B(i)||B(a))?E(h,{},i,a):a}}return d}h.$Extend=E;function cb(f,g){var d={},c,a,b;for(c in f){a=f[c];b=g[c];if(a!==b){var e;if(B(a)&&B(b)){a=cb(a,b);e=!sb(a)}!e&&(d[c]=a)}}return d}h.$Unextend=cb;h.$IsFunction=function(a){return F(a)=="function"};h.$IsArray=function(a){return F(a)=="array"};h.$IsString=function(a){return F(a)=="string"};h.$IsNumeric=function(a){return!isNaN(q(a))&&isFinite(a)};h.$Type=F;h.$Each=n;h.$IsNotEmpty=sb;h.$IsPlainObject=B;function V(a){return f.createElement(a)}h.$CreateElement=V;h.$CreateDiv=function(){return V("DIV")};h.$CreateSpan=function(){return V("SPAN")};h.$EmptyFunction=function(){};function Z(b,c,a){if(a==g)return b.getAttribute(c);b.setAttribute(c,a)}function Y(a,b){return Z(a,b)||Z(a,"data-"+b)}h.$Attribute=Z;h.$AttributeEx=Y;function x(b,a){if(a==g)return b.className;b.className=a}h.$ClassName=x;function xb(b){var a={};n(b,function(b){a[b]=b});return a}function Ib(b){var a=[];n(b,function(b){a.push(b)});return a}function zb(b,a){return b.match(a||Ab)}function S(b,a){return xb(zb(b||"",a))}h.$ToHash=xb;h.$FromHash=Ib;h.$Split=zb;function eb(b,c){var a="";n(c,function(c){a&&(a+=b);a+=c});return a}function J(a,c,b){x(a,eb(" ",E(cb(S(x(a)),S(c)),S(b))))}h.$Join=eb;h.$AddClass=function(b,a){J(b,j,a)};h.$RemoveClass=J;h.$ReplaceClass=J;h.$ParentNode=function(a){return a.parentNode};h.$HideElement=function(a){h.$CssDisplay(a,"none")};h.$EnableElement=function(a,b){if(b)h.$Attribute(a,"disabled",d);else h.$RemoveAttribute(a,"disabled")};h.$HideElements=function(b){for(var a=0;a<b.length;a++)h.$HideElement(b[a])};h.$ShowElement=function(a,b){h.$CssDisplay(a,b?"none":"")};h.$ShowElements=function(b,c){for(var a=0;a<b.length;a++)h.$ShowElement(b[a],c)};h.$RemoveAttribute=function(b,a){b.removeAttribute(a)};h.$CanClearClip=function(){return r()&&i<10};h.$SetStyleClip=function(d,a){if(a)d.style.clip="rect("+c.round(a.$Top)+"px "+c.round(a.$Right)+"px "+c.round(a.$Bottom)+"px "+c.round(a.$Left)+"px)";else if(a!==g){var h=d.style.cssText,f=[new RegExp(/[\s]*clip: rect\(.*?\)[;]?/i),new RegExp(/[\s]*cliptop: .*?[;]?/i),new RegExp(/[\s]*clipright: .*?[;]?/i),new RegExp(/[\s]*clipbottom: .*?[;]?/i),new RegExp(/[\s]*clipleft: .*?[;]?/i)],e=C(h,f,"");b.$CssCssText(d,e)}};h.$GetNow=function(){return+new Date};h.$AppendChild=function(b,a){b.appendChild(a)};h.$AppendChildren=function(b,a){n(a,function(a){h.$AppendChild(b,a)})};h.$InsertBefore=function(b,a,c){(c||a.parentNode).insertBefore(b,a)};h.$InsertAfter=function(b,a,c){h.$InsertBefore(b,a.nextSibling,c||a.parentNode)};h.$InsertAdjacentHtml=function(b,a,c){b.insertAdjacentHTML(a,c)};h.$RemoveElement=function(b,a){a=a||b.parentNode;a&&a.removeChild(b)};h.$RemoveElements=function(a,b){n(a,function(a){h.$RemoveElement(a,b)})};h.$Empty=function(a){h.$RemoveElements(h.$Children(a,d),a)};h.$CenterElement=function(a,b){var c=h.$ParentNode(a);b&1&&h.$CssLeft(a,(h.$CssWidth(c)-h.$CssWidth(a))/2);b&2&&h.$CssTop(a,(h.$CssHeight(c)-h.$CssHeight(a))/2)};h.$ParseInt=function(b,a){return parseInt(b,a||10)};h.$ParseFloat=q;h.$IsChild=function(b,a){var c=f.body;while(a&&b!==a&&c!==a)try{a=a.parentNode}catch(d){return l}return b===a};function ab(d,c,b){var a=d.cloneNode(!c);!b&&h.$RemoveAttribute(a,"id");return a}h.$CloneNode=ab;h.$LoadImage=function(e,f){var a=new Image;function b(e,d){h.$RemoveEvent(a,"load",b);h.$RemoveEvent(a,"abort",c);h.$RemoveEvent(a,"error",c);f&&f(a,d)}function c(a){b(a,d)}if(qb()&&i<11.6||!e)b(!e);else{h.$AddEvent(a,"load",b);h.$AddEvent(a,"abort",c);h.$AddEvent(a,"error",c);a.src=e}};h.$LoadImages=function(d,a,e){var c=d.length+1;function b(b){c--;if(a&&b&&b.src==a.src)a=b;!c&&e&&e(a)}n(d,function(a){h.$LoadImage(a.src,b)});b()};h.$BuildElement=function(a,g,i,h){if(h)a=ab(a);var c=W(a,g);if(!c.length)c=b.$GetElementsByTag(a,g);for(var f=c.length-1;f>-1;f--){var d=c[f],e=ab(i);x(e,x(d));b.$CssCssText(e,d.style.cssText);b.$InsertBefore(e,d);b.$RemoveElement(d)}return a};function Hb(a){var l=this,p="",r=["av","pv","ds","dn"],e=[],q,k=0,i=0,d=0;function j(){J(a,q,e[d||k||i&2||i]);b.$Css(a,"pointer-events",d?"none":"")}function c(){k=0;j();h.$RemoveEvent(f,"mouseup",c);h.$RemoveEvent(f,"touchend",c);h.$RemoveEvent(f,"touchcancel",c)}function o(a){if(d)h.$CancelEvent(a);else{k=4;j();h.$AddEvent(f,"mouseup",c);h.$AddEvent(f,"touchend",c);h.$AddEvent(f,"touchcancel",c)}}l.$Selected=function(a){if(a===g)return i;i=a&2||a&1;j()};l.$Enable=function(a){if(a===g)return!d;d=a?0:3;j()};l.$Elmt=a=h.$GetElement(a);var m=b.$Split(x(a));if(m)p=m.shift();n(r,function(a){e.push(p+a)});q=eb(" ",e);e.unshift("");h.$AddEvent(a,"mousedown",o);h.$AddEvent(a,"touchstart",o)}h.$Buttonize=function(a){return new Hb(a)};h.$Css=G;h.$CssN=db;h.$CssP=Kb;h.$CssOverflow=m("overflow");h.$CssTop=m("top",2);h.$CssLeft=m("left",2);h.$CssWidth=m("width",2);h.$CssHeight=m("height",2);h.$CssMarginLeft=m("marginLeft",2);h.$CssMarginTop=m("marginTop",2);h.$CssPosition=m("position");h.$CssDisplay=m("display");h.$CssZIndex=m("zIndex",1);h.$CssFloat=function(b,a){return G(b,r()?"styleFloat":"cssFloat",a)};h.$CssOpacity=function(b,a,c){if(a!=g)Fb(b,a,c);else return Db(b)};h.$CssCssText=function(a,b){if(b!=g)a.style.cssText=b;else return a.style.cssText};var X={$Opacity:h.$CssOpacity,$Top:h.$CssTop,$Left:h.$CssLeft,$Width:h.$CssWidth,$Height:h.$CssHeight,$Position:h.$CssPosition,$Display:h.$CssDisplay,$ZIndex:h.$CssZIndex};h.$GetStyles=function(c,b){var a={};n(b,function(d,b){if(X[b])a[b]=X[b](c)});return a};function w(f,l){var e=R(),b=H(),d=gb(),i=N(f);function k(b,d,a){var e=b.$TransformPoint(p(-d/2,-a/2)),f=b.$TransformPoint(p(d/2,-a/2)),g=b.$TransformPoint(p(d/2,a/2)),h=b.$TransformPoint(p(-d/2,a/2));b.$TransformPoint(p(300,300));return p(c.min(e.x,f.x,g.x,h.x)+d/2,c.min(e.y,f.y,g.y,h.y)+a/2)}function a(d,a){a=a||{};var f=a.$TranslateZ||0,l=(a.$RotateX||0)%360,m=(a.$RotateY||0)%360,o=(a.$Rotate||0)%360,p=a.$ScaleZ;if(e){f=0;l=0;m=0;p=0}var c=new Cb(a.$TranslateX,a.$TranslateY,f);c.$RotateX(l);c.$RotateY(m);c.$RotateZ(o);c.$Skew(a.$SkewX,a.$SkewY);c.$Scale(a.$ScaleX,a.$ScaleY,p);if(b){c.$Move(a.$MoveX,a.$MoveY);d.style[i]=c.$Format3d()}else if(!z||z<9){var j="";if(o||a.$ScaleX!=g&&a.$ScaleX!=1||a.$ScaleY!=g&&a.$ScaleY!=1){var n=k(c,a.$OriginalWidth,a.$OriginalHeight);h.$CssMarginTop(d,n.y);h.$CssMarginLeft(d,n.x);j=c.$Format2d()}var r=d.style.filter,s=new RegExp(/[\s]*progid:DXImageTransform\.Microsoft\.Matrix\([^\)]*\)/g),q=C(r,[s],j);U(d,q)}}w=function(e,c){c=c||{};var i=c.$MoveX,k=c.$MoveY,f;n(X,function(a,b){f=c[b];f!==g&&a(e,f)});h.$SetStyleClip(e,c.$Clip);if(!b){i!=g&&h.$CssLeft(e,c.$OriginalX+i);k!=g&&h.$CssTop(e,c.$OriginalY+k)}if(c.$Transform)if(d)yb(h.$CreateCallback(j,P,e,c));else a(e,c)};h.$SetStyleTransform=P;if(d)h.$SetStyleTransform=w;if(e)h.$SetStyleTransform=a;else if(!b)a=P;h.$SetStyles=w;w(f,l)}h.$SetStyleTransform=w;h.$SetStyles=w;function Cb(k,l,p){var d=this,b=[1,0,0,0,0,1,0,0,0,0,1,0,k||0,l||0,p||0,1],i=c.sin,h=c.cos,m=c.tan;function f(a){return a*c.PI/180}function o(a,b){return{x:a,y:b}}function n(b,c,f,g,i,l,n,o,q,t,u,w,y,A,C,F,a,d,e,h,j,k,m,p,r,s,v,x,z,B,D,E){return[b*a+c*j+f*r+g*z,b*d+c*k+f*s+g*B,b*e+c*m+f*v+g*D,b*h+c*p+f*x+g*E,i*a+l*j+n*r+o*z,i*d+l*k+n*s+o*B,i*e+l*m+n*v+o*D,i*h+l*p+n*x+o*E,q*a+t*j+u*r+w*z,q*d+t*k+u*s+w*B,q*e+t*m+u*v+w*D,q*h+t*p+u*x+w*E,y*a+A*j+C*r+F*z,y*d+A*k+C*s+F*B,y*e+A*m+C*v+F*D,y*h+A*p+C*x+F*E]}function e(c,a){return n.apply(j,(a||b).concat(c))}d.$Matrix=function(){return b};d.$Scale=function(a,c,d){if(a==g)a=1;if(c==g)c=1;if(d==g)d=1;if(a!=1||c!=1||d!=1)b=e([a,0,0,0,0,c,0,0,0,0,d,0,0,0,0,1])};d.$Translate=function(a,c,d){if(a||c||d)b=e([1,0,0,0,0,1,0,0,0,0,1,0,a||0,c||0,d||0,1])};d.$Move=function(a,c,d){b[12]+=a||0;b[13]+=c||0;b[14]+=d||0};d.$RotateX=function(c){if(c){a=f(c);var d=h(a),g=i(a);b=e([1,0,0,0,0,d,g,0,0,-g,d,0,0,0,0,1])}};d.$RotateY=function(c){if(c){a=f(c);var d=h(a),g=i(a);b=e([d,0,-g,0,0,1,0,0,g,0,d,0,0,0,0,1])}};d.$RotateZ=function(c){if(c){a=f(c);var d=h(a),g=i(a);b=e([d,g,0,0,-g,d,0,0,0,0,1,0,0,0,0,1])}};d.$Skew=function(a,c){if(a||c){k=f(a);l=f(c);b=e([1,m(l),0,0,m(k),1,0,0,0,0,1,0,0,0,0,1])}};d.$TransformPoint=function(c){var a=e(b,[1,0,0,0,0,1,0,0,0,0,1,0,c.x,c.y,0,1]);return o(a[12],a[13])};d.$Format3d=function(){return"matrix3d("+b.join(",")+")"};d.$Format2d=function(){return"progid:DXImageTransform.Microsoft.Matrix(M11="+b[0]+", M12="+b[4]+", M21="+b[1]+", M22="+b[5]+", SizingMethod='auto expand')"}}new(function(){var a=this;function b(d,g){for(var j=d[0].length,i=d.length,h=g[0].length,f=[],c=0;c<i;c++)for(var k=f[c]=[],b=0;b<h;b++){for(var e=0,a=0;a<j;a++)e+=d[c][a]*g[a][b];k[b]=e}return f}a.$ScaleX=function(b,c){return a.$ScaleXY(b,c,0)};a.$ScaleY=function(b,c){return a.$ScaleXY(b,0,c)};a.$ScaleXY=function(a,c,d){return b(a,[[c,0],[0,d]])};a.$TransformPoint=function(d,c){var a=b(d,[[c.x],[c.y]]);return p(a[0][0],a[1][0])}});var Q={$OriginalX:0,$OriginalY:0,$MoveX:0,$MoveY:0,$Zoom:1,$ScaleX:1,$ScaleY:1,$Rotate:0,$RotateX:0,$RotateY:0,$TranslateX:0,$TranslateY:0,$TranslateZ:0,$SkewX:0,$SkewY:0};h.$FormatEasings=function(a){var c=a||{};if(a)if(b.$IsFunction(a))c={$Default:c};else if(b.$IsFunction(a.$Clip))c.$Clip={$Default:a.$Clip};return c};function wb(c,a){var b={};n(c,function(c,d){var e=c;if(a[d]!=g)if(h.$IsNumeric(c))e=c+a[d];else e=wb(c,a[d]);b[d]=e});return b}h.$AddDif=wb;h.$Cast=function(l,m,w,n,y,z,o){var a=m;if(l){a={};for(var h in m){var A=z[h]||1,v=y[h]||[0,1],f=(w-v[0])/v[1];f=c.min(c.max(f,0),1);f=f*A;var u=c.floor(f);if(f!=u)f-=u;var i=n.$Default||e.$EaseSwing,k,B=l[h],q=m[h];if(b.$IsNumeric(q)){i=n[h]||i;var x=i(f);k=B+q*x}else{k=b.$Extend({$Offset:{}},l[h]);b.$Each(q.$Offset||q,function(d,a){if(n.$Clip)i=n.$Clip[a]||n.$Clip.$Default||i;var c=i(f),b=d*c;k.$Offset[a]=b;k[a]+=b})}a[h]=k}var t=b.$Each(m,function(b,a){return Q[a]!=g});t&&b.$Each(Q,function(c,b){if(a[b]==g&&l[b]!==g)a[b]=l[b]});if(t){if(a.$Zoom)a.$ScaleX=a.$ScaleY=a.$Zoom;a.$OriginalWidth=o.$OriginalWidth;a.$OriginalHeight=o.$OriginalHeight;a.$Transform=d}}if(m.$Clip&&o.$Move){var p=a.$Clip.$Offset,s=(p.$Top||0)+(p.$Bottom||0),r=(p.$Left||0)+(p.$Right||0);a.$Left=(a.$Left||0)+r;a.$Top=(a.$Top||0)+s;a.$Clip.$Left-=r;a.$Clip.$Right-=r;a.$Clip.$Top-=s;a.$Clip.$Bottom-=s}if(a.$Clip&&b.$CanClearClip()&&!a.$Clip.$Top&&!a.$Clip.$Left&&a.$Clip.$Right==o.$OriginalWidth&&a.$Clip.$Bottom==o.$OriginalHeight)a.$Clip=j;return a}};function n(){var a=this,d=[],c=[];function h(a,b){d.push({$EventName:a,$Handler:b})}function g(a,c){b.$Each(d,function(b,e){b.$EventName==a&&b.$Handler===c&&d.splice(e,1)})}function f(){d=[]}function e(){b.$Each(c,function(a){b.$RemoveEvent(a.$Obj,a.$EventName,a.$Handler)});c=[]}a.$Listen=function(e,a,d,f){b.$AddEvent(e,a,d,f);c.push({$Obj:e,$EventName:a,$Handler:d})};a.$Unlisten=function(e,a,d){b.$Each(c,function(f,g){if(f.$Obj===e&&f.$EventName==a&&f.$Handler===d){b.$RemoveEvent(e,a,d);c.splice(g,1)}})};a.$UnlistenAll=e;a.$On=a.addEventListener=h;a.$Off=a.removeEventListener=g;a.$TriggerEvent=function(a){var c=[].slice.call(arguments,1);b.$Each(d,function(b){b.$EventName==a&&b.$Handler.apply(k,c)})};a.$Destroy=function(){e();f();for(var b in a)delete a[b]}}var m=k.$JssorAnimator$=function(z,C,h,L,O,J){z=z||0;var a=this,q,N,n,o,v,A=0,H,I,G,B,y=0,g=0,m=0,D,i,s,f,e,p,w=[],x;function P(a){f+=a;e+=a;i+=a;s+=a;g+=a;m+=a;y+=a}function u(o){var j=o;if(p&&(j>=e||j<=f))j=((j-f)%p+p)%p+f;if(!D||v||g!=j){var k=c.min(j,e);k=c.max(k,f);if(!D||v||k!=m){if(J){var l=(k-i)/(C||1);if(h.$Reverse)l=1-l;var n=b.$Cast(O,J,l,H,G,I,h);if(x)b.$Each(n,function(b,a){x[a]&&x[a](L,b)});else b.$SetStyles(L,n)}a.$OnInnerOffsetChange(m-i,k-i);m=k;b.$Each(w,function(b,c){var a=o<g?w[w.length-c-1]:b;a.$GoToPosition(m-y)});var r=g,q=m;g=j;D=d;a.$OnPositionChange(r,q)}}}function E(a,b,d){b&&a.$Shift(e);if(!d){f=c.min(f,a.$GetPosition_OuterBegin()+y);e=c.max(e,a.$GetPosition_OuterEnd()+y)}w.push(a)}var r=k.requestAnimationFrame||k.webkitRequestAnimationFrame||k.mozRequestAnimationFrame||k.msRequestAnimationFrame;if(b.$IsBrowserSafari()&&b.$BrowserVersion()<7)r=j;r=r||function(a){b.$Delay(a,h.$Interval)};function K(){if(q){var d=b.$GetNow(),e=c.min(d-A,h.$IntervalMax),a=g+e*o;A=d;if(a*o>=n*o)a=n;u(a);if(!v&&a*o>=n*o)M(B);else r(K)}}function t(h,i,j){if(!q){q=d;v=j;B=i;h=c.max(h,f);h=c.min(h,e);n=h;o=n<g?-1:1;a.$OnStart();A=b.$GetNow();r(K)}}function M(b){if(q){v=q=B=l;a.$OnStop();b&&b()}}a.$Play=function(a,b,c){t(a?g+a:e,b,c)};a.$PlayToPosition=t;a.$PlayToBegin=function(a,b){t(f,a,b)};a.$PlayToEnd=function(a,b){t(e,a,b)};a.$Stop=M;a.$Continue=function(a){t(a)};a.$GetPosition=function(){return g};a.$GetPlayToPosition=function(){return n};a.$GetPosition_Display=function(){return m};a.$GoToPosition=u;a.$GoToBegin=function(){u(f,d)};a.$GoToEnd=function(){u(e,d)};a.$Move=function(a){u(g+a)};a.$CombineMode=function(){return N};a.$GetDuration=function(){return C};a.$IsPlaying=function(){return q};a.$IsOnTheWay=function(){return g>i&&g<=s};a.$SetLoopLength=function(a){p=a};a.$Shift=P;a.$Join=E;a.$Combine=function(a,b){E(a,0,b)};a.$Chain=function(a){E(a,1)};a.$Expand=function(a){e+=a};a.$GetPosition_InnerBegin=function(){return i};a.$GetPosition_InnerEnd=function(){return s};a.$GetPosition_OuterBegin=function(){return f};a.$GetPosition_OuterEnd=function(){return e};a.$OnPositionChange=a.$OnStart=a.$OnStop=a.$OnInnerOffsetChange=b.$EmptyFunction;a.$Version=b.$GetNow();h=b.$Extend({$Interval:16,$IntervalMax:50},h);p=h.$LoopLength;x=h.$Setter;f=i=z;e=s=z+C;I=h.$Round||{};G=h.$During||{};H=b.$FormatEasings(h.$Easing)};var p=k.$JssorSlideshowFormations$=new function(){var h=this,b=0,a=1,f=2,e=3,s=1,r=2,t=4,q=8,w=256,x=512,v=1024,u=2048,j=u+s,i=u+r,o=x+s,m=x+r,n=w+t,k=w+q,l=v+t,p=v+q;function y(a){return(a&r)==r}function z(a){return(a&t)==t}function g(b,a,c){c.push(a);b[a]=b[a]||[];b[a].push(c)}h.$FormationStraight=function(f){for(var d=f.$Cols,e=f.$Rows,s=f.$Assembly,t=f.$Count,r=[],a=0,b=0,p=d-1,q=e-1,h=t-1,c,b=0;b<e;b++)for(a=0;a<d;a++){switch(s){case j:c=h-(a*e+(q-b));break;case l:c=h-(b*d+(p-a));break;case o:c=h-(a*e+b);case n:c=h-(b*d+a);break;case i:c=a*e+b;break;case k:c=b*d+(p-a);break;case m:c=a*e+(q-b);break;default:c=b*d+a}g(r,c,[b,a])}return r};h.$FormationSwirl=function(q){var x=q.$Cols,y=q.$Rows,B=q.$Assembly,w=q.$Count,A=[],z=[],u=0,c=0,h=0,r=x-1,s=y-1,t,p,v=0;switch(B){case j:c=r;h=0;p=[f,a,e,b];break;case l:c=0;h=s;p=[b,e,a,f];break;case o:c=r;h=s;p=[e,a,f,b];break;case n:c=r;h=s;p=[a,e,b,f];break;case i:c=0;h=0;p=[f,b,e,a];break;case k:c=r;h=0;p=[a,f,b,e];break;case m:c=0;h=s;p=[e,b,f,a];break;default:c=0;h=0;p=[b,f,a,e]}u=0;while(u<w){t=h+","+c;if(c>=0&&c<x&&h>=0&&h<y&&!z[t]){z[t]=d;g(A,u++,[h,c])}else switch(p[v++%p.length]){case b:c--;break;case f:h--;break;case a:c++;break;case e:h++}switch(p[v%p.length]){case b:c++;break;case f:h++;break;case a:c--;break;case e:h--}}return A};h.$FormationZigZag=function(p){var w=p.$Cols,x=p.$Rows,z=p.$Assembly,v=p.$Count,t=[],u=0,c=0,d=0,q=w-1,r=x-1,y,h,s=0;switch(z){case j:c=q;d=0;h=[f,a,e,a];break;case l:c=0;d=r;h=[b,e,a,e];break;case o:c=q;d=r;h=[e,a,f,a];break;case n:c=q;d=r;h=[a,e,b,e];break;case i:c=0;d=0;h=[f,b,e,b];break;case k:c=q;d=0;h=[a,f,b,f];break;case m:c=0;d=r;h=[e,b,f,b];break;default:c=0;d=0;h=[b,f,a,f]}u=0;while(u<v){y=d+","+c;if(c>=0&&c<w&&d>=0&&d<x&&typeof t[y]=="undefined"){g(t,u++,[d,c]);switch(h[s%h.length]){case b:c++;break;case f:d++;break;case a:c--;break;case e:d--}}else{switch(h[s++%h.length]){case b:c--;break;case f:d--;break;case a:c++;break;case e:d++}switch(h[s++%h.length]){case b:c++;break;case f:d++;break;case a:c--;break;case e:d--}}}return t};h.$FormationStraightStairs=function(q){var u=q.$Cols,v=q.$Rows,e=q.$Assembly,t=q.$Count,r=[],s=0,c=0,d=0,f=u-1,h=v-1,x=t-1;switch(e){case j:case m:case o:case i:var a=0,b=0;break;case k:case l:case n:case p:var a=f,b=0;break;default:e=p;var a=f,b=0}c=a;d=b;while(s<t){if(z(e)||y(e))g(r,x-s++,[d,c]);else g(r,s++,[d,c]);switch(e){case j:case m:c--;d++;break;case o:case i:c++;d--;break;case k:case l:c--;d--;break;case p:case n:default:c++;d++}if(c<0||d<0||c>f||d>h){switch(e){case j:case m:a++;break;case k:case l:case o:case i:b++;break;case p:case n:default:a--}if(a<0||b<0||a>f||b>h){switch(e){case j:case m:a=f;b++;break;case o:case i:b=h;a++;break;case k:case l:b=h;a--;break;case p:case n:default:a=0;b++}if(b>h)b=h;else if(b<0)b=0;else if(a>f)a=f;else if(a<0)a=0}d=b;c=a}}return r};h.$FormationSquare=function(i){var a=i.$Cols||1,b=i.$Rows||1,j=[],d,e,f,h,k;f=a<b?(b-a)/2:0;h=a>b?(a-b)/2:0;k=c.round(c.max(a/2,b/2))+1;for(d=0;d<a;d++)for(e=0;e<b;e++)g(j,k-c.min(d+1+f,e+1+h,a-d+f,b-e+h),[e,d]);return j};h.$FormationRectangle=function(f){var d=f.$Cols||1,e=f.$Rows||1,h=[],a,b,i;i=c.round(c.min(d/2,e/2))+1;for(a=0;a<d;a++)for(b=0;b<e;b++)g(h,i-c.min(a+1,b+1,d-a,e-b),[b,a]);return h};h.$FormationRandom=function(d){for(var e=[],a,b=0;b<d.$Rows;b++)for(a=0;a<d.$Cols;a++)g(e,c.ceil(1e5*c.random())%13,[b,a]);return e};h.$FormationCircle=function(d){for(var e=d.$Cols||1,f=d.$Rows||1,h=[],a,i=e/2-.5,j=f/2-.5,b=0;b<e;b++)for(a=0;a<f;a++)g(h,c.round(c.sqrt(c.pow(b-i,2)+c.pow(a-j,2))),[a,b]);return h};h.$FormationCross=function(d){for(var e=d.$Cols||1,f=d.$Rows||1,h=[],a,i=e/2-.5,j=f/2-.5,b=0;b<e;b++)for(a=0;a<f;a++)g(h,c.round(c.min(c.abs(b-i),c.abs(a-j))),[a,b]);return h};h.$FormationRectangleCross=function(f){for(var h=f.$Cols||1,i=f.$Rows||1,j=[],a,d=h/2-.5,e=i/2-.5,k=c.max(d,e)+1,b=0;b<h;b++)for(a=0;a<i;a++)g(j,c.round(k-c.max(d-c.abs(b-d),e-c.abs(a-e)))-1,[a,b]);return j}};k.$JssorSlideshowRunner$=function(k,s,q,t,y){var f=this,u,g,a,x=0,w=t.$TransitionsOrder,r,h=8;function i(g,f){var a={$Interval:f,$Duration:1,$Delay:0,$Cols:1,$Rows:1,$Opacity:0,$Zoom:0,$Clip:0,$Move:l,$SlideOut:l,$Reverse:l,$Formation:p.$FormationRandom,$Assembly:1032,$ChessMode:{$Column:0,$Row:0},$Easing:e.$EaseSwing,$Round:{},$Blocks:[],$During:{}};b.$Extend(a,g);a.$Count=a.$Cols*a.$Rows;a.$Easing=b.$FormatEasings(a.$Easing);a.$FramesCount=c.ceil(a.$Duration/a.$Interval);a.$GetBlocks=function(c,b){c/=a.$Cols;b/=a.$Rows;var f=c+"x"+b;if(!a.$Blocks[f]){a.$Blocks[f]={$Width:c,$Height:b};for(var d=0;d<a.$Cols;d++)for(var e=0;e<a.$Rows;e++)a.$Blocks[f][e+","+d]={$Top:e*b,$Right:d*c+c,$Bottom:e*b+b,$Left:d*c}}return a.$Blocks[f]};if(a.$Brother){a.$Brother=i(a.$Brother,f);a.$SlideOut=d}return a}function o(B,h,a,w,o,m){var z=this,u,v={},i={},n=[],f,e,s,q=a.$ChessMode.$Column||0,r=a.$ChessMode.$Row||0,g=a.$GetBlocks(o,m),p=C(a),D=p.length-1,t=a.$Duration+a.$Delay*D,x=w+t,k=a.$SlideOut,y;x+=50;function C(a){var b=a.$Formation(a);return a.$Reverse?b.reverse():b}z.$EndTime=x;z.$ShowFrame=function(d){d-=w;var e=d<t;if(e||y){y=e;if(!k)d=t-d;var f=c.ceil(d/a.$Interval);b.$Each(i,function(a,e){var d=c.max(f,a.$Min);d=c.min(d,a.length-1);if(a.$LastFrameIndex!=d){if(!a.$LastFrameIndex&&!k)b.$ShowElement(n[e]);else d==a.$Max&&k&&b.$HideElement(n[e]);a.$LastFrameIndex=d;b.$SetStyles(n[e],a[d])}})}};h=b.$CloneNode(h);b.$SetStyleTransform(h,j);if(b.$IsBrowserIe9Earlier()){var E=!h["no-image"],A=b.$FindChildrenByTag(h);b.$Each(A,function(a){(E||a["jssor-slider"])&&b.$CssOpacity(a,b.$CssOpacity(a),d)})}b.$Each(p,function(h,j){b.$Each(h,function(G){var K=G[0],J=G[1],t=K+","+J,n=l,p=l,x=l;if(q&&J%2){if(q&3)n=!n;if(q&12)p=!p;if(q&16)x=!x}if(r&&K%2){if(r&3)n=!n;if(r&12)p=!p;if(r&16)x=!x}a.$Top=a.$Top||a.$Clip&4;a.$Bottom=a.$Bottom||a.$Clip&8;a.$Left=a.$Left||a.$Clip&1;a.$Right=a.$Right||a.$Clip&2;var C=p?a.$Bottom:a.$Top,z=p?a.$Top:a.$Bottom,B=n?a.$Right:a.$Left,A=n?a.$Left:a.$Right;a.$Clip=C||z||B||A;s={};e={$Top:0,$Left:0,$Opacity:1,$Width:o,$Height:m};f=b.$Extend({},e);u=b.$Extend({},g[t]);if(a.$Opacity)e.$Opacity=2-a.$Opacity;if(a.$ZIndex){e.$ZIndex=a.$ZIndex;f.$ZIndex=0}var I=a.$Cols*a.$Rows>1||a.$Clip;if(a.$Zoom||a.$Rotate){var H=d;if(b.$IsBrowserIe9Earlier())if(a.$Cols*a.$Rows>1)H=l;else I=l;if(H){e.$Zoom=a.$Zoom?a.$Zoom-1:1;f.$Zoom=1;if(b.$IsBrowserIe9Earlier()||b.$IsBrowserOpera())e.$Zoom=c.min(e.$Zoom,2);var N=a.$Rotate||0;e.$Rotate=N*360*(x?-1:1);f.$Rotate=0}}if(I){var h=u.$Offset={};if(a.$Clip){var w=a.$ScaleClip||1;if(C&&z){h.$Top=g.$Height/2*w;h.$Bottom=-h.$Top}else if(C)h.$Bottom=-g.$Height*w;else if(z)h.$Top=g.$Height*w;if(B&&A){h.$Left=g.$Width/2*w;h.$Right=-h.$Left}else if(B)h.$Right=-g.$Width*w;else if(A)h.$Left=g.$Width*w}s.$Clip=u;f.$Clip=g[t]}var L=n?1:-1,M=p?1:-1;if(a.x)e.$Left+=o*a.x*L;if(a.y)e.$Top+=m*a.y*M;b.$Each(e,function(a,c){if(b.$IsNumeric(a))if(a!=f[c])s[c]=a-f[c]});v[t]=k?f:e;var D=a.$FramesCount,y=c.round(j*a.$Delay/a.$Interval);i[t]=new Array(y);i[t].$Min=y;i[t].$Max=y+D-1;for(var F=0;F<=D;F++){var E=b.$Cast(f,s,F/D,a.$Easing,a.$During,a.$Round,{$Move:a.$Move,$OriginalWidth:o,$OriginalHeight:m});E.$ZIndex=E.$ZIndex||1;i[t].push(E)}})});p.reverse();b.$Each(p,function(a){b.$Each(a,function(c){var f=c[0],e=c[1],d=f+","+e,a=h;if(e||f)a=b.$CloneNode(h);b.$SetStyles(a,v[d]);b.$CssOverflow(a,"hidden");b.$CssPosition(a,"absolute");B.$AddClipElement(a);n[d]=a;b.$ShowElement(a,!k)})})}function v(){var b=this,c=0;m.call(b,0,u);b.$OnPositionChange=function(d,b){if(b-c>h){c=b;a&&a.$ShowFrame(b);g&&g.$ShowFrame(b)}};b.$Transition=r}f.$GetTransition=function(){var a=0,b=t.$Transitions,d=b.length;if(w)a=x++%d;else a=c.floor(c.random()*d);b[a]&&(b[a].$Index=a);return b[a]};f.$Initialize=function(w,x,l,m,b){r=b;b=i(b,h);var j=m.$Item,e=l.$Item;j["no-image"]=!m.$Image;e["no-image"]=!l.$Image;var n=j,p=e,v=b,d=b.$Brother||i({},h);if(!b.$SlideOut){n=e;p=j}var t=d.$Shift||0;g=new o(k,p,d,c.max(t-d.$Interval,0),s,q);a=new o(k,n,v,c.max(d.$Interval-t,0),s,q);g.$ShowFrame(0);a.$ShowFrame(0);u=c.max(g.$EndTime,a.$EndTime);f.$Index=w};f.$Clear=function(){k.$Clear();g=j;a=j};f.$GetProcessor=function(){var b=j;if(a)b=new v;return b};if(b.$IsBrowserIe9Earlier()||b.$IsBrowserOpera()||y&&b.$WebKitVersion()<537)h=16;n.call(f);m.call(f,-1e7,1e7)};var i=k.$JssorSlider$=function(p,hc){var h=this;function Fc(){var a=this;m.call(a,-1e8,2e8);a.$GetCurrentSlideInfo=function(){var b=a.$GetPosition_Display(),d=c.floor(b),f=t(d),e=b-c.floor(b);return{$Index:f,$VirtualIndex:d,$Position:e}};a.$OnPositionChange=function(b,a){var e=c.floor(a);if(e!=a&&a>b)e++;Wb(e,d);h.$TriggerEvent(i.$EVT_POSITION_CHANGE,t(a),t(b),a,b)}}function Ec(){var a=this;m.call(a,0,0,{$LoopLength:r});b.$Each(C,function(b){D&1&&b.$SetLoopLength(r);a.$Chain(b);b.$Shift(fb/dc)})}function Dc(){var a=this,b=Vb.$Elmt;m.call(a,-1,2,{$Easing:e.$EaseLinear,$Setter:{$Position:bc},$LoopLength:r},b,{$Position:1},{$Position:-2});a.$Wrapper=b}function rc(o,n){var b=this,e,f,g,k,c;m.call(b,-1e8,2e8,{$IntervalMax:100});b.$OnStart=function(){O=d;R=j;h.$TriggerEvent(i.$EVT_SWIPE_START,t(w.$GetPosition()),w.$GetPosition())};b.$OnStop=function(){O=l;k=l;var a=w.$GetCurrentSlideInfo();h.$TriggerEvent(i.$EVT_SWIPE_END,t(w.$GetPosition()),w.$GetPosition());!a.$Position&&Hc(a.$VirtualIndex,s)};b.$OnPositionChange=function(i,h){var b;if(k)b=c;else{b=f;if(g){var d=h/g;b=a.$SlideEasing(d)*(f-e)+e}}w.$GoToPosition(b)};b.$PlayCarousel=function(a,d,c,h){e=a;f=d;g=c;w.$GoToPosition(a);b.$GoToPosition(0);b.$PlayToPosition(c,h)};b.$StandBy=function(a){k=d;c=a;b.$Play(a,j,d)};b.$SetStandByPosition=function(a){c=a};b.$MoveCarouselTo=function(a){w.$GoToPosition(a)};w=new Fc;w.$Combine(o);w.$Combine(n)}function sc(){var c=this,a=Zb();b.$CssZIndex(a,0);b.$Css(a,"pointerEvents","none");c.$Elmt=a;c.$AddClipElement=function(c){b.$AppendChild(a,c);b.$ShowElement(a)};c.$Clear=function(){b.$HideElement(a);b.$Empty(a)}}function Bc(k,f){var e=this,q,H,x,o,y=[],w,B,W,G,Q,F,g,v,p,eb;m.call(e,-u,u+1,{$SlideItemAnimator:d});function E(a){q&&q.$Revert();T(k,a,0);F=d;q=new I.$Class(k,I,b.$ParseFloat(b.$AttributeEx(k,"idle"))||qc);q.$GoToPosition(0)}function Y(){q.$Version<I.$Version&&E()}function N(p,r,n){if(!G){G=d;if(o&&n){var g=n.width,c=n.height,m=g,k=c;if(g&&c&&a.$FillMode){if(a.$FillMode&3&&(!(a.$FillMode&4)||g>K||c>J)){var j=l,q=K/J*c/g;if(a.$FillMode&1)j=q>1;else if(a.$FillMode&2)j=q<1;m=j?g*J/c:K;k=j?J:c*K/g}b.$CssWidth(o,m);b.$CssHeight(o,k);b.$CssTop(o,(J-k)/2);b.$CssLeft(o,(K-m)/2)}b.$CssPosition(o,"absolute");h.$TriggerEvent(i.$EVT_LOAD_END,f)}}b.$HideElement(r);p&&p(e)}function X(b,c,d,g){if(g==R&&s==f&&P)if(!Gc){var a=t(b);A.$Initialize(a,f,c,e,d);c.$HideContentForSlideshow();U.$Shift(a-U.$GetPosition_OuterBegin()-1);U.$GoToPosition(a);z.$PlayCarousel(b,b,0)}}function ab(b){if(b==R&&s==f){if(!g){var a=j;if(A)if(A.$Index==f)a=A.$GetProcessor();else A.$Clear();Y();g=new zc(k,f,a,q);g.$SetPlayer(p)}!g.$IsPlaying()&&g.$Replay()}}function S(d,h,l){if(d==f){if(d!=h)C[h]&&C[h].$ParkOut();else!l&&g&&g.$AdjustIdleOnPark();p&&p.$Enable();var m=R=b.$GetNow();e.$LoadImage(b.$CreateCallback(j,ab,m))}else{var k=c.min(f,d),i=c.max(f,d),o=c.min(i-k,k+r-i),n=u+a.$LazyLoading-1;(!Q||o<=n)&&e.$LoadImage()}}function bb(){if(s==f&&g){g.$Stop();p&&p.$Quit();p&&p.$Disable();g.$OpenSlideshowPanel()}}function db(){s==f&&g&&g.$Stop()}function Z(a){!M&&h.$TriggerEvent(i.$EVT_CLICK,f,a)}function O(){p=v.pInstance;g&&g.$SetPlayer(p)}e.$LoadImage=function(c,a){a=a||x;if(y.length&&!G){b.$ShowElement(a);if(!W){W=d;h.$TriggerEvent(i.$EVT_LOAD_START,f);b.$Each(y,function(a){if(!b.$Attribute(a,"src")){a.src=b.$AttributeEx(a,"src2");b.$CssDisplay(a,a["display-origin"])}})}b.$LoadImages(y,o,b.$CreateCallback(j,N,c,a))}else N(c,a)};e.$GoForNextSlide=function(){var h=f;if(a.$AutoPlaySteps<0)h-=r;var d=h+a.$AutoPlaySteps*xc;if(D&2)d=t(d);if(!(D&1))d=c.max(0,c.min(d,r-u));if(d!=f){if(A){var e=A.$GetTransition(r);if(e){var i=R=b.$GetNow(),g=C[t(d)];return g.$LoadImage(b.$CreateCallback(j,X,d,g,e,i),x)}}nb(d)}};e.$TryActivate=function(){S(f,f,d)};e.$ParkOut=function(){p&&p.$Quit();p&&p.$Disable();e.$UnhideContentForSlideshow();g&&g.$Abort();g=j;E()};e.$StampSlideItemElements=function(a){a=eb+"_"+a};e.$HideContentForSlideshow=function(){b.$HideElement(k)};e.$UnhideContentForSlideshow=function(){b.$ShowElement(k)};e.$EnablePlayer=function(){p&&p.$Enable()};function T(a,c,e){if(b.$Attribute(a,"jssor-slider"))return;if(!F){if(a.tagName=="IMG"){y.push(a);if(!b.$Attribute(a,"src")){Q=d;a["display-origin"]=b.$CssDisplay(a);b.$HideElement(a)}}b.$IsBrowserIe9Earlier()&&b.$CssZIndex(a,(b.$CssZIndex(a)||0)+1)}var f=b.$Children(a);b.$Each(f,function(f){var h=f.tagName,i=b.$AttributeEx(f,"u");if(i=="player"&&!v){v=f;if(v.pInstance)O();else b.$AddEvent(v,"dataavailable",O)}if(i=="caption"){if(c){b.$CssTransformOrigin(f,b.$AttributeEx(f,"to"));b.$CssBackfaceVisibility(f,b.$AttributeEx(f,"bf"));b.$AttributeEx(f,"3d")&&b.$CssTransformStyle(f,"preserve-3d")}else if(!b.$IsBrowserIE()){var g=b.$CloneNode(f,l,d);b.$InsertBefore(g,f,a);b.$RemoveElement(f,a);f=g;c=d}}else if(!F&&!e&&!o){if(h=="A"){if(b.$AttributeEx(f,"u")=="image")o=b.$FindChildByTag(f,"IMG");else o=b.$FindChild(f,"image",d);if(o){w=f;b.$CssDisplay(w,"block");b.$SetStyles(w,V);B=b.$CloneNode(w,d);b.$CssPosition(w,"relative");b.$CssOpacity(B,0);b.$Css(B,"backgroundColor","#000")}}else if(h=="IMG"&&b.$AttributeEx(f,"u")=="image")o=f;if(o){o.border=0;b.$SetStyles(o,V)}}T(f,c,e+1)})}e.$OnInnerOffsetChange=function(c,b){var a=u-b;bc(H,a)};e.$Index=f;n.call(e);b.$CssPerspective(k,b.$AttributeEx(k,"p"));b.$CssPerspectiveOrigin(k,b.$AttributeEx(k,"po"));var L=b.$FindChild(k,"thumb",d);if(L){e.$Thumb=b.$CloneNode(L);b.$HideElement(L)}b.$ShowElement(k);x=b.$CloneNode(cb);b.$CssZIndex(x,1e3);b.$AddEvent(k,"click",Z);E(d);e.$Image=o;e.$Link=B;e.$Item=k;e.$Wrapper=H=k;b.$AppendChild(H,x);h.$On(203,S);h.$On(28,db);h.$On(24,bb)}function zc(y,f,p,q){var a=this,n=0,u=0,g,j,e,c,k,t,r,o=C[f];m.call(a,0,0);function v(){b.$Empty(N);fc&&k&&o.$Link&&b.$AppendChild(N,o.$Link);b.$ShowElement(N,!k&&o.$Image)}function w(){a.$Replay()}function x(b){r=b;a.$Stop();a.$Replay()}a.$Replay=function(){var b=a.$GetPosition_Display();if(!B&&!O&&!r&&s==f){if(!b){if(g&&!k){k=d;a.$OpenSlideshowPanel(d);h.$TriggerEvent(i.$EVT_SLIDESHOW_START,f,n,u,g,c)}v()}var l,p=i.$EVT_STATE_CHANGE;if(b!=c)if(b==e)l=c;else if(b==j)l=e;else if(!b)l=j;else l=a.$GetPlayToPosition();h.$TriggerEvent(p,f,b,n,j,e,c);var m=P&&(!E||F);if(b==c)(e!=c&&!(E&12)||m)&&o.$GoForNextSlide();else(m||b!=e)&&a.$PlayToPosition(l,w)}};a.$AdjustIdleOnPark=function(){e==c&&e==a.$GetPosition_Display()&&a.$GoToPosition(j)};a.$Abort=function(){A&&A.$Index==f&&A.$Clear();var b=a.$GetPosition_Display();b<c&&h.$TriggerEvent(i.$EVT_STATE_CHANGE,f,-b-1,n,j,e,c)};a.$OpenSlideshowPanel=function(a){p&&b.$CssOverflow(hb,a&&p.$Transition.$Outside?"":"hidden")};a.$OnInnerOffsetChange=function(b,a){if(k&&a>=g){k=l;v();o.$UnhideContentForSlideshow();A.$Clear();h.$TriggerEvent(i.$EVT_SLIDESHOW_END,f,n,u,g,c)}h.$TriggerEvent(i.$EVT_PROGRESS_CHANGE,f,a,n,j,e,c)};a.$SetPlayer=function(a){if(a&&!t){t=a;a.$On($JssorPlayer$.$EVT_SWITCH,x)}};p&&a.$Chain(p);g=a.$GetPosition_OuterEnd();a.$Chain(q);j=g+q.$IdleBegin;e=g+q.$IdleEnd;c=a.$GetPosition_OuterEnd()}function Mb(a,c,d){b.$CssLeft(a,c);b.$CssTop(a,d)}function bc(c,b){var a=x>0?x:gb,d=Bb*b*(a&1),e=Cb*b*(a>>1&1);Mb(c,d,e)}function Rb(){pb=O;Kb=z.$GetPlayToPosition();G=w.$GetPosition()}function ic(){Rb();if(B||!F&&E&12){z.$Stop();h.$TriggerEvent(i.$EVT_FREEZE)}}function gc(f){if(!B&&(F||!(E&12))&&!z.$IsPlaying()){var d=w.$GetPosition(),b=c.ceil(G);if(f&&c.abs(H)>=a.$MinDragOffsetToSlide){b=c.ceil(d);b+=eb}if(!(D&1))b=c.min(r-u,c.max(b,0));var e=c.abs(b-d);e=1-c.pow(1-e,5);if(!M&&pb)z.$Continue(Kb);else if(d==b){tb.$EnablePlayer();tb.$TryActivate()}else z.$PlayCarousel(d,b,e*Xb)}}function Ib(a){!b.$AttributeEx(b.$EvtSrc(a),"nodrag")&&b.$CancelEvent(a)}function vc(a){ac(a,1)}function ac(a,c){a=b.$GetEvent(a);var k=b.$EvtSrc(a);if(!L&&!b.$AttributeEx(k,"nodrag")&&wc()&&(!c||a.touches.length==1)){B=d;Ab=l;R=j;b.$AddEvent(f,c?"touchmove":"mousemove",Db);b.$GetNow();M=0;ic();if(!pb)x=0;if(c){var g=a.touches[0];vb=g.clientX;wb=g.clientY}else{var e=b.$MousePosition(a);vb=e.x;wb=e.y}H=0;bb=0;eb=0;h.$TriggerEvent(i.$EVT_DRAG_START,t(G),G,a)}}function Db(e){if(B){e=b.$GetEvent(e);var f;if(e.type!="mousemove"){var l=e.touches[0];f={x:l.clientX,y:l.clientY}}else f=b.$MousePosition(e);if(f){var j=f.x-vb,k=f.y-wb;if(c.floor(G)!=G)x=x||gb&L;if((j||k)&&!x){if(L==3)if(c.abs(k)>c.abs(j))x=2;else x=1;else x=L;if(jb&&x==1&&c.abs(k)-c.abs(j)>3)Ab=d}if(x){var a=k,i=Cb;if(x==1){a=j;i=Bb}if(!(D&1)){if(a>0){var g=i*s,h=a-g;if(h>0)a=g+c.sqrt(h)*5}if(a<0){var g=i*(r-u-s),h=-a-g;if(h>0)a=-g-c.sqrt(h)*5}}if(H-bb<-2)eb=0;else if(H-bb>2)eb=-1;bb=H;H=a;sb=G-H/i/(Z||1);if(H&&x&&!Ab){b.$CancelEvent(e);if(!O)z.$StandBy(sb);else z.$SetStandByPosition(sb)}}}}}function mb(){tc();if(B){B=l;b.$GetNow();b.$RemoveEvent(f,"mousemove",Db);b.$RemoveEvent(f,"touchmove",Db);M=H;z.$Stop();var a=w.$GetPosition();h.$TriggerEvent(i.$EVT_DRAG_END,t(a),a,t(G),G);E&12&&Rb();gc(d)}}function mc(c){if(M){b.$StopEvent(c);var a=b.$EvtSrc(c);while(a&&v!==a){a.tagName=="A"&&b.$CancelEvent(c);try{a=a.parentNode}catch(d){break}}}}function Lb(a){C[s];s=t(a);tb=C[s];Wb(a);return s}function Hc(a,b){x=0;Lb(a);h.$TriggerEvent(i.$EVT_PARK,t(a),b)}function Wb(a,c){yb=a;b.$Each(S,function(b){b.$SetCurrentIndex(t(a),a,c)})}function wc(){var b=i.$DragRegistry||0,a=Y;if(jb)a&1&&(a&=1);i.$DragRegistry|=a;return L=a&~b}function tc(){if(L){i.$DragRegistry&=~Y;L=0}}function Zb(){var a=b.$CreateDiv();b.$SetStyles(a,V);b.$CssPosition(a,"absolute");return a}function t(a){return(a%r+r)%r}function nc(b,d){if(d)if(!D){b=c.min(c.max(b+yb,0),r-u);d=l}else if(D&2){b=t(b+yb);d=l}nb(b,a.$SlideDuration,d)}function zb(){b.$Each(S,function(a){a.$Show(a.$Options.$ChanceToShow<=F)})}function kc(){if(!F){F=1;zb();if(!B){E&12&&gc();E&3&&C[s].$TryActivate()}}}function jc(){if(F){F=0;zb();B||!(E&12)||ic()}}function lc(){V={$Width:K,$Height:J,$Top:0,$Left:0};b.$Each(T,function(a){b.$SetStyles(a,V);b.$CssPosition(a,"absolute");b.$CssOverflow(a,"hidden");b.$HideElement(a)});b.$SetStyles(cb,V)}function lb(b,a){nb(b,a,d)}function nb(h,f,k){if(Tb&&(!B&&(F||!(E&12))||a.$NaviQuitDrag)){O=d;B=l;z.$Stop();if(f==g)f=Xb;var e=Eb.$GetPosition_Display(),b=h;if(k){b=e+h;if(h>0)b=c.ceil(b);else b=c.floor(b)}if(D&2)b=t(b);if(!(D&1))b=c.max(0,c.min(b,r-u));var j=(b-e)%r;b=e+j;var i=e==b?0:f*c.abs(j);i=c.min(i,f*u*1.5);z.$PlayCarousel(e,b,i||1)}}h.$PlayTo=nb;h.$GoTo=function(a){w.$GoToPosition(Lb(a))};h.$Next=function(){lb(1)};h.$Prev=function(){lb(-1)};h.$Pause=function(){P=l};h.$Play=function(){if(!P){P=d;C[s]&&C[s].$TryActivate()}};h.$SetSlideshowTransitions=function(b){a.$SlideshowOptions.$Transitions=b};h.$SetCaptionTransitions=function(a){I.$Transitions=a;I.$Version=b.$GetNow()};h.$SlidesCount=function(){return T.length};h.$CurrentIndex=function(){return s};h.$IsAutoPlaying=function(){return P};h.$IsDragging=function(){return B};h.$IsSliding=function(){return O};h.$IsMouseOver=function(){return!F};h.$LastDragSucceded=function(){return M};function X(){return b.$CssWidth(y||p)}function ib(){return b.$CssHeight(y||p)}h.$OriginalWidth=h.$GetOriginalWidth=X;h.$OriginalHeight=h.$GetOriginalHeight=ib;function Gb(c,d){if(c==g)return b.$CssWidth(p);if(!y){var a=b.$CreateDiv(f);b.$ClassName(a,b.$ClassName(p));b.$CssCssText(a,b.$CssCssText(p));b.$CssDisplay(a,"block");b.$CssPosition(a,"relative");b.$CssTop(a,0);b.$CssLeft(a,0);b.$CssOverflow(a,"visible");y=b.$CreateDiv(f);b.$CssPosition(y,"absolute");b.$CssTop(y,0);b.$CssLeft(y,0);b.$CssWidth(y,b.$CssWidth(p));b.$CssHeight(y,b.$CssHeight(p));b.$CssTransformOrigin(y,"0 0");b.$AppendChild(y,a);var i=b.$Children(p);b.$AppendChild(p,y);b.$Css(p,"backgroundImage","");b.$Each(i,function(c){b.$AppendChild(b.$AttributeEx(c,"noscale")?p:a,c);b.$AttributeEx(c,"autocenter")&&Nb.push(c)})}Z=c/(d?b.$CssHeight:b.$CssWidth)(y);b.$CssScale(y,Z);var h=d?Z*X():c,e=d?c:Z*ib();b.$CssWidth(p,h);b.$CssHeight(p,e);b.$Each(Nb,function(a){var c=b.$ParseInt(b.$AttributeEx(a,"autocenter"));b.$CenterElement(a,c)})}h.$ScaleHeight=h.$GetScaleHeight=function(a){if(a==g)return b.$CssHeight(p);Gb(a,d)};h.$ScaleWidth=h.$SetScaleWidth=h.$GetScaleWidth=Gb;h.$GetVirtualIndex=function(a){var d=c.ceil(t(fb/dc)),b=t(a-s+d);if(b>u){if(a-s>r/2)a-=r;else if(a-s<=-r/2)a+=r}else a=s+b-d;return a};n.call(h);h.$Elmt=p=b.$GetElement(p);var a=b.$Extend({$FillMode:0,$LazyLoading:1,$ArrowKeyNavigation:1,$StartIndex:0,$AutoPlay:l,$Loop:1,$HWA:d,$NaviQuitDrag:d,$AutoPlaySteps:1,$AutoPlayInterval:3e3,$PauseOnHover:1,$SlideDuration:500,$SlideEasing:e.$EaseOutQuad,$MinDragOffsetToSlide:20,$SlideSpacing:0,$Cols:1,$Align:0,$UISearchMode:1,$PlayOrientation:1,$DragOrientation:1},hc);a.$HWA=a.$HWA&&b.$IsBrowser3dSafe();if(a.$Idle!=g)a.$AutoPlayInterval=a.$Idle;if(a.$ParkingPosition!=g)a.$Align=a.$ParkingPosition;var gb=a.$PlayOrientation&3,xc=(a.$PlayOrientation&4)/-4||1,db=a.$SlideshowOptions,I=b.$Extend({$Class:q,$PlayInMode:1,$PlayOutMode:1,$HWA:a.$HWA},a.$CaptionSliderOptions);I.$Transitions=I.$Transitions||I.$CaptionTransitions;var qb=a.$BulletNavigatorOptions,W=a.$ArrowNavigatorOptions,ab=a.$ThumbnailNavigatorOptions,Q=!a.$UISearchMode,y,v=b.$FindChild(p,"slides",Q),cb=b.$FindChild(p,"loading",Q)||b.$CreateDiv(f),Jb=b.$FindChild(p,"navigator",Q),ec=b.$FindChild(p,"arrowleft",Q),cc=b.$FindChild(p,"arrowright",Q),Hb=b.$FindChild(p,"thumbnavigator",Q),pc=b.$CssWidth(v),oc=b.$CssHeight(v),V,T=[],yc=b.$Children(v);b.$Each(yc,function(a){if(a.tagName=="DIV"&&!b.$AttributeEx(a,"u"))T.push(a);else b.$IsBrowserIe9Earlier()&&b.$CssZIndex(a,(b.$CssZIndex(a)||0)+1)});var s=-1,yb,tb,r=T.length,K=a.$SlideWidth||pc,J=a.$SlideHeight||oc,Yb=a.$SlideSpacing,Bb=K+Yb,Cb=J+Yb,dc=gb&1?Bb:Cb,u=c.min(a.$Cols,r),hb,x,L,Ab,S=[],Sb,Ub,Qb,fc,Gc,P,E=a.$PauseOnHover,qc=a.$AutoPlayInterval,Xb=a.$SlideDuration,rb,ub,fb,Tb=u<r,D=Tb?a.$Loop:0,Y,M,F=1,O,B,R,vb=0,wb=0,H,bb,eb,Eb,w,U,z,Vb=new sc,Z,Nb=[];if(r){if(a.$HWA)Mb=function(a,c,d){b.$SetStyleTransform(a,{$TranslateX:c,$TranslateY:d})};P=a.$AutoPlay;h.$Options=hc;lc();b.$Attribute(p,"jssor-slider",d);b.$CssZIndex(v,b.$CssZIndex(v)||0);b.$CssPosition(v,"absolute");hb=b.$CloneNode(v,d);b.$InsertBefore(hb,v);if(db){fc=db.$ShowLink;rb=db.$Class;ub=u==1&&r>1&&rb&&(!b.$IsBrowserIE()||b.$BrowserVersion()>=8)}fb=ub||u>=r||!(D&1)?0:a.$Align;Y=(u>1||fb?gb:-1)&a.$DragOrientation;var xb=v,C=[],A,N,Fb=b.$Device(),jb=Fb.$Touchable,G,pb,Kb,sb;Fb.$TouchActionAttr&&b.$Css(xb,Fb.$TouchActionAttr,([j,"pan-y","pan-x","none"])[Y]||"");U=new Dc;if(ub)A=new rb(Vb,K,J,db,jb);b.$AppendChild(hb,U.$Wrapper);b.$CssOverflow(v,"hidden");N=Zb();b.$Css(N,"backgroundColor","#000");b.$CssOpacity(N,0);b.$InsertBefore(N,xb.firstChild,xb);for(var ob=0;ob<T.length;ob++){var Ac=T[ob],Cc=new Bc(Ac,ob);C.push(Cc)}b.$HideElement(cb);Eb=new Ec;z=new rc(Eb,U);if(Y){b.$AddEvent(v,"mousedown",ac);b.$AddEvent(v,"touchstart",vc);b.$AddEvent(v,"dragstart",Ib);b.$AddEvent(v,"selectstart",Ib);b.$AddEvent(f,"mouseup",mb);b.$AddEvent(f,"touchend",mb);b.$AddEvent(f,"touchcancel",mb);b.$AddEvent(k,"blur",mb)}E&=jb?10:5;if(Jb&&qb){Sb=new qb.$Class(Jb,qb,X(),ib());S.push(Sb)}if(W&&ec&&cc){W.$Loop=D;W.$Cols=u;Ub=new W.$Class(ec,cc,W,X(),ib());S.push(Ub)}if(Hb&&ab){ab.$StartIndex=a.$StartIndex;Qb=new ab.$Class(Hb,ab);S.push(Qb)}b.$Each(S,function(a){a.$Reset(r,C,cb);a.$On(o.$NAVIGATIONREQUEST,nc)});b.$Css(p,"visibility","visible");Gb(X());b.$AddEvent(v,"click",mc,d);b.$AddEvent(p,"mouseout",b.$MouseOverOutFilter(kc,p));b.$AddEvent(p,"mouseover",b.$MouseOverOutFilter(jc,p));zb();a.$ArrowKeyNavigation&&b.$AddEvent(f,"keydown",function(b){if(b.keyCode==37)lb(-a.$ArrowKeyNavigation);else b.keyCode==39&&lb(a.$ArrowKeyNavigation)});var kb=a.$StartIndex;if(!(D&1))kb=c.max(0,c.min(kb,r-u));z.$PlayCarousel(kb,kb,0)}};i.$EVT_CLICK=21;i.$EVT_DRAG_START=22;i.$EVT_DRAG_END=23;i.$EVT_SWIPE_START=24;i.$EVT_SWIPE_END=25;i.$EVT_LOAD_START=26;i.$EVT_LOAD_END=27;i.$EVT_FREEZE=28;i.$EVT_POSITION_CHANGE=202;i.$EVT_PARK=203;i.$EVT_SLIDESHOW_START=206;i.$EVT_SLIDESHOW_END=207;i.$EVT_PROGRESS_CHANGE=208;i.$EVT_STATE_CHANGE=209;var o={$NAVIGATIONREQUEST:1,$INDEXCHANGE:2,$RESET:3};k.$JssorBulletNavigator$=function(e,C){var f=this;n.call(f);e=b.$GetElement(e);var s,A,z,r,k=0,a,m,i,w,x,h,g,q,p,B=[],y=[];function v(a){a!=-1&&y[a].$Selected(a==k)}function t(a){f.$TriggerEvent(o.$NAVIGATIONREQUEST,a*m)}f.$Elmt=e;f.$GetCurrentIndex=function(){return r};f.$SetCurrentIndex=function(a){if(a!=r){var d=k,b=c.floor(a/m);k=b;r=a;v(d);v(b)}};f.$Show=function(a){b.$ShowElement(e,a)};var u;f.$Reset=function(E){if(!u){s=c.ceil(E/m);k=0;var o=q+w,r=p+x,n=c.ceil(s/i)-1;A=q+o*(!h?n:i-1);z=p+r*(h?n:i-1);b.$CssWidth(e,A);b.$CssHeight(e,z);for(var f=0;f<s;f++){var C=b.$CreateSpan();b.$InnerText(C,f+1);var l=b.$BuildElement(g,"numbertemplate",C,d);b.$CssPosition(l,"absolute");var v=f%(n+1);b.$CssLeft(l,!h?o*v:f%i*o);b.$CssTop(l,h?r*v:c.floor(f/(n+1))*r);b.$AppendChild(e,l);B[f]=l;a.$ActionMode&1&&b.$AddEvent(l,"click",b.$CreateCallback(j,t,f));a.$ActionMode&2&&b.$AddEvent(l,"mouseover",b.$MouseOverOutFilter(b.$CreateCallback(j,t,f),l));y[f]=b.$Buttonize(l)}u=d}};f.$Options=a=b.$Extend({$SpacingX:10,$SpacingY:10,$Orientation:1,$ActionMode:1},C);g=b.$FindChild(e,"prototype");q=b.$CssWidth(g);p=b.$CssHeight(g);b.$RemoveElement(g,e);m=a.$Steps||1;i=a.$Rows||1;w=a.$SpacingX;x=a.$SpacingY;h=a.$Orientation-1;a.$Scale==l&&b.$Attribute(e,"noscale",d);a.$AutoCenter&&b.$Attribute(e,"autocenter",a.$AutoCenter)};k.$JssorArrowNavigator$=function(a,g,h){var c=this;n.call(c);var r,q,e,f,i;b.$CssWidth(a);b.$CssHeight(a);function k(a){c.$TriggerEvent(o.$NAVIGATIONREQUEST,a,d)}function p(c){b.$ShowElement(a,c||!h.$Loop&&e==0);b.$ShowElement(g,c||!h.$Loop&&e>=q-h.$Cols);r=c}c.$GetCurrentIndex=function(){return e};c.$SetCurrentIndex=function(b,a,c){if(c)e=a;else{e=b;p(r)}};c.$Show=p;var m;c.$Reset=function(c){q=c;e=0;if(!m){b.$AddEvent(a,"click",b.$CreateCallback(j,k,-i));b.$AddEvent(g,"click",b.$CreateCallback(j,k,i));b.$Buttonize(a);b.$Buttonize(g);m=d}};c.$Options=f=b.$Extend({$Steps:1},h);i=f.$Steps;if(f.$Scale==l){b.$Attribute(a,"noscale",d);b.$Attribute(g,"noscale",d)}if(f.$AutoCenter){b.$Attribute(a,"autocenter",f.$AutoCenter);b.$Attribute(g,"autocenter",f.$AutoCenter)}};k.$JssorThumbnailNavigator$=function(g,B){var h=this,y,p,a,v=[],z,x,e,q,r,u,t,m,s,f,k;n.call(h);g=b.$GetElement(g);function A(n,f){var g=this,c,m,l;function q(){m.$Selected(p==f)}function i(d){if(d||!s.$LastDragSucceded()){var a=e-f%e,b=s.$GetVirtualIndex((f+a)/e-1),c=b*e+e-a;h.$TriggerEvent(o.$NAVIGATIONREQUEST,c)}}g.$Index=f;g.$Highlight=q;l=n.$Thumb||n.$Image||b.$CreateDiv();g.$Wrapper=c=b.$BuildElement(k,"thumbnailtemplate",l,d);m=b.$Buttonize(c);a.$ActionMode&1&&b.$AddEvent(c,"click",b.$CreateCallback(j,i,0));a.$ActionMode&2&&b.$AddEvent(c,"mouseover",b.$MouseOverOutFilter(b.$CreateCallback(j,i,1),c))}h.$GetCurrentIndex=function(){return p};h.$SetCurrentIndex=function(b,d,f){var a=p;p=b;a!=-1&&v[a].$Highlight();v[b].$Highlight();!f&&s.$PlayTo(s.$GetVirtualIndex(c.floor(d/e)))};h.$Show=function(a){b.$ShowElement(g,a)};var w;h.$Reset=function(F,D){if(!w){y=F;c.ceil(y/e);p=-1;m=c.min(m,D.length);var h=a.$Orientation&1,n=u+(u+q)*(e-1)*(1-h),k=t+(t+r)*(e-1)*h,B=n+(n+q)*(m-1)*h,o=k+(k+r)*(m-1)*(1-h);b.$CssPosition(f,"absolute");b.$CssOverflow(f,"hidden");a.$AutoCenter&1&&b.$CssLeft(f,(z-B)/2);a.$AutoCenter&2&&b.$CssTop(f,(x-o)/2);b.$CssWidth(f,B);b.$CssHeight(f,o);var j=[];b.$Each(D,function(l,g){var i=new A(l,g),d=i.$Wrapper,a=c.floor(g/e),k=g%e;b.$CssLeft(d,(u+q)*k*(1-h));b.$CssTop(d,(t+r)*k*h);if(!j[a]){j[a]=b.$CreateDiv();b.$AppendChild(f,j[a])}b.$AppendChild(j[a],d);v.push(i)});var E=b.$Extend({$AutoPlay:l,$NaviQuitDrag:l,$SlideWidth:n,$SlideHeight:k,$SlideSpacing:q*h+r*(1-h),$MinDragOffsetToSlide:12,$SlideDuration:200,$PauseOnHover:1,$PlayOrientation:a.$Orientation,$DragOrientation:a.$NoDrag||a.$DisableDrag?0:a.$Orientation},a);s=new i(g,E);w=d}};h.$Options=a=b.$Extend({$SpacingX:0,$SpacingY:0,$Cols:1,$Orientation:1,$AutoCenter:3,$ActionMode:1},B);z=b.$CssWidth(g);x=b.$CssHeight(g);f=b.$FindChild(g,"slides",d);k=b.$FindChild(f,"prototype");u=b.$CssWidth(k);t=b.$CssHeight(k);b.$RemoveElement(k,f);e=a.$Rows||1;q=a.$SpacingX;r=a.$SpacingY;m=a.$Cols;a.$Scale==l&&b.$Attribute(g,"noscale",d)};function q(e,d,c){var a=this;m.call(a,0,c);a.$Revert=b.$EmptyFunction;a.$IdleBegin=0;a.$IdleEnd=c}k.$JssorCaptionSlideo$=function(n,f,l){var a=this,o,g={},i=f.$Transitions,c=new m(0,0);m.call(a,0,0);function j(d,c){var a={};b.$Each(d,function(d,f){var e=g[f];if(e){if(b.$IsPlainObject(d))d=j(d,c||f=="e");else if(c)if(b.$IsNumeric(d))d=o[d];a[e]=d}});return a}function k(e,c){var a=[],d=b.$Children(e);b.$Each(d,function(d){var h=b.$AttributeEx(d,"u")=="caption";if(h){var e=b.$AttributeEx(d,"t"),g=i[b.$ParseInt(e)]||i[e],f={$Elmt:d,$Transition:g};a.push(f)}if(c<5)a=a.concat(k(d,c+1))});return a}function r(d,e,a){b.$Each(e,function(g){var e=j(g),f=b.$FormatEasings(e.$Easing);if(e.$Left){e.$MoveX=e.$Left;f.$MoveX=f.$Left;delete e.$Left}if(e.$Top){e.$MoveY=e.$Top;f.$MoveY=f.$Top;delete e.$Top}var h={$Easing:f,$OriginalWidth:a.$Width,$OriginalHeight:a.$Height},i=new m(g.b,g.d,h,d,a,e);c.$Combine(i);a=b.$AddDif(a,e)});return a}function q(a){b.$Each(a,function(f){var a=f.$Elmt,e=b.$CssWidth(a),d=b.$CssHeight(a),c={$Left:b.$CssLeft(a),$Top:b.$CssTop(a),$MoveX:0,$MoveY:0,$Opacity:1,$ZIndex:b.$CssZIndex(a)||0,$Rotate:0,$RotateX:0,$RotateY:0,$ScaleX:1,$ScaleY:1,$TranslateX:0,$TranslateY:0,$TranslateZ:0,$SkewX:0,$SkewY:0,$Width:e,$Height:d,$Clip:{$Top:0,$Right:e,$Bottom:d,$Left:0}};c.$OriginalX=c.$Left;c.$OriginalY=c.$Top;r(a,f.$Transition,c)})}function t(g,f,h){var e=g.b-f;if(e){var b=new m(f,e);b.$Combine(c,d);b.$Shift(h);a.$Combine(b)}a.$Expand(g.d);return e}function s(f){var d=c.$GetPosition_OuterBegin(),e=0;b.$Each(f,function(c,f){c=b.$Extend({d:l},c);t(c,d,e);d=c.b;e+=c.d;if(!f||c.t==2){a.$IdleBegin=d;a.$IdleEnd=d+c.d}})}a.$Revert=function(){a.$GoToPosition(-1,d)};o=[h.$Swing,h.$Linear,h.$InQuad,h.$OutQuad,h.$InOutQuad,h.$InCubic,h.$OutCubic,h.$InOutCubic,h.$InQuart,h.$OutQuart,h.$InOutQuart,h.$InQuint,h.$OutQuint,h.$InOutQuint,h.$InSine,h.$OutSine,h.$InOutSine,h.$InExpo,h.$OutExpo,h.$InOutExpo,h.$InCirc,h.$OutCirc,h.$InOutCirc,h.$InElastic,h.$OutElastic,h.$InOutElastic,h.$InBack,h.$OutBack,h.$InOutBack,h.$InBounce,h.$OutBounce,h.$InOutBounce,h.$GoBack,h.$InWave,h.$OutWave,h.$OutJump,h.$InJump];var u={$Top:"y",$Left:"x",$Bottom:"m",$Right:"t",$Rotate:"r",$RotateX:"rX",$RotateY:"rY",$ScaleX:"sX",$ScaleY:"sY",$TranslateX:"tX",$TranslateY:"tY",$TranslateZ:"tZ",$SkewX:"kX",$SkewY:"kY",$Opacity:"o",$Easing:"e",$ZIndex:"i",$Clip:"c"};b.$Each(u,function(b,a){g[b]=a});q(k(n,1));c.$GoToPosition(-1);var p=f.$Breaks||[],e=[].concat(p[b.$ParseInt(b.$AttributeEx(n,"b"))]||[]);e.push({b:c.$GetPosition_OuterEnd(),d:e.length?0:l});s(e);a.$GoToPosition(-1)}})(window,document,Math,null,true,false);window.EnterpriseView = countlyView.extend({
    initialize:function () {},
	beforeRender: function() {
		if(!this.template){
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/enterpriseinfo/templates/info.html', function(src){
				self.template = Handlebars.compile(src);
			})).then(function () {});
		}
    },
    pageScript:function () {
        var titles = {
            "drill":jQuery.i18n.map["enterpriseinfo.drill-pitch"],
            "funnels":jQuery.i18n.map["enterpriseinfo.funnels-pitch"],
            "retention":jQuery.i18n.map["enterpriseinfo.retention-pitch"],
            "revenue":jQuery.i18n.map["enterpriseinfo.revenue-pitch"],
            "user-profiles":jQuery.i18n.map["enterpriseinfo.user-profiles-pitch"],
            "attribution":jQuery.i18n.map["enterpriseinfo.attribution-pitch"],
            //"flows":jQuery.i18n.map["enterpriseinfo.flows-pitch"],
            "scalability": jQuery.i18n.map["enterpriseinfo.scalability-pitch"],
            "support":jQuery.i18n.map["enterpriseinfo.support-pitch"],
            "raw-data":jQuery.i18n.map["enterpriseinfo.raw-data-pitch"]
        }

        $("#enterprise-sections").find(".app-container").on("click", function() {
            var section = $(this).data("section");

            $(".enterprise-content").hide();
            $(".enterprise-content." + section).show();
            var localize = $(".enterprise-content." + section + " .text").data("localization");
            $(".enterprise-content." + section + " .text").html(jQuery.i18n.map[localize]);

            $("#enterprise-sections").find(".app-container").removeClass("active");
            $(this).addClass("active");

            $(".widget-header .title").text(titles[section] || "");
        });
        $("#enterprise-sections").find(".app-container").first().click();
    },
    renderCommon:function () {
        $(this.el).html(this.template(this.templateData));
        this.pageScript();
    }
});

//register views
app.enterpriseView = new EnterpriseView();

app.route( "/enterprise", "enterprise", function () {
	this.renderWhenReady(this.enterpriseView);
});

$( document ).ready(function() {
	var menu = '<a class="item" id="enterprise-menu" href="#/enterprise">'+
		'<div class="logo ion-ios-infinite"></div>'+
        '<div class="text" data-localize="enterpriseinfo.title">Enterprise</div>'+
    '</a>';
	$('#sidebar-menu .sidebar-menu').append(menu);
	
	if(typeof countlyGlobalEE != "undefined" && countlyGlobalEE["discount"]){
		var msg = {title:"5000+ users reached", message: "<a href='https://count.ly/enterprise-edition/' target='_blank'>To get 20% off Enterprise edition contact us with code:<br/><strong>"+countlyGlobalEE["discount"]+"</strong></a>", info:"Thank you for being with us", sticky:true, closeOnClick:false};
		CountlyHelpers.notify(msg);
    }
});;(function (countlyLogger, $, undefined) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlyLogger.initialize = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "method":"logs"
            },
            success:function (json) {
                _data = json;
            }
        });
    };
	
	countlyLogger.getData = function () {
		return _data;
    };
	
}(window.countlyLogger = window.countlyLogger || {}, jQuery));;window.LoggerView = countlyView.extend({
	initialize:function () {
		this.filter = (store.get("countly_loggerfilter")) ? store.get("countly_loggerfilter") : "logger-all";
    },
    beforeRender: function() {
		if(this.template)
			return $.when(countlyLogger.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/logger/templates/logger.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyLogger.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
        var data = countlyLogger.getData();
        this.templateData = {
            "page-title":jQuery.i18n.map["logger.title"]
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
			$("#"+this.filter).addClass("selected").addClass("active");
			$.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
				if(!$(oSettings.nTable).hasClass("logger-filter"))
					return true;
				if((self.filter == "logger-event" && aData[0] != "Event") || (self.filter == "logger-session" && aData[0] != "Session") || (self.filter == "logger-metric" && aData[0] != "Metrics") || (self.filter == "logger-user" && aData[0] != "User details") || (self.filter == "logger-crash" && aData[0] != "Crash")){
					return false
				}
				return true;
			});

			this.dtable = $('#logger-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "aoColumns": [
                    { "mData": function(row, type){return row.t.charAt(0).toUpperCase() + row.t.slice(1).replace(/_/g, " ");}, "sType":"string", "sTitle": jQuery.i18n.map["logger.type"]},
                    { "mData": function(row, type){
						if(type == "display"){
							return moment(row.ts*1000).format("MMMM Do YYYY, hh:mm:ss");
						}else return row.ts;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.timestamp"] },
                    { "mData": function(row, type){
						if(type == "display"){
							return moment(row.reqts*1000).format("MMMM Do YYYY, hh:mm:ss");
						}else return row.reqts;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.requestts"]},
                    { "mData": function(row, type){if(row.v)return row.v.replace(new RegExp(":", 'g'),"."); else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["logger.version"]},
                    { "mData": function(row, type){
						var ret = "Device ID: " + row.d.id;
						if(row.d.d){
							ret += "<br/>"+row.d.d;
							if(row.d.p){
								ret += " ("+row.d.p;
								if(row.d.pv){
									ret += " "+row.d.pv.substring(1).replace(new RegExp(":", 'g'),".");
								}
								ret += ")";
							}
						}
						return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.device"]},
                    { "mData": function(row, type){if(row.s)return (row.s.name || "")+" "+(row.s.version || ""); else return "";}, "sType":"string", "sTitle": jQuery.i18n.map["logger.sdk"]},
                    { "mData": function(row, type){
						var ret = "";
						if(row.l.cc){
							ret += '<div class="flag" style="background-image: url(images/flags/'+ row.l.cc.toLowerCase() + '.png);"></div>'+row.l.cc;
							if(row.l.cty){
								ret += " ("+row.l.cty+")";
							}
						}
						if(row.l.ip){
							ret += "<br/>"+row.l.ip;
						}
						return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.location"]},
                    { "mData": function(row, type){
						if(typeof row.i == "object")
							return "<pre style='white-space:pre-wrap;'>"+JSON.stringify(row.i, null, 2)+"</pre>";
						else
							return row.i;}, "sType":"string", "sTitle": jQuery.i18n.map["logger.info"]}
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [1,'desc'] ] );
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyLogger.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }
             var data = countlyLogger.getData();
			CountlyHelpers.refreshTable(self.dtable, data);
            app.localize();
        });
    },
	filterLog: function(filter){
		this.filter = filter;
		store.set("countly_loggerfilter", filter);
		$("#"+this.filter).addClass("selected").addClass("active");
		this.dtable.fnDraw();
	}
});

//register views
app.loggerView = new LoggerView();

app.route('/manage/logger', 'logger', function () {
	this.renderWhenReady(this.loggerView);
});
app.addPageScript("/manage/logger", function(){
   $("#logger-selector").find(">.button").click(function () {
        if ($(this).hasClass("selected")) {
            return true;
        }

        $(".logger-selector").removeClass("selected").removeClass("active");
		var filter = $(this).attr("id");
		app.activeView.filterLog(filter);
    });
});

$( document ).ready(function() {
	var menu = '<a href="#/manage/logger" class="item">'+
		'<div class="logo-icon fa fa-bars"></div>'+
		'<div class="text" data-localize="logger.title"></div>'+
	'</a>';
	if($('#management-submenu .help-toggle').length)
		$('#management-submenu .help-toggle').before(menu);
});;(function (countlySystemLogs, $, undefined) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlySystemLogs.initialize = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "method":"systemlogs"
            },
            success:function (json) {
                _data = json;
            }
        });
    };
	
	countlySystemLogs.getData = function () {
		return _data;
    };
	
}(window.countlySystemLogs = window.countlySystemLogs || {}, jQuery));;window.SystemLogsView = countlyView.extend({
	initialize:function () {
		
    },
    beforeRender: function() {
		if(this.template)
			return $.when(countlySystemLogs.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/systemlogs/templates/logs.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlySystemLogs.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
        var data = countlySystemLogs.getData();
        this.templateData = {
            "page-title":jQuery.i18n.map["systemlogs.title"]
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

			this.dtable = $('#systemlogs-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "aoColumns": [
                    { "mData": function(row, type){
						if(type == "display"){
							return moment(row.ts*1000).format("MMMM Do YYYY, hh:mm:ss");
						}else return row.ts;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.timestamp"] },
					{ "mData": function(row, type){return row.u;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.user"]},
					{ "mData": function(row, type){return row.a;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.action"]},
                    { "mData": function(row, type){return row.ip;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.ip-address"]},
                    { "mData": function(row, type){
						if(typeof row.i == "object")
							return "<pre style='white-space:pre-wrap;'>"+JSON.stringify(row.i, null, 2)+"</pre>";
						else
							return row.i;}, "sType":"string", "sTitle": jQuery.i18n.map["systemlogs.info"]}
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [0,'desc'] ] );
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlySystemLogs.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            var data = countlySystemLogs.getData();
			CountlyHelpers.refreshTable(self.dtable, data);
            app.localize();
        });
    }
});

//register views
app.systemLogsView = new SystemLogsView();
if(countlyGlobal["member"].global_admin){
    app.route('/manage/systemlogs', 'systemlogs', function () {
        this.renderWhenReady(this.systemLogsView);
    });
}

$( document ).ready(function() {
    if(countlyGlobal["member"].global_admin){
        var menu = '<a href="#/manage/systemlogs" class="item">'+
            '<div class="logo-icon fa fa-user-secret"></div>'+
            '<div class="text" data-localize="systemlogs.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});;(function (countlyErrorLogs, $, undefined) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlyErrorLogs.initialize = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/errorlogs",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID
            },
            success:function (json) {
                _data = json;
            }
        });
    };
	
	countlyErrorLogs.getData = function () {
		return _data;
    };
    
    countlyErrorLogs.del = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/errorlogs",
            data:{
				"api_key":countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                log:id
            }
        });
    };
	
}(window.countlyErrorLogs = window.countlyErrorLogs || {}, jQuery));;window.ErrorLogsView = countlyView.extend({
	initialize:function () {
		
	},
    beforeRender: function() {
		if(this.template)
			return $.when(countlyErrorLogs.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/errorlogs/templates/logs.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyErrorLogs.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
		var data = countlyErrorLogs.getData();
        var download = countlyGlobal["path"]+"/o/errorlogs?api_key="+countlyGlobal.member.api_key+"&app_id="+countlyCommon.ACTIVE_APP_ID+"&download=true&log=";
        this.templateData = {
            "page-title":jQuery.i18n.map["errorlogs.title"],
            download: download,
            logs: data
        };
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $( "#tabs" ).tabs();
            $(".btn-clear-log").on("click", function(){
				var id = $(this).data("id");
				CountlyHelpers.confirm(jQuery.i18n.map["errorlogs.confirm-delete"], "red", function (result) {
					if (!result) {
						return true;
					}
					$.when(countlyErrorLogs.del(id)).then(function (data) {
						if(data.result == "Success"){
							$.when(countlyErrorLogs.initialize()).then(function () {
                                self.renderCommon();
                                app.localize();
                            });
						}
						else{
							CountlyHelpers.alert(data.result, "red");
						}
					});
				});
			});
        }
    },
    refresh:function () {
    }
});


//register views
app.errorLogsView = new ErrorLogsView();
if(countlyGlobal["member"].global_admin){
    app.route('/manage/errorlogs', 'errorlogs', function () {
        this.renderWhenReady(this.errorLogsView);
    });
}

$( document ).ready(function() {
    if(countlyGlobal["member"].global_admin){
        var menu = '<a href="#/manage/errorlogs" class="item">'+
            '<div class="logo-icon fa fa-exclamation-triangle"></div>'+
            '<div class="text" data-localize="errorlogs.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});;(function (countlyPopulator, $, undefined) {
	var props = {
		_os: ["Android", "iOS", "Windows Phone"],
        _os_web: ["Android", "iOS", "Windows Phone", "Windows", "OSX"],
		_os_version: ["2.2", "2.3", "3.1", "3.2", "4.0", "4.1", "4.2", "4.3", "4.4", "5.0", "5.1", "6.0", "6.1", "7.0", "7.1", "8.0", "8.1"],
		_resolution: ["320x480", "768x1024", "640x960", "1536x2048", "320x568", "640x1136", "480x800", "240x320", "540x960", "480x854", "240x400", "360x640", "800x1280", "600x1024", "600x800", "768x1366", "720x1280", "1080x1920"],	
		_device: ["One Touch Idol X", "Kindle Fire HDX", "Fire Phone", "iPhone 5", "iPhone Mini", "iPhone 4S", "iPhone 5C", "iPad 4", "iPad Air","iPhone 6","Nexus 7","Nexus 10","Nexus 4","Nexus 5", "Windows Phone", "One S", "Optimus L5", "Lumia 920", "Galaxy Note", "Xperia Z"],
		_manufacture: ["Samsung", "Sony Ericsson", "LG", "Google", "HTC", "Nokia", "Apple", "Huaiwei", "Lenovo", "Acer"],
		_carrier: ["Telus", "Rogers Wireless", "T-Mobile", "Bell Canada", "	AT&T", "Verizon", "Vodafone", "Cricket Communications", "O2", "Tele2", "Turkcell", "Orange", "Sprint", "Metro PCS"],
		_app_version: ["1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8", "1.9", "2.0", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "3.0", "3.1", "3.2"],
		_cpu: ["armv6", "armv7", "x86"],
		_opengl: ["opengl_es1", "opengl_es2"],
		_density: ["120dpi", "160dpi", "240dpi", "320dpi", "480dpi", "640dpi"],
		_locale: ["en_CA", "fr_FR", "de_DE", "it_IT", "ja_JP", "ko_KR", "en_US"],
        _browser: ["Opera", "Chrome", "Internet Explorer", "Safari", "Firefox"],
        _store: ["com.android.vending","com.google.android.feedback","com.google.vending","com.slideme.sam.manager","com.amazon.venezia","com.sec.android.app.samsungapps","com.nokia.payment.iapenabler","com.qihoo.appstore","cn.goapk.market","com.wandoujia.phoenix2","com.hiapk.marketpho","com.hiapk.marketpad","com.dragon.android.pandaspace","me.onemobile.android","com.aspire.mm","com.xiaomi.market","com.miui.supermarket","com.baidu.appsearch","com.tencent.android.qqdownloader","com.android.browser","com.bbk.appstore","cm.aptoide.pt","com.nduoa.nmarket","com.rim.marketintent","com.lenovo.leos.appstore","com.lenovo.leos.appstore.pad","com.keenhi.mid.kitservice","com.yingyonghui.market","com.moto.mobile.appstore","com.aliyun.wireless.vos.appstore","com.appslib.vending","com.mappn.gfan","com.diguayouxi","um.market.android","com.huawei.appmarket","com.oppo.market","com.taobao.appcenter"],
        _source: ["https://www.google.lv", "https://www.google.co.in/", "https://www.google.ru/", "http://stackoverflow.com/questions", "http://stackoverflow.com/unanswered", "http://stackoverflow.com/tags", "http://r.search.yahoo.com/"]
	};
	var eventsMap = {
		"Login": ["Lost", "Won"],
		"Logout": [],
		"Lost": ["Won", "Achievement", "Lost"],
		"Won": ["Lost", "Achievement"],
		"Achievement": ["Sound", "Shared"],
		"Sound": ["Lost", "Won"],
		"Shared": ["Lost", "Won"],
	};
	var pushEvents = ["[CLY]_push_sent", "[CLY]_push_open", "[CLY]_push_action"];
	var segments  = {
		Login: {referer: ["twitter", "notification", "unknown"]},
		Buy: {screen: ["End Level", "Main screen", "Before End"]},
		Lost: {level: [1,2,3,4,5,6,7,8,9,10,11], mode:["arcade", "physics", "story"], difficulty:["easy", "medium", "hard"]},
		Won: {level: [1,2,3,4,5,6,7,8,9,10,11], mode:["arcade", "physics", "story"], difficulty:["easy", "medium", "hard"]},
		Achievement: {name:["Runner", "Jumper", "Shooter", "Berserker", "Tester"]},
		Sound: {state:["on", "off"]}
	};
	segments["[CLY]_push_open"]={i:"123456789012345678901234"};
	segments["[CLY]_push_action"]={i:"123456789012345678901234"};
	segments["[CLY]_push_sent"]={i:"123456789012345678901234"};
	segments["[CLY]_view"]={
        name:["Settings Page", "Purchase Page", "Credit Card Entry", "Profile page", "Start page", "Message page"],
        visit:[1],
        start:[0,1],
        exit:[0,1],
        bounce:[0,1]
    };
	var crashProps = ["root", "ram_current", "ram_total", "disk_current", "disk_total", "bat_current", "bat_total", "orientation", "stack", "log", "custom", "features", "settings", "comment", "os", "os_version", "manufacture", "device", "resolution", "app_version"];
    var ip_address = [];
	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	function capitaliseFirstLetter(string)
	{
		return string.charAt(0).toUpperCase() + string.slice(1);
	}
	function createRandomObj()
	{
        var ob = {
            "Facebook Login": (Math.random() > 0.5) ? true : false,
            "Twitter Login": (Math.random() > 0.5) ? true : false
        }
        
        if(ob["Twitter Login"])
            ob["Twitter Login name"] = chance.twitter();
        
        if((Math.random() > 0.5))
            ob["Has Apple Watch OS"] = (Math.random() > 0.5) ? true : false;
		return ob;
	}
	
	// helper functions
	
	function randomString(size)
	{
		var alphaChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
		var generatedString = '';
		for(var i = 0; i < size; i++) {
			generatedString += alphaChars[getRandomInt(0,alphaChars.length)];
		}
	
		return generatedString;
	}
    function getProp(name){
		return props[name][Math.floor(Math.random()*props[name].length)];
	}
	function user(id){
		this.getId = function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			};
			return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
		};
		
		this.getProp = getProp;
		
		var that = this;
        this.stats = {u:0,s:0,x:0,d:0,e:0,r:0,b:0,c:0,p:0};
		this.id = this.getId();
		this.isRegistered = false;
		this.iap = countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].iap_event || "";
		if(this.iap != ""){
            eventsMap[this.iap] = segments.Buy;
		}

		this.hasSession = false;
        if(ip_address.length > 0 && Math.random() >= 0.5){
            this.ip = ip_address.pop();
        }
        else
            this.ip = chance.ip();
		this.userdetails = {name: chance.name(), username: chance.twitter().substring(1), email:chance.email(), organization:capitaliseFirstLetter(chance.word()), phone:chance.phone(), gender:chance.gender().charAt(0), byear:chance.birthday().getFullYear(), custom:createRandomObj()};
		this.metrics = {};
		this.startTs = startTs;
		this.endTs = endTs;
		this.events = [];
		this.ts = getRandomInt(this.startTs, this.endTs);
		for(var i in props){
			if(i == "_os" || i == "_os_web"){
                if(i == "_os_web" && countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "web"){
                    this.platform = this.getProp(i);
                    this.metrics["_os"] = this.platform;
                }
                else{
                    this.platform = this.getProp(i);
                    this.metrics[i] = this.platform;
                }
			}
			else if(i != "_store" && i != "_source")
				this.metrics[i] = this.getProp(i);
		}
        if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "web")
            this.metrics["_store"] = this.getProp("_source");
        else if(this.platform == "Android")
            this.metrics["_store"] = this.getProp("_store");
		
		this.getCrash = function(){
			var crash = {};
            
            crash._os = this.getProp("_os");
			crash._os_version = this.getProp("_os_version");
			crash._device = this.getProp("_device");
			crash._manufacture = this.getProp("_manufacture");
			crash._resolution = this.getProp("_resolution");
			crash._app_version = this.getProp("_app_version");
			crash._cpu = this.getProp("_cpu");
			crash._opengl = this.getProp("_opengl");
            
            crash._ram_total = getRandomInt(1, 4)*1024;
			crash._ram_current = getRandomInt(1, crash._ram_total);
			crash._disk_total = getRandomInt(1, 20)*1024;
			crash._disk_current = getRandomInt(1, crash._disk_total);
			crash._bat_total = 100;
			crash._bat_current = getRandomInt(1, crash._bat_total);
			crash._orientation = (Math.random() > 0.5) ? "landscape" : "portrait";
            
			crash._root = (Math.random() > 0.5) ? true : false;
			crash._online = (Math.random() > 0.5) ? true : false;
			crash._signal = (Math.random() > 0.5) ? true : false;
			crash._muted = (Math.random() > 0.5) ? true : false;
			crash._background = (Math.random() > 0.5) ? true : false;
            
			crash._error = this.getError();
			crash._logs = this.getLog();
            crash._nonfatal = (Math.random() > 0.5) ? true : false;
            crash._run = getRandomInt(1, 1800);
            
            var customs = ["facebook", "gideros", "admob", "chartboost", "googleplay"];
            crash._custom = {};
            for(var i = 0; i < customs.length; i++){
                if(Math.random() > 0.5){
                    crash._custom[customs[i]] = getRandomInt(1, 2)+"."+getRandomInt(0, 9);
                }
            }
            
			return crash;
		};
		
		this.getError = function(){
			var errors = ["java.lang.RuntimeException", "java.lang.NullPointerException", "java.lang.NoSuchMethodError", "java.lang.NoClassDefFoundError", "java.lang.ExceptionInInitializerError", "java.lang.IllegalStateException"];
			var error = errors[Math.floor(Math.random()*errors.length)]+": com.domain.app.Exception<init>\n";
			var stacks = getRandomInt(5, 9);
			for(var i = 0; i < stacks; i++){
				error += "at com.domain.app.<init>(Activity.java:"+(i*32)+")\n";
			}
			return error;
		};
        
        this.getLog = function(){
            var actions = [
                "clicked button 1",
                "clicked button 2",
                "clicked button 3",
                "clicked button 4",
                "clicked button 5",
                "rotated phone",
                "clicked back",
                "entered screen",
                "left screen",
                "touched screen",
                "taped screen",
                "long touched screen",
                "swipe left detected",
                "swipe right detected",
                "swipe up detected",
                "swipe down detected",
                "gesture detected",
                "shake detected"
            ];
            
            var items = getRandomInt(5, 10);
            var logs = [];
            for(var i = 0; i < items; i++){
                logs.push(actions[getRandomInt(0, actions.length-1)]);
            }
            return logs.join("\n");
        };
		
		this.getEvent = function(id){
            this.stats.e++;
			if (!id) {
				if (this.previousEventId) {
					id = eventsMap[this.previousEventId][Math.floor(Math.random()*eventsMap[this.previousEventId].length)];
				} else {
					id = 'Login';
				}
			}

			if (id in eventsMap) {
            	this.previousEventId = id;
			}

			var event = {
				"key": id,
				"count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(0, 6)
			};
			this.ts += 1000;
			if(id == this.iap){
				this.stats.b++;
				event.sum = getRandomInt(100, 500)/100;
				var segment;
				event.segmentation = {};
				for(var i in segments["Buy"]){
					segment = segments["Buy"][i];
					event.segmentation[i] = segment[Math.floor(Math.random()*segment.length)];
				}
			}
			else if(segments[id]){
				var segment;
				event.segmentation = {};
				for(var i in segments[id]){
					segment = segments[id][i];
					event.segmentation[i] = segment[Math.floor(Math.random()*segment.length)];
				}
			}
            if(id == "[CLY]_view")
                event.dur = getRandomInt(0, 100);
            else
                event.dur = getRandomInt(0, 10);

			return [event];
		};
        
        this.getEvents = function(count){
            var events = [];
            for(var i = 0; i < count; i++){
                events.push(this.getEvent()[0]);
            }
            return events;
        };
		
		this.getPushEvents = function(){
			var events = this.getPushEvent('[CLY]_push_sent');
            if(Math.random() >= 0.5){
                events = events.concat(this.getPushEvent('[CLY]_push_open'));
                if (Math.random() >= 0.8) {
                    events = events.concat(this.getPushEvent('[CLY]_push_action'));
                }
            }
            return events;
		};
		this.getPushEvent = function(id){
            this.stats.e++;
			var event = {
				"key": id,
				"count": 1,
                "timestamp": this.ts,
                "hour": getRandomInt(0, 23),
                "dow": getRandomInt(0, 6),
                "test": 1 // Events starting with [CLY]_ are ignored by the API (internal events). This flag is to bypass that.
			};
			this.ts += 1000;
			if(segments[id]){
				var segment;
				event.segmentation = {};
				for(var i in segments[id]){
					segment = segments[id][i];
					event.segmentation[i] = segment[Math.floor(Math.random()*segment.length)];
				}
			}
			return [event];
		};
		
		this.startSession = function(){
			this.ts = this.ts+60*60*24+100;
			this.stats.s++;
            var req = {};
			if(!this.isRegistered){
				this.isRegistered = true;
				this.stats.u++;
                var events = this.getEvent("Login").concat(this.getEvent("[CLY]_view")).concat(this.getEvents(4));
				req = {timestamp:this.ts, begin_session:1, metrics:this.metrics, user_details:this.userdetails, events:events};
				if(Math.random() > 0.5){
					this.hasPush = true;
					this.stats.p++;
                    req["token_session"] = 1;
                    req["test_mode"] = 0;
                    req.events = req.events.concat(this.getPushEvents());
					req[this.platform.toLowerCase()+"_token"] = randomString(8);
				}
			}
			else{
                var events = this.getEvent("Login").concat(this.getEvent("[CLY]_view")).concat(this.getEvents(4));
				req = {timestamp:this.ts, begin_session:1, events:events};
			}
            if(this.iap != "" && Math.random() > 0.5){
                req.events = req.events.concat(this.getEvent(this.iap));
            }
            if(Math.random() > 0.5){
                this.stats.c++;
				req["crash"] = this.getCrash();
			}
			this.hasSession = true;
            this.request(req);
			this.timer = setTimeout(function(){that.extendSession()}, timeout);
		};
		
		this.extendSession = function(){
			if(this.hasSession){
                var req = {};
				this.ts = this.ts + 30;
				this.stats.x++;
				this.stats.d += 30;
                var events = this.getEvent("[CLY]_view").concat(this.getEvents(2));
                req = {timestamp:this.ts, session_duration:30, events:events};
				if(Math.random() > 0.8){
					this.timer = setTimeout(function(){that.extendSession()}, timeout);
				}
				else{
					if(Math.random() > 0.5){
                        this.stats.c++;
						req["crash"] = this.getCrash();
					}
					this.timer = setTimeout(function(){that.endSession()}, timeout);
				}
                this.request(req);
			}
		}
		
		this.endSession = function(){
			if(this.timer){
				clearTimeout(this.timer)
				this.timer = null;
			}
			if(this.hasSession){
				this.hasSession = false;
                var events = this.getEvents(2).concat(this.getEvent("Logout"));
				this.request({timestamp:this.ts, end_session:1, events:events});
			}
		};
		
		this.request = function(params){
			this.stats.r++;
			params.device_id = this.id;
			params.ip_address = this.ip;
            params.hour = getRandomInt(0, 23);
            params.dow = getRandomInt(0, 6);
            params.stats = JSON.parse(JSON.stringify(this.stats));
			bulk.push(params);
            this.stats = {u:0,s:0,x:0,d:0,e:0,r:0,b:0,c:0,p:0};
			countlyPopulator.sync();
		};
	}
	
	var bulk = [];
	var startTs = 1356998400;
	var endTs = new Date().getTime()/1000;
	var timeout = 1000;
	var bucket = 50;
	var generating = false;
	var stopCallback = null;
	var users = [];
	var userAmount = 1000;
	var queued = 0;
	var totalStats = {u:0,s:0,x:0,d:0,e:0,r:0,b:0,c:0,p:0};
	
	function updateUI(stats){
		for(var i in stats){
			totalStats[i] += stats[i];
			$("#populate-stats-"+i).text(totalStats[i]);
		}
	}
    
    function createCampaign(id, name, cost, type, callback){
        $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/campaign/create",
			data:{
				api_key:countlyGlobal["member"].api_key,
				args:JSON.stringify({
                    "_id":id+countlyCommon.ACTIVE_APP_ID,
                    "name":name,
                    "link":"http://count.ly",
                    "cost":cost,
                    "costtype":type,
                    "fingerprint":false,
                    "links":{},
                    "postbacks":[],
                    "app_id":countlyCommon.ACTIVE_APP_ID})
			},
			success:callback,
            error:callback
		});
    }
    
    function clickCampaign(name){
        var ip = chance.ip();
        if(ip_address.length && Math.random() > 0.5){
            ip = ip_address[Math.floor(Math.random()*ip_address.length)];
        }
        else{
            ip_address.push(ip);
        }
        $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/campaign/click/"+name+countlyCommon.ACTIVE_APP_ID,
            data:{ip_address:ip, test:true, timestamp:getRandomInt(startTs, endTs)}
		});
    }
    
    function genereateCampaigns(callback){
        if(typeof countlyAttribution === "undefined"){
            callback();
            return;
        }
        var campaigns = ["social", "ads", "landing"];
        createCampaign("social", "Social Campaign", "0.5", "click", function(){
            createCampaign("ads", "Ads Campaign", "1", "install", function(){
                createCampaign("landing", "Landing page", "30", "campaign", function(){
                    for(var i = 0; i < 100; i++){
                        setTimeout(function(){
                            clickCampaign(campaigns[getRandomInt(0, campaigns.length-1)]);
                        },1);
                    }
                    setTimeout(callback, 3000);
                });
            });
        });
    }
    
    function generateRetentionUser(ts, users, ids, callback){
        var bulk = [];
        for(var i = 0; i < users; i++){
            for(var j = 0; j < ids.length; j++){
                var metrics = {};
                for(var i in props){
                    if(i == "_os" || i == "_os_web"){
                        if(i == "_os_web" && countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "web"){
                            metrics["_os"] = getProp(i);
                        }
                        else{
                            metrics[i] = getProp(i);
                        }
                    }
                    else if(i != "_store" && i != "_source")
                        metrics[i] = getProp(i);
                }
                if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "web")
                    metrics["_store"] = getProp("_source");
                else if(this.platform == "Android")
                    metrics["_store"] = getProp("_store");
                
                var userdetails = {name: chance.name(), username: chance.twitter().substring(1), email:chance.email(), organization:capitaliseFirstLetter(chance.word()), phone:chance.phone(), gender:chance.gender().charAt(0), byear:chance.birthday().getFullYear(), custom:createRandomObj()};
                
                bulk.push({ip_address:chance.ip(), device_id:i+""+ids[j], begin_session:1, metrics:metrics, user_details:userdetails, timestamp:ts, hour:getRandomInt(0, 23), dow:getRandomInt(0, 6)});
                totalStats.s++;
                totalStats.u++;
            }
        }
        totalStats.r++;
        $.ajax({
            type:"GET",
            url:countlyCommon.API_URL + "/i/bulk",
            data:{
				app_key:countlyCommon.ACTIVE_APP_KEY,
				requests:JSON.stringify(bulk)
			},
            success:callback,
            error:callback
        });
    }
    
    function generateRetention(callback){
        if(typeof countlyRetention === "undefined"){
            callback();
            return;
        }
        var ts = endTs - 60*60*24*9;
        var ids = [ts];
        var users = 10;
        generateRetentionUser(ts, users--, ids, function(){
            ts += 60*60*24;
            ids.push(ts);
            generateRetentionUser(ts, users--, ids, function(){
                ts += 60*60*24;
                ids.push(ts);
                generateRetentionUser(ts, users--, ids, function(){
                    ts += 60*60*24;
                    ids.push(ts);
                    generateRetentionUser(ts, users--, ids, function(){
                        ts += 60*60*24;
                        ids.push(ts);
                        generateRetentionUser(ts, users--, ids, function(){
                            ts += 60*60*24;
                            ids.push(ts);
                            generateRetentionUser(ts, users--, ids, function(){
                                ts += 60*60*24;
                                ids.push(ts);
                                generateRetentionUser(ts, users--, ids, function(){
                                    ts += 60*60*24;
                                    ids.push(ts);
                                    generateRetentionUser(ts, users--, ids, callback);
                                });
                            });
                        });
                    });
                });
            });
        });
    }
	
	//Public Methods
	countlyPopulator.setStartTime = function(time){
		startTs = time;
	};
	countlyPopulator.getStartTime = function(time){
		return startTs;
	};
	countlyPopulator.setEndTime = function(time){
		endTs = time;
	};
	countlyPopulator.getEndTime = function(time){
		return endTs;
	};
	countlyPopulator.getUserAmount = function(time){
		return userAmount;
	};
	countlyPopulator.generateUI = function(time){
		for(var i in totalStats){
			$("#populate-stats-"+i).text(totalStats[i]);
		}
	};
	countlyPopulator.generateUsers = function (amount) {
		stopCallback = null;
		userAmount = amount;
		bulk = [];
		totalStats = {u:0,s:0,x:0,d:0,e:0,r:0,b:0,c:0,p:0};
		bucket = Math.max(amount/50, 10);
		var mult = (Math.round(queued/10)+1);
		timeout = bucket*10*mult*mult;
		generating = true;
		function createUser(){
			var u = new user();
			users.push(u);
			u.timer = setTimeout(function(){
				u.startSession();
			},Math.random()*timeout);
		}
		function processUser(u){
			if(u && !u.hasSession){
				u.timer = setTimeout(function(){
					u.startSession();
				},Math.random()*timeout);
			}
		}
		function processUsers(){
			for(var i = 0; i < amount; i++){
				processUser(users[i]);
			}
			if(users.length > 0 && generating)
				setTimeout(processUsers, timeout);
			else
				countlyPopulator.sync(true);
		}
        generateRetention(function(){
            genereateCampaigns(function(){
                for(var i = 0; i < amount; i++){
                    createUser();
                }
                setTimeout(processUsers, timeout);
            });
        });
                    // for(var i = 0; i < amount; i++){
                    //     createUser();
                    // }
	};
	
	countlyPopulator.stopGenerating = function (clb) {
		generating = false;
		stopCallback = clb;
		var u;
		for(var i = 0; i < users.length; i++){
			u = users[i];
			if(u)
				u.endSession();
		}
		users = [];

		if (!countlyPopulator.bulking && stopCallback) {
			countlyPopulator.ensureJobs();
		}
	};
	
	countlyPopulator.isGenerating = function(){
		return generating;
	}
    
    countlyPopulator.sync = function (force) {
		if(generating && (force || bulk.length > bucket) && !countlyPopulator.bulking){
			queued++;
			var mult = Math.round(queued/10)+1;
			timeout = bucket*10*mult*mult;
			$("#populate-stats-br").text(queued);
			countlyPopulator.bulking = true;
            var req = bulk.splice(0, bucket);
            var temp = {u:0,s:0,x:0,d:0,e:0,r:0,b:0,c:0,p:0};
            for(var i in req){
                if(req[i].stats){
                    for(var stat in req[i].stats){
                        temp[stat] += req[i].stats[stat];
                    }
                    delete req[i].stats;
                }
            }
			$.ajax({
				type:"POST",
				url:countlyCommon.API_URL + "/i/bulk",
				data:{
					app_key:countlyCommon.ACTIVE_APP_KEY,
					requests:JSON.stringify(req)
				},
				success:function (json) {
					queued--;
					$("#populate-stats-br").text(queued);
					updateUI(temp);
					countlyPopulator.bulking = false;
					countlyPopulator.sync();
					if (!generating && stopCallback) {
						countlyPopulator.ensureJobs();
					}
				},
				error:function(){
					queued--;
					$("#populate-stats-br").text(queued);
					countlyPopulator.bulking = false;
					countlyPopulator.sync();
					if (!generating && stopCallback) {
						countlyPopulator.ensureJobs();
					}
				}
			});
		}
    };	

    var ensuringJobs = false;
    countlyPopulator.ensureJobs = function() {
        if(typeof countlyFlow === "undefined"){
            if (stopCallback) { stopCallback(true); }
            return;
        }
    	if (ensuringJobs) { return; }
    	ensuringJobs = true;

    	$.ajax({
    		type: "GET",
    		url: countlyCommon.API_URL + "/i/flows/lastJob",
    		data: {
    			app_key:countlyCommon.ACTIVE_APP_KEY
    		},
			success:function (json) {
    			if (json && json.job) {
    				function checkAgain() {
    					$.ajax({
    						type: "GET",
    						url: countlyCommon.API_URL + "/i/flows/lastJob",
    						data: { 
    							job: json.job, 
    							app_key:countlyCommon.ACTIVE_APP_KEY 
    						},
    						success: function (obj) {
    							if (obj && obj.done) {
    								ensuringJobs = false;
    								if (stopCallback) { stopCallback(true); }
    							} else {
    								if (stopCallback) { stopCallback(false); }
    								setTimeout(checkAgain, 3000);
    							}
    						},
    						error: function(xhr, e, t){
								ensuringJobs = false;
								if (stopCallback) { stopCallback(t); }
    						}
    					});
    				}
    				checkAgain();
    			} else if (json && json.done) {
					if (stopCallback) { stopCallback(true); }
    			} else {
					ensuringJobs = false;
					if (stopCallback) { stopCallback(json); }
    			}
    		},
    		error:function(xhr, e, t){
				ensuringJobs = false;
				if (xhr.responseText && xhr.responseText.indexOf('Invalid path') !== -1) {
	    			if (stopCallback) { stopCallback(true); }
				} else {
	    			if (stopCallback) { stopCallback(t); }
				}
    		}
    	});

    };	
}(window.countlyPopulator = window.countlyPopulator || {}, jQuery));;//  Chance.js 0.7.2
//  http://chancejs.com
//  (c) 2013 Victor Quinn
//  Chance may be freely distributed or modified under the MIT license.

(function () {

    // Constants
    var MAX_INT = 9007199254740992;
    var MIN_INT = -MAX_INT;
    var NUMBERS = '0123456789';
    var CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
    var CHARS_UPPER = CHARS_LOWER.toUpperCase();
    var HEX_POOL  = NUMBERS + "abcdef";

    // Cached array helpers
    var slice = Array.prototype.slice;

    // Constructor
    function Chance (seed) {
        if (!(this instanceof Chance)) {
            return new Chance(seed);
        }

        // if user has provided a function, use that as the generator
        if (typeof seed === 'function') {
            this.random = seed;
            return this;
        }

        var seedling;

        if (arguments.length) {
            // set a starting value of zero so we can add to it
            this.seed = 0;
        }
        // otherwise, leave this.seed blank so that MT will recieve a blank

        for (var i = 0; i < arguments.length; i++) {
            seedling = 0;
            if (typeof arguments[i] === 'string') {
                for (var j = 0; j < arguments[i].length; j++) {
                    seedling += (arguments[i].length - j) * arguments[i].charCodeAt(j);
                }
            } else {
                seedling = arguments[i];
            }
            this.seed += (arguments.length - i) * seedling;
        }

        // If no generator function was provided, use our MT
        this.mt = this.mersenne_twister(this.seed);
        this.random = function () {
            return this.mt.random(this.seed);
        };

        return this;
    }

    Chance.prototype.VERSION = "0.7.2";

    // Random helper functions
    function initOptions(options, defaults) {
        options || (options = {});

        if (defaults) {
            for (var i in defaults) {
                if (typeof options[i] === 'undefined') {
                    options[i] = defaults[i];
                }
            }
        }

        return options;
    }

    function testRange(test, errorMessage) {
        if (test) {
            throw new RangeError(errorMessage);
        }
    }

    /**
     * Encode the input string with Base64.
     */
    var base64 = function() {
        throw new Error('No Base64 encoder available.');
    };

    // Select proper Base64 encoder.
    (function determineBase64Encoder() {
        if (typeof btoa === 'function') {
            base64 = btoa;
        } else if (typeof Buffer === 'function') {
            base64 = function(input) {
                return new Buffer(input).toString('base64');
            };
        }
    })();

    // -- Basics --

    Chance.prototype.bool = function (options) {

        // likelihood of success (true)
        options = initOptions(options, {likelihood : 50});

        testRange(
            options.likelihood < 0 || options.likelihood > 100,
            "Chance: Likelihood accepts values from 0 to 100."
        );

        return this.random() * 100 < options.likelihood;
    };

    Chance.prototype.character = function (options) {
        options = initOptions(options);

        var symbols = "!@#$%^&*()[]",
            letters, pool;

        testRange(
            options.alpha && options.symbols,
            "Chance: Cannot specify both alpha and symbols."
        );


        if (options.casing === 'lower') {
            letters = CHARS_LOWER;
        } else if (options.casing === 'upper') {
            letters = CHARS_UPPER;
        } else {
            letters = CHARS_LOWER + CHARS_UPPER;
        }

        if (options.pool) {
            pool = options.pool;
        } else if (options.alpha) {
            pool = letters;
        } else if (options.symbols) {
            pool = symbols;
        } else {
            pool = letters + NUMBERS + symbols;
        }

        return pool.charAt(this.natural({max: (pool.length - 1)}));
    };

    // Note, wanted to use "float" or "double" but those are both JS reserved words.

    // Note, fixed means N OR LESS digits after the decimal. This because
    // It could be 14.9000 but in JavaScript, when this is cast as a number,
    // the trailing zeroes are dropped. Left to the consumer if trailing zeroes are
    // needed
    Chance.prototype.floating = function (options) {
        var num;

        options = initOptions(options, {fixed : 4});
        var fixed = Math.pow(10, options.fixed);

        testRange(
            options.fixed && options.precision,
            "Chance: Cannot specify both fixed and precision."
        );

        var max = MAX_INT / fixed;
        var min = -max;

        testRange(
            options.min && options.fixed && options.min < min,
            "Chance: Min specified is out of range with fixed. Min should be, at least, " + min
        );
        testRange(
            options.max && options.fixed && options.max > max,
            "Chance: Max specified is out of range with fixed. Max should be, at most, " + max
        );

        options = initOptions(options, {min : min, max : max});

        // Todo - Make this work!
        // options.precision = (typeof options.precision !== "undefined") ? options.precision : false;

        num = this.integer({min: options.min * fixed, max: options.max * fixed});
        var num_fixed = (num / fixed).toFixed(options.fixed);

        return parseFloat(num_fixed);
    };

    // NOTE the max and min are INCLUDED in the range. So:
    //
    // chance.natural({min: 1, max: 3});
    //
    // would return either 1, 2, or 3.

    Chance.prototype.integer = function (options) {

        // 9007199254740992 (2^53) is the max integer number in JavaScript
        // See: http://vq.io/132sa2j
        options = initOptions(options, {min: MIN_INT, max: MAX_INT});

        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        return Math.floor(this.random() * (options.max - options.min + 1) + options.min);
    };

    Chance.prototype.natural = function (options) {
        options = initOptions(options, {min: 0, max: MAX_INT});
        return this.integer(options);
    };

    Chance.prototype.string = function (options) {
        options = initOptions(options);

        var length = options.length || this.natural({min: 5, max: 20}),
            pool = options.pool,
            text = this.n(this.character, length, {pool: pool});

        return text.join("");
    };

    // -- End Basics --

    // -- Helpers --

    Chance.prototype.capitalize = function (word) {
        return word.charAt(0).toUpperCase() + word.substr(1);
    };

    Chance.prototype.mixin = function (obj) {
        for (var func_name in obj) {
            Chance.prototype[func_name] = obj[func_name];
        }
        return this;
    };

    // Given a function that generates something random and a number of items to generate,
    // return an array of items where none repeat.
    Chance.prototype.unique = function(fn, num, options) {
        options = initOptions(options, {
            // Default comparator to check that val is not already in arr.
            // Should return `false` if item not in array, `true` otherwise
            comparator: function(arr, val) {
                return arr.indexOf(val) !== -1;
            }
        });

        var arr = [], count = 0, result, MAX_DUPLICATES = num * 50, params = slice.call(arguments, 2);

        while (arr.length < num) {
            result = fn.apply(this, params);
            if (!options.comparator(arr, result)) {
                arr.push(result);
                // reset count when unique found
                count = 0;
            }

            if (++count > MAX_DUPLICATES) {
                throw new RangeError("Chance: num is likely too large for sample set");
            }
        }
        return arr;
    };

    /**
     *  Gives an array of n random terms
     *  @param fn the function that generates something random
     *  @param n number of terms to generate
     *  There can be more parameters after these. All additional parameters are provided to the given function
     */
    Chance.prototype.n = function(fn, n) {
        if (typeof n === 'undefined') {
            n = 1;
        }
        var i = n, arr = [], params = slice.call(arguments, 2);

        // Providing a negative count should result in a noop.
        i = Math.max( 0, i );

        for (null; i--; null) {
            arr.push(fn.apply(this, params));
        }

        return arr;
    };

    // H/T to SO for this one: http://vq.io/OtUrZ5
    Chance.prototype.pad = function (number, width, pad) {
        // Default pad to 0 if none provided
        pad = pad || '0';
        // Convert number to a string
        number = number + '';
        return number.length >= width ? number : new Array(width - number.length + 1).join(pad) + number;
    };

    Chance.prototype.pick = function (arr, count) {
        if (arr.length === 0) {
            throw new RangeError("Chance: Cannot pick() from an empty array");
        }
        if (!count || count === 1) {
            return arr[this.natural({max: arr.length - 1})];
        } else {
            return this.shuffle(arr).slice(0, count);
        }
    };

    Chance.prototype.shuffle = function (arr) {
        var old_array = arr.slice(0),
            new_array = [],
            j = 0,
            length = Number(old_array.length);

        for (var i = 0; i < length; i++) {
            // Pick a random index from the array
            j = this.natural({max: old_array.length - 1});
            // Add it to the new array
            new_array[i] = old_array[j];
            // Remove that element from the original array
            old_array.splice(j, 1);
        }

        return new_array;
    };

    // Returns a single item from an array with relative weighting of odds
    Chance.prototype.weighted = function(arr, weights) {
        if (arr.length !== weights.length) {
            throw new RangeError("Chance: length of array and weights must match");
        }

        // Handle weights that are less or equal to zero.
        for (var weightIndex = weights.length - 1; weightIndex >= 0; --weightIndex) {
            // If the weight is less or equal to zero, remove it and the value.
            if (weights[weightIndex] <= 0) {
                arr.splice(weightIndex,1);
                weights.splice(weightIndex,1);
            }
        }

        // If any of the weights are less than 1, we want to scale them up to whole
        //   numbers for the rest of this logic to work
        if (weights.some(function(weight) { return weight < 1; })) {
            var min = weights.reduce(function(min, weight) {
                return (weight < min) ? weight : min;
            }, weights[0]);

            var scaling_factor = 1 / min;

            weights = weights.map(function(weight) {
                return weight * scaling_factor;
            });
        }

        var sum = weights.reduce(function(total, weight) {
            return total + weight;
        }, 0);

        // get an index
        var selected = this.natural({ min: 1, max: sum });

        var total = 0;
        var chosen;
        // Using some() here so we can bail as soon as we get our match
        weights.some(function(weight, index) {
            if (selected <= total + weight) {
                chosen = arr[index];
                return true;
            }
            total += weight;
            return false;
        });

        return chosen;
    };

    // -- End Helpers --

    // -- Text --

    Chance.prototype.paragraph = function (options) {
        options = initOptions(options);

        var sentences = options.sentences || this.natural({min: 3, max: 7}),
            sentence_array = this.n(this.sentence, sentences);

        return sentence_array.join(' ');
    };

    // Could get smarter about this than generating random words and
    // chaining them together. Such as: http://vq.io/1a5ceOh
    Chance.prototype.sentence = function (options) {
        options = initOptions(options);

        var words = options.words || this.natural({min: 12, max: 18}),
            text, word_array = this.n(this.word, words);

        text = word_array.join(' ');

        // Capitalize first letter of sentence, add period at end
        text = this.capitalize(text) + '.';

        return text;
    };

    Chance.prototype.syllable = function (options) {
        options = initOptions(options);

        var length = options.length || this.natural({min: 2, max: 3}),
            consonants = 'bcdfghjklmnprstvwz', // consonants except hard to speak ones
            vowels = 'aeiou', // vowels
            all = consonants + vowels, // all
            text = '',
            chr;

        // I'm sure there's a more elegant way to do this, but this works
        // decently well.
        for (var i = 0; i < length; i++) {
            if (i === 0) {
                // First character can be anything
                chr = this.character({pool: all});
            } else if (consonants.indexOf(chr) === -1) {
                // Last character was a vowel, now we want a consonant
                chr = this.character({pool: consonants});
            } else {
                // Last character was a consonant, now we want a vowel
                chr = this.character({pool: vowels});
            }

            text += chr;
        }

        return text;
    };

    Chance.prototype.word = function (options) {
        options = initOptions(options);

        testRange(
            options.syllables && options.length,
            "Chance: Cannot specify both syllables AND length."
        );

        var syllables = options.syllables || this.natural({min: 1, max: 3}),
            text = '';

        if (options.length) {
            // Either bound word by length
            do {
                text += this.syllable();
            } while (text.length < options.length);
            text = text.substring(0, options.length);
        } else {
            // Or by number of syllables
            for (var i = 0; i < syllables; i++) {
                text += this.syllable();
            }
        }
        return text;
    };

    // -- End Text --

    // -- Person --

    Chance.prototype.age = function (options) {
        options = initOptions(options);
        var ageRange;

        switch (options.type) {
            case 'child':
                ageRange = {min: 1, max: 12};
                break;
            case 'teen':
                ageRange = {min: 13, max: 19};
                break;
            case 'adult':
                ageRange = {min: 18, max: 65};
                break;
            case 'senior':
                ageRange = {min: 65, max: 100};
                break;
            case 'all':
                ageRange = {min: 1, max: 100};
                break;
            default:
                ageRange = {min: 18, max: 65};
                break;
        }

        return this.natural(ageRange);
    };

    Chance.prototype.birthday = function (options) {
        options = initOptions(options, {
            year: (new Date().getFullYear() - this.age(options))
        });

        return this.date(options);
    };

    // CPF; ID to identify taxpayers in Brazil
    Chance.prototype.cpf = function () {
        var n = this.n(this.natural, 9, { max: 9 });
        var d1 = n[8]*2+n[7]*3+n[6]*4+n[5]*5+n[4]*6+n[3]*7+n[2]*8+n[1]*9+n[0]*10;
        d1 = 11 - (d1 % 11);
        if (d1>=10) {
            d1 = 0;
        }
        var d2 = d1*2+n[8]*3+n[7]*4+n[6]*5+n[5]*6+n[4]*7+n[3]*8+n[2]*9+n[1]*10+n[0]*11;
        d2 = 11 - (d2 % 11);
        if (d2>=10) {
            d2 = 0;
        }
        return ''+n[0]+n[1]+n[2]+'.'+n[3]+n[4]+n[5]+'.'+n[6]+n[7]+n[8]+'-'+d1+d2;
    };

    Chance.prototype.first = function (options) {
        options = initOptions(options, {gender: this.gender()});
        return this.pick(this.get("firstNames")[options.gender.toLowerCase()]);
    };

    Chance.prototype.gender = function () {
        return this.pick(['Male', 'Female']);
    };

    Chance.prototype.last = function () {
        return this.pick(this.get("lastNames"));
    };

    Chance.prototype.name = function (options) {
        options = initOptions(options);

        var first = this.first(options),
            last = this.last(),
            name;

        if (options.middle) {
            name = first + ' ' + this.first(options) + ' ' + last;
        } else if (options.middle_initial) {
            name = first + ' ' + this.character({alpha: true, casing: 'upper'}) + '. ' + last;
        } else {
            name = first + ' ' + last;
        }

        if (options.prefix) {
            name = this.prefix(options) + ' ' + name;
        }

        if (options.suffix) {
            name = name + ' ' + this.suffix(options);
        }

        return name;
    };

    // Return the list of available name prefixes based on supplied gender.
    Chance.prototype.name_prefixes = function (gender) {
        gender = gender || "all";
        gender = gender.toLowerCase();

        var prefixes = [
            { name: 'Doctor', abbreviation: 'Dr.' }
        ];

        if (gender === "male" || gender === "all") {
            prefixes.push({ name: 'Mister', abbreviation: 'Mr.' });
        }

        if (gender === "female" || gender === "all") {
            prefixes.push({ name: 'Miss', abbreviation: 'Miss' });
            prefixes.push({ name: 'Misses', abbreviation: 'Mrs.' });
        }

        return prefixes;
    };

    // Alias for name_prefix
    Chance.prototype.prefix = function (options) {
        return this.name_prefix(options);
    };

    Chance.prototype.name_prefix = function (options) {
        options = initOptions(options, { gender: "all" });
        return options.full ?
            this.pick(this.name_prefixes(options.gender)).name :
            this.pick(this.name_prefixes(options.gender)).abbreviation;
    };

    Chance.prototype.ssn = function (options) {
        options = initOptions(options, {ssnFour: false, dashes: true});
        var ssn_pool = "1234567890",
            ssn,
            dash = options.dashes ? '-' : '';

        if(!options.ssnFour) {
            ssn = this.string({pool: ssn_pool, length: 3}) + dash +
            this.string({pool: ssn_pool, length: 2}) + dash +
            this.string({pool: ssn_pool, length: 4});
        } else {
            ssn = this.string({pool: ssn_pool, length: 4});
        }
        return ssn;
    };

    // Return the list of available name suffixes
    Chance.prototype.name_suffixes = function () {
        var suffixes = [
            { name: 'Doctor of Osteopathic Medicine', abbreviation: 'D.O.' },
            { name: 'Doctor of Philosophy', abbreviation: 'Ph.D.' },
            { name: 'Esquire', abbreviation: 'Esq.' },
            { name: 'Junior', abbreviation: 'Jr.' },
            { name: 'Juris Doctor', abbreviation: 'J.D.' },
            { name: 'Master of Arts', abbreviation: 'M.A.' },
            { name: 'Master of Business Administration', abbreviation: 'M.B.A.' },
            { name: 'Master of Science', abbreviation: 'M.S.' },
            { name: 'Medical Doctor', abbreviation: 'M.D.' },
            { name: 'Senior', abbreviation: 'Sr.' },
            { name: 'The Third', abbreviation: 'III' },
            { name: 'The Fourth', abbreviation: 'IV' }
        ];
        return suffixes;
    };

    // Alias for name_suffix
    Chance.prototype.suffix = function (options) {
        return this.name_suffix(options);
    };

    Chance.prototype.name_suffix = function (options) {
        options = initOptions(options);
        return options.full ?
            this.pick(this.name_suffixes()).name :
            this.pick(this.name_suffixes()).abbreviation;
    };

    // -- End Person --

    // -- Mobile --
    // Android GCM Registration ID
    Chance.prototype.android_id = function () {
        return "APA91" + this.string({ pool: "0123456789abcefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_", length: 178 });
    };

    // Apple Push Token
    Chance.prototype.apple_token = function () {
        return this.string({ pool: "abcdef1234567890", length: 64 });
    };

    // Windows Phone 8 ANID2
    Chance.prototype.wp8_anid2 = function () {
        return base64( this.hash( { length : 32 } ) );
    };

    // Windows Phone 7 ANID
    Chance.prototype.wp7_anid = function () {
        return 'A=' + this.guid().replace(/-/g, '').toUpperCase() + '&E=' + this.hash({ length:3 }) + '&W=' + this.integer({ min:0, max:9 });
    };

    // BlackBerry Device PIN
    Chance.prototype.bb_pin = function () {
        return this.hash({ length: 8 });
    };

    // -- End Mobile --

    // -- Web --
    Chance.prototype.color = function (options) {
        function gray(value, delimiter) {
            return [value, value, value].join(delimiter || '');
        }

        options = initOptions(options, {format: this.pick(['hex', 'shorthex', 'rgb', '0x']), grayscale: false, casing: 'lower'});
        var isGrayscale = options.grayscale;
        var colorValue;

        if (options.format === 'hex') {
            colorValue = '#' + (isGrayscale ? gray(this.hash({length: 2})) : this.hash({length: 6}));

        } else if (options.format === 'shorthex') {
            colorValue = '#' + (isGrayscale ? gray(this.hash({length: 1})) : this.hash({length: 3}));

        } else if (options.format === 'rgb') {
            if (isGrayscale) {
                colorValue = 'rgb(' + gray(this.natural({max: 255}), ',') + ')';
            } else {
                colorValue = 'rgb(' + this.natural({max: 255}) + ',' + this.natural({max: 255}) + ',' + this.natural({max: 255}) + ')';
            }
        } else if (options.format === '0x') {
            colorValue = '0x' + (isGrayscale ? gray(this.hash({length: 2})) : this.hash({length: 6}));
        } else {
            throw new Error('Invalid format provided. Please provide one of "hex", "shorthex", "rgb" or "0x".');
        }

        if (options.casing === 'upper' ) {
            colorValue = colorValue.toUpperCase();
        }

        return colorValue;
    };

    Chance.prototype.domain = function (options) {
        options = initOptions(options);
        return this.word() + '.' + (options.tld || this.tld());
    };

    Chance.prototype.email = function (options) {
        options = initOptions(options);
        return this.word({length: options.length}) + '@' + (options.domain || this.domain());
    };

    Chance.prototype.fbid = function () {
        return parseInt('10000' + this.natural({max: 100000000000}), 10);
    };

    Chance.prototype.google_analytics = function () {
        var account = this.pad(this.natural({max: 999999}), 6);
        var property = this.pad(this.natural({max: 99}), 2);

        return 'UA-' + account + '-' + property;
    };

    Chance.prototype.hashtag = function () {
        return '#' + this.word();
    };

    Chance.prototype.ip = function () {
        // Todo: This could return some reserved IPs. See http://vq.io/137dgYy
        // this should probably be updated to account for that rare as it may be
        return this.natural({max: 255}) + '.' +
               this.natural({max: 255}) + '.' +
               this.natural({max: 255}) + '.' +
               this.natural({max: 255});
    };

    Chance.prototype.ipv6 = function () {
        var ip_addr = this.n(this.hash, 8, {length: 4});

        return ip_addr.join(":");
    };

    Chance.prototype.klout = function () {
        return this.natural({min: 1, max: 99});
    };

    Chance.prototype.tlds = function () {
        return ['com', 'org', 'edu', 'gov', 'co.uk', 'net', 'io'];
    };

    Chance.prototype.tld = function () {
        return this.pick(this.tlds());
    };

    Chance.prototype.twitter = function () {
        return '@' + this.word();
    };

    Chance.prototype.url = function (options) {
        options = initOptions(options, { protocol: "http", domain: this.domain(options), domain_prefix: "", path: this.word(), extensions: []});

        var extension = options.extensions.length > 0 ? "." + this.pick(options.extensions) : "";
        var domain = options.domain_prefix ? options.domain_prefix + "." + options.domain : options.domain;

        return options.protocol + "://" + domain + "/" + options.path + extension;
    };

    // -- End Web --

    // -- Location --

    Chance.prototype.address = function (options) {
        options = initOptions(options);
        return this.natural({min: 5, max: 2000}) + ' ' + this.street(options);
    };

    Chance.prototype.altitude = function (options) {
        options = initOptions(options, {fixed : 5, max: 8848});
        return this.floating({min: 0, max: options.max, fixed: options.fixed});
    };

    Chance.prototype.areacode = function (options) {
        options = initOptions(options, {parens : true});
        // Don't want area codes to start with 1, or have a 9 as the second digit
        var areacode = this.natural({min: 2, max: 9}).toString() +
                this.natural({min: 0, max: 8}).toString() +
                this.natural({min: 0, max: 9}).toString();

        return options.parens ? '(' + areacode + ')' : areacode;
    };

    Chance.prototype.city = function () {
        return this.capitalize(this.word({syllables: 3}));
    };

    Chance.prototype.coordinates = function (options) {
        options = initOptions(options);
        return this.latitude(options) + ', ' + this.longitude(options);
    };

    Chance.prototype.countries = function () {
        return this.get("countries");
    };

    Chance.prototype.country = function (options) {
        options = initOptions(options);
        var country = this.pick(this.countries());
        return options.full ? country.name : country.abbreviation;
    };

    Chance.prototype.depth = function (options) {
        options = initOptions(options, {fixed: 5, min: -2550});
        return this.floating({min: options.min, max: 0, fixed: options.fixed});
    };

    Chance.prototype.geohash = function (options) {
        options = initOptions(options, { length: 7 });
        return this.string({ length: options.length, pool: '0123456789bcdefghjkmnpqrstuvwxyz' });
    };

    Chance.prototype.geojson = function (options) {
        options = initOptions(options);
        return this.latitude(options) + ', ' + this.longitude(options) + ', ' + this.altitude(options);
    };

    Chance.prototype.latitude = function (options) {
        options = initOptions(options, {fixed: 5, min: -90, max: 90});
        return this.floating({min: options.min, max: options.max, fixed: options.fixed});
    };

    Chance.prototype.longitude = function (options) {
        options = initOptions(options, {fixed: 5, min: -180, max: 180});
        return this.floating({min: options.min, max: options.max, fixed: options.fixed});
    };

    Chance.prototype.phone = function (options) {
        var self = this,
            numPick,
            ukNum = function (parts) {
                var section = [];
                //fills the section part of the phone number with random numbers.
                parts.sections.forEach(function(n) {
                    section.push(self.string({ pool: '0123456789', length: n}));
                });
                return parts.area + section.join(' ');
            };
        options = initOptions(options, {
            formatted: true,
            country: 'us',
            mobile: false
        });
        if (!options.formatted) {
            options.parens = false;
        }
        var phone;
        switch (options.country) {
            case 'fr':
                if (!options.mobile) {
                    numPick = this.pick([
                        // Valid zone and département codes.
                        '01' + this.pick(['30', '34', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '53', '55', '56', '58', '60', '64', '69', '70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83']) + self.string({ pool: '0123456789', length: 6}),
                        '02' + this.pick(['14', '18', '22', '23', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '40', '41', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '56', '57', '61', '62', '69', '72', '76', '77', '78', '85', '90', '96', '97', '98', '99']) + self.string({ pool: '0123456789', length: 6}),
                        '03' + this.pick(['10', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '39', '44', '45', '51', '52', '54', '55', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90']) + self.string({ pool: '0123456789', length: 6}),
                        '04' + this.pick(['11', '13', '15', '20', '22', '26', '27', '30', '32', '34', '37', '42', '43', '44', '50', '56', '57', '63', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '97', '98']) + self.string({ pool: '0123456789', length: 6}),
                        '05' + this.pick(['08', '16', '17', '19', '24', '31', '32', '33', '34', '35', '40', '45', '46', '47', '49', '53', '55', '56', '57', '58', '59', '61', '62', '63', '64', '65', '67', '79', '81', '82', '86', '87', '90', '94']) + self.string({ pool: '0123456789', length: 6}),
                        '09' + self.string({ pool: '0123456789', length: 8}),
                    ]);
                    phone = options.formatted ? numPick.match(/../g).join(' ') : numPick;
                } else {
                    numPick = this.pick(['06', '07']) + self.string({ pool: '0123456789', length: 8});
                    phone = options.formatted ? numPick.match(/../g).join(' ') : numPick;
                }
                break;
            case 'uk':
                if (!options.mobile) {
                    numPick = this.pick([
                        //valid area codes of major cities/counties followed by random numbers in required format.
                        { area: '01' + this.character({ pool: '234569' }) + '1 ', sections: [3,4] },
                        { area: '020 ' + this.character({ pool: '378' }), sections: [3,4] },
                        { area: '023 ' + this.character({ pool: '89' }), sections: [3,4] },
                        { area: '024 7', sections: [3,4] },
                        { area: '028 ' + this.pick(['25','28','37','71','82','90','92','95']), sections: [2,4] },
                        { area: '012' + this.pick(['04','08','54','76','97','98']) + ' ', sections: [5] },
                        { area: '013' + this.pick(['63','64','84','86']) + ' ', sections: [5] },
                        { area: '014' + this.pick(['04','20','60','61','80','88']) + ' ', sections: [5] },
                        { area: '015' + this.pick(['24','27','62','66']) + ' ', sections: [5] },
                        { area: '016' + this.pick(['06','29','35','47','59','95']) + ' ', sections: [5] },
                        { area: '017' + this.pick(['26','44','50','68']) + ' ', sections: [5] },
                        { area: '018' + this.pick(['27','37','84','97']) + ' ', sections: [5] },
                        { area: '019' + this.pick(['00','05','35','46','49','63','95']) + ' ', sections: [5] }
                    ]);
                    phone = options.formatted ? ukNum(numPick) : ukNum(numPick).replace(' ', '', 'g');
                } else {
                    numPick = this.pick([
                        { area: '07' + this.pick(['4','5','7','8','9']), sections: [2,6] },
                        { area: '07624 ', sections: [6] }
                    ]);
                    phone = options.formatted ? ukNum(numPick) : ukNum(numPick).replace(' ', '');
                }
                break;
            case 'us':
                var areacode = this.areacode(options).toString();
                var exchange = this.natural({ min: 2, max: 9 }).toString() +
                    this.natural({ min: 0, max: 9 }).toString() +
                    this.natural({ min: 0, max: 9 }).toString();
                var subscriber = this.natural({ min: 1000, max: 9999 }).toString(); // this could be random [0-9]{4}
                phone = options.formatted ? areacode + ' ' + exchange + '-' + subscriber : areacode + exchange + subscriber;
        }
        return phone;
    };

    Chance.prototype.postal = function () {
        // Postal District
        var pd = this.character({pool: "XVTSRPNKLMHJGECBA"});
        // Forward Sortation Area (FSA)
        var fsa = pd + this.natural({max: 9}) + this.character({alpha: true, casing: "upper"});
        // Local Delivery Unut (LDU)
        var ldu = this.natural({max: 9}) + this.character({alpha: true, casing: "upper"}) + this.natural({max: 9});

        return fsa + " " + ldu;
    };

    Chance.prototype.provinces = function () {
        return this.get("provinces");
    };

    Chance.prototype.province = function (options) {
        return (options && options.full) ?
            this.pick(this.provinces()).name :
            this.pick(this.provinces()).abbreviation;
    };

    Chance.prototype.state = function (options) {
        return (options && options.full) ?
            this.pick(this.states(options)).name :
            this.pick(this.states(options)).abbreviation;
    };

    Chance.prototype.states = function (options) {
        options = initOptions(options);

        var states,
            us_states_and_dc = this.get("us_states_and_dc"),
            territories = this.get("territories"),
            armed_forces = this.get("armed_forces");

        states = us_states_and_dc;

        if (options.territories) {
            states = states.concat(territories);
        }
        if (options.armed_forces) {
            states = states.concat(armed_forces);
        }

        return states;
    };

    Chance.prototype.street = function (options) {
        options = initOptions(options);

        var street = this.word({syllables: 2});
        street = this.capitalize(street);
        street += ' ';
        street += options.short_suffix ?
            this.street_suffix().abbreviation :
            this.street_suffix().name;
        return street;
    };

    Chance.prototype.street_suffix = function () {
        return this.pick(this.street_suffixes());
    };

    Chance.prototype.street_suffixes = function () {
        // These are the most common suffixes.
        return this.get("street_suffixes");
    };

    // Note: only returning US zip codes, internationalization will be a whole
    // other beast to tackle at some point.
    Chance.prototype.zip = function (options) {
        var zip = this.n(this.natural, 5, {max: 9});

        if (options && options.plusfour === true) {
            zip.push('-');
            zip = zip.concat(this.n(this.natural, 4, {max: 9}));
        }

        return zip.join("");
    };

    // -- End Location --

    // -- Time

    Chance.prototype.ampm = function () {
        return this.bool() ? 'am' : 'pm';
    };

    Chance.prototype.date = function (options) {
        var date_string, date;

        // If interval is specified we ignore preset
        if(options && (options.min || options.max)) {
            options = initOptions(options, {
                american: true,
                string: false
            });
            var min = typeof options.min !== "undefined" ? options.min.getTime() : 1;
            // 100,000,000 days measured relative to midnight at the beginning of 01 January, 1970 UTC. http://es5.github.io/#x15.9.1.1
            var max = typeof options.max !== "undefined" ? options.max.getTime() : 8640000000000000;

            date = new Date(this.natural({min: min, max: max}));
        } else {
            var m = this.month({raw: true});

            options = initOptions(options, {
                year: parseInt(this.year(), 10),
                // Necessary to subtract 1 because Date() 0-indexes month but not day or year
                // for some reason.
                month: m.numeric - 1,
                day: this.natural({min: 1, max: m.days}),
                hour: this.hour(),
                minute: this.minute(),
                second: this.second(),
                millisecond: this.millisecond(),
                american: true,
                string: false
            });

            date = new Date(options.year, options.month, options.day, options.hour, options.minute, options.second, options.millisecond);
        }

        if (options.american) {
            // Adding 1 to the month is necessary because Date() 0-indexes
            // months but not day for some odd reason.
            date_string = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
        } else {
            date_string = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
        }

        return options.string ? date_string : date;
    };

    Chance.prototype.hammertime = function (options) {
        return this.date(options).getTime();
    };

    Chance.prototype.hour = function (options) {
        options = initOptions(options, {min: 1, max: options && options.twentyfour ? 24 : 12});

        testRange(options.min < 1, "Chance: Min cannot be less than 1.");
        testRange(options.twentyfour && options.max > 24, "Chance: Max cannot be greater than 24 for twentyfour option.");
        testRange(!options.twentyfour && options.max > 12, "Chance: Max cannot be greater than 12.");
        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        return this.natural({min: options.min, max: options.max});
    };

    Chance.prototype.millisecond = function () {
        return this.natural({max: 999});
    };

    Chance.prototype.minute = Chance.prototype.second = function (options) {
        options = initOptions(options, {min: 0, max: 59});

        testRange(options.min < 0, "Chance: Min cannot be less than 0.");
        testRange(options.max > 59, "Chance: Max cannot be greater than 59.");
        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        return this.natural({min: options.min, max: options.max});
    };

    Chance.prototype.month = function (options) {
        options = initOptions(options, {min: 1, max: 12});

        testRange(options.min < 1, "Chance: Min cannot be less than 1.");
        testRange(options.max > 12, "Chance: Max cannot be greater than 12.");
        testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

        var month = this.pick(this.months().slice(options.min - 1, options.max));
        return options.raw ? month : month.name;
    };

    Chance.prototype.months = function () {
        return this.get("months");
    };

    Chance.prototype.second = function () {
        return this.natural({max: 59});
    };

    Chance.prototype.timestamp = function () {
        return this.natural({min: 1, max: parseInt(new Date().getTime() / 1000, 10)});
    };

    Chance.prototype.year = function (options) {
        // Default to current year as min if none specified
        options = initOptions(options, {min: new Date().getFullYear()});

        // Default to one century after current year as max if none specified
        options.max = (typeof options.max !== "undefined") ? options.max : options.min + 100;

        return this.natural(options).toString();
    };

    // -- End Time

    // -- Finance --

    Chance.prototype.cc = function (options) {
        options = initOptions(options);

        var type, number, to_generate;

        type = (options.type) ?
                    this.cc_type({ name: options.type, raw: true }) :
                    this.cc_type({ raw: true });

        number = type.prefix.split("");
        to_generate = type.length - type.prefix.length - 1;

        // Generates n - 1 digits
        number = number.concat(this.n(this.integer, to_generate, {min: 0, max: 9}));

        // Generates the last digit according to Luhn algorithm
        number.push(this.luhn_calculate(number.join("")));

        return number.join("");
    };

    Chance.prototype.cc_types = function () {
        // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
        return this.get("cc_types");
    };

    Chance.prototype.cc_type = function (options) {
        options = initOptions(options);
        var types = this.cc_types(),
            type = null;

        if (options.name) {
            for (var i = 0; i < types.length; i++) {
                // Accept either name or short_name to specify card type
                if (types[i].name === options.name || types[i].short_name === options.name) {
                    type = types[i];
                    break;
                }
            }
            if (type === null) {
                throw new Error("Credit card type '" + options.name + "'' is not supported");
            }
        } else {
            type = this.pick(types);
        }

        return options.raw ? type : type.name;
    };

    //return all world currency by ISO 4217
    Chance.prototype.currency_types = function () {
        return this.get("currency_types");
    };

    //return random world currency by ISO 4217
    Chance.prototype.currency = function () {
        return this.pick(this.currency_types());
    };

    //Return random correct currency exchange pair (e.g. EUR/USD) or array of currency code
    Chance.prototype.currency_pair = function (returnAsString) {
        var currencies = this.unique(this.currency, 2, {
            comparator: function(arr, val) {

                return arr.reduce(function(acc, item) {
                    // If a match has been found, short circuit check and just return
                    return acc || (item.code === val.code);
                }, false);
            }
        });

        if (returnAsString) {
            return  currencies[0] + '/' + currencies[1];
        } else {
            return currencies;
        }
    };

    Chance.prototype.dollar = function (options) {
        // By default, a somewhat more sane max for dollar than all available numbers
        options = initOptions(options, {max : 10000, min : 0});

        var dollar = this.floating({min: options.min, max: options.max, fixed: 2}).toString(),
            cents = dollar.split('.')[1];

        if (cents === undefined) {
            dollar += '.00';
        } else if (cents.length < 2) {
            dollar = dollar + '0';
        }

        if (dollar < 0) {
            return '-$' + dollar.replace('-', '');
        } else {
            return '$' + dollar;
        }
    };

    Chance.prototype.exp = function (options) {
        options = initOptions(options);
        var exp = {};

        exp.year = this.exp_year();

        // If the year is this year, need to ensure month is greater than the
        // current month or this expiration will not be valid
        if (exp.year === (new Date().getFullYear())) {
            exp.month = this.exp_month({future: true});
        } else {
            exp.month = this.exp_month();
        }

        return options.raw ? exp : exp.month + '/' + exp.year;
    };

    Chance.prototype.exp_month = function (options) {
        options = initOptions(options);
        var month, month_int,
            curMonth = new Date().getMonth();

        if (options.future) {
            do {
                month = this.month({raw: true}).numeric;
                month_int = parseInt(month, 10);
            } while (month_int < curMonth);
        } else {
            month = this.month({raw: true}).numeric;
        }

        return month;
    };

    Chance.prototype.exp_year = function () {
        return this.year({max: new Date().getFullYear() + 10});
    };

    // -- End Finance

    // -- Miscellaneous --

    // Dice - For all the board game geeks out there, myself included ;)
    function diceFn (range) {
        return function () {
            return this.natural(range);
        };
    }
    Chance.prototype.d4 = diceFn({min: 1, max: 4});
    Chance.prototype.d6 = diceFn({min: 1, max: 6});
    Chance.prototype.d8 = diceFn({min: 1, max: 8});
    Chance.prototype.d10 = diceFn({min: 1, max: 10});
    Chance.prototype.d12 = diceFn({min: 1, max: 12});
    Chance.prototype.d20 = diceFn({min: 1, max: 20});
    Chance.prototype.d30 = diceFn({min: 1, max: 30});
    Chance.prototype.d100 = diceFn({min: 1, max: 100});

    Chance.prototype.rpg = function (thrown, options) {
        options = initOptions(options);
        if (thrown === null) {
            throw new Error("A type of die roll must be included");
        } else {
            var bits = thrown.toLowerCase().split("d"),
                rolls = [];

            if (bits.length !== 2 || !parseInt(bits[0], 10) || !parseInt(bits[1], 10)) {
                throw new Error("Invalid format provided. Please provide #d# where the first # is the number of dice to roll, the second # is the max of each die");
            }
            for (var i = bits[0]; i > 0; i--) {
                rolls[i - 1] = this.natural({min: 1, max: bits[1]});
            }
            return (typeof options.sum !== 'undefined' && options.sum) ? rolls.reduce(function (p, c) { return p + c; }) : rolls;
        }
    };

    // Guid
    Chance.prototype.guid = function (options) {
        options = initOptions(options, { version: 5 });

        var guid_pool = "abcdef1234567890",
            variant_pool = "ab89",
            guid = this.string({ pool: guid_pool, length: 8 }) + '-' +
                   this.string({ pool: guid_pool, length: 4 }) + '-' +
                   // The Version
                   options.version +
                   this.string({ pool: guid_pool, length: 3 }) + '-' +
                   // The Variant
                   this.string({ pool: variant_pool, length: 1 }) +
                   this.string({ pool: guid_pool, length: 3 }) + '-' +
                   this.string({ pool: guid_pool, length: 12 });
        return guid;
    };

    // Hash
    Chance.prototype.hash = function (options) {
        options = initOptions(options, {length : 40, casing: 'lower'});
        var pool = options.casing === 'upper' ? HEX_POOL.toUpperCase() : HEX_POOL;
        return this.string({pool: pool, length: options.length});
    };

    Chance.prototype.luhn_check = function (num) {
        var str = num.toString();
        var checkDigit = +str.substring(str.length - 1);
        return checkDigit === this.luhn_calculate(+str.substring(0, str.length - 1));
    };

    Chance.prototype.luhn_calculate = function (num) {
        var digits = num.toString().split("").reverse();
        var sum = 0;
        var digit;

        for (var i = 0, l = digits.length; l > i; ++i) {
            digit = +digits[i];
            if (i % 2 === 0) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
        }
        return (sum * 9) % 10;
    };


    var data = {

        firstNames: {
            "male": ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Charles", "Thomas", "Christopher", "Daniel", "Matthew", "George", "Donald", "Anthony", "Paul", "Mark", "Edward", "Steven", "Kenneth", "Andrew", "Brian", "Joshua", "Kevin", "Ronald", "Timothy", "Jason", "Jeffrey", "Frank", "Gary", "Ryan", "Nicholas", "Eric", "Stephen", "Jacob", "Larry", "Jonathan", "Scott", "Raymond", "Justin", "Brandon", "Gregory", "Samuel", "Benjamin", "Patrick", "Jack", "Henry", "Walter", "Dennis", "Jerry", "Alexander", "Peter", "Tyler", "Douglas", "Harold", "Aaron", "Jose", "Adam", "Arthur", "Zachary", "Carl", "Nathan", "Albert", "Kyle", "Lawrence", "Joe", "Willie", "Gerald", "Roger", "Keith", "Jeremy", "Terry", "Harry", "Ralph", "Sean", "Jesse", "Roy", "Louis", "Billy", "Austin", "Bruce", "Eugene", "Christian", "Bryan", "Wayne", "Russell", "Howard", "Fred", "Ethan", "Jordan", "Philip", "Alan", "Juan", "Randy", "Vincent", "Bobby", "Dylan", "Johnny", "Phillip", "Victor", "Clarence", "Ernest", "Martin", "Craig", "Stanley", "Shawn", "Travis", "Bradley", "Leonard", "Earl", "Gabriel", "Jimmy", "Francis", "Todd", "Noah", "Danny", "Dale", "Cody", "Carlos", "Allen", "Frederick", "Logan", "Curtis", "Alex", "Joel", "Luis", "Norman", "Marvin", "Glenn", "Tony", "Nathaniel", "Rodney", "Melvin", "Alfred", "Steve", "Cameron", "Chad", "Edwin", "Caleb", "Evan", "Antonio", "Lee", "Herbert", "Jeffery", "Isaac", "Derek", "Ricky", "Marcus", "Theodore", "Elijah", "Luke", "Jesus", "Eddie", "Troy", "Mike", "Dustin", "Ray", "Adrian", "Bernard", "Leroy", "Angel", "Randall", "Wesley", "Ian", "Jared", "Mason", "Hunter", "Calvin", "Oscar", "Clifford", "Jay", "Shane", "Ronnie", "Barry", "Lucas", "Corey", "Manuel", "Leo", "Tommy", "Warren", "Jackson", "Isaiah", "Connor", "Don", "Dean", "Jon", "Julian", "Miguel", "Bill", "Lloyd", "Charlie", "Mitchell", "Leon", "Jerome", "Darrell", "Jeremiah", "Alvin", "Brett", "Seth", "Floyd", "Jim", "Blake", "Micheal", "Gordon", "Trevor", "Lewis", "Erik", "Edgar", "Vernon", "Devin", "Gavin", "Jayden", "Chris", "Clyde", "Tom", "Derrick", "Mario", "Brent", "Marc", "Herman", "Chase", "Dominic", "Ricardo", "Franklin", "Maurice", "Max", "Aiden", "Owen", "Lester", "Gilbert", "Elmer", "Gene", "Francisco", "Glen", "Cory", "Garrett", "Clayton", "Sam", "Jorge", "Chester", "Alejandro", "Jeff", "Harvey", "Milton", "Cole", "Ivan", "Andre", "Duane", "Landon"],
            "female": ["Mary", "Emma", "Elizabeth", "Minnie", "Margaret", "Ida", "Alice", "Bertha", "Sarah", "Annie", "Clara", "Ella", "Florence", "Cora", "Martha", "Laura", "Nellie", "Grace", "Carrie", "Maude", "Mabel", "Bessie", "Jennie", "Gertrude", "Julia", "Hattie", "Edith", "Mattie", "Rose", "Catherine", "Lillian", "Ada", "Lillie", "Helen", "Jessie", "Louise", "Ethel", "Lula", "Myrtle", "Eva", "Frances", "Lena", "Lucy", "Edna", "Maggie", "Pearl", "Daisy", "Fannie", "Josephine", "Dora", "Rosa", "Katherine", "Agnes", "Marie", "Nora", "May", "Mamie", "Blanche", "Stella", "Ellen", "Nancy", "Effie", "Sallie", "Nettie", "Della", "Lizzie", "Flora", "Susie", "Maud", "Mae", "Etta", "Harriet", "Sadie", "Caroline", "Katie", "Lydia", "Elsie", "Kate", "Susan", "Mollie", "Alma", "Addie", "Georgia", "Eliza", "Lulu", "Nannie", "Lottie", "Amanda", "Belle", "Charlotte", "Rebecca", "Ruth", "Viola", "Olive", "Amelia", "Hannah", "Jane", "Virginia", "Emily", "Matilda", "Irene", "Kathryn", "Esther", "Willie", "Henrietta", "Ollie", "Amy", "Rachel", "Sara", "Estella", "Theresa", "Augusta", "Ora", "Pauline", "Josie", "Lola", "Sophia", "Leona", "Anne", "Mildred", "Ann", "Beulah", "Callie", "Lou", "Delia", "Eleanor", "Barbara", "Iva", "Louisa", "Maria", "Mayme", "Evelyn", "Estelle", "Nina", "Betty", "Marion", "Bettie", "Dorothy", "Luella", "Inez", "Lela", "Rosie", "Allie", "Millie", "Janie", "Cornelia", "Victoria", "Ruby", "Winifred", "Alta", "Celia", "Christine", "Beatrice", "Birdie", "Harriett", "Mable", "Myra", "Sophie", "Tillie", "Isabel", "Sylvia", "Carolyn", "Isabelle", "Leila", "Sally", "Ina", "Essie", "Bertie", "Nell", "Alberta", "Katharine", "Lora", "Rena", "Mina", "Rhoda", "Mathilda", "Abbie", "Eula", "Dollie", "Hettie", "Eunice", "Fanny", "Ola", "Lenora", "Adelaide", "Christina", "Lelia", "Nelle", "Sue", "Johanna", "Lilly", "Lucinda", "Minerva", "Lettie", "Roxie", "Cynthia", "Helena", "Hilda", "Hulda", "Bernice", "Genevieve", "Jean", "Cordelia", "Marian", "Francis", "Jeanette", "Adeline", "Gussie", "Leah", "Lois", "Lura", "Mittie", "Hallie", "Isabella", "Olga", "Phoebe", "Teresa", "Hester", "Lida", "Lina", "Winnie", "Claudia", "Marguerite", "Vera", "Cecelia", "Bess", "Emilie", "John", "Rosetta", "Verna", "Myrtie", "Cecilia", "Elva", "Olivia", "Ophelia", "Georgie", "Elnora", "Violet", "Adele", "Lily", "Linnie", "Loretta", "Madge", "Polly", "Virgie", "Eugenia", "Lucile", "Lucille", "Mabelle", "Rosalie"]
        },

        lastNames: ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Jordan', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Cruz', 'Marshall', 'Ortiz', 'Gomez', 'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Morales', 'Kennedy', 'Warren', 'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz', 'Harper', 'Fox', 'Riley', 'Armstrong', 'Carpenter', 'Weaver', 'Greene', 'Lawrence', 'Elliott', 'Chavez', 'Sims', 'Austin', 'Peters', 'Kelley', 'Franklin', 'Lawson', 'Fields', 'Gutierrez', 'Ryan', 'Schmidt', 'Carr', 'Vasquez', 'Castillo', 'Wheeler', 'Chapman', 'Oliver', 'Montgomery', 'Richards', 'Williamson', 'Johnston', 'Banks', 'Meyer', 'Bishop', 'McCoy', 'Howell', 'Alvarez', 'Morrison', 'Hansen', 'Fernandez', 'Garza', 'Harvey', 'Little', 'Burton', 'Stanley', 'Nguyen', 'George', 'Jacobs', 'Reid', 'Kim', 'Fuller', 'Lynch', 'Dean', 'Gilbert', 'Garrett', 'Romero', 'Welch', 'Larson', 'Frazier', 'Burke', 'Hanson', 'Day', 'Mendoza', 'Moreno', 'Bowman', 'Medina', 'Fowler', 'Brewer', 'Hoffman', 'Carlson', 'Silva', 'Pearson', 'Holland', 'Douglas', 'Fleming', 'Jensen', 'Vargas', 'Byrd', 'Davidson', 'Hopkins', 'May', 'Terry', 'Herrera', 'Wade', 'Soto', 'Walters', 'Curtis', 'Neal', 'Caldwell', 'Lowe', 'Jennings', 'Barnett', 'Graves', 'Jimenez', 'Horton', 'Shelton', 'Barrett', 'Obrien', 'Castro', 'Sutton', 'Gregory', 'McKinney', 'Lucas', 'Miles', 'Craig', 'Rodriquez', 'Chambers', 'Holt', 'Lambert', 'Fletcher', 'Watts', 'Bates', 'Hale', 'Rhodes', 'Pena', 'Beck', 'Newman', 'Haynes', 'McDaniel', 'Mendez', 'Bush', 'Vaughn', 'Parks', 'Dawson', 'Santiago', 'Norris', 'Hardy', 'Love', 'Steele', 'Curry', 'Powers', 'Schultz', 'Barker', 'Guzman', 'Page', 'Munoz', 'Ball', 'Keller', 'Chandler', 'Weber', 'Leonard', 'Walsh', 'Lyons', 'Ramsey', 'Wolfe', 'Schneider', 'Mullins', 'Benson', 'Sharp', 'Bowen', 'Daniel', 'Barber', 'Cummings', 'Hines', 'Baldwin', 'Griffith', 'Valdez', 'Hubbard', 'Salazar', 'Reeves', 'Warner', 'Stevenson', 'Burgess', 'Santos', 'Tate', 'Cross', 'Garner', 'Mann', 'Mack', 'Moss', 'Thornton', 'Dennis', 'McGee', 'Farmer', 'Delgado', 'Aguilar', 'Vega', 'Glover', 'Manning', 'Cohen', 'Harmon', 'Rodgers', 'Robbins', 'Newton', 'Todd', 'Blair', 'Higgins', 'Ingram', 'Reese', 'Cannon', 'Strickland', 'Townsend', 'Potter', 'Goodwin', 'Walton', 'Rowe', 'Hampton', 'Ortega', 'Patton', 'Swanson', 'Joseph', 'Francis', 'Goodman', 'Maldonado', 'Yates', 'Becker', 'Erickson', 'Hodges', 'Rios', 'Conner', 'Adkins', 'Webster', 'Norman', 'Malone', 'Hammond', 'Flowers', 'Cobb', 'Moody', 'Quinn', 'Blake', 'Maxwell', 'Pope', 'Floyd', 'Osborne', 'Paul', 'McCarthy', 'Guerrero', 'Lindsey', 'Estrada', 'Sandoval', 'Gibbs', 'Tyler', 'Gross', 'Fitzgerald', 'Stokes', 'Doyle', 'Sherman', 'Saunders', 'Wise', 'Colon', 'Gill', 'Alvarado', 'Greer', 'Padilla', 'Simon', 'Waters', 'Nunez', 'Ballard', 'Schwartz', 'McBride', 'Houston', 'Christensen', 'Klein', 'Pratt', 'Briggs', 'Parsons', 'McLaughlin', 'Zimmerman', 'French', 'Buchanan', 'Moran', 'Copeland', 'Roy', 'Pittman', 'Brady', 'McCormick', 'Holloway', 'Brock', 'Poole', 'Frank', 'Logan', 'Owen', 'Bass', 'Marsh', 'Drake', 'Wong', 'Jefferson', 'Park', 'Morton', 'Abbott', 'Sparks', 'Patrick', 'Norton', 'Huff', 'Clayton', 'Massey', 'Lloyd', 'Figueroa', 'Carson', 'Bowers', 'Roberson', 'Barton', 'Tran', 'Lamb', 'Harrington', 'Casey', 'Boone', 'Cortez', 'Clarke', 'Mathis', 'Singleton', 'Wilkins', 'Cain', 'Bryan', 'Underwood', 'Hogan', 'McKenzie', 'Collier', 'Luna', 'Phelps', 'McGuire', 'Allison', 'Bridges', 'Wilkerson', 'Nash', 'Summers', 'Atkins'],

        // Data taken from https://github.com/umpirsky/country-list/blob/master/country/cldr/en_US/country.json
        countries: [{"name":"Afghanistan","abbreviation":"AF"},{"name":"Albania","abbreviation":"AL"},{"name":"Algeria","abbreviation":"DZ"},{"name":"American Samoa","abbreviation":"AS"},{"name":"Andorra","abbreviation":"AD"},{"name":"Angola","abbreviation":"AO"},{"name":"Anguilla","abbreviation":"AI"},{"name":"Antarctica","abbreviation":"AQ"},{"name":"Antigua and Barbuda","abbreviation":"AG"},{"name":"Argentina","abbreviation":"AR"},{"name":"Armenia","abbreviation":"AM"},{"name":"Aruba","abbreviation":"AW"},{"name":"Australia","abbreviation":"AU"},{"name":"Austria","abbreviation":"AT"},{"name":"Azerbaijan","abbreviation":"AZ"},{"name":"Bahamas","abbreviation":"BS"},{"name":"Bahrain","abbreviation":"BH"},{"name":"Bangladesh","abbreviation":"BD"},{"name":"Barbados","abbreviation":"BB"},{"name":"Belarus","abbreviation":"BY"},{"name":"Belgium","abbreviation":"BE"},{"name":"Belize","abbreviation":"BZ"},{"name":"Benin","abbreviation":"BJ"},{"name":"Bermuda","abbreviation":"BM"},{"name":"Bhutan","abbreviation":"BT"},{"name":"Bolivia","abbreviation":"BO"},{"name":"Bosnia and Herzegovina","abbreviation":"BA"},{"name":"Botswana","abbreviation":"BW"},{"name":"Bouvet Island","abbreviation":"BV"},{"name":"Brazil","abbreviation":"BR"},{"name":"British Antarctic Territory","abbreviation":"BQ"},{"name":"British Indian Ocean Territory","abbreviation":"IO"},{"name":"British Virgin Islands","abbreviation":"VG"},{"name":"Brunei","abbreviation":"BN"},{"name":"Bulgaria","abbreviation":"BG"},{"name":"Burkina Faso","abbreviation":"BF"},{"name":"Burundi","abbreviation":"BI"},{"name":"Cambodia","abbreviation":"KH"},{"name":"Cameroon","abbreviation":"CM"},{"name":"Canada","abbreviation":"CA"},{"name":"Canton and Enderbury Islands","abbreviation":"CT"},{"name":"Cape Verde","abbreviation":"CV"},{"name":"Cayman Islands","abbreviation":"KY"},{"name":"Central African Republic","abbreviation":"CF"},{"name":"Chad","abbreviation":"TD"},{"name":"Chile","abbreviation":"CL"},{"name":"China","abbreviation":"CN"},{"name":"Christmas Island","abbreviation":"CX"},{"name":"Cocos [Keeling] Islands","abbreviation":"CC"},{"name":"Colombia","abbreviation":"CO"},{"name":"Comoros","abbreviation":"KM"},{"name":"Congo - Brazzaville","abbreviation":"CG"},{"name":"Congo - Kinshasa","abbreviation":"CD"},{"name":"Cook Islands","abbreviation":"CK"},{"name":"Costa Rica","abbreviation":"CR"},{"name":"Croatia","abbreviation":"HR"},{"name":"Cuba","abbreviation":"CU"},{"name":"Cyprus","abbreviation":"CY"},{"name":"Czech Republic","abbreviation":"CZ"},{"name":"Côte d’Ivoire","abbreviation":"CI"},{"name":"Denmark","abbreviation":"DK"},{"name":"Djibouti","abbreviation":"DJ"},{"name":"Dominica","abbreviation":"DM"},{"name":"Dominican Republic","abbreviation":"DO"},{"name":"Dronning Maud Land","abbreviation":"NQ"},{"name":"East Germany","abbreviation":"DD"},{"name":"Ecuador","abbreviation":"EC"},{"name":"Egypt","abbreviation":"EG"},{"name":"El Salvador","abbreviation":"SV"},{"name":"Equatorial Guinea","abbreviation":"GQ"},{"name":"Eritrea","abbreviation":"ER"},{"name":"Estonia","abbreviation":"EE"},{"name":"Ethiopia","abbreviation":"ET"},{"name":"Falkland Islands","abbreviation":"FK"},{"name":"Faroe Islands","abbreviation":"FO"},{"name":"Fiji","abbreviation":"FJ"},{"name":"Finland","abbreviation":"FI"},{"name":"France","abbreviation":"FR"},{"name":"French Guiana","abbreviation":"GF"},{"name":"French Polynesia","abbreviation":"PF"},{"name":"French Southern Territories","abbreviation":"TF"},{"name":"French Southern and Antarctic Territories","abbreviation":"FQ"},{"name":"Gabon","abbreviation":"GA"},{"name":"Gambia","abbreviation":"GM"},{"name":"Georgia","abbreviation":"GE"},{"name":"Germany","abbreviation":"DE"},{"name":"Ghana","abbreviation":"GH"},{"name":"Gibraltar","abbreviation":"GI"},{"name":"Greece","abbreviation":"GR"},{"name":"Greenland","abbreviation":"GL"},{"name":"Grenada","abbreviation":"GD"},{"name":"Guadeloupe","abbreviation":"GP"},{"name":"Guam","abbreviation":"GU"},{"name":"Guatemala","abbreviation":"GT"},{"name":"Guernsey","abbreviation":"GG"},{"name":"Guinea","abbreviation":"GN"},{"name":"Guinea-Bissau","abbreviation":"GW"},{"name":"Guyana","abbreviation":"GY"},{"name":"Haiti","abbreviation":"HT"},{"name":"Heard Island and McDonald Islands","abbreviation":"HM"},{"name":"Honduras","abbreviation":"HN"},{"name":"Hong Kong SAR China","abbreviation":"HK"},{"name":"Hungary","abbreviation":"HU"},{"name":"Iceland","abbreviation":"IS"},{"name":"India","abbreviation":"IN"},{"name":"Indonesia","abbreviation":"ID"},{"name":"Iran","abbreviation":"IR"},{"name":"Iraq","abbreviation":"IQ"},{"name":"Ireland","abbreviation":"IE"},{"name":"Isle of Man","abbreviation":"IM"},{"name":"Israel","abbreviation":"IL"},{"name":"Italy","abbreviation":"IT"},{"name":"Jamaica","abbreviation":"JM"},{"name":"Japan","abbreviation":"JP"},{"name":"Jersey","abbreviation":"JE"},{"name":"Johnston Island","abbreviation":"JT"},{"name":"Jordan","abbreviation":"JO"},{"name":"Kazakhstan","abbreviation":"KZ"},{"name":"Kenya","abbreviation":"KE"},{"name":"Kiribati","abbreviation":"KI"},{"name":"Kuwait","abbreviation":"KW"},{"name":"Kyrgyzstan","abbreviation":"KG"},{"name":"Laos","abbreviation":"LA"},{"name":"Latvia","abbreviation":"LV"},{"name":"Lebanon","abbreviation":"LB"},{"name":"Lesotho","abbreviation":"LS"},{"name":"Liberia","abbreviation":"LR"},{"name":"Libya","abbreviation":"LY"},{"name":"Liechtenstein","abbreviation":"LI"},{"name":"Lithuania","abbreviation":"LT"},{"name":"Luxembourg","abbreviation":"LU"},{"name":"Macau SAR China","abbreviation":"MO"},{"name":"Macedonia","abbreviation":"MK"},{"name":"Madagascar","abbreviation":"MG"},{"name":"Malawi","abbreviation":"MW"},{"name":"Malaysia","abbreviation":"MY"},{"name":"Maldives","abbreviation":"MV"},{"name":"Mali","abbreviation":"ML"},{"name":"Malta","abbreviation":"MT"},{"name":"Marshall Islands","abbreviation":"MH"},{"name":"Martinique","abbreviation":"MQ"},{"name":"Mauritania","abbreviation":"MR"},{"name":"Mauritius","abbreviation":"MU"},{"name":"Mayotte","abbreviation":"YT"},{"name":"Metropolitan France","abbreviation":"FX"},{"name":"Mexico","abbreviation":"MX"},{"name":"Micronesia","abbreviation":"FM"},{"name":"Midway Islands","abbreviation":"MI"},{"name":"Moldova","abbreviation":"MD"},{"name":"Monaco","abbreviation":"MC"},{"name":"Mongolia","abbreviation":"MN"},{"name":"Montenegro","abbreviation":"ME"},{"name":"Montserrat","abbreviation":"MS"},{"name":"Morocco","abbreviation":"MA"},{"name":"Mozambique","abbreviation":"MZ"},{"name":"Myanmar [Burma]","abbreviation":"MM"},{"name":"Namibia","abbreviation":"NA"},{"name":"Nauru","abbreviation":"NR"},{"name":"Nepal","abbreviation":"NP"},{"name":"Netherlands","abbreviation":"NL"},{"name":"Netherlands Antilles","abbreviation":"AN"},{"name":"Neutral Zone","abbreviation":"NT"},{"name":"New Caledonia","abbreviation":"NC"},{"name":"New Zealand","abbreviation":"NZ"},{"name":"Nicaragua","abbreviation":"NI"},{"name":"Niger","abbreviation":"NE"},{"name":"Nigeria","abbreviation":"NG"},{"name":"Niue","abbreviation":"NU"},{"name":"Norfolk Island","abbreviation":"NF"},{"name":"North Korea","abbreviation":"KP"},{"name":"North Vietnam","abbreviation":"VD"},{"name":"Northern Mariana Islands","abbreviation":"MP"},{"name":"Norway","abbreviation":"NO"},{"name":"Oman","abbreviation":"OM"},{"name":"Pacific Islands Trust Territory","abbreviation":"PC"},{"name":"Pakistan","abbreviation":"PK"},{"name":"Palau","abbreviation":"PW"},{"name":"Palestinian Territories","abbreviation":"PS"},{"name":"Panama","abbreviation":"PA"},{"name":"Panama Canal Zone","abbreviation":"PZ"},{"name":"Papua New Guinea","abbreviation":"PG"},{"name":"Paraguay","abbreviation":"PY"},{"name":"People's Democratic Republic of Yemen","abbreviation":"YD"},{"name":"Peru","abbreviation":"PE"},{"name":"Philippines","abbreviation":"PH"},{"name":"Pitcairn Islands","abbreviation":"PN"},{"name":"Poland","abbreviation":"PL"},{"name":"Portugal","abbreviation":"PT"},{"name":"Puerto Rico","abbreviation":"PR"},{"name":"Qatar","abbreviation":"QA"},{"name":"Romania","abbreviation":"RO"},{"name":"Russia","abbreviation":"RU"},{"name":"Rwanda","abbreviation":"RW"},{"name":"Réunion","abbreviation":"RE"},{"name":"Saint Barthélemy","abbreviation":"BL"},{"name":"Saint Helena","abbreviation":"SH"},{"name":"Saint Kitts and Nevis","abbreviation":"KN"},{"name":"Saint Lucia","abbreviation":"LC"},{"name":"Saint Martin","abbreviation":"MF"},{"name":"Saint Pierre and Miquelon","abbreviation":"PM"},{"name":"Saint Vincent and the Grenadines","abbreviation":"VC"},{"name":"Samoa","abbreviation":"WS"},{"name":"San Marino","abbreviation":"SM"},{"name":"Saudi Arabia","abbreviation":"SA"},{"name":"Senegal","abbreviation":"SN"},{"name":"Serbia","abbreviation":"RS"},{"name":"Serbia and Montenegro","abbreviation":"CS"},{"name":"Seychelles","abbreviation":"SC"},{"name":"Sierra Leone","abbreviation":"SL"},{"name":"Singapore","abbreviation":"SG"},{"name":"Slovakia","abbreviation":"SK"},{"name":"Slovenia","abbreviation":"SI"},{"name":"Solomon Islands","abbreviation":"SB"},{"name":"Somalia","abbreviation":"SO"},{"name":"South Africa","abbreviation":"ZA"},{"name":"South Georgia and the South Sandwich Islands","abbreviation":"GS"},{"name":"South Korea","abbreviation":"KR"},{"name":"Spain","abbreviation":"ES"},{"name":"Sri Lanka","abbreviation":"LK"},{"name":"Sudan","abbreviation":"SD"},{"name":"Suriname","abbreviation":"SR"},{"name":"Svalbard and Jan Mayen","abbreviation":"SJ"},{"name":"Swaziland","abbreviation":"SZ"},{"name":"Sweden","abbreviation":"SE"},{"name":"Switzerland","abbreviation":"CH"},{"name":"Syria","abbreviation":"SY"},{"name":"São Tomé and Príncipe","abbreviation":"ST"},{"name":"Taiwan","abbreviation":"TW"},{"name":"Tajikistan","abbreviation":"TJ"},{"name":"Tanzania","abbreviation":"TZ"},{"name":"Thailand","abbreviation":"TH"},{"name":"Timor-Leste","abbreviation":"TL"},{"name":"Togo","abbreviation":"TG"},{"name":"Tokelau","abbreviation":"TK"},{"name":"Tonga","abbreviation":"TO"},{"name":"Trinidad and Tobago","abbreviation":"TT"},{"name":"Tunisia","abbreviation":"TN"},{"name":"Turkey","abbreviation":"TR"},{"name":"Turkmenistan","abbreviation":"TM"},{"name":"Turks and Caicos Islands","abbreviation":"TC"},{"name":"Tuvalu","abbreviation":"TV"},{"name":"U.S. Minor Outlying Islands","abbreviation":"UM"},{"name":"U.S. Miscellaneous Pacific Islands","abbreviation":"PU"},{"name":"U.S. Virgin Islands","abbreviation":"VI"},{"name":"Uganda","abbreviation":"UG"},{"name":"Ukraine","abbreviation":"UA"},{"name":"Union of Soviet Socialist Republics","abbreviation":"SU"},{"name":"United Arab Emirates","abbreviation":"AE"},{"name":"United Kingdom","abbreviation":"GB"},{"name":"United States","abbreviation":"US"},{"name":"Unknown or Invalid Region","abbreviation":"ZZ"},{"name":"Uruguay","abbreviation":"UY"},{"name":"Uzbekistan","abbreviation":"UZ"},{"name":"Vanuatu","abbreviation":"VU"},{"name":"Vatican City","abbreviation":"VA"},{"name":"Venezuela","abbreviation":"VE"},{"name":"Vietnam","abbreviation":"VN"},{"name":"Wake Island","abbreviation":"WK"},{"name":"Wallis and Futuna","abbreviation":"WF"},{"name":"Western Sahara","abbreviation":"EH"},{"name":"Yemen","abbreviation":"YE"},{"name":"Zambia","abbreviation":"ZM"},{"name":"Zimbabwe","abbreviation":"ZW"},{"name":"Åland Islands","abbreviation":"AX"}],

        provinces: [
            {name: 'Alberta', abbreviation: 'AB'},
            {name: 'British Columbia', abbreviation: 'BC'},
            {name: 'Manitoba', abbreviation: 'MB'},
            {name: 'New Brunswick', abbreviation: 'NB'},
            {name: 'Newfoundland and Labrador', abbreviation: 'NL'},
            {name: 'Nova Scotia', abbreviation: 'NS'},
            {name: 'Ontario', abbreviation: 'ON'},
            {name: 'Prince Edward Island', abbreviation: 'PE'},
            {name: 'Quebec', abbreviation: 'QC'},
            {name: 'Saskatchewan', abbreviation: 'SK'},

            // The case could be made that the following are not actually provinces
            // since they are technically considered "territories" however they all
            // look the same on an envelope!
            {name: 'Northwest Territories', abbreviation: 'NT'},
            {name: 'Nunavut', abbreviation: 'NU'},
            {name: 'Yukon', abbreviation: 'YT'}
        ],

        us_states_and_dc: [
            {name: 'Alabama', abbreviation: 'AL'},
            {name: 'Alaska', abbreviation: 'AK'},
            {name: 'Arizona', abbreviation: 'AZ'},
            {name: 'Arkansas', abbreviation: 'AR'},
            {name: 'California', abbreviation: 'CA'},
            {name: 'Colorado', abbreviation: 'CO'},
            {name: 'Connecticut', abbreviation: 'CT'},
            {name: 'Delaware', abbreviation: 'DE'},
            {name: 'District of Columbia', abbreviation: 'DC'},
            {name: 'Florida', abbreviation: 'FL'},
            {name: 'Georgia', abbreviation: 'GA'},
            {name: 'Hawaii', abbreviation: 'HI'},
            {name: 'Idaho', abbreviation: 'ID'},
            {name: 'Illinois', abbreviation: 'IL'},
            {name: 'Indiana', abbreviation: 'IN'},
            {name: 'Iowa', abbreviation: 'IA'},
            {name: 'Kansas', abbreviation: 'KS'},
            {name: 'Kentucky', abbreviation: 'KY'},
            {name: 'Louisiana', abbreviation: 'LA'},
            {name: 'Maine', abbreviation: 'ME'},
            {name: 'Maryland', abbreviation: 'MD'},
            {name: 'Massachusetts', abbreviation: 'MA'},
            {name: 'Michigan', abbreviation: 'MI'},
            {name: 'Minnesota', abbreviation: 'MN'},
            {name: 'Mississippi', abbreviation: 'MS'},
            {name: 'Missouri', abbreviation: 'MO'},
            {name: 'Montana', abbreviation: 'MT'},
            {name: 'Nebraska', abbreviation: 'NE'},
            {name: 'Nevada', abbreviation: 'NV'},
            {name: 'New Hampshire', abbreviation: 'NH'},
            {name: 'New Jersey', abbreviation: 'NJ'},
            {name: 'New Mexico', abbreviation: 'NM'},
            {name: 'New York', abbreviation: 'NY'},
            {name: 'North Carolina', abbreviation: 'NC'},
            {name: 'North Dakota', abbreviation: 'ND'},
            {name: 'Ohio', abbreviation: 'OH'},
            {name: 'Oklahoma', abbreviation: 'OK'},
            {name: 'Oregon', abbreviation: 'OR'},
            {name: 'Pennsylvania', abbreviation: 'PA'},
            {name: 'Rhode Island', abbreviation: 'RI'},
            {name: 'South Carolina', abbreviation: 'SC'},
            {name: 'South Dakota', abbreviation: 'SD'},
            {name: 'Tennessee', abbreviation: 'TN'},
            {name: 'Texas', abbreviation: 'TX'},
            {name: 'Utah', abbreviation: 'UT'},
            {name: 'Vermont', abbreviation: 'VT'},
            {name: 'Virginia', abbreviation: 'VA'},
            {name: 'Washington', abbreviation: 'WA'},
            {name: 'West Virginia', abbreviation: 'WV'},
            {name: 'Wisconsin', abbreviation: 'WI'},
            {name: 'Wyoming', abbreviation: 'WY'}
        ],

        territories: [
            {name: 'American Samoa', abbreviation: 'AS'},
            {name: 'Federated States of Micronesia', abbreviation: 'FM'},
            {name: 'Guam', abbreviation: 'GU'},
            {name: 'Marshall Islands', abbreviation: 'MH'},
            {name: 'Northern Mariana Islands', abbreviation: 'MP'},
            {name: 'Puerto Rico', abbreviation: 'PR'},
            {name: 'Virgin Islands, U.S.', abbreviation: 'VI'}
        ],

        armed_forces: [
            {name: 'Armed Forces Europe', abbreviation: 'AE'},
            {name: 'Armed Forces Pacific', abbreviation: 'AP'},
            {name: 'Armed Forces the Americas', abbreviation: 'AA'}
        ],

        street_suffixes: [
            {name: 'Avenue', abbreviation: 'Ave'},
            {name: 'Boulevard', abbreviation: 'Blvd'},
            {name: 'Center', abbreviation: 'Ctr'},
            {name: 'Circle', abbreviation: 'Cir'},
            {name: 'Court', abbreviation: 'Ct'},
            {name: 'Drive', abbreviation: 'Dr'},
            {name: 'Extension', abbreviation: 'Ext'},
            {name: 'Glen', abbreviation: 'Gln'},
            {name: 'Grove', abbreviation: 'Grv'},
            {name: 'Heights', abbreviation: 'Hts'},
            {name: 'Highway', abbreviation: 'Hwy'},
            {name: 'Junction', abbreviation: 'Jct'},
            {name: 'Key', abbreviation: 'Key'},
            {name: 'Lane', abbreviation: 'Ln'},
            {name: 'Loop', abbreviation: 'Loop'},
            {name: 'Manor', abbreviation: 'Mnr'},
            {name: 'Mill', abbreviation: 'Mill'},
            {name: 'Park', abbreviation: 'Park'},
            {name: 'Parkway', abbreviation: 'Pkwy'},
            {name: 'Pass', abbreviation: 'Pass'},
            {name: 'Path', abbreviation: 'Path'},
            {name: 'Pike', abbreviation: 'Pike'},
            {name: 'Place', abbreviation: 'Pl'},
            {name: 'Plaza', abbreviation: 'Plz'},
            {name: 'Point', abbreviation: 'Pt'},
            {name: 'Ridge', abbreviation: 'Rdg'},
            {name: 'River', abbreviation: 'Riv'},
            {name: 'Road', abbreviation: 'Rd'},
            {name: 'Square', abbreviation: 'Sq'},
            {name: 'Street', abbreviation: 'St'},
            {name: 'Terrace', abbreviation: 'Ter'},
            {name: 'Trail', abbreviation: 'Trl'},
            {name: 'Turnpike', abbreviation: 'Tpke'},
            {name: 'View', abbreviation: 'Vw'},
            {name: 'Way', abbreviation: 'Way'}
        ],

        months: [
            {name: 'January', short_name: 'Jan', numeric: '01', days: 31},
            // Not messing with leap years...
            {name: 'February', short_name: 'Feb', numeric: '02', days: 28},
            {name: 'March', short_name: 'Mar', numeric: '03', days: 31},
            {name: 'April', short_name: 'Apr', numeric: '04', days: 30},
            {name: 'May', short_name: 'May', numeric: '05', days: 31},
            {name: 'June', short_name: 'Jun', numeric: '06', days: 30},
            {name: 'July', short_name: 'Jul', numeric: '07', days: 31},
            {name: 'August', short_name: 'Aug', numeric: '08', days: 31},
            {name: 'September', short_name: 'Sep', numeric: '09', days: 30},
            {name: 'October', short_name: 'Oct', numeric: '10', days: 31},
            {name: 'November', short_name: 'Nov', numeric: '11', days: 30},
            {name: 'December', short_name: 'Dec', numeric: '12', days: 31}
        ],

        // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
        cc_types: [
            {name: "American Express", short_name: 'amex', prefix: '34', length: 15},
            {name: "Bankcard", short_name: 'bankcard', prefix: '5610', length: 16},
            {name: "China UnionPay", short_name: 'chinaunion', prefix: '62', length: 16},
            {name: "Diners Club Carte Blanche", short_name: 'dccarte', prefix: '300', length: 14},
            {name: "Diners Club enRoute", short_name: 'dcenroute', prefix: '2014', length: 15},
            {name: "Diners Club International", short_name: 'dcintl', prefix: '36', length: 14},
            {name: "Diners Club United States & Canada", short_name: 'dcusc', prefix: '54', length: 16},
            {name: "Discover Card", short_name: 'discover', prefix: '6011', length: 16},
            {name: "InstaPayment", short_name: 'instapay', prefix: '637', length: 16},
            {name: "JCB", short_name: 'jcb', prefix: '3528', length: 16},
            {name: "Laser", short_name: 'laser', prefix: '6304', length: 16},
            {name: "Maestro", short_name: 'maestro', prefix: '5018', length: 16},
            {name: "Mastercard", short_name: 'mc', prefix: '51', length: 16},
            {name: "Solo", short_name: 'solo', prefix: '6334', length: 16},
            {name: "Switch", short_name: 'switch', prefix: '4903', length: 16},
            {name: "Visa", short_name: 'visa', prefix: '4', length: 16},
            {name: "Visa Electron", short_name: 'electron', prefix: '4026', length: 16}
        ],

        //return all world currency by ISO 4217
        currency_types: [
            {'code' : 'AED', 'name' : 'United Arab Emirates Dirham'},
            {'code' : 'AFN', 'name' : 'Afghanistan Afghani'},
            {'code' : 'ALL', 'name' : 'Albania Lek'},
            {'code' : 'AMD', 'name' : 'Armenia Dram'},
            {'code' : 'ANG', 'name' : 'Netherlands Antilles Guilder'},
            {'code' : 'AOA', 'name' : 'Angola Kwanza'},
            {'code' : 'ARS', 'name' : 'Argentina Peso'},
            {'code' : 'AUD', 'name' : 'Australia Dollar'},
            {'code' : 'AWG', 'name' : 'Aruba Guilder'},
            {'code' : 'AZN', 'name' : 'Azerbaijan New Manat'},
            {'code' : 'BAM', 'name' : 'Bosnia and Herzegovina Convertible Marka'},
            {'code' : 'BBD', 'name' : 'Barbados Dollar'},
            {'code' : 'BDT', 'name' : 'Bangladesh Taka'},
            {'code' : 'BGN', 'name' : 'Bulgaria Lev'},
            {'code' : 'BHD', 'name' : 'Bahrain Dinar'},
            {'code' : 'BIF', 'name' : 'Burundi Franc'},
            {'code' : 'BMD', 'name' : 'Bermuda Dollar'},
            {'code' : 'BND', 'name' : 'Brunei Darussalam Dollar'},
            {'code' : 'BOB', 'name' : 'Bolivia Boliviano'},
            {'code' : 'BRL', 'name' : 'Brazil Real'},
            {'code' : 'BSD', 'name' : 'Bahamas Dollar'},
            {'code' : 'BTN', 'name' : 'Bhutan Ngultrum'},
            {'code' : 'BWP', 'name' : 'Botswana Pula'},
            {'code' : 'BYR', 'name' : 'Belarus Ruble'},
            {'code' : 'BZD', 'name' : 'Belize Dollar'},
            {'code' : 'CAD', 'name' : 'Canada Dollar'},
            {'code' : 'CDF', 'name' : 'Congo/Kinshasa Franc'},
            {'code' : 'CHF', 'name' : 'Switzerland Franc'},
            {'code' : 'CLP', 'name' : 'Chile Peso'},
            {'code' : 'CNY', 'name' : 'China Yuan Renminbi'},
            {'code' : 'COP', 'name' : 'Colombia Peso'},
            {'code' : 'CRC', 'name' : 'Costa Rica Colon'},
            {'code' : 'CUC', 'name' : 'Cuba Convertible Peso'},
            {'code' : 'CUP', 'name' : 'Cuba Peso'},
            {'code' : 'CVE', 'name' : 'Cape Verde Escudo'},
            {'code' : 'CZK', 'name' : 'Czech Republic Koruna'},
            {'code' : 'DJF', 'name' : 'Djibouti Franc'},
            {'code' : 'DKK', 'name' : 'Denmark Krone'},
            {'code' : 'DOP', 'name' : 'Dominican Republic Peso'},
            {'code' : 'DZD', 'name' : 'Algeria Dinar'},
            {'code' : 'EGP', 'name' : 'Egypt Pound'},
            {'code' : 'ERN', 'name' : 'Eritrea Nakfa'},
            {'code' : 'ETB', 'name' : 'Ethiopia Birr'},
            {'code' : 'EUR', 'name' : 'Euro Member Countries'},
            {'code' : 'FJD', 'name' : 'Fiji Dollar'},
            {'code' : 'FKP', 'name' : 'Falkland Islands (Malvinas) Pound'},
            {'code' : 'GBP', 'name' : 'United Kingdom Pound'},
            {'code' : 'GEL', 'name' : 'Georgia Lari'},
            {'code' : 'GGP', 'name' : 'Guernsey Pound'},
            {'code' : 'GHS', 'name' : 'Ghana Cedi'},
            {'code' : 'GIP', 'name' : 'Gibraltar Pound'},
            {'code' : 'GMD', 'name' : 'Gambia Dalasi'},
            {'code' : 'GNF', 'name' : 'Guinea Franc'},
            {'code' : 'GTQ', 'name' : 'Guatemala Quetzal'},
            {'code' : 'GYD', 'name' : 'Guyana Dollar'},
            {'code' : 'HKD', 'name' : 'Hong Kong Dollar'},
            {'code' : 'HNL', 'name' : 'Honduras Lempira'},
            {'code' : 'HRK', 'name' : 'Croatia Kuna'},
            {'code' : 'HTG', 'name' : 'Haiti Gourde'},
            {'code' : 'HUF', 'name' : 'Hungary Forint'},
            {'code' : 'IDR', 'name' : 'Indonesia Rupiah'},
            {'code' : 'ILS', 'name' : 'Israel Shekel'},
            {'code' : 'IMP', 'name' : 'Isle of Man Pound'},
            {'code' : 'INR', 'name' : 'India Rupee'},
            {'code' : 'IQD', 'name' : 'Iraq Dinar'},
            {'code' : 'IRR', 'name' : 'Iran Rial'},
            {'code' : 'ISK', 'name' : 'Iceland Krona'},
            {'code' : 'JEP', 'name' : 'Jersey Pound'},
            {'code' : 'JMD', 'name' : 'Jamaica Dollar'},
            {'code' : 'JOD', 'name' : 'Jordan Dinar'},
            {'code' : 'JPY', 'name' : 'Japan Yen'},
            {'code' : 'KES', 'name' : 'Kenya Shilling'},
            {'code' : 'KGS', 'name' : 'Kyrgyzstan Som'},
            {'code' : 'KHR', 'name' : 'Cambodia Riel'},
            {'code' : 'KMF', 'name' : 'Comoros Franc'},
            {'code' : 'KPW', 'name' : 'Korea (North) Won'},
            {'code' : 'KRW', 'name' : 'Korea (South) Won'},
            {'code' : 'KWD', 'name' : 'Kuwait Dinar'},
            {'code' : 'KYD', 'name' : 'Cayman Islands Dollar'},
            {'code' : 'KZT', 'name' : 'Kazakhstan Tenge'},
            {'code' : 'LAK', 'name' : 'Laos Kip'},
            {'code' : 'LBP', 'name' : 'Lebanon Pound'},
            {'code' : 'LKR', 'name' : 'Sri Lanka Rupee'},
            {'code' : 'LRD', 'name' : 'Liberia Dollar'},
            {'code' : 'LSL', 'name' : 'Lesotho Loti'},
            {'code' : 'LTL', 'name' : 'Lithuania Litas'},
            {'code' : 'LYD', 'name' : 'Libya Dinar'},
            {'code' : 'MAD', 'name' : 'Morocco Dirham'},
            {'code' : 'MDL', 'name' : 'Moldova Leu'},
            {'code' : 'MGA', 'name' : 'Madagascar Ariary'},
            {'code' : 'MKD', 'name' : 'Macedonia Denar'},
            {'code' : 'MMK', 'name' : 'Myanmar (Burma) Kyat'},
            {'code' : 'MNT', 'name' : 'Mongolia Tughrik'},
            {'code' : 'MOP', 'name' : 'Macau Pataca'},
            {'code' : 'MRO', 'name' : 'Mauritania Ouguiya'},
            {'code' : 'MUR', 'name' : 'Mauritius Rupee'},
            {'code' : 'MVR', 'name' : 'Maldives (Maldive Islands) Rufiyaa'},
            {'code' : 'MWK', 'name' : 'Malawi Kwacha'},
            {'code' : 'MXN', 'name' : 'Mexico Peso'},
            {'code' : 'MYR', 'name' : 'Malaysia Ringgit'},
            {'code' : 'MZN', 'name' : 'Mozambique Metical'},
            {'code' : 'NAD', 'name' : 'Namibia Dollar'},
            {'code' : 'NGN', 'name' : 'Nigeria Naira'},
            {'code' : 'NIO', 'name' : 'Nicaragua Cordoba'},
            {'code' : 'NOK', 'name' : 'Norway Krone'},
            {'code' : 'NPR', 'name' : 'Nepal Rupee'},
            {'code' : 'NZD', 'name' : 'New Zealand Dollar'},
            {'code' : 'OMR', 'name' : 'Oman Rial'},
            {'code' : 'PAB', 'name' : 'Panama Balboa'},
            {'code' : 'PEN', 'name' : 'Peru Nuevo Sol'},
            {'code' : 'PGK', 'name' : 'Papua New Guinea Kina'},
            {'code' : 'PHP', 'name' : 'Philippines Peso'},
            {'code' : 'PKR', 'name' : 'Pakistan Rupee'},
            {'code' : 'PLN', 'name' : 'Poland Zloty'},
            {'code' : 'PYG', 'name' : 'Paraguay Guarani'},
            {'code' : 'QAR', 'name' : 'Qatar Riyal'},
            {'code' : 'RON', 'name' : 'Romania New Leu'},
            {'code' : 'RSD', 'name' : 'Serbia Dinar'},
            {'code' : 'RUB', 'name' : 'Russia Ruble'},
            {'code' : 'RWF', 'name' : 'Rwanda Franc'},
            {'code' : 'SAR', 'name' : 'Saudi Arabia Riyal'},
            {'code' : 'SBD', 'name' : 'Solomon Islands Dollar'},
            {'code' : 'SCR', 'name' : 'Seychelles Rupee'},
            {'code' : 'SDG', 'name' : 'Sudan Pound'},
            {'code' : 'SEK', 'name' : 'Sweden Krona'},
            {'code' : 'SGD', 'name' : 'Singapore Dollar'},
            {'code' : 'SHP', 'name' : 'Saint Helena Pound'},
            {'code' : 'SLL', 'name' : 'Sierra Leone Leone'},
            {'code' : 'SOS', 'name' : 'Somalia Shilling'},
            {'code' : 'SPL', 'name' : 'Seborga Luigino'},
            {'code' : 'SRD', 'name' : 'Suriname Dollar'},
            {'code' : 'STD', 'name' : 'São Tomé and Príncipe Dobra'},
            {'code' : 'SVC', 'name' : 'El Salvador Colon'},
            {'code' : 'SYP', 'name' : 'Syria Pound'},
            {'code' : 'SZL', 'name' : 'Swaziland Lilangeni'},
            {'code' : 'THB', 'name' : 'Thailand Baht'},
            {'code' : 'TJS', 'name' : 'Tajikistan Somoni'},
            {'code' : 'TMT', 'name' : 'Turkmenistan Manat'},
            {'code' : 'TND', 'name' : 'Tunisia Dinar'},
            {'code' : 'TOP', 'name' : 'Tonga Pa\'anga'},
            {'code' : 'TRY', 'name' : 'Turkey Lira'},
            {'code' : 'TTD', 'name' : 'Trinidad and Tobago Dollar'},
            {'code' : 'TVD', 'name' : 'Tuvalu Dollar'},
            {'code' : 'TWD', 'name' : 'Taiwan New Dollar'},
            {'code' : 'TZS', 'name' : 'Tanzania Shilling'},
            {'code' : 'UAH', 'name' : 'Ukraine Hryvnia'},
            {'code' : 'UGX', 'name' : 'Uganda Shilling'},
            {'code' : 'USD', 'name' : 'United States Dollar'},
            {'code' : 'UYU', 'name' : 'Uruguay Peso'},
            {'code' : 'UZS', 'name' : 'Uzbekistan Som'},
            {'code' : 'VEF', 'name' : 'Venezuela Bolivar'},
            {'code' : 'VND', 'name' : 'Viet Nam Dong'},
            {'code' : 'VUV', 'name' : 'Vanuatu Vatu'},
            {'code' : 'WST', 'name' : 'Samoa Tala'},
            {'code' : 'XAF', 'name' : 'Communauté Financière Africaine (BEAC) CFA Franc BEAC'},
            {'code' : 'XCD', 'name' : 'East Caribbean Dollar'},
            {'code' : 'XDR', 'name' : 'International Monetary Fund (IMF) Special Drawing Rights'},
            {'code' : 'XOF', 'name' : 'Communauté Financière Africaine (BCEAO) Franc'},
            {'code' : 'XPF', 'name' : 'Comptoirs Français du Pacifique (CFP) Franc'},
            {'code' : 'YER', 'name' : 'Yemen Rial'},
            {'code' : 'ZAR', 'name' : 'South Africa Rand'},
            {'code' : 'ZMW', 'name' : 'Zambia Kwacha'},
            {'code' : 'ZWD', 'name' : 'Zimbabwe Dollar'}
        ]
    };

    var o_hasOwnProperty = Object.prototype.hasOwnProperty;
    var o_keys = (Object.keys || function(obj) {
      var result = [];
      for (var key in obj) {
        if (o_hasOwnProperty.call(obj, key)) {
          result.push(key);
        }
      }

      return result;
    });

    function _copyObject(source, target) {
      var keys = o_keys(source);
      var key;

      for (var i = 0, l = keys.length; i < l; i++) {
        key = keys[i];
        target[key] = source[key] || target[key];
      }
    }

    function _copyArray(source, target) {
      for (var i = 0, l = source.length; i < l; i++) {
        target[i] = source[i];
      }
    }

    function copyObject(source, _target) {
        var isArray = Array.isArray(source);
        var target = _target || (isArray ? new Array(source.length) : {});

        if (isArray) {
          _copyArray(source, target);
        } else {
          _copyObject(source, target);
        }

        return target;
    }

    /** Get the data based on key**/
    Chance.prototype.get = function (name) {
        return copyObject(data[name]);
    };

    // Mac Address
    Chance.prototype.mac_address = function(options){
        // typically mac addresses are separated by ":"
        // however they can also be separated by "-"
        // the network variant uses a dot every fourth byte

        options = initOptions(options);
        if(!options.separator) {
            options.separator =  options.networkVersion ? "." : ":";
        }

        var mac_pool="ABCDEF1234567890",
            mac = "";
        if(!options.networkVersion) {
            mac = this.n(this.string, 6, { pool: mac_pool, length:2 }).join(options.separator);
        } else {
            mac = this.n(this.string, 3, { pool: mac_pool, length:4 }).join(options.separator);
        }

        return mac;
    };

    Chance.prototype.normal = function (options) {
        options = initOptions(options, {mean : 0, dev : 1});

        // The Marsaglia Polar method
        var s, u, v, norm,
            mean = options.mean,
            dev = options.dev;

        do {
            // U and V are from the uniform distribution on (-1, 1)
            u = this.random() * 2 - 1;
            v = this.random() * 2 - 1;

            s = u * u + v * v;
        } while (s >= 1);

        // Compute the standard normal variate
        norm = u * Math.sqrt(-2 * Math.log(s) / s);

        // Shape and scale
        return dev * norm + mean;
    };

    Chance.prototype.radio = function (options) {
        // Initial Letter (Typically Designated by Side of Mississippi River)
        options = initOptions(options, {side : "?"});
        var fl = "";
        switch (options.side.toLowerCase()) {
        case "east":
        case "e":
            fl = "W";
            break;
        case "west":
        case "w":
            fl = "K";
            break;
        default:
            fl = this.character({pool: "KW"});
            break;
        }

        return fl + this.character({alpha: true, casing: "upper"}) +
                this.character({alpha: true, casing: "upper"}) +
                this.character({alpha: true, casing: "upper"});
    };

    // Set the data as key and data or the data map
    Chance.prototype.set = function (name, values) {
        if (typeof name === "string") {
            data[name] = values;
        } else {
            data = copyObject(name, data);
        }
    };

    Chance.prototype.tv = function (options) {
        return this.radio(options);
    };

    // ID number for Brazil companies
    Chance.prototype.cnpj = function () {
        var n = this.n(this.natural, 8, { max: 9 });
        var d1 = 2+n[7]*6+n[6]*7+n[5]*8+n[4]*9+n[3]*2+n[2]*3+n[1]*4+n[0]*5;
        d1 = 11 - (d1 % 11);
        if (d1>=10){
            d1 = 0;
        }
        var d2 = d1*2+3+n[7]*7+n[6]*8+n[5]*9+n[4]*2+n[3]*3+n[2]*4+n[1]*5+n[0]*6;
        d2 = 11 - (d2 % 11);
        if (d2>=10){
            d2 = 0;
        }
        return ''+n[0]+n[1]+'.'+n[2]+n[3]+n[4]+'.'+n[5]+n[6]+n[7]+'/0001-'+d1+d2;
    };

    // -- End Miscellaneous --

    Chance.prototype.mersenne_twister = function (seed) {
        return new MersenneTwister(seed);
    };

    // Mersenne Twister from https://gist.github.com/banksean/300494
    var MersenneTwister = function (seed) {
        if (seed === undefined) {
            seed = new Date().getTime();
        }
        /* Period parameters */
        this.N = 624;
        this.M = 397;
        this.MATRIX_A = 0x9908b0df;   /* constant vector a */
        this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
        this.LOWER_MASK = 0x7fffffff; /* least significant r bits */

        this.mt = new Array(this.N); /* the array for the state vector */
        this.mti = this.N + 1; /* mti==N + 1 means mt[N] is not initialized */

        this.init_genrand(seed);
    };

    /* initializes mt[N] with a seed */
    MersenneTwister.prototype.init_genrand = function (s) {
        this.mt[0] = s >>> 0;
        for (this.mti = 1; this.mti < this.N; this.mti++) {
            s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
            this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + this.mti;
            /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
            /* In the previous versions, MSBs of the seed affect   */
            /* only MSBs of the array mt[].                        */
            /* 2002/01/09 modified by Makoto Matsumoto             */
            this.mt[this.mti] >>>= 0;
            /* for >32 bit machines */
        }
    };

    /* initialize by an array with array-length */
    /* init_key is the array for initializing keys */
    /* key_length is its length */
    /* slight change for C++, 2004/2/26 */
    MersenneTwister.prototype.init_by_array = function (init_key, key_length) {
        var i = 1, j = 0, k, s;
        this.init_genrand(19650218);
        k = (this.N > key_length ? this.N : key_length);
        for (; k; k--) {
            s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525))) + init_key[j] + j; /* non linear */
            this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
            i++;
            j++;
            if (i >= this.N) { this.mt[0] = this.mt[this.N - 1]; i = 1; }
            if (j >= key_length) { j = 0; }
        }
        for (k = this.N - 1; k; k--) {
            s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
            this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941)) - i; /* non linear */
            this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
            i++;
            if (i >= this.N) { this.mt[0] = this.mt[this.N - 1]; i = 1; }
        }

        this.mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */
    };

    /* generates a random number on [0,0xffffffff]-interval */
    MersenneTwister.prototype.genrand_int32 = function () {
        var y;
        var mag01 = new Array(0x0, this.MATRIX_A);
        /* mag01[x] = x * MATRIX_A  for x=0,1 */

        if (this.mti >= this.N) { /* generate N words at one time */
            var kk;

            if (this.mti === this.N + 1) {   /* if init_genrand() has not been called, */
                this.init_genrand(5489); /* a default initial seed is used */
            }
            for (kk = 0; kk < this.N - this.M; kk++) {
                y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk + 1]&this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            for (;kk < this.N - 1; kk++) {
                y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk + 1]&this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
            }
            y = (this.mt[this.N - 1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
            this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

            this.mti = 0;
        }

        y = this.mt[this.mti++];

        /* Tempering */
        y ^= (y >>> 11);
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= (y >>> 18);

        return y >>> 0;
    };

    /* generates a random number on [0,0x7fffffff]-interval */
    MersenneTwister.prototype.genrand_int31 = function () {
        return (this.genrand_int32() >>> 1);
    };

    /* generates a random number on [0,1]-real-interval */
    MersenneTwister.prototype.genrand_real1 = function () {
        return this.genrand_int32() * (1.0 / 4294967295.0);
        /* divided by 2^32-1 */
    };

    /* generates a random number on [0,1)-real-interval */
    MersenneTwister.prototype.random = function () {
        return this.genrand_int32() * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };

    /* generates a random number on (0,1)-real-interval */
    MersenneTwister.prototype.genrand_real3 = function () {
        return (this.genrand_int32() + 0.5) * (1.0 / 4294967296.0);
        /* divided by 2^32 */
    };

    /* generates a random number on [0,1) with 53-bit resolution*/
    MersenneTwister.prototype.genrand_res53 = function () {
        var a = this.genrand_int32()>>>5, b = this.genrand_int32()>>>6;
        return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
    };


    // CommonJS module
    if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = Chance;
        }
        exports.Chance = Chance;
    }

    // Register as an anonymous AMD module
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return Chance;
        });
    }

    // if there is a importsScrips object define chance for worker
    if (typeof importScripts !== 'undefined') {
        chance = new Chance();
    }

    // If there is a window object, that at least has a document property,
    // instantiate and define chance on the window
    if (typeof window === "object" && typeof window.document === "object") {
        window.Chance = Chance;
        window.chance = new Chance();
    }
})();
;window.PopulatorView = countlyView.extend({
    initialize:function () {
    },
    beforeRender: function() {
        if(!this.template){
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/populator/templates/populate.html', function(src){
                self.template = Handlebars.compile(src);
            })).then(function () {});
        }
    },
    renderCommon:function (isRefresh) {
        this.templateData = {
            "page-title":jQuery.i18n.map["populator.title"]
        };
        var now = new Date();
        var fromDate = new Date(now.getTime()-1000*60*60*24*30);
        var toDate = now;
        var maxTime = 60;
        var maxTimeout;
        
        
        $(this.el).html(this.template(this.templateData));
        $("#start-populate").on('click', function() {
            CountlyHelpers.confirm(jQuery.i18n.map["populator.warning1"]+" ("+countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].name+").<br/>"+jQuery.i18n.map["populator.warning2"], "red", function (result) {
                if (!result) {
                    return true;
                }
                maxTime = parseInt($( "#populate-maxtime" ).val()) || maxTime;
                maxTimeout = setTimeout(function(){
                    $("#populator-status").fadeOut().text(jQuery.i18n.map["populator.processing"]).fadeIn();
                    countlyPopulator.stopGenerating(function(done){
                        if (done === true) {
                            $("#stop-populate").hide();
                            $("#start-populate").show();
                            $("#populator-status").fadeOut().text(jQuery.i18n.map["populator.done"]).fadeIn().delay(2000).text('');
                            CountlyHelpers.confirm(jQuery.i18n.map["populator.success"], "green", function (result) {
                                if (!result) {
                                    return true;
                                }
                                window.location = "/dashboard";
                            });
                            $("#populate-bar div").css({width: 0});
                        } else if (done === false) {
                            $("#populator-status").html(jQuery.i18n.map["populator.jobs"]);
                            $("#stop-populate").hide();
                            // do nothing for now
                        } else {
                            CountlyHelpers.alert(done, "red");
                            $("#stop-populate").hide();
                            $("#start-populate").show();
                            $("#populator-status").hide();
                            $("#populate-bar div").css({width: 0});
                        }
                    });
                }, maxTime*1000);
                
                fromDate = $( "#populate-from" ).datepicker( "getDate" ) || fromDate;
                toDate = $( "#populate-to" ).datepicker( "getDate" ) || toDate;
                countlyPopulator.setStartTime(fromDate.getTime()/1000);
                countlyPopulator.setEndTime(toDate.getTime()/1000);
                countlyPopulator.generateUsers(250);
                $("#start-populate").hide();
                $("#stop-populate").show();
                $("#populator-status").fadeOut().text(jQuery.i18n.map["populator.generating"]).fadeIn();
                $("#populate-bar div").animate({width:"100%"}, maxTime*1000);
            });
        });
        $("#stop-populate").on('click', function() {
            if(maxTimeout){
                clearTimeout(maxTimeout);
                maxTimeout = null;
            }
            countlyPopulator.stopGenerating();
            $("#stop-populate").hide();
            $("#start-populate").show();
            $("#populate-bar div").stop(true);
            $("#populate-bar div").width(0);
            CountlyHelpers.confirm(jQuery.i18n.map["populator.success"], "green", function (result) {
                if (!result) {
                    return true;
                }
                window.location = "/dashboard";
            });
        });
        
        $("#populate-explain").on('click', function() {
            CountlyHelpers.alert(jQuery.i18n.map["populator.help"], "green");
        });
        
        if(countlyPopulator.isGenerating()){
            $("#start-populate").hide();
            $("#stop-populate").show();
            countlyPopulator.generateUI();
            $( "#populate-from" ).val(moment(countlyPopulator.getStartTime()*1000).format("YYYY-MM-DD"));
            $( "#populate-to" ).val(moment(countlyPopulator.getEndTime()*1000).format("YYYY-MM-DD"));
            $( "#populate-from" ).datepicker({dateFormat: "yy-mm-dd", defaultDate:new Date(countlyPopulator.getStartTime()*1000), constrainInput:true, maxDate: now });
            $( "#populate-to" ).datepicker({dateFormat: "yy-mm-dd", defaultDate:new Date(countlyPopulator.getEndTime()*1000), constrainInput:true, maxDate: now });
        }
        else{
            $( "#populate-from" ).val(moment(fromDate).format("YYYY-MM-DD"));
            $( "#populate-to" ).val(moment(toDate).format("YYYY-MM-DD"));
            $( "#populate-from" ).datepicker({dateFormat: "yy-mm-dd", defaultDate:-30, constrainInput:true, maxDate: now });
            $( "#populate-to" ).datepicker({dateFormat: "yy-mm-dd", constrainInput:true, maxDate: now });
        }
        app.localize();
        if(this.state == "/autostart"){
            $("#start-populate").click();
        }
    },
    refresh:function () {}
});

//register views
app.populatorView = new PopulatorView();

app.route('/manage/populate*state', 'populate', function (state) {
    if(countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][countlyCommon.ACTIVE_APP_ID]){
        this.populatorView.state = state;
        this.renderWhenReady(this.populatorView);
    }
    else{
        app.navigate("/", true);
    }
});

var start_populating = false;
app.addPageScript("/manage/apps", function(){
    var populateApp = '<tr class="populate-demo-data">'+
        '<td>'+
            '<span data-localize="populator.demo-data"></span>'+
        '</td>'+
        '<td>'+
            '<input type="checkbox" id="populate-app-after"/>&nbsp;&nbsp;&nbsp;<span data-localize="populator.tooltip"></span>'+
        '</td>'+
    '</tr>';
    
    $("#add-new-app table .table-add").before(populateApp);
    
    var appId = countlyCommon.ACTIVE_APP_ID;
    if(countlyGlobal["apps"][appId] && (countlyGlobal["apps"][appId].type == "mobile" || countlyGlobal["apps"][appId].type == "web")) {
        $(".populate-demo-data").show();
    } 
    else{
        $(".populate-demo-data").hide();
    }
    
    $("#save-app-add").click(function () {
        if($("#add-new-app table #populate-app-after").is(':checked')){
            start_populating = true;
            setTimeout(function(){
                start_populating = false;
            }, 5000);
        }
    });
});

app.addAppManagementSwitchCallback(function(appId, type){
    if(type == "mobile" || type == "web"){
        $(".populate-demo-data").show();
    } 
    else{
        $(".populate-demo-data").hide();
    }
});

app.addAppManagementSwitchCallback(function(appId, type){
    if(start_populating){
        start_populating = false;
        setTimeout(function(){
            var appId = $("#view-app-id").text();
            countlyCommon.setActiveApp(appId);
            $("#sidebar-app-select").find(".logo").css("background-image", "url('"+countlyGlobal["cdn"]+"appimages/" + appId + ".png')");
            $("#sidebar-app-select").find(".text").text(countlyGlobal['apps'][appId].name);
            app.onAppSwitch(appId, true);
            app.navigate("/manage/populate/autostart", true);
        }, 1000);
    }
});

$( document ).ready(function() {
    if(!production){
        CountlyHelpers.loadJS("populator/javascripts/chance.js");
    }
    var style = "display:none;";
    if(countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][countlyCommon.ACTIVE_APP_ID]){
        style = "";
    }
    var menu = '<a href="#/manage/populate" class="item populator-menu" style="'+style+'">'+
        '<div class="logo-icon fa fa-random"></div>'+
        '<div class="text" data-localize="populator.title"></div>'+
    '</a>';
    if($('.sidebar-menu #management-submenu .help-toggle').length)
        $('.sidebar-menu #management-submenu .help-toggle').before(menu);
    
    //listen for UI app change
    app.addAppSwitchCallback(function(appId){
        if(countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][appId]){
            $(".populator-menu").show();
        }
        else{
            $(".populator-menu").hide();
        }
    });
});;(function (countlyReporting, $, undefined) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlyReporting.initialize = function (id) {
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_PARTS.data.r+"/reports/all",
			data:{
				"api_key":countlyGlobal.member.api_key
			},
			success:function (json) {
				_data = json;
			}
		});
    };
    
    countlyReporting.getData = function(){
        return _data;
    }
	
	countlyReporting.create = function (args) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/reports/create",
            data:{
				"api_key":countlyGlobal.member.api_key,
				args:JSON.stringify(args)
            }
        });
    };
	
	countlyReporting.update = function (args) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/reports/update",
            data:{
				"api_key":countlyGlobal.member.api_key,
				args:JSON.stringify(args)
            }
        });
    };
	
	countlyReporting.del = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/reports/delete",
            data:{
				"api_key":countlyGlobal.member.api_key,
				args:JSON.stringify({
                    "_id":id
                })
            }
        });
    };
    
    countlyReporting.send = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/reports/send",
            data:{
				"api_key":countlyGlobal.member.api_key,
				args:JSON.stringify({
                    "_id":id
                })
            }
        });
    };
	
}(window.countlyReporting = window.countlyReporting || {}, jQuery));;window.ReportingView = countlyView.extend({
	initialize:function () {},
    beforeRender: function() {
		if(this.template)
			return $.when(countlyReporting.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/reports/templates/reports.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyReporting.initialize()).then(function () {});
		}
    },
    getDayName: function(day){
        switch(day){
            case 1:
                return jQuery.i18n.map["reports.monday"];
            case 2:
                return jQuery.i18n.map["reports.tuesday"];
            case 3:
                return jQuery.i18n.map["reports.wednesday"];
            case 4:
                return jQuery.i18n.map["reports.thursday"];
            case 5:
                return jQuery.i18n.map["reports.friday"];
            case 6:
                return jQuery.i18n.map["reports.saturday"];
            case 7:
                return jQuery.i18n.map["reports.sunday"];
            default:
                return "";
        }
    },
    getDayNumber: function(day){
        switch(day){
            case jQuery.i18n.map["reports.monday"]:
                return "1";
            case jQuery.i18n.map["reports.tuesday"]:
                return "2";
            case jQuery.i18n.map["reports.wednesday"]:
                return "3";
            case jQuery.i18n.map["reports.thursday"]:
                return "4";
            case jQuery.i18n.map["reports.friday"]:
                return "5";
            case jQuery.i18n.map["reports.saturday"]:
                return "6";
            case jQuery.i18n.map["reports.sunday"]:
                return "7";
            default:
                return "1";
        }
    },
    renderCommon:function (isRefresh) {
        var cnts = app.manageAppsView.getTimeZones();
        var zones = {};
        var zNames = {};
        var zoneNames = [];
        for(var i in cnts){
            for(var j = 0; j < cnts[i].z.length; j++){
                for(var k in cnts[i].z[j]){
                    zoneNames.push(k);
                    zones[k] = cnts[i].z[j][k];
                    zNames[cnts[i].z[j][k]] = k;
                }
            }
        }
        
        var data = countlyReporting.getData();
        for(var i = 0; i < data.length; i++){
            if(data[i].apps && data[i].apps.length){
                data[i].appNames = CountlyHelpers.appIdsToNames(data[i].apps).split(", ");
                if(data[i].hour < 10)
                    data[i].hour = "0"+data[i].hour;
                if(data[i].minute < 10)
                    data[i].minute = "0"+data[i].minute;
                
                data[i].dayname = this.getDayName(data[i].day);
                data[i].zoneName = zNames[data[i].timezone] || "(GMT+00:00) GMT (no daylight saving)";
            }
        }
        
        zoneNames.sort(function(a, b){
            a = parseFloat(a.split(")")[0].replace(":", ".").substring(4));
            b = parseFloat(b.split(")")[0].replace(":", ".").substring(4));
            if(a < b) return -1;
            if(a > b) return 1;
            return 0;
        });
        this.zoneNames = zoneNames;
        this.zones = zones;
        this.templateData = {
            "page-title":jQuery.i18n.map["reports.title"],
            "data":data,
            "apps":(countlyGlobal["member"].global_admin) ? countlyGlobal['apps'] : countlyGlobal['admin_apps'],
            "zoneNames":zoneNames,
            "member":countlyGlobal["member"],
            "hasCrash":(typeof countlyCrashes != "undefined"),
            "hasPush":(typeof countlyPush != "undefined"),
            "hasRevenue":(typeof countlyRevenue != "undefined"),
            "hasViews":(typeof countlyViews != "undefined")
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
			self.dtable = $('#reports-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    $(nRow).attr("id", aData._id);
                },
                "aoColumns": [
                    { "mData": function(row, type){return row.appNames.join("<br/>");}, "sType":"string", "sTitle": jQuery.i18n.map["reports.apps"]},
                    { "mData": function(row, type){return row.emails.join("<br/>");}, "sType":"string", "sTitle": jQuery.i18n.map["reports.emails"]},
                    { "mData": function(row, type){var ret = ""; for(var i in row.metrics) ret += jQuery.i18n.map["reports."+i]+"<br/>"; return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["reports.metrics"]},
                    { "mData": function(row, type){return jQuery.i18n.map["reports."+row.frequency];}, "sType":"string", "sTitle": jQuery.i18n.map["reports.frequency"]},
                    { "mData": function(row, type){var ret = jQuery.i18n.map["reports.at"]+" "+row.hour+":"+row.minute+"<br/>"+row.zoneName; if(row.frequency == "weekly") ret += "<br/>"+jQuery.i18n.map["reports.on"]+" "+ row.dayname; return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["reports.time"]}
                ]
            }));
            self.dtable.fnSort( [ [0,'desc'] ] );
            self.dtable.stickyTableHeaders();
            CountlyHelpers.expandRows(self.dtable, self.editReport, self);
            self.initTable();
            $("#add-report").on("click", function(){
                CountlyHelpers.closeRows(self.dtable);
                $("#listof-apps").hide();
                $(".row").removeClass("selected");
                if ($(".create-report-row").is(":visible")) { 
                     $(".create-report-row").slideUp();
                }
                else{
                    $(".create-report-row").slideDown();
                    self.initTable();
                }
            });
            $(".create-report").on("click", function() {		
                $("#listof-apps").hide();
                
                var data = {},
                    currUserDetails = $(".user-details:visible");
                
                data.frequency = currUserDetails.find("input[name=frequency]:checked").val();
                var time = currUserDetails.find(".reports-time .text").text().split(":");
                data.hour = time[0];
                data.minute = time[1];
                data.day = app.reportingView.getDayNumber(currUserDetails.find(".reports-day .text").text());
                data.timezone = self.zones[currUserDetails.find(".reports-timezone .text").text()] || "Etc/GMT";
                data.emails = [];
                var lines = currUserDetails.find(".reports-emails").val().split(/\n/);
                for (var i=0; i < lines.length; i++) {
                    if (/\S/.test(lines[i])) {
                        data.emails.push($.trim(lines[i]));
                    }
                }
                data.apps = currUserDetails.find(".app-list").val().split(",");
                data.metrics = {};
                currUserDetails.find(".reports-metrics:checked").each(function(){
                    data.metrics[$(this).attr("name")] = true;
                })
                
                $(".required").fadeOut().remove();
                var reqSpan = $("<span>").addClass("required").text("*");
                
                if (!data.frequency || !data.frequency.length) {
                    currUserDetails.find(".reports-frequency-title").after(reqSpan.clone());
                }
                
                if (!data.hour.length) {
                    currUserDetails.find(".reports-hour").after(reqSpan.clone());
                }
                
                if (!data.minute.length) {
                    currUserDetails.find(".reports-minute").after(reqSpan.clone());
                }
                
                if (!data.day.length) {
                    currUserDetails.find(".reports-day").after(reqSpan.clone());
                }
                
                if (!data.emails.length) {
                    currUserDetails.find(".reports-emails").after(reqSpan.clone());
                }
                
                if (!data.apps.length || data.apps[0] == "") {
                    currUserDetails.find(".user-admin-list").before(reqSpan.clone());
                }
                
                if(JSON.stringify(data.metrics) == "{}"){
                    currUserDetails.find(".reports-include").append(reqSpan.clone());
                }
                
                
                if ($(".required").length) {
                    $(".required").fadeIn();
                    return false;
                } else if ($(".red-text").length) {
                    return false;
                }
                
                $.when(countlyReporting.create(data)).then(function (data) {
                    if(data.result == "Success"){
                        app.activeView.render();
                    }
                    else{
                        CountlyHelpers.alert(data.result, "red");
                    }
                });
            });
            $("#select-all").on('click', function() {
                $("#listof-apps .app:not(.disabled)").addClass("selected");
                var adminsOf = [];
                var adminOfIds = [];
                
                $("#listof-apps .app.selected").each(function() {
                    adminsOf[adminsOf.length] = $(this).find(".name").text();
                    adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
                });
                
                activeRow.find(".user-admin-list").text(adminsOf.join(", "));
                activeRow.find(".app-list").val(adminOfIds.join(","));
                activeRow.find(".no-apps").hide();
                
                $(this).hide();
                $("#deselect-all").show();
            });
            
            $("#deselect-all").on('click', function() {
                $("#listof-apps").find(".app:not(.disabled)").removeClass("selected");
                
                adminsOf = [];
                var adminOfIds = [];
                
                $("#listof-apps .app.selected").each(function() {
                    adminsOf[adminsOf.length] = $(this).find(".name").text();
                    adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
                });
                
                activeRow.find(".user-admin-list").text(adminsOf.join(", "));
                activeRow.find(".app-list").val(adminOfIds.join(","));
                
                if ($("#listof-apps .app.selected").length == 0) {
                    activeRow.find(".no-apps").show();
                } else {
                    activeRow.find(".no-apps").hide();
                }
                
                $(this).hide();
                $("#select-all").show();
            });
                    
            $("#listof-apps .app").on('click', function() {
                
                if ($(this).hasClass("disabled")) {
                    return true;
                }
                
                $(this).toggleClass("selected");
                
                if ($("#listof-apps .app.selected").length == $("#listof-apps .app").length) {
                    $("#select-all").hide();
                    $("#deselect-all").show();
                } else {
                    $("#select-all").show();
                    $("#deselect-all").hide();
                }
                
                adminsOf = [];
                var adminOfIds = [];
                $("#listof-apps .app.selected").each(function() {
                    adminsOf[adminsOf.length] = $(this).find(".name").text();
                    adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
                });
                
                if ($("#listof-apps .app.selected").length == 0) {
                    activeRow.find(".no-apps").show();
                } else {
                    activeRow.find(".no-apps").hide();
                }
                
                activeRow.find(".user-admin-list").text(adminsOf.join(", "));
                activeRow.find(".app-list").val(adminOfIds.join(","));
                
                var userAppRow = activeRow.next(".user-apps");
                
                if (userAppRow.length) {
                    var userAppIds = userAppRow.find(".app-list").val(),
                        usersOfIds = (userAppIds)? userAppIds.split(",") : [];
                
                    for (var i = 0; i < adminOfIds.length; i++) {
                        if (usersOfIds.indexOf(adminOfIds[i]) == -1) {
                            if (usersOfIds.length == 0 && i == 0) {
                                userAppRow.find(".user-admin-list").text(adminsOf[i]);
                                userAppRow.find(".app-list").val(adminOfIds[i]);
                            } else {
                                userAppRow.find(".user-admin-list").text(userAppRow.find(".user-admin-list").text().trim() + ", " + adminsOf[i]);
                                userAppRow.find(".app-list").val(userAppRow.find(".app-list").val() + "," + adminOfIds[i]);
                            }
                            
                            userAppRow.find(".no-apps").hide();
                        }
                    }
                }
            });
            
            $("#done").on('click', function() {
                $("#listof-apps").hide();
            });	
        }
    },
    initTable: function() {
        var self = this;
        function closeActiveEdit() {
            CountlyHelpers.closeRows(self.dtable);
            $("#listof-apps").hide();
        }
        $(".select-apps").off("click").on('click', function() {
            $("#listof-apps .app").removeClass("selected");
            activeRow = $(this).parent(".row");
            var buttonPos = $(this).offset();
            buttonPos.top += 26;
            buttonPos.left -= 18;
            
            if ($("#listof-apps").is(":visible") && JSON.stringify(buttonPos) === JSON.stringify(previousSelectAppPos)) {
                $("#listof-apps").hide();
                return true;
            }
            
            previousSelectAppPos = buttonPos;
            
            var appList = activeRow.find(".app-list").val().split(",");
            
            $("#listof-apps").find(".app_id").each(function() {
                if (appList.indexOf($(this).val()) != -1) {
                    $(this).parent().addClass("selected");
                }
            });
            
            if ($("#listof-apps .app:not(.disabled)").length == 0) {
                $("#select-all").hide();
                $("#deselect-all").hide();
            } else if ($("#listof-apps .app.selected").length == $("#listof-apps .app").length) {
                $("#select-all").hide();
                $("#deselect-all").show();
            } else {
                $("#select-all").show();
                $("#deselect-all").hide();
            }
            
            $("#listof-apps").show().offset(buttonPos);
        });
        
        $(".save-report").off("click").on("click", function() {
            $("#listof-apps").hide();
            
            lastUserSaved = true;
            
            var data = {},
                currUserDetails = $(".user-details:visible");
            
            data.frequency = currUserDetails.find("input[name=frequency]:checked").val();
            var time = currUserDetails.find(".reports-time .text").text().split(":");
            data.hour = time[0];
            data.minute = time[1];
            data.day = app.reportingView.getDayNumber(currUserDetails.find(".reports-day .text").text());
            data.timezone = self.zones[currUserDetails.find(".reports-timezone .text").text()] || "Etc/GMT";
            data.emails = [];
            var lines = currUserDetails.find(".reports-emails").val().split(/\n/);
            for (var i=0; i < lines.length; i++) {
                if (/\S/.test(lines[i])) {
                    data.emails.push($.trim(lines[i]));
                }
            }
            data.apps = currUserDetails.find(".app-list").val().split(",");
            data.metrics = {};
            currUserDetails.find(".reports-metrics:checked").each(function(){
                data.metrics[$(this).attr("name")] = true;
            });
            data._id = currUserDetails.find("._id").val();
            
            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");
            
            if (!data.frequency || !data.frequency.length) {
                currUserDetails.find(".reports-frequency-title").after(reqSpan.clone());
            }
            
            if (!data.hour.length) {
                currUserDetails.find(".reports-hour").after(reqSpan.clone());
            }
            
            if (!data.minute.length) {
                currUserDetails.find(".reports-minute").after(reqSpan.clone());
            }
            
            if (!data.day.length) {
                currUserDetails.find(".reports-day").after(reqSpan.clone());
            }
            
            if (!data.emails.length) {
                currUserDetails.find(".reports-emails").after(reqSpan.clone());
            }
            
            if (!data.apps.length || data.apps[0] == "") {
                currUserDetails.find(".user-admin-list").before(reqSpan.clone());
            }
            
            if(JSON.stringify(data.metrics) == "{}"){
                currUserDetails.find(".reports-include").append(reqSpan.clone());
            }
            
            
            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            } else if ($(".red-text").length) {
                return false;
            }
            
            $.when(countlyReporting.update(data)).then(function (data) {
                if(data.result == "Success"){
                    app.activeView.render();
                }
                else{
                    CountlyHelpers.alert(data.result, "red");
                }
            });
        });
        
        $(".cancel-report").off("click").on("click", function() {
            closeActiveEdit();
        });
        
        $(".delete-report").off("click").on("click", function() {
            var currUserDetails = $(".user-details:visible");
        
            var self = $(this);
            CountlyHelpers.confirm(jQuery.i18n.map["reports.confirm"], "red", function(result) {
                
                if (!result) {
                    return false;
                }
            
                var id = self.parent(".button-container").find("._id").val();
    
                $.when(countlyReporting.del(id)).then(function (data) {
                    if(data.result == "Success"){
                        app.activeView.render();
                    }
                    else{
                        CountlyHelpers.alert(data.result, "red");
                    }
                });
                
            });
        });
        
        $(".send-report").on("click", function() {
            var currUserDetails = $(".user-details:visible");
            var id = $(this).parent(".button-container").find("._id").val();
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();
            $.when(countlyReporting.send(id)).always(function (data) {
                overlay.hide();
                if(data && data.result == "Success"){
                    CountlyHelpers.alert(jQuery.i18n.map["reports.sent"], "green");
                }
                else{
                    if(data && data.result)
                        CountlyHelpers.alert(data.result, "red");
                    else
                        CountlyHelpers.alert(jQuery.i18n.map["reports.too-long"], "red");
                }
            });
        });
        
        $('input[name=frequency]').off("click").on("click", function(){
            currUserDetails = $(".user-details:visible");
            switch($(this).val()){
                case "daily":
                    currUserDetails.find(".reports-dow").hide();
                    break;
                case "weekly":
                    currUserDetails.find(".reports-dow").show();
                    break;
            }
        });
        CountlyHelpers.initializeSelect($(".user-details"));
    },
    editReport: function( d, self ) {
        $(".create-report-row").slideUp();
        $("#listof-apps").hide();
        $(".row").removeClass("selected");
        CountlyHelpers.closeRows(self.dtable);
		// `d` is the original data object for the row
		var str = '';
		if(d){
			str += '<div class="user-details datatablesubrow">';
            str += '<div>';
            str += '<div class="row help-zone-vs">';
			str += '<div class="title reports-frequency-title" data-localize="reports.frequency">'+jQuery.i18n.map["reports.frequency"]+'</div>';
			str += '<div class="detail">';
            if(d.frequency == "daily"){
                str += '<input class="reports-frequency" type="radio" name="frequency" value="daily" checked="checked"><span data-localize="reports.daily">'+jQuery.i18n.map["reports.daily"]+'</span>&nbsp;';
                str += '<input class="reports-frequency" type="radio" name="frequency" value="weekly"><span data-localize="reports.weekly">'+jQuery.i18n.map["reports.weekly"]+'</span>&nbsp;';
            }else{
                str += '<input class="reports-frequency" type="radio" name="frequency" value="daily"><span data-localize="reports.daily">'+jQuery.i18n.map["reports.daily"]+'</span>&nbsp;';
                str += '<input class="reports-frequency" type="radio" name="frequency" value="weekly" checked="checked"><span data-localize="reports.weekly">'+jQuery.i18n.map["reports.weekly"]+'</span>&nbsp;';
            }
            str += '</div>';
			str += '</div>';
            str += '<div class="row help-zone-vs">';
			str += '<div class="title" data-localize="reports.time">'+jQuery.i18n.map["reports.time"]+'</div>';
			str += '<div class="detail">';
            str += '<div class="cly-select reports-time">';
            str += '<div class="select-inner">';
            str += '<div class="text-container">';
            str += '<div class="text">'+d.hour+':'+d.minute+'</div>';
            str += '</div>';
            str += '<div class="right combo"></div>';
            str += '</div>';
            str += '<div class="select-items square">';
            str += '<div>';
            str += '<div data-value="00:00" class="segmentation-option item">00:00</div>';
            str += '<div data-value="01:00" class="segmentation-option item">01:00</div>';
            str += '<div data-value="02:00" class="segmentation-option item">02:00</div>';
            str += '<div data-value="03:00" class="segmentation-option item">03:00</div>';
            str += '<div data-value="04:00" class="segmentation-option item">04:00</div>';
            str += '<div data-value="05:00" class="segmentation-option item">05:00</div>';
            str += '<div data-value="06:00" class="segmentation-option item">06:00</div>';
            str += '<div data-value="07:00" class="segmentation-option item">07:00</div>';
            str += '<div data-value="08:00" class="segmentation-option item">08:00</div>';
            str += '<div data-value="09:00" class="segmentation-option item">09:00</div>';
            str += '<div data-value="10:00" class="segmentation-option item">10:00</div>';
            str += '<div data-value="11:00" class="segmentation-option item">11:00</div>';
            str += '<div data-value="12:00" class="segmentation-option item">12:00</div>';
            str += '<div data-value="13:00" class="segmentation-option item">13:00</div>';
            str += '<div data-value="14:00" class="segmentation-option item">14:00</div>';
            str += '<div data-value="15:00" class="segmentation-option item">15:00</div>';
            str += '<div data-value="16:00" class="segmentation-option item">16:00</div>';
            str += '<div data-value="17:00" class="segmentation-option item">17:00</div>';
            str += '<div data-value="18:00" class="segmentation-option item">18:00</div>';
            str += '<div data-value="19:00" class="segmentation-option item">19:00</div>';
            str += '<div data-value="20:00" class="segmentation-option item">20:00</div>';
            str += '<div data-value="21:00" class="segmentation-option item">21:00</div>';
            str += '<div data-value="22:00" class="segmentation-option item">22:00</div>';
            str += '<div data-value="23:00" class="segmentation-option item">23:00</div>';
            str += '</div>';
            str += '</div>';
            str += '</div>';
            str += '</div>';
			str += '</div>';
            str += '<div class="row help-zone-vs">';
			str += '<div class="title" data-localize="reports.timezone">'+jQuery.i18n.map["reports.timezone"]+'</div>';
			str += '<div class="detail">';
            str += '<div class="cly-select reports-timezone">';
            str += '<div class="select-inner">';
            str += '<div class="text-container">';
            str += '<div class="text">'+d.zoneName+'</div>';
            str += '</div>';
            str += '<div class="right combo"></div>';
            str += '</div>';
            str += '<div class="select-items square">';
            str += '<div>';
            for(var i = 0; i < self.zoneNames.length; i++){
                str += '<div data-value="'+self.zoneNames[i]+'" class="segmentation-option item">'+self.zoneNames[i]+'</div>'
            }
            str += '</div>';
            str += '</div>';
            str += '</div>';
            str += '</div>';
			str += '</div>';
            if(d.frequency == "weekly")
                str += '<div class="row reports-dow" style="display:block;">';
            else
                str += '<div class="row reports-dow">';
			str += '<div class="title"><span data-localize="reports.dow">'+jQuery.i18n.map["reports.dow"]+'</span></div>';
			str += '<div class="detail">';
			str += '<div class="cly-select reports-day">';
            str += '<div class="select-inner">';
            str += '<div class="text-container">';
            str += '<div class="text">'+d.dayname+'</div>';
            str += '</div>';
            str += '<div class="right combo"></div>';
            str += '</div>';
            str += '<div class="select-items square">';
            str += '<div>';
            str += '<div data-value="1" class="segmentation-option item" data-localize="reports.monday">'+jQuery.i18n.map["reports.monday"]+'</div>';
            str += '<div data-value="2" class="segmentation-option item" data-localize="reports.tuesday">'+jQuery.i18n.map["reports.tuesday"]+'</div>';
            str += '<div data-value="3" class="segmentation-option item" data-localize="reports.wednesday">'+jQuery.i18n.map["reports.wednesday"]+'</div>';
            str += '<div data-value="4" class="segmentation-option item" data-localize="reports.thursday">'+jQuery.i18n.map["reports.thursday"]+'</div>';
            str += '<div data-value="5" class="segmentation-option item" data-localize="reports.friday">'+jQuery.i18n.map["reports.friday"]+'</div>';
            str += '<div data-value="6" class="segmentation-option item" data-localize="reports.saturday">'+jQuery.i18n.map["reports.saturday"]+'</div>';
            str += '<div data-value="7" class="segmentation-option item" data-localize="reports.sunday">'+jQuery.i18n.map["reports.sunday"]+'</div>';
            str += '</div>';
            str += '</div>';
            str += '</div>';
			str += '</div>';
			str += '</div>';
			str += '<div class="row">';
			str += '<div class="title"><span data-localize="reports.emails">'+jQuery.i18n.map["reports.emails"]+'</span><br/>';
            str += '(<span data-localize="reports.help-emails">'+jQuery.i18n.map["reports.help-emails"]+'</span>)</div>';
			str += '<div class="detail">';
			str += '<textarea name="emails" class="reports-emails" cols="20" rows="5">';
            str += d.emails.join("\n");
            str += '</textarea>';
			str += '</div>';
			str += '</div>';
            str += '<div class="row admin-apps help-zone-vs">';
			str += '<div class="title" data-localize="reports.apps">'+jQuery.i18n.map["reports.apps"]+'</div>';
			str += '<div class="select-apps">';
			str += '<input type="hidden" value="'+d.apps+'" class="app-list"/>';
			str += '</div>';
			str += '<div class="detail user-admin-list">';
            if(d.apps)
                str += CountlyHelpers.appIdsToNames(d.apps);
            else
                str += '<span data-localize="reports.help-apps">'+jQuery.i18n.map["reports.help-apps"]+'</span>';
			str += '</div>';
			str += '<div class="no-apps" data-localize="reports.help-apps">'+jQuery.i18n.map["reports.help-apps"]+'</div>';
			str += '</div>';
            str += '<div class="row help-zone-vs">';
			str += '<div class="title reports-include" data-localize="reports.include-metrics">'+jQuery.i18n.map["reports.include-metrics"]+'</div>';
			str += '<div class="detail">';
            str += '<input type="checkbox" class="reports-metrics" name="analytics"';
            if(d.metrics.analytics) str += " checked ";
            str += '/>&nbsp;<span data-localize="reports.analytics">'+jQuery.i18n.map["reports.analytics"]+'</span><br/>';
            str += '<input type="checkbox" class="reports-metrics" name="events"';
            if(d.metrics.events) str += " checked ";
            str += '/>&nbsp;<span data-localize="reports.events">'+jQuery.i18n.map["reports.events"]+'</span><br/>';
            if(typeof countlyRevenue != "undefined"){
                str += '<input type="checkbox" class="reports-metrics" name="revenue"';
                if(d.metrics.revenue) str += " checked ";
                str += '/>&nbsp;<span data-localize="reports.revenue">'+jQuery.i18n.map["reports.revenue"]+'</span><br/>';
            }
            if(typeof countlyPush != "undefined"){
                str += '<input type="checkbox" class="reports-metrics" name="push"';
                if(d.metrics.push) str += " checked ";
                str += '/>&nbsp;<span data-localize="reports.push">'+jQuery.i18n.map["reports.push"]+'</span><br/>';
            }
            if(typeof countlyCrashes != "undefined"){
                str += '<input type="checkbox" class="reports-metrics" name="crash"';
                if(d.metrics.crash) str += " checked ";
                str += '/>&nbsp;<span data-localize="reports.crash">'+jQuery.i18n.map["reports.crash"]+'</span><br/>';
            }
            str += '</div>';
			str += '</div>';
			str += '<div class="button-container">';
			str += '<input class="_id" type="hidden" value="'+d._id+'"/>';
            str += '<a href=\'/i/reports/preview?api_key='+countlyGlobal["member"].api_key+'&args='+JSON.stringify({_id:d._id})+'\' target="_blank" class="icon-button green" data-localize="reports.preview">'+jQuery.i18n.map["reports.preview"]+'</a>';
            str += '<a class="icon-button green send-report" data-localize="reports.send">'+jQuery.i18n.map["reports.send"]+'</a>';
			str += '<a class="icon-button light save-report" data-localize="common.save">'+jQuery.i18n.map["common.save"]+'</a>';
			str += '<a class="icon-button light cancel-report" data-localize="common.cancel">'+jQuery.i18n.map["common.cancel"]+'</a>';
			str += '<a class="icon-button red delete-report" data-localize="reports.delete">'+jQuery.i18n.map["reports.delete"]+'</a>';
			str += '</div>';
			str += '</div>';
			str += '</div>';
		}
        setTimeout(function(){self.initTable();}, 1);
		return str;
	}
});

//register views
app.reportingView = new ReportingView();

if(countlyGlobal["member"].global_admin || countlyGlobal["member"]["admin_of"].length){
    app.route('/manage/reports', 'reports', function () {
        this.renderWhenReady(this.reportingView);
    });
}

$( document ).ready(function() {
	if(countlyGlobal["member"].global_admin || countlyGlobal["member"]["admin_of"].length){
        var menu = '<a href="#/manage/reports" class="item">'+
            '<div class="logo-icon fa fa-envelope"></div>'+
            '<div class="text" data-localize="reports.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
    
    //check if configuration view exists
    if(app.configurationsView){
        app.configurationsView.registerLabel("reports", "Reports");
        app.configurationsView.registerLabel("reports-use_cron", "Create cronjobs for reports");
    }
});;(function (countlyCrashes, $, undefined) {

    //Private Properties
    var _crashData = {},
		_groupData = {},
		_reportData = {},
        _crashTimeline = {},
        _list = {},
        _activeAppKey = 0,
        _initialized = false,
        _period = {},
		_periodObj = {},
		_metrics = {},
        _lastId = null,
        _usable_metrics = {};
        
    countlyCrashes.loadList = function (id) {
        $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":id,
                "method":"crashes",
                "list":1
            },
            dataType:"json",
            success:function (json) {
                for(var i = 0; i < json.length; i++){
                    _list[json[i]._id] = json[i].name;
                }
            }
        });
    }
    
    if(countlyGlobal.member && countlyGlobal.member.api_key){
        countlyCrashes.loadList(countlyCommon.ACTIVE_APP_ID);
    }

    //Public Methods
    countlyCrashes.initialize = function (id) {
		_activeAppKey = countlyCommon.ACTIVE_APP_KEY;
		_initialized = true;
		_metrics = {
            "os_name":jQuery.i18n.map["crashes.os"], 
            "browser":jQuery.i18n.map["crashes.browser"], 
            "view":jQuery.i18n.map["crashes.view"], 
            "app_version":jQuery.i18n.map["crashes.app_version"], 
            "os_version":jQuery.i18n.map["crashes.os_version"],
			"manufacture":jQuery.i18n.map["crashes.manufacture"], 
			"device":jQuery.i18n.map["crashes.device"], 
			"resolution":jQuery.i18n.map["crashes.resolution"], 
			"orientation":jQuery.i18n.map["crashes.orientation"],
			"cpu":jQuery.i18n.map["crashes.cpu"],
			"opengl":jQuery.i18n.map["crashes.opengl"]};
            
        
        
		_period = countlyCommon.getPeriodForAjax();
		if(id){
            _lastId = id;
			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
					"method":"crashes",
                    "period":_period,
					"group":id
				},
				dataType:"jsonp",
				success:function (json) {
					_groupData = json;
                    _list[_groupData._id] = _groupData.name;
					_groupData.dp = {};
					for(var i in _metrics){
                        if(_groupData[i]){
                            _usable_metrics[i] = _metrics[i];
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData[i], i, _metrics[i]);
                        }
					}
                    if(_groupData.custom){
                        for(var i in _groupData.custom){
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData.custom[i], i, i);
                            _usable_metrics[i] = i.charAt(0).toUpperCase() + i.slice(1);
                        }
                    }
				}, 
                error:function(){
                    CountlyHelpers.alert(jQuery.i18n.map["crashes.not-found"], "red");
                    app.navigate("/crashes", true);
                }
			});
		}
		else
			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
                    "period":_period,
					"method":"crashes",
                    "graph":1
				},
				dataType:"jsonp",
				success:function (json) {
					_crashData = json;
                    _crashTimeline = json.data;
                    setMeta();
					if(_crashData.crashes.latest_version == "")
						_crashData.crashes.latest_version = "None";
					if(_crashData.crashes.error == "")
						_crashData.crashes.error = "None";
					if(_crashData.crashes.os == "")
						_crashData.crashes.os = "None";
					if(_crashData.crashes.highest_app == "")
						_crashData.crashes.highest_app = "None";
				}
			});
    };
    
    countlyCrashes.getCrashName = function(id){
        if(_list[id])
            return _list[id];
        return id;
    }
    
    countlyCrashes.getRequestData =  function(){
        return {
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
					"method":"crashes",
					"group":_lastId,
                    "userlist":true
				};
    };
    
    countlyCrashes.getId = function(){
        return _lastId;
    }
    
    countlyCrashes.common = function (id, path, callback) {
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/crashes/'+path,
            data:{
                args:JSON.stringify({
                    crash_id:id
                }),
                app_id: countlyCommon.ACTIVE_APP_ID,
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(json);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
	
	countlyCrashes.markResolve = function (id, callback) {
        countlyCrashes.common(id, "resolve", function(json){
            if(json && json.version)
                callback(json.version.replace(/:/g, '.'));
            else
                callback();
        });
    };
	
	countlyCrashes.markUnresolve = function (id, callback) {
        countlyCrashes.common(id, "unresolve", callback);
    };
    
    countlyCrashes.share = function (id, callback) {
        countlyCrashes.common(id, "share", callback);
    };
    
    countlyCrashes.unshare = function (id, callback) {
        countlyCrashes.common(id, "unshare", callback);
    };
    
    countlyCrashes.hide = function (id, callback) {
        countlyCrashes.common(id, "hide", callback);
    };
    
    countlyCrashes.show = function (id, callback) {
        countlyCrashes.common(id, "show", callback);
    };
    
    countlyCrashes.del = function (id, callback) {
        countlyCrashes.common(id, "delete", callback);
    };
    
    countlyCrashes.modifyShare = function (id, data, callback) {
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/crashes/modify_share',
            data:{
                args:JSON.stringify({
                    crash_id:id,
                    data: data
                }),
                app_id: countlyCommon.ACTIVE_APP_ID,
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"jsonp",
			success:function (json) {
                if(callback)
                    callback(true);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
    
    countlyCrashes.addComment = function (id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/crashes/add_comment',
            data:{
                args:JSON.stringify(data),
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(true);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
    
    countlyCrashes.editComment = function (id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/crashes/edit_comment',
            data:{
                args:JSON.stringify(data),
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(true);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
    
    countlyCrashes.deleteComment = function (id, data, callback) {
        data = data || {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.crash_id = id;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/crashes/delete_comment',
            data:{
                args:JSON.stringify(data),
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(true);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };

    countlyCrashes.refresh = function (id) {		
        _period = countlyCommon.getPeriodForAjax();
		if(id){
			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
					"method":"crashes",
                    "period":_period,
					"group":id
				},
				dataType:"jsonp",
				success:function (json) {
					_groupData = json;
                    _list[_groupData._id] = _groupData.name;
					_groupData.dp = {};
					for(var i in _metrics){
                        if(_groupData[i]){
                            _usable_metrics[i] = _metrics[i];
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData[i], i, _metrics[i]);
                        }
					}
                    if(_groupData.custom){
                        for(var i in _groupData.custom){
                            _groupData.dp[i] = countlyCrashes.processMetric(_groupData.custom[i], i, i);
                            _usable_metrics[i] = i.charAt(0).toUpperCase() + i.slice(1);
                        }
                    }
				}
			});
		}
		else
			return $.ajax({
				type:"GET",
				url:countlyCommon.API_PARTS.data.r,
				data:{
					"api_key":countlyGlobal.member.api_key,
					"app_id":countlyCommon.ACTIVE_APP_ID,
                    "period":_period,
					"method":"crashes",
                    "graph":1
				},
				dataType:"jsonp",
				success:function (json) {
					_crashData = json;
					if(_crashData.crashes.latest_version == "")
						_crashData.crashes.latest_version = "None";
					if(_crashData.crashes.error == "")
						_crashData.crashes.error = "None";
					if(_crashData.crashes.os == "")
						_crashData.crashes.os = "None";
					if(_crashData.crashes.highest_app == "")
						_crashData.crashes.highest_app = "None";
                    
                    countlyCommon.extendDbObj(_crashTimeline, json.data);
				}
			});
    };

    countlyCrashes.reset = function () {
		_crashData = {};
		_groupData = {};
		_reportData = {};
        _crashTimeline = {};
        _metrics = {};
        _usable_metrics = {};
    };
	
	countlyCrashes.processMetric = function (data, metric, label) {
        
		var ret = {dp:[{data:[[-1,null]], "label":label}],ticks:[[-1,""]]};
		if(data){
			var i = 0;
			for(var key in data){
				ret.dp[0].data.push([i,data[key]]);
                var l = key.replace(/:/g, '.');
                if(metric == "device" && countlyDeviceList && countlyDeviceList[l])
                    l = countlyDeviceList[l];
				ret.ticks.push([i,l]);
				i++;
			}
			ret.dp[0].data.push([i,null]);
		}
		return ret;
    };
    
    countlyCrashes.getChartData = function(metric, name){
		var chartData = [
                { data:[], label:name, color:'#DDDDDD', mode:"ghost" },
                { data:[], label:name, color:'#333933' }
            ],
            dataProps = [
                {
                    name:"p"+metric,
                    func:function (dataObj) {
                        return dataObj[metric]
                    },
                    period:"previous"
                },
                { name:metric }
            ];

        return countlyCommon.extractChartData(_crashTimeline, countlyCrashes.clearObject, chartData, dataProps);
	};
	
	countlyCrashes.getMetrics = function () {
		return _usable_metrics;
    };
	
	countlyCrashes.getData = function () {
		return _crashData;
    };
	
	countlyCrashes.getGroupData = function () {
		return _groupData;
    };
    
    countlyCrashes.setGroupData = function (data) {
        _metrics = {
            "os_name":jQuery.i18n.map["crashes.os"], 
            "browser":jQuery.i18n.map["crashes.browser"], 
            "view":jQuery.i18n.map["crashes.view"], 
            "os_version":jQuery.i18n.map["crashes.os_version"], 
			"app_version":jQuery.i18n.map["crashes.app_version"], 
			"manufacture":jQuery.i18n.map["crashes.manufacture"], 
			"device":jQuery.i18n.map["crashes.device"], 
			"resolution":jQuery.i18n.map["crashes.resolution"], 
			"orientation":jQuery.i18n.map["crashes.orientation"],
			"cpu":jQuery.i18n.map["crashes.cpu"],
			"opengl":jQuery.i18n.map["crashes.opengl"]};
		_groupData = data;
        _groupData.dp = {};
		for(var i in _metrics){
            if(_groupData[i]){
                _usable_metrics[i] = _metrics[i];
                _groupData.dp[i] = countlyCrashes.processMetric(_groupData[i], i, _metrics[i]);
            }
		}
        if(_groupData.custom){
            for(var i in _groupData.custom){
                _groupData.dp[i] = countlyCrashes.processMetric(_groupData.custom[i], i, i);
                _usable_metrics[i] = i.charAt(0).toUpperCase() + i.slice(1);
            }
        }
    };
	
	countlyCrashes.getReportData = function () {
		return _reportData;
    };
	
	countlyCrashes.getErrorName = function () {
		var error = _crashData.crashes.error.split(":")[0];
		return error;
	};
	
	countlyCrashes.getAffectedUsers = function () {
		if(_crashData.users.total > 0){
            var ret = [];
			var affected = (_crashData.users.affected/_crashData.users.total)*100;
			var fatal = (_crashData.users.fatal/_crashData.users.total)*100;
			var nonfatal = ((_crashData.users.affected-_crashData.users.fatal)/_crashData.users.total)*100;
			var name1 = Math.round(fatal)+"% "+jQuery.i18n.map["crashes.fatal"];
            if(fatal > 0)
                ret.push({"name":name1,"percent":fatal});
			var name2 = Math.round(nonfatal)+"% "+jQuery.i18n.map["crashes.nonfatal"];
            if(nonfatal > 0)
                ret.push({"name":name2,"percent":nonfatal});
			var name3 = Math.round(100-affected)+"% "+jQuery.i18n.map["crashes.notaffected"];
            if(100-affected > 0)
                ret.push({"name":name3,"percent":100-affected});
			return ret;
		}
		return [];
	};
	
	countlyCrashes.getFatalBars = function () {
		if(_crashData.crashes.total > 0){
            var ret = [];
            var total = _crashData.crashes.fatal + _crashData.crashes.nonfatal;
			var fatal = (_crashData.crashes.fatal/total)*100;
			var nonfatal = (_crashData.crashes.nonfatal/total)*100;
			var name1 = Math.round(fatal)+"% "+jQuery.i18n.map["crashes.fatal"];
            if(fatal > 0)
                ret.push({"name":name1,"percent":fatal});
			var name2 = Math.round(nonfatal)+"% "+jQuery.i18n.map["crashes.nonfatal"];
            if(nonfatal > 0)
                ret.push({"name":name2,"percent":nonfatal});
			return ret;
		}
		return [];
    };
	
	countlyCrashes.getResolvedBars = function () {
		if(_crashData.crashes.unique > 0){
            var ret = [];
            var total = Math.max(_crashData.crashes.resolved, 0) + Math.max(_crashData.crashes.unresolved,0);
			var resolved = (_crashData.crashes.resolved/total)*100;
			var unresolved = (_crashData.crashes.unresolved/total)*100;
			var name1 = Math.round(resolved)+"% "+jQuery.i18n.map["crashes.resolved"];
            if(resolved > 0)
                ret.push({"name":name1,"percent":resolved});
			var name2 = Math.round(unresolved)+"% "+jQuery.i18n.map["crashes.unresolved"];
            if(unresolved > 0)
                ret.push({"name":name2,"percent":unresolved});
			return ret;
		}
		return [];
    };
	
	countlyCrashes.getPlatformBars = function () {
		var res = [];
        var data = [];
		var total = 0;
        
		for(var i in _crashData.crashes.os){
            if(_crashData.crashes.os[i] > 0)
                data.push([i, _crashData.crashes.os[i]]);
		}
        
        data.sort(function(a, b) {return b[1] - a[1]});
        
        var maxItems = 3;
        if(data.length < maxItems)
            maxItems = data.length;
        
		for(var i = 0; i < maxItems; i++){
            total += data[i][1];
        }
        
		for(var i = 0; i < maxItems; i++){
            res.push({"name":data[i][0],"percent":(data[i][1]/total)*100});
		}
        
		return res;
    };
    
    countlyCrashes.getBoolBars = function (name) {
		if(_groupData[name]){
            _groupData[name].yes = _groupData[name].yes || 0;
            _groupData[name].no = _groupData[name].no || 0;
            var total = _groupData[name].yes + _groupData[name].no;
			var yes = (_groupData[name].yes/total)*100;
			var no = (_groupData[name].no/total)*100;
            var ret = [];
            if(yes > 0){
                ret.push({"name":yes.toFixed(2)+"%","percent":yes});
                ret.push({"name":no.toFixed(2)+"%","percent":no});
            }
            else{
                ret.push({"name":yes.toFixed(2)+"%","percent":no, "background":"#86CBDD"});
            }
			return ret;
		}
		return [];
    };
    
    countlyCrashes.getDashboardData = function () {

        //Update the current period object in case selected date is changed
        _periodObj = countlyCommon.periodObj;

        var dataArr = {},
            tmp_x,
            tmp_y,
            currentTotal = 0,
            previousTotal = 0,
            currentUnique = 0,
            previousUnique = 0,
            currentNonfatal = 0,
            previousNonfatal = 0,
            currentFatal = 0,
            previousFatal = 0,
            currentResolved = 0,
            previousResolved = 0;

        if (_periodObj.isSpecialPeriod) {
            
             for (var i = 0; i < (_periodObj.uniquePeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.uniquePeriodArr[i]);
                tmp_x = countlyCrashes.clearObject(tmp_x);
                currentUnique += tmp_x["cru"];
            }

            var tmpUniqObj,
                tmpCurrentUniq = 0;

            for (var i = 0; i < (_periodObj.uniquePeriodCheckArr.length); i++) {
                tmpUniqObj = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.uniquePeriodCheckArr[i]);
                tmpUniqObj = countlyCrashes.clearObject(tmpUniqObj);
                tmpCurrentUniq += tmpUniqObj["cru"];
            }

            if (currentUnique > tmpCurrentUniq) {
                currentUnique = tmpCurrentUniq;
            }

            for (var i = 0; i < (_periodObj.previousUniquePeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousUniquePeriodArr[i]);
                tmp_y = countlyCrashes.clearObject(tmp_y);
                previousUnique += tmp_y["cru"];
            }

            var tmpUniqObj2,
                tmpPreviousUniq = 0;

            for (var i = 0; i < (_periodObj.previousUniquePeriodCheckArr.length); i++) {
                tmpUniqObj2 = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousUniquePeriodCheckArr[i]);
                tmpUniqObj2 = countlyCrashes.clearObject(tmpUniqObj2);
                tmpPreviousUniq += tmpUniqObj2["cru"];
            }

            if (previousUnique > tmpPreviousUniq) {
                previousUnique = tmpPreviousUniq;
            }

            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.currentPeriodArr[i]);
                tmp_x = countlyCrashes.clearObject(tmp_x);
                currentTotal += tmp_x["cr"];
                currentNonfatal += tmp_x["crnf"];
                currentFatal += tmp_x["crf"];
                currentResolved += tmp_x["crru"];
            }

            for (var i = 0; i < (_periodObj.previousPeriodArr.length); i++) {
                tmp_y = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousPeriodArr[i]);
                tmp_y = countlyCrashes.clearObject(tmp_y);
                previousTotal += tmp_y["cr"];
                previousNonfatal += tmp_y["crnf"];
                previousFatal += tmp_y["crf"];
                previousResolved += tmp_y["crru"];
            }
        } else {
            tmp_x = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_crashTimeline, _periodObj.previousPeriod);
            tmp_x = countlyCrashes.clearObject(tmp_x);
            tmp_y = countlyCrashes.clearObject(tmp_y);

            currentTotal = tmp_x["cr"];
            previousTotal = tmp_y["cr"];
            currentNonfatal = tmp_x["crnf"];
            previousNonfatal = tmp_y["crnf"];
            currentUnique = tmp_x["cru"];
            previousUnique = tmp_y["cru"];
            currentFatal = tmp_x["crf"];
            previousFatal = tmp_y["crf"];
            currentResolved = tmp_x["crru"];
            previousResolved = tmp_y["crru"];
        }

        var changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
            changeNonfatal = countlyCommon.getPercentChange(previousNonfatal, currentNonfatal),
            changeUnique = countlyCommon.getPercentChange(previousUnique, currentUnique),
            changeFatal = countlyCommon.getPercentChange(previousFatal, currentFatal);
            changeResolved = countlyCommon.getPercentChange(previousResolved, currentResolved);

        dataArr =
        {
            usage:{
                "total":{
                    "total":currentTotal,
                    "change":changeTotal.percent,
                    "trend":changeTotal.trend,
                    "isEstimate":false
                },
                "unique":{
                    "total":currentUnique,
                    "prev-total":previousUnique,
                    "change":changeUnique.percent,
                    "trend":changeUnique.trend,
                    "isEstimate":false
                },
                "nonfatal":{
                    "total":currentNonfatal,
                    "prev-total":previousNonfatal,
                    "change":changeNonfatal.percent,
                    "trend":changeNonfatal.trend,
                    "isEstimate":false
                },
                "fatal":{
                    "total":currentFatal,
                    "change":changeFatal.percent,
                    "trend":changeFatal.trend,
                    "isEstimate":false
                },
                "resolved":{
                    "total":currentResolved,
                    "change":changeResolved.percent,
                    "trend":changeResolved.trend,
                    "isEstimate":false
                }
            }
        };

        return dataArr;
    };
    
    countlyCrashes.clearObject = function (obj) {
        if (obj) {
            if (!obj["cr"]) obj["cr"] = 0;
            if (!obj["cru"]) obj["cru"] = 0;
            if (!obj["crnf"]) obj["crnf"] = 0;
            if (!obj["crf"]) obj["crf"] = 0;
            if (!obj["crru"]) obj["crru"] = 0;
        }
        else {
            obj = {"cr":0, "cru":0, "crnf":0, "crf":0, "crru":0};
        }

        return obj;
    };
	
	function setMeta() {
        if (_crashTimeline['meta']) {
			for(var i in _crashTimeline['meta']){
				_metas[i] = (_crashTimeline['meta'][i]) ? _crashTimeline['meta'][i] : [];
			}
        }
    }

    function extendMeta() {
        if (_crashTimeline['meta']) {
			for(var i in _crashTimeline['meta']){
				_metas[i] = countlyCommon.union(_metas[i] , _crashTimeline['meta'][i]);
			}
        }
    }
	
}(window.countlyCrashes = window.countlyCrashes || {}, jQuery));;/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */
(function(){var block={newline:/^\n+/,code:/^( {4}[^\n]+\n*)+/,fences:noop,hr:/^( *[-*_]){3,} *(?:\n+|$)/,heading:/^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,nptable:noop,lheading:/^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,blockquote:/^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,list:/^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,html:/^ *(?:comment|closed|closing) *(?:\n{2,}|\s*$)/,def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,table:noop,paragraph:/^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,text:/^[^\n]+/};block.bullet=/(?:[*+-]|\d+\.)/;block.item=/^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;block.item=replace(block.item,"gm")(/bull/g,block.bullet)();block.list=replace(block.list)(/bull/g,block.bullet)("hr","\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))")("def","\\n+(?="+block.def.source+")")();block.blockquote=replace(block.blockquote)("def",block.def)();block._tag="(?!(?:"+"a|em|strong|small|s|cite|q|dfn|abbr|data|time|code"+"|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo"+"|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b";block.html=replace(block.html)("comment",/<!--[\s\S]*?-->/)("closed",/<(tag)[\s\S]+?<\/\1>/)("closing",/<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)(/tag/g,block._tag)();block.paragraph=replace(block.paragraph)("hr",block.hr)("heading",block.heading)("lheading",block.lheading)("blockquote",block.blockquote)("tag","<"+block._tag)("def",block.def)();block.normal=merge({},block);block.gfm=merge({},block.normal,{fences:/^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,paragraph:/^/});block.gfm.paragraph=replace(block.paragraph)("(?!","(?!"+block.gfm.fences.source.replace("\\1","\\2")+"|"+block.list.source.replace("\\1","\\3")+"|")();block.tables=merge({},block.gfm,{nptable:/^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,table:/^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/});function Lexer(options){this.tokens=[];this.tokens.links={};this.options=options||marked.defaults;this.rules=block.normal;if(this.options.gfm){if(this.options.tables){this.rules=block.tables}else{this.rules=block.gfm}}}Lexer.rules=block;Lexer.lex=function(src,options){var lexer=new Lexer(options);return lexer.lex(src)};Lexer.prototype.lex=function(src){src=src.replace(/\r\n|\r/g,"\n").replace(/\t/g,"    ").replace(/\u00a0/g," ").replace(/\u2424/g,"\n");return this.token(src,true)};Lexer.prototype.token=function(src,top,bq){var src=src.replace(/^ +$/gm,""),next,loose,cap,bull,b,item,space,i,l;while(src){if(cap=this.rules.newline.exec(src)){src=src.substring(cap[0].length);if(cap[0].length>1){this.tokens.push({type:"space"})}}if(cap=this.rules.code.exec(src)){src=src.substring(cap[0].length);cap=cap[0].replace(/^ {4}/gm,"");this.tokens.push({type:"code",text:!this.options.pedantic?cap.replace(/\n+$/,""):cap});continue}if(cap=this.rules.fences.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"code",lang:cap[2],text:cap[3]});continue}if(cap=this.rules.heading.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"heading",depth:cap[1].length,text:cap[2]});continue}if(top&&(cap=this.rules.nptable.exec(src))){src=src.substring(cap[0].length);item={type:"table",header:cap[1].replace(/^ *| *\| *$/g,"").split(/ *\| */),align:cap[2].replace(/^ *|\| *$/g,"").split(/ *\| */),cells:cap[3].replace(/\n$/,"").split("\n")};for(i=0;i<item.align.length;i++){if(/^ *-+: *$/.test(item.align[i])){item.align[i]="right"}else if(/^ *:-+: *$/.test(item.align[i])){item.align[i]="center"}else if(/^ *:-+ *$/.test(item.align[i])){item.align[i]="left"}else{item.align[i]=null}}for(i=0;i<item.cells.length;i++){item.cells[i]=item.cells[i].split(/ *\| */)}this.tokens.push(item);continue}if(cap=this.rules.lheading.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"heading",depth:cap[2]==="="?1:2,text:cap[1]});continue}if(cap=this.rules.hr.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"hr"});continue}if(cap=this.rules.blockquote.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"blockquote_start"});cap=cap[0].replace(/^ *> ?/gm,"");this.token(cap,top,true);this.tokens.push({type:"blockquote_end"});continue}if(cap=this.rules.list.exec(src)){src=src.substring(cap[0].length);bull=cap[2];this.tokens.push({type:"list_start",ordered:bull.length>1});cap=cap[0].match(this.rules.item);next=false;l=cap.length;i=0;for(;i<l;i++){item=cap[i];space=item.length;item=item.replace(/^ *([*+-]|\d+\.) +/,"");if(~item.indexOf("\n ")){space-=item.length;item=!this.options.pedantic?item.replace(new RegExp("^ {1,"+space+"}","gm"),""):item.replace(/^ {1,4}/gm,"")}if(this.options.smartLists&&i!==l-1){b=block.bullet.exec(cap[i+1])[0];if(bull!==b&&!(bull.length>1&&b.length>1)){src=cap.slice(i+1).join("\n")+src;i=l-1}}loose=next||/\n\n(?!\s*$)/.test(item);if(i!==l-1){next=item.charAt(item.length-1)==="\n";if(!loose)loose=next}this.tokens.push({type:loose?"loose_item_start":"list_item_start"});this.token(item,false,bq);this.tokens.push({type:"list_item_end"})}this.tokens.push({type:"list_end"});continue}if(cap=this.rules.html.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:this.options.sanitize?"paragraph":"html",pre:cap[1]==="pre"||cap[1]==="script"||cap[1]==="style",text:cap[0]});continue}if(!bq&&top&&(cap=this.rules.def.exec(src))){src=src.substring(cap[0].length);this.tokens.links[cap[1].toLowerCase()]={href:cap[2],title:cap[3]};continue}if(top&&(cap=this.rules.table.exec(src))){src=src.substring(cap[0].length);item={type:"table",header:cap[1].replace(/^ *| *\| *$/g,"").split(/ *\| */),align:cap[2].replace(/^ *|\| *$/g,"").split(/ *\| */),cells:cap[3].replace(/(?: *\| *)?\n$/,"").split("\n")};for(i=0;i<item.align.length;i++){if(/^ *-+: *$/.test(item.align[i])){item.align[i]="right"}else if(/^ *:-+: *$/.test(item.align[i])){item.align[i]="center"}else if(/^ *:-+ *$/.test(item.align[i])){item.align[i]="left"}else{item.align[i]=null}}for(i=0;i<item.cells.length;i++){item.cells[i]=item.cells[i].replace(/^ *\| *| *\| *$/g,"").split(/ *\| */)}this.tokens.push(item);continue}if(top&&(cap=this.rules.paragraph.exec(src))){src=src.substring(cap[0].length);this.tokens.push({type:"paragraph",text:cap[1].charAt(cap[1].length-1)==="\n"?cap[1].slice(0,-1):cap[1]});continue}if(cap=this.rules.text.exec(src)){src=src.substring(cap[0].length);this.tokens.push({type:"text",text:cap[0]});continue}if(src){throw new Error("Infinite loop on byte: "+src.charCodeAt(0))}}return this.tokens};var inline={escape:/^\\([\\`*{}\[\]()#+\-.!_>])/,autolink:/^<([^ >]+(@|:\/)[^ >]+)>/,url:noop,tag:/^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,link:/^!?\[(inside)\]\(href\)/,reflink:/^!?\[(inside)\]\s*\[([^\]]*)\]/,nolink:/^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,strong:/^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,em:/^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,code:/^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,br:/^ {2,}\n(?!\s*$)/,del:noop,text:/^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/};inline._inside=/(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;inline._href=/\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;inline.link=replace(inline.link)("inside",inline._inside)("href",inline._href)();inline.reflink=replace(inline.reflink)("inside",inline._inside)();inline.normal=merge({},inline);inline.pedantic=merge({},inline.normal,{strong:/^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,em:/^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/});inline.gfm=merge({},inline.normal,{escape:replace(inline.escape)("])","~|])")(),url:/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,del:/^~~(?=\S)([\s\S]*?\S)~~/,text:replace(inline.text)("]|","~]|")("|","|https?://|")()});inline.breaks=merge({},inline.gfm,{br:replace(inline.br)("{2,}","*")(),text:replace(inline.gfm.text)("{2,}","*")()});function InlineLexer(links,options){this.options=options||marked.defaults;this.links=links;this.rules=inline.normal;this.renderer=this.options.renderer||new Renderer;this.renderer.options=this.options;if(!this.links){throw new Error("Tokens array requires a `links` property.")}if(this.options.gfm){if(this.options.breaks){this.rules=inline.breaks}else{this.rules=inline.gfm}}else if(this.options.pedantic){this.rules=inline.pedantic}}InlineLexer.rules=inline;InlineLexer.output=function(src,links,options){var inline=new InlineLexer(links,options);return inline.output(src)};InlineLexer.prototype.output=function(src){var out="",link,text,href,cap;while(src){if(cap=this.rules.escape.exec(src)){src=src.substring(cap[0].length);out+=cap[1];continue}if(cap=this.rules.autolink.exec(src)){src=src.substring(cap[0].length);if(cap[2]==="@"){text=cap[1].charAt(6)===":"?this.mangle(cap[1].substring(7)):this.mangle(cap[1]);href=this.mangle("mailto:")+text}else{text=escape(cap[1]);href=text}out+=this.renderer.link(href,null,text);continue}if(!this.inLink&&(cap=this.rules.url.exec(src))){src=src.substring(cap[0].length);text=escape(cap[1]);href=text;out+=this.renderer.link(href,null,text);continue}if(cap=this.rules.tag.exec(src)){if(!this.inLink&&/^<a /i.test(cap[0])){this.inLink=true}else if(this.inLink&&/^<\/a>/i.test(cap[0])){this.inLink=false}src=src.substring(cap[0].length);out+=this.options.sanitize?escape(cap[0]):cap[0];continue}if(cap=this.rules.link.exec(src)){src=src.substring(cap[0].length);this.inLink=true;out+=this.outputLink(cap,{href:cap[2],title:cap[3]});this.inLink=false;continue}if((cap=this.rules.reflink.exec(src))||(cap=this.rules.nolink.exec(src))){src=src.substring(cap[0].length);link=(cap[2]||cap[1]).replace(/\s+/g," ");link=this.links[link.toLowerCase()];if(!link||!link.href){out+=cap[0].charAt(0);src=cap[0].substring(1)+src;continue}this.inLink=true;out+=this.outputLink(cap,link);this.inLink=false;continue}if(cap=this.rules.strong.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.strong(this.output(cap[2]||cap[1]));continue}if(cap=this.rules.em.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.em(this.output(cap[2]||cap[1]));continue}if(cap=this.rules.code.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.codespan(escape(cap[2],true));continue}if(cap=this.rules.br.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.br();continue}if(cap=this.rules.del.exec(src)){src=src.substring(cap[0].length);out+=this.renderer.del(this.output(cap[1]));continue}if(cap=this.rules.text.exec(src)){src=src.substring(cap[0].length);out+=escape(this.smartypants(cap[0]));continue}if(src){throw new Error("Infinite loop on byte: "+src.charCodeAt(0))}}return out};InlineLexer.prototype.outputLink=function(cap,link){var href=escape(link.href),title=link.title?escape(link.title):null;return cap[0].charAt(0)!=="!"?this.renderer.link(href,title,this.output(cap[1])):this.renderer.image(href,title,escape(cap[1]))};InlineLexer.prototype.smartypants=function(text){if(!this.options.smartypants)return text;return text.replace(/--/g,"—").replace(/(^|[-\u2014/(\[{"\s])'/g,"$1‘").replace(/'/g,"’").replace(/(^|[-\u2014/(\[{\u2018\s])"/g,"$1“").replace(/"/g,"”").replace(/\.{3}/g,"…")};InlineLexer.prototype.mangle=function(text){var out="",l=text.length,i=0,ch;for(;i<l;i++){ch=text.charCodeAt(i);if(Math.random()>.5){ch="x"+ch.toString(16)}out+="&#"+ch+";"}return out};function Renderer(options){this.options=options||{}}Renderer.prototype.code=function(code,lang,escaped){if(this.options.highlight){var out=this.options.highlight(code,lang);if(out!=null&&out!==code){escaped=true;code=out}}if(!lang){return"<pre><code>"+(escaped?code:escape(code,true))+"\n</code></pre>"}return'<pre><code class="'+this.options.langPrefix+escape(lang,true)+'">'+(escaped?code:escape(code,true))+"\n</code></pre>\n"};Renderer.prototype.blockquote=function(quote){return"<blockquote>\n"+quote+"</blockquote>\n"};Renderer.prototype.html=function(html){return html};Renderer.prototype.heading=function(text,level,raw){return"<h"+level+' id="'+this.options.headerPrefix+raw.toLowerCase().replace(/[^\w]+/g,"-")+'">'+text+"</h"+level+">\n"};Renderer.prototype.hr=function(){return this.options.xhtml?"<hr/>\n":"<hr>\n"};Renderer.prototype.list=function(body,ordered){var type=ordered?"ol":"ul";return"<"+type+">\n"+body+"</"+type+">\n"};Renderer.prototype.listitem=function(text){return"<li>"+text+"</li>\n"};Renderer.prototype.paragraph=function(text){return"<p>"+text+"</p>\n"};Renderer.prototype.table=function(header,body){return"<table>\n"+"<thead>\n"+header+"</thead>\n"+"<tbody>\n"+body+"</tbody>\n"+"</table>\n"};Renderer.prototype.tablerow=function(content){return"<tr>\n"+content+"</tr>\n"};Renderer.prototype.tablecell=function(content,flags){var type=flags.header?"th":"td";var tag=flags.align?"<"+type+' style="text-align:'+flags.align+'">':"<"+type+">";return tag+content+"</"+type+">\n"};Renderer.prototype.strong=function(text){return"<strong>"+text+"</strong>"};Renderer.prototype.em=function(text){return"<em>"+text+"</em>"};Renderer.prototype.codespan=function(text){return"<code>"+text+"</code>"};Renderer.prototype.br=function(){return this.options.xhtml?"<br/>":"<br>"};Renderer.prototype.del=function(text){return"<del>"+text+"</del>"};Renderer.prototype.link=function(href,title,text){if(this.options.sanitize){try{var prot=decodeURIComponent(unescape(href)).replace(/[^\w:]/g,"").toLowerCase()}catch(e){return""}if(prot.indexOf("javascript:")===0){return""}}var out='<a href="'+href+'"';if(title){out+=' title="'+title+'"'}out+=">"+text+"</a>";return out};Renderer.prototype.image=function(href,title,text){var out='<img src="'+href+'" alt="'+text+'"';if(title){out+=' title="'+title+'"'}out+=this.options.xhtml?"/>":">";return out};function Parser(options){this.tokens=[];this.token=null;this.options=options||marked.defaults;this.options.renderer=this.options.renderer||new Renderer;this.renderer=this.options.renderer;this.renderer.options=this.options}Parser.parse=function(src,options,renderer){var parser=new Parser(options,renderer);return parser.parse(src)};Parser.prototype.parse=function(src){this.inline=new InlineLexer(src.links,this.options,this.renderer);this.tokens=src.reverse();var out="";while(this.next()){out+=this.tok()}return out};Parser.prototype.next=function(){return this.token=this.tokens.pop()};Parser.prototype.peek=function(){return this.tokens[this.tokens.length-1]||0};Parser.prototype.parseText=function(){var body=this.token.text;while(this.peek().type==="text"){body+="\n"+this.next().text}return this.inline.output(body)};Parser.prototype.tok=function(){switch(this.token.type){case"space":{return""}case"hr":{return this.renderer.hr()}case"heading":{return this.renderer.heading(this.inline.output(this.token.text),this.token.depth,this.token.text)}case"code":{return this.renderer.code(this.token.text,this.token.lang,this.token.escaped)}case"table":{var header="",body="",i,row,cell,flags,j;cell="";for(i=0;i<this.token.header.length;i++){flags={header:true,align:this.token.align[i]};cell+=this.renderer.tablecell(this.inline.output(this.token.header[i]),{header:true,align:this.token.align[i]})}header+=this.renderer.tablerow(cell);for(i=0;i<this.token.cells.length;i++){row=this.token.cells[i];cell="";for(j=0;j<row.length;j++){cell+=this.renderer.tablecell(this.inline.output(row[j]),{header:false,align:this.token.align[j]})}body+=this.renderer.tablerow(cell)}return this.renderer.table(header,body)}case"blockquote_start":{var body="";while(this.next().type!=="blockquote_end"){body+=this.tok()}return this.renderer.blockquote(body)}case"list_start":{var body="",ordered=this.token.ordered;while(this.next().type!=="list_end"){body+=this.tok()}return this.renderer.list(body,ordered)}case"list_item_start":{var body="";while(this.next().type!=="list_item_end"){body+=this.token.type==="text"?this.parseText():this.tok()}return this.renderer.listitem(body)}case"loose_item_start":{var body="";while(this.next().type!=="list_item_end"){body+=this.tok()}return this.renderer.listitem(body)}case"html":{var html=!this.token.pre&&!this.options.pedantic?this.inline.output(this.token.text):this.token.text;return this.renderer.html(html)}case"paragraph":{return this.renderer.paragraph(this.inline.output(this.token.text))}case"text":{return this.renderer.paragraph(this.parseText())}}};function escape(html,encode){return html.replace(!encode?/&(?!#?\w+;)/g:/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function unescape(html){return html.replace(/&([#\w]+);/g,function(_,n){n=n.toLowerCase();if(n==="colon")return":";if(n.charAt(0)==="#"){return n.charAt(1)==="x"?String.fromCharCode(parseInt(n.substring(2),16)):String.fromCharCode(+n.substring(1))}return""})}function replace(regex,opt){regex=regex.source;opt=opt||"";return function self(name,val){if(!name)return new RegExp(regex,opt);val=val.source||val;val=val.replace(/(^|[^\[])\^/g,"$1");regex=regex.replace(name,val);return self}}function noop(){}noop.exec=noop;function merge(obj){var i=1,target,key;for(;i<arguments.length;i++){target=arguments[i];for(key in target){if(Object.prototype.hasOwnProperty.call(target,key)){obj[key]=target[key]}}}return obj}function marked(src,opt,callback){if(callback||typeof opt==="function"){if(!callback){callback=opt;opt=null}opt=merge({},marked.defaults,opt||{});var highlight=opt.highlight,tokens,pending,i=0;try{tokens=Lexer.lex(src,opt)}catch(e){return callback(e)}pending=tokens.length;var done=function(err){if(err){opt.highlight=highlight;return callback(err)}var out;try{out=Parser.parse(tokens,opt)}catch(e){err=e}opt.highlight=highlight;return err?callback(err):callback(null,out)};if(!highlight||highlight.length<3){return done()}delete opt.highlight;if(!pending)return done();for(;i<tokens.length;i++){(function(token){if(token.type!=="code"){return--pending||done()}return highlight(token.text,token.lang,function(err,code){if(err)return done(err);if(code==null||code===token.text){return--pending||done()}token.text=code;token.escaped=true;--pending||done()})})(tokens[i])}return}try{if(opt)opt=merge({},marked.defaults,opt);return Parser.parse(Lexer.lex(src,opt),opt)}catch(e){e.message+="\nPlease report this to https://github.com/chjj/marked.";if((opt||marked.defaults).silent){return"<p>An error occured:</p><pre>"+escape(e.message+"",true)+"</pre>"}throw e}}marked.options=marked.setOptions=function(opt){merge(marked.defaults,opt);return marked};marked.defaults={gfm:true,tables:true,breaks:false,pedantic:false,sanitize:false,smartLists:false,silent:false,highlight:null,langPrefix:"lang-",smartypants:false,headerPrefix:"",renderer:new Renderer,xhtml:false};marked.Parser=Parser;marked.parser=Parser.parse;marked.Renderer=Renderer;marked.Lexer=Lexer;marked.lexer=Lexer.lex;marked.InlineLexer=InlineLexer;marked.inlineLexer=InlineLexer.output;marked.parse=marked;if(typeof module!=="undefined"&&typeof exports==="object"){module.exports=marked}else if(typeof define==="function"&&define.amd){define(function(){return marked})}else{this.marked=marked}}).call(function(){return this||(typeof window!=="undefined"?window:global)}());;window.CrashesView = countlyView.extend({
	initialize:function () {
        this.loaded = true;
		this.filter = (store.get("countly_crashfilter")) ? store.get("countly_crashfilter") : "crash-all";
        this.curMetric = "cr";
        this.metrics = {
			cr:jQuery.i18n.map["crashes.total"],
			cru:jQuery.i18n.map["crashes.unique"],
			crnf:jQuery.i18n.map["crashes.nonfatal"]+" "+jQuery.i18n.map["crashes.title"],
			crf:jQuery.i18n.map["crashes.fatal"]+" "+jQuery.i18n.map["crashes.title"],
			crru:jQuery.i18n.map["crashes.resolved-users"]
		};
    },
    beforeRender: function() {
		if(this.template)
			return $.when(countlyCrashes.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/crashes/templates/crashes.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyCrashes.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
        var crashData = countlyCrashes.getData();
        var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric]);
        var dashboard = countlyCrashes.getDashboardData();
        this.templateData = {
            "page-title":jQuery.i18n.map["crashes.title"],
            "usage":[
				{
					"title":jQuery.i18n.map["crashes.total"],
					"data":dashboard.usage['total'],
					"id":"crash-cr",
                    "help":"crashes.help-total"
				},
				{
					"title":jQuery.i18n.map["crashes.unique"],
					"data":dashboard.usage['unique'],
					"id":"crash-cru",
                    "help":"crashes.help-unique"
				},
				{
					"title":jQuery.i18n.map["crashes.nonfatal"]+" "+jQuery.i18n.map["crashes.title"],
					"data":dashboard.usage['nonfatal'],
					"id":"crash-crnf",
                    "help":"crashes.help-nonfatal"
				},
				{
					"title":jQuery.i18n.map["crashes.fatal"]+" "+jQuery.i18n.map["crashes.title"],
					"data":dashboard.usage['fatal'],
					"id":"crash-crf",
                    "help":"crashes.help-fatal"
				}/*,
				{
					"title":jQuery.i18n.map["crashes.resolved-users"],
					"data":dashboard.usage['resolved'],
					"id":"crash-crru",
                    "help":"crashes.help-resolved-users"
				}*/
			],
			"big-numbers":{
                "items":[
                    {
                        "title":jQuery.i18n.map["crashes.unresolved-crashes"],
                        "total":crashData.crashes.unresolved,
                        "help":"crashes.help-unresolved"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.highest-version"],
                        "total":crashData.crashes.highest_app,
                        "help":"crashes.help-latest-version"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.new-crashes"],
                        "total":crashData.crashes.news,
                        "help":"crashes.help-new"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.renew-crashes"],
                        "total":crashData.crashes.renewed,
                        "help":"crashes.help-reoccurred"
                    }
                ]
            },
			"bars":[
                {
                    "title":jQuery.i18n.map["crashes.resolution-status"],
                    "data": countlyCrashes.getResolvedBars(),
                    "help":"crashes.help-resolved"
                },
				{
                    "title":jQuery.i18n.map["crashes.affected-users"],
                    "data":countlyCrashes.getAffectedUsers(),
                    "help":"crashes.help-affected-levels"
                },
                {
                    "title":jQuery.i18n.map["crashes.platform"],
                    "data": countlyCrashes.getPlatformBars(),
                    "help":"crashes.help-platforms"
                },
				{
                    "title":jQuery.i18n.map["crashes.fatality"],
                    "data": countlyCrashes.getFatalBars(),
                    "help":"crashes.help-fatals"
                }
            ]
        };
        if(crashData.loss){
            this.templateData["loss"] = true;
            this.templateData["big-numbers"]["items"].push({
                "title":jQuery.i18n.map["crashes.loss"],
                "total":crashData.loss.toFixed(2),
                "help":"crashes.help-loss"
            });
        }
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
			$("#"+this.filter).addClass("selected").addClass("active");
			countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
			this.dtable = $('#crash-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "bServerSide": true,
                "sAjaxSource": countlyCommon.API_PARTS.data.r + "?api_key="+countlyGlobal.member.api_key+"&app_id="+countlyCommon.ACTIVE_APP_ID+"&method=crashes",
                "fnServerData": function ( sSource, aoData, fnCallback ) {
                    $.ajax({
                        "dataType": 'jsonp',
                        "type": "POST",
                        "url": sSource,
                        "data": aoData,
                        "success": function(data){
                                fnCallback(data);
                        }
                    });
                },
                "fnServerParams": function ( aoData ) {
                    if(self.filter){
                        aoData.push( { "name": "filter", "value": self.filter } );
                    }
                    if(self._query){
                        aoData.push({ "name": "query", "value": JSON.stringify(self._query) });
                    }
                },
				"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
					$(nRow).attr("id", aData._id);
					if(aData.is_resolved)
                        $(nRow).addClass("resolvedcrash");
					else if(aData.is_new)
						$(nRow).addClass("newcrash");
                    else if(aData.is_renewed)
                        $(nRow).addClass("renewedcrash");
				},
                "aoColumns": [
					{ "mData": function(row, type){if(type == "display"){if(row.nonfatal) return jQuery.i18n.map["crashes.nonfatal"]; else return jQuery.i18n.map["crashes.fatal"];}else return (row.nonfatal) ? true : false;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.fatal"], "sWidth":"80px"} ,
					{ "mData": function(row, type){if(type == "display"){if(row.session){return ((Math.round(row.session.total/row.session.count)*100)/100)+" "+jQuery.i18n.map["crashes.sessions"];} else {return jQuery.i18n.map["crashes.first-crash"];}}else{if(row.session)return row.session.total/row.session.count; else return 0;}}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.frequency"], "sWidth":"80px" },
					{ "mData": "reports", "sType":"numeric", "sTitle": jQuery.i18n.map["crashes.reports"], "sWidth":"80px" },
					{ "mData": function(row, type){row.users = row.users || 1; if(type == "display") return row.users+" ("+((row.users/crashData.users.total)*100).toFixed(2)+"%)"; else return row.users}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.users"], "sWidth":"60px" },
                    { "mData": function(row, type){return (row.not_os_specific) ? jQuery.i18n.map["crashes.varies"] : row.os;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.platform"], "sWidth":"70px" },
                    { "mData": function(row, type){return "<div class='truncated'>"+row.name+"</div>";}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.error"] },
                    { "mData": function(row, type){if(type == "display") return countlyCommon.formatTimeAgo(row.lastTs); else return row.lastTs;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.last_time"], "sWidth":"100px" },
                    { "mData": function(row, type){return row.latest_version.replace(/:/g, '.');}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.latest_app"], "sWidth":"100px" },
                    { "mData": function(row, type){if(type == "display"){ if(row.is_resolved) return "<span style='color:green;'>"+jQuery.i18n.map["crashes.resolved"]+" ("+row.latest_version.replace(/:/g, '.')+")</span>"; else return "<span style='color:red;'>"+jQuery.i18n.map["crashes.unresolved"]+"</span>";}else return row.is_resolved;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.resolved"], "sWidth":"70px" }
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [6,'desc'] ] );
            //dataTables_filter
            $('.dataTables_filter input').unbind();
            var timeout = null,
                that = this;
            $('.dataTables_filter input').bind('keyup', function(e) {
                self.showLoader = true;
                $this = this;
                if(timeout)
                {
                    clearTimeout(timeout);
                    timeout = null;
                }
                timeout = setTimeout(function(){
                    that.dtable.fnFilter($this.value);   
                }, 1000);
            });     
            
            var loader = $(this.el).find("#loader");
            loader.show();
            var loadTimeout = null;
            this.dtable.on("processing", function(e, oSettings, bShow){
                if(bShow && self.showLoader){
                    self.showLoader = false;
                    loader.show();
                }
                else
                    loader.hide();
            });
            
            setTimeout(function(){$(".dataTables_filter input").attr("placeholder",jQuery.i18n.map["crashes.search"]);},1000);
            
            $("#crash-"+this.curMetric).parents(".big-numbers").addClass("active");
            $(".widget-content .inner").click(function () {
				$(".big-numbers").removeClass("active");
				$(".big-numbers .select").removeClass("selected");
				$(this).parent(".big-numbers").addClass("active");
				$(this).find('.select').addClass("selected");
			});
			$(".big-numbers .inner").click(function () {
				var elID = $(this).find('.select').attr("id");
                if(elID){
                    if (self.curMetric == elID.replace("crash-", "")) {
                        return true;
                    }
        
                    self.curMetric = elID.replace("crash-", "");
                    self.switchMetric();
                }
			});
            $(".bar-inner").on({
                mouseenter:function () {
                    var number = $(this).parent().next();
    
                    number.text($(this).data("item"));
                    number.css({"color":$(this).css("background-color")});
                },
                mouseleave:function () {
                    var number = $(this).parent().next();
    
                    number.text(number.data("item"));
                    number.css({"color":$(this).parent().find(".bar-inner:first-child").css("background-color")});
                }
            });
			$('.crashes tbody').on("click", "tr", function (){
				var id = $(this).attr("id");
				if(id)
					window.location.hash = window.location.hash.toString()+"/"+id;
			});
        }
    },
    refresh:function () {
        var self = this;
        if(this.loaded){
            this.loaded = false;
            $.when(countlyCrashes.refresh()).then(function () {
                self.loaded = true;
                if (app.activeView != self) {
                    return false;
                }
                self.renderCommon(true);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(".crashoveral .dashboard").replaceWith(newPage.find(".dashboard"));
                $("#crash-big-numbers").replaceWith(newPage.find("#crash-big-numbers"));
                $(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
                
                $("#crash-"+self.curMetric).parents(".big-numbers").addClass("active");
                $(".widget-content .inner").click(function () {
                    $(".big-numbers").removeClass("active");
                    $(".big-numbers .select").removeClass("selected");
                    $(this).parent(".big-numbers").addClass("active");
                    $(this).find('.select').addClass("selected");
                });
                $(".big-numbers .inner").click(function () {
                    var elID = $(this).find('.select').attr("id");
        
                    if (self.curMetric == elID.replace("crash-", "")) {
                        return true;
                    }
        
                    self.curMetric = elID.replace("crash-", "");
                    self.switchMetric();
                });
                $(".bar-inner").on({
                    mouseenter:function () {
                        var number = $(this).parent().next();
        
                        number.text($(this).data("item"));
                        number.css({"color":$(this).css("background-color")});
                    },
                    mouseleave:function () {
                        var number = $(this).parent().next();
        
                        number.text(number.data("item"));
                        number.css({"color":$(this).parent().find(".bar-inner:first-child").css("background-color")});
                    }
                });
                self.dtable.fnDraw(false);
                var chartData = countlyCrashes.getChartData(self.curMetric, self.metrics[self.curMetric]);
                countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
                app.localize();
            });
        }
    },
	filterCrashes: function(filter){
		this.filter = filter;
		store.set("countly_crashfilter", filter);
		$("#"+this.filter).addClass("selected").addClass("active");
		this.dtable.fnDraw();
	},
    switchMetric:function(){
		var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric]);
		countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
	},
});

window.CrashgroupView = countlyView.extend({
	initialize:function () {
        this.loaded = true;
    },
    beforeRender: function() {
        countlyCrashes.reset();
		if(this.template)
			return $.when(countlyCrashes.initialize(this.id)).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/crashes/templates/crashgroup.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyCrashes.initialize(this.id)).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
		var url = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+countlyGlobal["path"]+"/crash/";
        var crashData = countlyCrashes.getGroupData();
        if(crashData.url)
               url += crashData.url;
		crashData.latest_version = crashData.latest_version.replace(/:/g, '.');
        
        this.comments = {};
        
        if(typeof marked != "undefined"){
            marked.setOptions({
                breaks: true
            });
        }
        
        if(crashData.comments){
            for(var i = 0; i < crashData.comments.length; i++){
                this.comments[crashData.comments[i]._id] = crashData.comments[i].text;
                if(typeof marked != "undefined")
                    crashData.comments[i].html = marked(crashData.comments[i].text);
                else
                    crashData.comments[i].html = crashData.comments[i].text;
            }
        }
		
		if (!isRefresh) {
			this.metrics = countlyCrashes.getMetrics();
            for(var i in this.metrics){
                this.curMetric = i;
                this.curTitle = this.metrics[i];
                break;
            }
		}
        var ranges = ["ram", "disk", "bat", "run"];
        for(var i = 0; i < ranges.length; i++){
            if(!crashData[ranges[i]]){
                crashData[ranges[i]] = {min:0, max:0, total:0, count:1};
            }
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["crashes.crashes-by"],
            "note-placeholder": jQuery.i18n.map["crashes.editnote"],
            "hasPermission": (countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][countlyCommon.ACTIVE_APP_ID]) ? true : false,
            "url":url,
			"data":crashData,
			"error":crashData.name.substr(0, 80),
            "fatal": (crashData.nonfatal) ? jQuery.i18n.map["crashes.nonfatal"] : jQuery.i18n.map["crashes.fatal"],
			"active-segmentation": this.curTitle,
			"segmentations": this.metrics,
			"big-numbers":{
                "class":"four-column",
                "items":[
					{
                        "title":jQuery.i18n.map["crashes.platform"],
                        "total":(crashData.not_os_specific) ? jQuery.i18n.map["crashes.varies"] : crashData.os,
                        "help":"crashes.help-platform"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.reports"],
                        "total":crashData.reports,
                        "help":"crashes.help-reports"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.affected-users"],
                        "total":crashData.users + " ("+((crashData.users/crashData.total)*100).toFixed(2)+"%)",
                        "help":"crashes.help-affected"
                    },
					{
                        "title":jQuery.i18n.map["crashes.highest-version"],
                        "total":crashData.latest_version.replace(/:/g, '.'),
                        "help":"crashes.help-app-version"
                    }
                ]
            }
        };
        if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type != "web"){
            this.templateData["ranges"]=[
                {
                    "title":jQuery.i18n.map["crashes.ram"],
                    "icon":"crash-icon ram-icon",
                    "help":"crashes.help-ram",
                    "min":crashData.ram.min+" %",
                    "max":crashData.ram.max+" %",
                    "avg":(crashData.ram.total/crashData.ram.count).toFixed(2)+" %"
                },
                {
                    "title":jQuery.i18n.map["crashes.disk"],
                    "icon":"crash-icon disk-icon",
                    "help":"crashes.help-disk",
                    "min":crashData.disk.min+" %",
                    "max":crashData.disk.max+" %",
                    "avg":(crashData.disk.total/crashData.disk.count).toFixed(2)+" %"
                },
                {
                    "title":jQuery.i18n.map["crashes.battery"],
                    "icon":"crash-icon battery-icon",
                    "help":"crashes.help-battery",
                    "min":crashData.bat.min+" %",
                    "max":crashData.bat.max+" %",
                    "avg":(crashData.bat.total/crashData.bat.count).toFixed(2)+" %"
                },
                {
                    "title":jQuery.i18n.map["crashes.run"],
                    "icon":"font-icon fa fa-youtube-play",
                    "help":"crashes.help-run",
                    "min":countlyCommon.timeString(crashData.run.min/60),
                    "max":countlyCommon.timeString(crashData.run.max/60),
                    "avg":countlyCommon.timeString((crashData.run.total/crashData.run.count)/60)
                }
            ];
            
            this.templateData["bars"]=[
                {
                    "title":jQuery.i18n.map["crashes.root"],
                    "data": countlyCrashes.getBoolBars("root"),
                    "help":"crashes.help-root"
                },
                {
                    "title":jQuery.i18n.map["crashes.online"],
                    "data":countlyCrashes.getBoolBars("online"),
                    "help":"crashes.help-online"
                },
                {
                    "title":jQuery.i18n.map["crashes.muted"],
                    "data": countlyCrashes.getBoolBars("muted"),
                    "help":"crashes.help-muted"
                },
                {
                    "title":jQuery.i18n.map["crashes.background"],
                    "data": countlyCrashes.getBoolBars("background"),
                    "help":"crashes.help-background"
                }
            ];
        }
        if(crashData.loss){
            this.templateData["loss"] = true;
            this.templateData["big-numbers"]["items"].push({
                "title":jQuery.i18n.map["crashes.loss"],
                "total":crashData.loss,
                "help":"crashes.help-loss"
            });
        }
        
        if(this.templateData["big-numbers"]["items"].length == 3)
            this.templateData["big-numbers"]["class"] = "three-column";
        else if(this.templateData["big-numbers"]["items"].length == 5)
            this.templateData["big-numbers"]["class"] = "five-column";
        
        if(crashData.session && this.templateData["ranges"]){
            this.templateData["frequency"] = true;
            this.templateData["ranges"].push({
                "title":jQuery.i18n.map["crashes.sessions"],
				"icon":"font-icon fa fa-refresh",
                "help":"crashes.help-frequency",
                "min":crashData.session.min,
                "max":crashData.session.max,
                "avg":((Math.round(crashData.session.total/crashData.session.count)*100)/100)
            });
        }
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
             if(typeof addDrill != "undefined"){
                $("#content .widget:first-child .widget-header>.right").append(addDrill("sg.crash", this.id, "[CLY]_crash"));
            }
            if(crashData.comments){
                var count = 0;
                for(var i = 0; i < crashData.comments.length; i++){
                    if(!crashData.comments[i].is_owner && typeof store.get("countly_"+this.id+"_"+crashData.comments[i]._id) == "undefined"){
                        count++;
                    }
                }
                if(count > 0){
                    $(".crash-comment-count span").text(count+"");
                    $(".crash-comment-count").show();
                }
            }
			$(".segmentation-option").on("click", function () {
				self.switchMetric($(this).data("value"));
			});
			this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": crashData.data,
				"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
					$(nRow).attr("id", aData._id);
				},
                "aoColumns": [
					{ "mData": function(row, type){if(type == "display") return countlyCommon.formatTimeAgo(row.ts); else return row.ts;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.crashed"]},
					{ "mData": function(row, type){var str = row.os; if(row.os_version) str += " "+row.os_version.replace(/:/g, '.'); return str;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.os_version"] },
					{ "mData": function(row, type){var str = ""; if(row.manufacture) str += row.manufacture+" "; if(row.device) str += countlyDeviceList[row.device] || row.device; return str;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.device"]},
					{ "mData": function(row, type){return row.app_version.replace(/:/g, '.');}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.app_version"] }
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [0,'desc'] ] );
			
			/*$('.crash-reports tbody').on("click", "tr", function (){
				var id = $(this).attr("id");
				if(id)
					window.location.hash = window.location.hash.toString()+"/"+id;
			});*/
			CountlyHelpers.expandRows(this.dtable, this.formatData);
			countlyCommon.drawGraph(crashData.dp[this.curMetric], "#dashboard-graph", "bar");
			
			$("#mark-resolved").click(function(){
				$("#mark-resolved").css("display", "none");
				$("#unresolved-text").css("display", "none");
				countlyCrashes.markResolve(crashData._id, function(version){
                    if(version){
                        $("#mark-unresolved").css("display", "block");
                        $("#resolved-text").css("display", "inline");
                        $("#resolved-version").text(version);
                    }
                    else{
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});
			
			$("#mark-unresolved").click(function(){
				$("#mark-unresolved").css("display", "none");
				$("#resolved-text").css("display", "none");
				countlyCrashes.markUnresolve(crashData._id, function(data){
                    if(data){
                        $("#mark-resolved").css("display", "block");
                        $("#unresolved-text").css("display", "inline");
                    }
                    else{
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});
            
            $(".btn-show-crash").click(function(){
                $(".btn-show-crash").addClass("active");
				countlyCrashes.show(crashData._id, function(data){
                    if(data){
                        $(".btn-show-crash").removeClass("active");
                        $(".btn-show-crash").css("display", "none");
                        $(".btn-hide-crash").css("display", "block");
                    }
                    else{
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});
            
            $(".btn-hide-crash").click(function(){
                $(".btn-hide-crash").addClass("active");
				countlyCrashes.hide(crashData._id, function(data){
                    if(data){
                        $(".btn-hide-crash").removeClass("active");
                        $(".btn-hide-crash").css("display", "none");
                        $(".btn-show-crash").css("display", "block");
                    }
                    else{
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});
            
            $(".btn-share-crash").click(function(){
				if ($(this).hasClass("active")){
                    $(this).removeClass("active");
                    $("#crash-share-list").slideUp();
                }
                else{
                    $(this).addClass("active")
                    $("#crash-share-list").slideDown();
                }
			});
            
            $(".btn-delete-crash").on("click", function(){
				var id = $(this).data("id");
				CountlyHelpers.confirm(jQuery.i18n.map["crashes.confirm-delete"], "red", function (result) {
					if (!result) {
						return true;
					}
					countlyCrashes.del(crashData._id, function (data) {
                        if(data){
                            if(data.result == "Success"){
                                window.location.hash = "/crashes";
                            }
                            else{
                                CountlyHelpers.alert(data.result, "red");
                            }
                        }
                        else{
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
					});
				});
			});
            
            if(crashData.is_public){
                $('#crash-share-public').attr('checked', true);
                $(".crash-share").show();
            }
            else{
                $('#crash-share-public').attr('checked', false);
                $(".crash-share").hide();
            }
            
            if(crashData.share){
                for(var i in crashData.share){
                    if(crashData.share[i])
                        $('#crash-share-'+i).attr('checked', true);
                }
            }
            
            $('.crash-share input[type=checkbox]').change(function(){
                var opts = {};
                $('.crash-share input[type=checkbox]').each(function(){
                    opts[this.id.replace("crash-share-", "")] = ($(this).is(":checked")) ? 1 : 0;
                });
                countlyCrashes.modifyShare(crashData._id, opts);
            });
            
            $('#crash-share-public').change(function(){
                if($(this).is(":checked")) {
                    countlyCrashes.share(crashData._id, function(data){
                        if(data)
                            $(".crash-share").show();
                        else
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    });
                }
                else{
                    countlyCrashes.unshare(crashData._id, function(data){
                        if(data)
                            $(".crash-share").hide();
                        else
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    });
                }
            });
            
            $( "#tabs" ).tabs();
            $( "#crash-notes" ).click(function(){
                var crashData = countlyCrashes.getGroupData();
                if(crashData.comments){
                    for(var i = 0; i < crashData.comments.length; i++){
                        store.set("countly_"+self.id+"_"+crashData.comments[i]._id, true);
                    }
                    $(".crash-comment-count").hide();
                }
            });
            var pre = $(".crash-stack pre")[0];
            pre.innerHTML = '<span class="line-number"></span>' + pre.innerHTML + '<span class="cl"></span>';
            var num = pre.innerHTML.split(/\n/).length;
            for (var i = 0; i < num; i++) {
                var line_num = pre.getElementsByTagName('span')[0];
                line_num.innerHTML += '<span>' + (i + 1) + '</span>';
            }
            $("#add_comment").click(function(){
                var comment = {};
                comment.time = new Date().getTime();
                comment.text = $("#comment").val();
                countlyCrashes.addComment(crashData._id, comment, function(data){
                    if(data){
                        self.refresh();
                        $("#comment").val("");
                    }
                    else
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red"); 
                });
            });
            $("#notes").on("click", ".crash-comment-edit", function(){
                var container = $(this).parents(".comment");
                if(!container.find("#comment_edit").length){
                    var comment_id = $(this).data("id");
                    container.find(".text").hide();
                    container.append($("#comment_edit").clone());
                    container.find("textarea").val(self.comments[comment_id]);
                    container.find(".cancel_comment").click(function(){
                        container.find("#comment_edit").remove();
                        container.find(".text").show();
                    });
                    container.find(".edit_comment").click(function(){
                        var comment = {};
                        comment.time = new Date().getTime();
                        comment.text = container.find("#edited_comment").val();
                        comment.comment_id = comment_id;
                        countlyCrashes.editComment(crashData._id, comment, function(data){
                            if(data){
                                self.refresh();
                                container.find("#comment_edit").remove();
                                container.find(".text").show();
                            }
                            else
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red"); 
                        });
                    });
                }
            });
            $("#notes").on("click", ".crash-comment-delete", function(){
                var ob = {};
                ob.comment_id = $(this).data("id");
                CountlyHelpers.confirm(jQuery.i18n.map["crashes.confirm-comment-delete"], "red", function (result) {
                    if (!result) {
						return true;
					}
                    countlyCrashes.deleteComment(crashData._id, ob, function(data){
                        if(data){
                            $("#comment_"+ob.comment_id).remove();
                            self.refresh();
                        }
                        else
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red"); 
                    });
                });
            });
        }
    },
    refresh:function () {
        var self = this;
        if(this.loaded){
            this.loaded = false;
            $.when(countlyCrashes.initialize(this.id, true)).then(function () {
                self.loaded = true;
                if (app.activeView != self) {
                    return false;
                }
                self.renderCommon(true);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));
                $(".crash-ranges").replaceWith(newPage.find(".crash-ranges"));
                $(".crash-bars").replaceWith(newPage.find(".crash-bars"));

                var crashData = countlyCrashes.getGroupData();
                if(crashData.comments){
                    var container = $("#comments");
                    var comment, parent;
                    var count = 0;
                    for(var i = 0; i < crashData.comments.length; i++){
                        self.comments[crashData.comments[i]._id] = crashData.comments[i].text;
                        comment = crashData.comments[i];
                        if(container.find("#comment_"+comment._id).length){
                            parent = container.find("#comment_"+comment._id);
                            parent.find(".text").html(newPage.find("#comment_"+comment._id+" .text").html());
                            parent.find(".author").html(newPage.find("#comment_"+comment._id+" .author").html());
                            parent.find(".time").html(newPage.find("#comment_"+comment._id+" .time").html());
                        }
                        else
                            container.append(newPage.find("#comment_"+comment._id));
                        
                        if(!crashData.comments[i].is_owner && typeof store.get("countly_"+self.id+"_"+comment._id) == "undefined"){
                            count++;
                        }
                    }
                    if(count > 0){
                        $(".crash-comment-count span").text(count+"");
                        $(".crash-comment-count").show();
                    }
                }
                CountlyHelpers.refreshTable(self.dtable, crashData.data);
                countlyCommon.drawGraph(crashData.dp[self.curMetric], "#dashboard-graph", "bar");
                CountlyHelpers.reopenRows(self.dtable, self.formatData);
                app.localize();
            });
        }
    },
	formatData: function( data ) {
		// `d` is the original data object for the row
		var str = '';
		if(data){
			str += '<div class="datatablesubrow">'+
				'<table style="width: 100%;">'+
						'<tr>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.app_version"]+':</td>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.device"]+':</td>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.state"]+':</td>';
                            if(data.custom)
                                str += '<td class="text-left">'+jQuery.i18n.map["crashes.custom"]+':</td>';
                            if(data.logs)
                                str += '<td class="text-left">'+jQuery.i18n.map["crashes.logs"]+':</td>';
						str += '</tr>'+
						'<tr>'+
							'<td class="text-right">'+data.app_version.replace(/:/g, '.')+'</td>'+
							'<td class="text-right">'+data.os+' ';
                                if(data.os_version)
                                    str += data.os_version.replace(/:/g, '.')+'<br/>';
                                if(data.manufacture)
                                    str += data.manufacture;+' ';
                                if(data.device)
                                    str += data.device;
                                if(data.cpu)
                                    str += ' ('+data.cpu+')'+'<br/>';
                                if(data.opengl)
                                    str += jQuery.i18n.map["crashes.opengl"]+': '+data.opengl+'<br/>';
                                if(data.resolution)
                                    str += jQuery.i18n.map["crashes.resolution"]+': '+data.resolution+'<br/>';
                                str += jQuery.i18n.map["crashes.root"]+': '+((data.root)? "yes" : "no")+'<br/>';
                            str += '</td>'+
                            '<td class="text-left">';
                                if(data.ram_current && data.ram_total)
                                    str += jQuery.i18n.map["crashes.ram"]+': '+data.ram_current+'/'+data.ram_total+' Mb<br/>';
                                if(data.disk_current && data.disk_total)
                                    str += jQuery.i18n.map["crashes.disk"]+': '+data.disk_current+'/'+data.disk_total+' Mb<br/>';
                                if(data.bat_current)
                                    str += jQuery.i18n.map["crashes.battery"]+': '+data.bat_current+'%<br/>';
                                if(data.run)
                                    str += jQuery.i18n.map["crashes.run"]+': '+countlyCommon.timeString(data.run/60)+'<br/>';
                                if(data.session)
                                    str += jQuery.i18n.map["crashes.after"]+' '+data.session+' '+jQuery.i18n.map["crashes.sessions"]+'<br/>';
                                else
                                    str += jQuery.i18n.map["crashes.frequency"]+': '+jQuery.i18n.map["crashes.first-crash"]+'<br/>';
                                str += jQuery.i18n.map["crashes.online"]+":"+((data.online)? "yes" : "no")+"<br/>";
                                str += jQuery.i18n.map["crashes.background"]+":"+((data.background)? "yes" : "no")+"<br/>";
                                str += jQuery.i18n.map["crashes.muted"]+":"+((data.muted)? "yes" : "no")+"<br/>";
                            str += '</td>';
                            if(data.custom){
                                str += '<td class="text-left">';
                                for(var i in data.custom){
                                    str += i+': '+data.custom[i]+'<br/>';
                                }
                                str += '</td>';
                            }
                            if(data.logs){
                                str += '<td class="text-left">'+
                                    '<pre>'+data.logs+'</pre>'+
                                '</td>';
                            }
						str += '</tr>'+
						'</table>'+
			'</div>';
		}
		return str;
	},
	switchMetric:function(metric){
		this.curMetric = metric;
		var crashData = countlyCrashes.getGroupData();
		countlyCommon.drawGraph(crashData.dp[this.curMetric], "#dashboard-graph", "bar");
	}
});

//register views
app.crashesView = new CrashesView();
app.crashgroupView = new CrashgroupView();

app.route('/crashes', 'crashes', function () {
	this.renderWhenReady(this.crashesView);
});
app.route('/crashes/:group', 'crashgroup', function (group) {
	this.crashgroupView.id = group;
    this.renderWhenReady(this.crashgroupView);
});
app.addPageScript("/crashes", function(){
   $("#crash-selector").find(">.button").click(function () {
        if ($(this).hasClass("selected")) {
            return true;
        }

        $(".crash-selector").removeClass("selected").removeClass("active");
		var filter = $(this).attr("id");
		app.activeView.filterCrashes(filter);
    });
});

app.addPageScript("/drill#", function(){
    var drillClone;
    var self = app.drillView;
    if(countlyGlobal["record_crashes"]){
        $("#drill-types").append('<div id="drill-type-crashes" style="padding: 6px 8px 7px 8px;" class="icon-button light">'+jQuery.i18n.map["crashes.title"]+'</div>');
        $("#drill-type-crashes").on("click", function() {
            if ($(this).hasClass("active")) {
                return true;
            }
    
            $("#drill-types").find(".icon-button").removeClass("active");
            $(this).addClass("active");
            $("#event-selector").hide();
    
            $("#drill-no-event").fadeOut();
            $("#segmentation-start").fadeOut().remove();
            $(this).parents(".cly-select").removeClass("dark");
    
            $(".event-select.cly-select").find(".text").text("Select an Event");
            $(".event-select.cly-select").find(".text").data("value","");
    
            currEvent = "[CLY]_crash";
    
            self.graphType = "line";
            self.graphVal = "times";
            self.filterObj = {};
            self.byVal = "";
            self.drillChartDP = {};
            self.drillChartData = {};
            self.activeSegmentForTable = "";
            countlySegmentation.reset();
    
            $("#drill-navigation").find(".menu[data-open=table-view]").hide();
    
            $.when(countlySegmentation.initialize(currEvent)).then(function () {
                $("#drill").replaceWith(drillClone.clone(true));
                self.adjustFilters();
                self.draw(true, false);
            });
        });
        setTimeout(function() {
            drillClone = $("#drill").clone(true);
        }, 0);
    }
});

$( document ).ready(function() {
    app.addAppSwitchCallback(function(appId){
        countlyCrashes.loadList(appId);
    });
    if(!production){
        CountlyHelpers.loadJS("crashes/javascripts/marked.min.js");
    }
	var menu = '<a href="#/crashes" class="item" id="crash-menu">'+
        '<div class="logo ion-alert-circled"></div>'+
        '<div class="text" data-localize="crashes.title"></div>'+
    '</a>';
	if($('.sidebar-menu #management-menu').length)
		$('.sidebar-menu #management-menu').before(menu);
	else
		$('.sidebar-menu').append(menu);
    
    //check if configuration view exists
    if(app.configurationsView){
        app.configurationsView.registerLabel("crashes", "Crashes");
        app.configurationsView.registerLabel("crashes-report_limit", "Amount of reports displayed");
    }
});;(function (countlyPush, $, undefined) {
	var api = {
		pushes: {
			"w":countlyCommon.API_URL + "/i/pushes",
			"r":countlyCommon.API_URL + "/o/pushes"
		}
	};
    window.MessageStatus = {
        Initial:        0,
        InQueue:        1 << 1,
        InProcessing:   1 << 2,
        Sent:           1 << 3,
        Error:          1 << 4,
        Aborted:        1 << 5,
        Deleted:        1 << 6
    };


    //Private Properties
    var _pushDb = {},
        _langsDb = {},
        _activeAppKey = 0,
        _initialized = false;

    countlyPush.debug = function() {
        console.log('debug');
    };

    //Public Methods
    countlyPush.initialize = function () {
        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.ajax({
                    type: "GET",
                    url:  api.pushes.r + '/all',
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "period": countlyCommon.getPeriodForAjax()
                    },
                    dataType: "jsonp",
                    success: function (json) {
                        _pushDb = prepareMessages(json);
                    }
                });
        } else {
            return true;
        }
    };

    countlyPush.refresh = countlyPush.initialize;

    countlyPush.getAudience = function(data, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/audience',
            data: { "api_key": countlyGlobal.member.api_key, args: JSON.stringify(data) },
            dataType: "jsonp",
            success: success,
            error: error
        })
    };

    countlyPush.getLangs = function(appIds, success, error) {
        var key = appIds.join(',');

        if (key in _langsDb) {
            return $.when(_langsDb[key]).then(success, error);
        } else {
            var result = {};

            function queryApp (appId) {
                return $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key": countlyGlobal.member.api_key,
                        "app_id": appId,
                        "method": "langs",
                        "period": "month"
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        result[appId] = json;
                    }
                });
            }

            var queries = [];
            for (var i = 0; i < appIds.length; i++) {
                queries.push(queryApp(appIds[i]));
            }

            return $.when.apply($, queries).then(function(){
                _langsDb[key] = success(result, true);
            }, error);
        }
    };

    countlyPush.createMessage = function(message, date, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/create',
            data: { "api_key": countlyGlobal.member.api_key, args: JSON.stringify(message), date: date ? date.toString() : '' },
            dataType: "jsonp",
            success: function(json){
                if (json.error) {
                    error (json.error);
                } else {
                    success(prepareMessage(json))
                }
            }
        })
    };

    countlyPush.refreshMessage = function(message, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/refresh',
            data: { "api_key": countlyGlobal.member.api_key, mid: message._id },
            dataType: "jsonp",
            success: function(json){
                var msg = prepareMessage(json);
                for (var i = 0; i < _pushDb.length; i++) {
                    if (_pushDb[i]._id == msg._id) _pushDb[i] = msg;
                }
                success(prepareMessage(json))
            },
            error: error
        })
    };

    countlyPush.retryMessage = function(messageId, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/retry',
            data: { "api_key": countlyGlobal.member.api_key, mid: messageId },
            dataType: "jsonp",
            success: function(json){
                if (json.error) error(json.error);
                else success(prepareMessage(json));
            }
        })
    };

    countlyPush.deleteMessage = function(messageId, success, error) {
        return $.ajax({
            type: "GET",
            url:  api.pushes.w + '/delete',
            data: { "api_key": countlyGlobal.member.api_key, mid: messageId },
            dataType: "jsonp",
            success: function(json){
                if (json.error) error(json.error);
                else {
                    var msg = prepareMessage(json);
                    for (var i = 0; i < _pushDb.length; i++) {
                        if (_pushDb[i]._id == msg._id) {
                            _pushDb.splice(i, 1);
                            success(msg);
                        }
                    }
                }
            }
        })
    };

    countlyPush.reset = function () {
        _pushDb = {};
        _errorDb = {};
    };

    countlyPush.getMessagesForCurrApp = function () {
        var currAppMsg = [];

        for (var i = 0; i < _pushDb.length; i++) {
            if (_pushDb[i].apps.indexOf(countlyCommon.ACTIVE_APP_ID) !== -1) {
                currAppMsg.push(_pushDb[i]);
            }

            if (currAppMsg.length >= 10) {
                break;
            }
        }

        return currAppMsg;
    };

    countlyPush.getAllMessages = function () {
        return _pushDb;
    };

    function prepareMessages(msg) {
        if (msg._id) {
            return prepareMessage(msg);
        } else {
            return _.map(msg, function(msg){ return prepareMessage(msg); });
        }
    }

    function prepareMessage(msg) {
        if (typeof msg.result.sent == 'undefined' || msg.result.sent == 0) {
            msg.percentDelivered = 0;
            msg.percentNotDelivered = 100;
        } else {
            msg.percentDelivered = +(100 * msg.result.delivered / msg.result.sent).toFixed(2);
            msg.percentNotDelivered = 100 - msg.percentDelivered;
        }

        if (typeof msg.result.found == 'undefined' || msg.result.found == 0) {
            msg.percentSent = 0;
            msg.percentNotSent = 100;
        } else {
            msg.percentSent = +(100 * msg.result.sent / (msg.result.found - (msg.result.processed - msg.result.sent))).toFixed(2);
            msg.percentNotSent = 100 - msg.percentSent;
        }

        msg.sending = (msg.result.status & 4) > 0 && (msg.result.status & (16 | 32)) === 0;

        msg.local = {
            created: moment(msg.created).format("D MMM, YYYY HH:mm"),
            createdSeconds: moment(msg.created).unix()
        };

        msg.percentDelivered = Math.min(100, msg.percentDelivered);
        msg.percentNotDelivered = Math.min(100, msg.percentNotDelivered);
        msg.percentSent = Math.min(100, msg.percentSent);
        msg.percentNotSent = Math.min(100, msg.percentNotSent);

        if (msg.date) {
            msg.local.date = moment(msg.date).format("D MMM, YYYY HH:mm");
            msg.local.dateSeconds = moment(msg.date).unix();
        }
        if (msg.sent) {
            msg.local.sent = moment(msg.sent).format("D MMM, YYYY HH:mm");
            msg.local.dateSeconds = moment(msg.sent).unix();
        }

        return msg;
    }

}(window.countlyPush = window.countlyPush || {}, jQuery));


(function (countlyPushEvents, $, undefined) {
    var _periodObj,
        _pushEventsDb = {},
        _activeAppKey,
        _initialized,
        _period = null;

    //Public Methods
    countlyPushEvents.initialize = function() {
        if (_initialized && _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
            return countlyPushEvents.refresh();
        }

        _period = countlyCommon.getPeriodForAjax();

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            function eventAjax(key) {
                return $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id" : countlyCommon.ACTIVE_APP_ID,
                        "method" : "events",
                        "event": key,
                        "segmentation": "no-segment",
                        "period":_period
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        _pushEventsDb[key] = json;
                    }
                });
            }

            return $.when(
                eventAjax("[CLY]_push_sent"),
                eventAjax("[CLY]_push_open"),
                eventAjax("[CLY]_push_action")
            ).then(function(){
                return true;
            });
       } else {
            return true;
        }
    };

    countlyPushEvents.refresh = function() {
        if (!countlyCommon.DEBUG) {
            function eventAjax(key) {
                return $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "api_key": countlyGlobal.member.api_key,
                        "app_id" : countlyCommon.ACTIVE_APP_ID,
                        "method" : "events",
                        "action" : "refresh",
                        "event": key,
                        "segmentation": "no-segment",
                        "period":_period
                    },
                    dataType: "jsonp",
                    success: function(json) {
                        countlyCommon.extendDbObj(_pushEventsDb[key], json);
                    }
                })
            }

            return $.when(
                    eventAjax("[CLY]_push_sent"),
                    eventAjax("[CLY]_push_open"),
                    eventAjax("[CLY]_push_action")
                ).then(function(){
                    return true;
                });
        } else {
            _pushEventsDb = {"2012":{}};
            return true;
        }
    };

    countlyPushEvents.getDashDP = function() {
        var total = {
                chartDP: [],
                chartData: [],
                keyEvents: []
            },
            events = ["[CLY]_push_sent", "[CLY]_push_open", "[CLY]_push_action"],
            titles = [jQuery.i18n.map["common.sent"], jQuery.i18n.map["common.delivered"], jQuery.i18n.map["common.actions"]];
        events.forEach(function(event, i){
            var noSegmentIndex = _.pluck(_pushEventsDb[event], "_id"),
                eventDb = _pushEventsDb[event] || {},
                chartData = [
                    { data:[], label: titles[i], color: countlyCommon.GRAPH_COLORS[i] }
                ],
                dataProps = [
                    { name:"c" }
                ],
                eventData = countlyCommon.extractChartData(eventDb, countlyEvent.clearEventsObject, chartData, dataProps);

            total.chartDP.push(eventData.chartDP[0]);
            total.chartData.push(eventData.chartData[0]);
            total.keyEvents.push(eventData.keyEvents[0]);
        });
        return total;
    };

    countlyPushEvents.getDashSummary = function() {
        var events = ["[CLY]_push_sent", "[CLY]_push_open", "[CLY]_push_action"],
            titles = [jQuery.i18n.map["common.sent"], jQuery.i18n.map["common.delivered"], jQuery.i18n.map["common.actions"]],
            helps = ["dashboard.push.sent", "dashboard.push.delivered","dashboard.push.actions"],
            data = [];
        events.forEach(function(event, i){
            var ev = countlyPushEvents.getDashEventData(event);
            ev.title = titles[i];
            ev.help = helps[i];
            data.push(ev);
        });
        return data;
    };

    countlyPushEvents.getEventData = function(eventKey) {
        var chartData = [
                { data:[], label:jQuery.i18n.map["events.table.count"], color:'#DDDDDD', mode:"ghost"},
                { data:[], label:jQuery.i18n.map["events.table.count"], color: countlyCommon.GRAPH_COLORS[1] }
            ],
            dataProps = [
                {
                    name:"pc",
                    func:function (dataObj) {
                        return dataObj["c"];
                    },
                    period:"previous"
                },
                { name:"c" }
            ];

        var eventData = countlyCommon.extractChartData(_pushEventsDb[eventKey], countlyEvent.clearEventsObject, chartData, dataProps);
        eventData["eventName"] = eventKey;
        eventData["dataLevel"] = 1;
        eventData["tableColumns"] = [jQuery.i18n.map["common.date"], jQuery.i18n.map["events.table.count"]];

        var countArr = _.pluck(eventData.chartData, "c");
        if (countArr.length) {
            eventData.totalCount = _.reduce(countArr, function(memo, num){ return memo + num; }, 0);
        }

        return eventData;
    };

    countlyPushEvents.getDashEventData = function(eventKey) {
        _periodObj = countlyCommon.periodObj;

        var noSegmentIndex = _.pluck(_pushEventsDb[eventKey], "_id"),
            eventDb = _pushEventsDb[eventKey] || {};

        if (!eventDb) {
            return {
                total: 0,
                change: 'NA',
                trend: 'u',
                sparkline: '0,0'
            };
        }

        var currentTotal = 0,
            previousTotal = 0;

        if (_periodObj.isSpecialPeriod) {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                currentTotal += eventCount(eventDb, _periodObj.currentPeriodArr[i]);
                previousTotal += eventCount(eventDb, _periodObj.previousPeriodArr[i]);
            }
        } else {
            currentTotal = eventCount(eventDb, _periodObj.activePeriod);
            previousTotal = eventCount(eventDb, _periodObj.previousPeriod);
        }

        var changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal);

        return {
            "total":currentTotal,
            "change":changeTotal.percent,
            "trend":changeTotal.trend
        };
    };

    countlyPushEvents.calcSparklineData = function(eventKey) {
        var sparkLine = [];
        _periodObj = countlyCommon.periodObj;

        if (!_periodObj.isSpecialPeriod) {
            for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
                var tmpObj = countlyCommon.getDescendantProp(_pushEventsDb[eventKey], _periodObj.activePeriod + "." + i);
                sparkLine.push((tmpObj && tmpObj.c) ? tmpObj.c : 0);
            }
        } else {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                var tmpObj = countlyCommon.getDescendantProp(_pushEventsDb[eventKey], _periodObj.currentPeriodArr[i]);
                sparkLine.push((tmpObj && tmpObj.c) ? tmpObj.c : 0);
            }
        }

        return sparkLine.join(',');
    };

    function eventCount(eventDb, period) {
        var tmpObj = countlyCommon.getDescendantProp(eventDb, period);
        return (tmpObj && tmpObj.c) ? tmpObj.c : 0;
    }

}(window.countlyPushEvents = window.countlyPushEvents || {}, jQuery));;var jsonlite;
(function (jsonlite) {
    function parse(source, jsonObjectFormat) {
        if (typeof jsonObjectFormat === "undefined") { jsonObjectFormat = true; }
        var object_start = jsonObjectFormat ? '{' : '(';
        var object_end = jsonObjectFormat ? '}' : ')';
        var pair_seperator = jsonObjectFormat ? ':' : '=';
        var at = 0;
        var ch = ' ';
        var escapee = {
            '"': '"',
            '\\': '\\',
            '/': '/',
            b: '\b',
            f: '\f',
            n: '\n',
            r: '\r',
            t: '\t'
        };
        var text = source;
        var result = readValue();
        skipWhitespace();
        if(ch) {
            raiseError("Syntax error");
        }
        return result;
        function raiseError(m) {
            throw {
                name: 'SyntaxError',
                message: m,
                at: at,
                text: text
            };
        }
        function next(c) {
            if(c && c !== ch) {
                raiseError("Expected '" + c + "' instead of '" + ch + "'");
            }
            ch = text.charAt(at);
            at += 1;
            return ch;
        }
        function readString() {
            var s = '';
            if(ch === '"') {
                while(next()) {
                    if(ch === '"') {
                        next();
                        return s;
                    }
                    if(ch === '\\') {
                        next();
                        if(ch === 'u') {
                            var uffff = 0;
                            for(var i = 0; i < 4; i += 1) {
                                var hex = parseInt(next(), 16);
                                if(!isFinite(hex)) {
                                    break;
                                }
                                uffff = uffff * 16 + hex;
                            }
                            s += String.fromCharCode(uffff);
                        } else if(typeof escapee[ch] === 'string') {
                            s += escapee[ch];
                        } else {
                            break;
                        }
                    } else {
                        s += ch;
                    }
                }
            }
            raiseError("Bad string");
        }
        function skipWhitespace() {
            while(ch && ch <= ' ') {
                next();
            }
        }
        function readWord() {
            var s = '';
            while(allowedInWord()) {
                s += ch;
                next();
            }
            if(s === "true") {
                return true;
            }
            if(s === "false") {
                return false;
            }
            if(s === "null") {
                return null;
            }
            if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s)) {
                return parseFloat(s);
            }
            return s;
        }
        function readArray() {
            var array = [];
            if(ch === '[') {
                next('[');
                skipWhitespace();
                if(ch === ']') {
                    next(']');
                    return array;
                }
                while(ch) {
                    array.push(readValue());
                    skipWhitespace();
                    if(ch === ']') {
                        next(']');
                        return array;
                    }
                    next(',');
                    skipWhitespace();
                }
            }
            raiseError("Bad array");
        }
        function readObject() {
            var o = {
            };
            if(ch === object_start) {
                next(object_start);
                skipWhitespace();
                if(ch === object_end) {
                    next(object_end);
                    return o;
                }
                while(ch) {
                    var key = ch === '"' ? readString() : readWord();
                    if(typeof key !== 'string') {
                        raiseError('Bad object key: ' + key);
                    }
                    skipWhitespace();
                    next(pair_seperator);
                    if(Object.hasOwnProperty.call(o, key)) {
                        raiseError('Duplicate key: "' + key + '"');
                    }
                    o[key] = readValue();
                    skipWhitespace();
                    if(ch === object_end) {
                        next(object_end);
                        return o;
                    }
                    next(',');
                    skipWhitespace();
                }
            }
            raiseError("Bad object");
        }
        function readValue() {
            skipWhitespace();
            switch(ch) {
                case object_start:
                    return readObject();
                case '[':
                    return readArray();
                case '"':
                    return readString();
                default:
                    return readWord();
            }
        }
        function allowedInWord() {
            switch(ch) {
                case '"':
                case '\\':
                case '\t':
                case '\n':
                case '\r':
                case ',':
                case '[':
                case ']':
                case object_start:
                case object_end:
                case pair_seperator:
                    return false;
            }
            return ch > ' ';
        }
    }
    jsonlite.parse = parse;
})(jsonlite || (jsonlite = {}));;window.MessagingDashboardView = countlyView.extend({
    showOnGraph: 3,
    initialize:function () {
    },
    beforeRender: function() {
        if (this.template) {
            return $.when(countlySession.initialize(), countlyUser.initialize(), countlyPushEvents.initialize(), countlyPush.initialize(), typeof countlyGeo === 'undefined' ? {} : countlyGeo.initialize()).then(function () {});
        } else {
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/push/templates/messaging-dashboard.html', function(src){
                self.template = Handlebars.compile(src);
            }), countlySession.initialize(), countlyUser.initialize(), countlyPushEvents.initialize(), countlyPush.initialize(), typeof countlyGeo === 'undefined' ? {} : countlyGeo.initialize()).then(function () {});
        }
    },
    renderCommon:function (isRefresh) {
        var sessionData = countlySession.getSessionData(),
            messUserDP = countlySession.getMsgUserDPActive(),
            pushDP = countlyPushEvents.getDashDP(),
            pushSummary = countlyPushEvents.getDashSummary(),
            templateData = {};

        var secondary = [sessionData.usage['total-users'], sessionData.usage['messaging-users']];
        secondary[0].title = jQuery.i18n.map["common.total-users"];
        secondary[0].id = "draw-total-users";
        secondary[0].help = "dashboard.total-users";
        secondary[1].title = jQuery.i18n.map["common.messaging-users"];
        secondary[1].id = "draw-messaging-users";
        secondary[1].help = "dashboard.messaging-users";
        templateData["big-numbers-secondary"] = secondary;

        var enabling = 0, sent = 0, delivery = 0, action = 0;
        if (sessionData.usage['total-users'].total) {
            enabling = Math.round(100 * (sessionData.usage['messaging-users'].total / sessionData.usage['total-users'].total));
        }
        for (var i in pushDP.chartDP[0].data) {
            sent += pushDP.chartDP[0].data[i][1];
        }
        for (var i in pushDP.chartDP[1].data) {
            delivery += pushDP.chartDP[1].data[i][1];
        }
        for (var i in pushDP.chartDP[2].data) {
            action += pushDP.chartDP[2].data[i][1];
        }
        enabling = Math.min(100, enabling);
        delivery = Math.min(100, delivery ? sent === 0 ? 100 : Math.round(100 * delivery / sent) : 0);
        action = Math.min(100, action ? sent === 0 ? 100 :  Math.round(100 * action / sent) : 0);

        templateData["page-title"] = countlyCommon.getDateRange();
        templateData["logo-class"] = "sessions";
        templateData["push_short"] = countlyPush.getMessagesForCurrApp();

        templateData["big-numbers"] = pushSummary;

        templateData["big-numbers-intermediate"] = [
            {
                percentage: enabling + '%',
                title: jQuery.i18n.map['push.rate.enabling'],
                help: 'dashboard.push.enabling-rate' },
            {
                percentage: delivery + '%',
                title: jQuery.i18n.map['push.rate.delivery'],
                help: 'dashboard.push.delivery-rate' },
            {
                percentage: action + '%',
                title: jQuery.i18n.map['push.rate.action'],
                help: 'dashboard.push.actions-rate' }
        ];

        this.templateData = templateData;

        if (isRefresh) {
            newPage = $("<div>" + this.template(this.templateData) + "</div>");
            $(this.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));
            $(this.el).find("#intermediate-numbers-container").replaceWith(newPage.find("#intermediate-numbers-container"));

            // $('.widget-intermediate .big-numbers').eq(0).find('.percentage').text(enabling + '%');
            // $('.widget-intermediate .big-numbers').eq(1).find('.percentage').text(delivery + '%');
            // $('.widget-intermediate .big-numbers').eq(2).find('.percentage').text(action + '%');
        } else {
        $(this.el).html(this.template(this.templateData));
        }

        countlyCommon.drawTimeGraph(pushDP.chartDP, "#dashboard-graph");
        countlyCommon.drawTimeGraph(messUserDP.chartDP, "#dashboard-graph-secondary");

        if (isRefresh) {
            CountlyHelpers.setUpDateSelectors(this);
            app.localize();
        }
    },
    refresh:function () {
        $.when(this.beforeRender()).then(this.renderCommon.bind(this, true));
    },
    dateChanged: function() {
        this.refresh();
    }
});

window.MessagingListView = countlyView.extend({
    template: null,
    initialize:function () {
    },
    beforeRender: function() {
        if(this.template)
            return $.when(countlyPush.initialize(), typeof countlyGeo === 'undefined' ? {} : countlyGeo.initialize()).then(function () {});
        else{
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/push/templates/messaging-list.html', function(src){
                self.template = Handlebars.compile(src);
            }), countlyPush.initialize(), typeof countlyGeo === 'undefined' ? {} : countlyGeo.initialize()).then(function () {});
        }
    },
    renderTable:function (isRefresh) {
        var pushes = countlyPush.getAllMessages();

        $.fn.dataTableExt.oStdClasses.sWrapper = "dataTableOne_wrapper message-list";
        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": pushes,
            "aoColumns": [
                { "mData": "messagePerLocale", "mRender": CountlyHelpers.clip(CountlyHelpers.messageText), "sTitle": jQuery.i18n.map["push.table.message"] },
                { "mData": "apps", sType:"string", "mRender": CountlyHelpers.clip(CountlyHelpers.appIdsToNames), "sTitle": jQuery.i18n.map["push.table.app-names"] },
                { "mData": "percentDelivered", sType:"string", "mRender": function(d, type, data){
                    return '<div class="bar" data-desc="' + d + '%">' +
                                '<div class="bar-inner" style="width:' + data.percentDelivered + '%;" data-item="' + data.percentDelivered + '%"></div>' +
                                '<div class="bar-inner" style="width:' + data.percentNotDelivered + '%;" data-item="' + data.percentNotDelivered + '%"></div> ' +
                            '</div>' +
                            '<div class="percent-text">' + jQuery.i18n.prop('push.count.sent', data.percentDelivered, data.result.sent) + '</div>';
                }, "sTitle": jQuery.i18n.map["push.table.delivered"] },
                { "mData": "result", sType:"string", "mRender":function(d, type, data) { 
                    if (data.sending && d.found) {
                        return '<div class="bar" data-desc="' + d + '%">' +
                                 '<div class="bar-inner" style="width:' + data.percentSent + '%;" data-item="' + data.percentSent + '%"></div>' +
                                 '<div class="bar-inner" style="width:' + data.percentNotSent + '%;" data-item="' + data.percentNotSent + '%"></div> ' +
                             '</div>' +
                             '<div class="percent-text">' + jQuery.i18n.prop('push.count.sending', data.percentSent, d.found - (d.processed - d.sent)) + '</div>';
                    } else {
                        return '<span data-localize="push.message.status.' + d.status + '"></span>';
                    }
                }, "sTitle": jQuery.i18n.map["push.table.status"] },
                { "mData": "local.createdSeconds", bVisible: false, sType:"numeric" },
                { "mData": "local.created", sType:"date", iDataSort: 4, "sTitle": jQuery.i18n.map["push.table.created"] },
                { "mData": "local.dateSeconds", bVisible: false, sType:"numeric" },
                { "mData": "local", sType:"string", iDataSort: 6, "sTitle": jQuery.i18n.map["push.table.sent-scheduled"], mRender: function(local){
                    return local.sent ? local.sent : local.date;
                } }
            ],
            "aaSorting": [[4, 'desc']],
            "fnCreatedRow": function(row, data, i) {
                $(row).attr('data-mid', data._id);
            }
        }));

        $.fn.dataTableExt.oStdClasses.sWrapper = "dataTableOne_wrapper";

        // $('.d-table').dataTable().api().rows().each(function(row, i){
        //     $(row.node()).attr('data-mid', row.data()._id);
        // });

        // $('.d-table').find('tr').each(function(i, tr){
        //     if (i > 0) $(tr).attr('data-mid', pushes[i - 1]._id);
        // });

        $(".d-table").stickyTableHeaders();

        $('.btn-create-message').off('click').on('click', PushPopup.bind(window, undefined, undefined));
        $('.d-table tr:not(.push-no-messages)').off('click').on('click', function(){
            var mid = $(this).attr('data-mid');
            for (var i in pushes) if (pushes[i]._id === mid) {
                PushPopup(pushes[i]);
                return;
            }
        });
    },
    renderCommon:function (isRefresh) {
        if (!isRefresh) {
            $('#content').html(this.template({
                'logo-class': 'logo',
                'page-title': jQuery.i18n.map["push.page-title"]
            }));
            this.renderTable();
        }

        if (isRefresh) {
            var pushes = countlyPush.getAllMessages();
            CountlyHelpers.refreshTable(this.dtable, pushes);
            CountlyHelpers.setUpDateSelectors(this);
            $('#date-to').datepicker('option', 'maxDate', null);

            $('.d-table tr:not(.push-no-messages)').off('click').on('click', function(){
                var mid = $(this).attr('data-mid');
                for (var i in pushes) if (pushes[i]._id === mid) {
                    PushPopup(pushes[i]);
                    return;
                }
            });

            app.localize();
        }
    },
    refresh: function(){
        $.when(this.beforeRender()).then(this.renderCommon.bind(this, true));
    },
    dateChanged: function() {
        this.refresh();
    }
});

var PushPopup = function(message, duplicate, dontReplaceApp) {
    var allApps = {}, hasPushApps = false, hasPushAdminApps = false, APN = 'i', GCM = 'a',
        languages = countlyGlobalLang['languages'],
        locales;

    for (var id in countlyGlobal['apps']) {
        var a = countlyGlobal['apps'][id];
        if ((a.apn && (a.apn.test || a.apn.prod || a.apn.universal)) || (a.gcm && a.gcm.key)) {
            hasPushApps = true;
            if (countlyGlobal['admin_apps'][a._id]) {
                hasPushAdminApps = true;
                allApps[a._id] = a;
            }
        }
    }

    currentApp = allApps[countlyCommon.ACTIVE_APP_ID];

    if (!hasPushApps) {
        CountlyHelpers.alert(jQuery.i18n.map["push.no-apps"], "red");
        return;
    } else if (!hasPushAdminApps) {
        CountlyHelpers.alert(jQuery.i18n.map["push.no-apps-admin"], "red");
        return;
    }

    if (!currentApp || !((currentApp.apn && (currentApp.apn.test || currentApp.apn.prod || currentApp.apn.universal)) || (currentApp.gcm && currentApp.gcm.key))) {
        if (dontReplaceApp) {
            CountlyHelpers.alert(jQuery.i18n.map["push.no-app"], "red");
            return;
        } else {
            for (var a in allApps) { currentApp = allApps[a]; }
        }
    }

    if (message) {
        message = {
            _id: message._id,
            duplicate: message,
            type: message.type || 'message',
            apps: message.apps.slice(0),
            appNames: [],
            platforms: message.platforms.slice(0),
            appsPlatforms: [],
            messagePerLocale: _.extend({}, message.messagePerLocale),
            locales: _.extend({}, message.locales),
            sound:  duplicate ? message.sound : !!message.sound,
            update: duplicate ? message.update : !!message.update,
            review: duplicate ? message.review : !!message.review,
            badge: duplicate ? message.badge : typeof message.badge === 'undefined' ? false : true,
            data: duplicate ? message.data : typeof message.data === 'undefined' ? false : true,
            url: duplicate ? message.url : typeof message.url === 'undefined' ? false : true,
            test: message.test,
            date: message.date,
            sent: message.sent,
            result: message.result,
            userConditions: message.userConditions === '{}' ? undefined : (typeof message.userConditions === 'string' ? JSON.parse(message.userConditions) : message.userConditions),
            drillConditions: message.drillConditions === '{}' ? undefined : (typeof message.drillConditions === 'string' ? JSON.parse(message.drillConditions) : message.drillConditions),
            geo: typeof message.geo === 'undefined' ? undefined : ((typeof message.geo === 'string' && message.geo) ? message.geo : undefined),
            noTests: false,
            noApps: false,
            noPlatforms: false
        }
        for (var i in message.apps) for (var a in allApps) if (allApps[a]._id === message.apps[i]) message.appNames.push(allApps[a].name);
        if (message.userConditions && message.userConditions._id) {
            message.noTests = true;
            message.noApps = true;
            message.noPlatforms = true;
        }
    } else {
        message = {
            type: 'message',
            apps: [currentApp._id],
            appNames: [currentApp.name],
            platforms: [],
            appsPlatforms: [],
            messagePerLocale: {
                "default": ''
            },
            sound: true,
            noTests: false,
            noApps: false,
            noPlatforms: false
       };
    }

    var dialog = $("#cly-popup").clone().removeAttr("id").addClass('push-create');
    dialog.find(".content").html($('#push-create').html());

    var content = dialog.find('.content');

    app.localize(content);

    // View, Create, or Duplicate
    var isView = message._id && !duplicate;
    if (isView) {
        content.find('.create-header').hide();
    } else {
        content.find('.view-header').hide();
    }

    // geos
    if (typeof countlyGeo !== 'undefined') {
        var geos = countlyGeo.getAll();
        if (geos.length) {
            var all = content.find('.geos .select-items > div'), doesntMatter = content.find('.geos .select-items > div').text();
            for (var k in geos) {
                all.append($('<div data-value="' + geos[k]._id + '" class="item">' + geos[k].title + '</div>'));
                if (message.geo === geos[k]._id) {
                    content.find('.geos .cly-select .text').text(geos[k].title);
                }
            }
            if (!message.geo) {
                content.find('.geos .cly-select .text').text(doesntMatter);
            }
            content.find(".geos .cly-select .text").on('changeData', function(e){
                message.geo = $(this).data('value');
                setDeviceCount();
            });
        } else {
            content.find('.divide-three.create-header').removeClass('.divide-three');
            content.find('.create-header .field.geos').remove();
        }
    } else {
        var geos = content.find('.field.geos');
        geos.parent().removeClass('divide-three').addClass('divide');
        geos.remove();
    }

    // Apps
    if (isView) {
        content.find('.view-apps .view-value').text(message.appNames.join(', '));
    } else {
        if (message.noApps) {
            content.find('.field.apps').hide();
        }

        content.find(".select-apps").on('click', function(ev){
            if ($('#listof-apps').length) {
                $('#listof-apps').remove();
            } else {
                var pos = $(this).offset();
                pos.top = pos.top + 46 - content.offset().top;
                pos.left = pos.left - 18 - content.offset().left;
                showAppsSelector(pos);
            }
        });

        showChangedApps();

        function showAppsSelector(pos) {
            $('#listof-apps').remove();

            var listofApps = $('<div id="listof-apps"><div class="tip"></div><div class="scrollable"></div><div class="button-container"><a class="icon-button dark btn-done">' + jQuery.i18n.map["common.done"] + '</a><a class="icon-button dark btn-select-all">' + jQuery.i18n.map["common.select-all"] + '</a><a class="icon-button dark btn-deselect-all">' + jQuery.i18n.map["common.deselect-all"] + '</a></div></div>').hide(),
                listofAppsScrollable = listofApps.find('.scrollable');
                ap = function(app){
                    return $('<div class="app" data-app-id="' + app._id + '"><div class="image" style="background-image: url(\'/files/' + app._id + '.png\');"></div><div class="name">' + app.name + '</div><input class="app_id" type="hidden" value="{{this._id}}"/></div>');
                };

            for (var id in allApps) {
                var app = allApps[id], el = ap(app);
                el.on('click', function(){
                    var self = $(this),
                        id = self.attr('data-app-id'),
                        selected = ! self.hasClass('selected');
                    if (selected) {
                        addToArray(id, message.apps);
                        addToArray(allApps[id].name, message.appNames);
                    } else {
                        removeFromArray(id, message.apps);
                        removeFromArray(allApps[id].name, message.appNames);
                    }
                    self.toggleClass('selected');
                    showChangedApps();
                })
                if (message.apps.indexOf(app._id) !== -1) el.addClass('selected');
                listofAppsScrollable.append(el);
            };

            listofApps.find('.btn-select-all').on('click', function(ev) {
                ev.preventDefault();

                message.apps = [];
                message.appNames = [];
                for (var i in allApps) {
                    message.apps.push(allApps[i]._id);
                    message.appNames.push(allApps[i].name);
                }
                showChangedApps();
                $(this).hide();
                listofApps.find(".btn-deselect-all").show();
            });

            listofApps.find('.btn-deselect-all').on('click', function(ev) {
                ev.preventDefault();

                message.apps = [];
                message.appNames = [];
                showChangedApps();
                $(this).hide();
                listofApps.find(".btn-select-all").show();
            });

            listofApps.find('.btn-done').on('click', function (ev) {
                ev.preventDefault();

                fillAppsPlatforms();
                showPlatforms();

                listofApps.remove();
            });

            if (message.apps.length === lengthOfObject(allApps)) {
                listofApps.find('.btn-select-all').hide();
                listofApps.find('.btn-deselect-all').show();
            }

            // return listofApps;
            // content.find('.app-list-names').text(message.appNames.join(', '));
            listofApps.appendTo(content).offset(pos).show();
            // $(body).offset(buttonPos).append(listofApps);

            // listofAppsScrollable.slimScroll({
            //     height: '100%',
            //     start: 'top',
            //     wheelStep: 10,
            //     position: 'right'
            // });

        }
    }

    // Check APN / GCM credentials and set platform buttons accordingly
    if (isView) {
        if (!hasInArray(APN, message.platforms)) content.find('.view-platforms .ios').hide();
        if (!hasInArray(GCM, message.platforms)) content.find('.view-platforms .android').hide();
    } else {
        fillAppsPlatforms(duplicate);

        if (message.noPlatforms) {
            content.find('.field.platforms').hide();
        }

        if (!message.platforms.length) {
            return false;
        }

        dialog.find('.push-platform').on('click', function (ev){
            ev.preventDefault();

            var platform = $(this).attr('data-platform');

            if (hasInArray(platform, message.platforms)) {
                removeFromArray(platform, message.platforms);
            } else {
                addToArray(platform, message.platforms);
            }
            showPlatforms();
        });

        showPlatforms();
    }

    // Set up message type select
    var heights = {
        message: 540,
        update: 540,
        review: 540,
        data: 378,
        link: 613,
        category: 613
    };
    if (message.noPlatforms && message.noApps) for (var k in heights) heights[k] -= 90;

    if (isView) {
        content.find('.view-type .view-value').text(jQuery.i18n.map['push.type.' + message.type]);
        // CountlyHelpers.changeDialogHeight(dialog, 470);
        // setTimeout(CountlyHelpers.changeDialogHeight.bind(CountlyHelpers, dialog, dialog.height(), undefined), 20);
        // setTimeout(CountlyHelpers.changeDialogHeight.bind(CountlyHelpers, dialog, message.type == 'data' ? 310 : 470), 20);
        setTimeout(CountlyHelpers.changeDialogHeight.bind(CountlyHelpers, dialog), 20);
    } else {
        CountlyHelpers.initializeSelect(content);

        content.find(".type .cly-select .text").on('changeData', function(e){
            setMessageType($(this).data('value'));
        });

        var link = content.find('.field.link'),
            category = content.find('.field.category'),
            msg = content.find('.field.msg'),
            sound = content.find('.extra-sound-check').parents('tr'),
            badge = content.find('.extra-badge-check').parents('tr'),
            data = content.find('.extra-data-check').parents('tr');

        if (message.type == 'link') {
            link.find('.push-link').val(message.url);
        }

        if (message.type == 'category') {
            category.find('.push-category').val(message.category);
        }

        function setMessageType(type) {
            message.type = type;
            content.find('.type .cly-select .text').text(jQuery.i18n.map['push.type.' + type]);

            if (type === 'message' || type === 'update' || type === 'review') {
                link.slideUp(100);
                category.slideUp(100);
                msg.slideDown(100);
                sound.slideDown(100);
                badge.slideDown(100);
                data.slideDown(100);
            } else if (type === 'data') {
                link.slideUp(100);
                category.slideUp(100);
                msg.slideUp(100);
                sound.slideDown(100);
                badge.slideDown(100);
                data.slideDown(100);
            } else if (type === 'link') {
                link.slideDown(100);
                category.slideUp(100);
                msg.slideDown(100);
                sound.slideDown(100);
                badge.slideDown(100);
                data.slideDown(100);
            } else if (type === 'category') {
                link.slideUp(100);
                category.slideDown(100);
                msg.slideDown(100);
                sound.slideDown(100);
                badge.slideDown(100);
                data.slideDown(100);
            }

            checkMessageForSendButton();

            setTimeout(CountlyHelpers.changeDialogHeight.bind(null, dialog, true), 120);
            // setTimeout(CountlyHelpers.changeDialogHeight.bind(null, dialog, true), 40);
            // CountlyHelpers.changeDialogHeight(dialog, true);
            // CountlyHelpers.changeDialogHeight(dialog, heights[type], true);
        }

        setTimeout(setMessageType.bind(this, message.type), 20);
    }

    // Date / send later
    if (isView) {
        var fmt = 'MMM DD, YYYY HH:mm';
        content.find('.view-date .view-value').text(message.date ? moment(message.date).format(fmt) : '');
        if (message.result && message.result.error) {
            var msg = typeof message.result.error === 'string' ? message.result.error : (message.result.error.message || message.result.error.toString());
            var code = typeof message.result.error === 'object' ? message.result.error.code : undefined;

            var title = jQuery.i18n.map['push.error'] + (message.result.error.code ? ' #' + message.result.error.code : '');
            content.find('.view-sent .title').text(title);

            if (msg.length > 20) {
                content.find('.view-sent .view-value').html('<a class="icon-button delete-app">Show</a>');
                content.find('.view-sent .view-value .delete-app').on('click', function(){
                    CountlyHelpers.alert(msg, "red");
                });
            } else {
                content.find('.view-sent .view-value').addClass('error').text(msg);
            }

        } else if (message.result && ((message.result.status & 16) || (message.result.status & 32))) {
            content.find('.view-sent .title').text(jQuery.i18n.map['push.error']);
            content.find('.view-sent .view-value').addClass('error').text(jQuery.i18n.map['push.message.status.' + message.result.status]);
        } else if (message.result && message.result.processed) {
            var msg = (message.sent ? moment(message.sent).format(fmt) : '') + '<div class="codes">';
            msg += '<table>';
            msg += '<tr><td>' + jQuery.i18n.map['push.totals.processed'] + '</td><td>' + message.result.processed + '</td></tr>';
            msg += '<tr><td>' + jQuery.i18n.map['push.totals.sent'] + '</td><td>' + message.result.sent + '</td></tr>';
            msg += '<tr><td>' + jQuery.i18n.map['push.totals.errors'] + '</td><td>' + message.result.errors + '</td></tr>';
            msg += '</table>';
            if ( message.result.errorCodes) {
                msg += '<h5>' + jQuery.i18n.map['push.errorCodes'] + '</h5><table>';
                for (var code in message.result.errorCodes) {
                    msg += '<tr><td>' + jQuery.i18n.map['push.errorCode.' + code] + '</td><td>' + message.result.errorCodes[code] + '</td></tr>';
                }
                msg += '</table>';
            }
            msg += '</div>';
            content.find('.view-sent .view-value').html(msg);
        // } else {
           // content.find('.view-sent .view-value').text(message.sent ? moment(message.sent).format(fmt) : '');
        }
    } else {
        //ignore clicks inside calendar
        content.find(".date-picker-push").click(function(e){
            e.stopPropagation();
        });
        var hidePicker = function(e){
            $(document.body).off('click', hidePicker);
            content.find(".date-picker-push").hide();
        };

        function setTimeText() {
            var laterText = moment(content.find(".send-later-datepicker").datepicker("getDate")).format("DD.MM.YYYY");
            laterText += ", " + content.find(".time-picker-push").find("span.active").text();

            content.find(".send-later-date").text(laterText);
            content.find(".send-later-date").data("timestamp", moment(laterText, "DD.MM.YYYY, H:mm").unix());
        }

        function initTimePicker(isToday) {
            var timeSelected = false;
            content.find(".time-picker-push").html("");

            if (isToday) {
                var currHour = parseInt(moment().format("H"), 10),
                    currMin = parseInt(moment().format("m"), 10),
                    timePickerStartHour = moment().format("H");

                if (currMin < 30) {
                    content.find(".time-picker-push").append('<span class="active">' + timePickerStartHour + ':30</span>');
                    timeSelected = true;
                }

                timePickerStartHour = currHour + 1;
            } else {
                timePickerStartHour = 0;
            }

            for (; timePickerStartHour <= 23; timePickerStartHour++) {
                if (timeSelected) {
                    content.find(".time-picker-push").append('<span>' + timePickerStartHour + ':00</span>');
                } else {
                    content.find(".time-picker-push").append('<span class="active">' + timePickerStartHour + ':00</span>');
                    timeSelected = true;
                }

                content.find(".time-picker-push").append('<span>' + timePickerStartHour + ':30</span>');
            }
        }

        content.find(".send-later-datepicker").datepicker({
            numberOfMonths:1,
            showOtherMonths:true,
            minDate:new Date(),
            onSelect:function (selectedDate) {
                var instance = $(this).data("datepicker"),
                    date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                if (moment(date).format("DD-MM-YYYY") == moment().format("DD-MM-YYYY")) {
                    initTimePicker(true);
                } else {
                    initTimePicker();
                }
            }
        });

        content.find(".send-later-datepicker").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

        initTimePicker(true);

        // content.find(".send-later").next('label').on("click", content.find(".send-later").trigger.bind(content.find(".send-later"), "click"));
        content.find(".send-later").on("click", function (e) {
            if ($(this).is(":checked")) {
                content.find(".date-picker-push").show();
                setTimeText();
                $(document.body).off('click', hidePicker).on('click', hidePicker);
            } else {
                content.find(".date-picker-push").hide();
                content.find(".send-later-date").text("");
            }

            e.stopPropagation();
        });

        content.find(".send-later-date").on('click', function(e){
            e.stopPropagation();

            $(document.body).off('click', hidePicker);

            if (content.find(".date-picker-push").is(':visible')) {
                content.find(".date-picker-push").hide();
            } else {
                content.find(".date-picker-push").show();
                $(document.body).on('click', hidePicker);
            }
        });

        content.find(".time-picker-push").on("click", "span", function() {
            content.find(".time-picker-push").find("span").removeClass("active");
            $(this).addClass("active");
            setTimeText();
        });
    }

    // Locales / message
    // {
        message.usedLocales = {};
        var ul = content.find('.locales ul'),
            txt = content.find('.msg textarea'),
            li = function(percentage, locale, title){
                var el = $('<li data-locale="' + locale + '"><span class="percentage">' + percentage + '%</span><span class="locale">' + title + '</span><span class="fa fa-check"></span>' + (locale === 'default' ? '' :  ' <span class="fa fa-remove"></span>') + '</li>')
                        .on('click', function(){
                            var selected = ul.find('.selected').attr('data-locale');
                            message.messagePerLocale[selected] = txt.val();

                            setMessagePerLocale(locale);
                        })
                        .on('click', '.fa-remove', function(ev){
                            ev.stopPropagation();

                            txt.val('');
                            delete message.messagePerLocale[locale];

                            setUsedLocales();
                        });
                return el;
            };

        function fillLocales() {
            ul.empty();
            if ('default' in message.usedLocales) {
                ul.append(li(Math.round(100 * message.usedLocales['default']), 'default', jQuery.i18n.map["push.locale.default"]).addClass('selected'));
            }

            var sortable = [], locale;
            for (locale in message.usedLocales) if (locale !== 'default') {
                sortable.push([locale, message.usedLocales[locale]]);
            }
            sortable.sort(function(a, b) { return b[1] - a[1]; });

            for (var i in sortable) {
                ul.append(li(Math.round(100 * sortable[i][1]), sortable[i][0], (languages[sortable[i][0]] || '').englishName));
            }

            var def;
            if ('default' in message.usedLocales) def = 'default';
            else for (var k in sortable) { def = sortable[k][0]; break; }
            setMessagePerLocale(def);
        }

        function setMessagePerLocale(selected) {
            ul.find('li').each(function(){
                var li = $(this), locale = li.attr('data-locale');

                if (message.messagePerLocale[locale]) {
                    li.addClass('set');
                } else {
                    li.removeClass('set');
                }

                if (selected === locale) {
                    li.addClass('selected');
                } else {
                    li.removeClass('selected');
                }

            });
            txt.val(message.messagePerLocale[selected] || '');
        }

        if (isView) {
            message.usedLocales = _.extend({}, message.locales);
            fillLocales();

            if (message.type === 'data') {
                content.find('.field.msg').hide();
            }
        } else {
            txt.on('keydown', setUsedLocales);
            // wait for device count download

            // message.apps.forEach(function(appId){
            //     var app = allApps[appId];

            //     if (appId in locales) for (var locale in locales[appId]) {
            //         if (!(locale in message.usedLocales)) message.usedLocales[locale] = 0;
            //         message.usedLocales[locale] += locales[appId][locale];
            //     }
            // });
            // for (var locale in message.usedLocales) message.usedLocales[locale] /= message.apps.length;
        }
    // }

    if (isView) {
        content.find('textarea').prop('disabled', true);
        content.find('.locales').addClass('view-locales');
    }

    // Extras
    if (isView || duplicate) {
        if (message.test) content.find('.extra-test-check').attr('checked', 'checked');
        if (message.sound) {
            content.find('.extras .extra-sound-check').attr('checked', 'checked');
            content.find('.extras .extra-sound').val(message.duplicate.sound);
        } else {
            content.find('.extras .extra-sound-check').removeAttr('checked');
        }
        if (message.badge) {
            content.find('.extras .extra-badge-check').attr('checked', 'checked');
            content.find('.extras .extra-badge').val(message.duplicate.badge);
        }
        if (message.data) {
            content.find('.extras .extra-data-check').attr('checked', 'checked');
            content.find('.extras .extra-data').val(JSON.stringify(message.duplicate.data));
        }
    }

    if (isView) {
        content.find('.extras input, .extra-test-check').prop('disabled', true);
    } else {
        content.find('.extras table input[type="checkbox"], .extra-test-check').on('change', function(ev){
            message[$(this).attr('data-attr')] = $(this).is(':checked');
            showExtras();

            $(this).parents('td').next('td').find('input').focus();
            if ($(this).attr('data-attr') === 'test') {
                setDeviceCount();
            }
        });
        content.find('.extras table td.td-value').on('click', function(ev){
            if ($(this).find('input[type="text"]').prop('disabled')) {
                $(this).prev().find('input[type="checkbox"]').trigger('click');
            }
        });
        if (message.noTests) {
            content.find('.test-switch-holder').hide();
        }
        content.find('.extras table label, .test-switch-holder label').on('click', function(ev){
            var box = $(this).prev();
            if (box.is(':checkbox')) {
                box.trigger('click');
            }
        });

        var sound = content.find('.extras .extra-sound'),
            badge = content.find('.extras .extra-badge'),
            data = content.find('.extras .extra-data');
        function showExtras(){
            if (message.sound) sound.prop('disabled', false);
            else sound.prop('disabled', true);

            if (message.badge) badge.prop('disabled', false);
            else badge.prop('disabled', true);

            if (message.data) data.prop('disabled', false);
            else data.prop('disabled', true);
        }

        content.find('.extra-data').on('blur', function(){
            $(this).next('.required').remove();

            var str = $(this).val(), json = toJSON(str);
            if (json) $(this).val(JSON.stringify(json));
            else if (str) {
                $(this).after($("<span>").addClass("required").text("*").show());
            }
        });
    }

    // Buttons
    if (isView) {
        content.find('.btn-send').hide();
        content.find('.btn-duplicate').on('click', function(){
            $("#overlay").trigger('click');
            setTimeout(PushPopup.bind(window, message.duplicate, true), 500);
        });
        content.find('.btn-delete').on('click', function(){
            var butt = $(this).addClass('disabled');
            countlyPush.deleteMessage(message._id, function(msg){
                butt.removeClass('disabled');
                app.activeView.render();
                content.find('.btn-close').trigger('click');
            }, function(error){
                content.find('.btn-close').trigger('click');
            });
        });
    } else {
        content.find('.btn-duplicate').hide();
        content.find('.btn-delete').hide();
        content.find('.btn-send').on('click', function(){
            if ($(this).hasClass('disabled')) return;

            var json = messageJSON();

            $(".required").fadeOut().remove();
            var req = $("<span>").addClass("required").text("*");

            if (!json.apps.length) {
                content.find(".field.apps .app-names").append(req.clone());
            }
            if (!json.platforms.length) {
                content.find(".field.platforms .details").append(req.clone());
            }
            if (message.sound && !json.sound) {
                content.find(".extra-sound").after(req.clone());
            }
            if (message.badge) {
                if (!json.badge || !isNumber(json.badge)) {
                    content.find(".extra-badge").after(req.clone());
                } else {
                    json.badge = 1 * json.badge;
                }
            }
            if (message.data && !json.data) {
                content.find(".extra-data").after(req.clone());
            }
            if (json.type === 'link' && (!json.url || ! /^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(json.url) )) {
                content.find(".field.link .details").after(req.clone());
            }
            if ('default' in message.usedLocales && !json.messagePerLocale['default'] && json.type != 'data') {
                content.find(".locales li").first().append(req.clone());
            }

            if (!$('.required').show().length) {
                var butt = $(this).addClass('disabled');
                countlyPush.createMessage(json, null, function(msg){
                    butt.removeClass('disabled');
                    app.activeView.render();
                    content.find('.btn-close').trigger('click');
                }, function(error){
                    butt.removeClass('disabled');
                    CountlyHelpers.alert(error);
                    // butt.removeClass('disabled');
                });
            }
        });
    }

    content.find('.btn-close').on('click', function(){
        $("#overlay").trigger('click');
    });

    // Device count
    // {
        var count, send = content.find('.btn-send');

        function checkMessageForSendButton() {
            if (typeof message.count === 'undefined' || !message.count.TOTALLY || ('default' in message.usedLocales && !message.messagePerLocale['default'] && message.type != 'data')) {
                send.addClass('disabled');
            } else {
                send.removeClass('disabled');
            }
        }

        function setUsedLocales() {
            var txt = content.find('.msg textarea'),
                selected = content.find('.locales ul li.selected').attr('data-locale');

            if (selected) message.messagePerLocale[selected] = txt.val();

            message.usedLocales = {};
            for (var l in message.count) if (typeof message.count[l] !== 'object') {
                if (l in languages && message.count[l]) {
                    message.usedLocales[l] = message.count[l];
                }
            }
            var all = 0;
            for (var l in message.messagePerLocale) {
                if (message.messagePerLocale[l] && l !== 'default') all += message.usedLocales[l];
            }

            if (message.messagePerLocale['default']) {
                message.usedLocales['default'] = message.count.TOTALLY - all;
            } else if (all < message.count.TOTALLY) {
                message.usedLocales['default'] = message.count.TOTALLY - all;
            }

            if (message.count.TOTALLY) {
                txt.show();
                for (var l in message.usedLocales) {
                    message.usedLocales[l] = (message.usedLocales[l] / message.count.TOTALLY).toFixed(2);
                }
            } else {
                txt.hide();
            }

            checkMessageForSendButton();

            fillLocales();

            if (selected) content.find('.locales ul li[data-locale="' + selected + '"]').trigger('click');
        }

        function setDeviceCount(){
            if (!count) {
                count = content.find('.count-value');
            }
            count.text('');
            countlyPush.getAudience(
                {apps: message.apps, platforms: message.platforms, test: message.test, userConditions: message.userConditions, drillConditions: message.drillConditions, geo: message.geo || undefined},
                function(resp) {
                    message.count = resp;

                    countlyPush.getLangs(message.apps, function(result, transform){
                        var totals = transform ? {TOTALLY: 0} : result;
                        
                        if (transform) {
                            for (var appId in result) {
                                for (var year in result[appId]) if (parseInt(year) == year) {
                                    for (var month in result[appId][year]) if (parseInt(month) == month) {
                                        for (var lang in result[appId][year][month]) if (isNaN(lang)) {
                                            var u = result[appId][year][month][lang].u;
                                            if (typeof u === 'number') {
                                                totals[lang] = totals[lang] ? totals[lang] + u : u;
                                                totals.TOTALLY += u;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        for (var l in totals) {
                            if (l !== 'TOTALLY') { 
                                message.count[l] = Math.floor(message.count.TOTALLY * totals[l] / totals.TOTALLY);
                            }
                        }

                        setUsedLocales();

                        var span = '<span class="green">&nbsp;' + jQuery.i18n.prop('push.count', resp.TOTALLY) + '&nbsp;</span';
                        count.empty().append(jQuery.i18n.map['push.start']).append(span).append(jQuery.i18n.map['push.end']);

                        return totals;
                    });
                },
                function(err){

                }
            );
        }

        setDeviceCount();
   // }

    if (isView) {
        content.find('input, textarea').each(function(){
            $(this).removeAttr('placeholder');
        });
    }

    // Platforms stuff
    function showPlatforms() {
        var ios = content.find('.push-platform.ios'), and = content.find('.push-platform.android');

        if (hasInArray(APN, message.appsPlatforms)) {
            ios.show();
            if (hasInArray(APN, message.platforms)) {
                ios.addClass('active');
            } else {
                ios.removeClass('active');
            }
        } else {
            ios.hide();
        }

        if (hasInArray(GCM, message.appsPlatforms)) {
            and.show();
            if (hasInArray(GCM, message.platforms)) {
                and.addClass('active');
            } else {
                and.removeClass('active');
            }
        } else {
            and.hide();
        }

        setDeviceCount();
    }

    function showChangedApps() {
        if (message.apps.length) {
            content.find(".no-apps").hide();
            content.find(".app-names").text(message.appNames.join(", ")).show();
        } else {
            content.find(".no-apps").show();
            content.find(".app-names").hide();
        }
        content.find('#listof-apps .app').each(function(){
            if (hasInArray($(this).attr('data-app-id'), message.apps)) {
                $(this).addClass('selected');
            } else {
                $(this).removeClass('selected');
            }
        });
    }

    function lengthOfObject(obj) {
        var l = 0;
        for (var i in obj) l++;
        return l;
    }

    function hasInArray(item, array) {
        return array.indexOf(item) !== -1;
    }

    function removeFromArray(item, array) {
        var index = array.indexOf(item);
        if (index !== -1) array.splice(index, 1);
    }

    function addToArray(item, array) {
        removeFromArray(item, array)
        array.push(item);
    }

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function toJSON(str) {
        try {
            var o = jsonlite.parse(str);
            return typeof o === 'object' ? o : false;
        } catch(e){
            return false;
        }
    }

    function fillAppsPlatforms(skipPlatforms) {
        if (!skipPlatforms) message.platforms = [];
        message.appsPlatforms = [];

        message.apps.forEach(function(appId){
            var app = allApps[appId];
            if (app.apn && (app.apn.test || app.apn.prod || app.apn.universal)) {
                if (!skipPlatforms) addToArray(APN, message.platforms);
                addToArray(APN, message.appsPlatforms);
            }
            if (app.gcm && app.gcm.key) {
                if (!skipPlatforms) addToArray(GCM, message.platforms);
                addToArray(GCM, message.appsPlatforms);
            }
        });
    }

    function messageJSON() {
        var txt = content.find('.msg textarea'),
            selected = content.find('.locales ul li.selected').attr('data-locale');

        message.messagePerLocale[selected] = txt.val();

        var json = {
            type: message.type,
            apps: message.apps.slice(0),
            appNames: message.appNames.slice(0),
            platforms: message.platforms.slice(0),
            messagePerLocale: {},
            test: message.test,
            sound: message.sound ? content.find('.extra-sound').val() : '',
            badge: message.badge ? content.find('.extra-badge').val() : '',
            data:  message.data  ? content.find('.extra-data').val()  : '',
            update: message.type === 'update',
            review: message.type === 'review',
            url: message.type === 'link' ? content.find('.push-link').val() : '',
            category: message.type === 'category' ? content.find('.push-category').val() : '',
            locales: message.usedLocales,
            date: content.find('.send-later:checked').length ? content.find('.send-later-date').data('timestamp') : null,
            userConditions: message.userConditions,
            drillConditions: message.drillConditions,
            geo: message.geo
        };

        if (json.sound === '') delete json.sound;
        if (json.badge === '') delete json.badge;
        if (json.data  === '') delete json.data;
        if (json.url  === '') delete json.url;
        if (json.category  === '') delete json.category;
        if (!json.update) delete json.update;
        if (!json.review) delete json.review;
        if (!json.userConditions) delete json.userConditions;
        if (!json.drillConditions) delete json.drillConditions;
        if (!json.geo) delete json.geo;
        if (json.data) json.data = toJSON(json.data);

        for (var l in message.messagePerLocale) if (message.messagePerLocale[l]) {
            json.messagePerLocale[l] = message.messagePerLocale[l];
        }
        return json;
    }

    CountlyHelpers.revealDialog(dialog);
    // CountlyHelpers.revealDialog(dialog, heights[message.type]);
};


//register views
app.messagingDashboardView = new MessagingDashboardView();
app.messagingListView = new MessagingListView();

app.route('/messaging', 'messagingDashboardView', function () {
    this.renderWhenReady(this.messagingDashboardView);
});
app.route('/messaging/messages', 'messagingListView', function () {
    this.renderWhenReady(this.messagingListView);
});

var settingsAppId,
    apn, gcm;

function changeApp(appId){
    settingsAppId = appId;
    if(!countlyGlobal["apps"][appId] || countlyGlobal["apps"][appId].type == "mobile"){
        $(".appmng-push").show();
    } 
    else{
        $(".appmng-push").hide();
    }

    if (!appId) { return; }

    apn = countlyGlobal['apps'][appId].apn = countlyGlobal['apps'][appId].apn || {};
    gcm = countlyGlobal['apps'][appId].gcm = countlyGlobal['apps'][appId].gcm || {};

    $("#push-apn-cert-uni-view").removeClass('fa fa-remove').removeClass('fa fa-check').addClass(apn.universal ? 'fa fa-check' : 'fa fa-remove');
    $("#view-gcm-key").html(gcm.key || '<i class="fa fa-remove"></i>');
    $("#gcm-key").val(gcm.key || '');

    $('.app-apn-cert-old')[apn.prod || apn.test ? 'show' : 'hide']();
    $('.app-apn-cert-old .dev')[apn.test ? 'show' : 'hide']();
    $('.app-apn-cert-old .prod')[apn.prod ? 'show' : 'hide']();

}

function pushAppMgmt(){
    app.localize();

    if (!settingsAppId) { return; }
    else { changeApp(settingsAppId); }

    window.pushSubmitting = false;
    $("#save-app-edit").on('click', function () {
        if (window.pushSubmitting) { return; }
        window.pushSubmitting = true;

        var certProd = $('#apns_cert_prod').val().split('.').pop().toLowerCase();
        if (certProd && $.inArray(certProd, ['p12']) == -1) {
            CountlyHelpers.alert(jQuery.i18n.map["management-applications.push-error"], "red");
            return false;
        }

        var loading = CountlyHelpers.loading(jQuery.i18n.map["management-applications.checking"]);

        var forms = 1 + (certProd ? 1 : 0),
        reactivateForm = function() {
            forms--;
            if (forms == 0) {
                window.pushSubmitting = false;
                CountlyHelpers.removeDialog(loading);
            }
            changeApp(settingsAppId);
        },
        showError = function(msg){
            CountlyHelpers.removeDialog(loading);
            CountlyHelpers.alert(msg, "red");
        };

        $.ajax({
            type:"GET",
            url:countlyCommon.API_URL + "/i/pushes/update",
            data:{
                args:JSON.stringify({
                    app_id:settingsAppId,
                    "gcm.key": $("#gcm-key").val() || undefined
                }),
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"jsonp",
            success:function (data) {
                if (data.error) {
                    showError(jQuery.i18n.map["management-applications.gcm-creds-error"]);
                    forms = 1;
                    reactivateForm();
                    return;
                }
                if (!countlyGlobal['apps'][settingsAppId].apn) countlyGlobal['apps'][settingsAppId].apn = {};
                if (!countlyGlobal['admin_apps'][settingsAppId].apn) countlyGlobal['admin_apps'][settingsAppId].apn = {};

                if (!countlyGlobal['apps'][settingsAppId].gcm) countlyGlobal['apps'][settingsAppId].gcm = {};
                if (!countlyGlobal['admin_apps'][settingsAppId].gcm) countlyGlobal['admin_apps'][settingsAppId].gcm = {};
                
                if(data.gcm){
                    countlyGlobal['apps'][settingsAppId].gcm.key = data.gcm.key;
                    countlyGlobal['admin_apps'][settingsAppId].gcm.key = data.gcm.key;
                }

                changeApp(settingsAppId);

                if (certProd) {
                    $('#add-edit-apn-creds-uni-form').find("input[name=app_id]").val(settingsAppId);
                    $('#add-edit-apn-creds-uni-form').ajaxSubmit({
                        resetForm:true,
                        beforeSubmit:function (formData, jqForm, options) {
                            formData.push({ name:'_csrf', value:countlyGlobal['csrf_token'] });
                            formData.push({ name:'api_key', value:countlyGlobal.member.api_key });
                        },
                        success:function (resp) {
                            if (!resp || resp.error) {
                                if (countlyGlobal['apps'][settingsAppId].apn) {
                                    delete countlyGlobal['apps'][settingsAppId].apn.universal;
                                    delete apn.universal;
                                }
                                showError(jQuery.i18n.map["management-applications.push-apn-creds-prod-error"] + (resp.error ? ' (' + resp.error + ')' : ''));
                            } else {
                                if (!countlyGlobal['apps'][settingsAppId].apn) {
                                    apn = countlyGlobal['apps'][settingsAppId].apn = {universal: resp};
                                } else {
                                    apn.universal = countlyGlobal['apps'][settingsAppId].apn.universal = resp;
                                }
                            }

                            reactivateForm();
                        }
                    });
                }

                reactivateForm();
            }
        });
    });
};


var managementAdd = "";
app.addPageScript("/manage/apps", function(){
    if(managementAdd == "")
        $.get(countlyGlobal["path"]+'/push/templates/push-management.html', function(src){
            managementAdd = src;
            addPushHTMLIfNeeded();
            pushAppMgmt();
        });
    else
        pushAppMgmt();
});


function addPushHTMLIfNeeded() {
    if ($('.appmng-push').length === 0) {
        $(".app-details table tr.table-edit").before(managementAdd);
        $('.appmng-push').prev().removeClass('table-edit-prev');
    }
}

app.addAppManagementSwitchCallback(function(appId, type){
    if(type == "mobile"){
        addPushHTMLIfNeeded();
        $(".appmng-push").show();
        changeApp(appId);
    } 
    else{
        $(".appmng-push").hide();
    }
});

app.addPageScript("/drill#", function(){
    if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
        $("#bookmark-filter").after(
        '<div id="create-message-connector" style="display:none; float:left; height:1px; border-top:1px solid #999; width:50px; margin-top:14px; margin-left:5px;"></div>'+
        '<a class="icon-button green btn-header btn-create-message" data-localize="push.create" style="display:none"></a>');
        app.localize();
        $('.btn-create-message').off('click').on('click', function(){
            var filterData = app.drillView.getFilterObjAndByVal();
            var message = {
                apps: [countlyCommon.ACTIVE_APP_ID],
                platforms: [],
                drillConditions: countlySegmentation.getRequestData()
            };
    
            // for (var k in filterData.dbFilter) {
            //     if (k.indexOf('up.') === 0) message.conditions[k.substr(3).replace("cmp_","cmp.")] = filterData.dbFilter[k];
            // }
    
            PushPopup(message, false, true);
        });
        $("#bookmark-view").on("click", ".bookmark-action.send", function() {
            var filter = $(this).data("query");
    
            var message = {
                apps: [countlyCommon.ACTIVE_APP_ID],
                platforms: [],
                drillConditions: filter
            };
    
            // for (var k in filter) {
            //     if (k.indexOf('up.') === 0) message.conditions[k.substr(3).replace("cmp_","cmp.")] = filter[k];
            // }
    
            PushPopup(message, false, true);
        });
    }
});

app.addPageScript("/users#", function(){
    if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type == "mobile"){
        //check if it is profile view
        if(app.activeView.updateEngagement){
            var userDetails = countlyUserdata.getUserdetails();
        
            var platforms = [], test = false, prod = false;
            if (userDetails.tk) {
                if (userDetails.tk.id || userDetails.tk.ia || userDetails.tk.ip) { platforms.push('i'); }
                if (userDetails.tk.at || userDetails.tk.ap) { platforms.push('a'); }
        
                test = !!userDetails.tk.id || !!userDetails.tk.ia || !!userDetails.tk.at;
                prod = !!userDetails.tk.ip || !!userDetails.tk.ap;
            }
            if (!$('.btn-create-message').length) {
                $('.widget-header .left').append($('<a class="icon-button green btn-header left btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));
            }
            $('.btn-create-message').show().off('click').on('click', function(){
                if (platforms.length) {
                    PushPopup({
                        platforms: platforms,
                        apps: [countlyCommon.ACTIVE_APP_ID],
                        test: test && !prod,
                        userConditions: {_id: app.userdetailsView.user_id}
                    }, true, true);
                } else {
                    CountlyHelpers.alert(jQuery.i18n.map["push.no-user-token"], "red");
                }
            });
        }
        else{
            //list view
            if (!$('.btn-create-message').length) {
                $('.widget-header .left').append($('<a class="icon-button green btn-header left btn-create-message" data-localize="push.create"></a>').text(jQuery.i18n.map['push.create']));
            }
            $('.btn-create-message').off('click').on('click', function(){
                //drill filter
                var filterData = app.userdataView._query || {};
                
                //known/anonymous filter
                if(app.userdataView.filter == "user-known")
                    filterData["hasInfo"] = true;
                else if(app.userdataView.filter == "user-anonymous")
                    filterData["hasInfo"] = {"$ne": true};
                
                //text search filter
                if($('.dataTables_filter input').val().length)
                    filterData["$text"] = { "$search": "\""+$('.dataTables_filter input').val()+"\"" };
                
                var message = {
                    apps: [countlyCommon.ACTIVE_APP_ID],
                    platforms: [],
                    userConditions: filterData
                };
                
                PushPopup(message, false, true);
            });
        }
    }
});

$( document ).ready(function() {
    $.get(countlyGlobal["path"]+'/push/templates/push-create.html', function(src){
        $("body").append(src);
    });
    Handlebars.registerPartial("message", $("#template-message-partial").html());
    Handlebars.registerHelper('messageText', function (context, options) {
        return CountlyHelpers.messageText(context.messagePerLocale);
    });

    Handlebars.registerHelper('ifMessageStatusToRetry', function (status, options) {
        return status == MessageStatus.Error ? options.fn(this) : '';
    });
    Handlebars.registerHelper('ifMessageStatusToStop', function (status, options) {
        return status == MessageStatus.InProcessing || status == MessageStatus.InQueue ? options.fn(this) : '';
    });

    var menu = '<a class="item messaging" id="sidebar-messaging">'+
        '<div class="logo ion-chatbox-working"></div>'+
        '<div class="text" data-localize="push.sidebar.section">Messaging</div>'+
    '</a>'+
    '<div class="sidebar-submenu" id="messaging-submenu">'+
        '<a href="#/messaging" class="item">'+
            '<div class="logo-icon fa fa-line-chart"></div>'+
            '<div class="text" data-localize="push.sidebar.overview">Overview</div>'+
        '</a>'+
        '<a href="#/messaging/messages" class="item">'+
            '<div class="logo-icon fa fa-inbox""></div>'+
            '<div class="text" data-localize="push.sidebar.messages">Messages</div>'+
        '</a>'+
    '</div>';
    if($('#mobile-type #management-menu').length)
        $('#mobile-type #management-menu').before(menu);
    else
        $('#mobile-type').append(menu);
});
