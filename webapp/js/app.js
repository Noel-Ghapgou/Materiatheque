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
    });

    return matApp;
});
