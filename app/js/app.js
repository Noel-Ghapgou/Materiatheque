define(['angular', 'routeResolver', 'angularRoute', 'angularGrid', 'proxyService'], function(angular)
{'use strict';

    var matApp = angular.module('matApp', ['ngRoute', 'routeResolverServices', 'config', 'proxyServices', 'ngGrid']);

    matApp.filter('getByProperty', function()
    {
        return function(propertyName, propertyValue, collection)
        {
            var i = 0, len = collection.length;
            for (; i < len; i++) {
                if (collection[i][propertyName] == propertyValue) {
                    return collection[i];
                }
            }
            return null;
        };
    });

    matApp.filter('find', function()
    {
        return function(collection, predicate)
        {
            var i = 0, len = collection.length;
            for (; i < len; i++) {
                if (predicate(collection[i]) === true) {
                    return collection[i];
                }
            }
            return null;
        };
    });

    matApp.run(function($rootScope, config)
    {
        $rootScope.appInfos = config.appInfos;

        //promiseTracker.register('wait');
        $rootScope.$on('$routeChangeStart', function(event, next, current)
        {
            if ($window.sessionStorage.token) {
                return;
            }

            if ($location.path().indexOf(config.page.login) == 0) {
                // already going to #login, no redirect needed
                return;
            }

            // redirect back to login
            var redirectPath = $location.$$path;

            var loc = $location.path(config.page.login);
            if (redirectPath.indexOf(config.page.logout) < 0) {
                loc.$$search.returnUrl = redirectPath;
            }
        });

        $rootScope.$on('event:auth-loginConfirmed', function()
        {
            $translate.uses($window.sessionStorage.lang);

            $('#loginContent').addClass('pt-page-fade');
            var returnUrl = $location.$$search.returnUrl;
            $location.search('returnUrl', null);
            $timeout(function()
            {
                $window.location.pathname = returnUrl ? returnUrl : config.page.home;
            }, 250);
        });

        $rootScope.$on('event:auth-loginCanceled', function()
        {
        });

        $rootScope.$on('event:auth-logouted', function()
        {
        });

        $rootScope.$on('event:request-error', function(event, args)
        {
            if (args.status == 401 && $window && $window.sessionStorage) {
                var redirectPath = $location.$$path;
                var newLocation = $location.path(config.page.login);
                if (redirectPath.indexOf(config.page.login) < 0) {
                    newLocation.search('returnUrl', redirectPath);
                }
            }
            else if (args.status == 401) {
                alert(JSON.stringify(args.response));
                return;
            }
            else {
                var statusText = args.response;
                if ( typeof args.response === 'object') {
                    if (angular.isDefined(args.response.Message)) {
                        statusText = args.response.Message;
                    }
                    else {
                        statusText = JSON.stringify(args.response);
                    }
                }

                var genericErrorMessage = args.status + '\r\nThe server returned the following message:\r\n' + statusText;
                if (genericErrorMessage.indexOf('<!DOCTYPE html') == 0){
                    window.open().document.write(genericErrorMessage);
                }else{
                alert(genericErrorMessage);
                }
            }
        });       
        
    });

    return matApp;
});
