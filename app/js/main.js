// Read config
$.getJSON('config.json', function(json)
{
    var config = json;

    config.route = {
        baseUrl : config.baseUrl, /* Must be absolute url and begin with '/' */
        paths : {
            jqueryUI : 'lib/jquery/js/ui/jquery-ui',
            jqueryUIWidget : 'lib/jquery/js/ui/jquery.ui.widget',
            jqueryUICore : 'lib/jquery/js/ui/jquery.ui.core',
            jqueryUIPosition : 'lib/jquery/js/ui/jquery.ui.position',
            jqueryUIMenu : 'lib/jquery/js/ui/jquery.ui.menu',
            jqueryUIAutocomplete : 'lib/jquery/js/ui/jquery.ui.autocomplete',
            jqueryUIDatePickerI18n : 'lib/jquery/js/ui/i18n/jquery-ui-i18n',
            angular : 'lib/angular/angular',
            angularDateParser : 'lib/angular/angular-dateparser',
            angularRoute : 'lib/angular/angular-route',
            angularResource : 'lib/angular/angular-resource',
            angularBusy : 'lib/angular/angular-busy',
            angularAnimate : 'lib/angular/angular-animate',
            angularTranslate : 'lib/angular/angular-translate',
            promiseTracker : 'lib/angular/promise-tracker',
            angularGrid : 'lib/ng-grid/ng-grid',
            text : 'lib/require/text',
            qrcode : 'lib/qrcode/qrcode',
            app : 'js/app',
            routes : 'js/routes',
            routeResolver : 'js/providers/route-resolver',
            socketProvider : 'js/providers/socket-provider',
            loginController : 'js/controllers/login-controller',
            headerController : 'js/controllers/header-controller',
            loginControllers : 'js/controllers/login-controllers',
            searchController : 'js/controllers/search-controller',
            proxyService : 'js/services/proxy-service',
            searchService : 'js/services/search-service',
            modalService : 'js/services/modal-service',
            qrcodeService : 'js/services/qrcode-service',
            dialogService : 'js/services/dialog-service',
            qrcodeDirective : 'js/directives/qrcode-directive',
            datepickerDirective : 'js/directives/datepicker-directive',
            multiselectDirective : 'js/directives/multiselect-directive',
            contextmenuDirective : 'js/directives/contextmenu-directive',
            angularGridAutoHeightPlugin : 'js/plugins/ng-grid-auto-height',
            angularGridCtrlSelection : 'js/plugins/ng-grid-ctrl-selection',
            angularGridStoreParams : 'js/plugins/ng-grid-storeparams',
            angularGridDoubleClick : 'js/plugins/ng-grid-double-click',
            angularGridColumnsRepartition : 'js/plugins/ng-grid-columns-equal-repartition'
        },
        css : {
            gridStyle : 'lib/ng-grid/css/ng-grid.css',
        },
        templates : {
            loginTemplate : '{baseUrl}templates/login.html',
            searchTemplate : '{baseUrl}templates/search.html',
            logoutTemplate : '{baseUrl}templates/logout.html',
            gridCellEmptyTemplate : '{baseUrl}templates/grid-cell-emptytemplate.html',
            inputPopupTemplate : '{baseUrl}templates/input-popup.html',
            gridMenuTemplate : 'templates/grid-menu-template.html',
        },
        shim : {
            'angular' : {
                'exports' : 'angular'
            },
            'jqueryUIPosition' : ['jqueryUI'],
            'jqueryUIMenu' : ['jqueryUI'],
            'jqueryUIAutocomplete' : ['jqueryUI'],
            'jqueryUIWidget' : ['jqueryUI'],
            'jqueryUIDatePickerI18n' : ['jqueryUI'],
            'angularGrid' : ['angular'],
            'angularAnimate' : ['angular'],
            'angularBusy' : ['angular', 'angularAnimate'],
            'angularRoute' : ['angular'],
            'angularResource' : ['angular'],
            'angularTranslate' : ['angular'],
            'qrcodeDirective' : ['angular', 'qrcode'],
        },
        priority : ['angular']
    };

    // Format config
    function formatConfig(section)
    {
        for (var name in section) {
            if ( typeof section[name] == "object") {
                formatConfig(section[name]);
            }
            else if ( typeof section[name] == "string") {
                var value = section[name];
                var sp = value.indexOf('{');
                var lp = sp == 0 ? value.indexOf('}') : null;
                if (lp) {
                    var keyw = value.substring(sp + 1, lp);
                    if (config[keyw]) {
                        section[name] = config[keyw] + value.substring(++lp);
                    }
                }
            }
        }
    };
    formatConfig(json);

    // http://code.angularjs.org/1.2.1/docs/guide/bootstrap#overview_deferred-bootstrap
    window.name = 'NG_DEFER_BOOTSTRAP!';

    require(config.route, ['angular', 'app', 'routes'], function(angular, app)
    {
        var $html = angular.element(document.getElementsByTagName('html')[0]);

        angular.module('config', []).constant('config', config);

        angular.element().ready(function()
        {
            angular.resumeBootstrap([app['name']]);
        });
    });
});
