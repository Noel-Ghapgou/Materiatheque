define(['angular'], function(angular)
{
    angular.module('proxyServices', []).service('proxyService', ['$http', '$q', '$cacheFactory', '$window', '$rootScope',
    function($http, $q, $cacheFactory, $window, $rootScope)
    {
        // This is the extent of $cacheFactory's configuration
        var metaCache = $cacheFactory('metaCache', {
            // This cache can hold 1000 items
            capacity : 1000
        });

        return function(config)
        {
            var deferred = $q.defer();

            config.data = config.data || {};
            config.xhrFields = {
                withCredentials : true
            };
            config.headers = {
                "session-id" : $window.sessionStorage.token
            };

            var cachekey = (config.cachekey || config.cached) && config.url + (config.cachekey || '*');
            var tracker = config.tracker;
            var data = cachekey && metaCache.get(cachekey);
            if (data) {
                deferred.resolve(data);
            }
            else {
                $http(config).error(function(data, status, headers, config)
                {
                    tracker && promiseTracker(tracker).cancel();

                    if (status == 401)// Unauthorized
                    {
                        delete $window.sessionStorage.token;
                    }

                    if (!angular.isDefined(config.broadcastError) || config.broadcastError) {
                        $rootScope.$broadcast('event:request-error', {
                            response : data,
                            status : status,
                            config : config
                        });
                    }
                    
                    deferred.reject({
                        data : data,
                        status : status,
                        headers : headers,
                        config : config
                    });
                }).success(function(data, status, headers, config)
                {
                    var headerSessionId = headers('session-id');
                    if (headerSessionId == '@DEL@') {
                        delete $window.sessionStorage.token;
                    }
                    else if (headerSessionId) {
                        $window.sessionStorage.token = headerSessionId;
                    }
                    if (cachekey) {
                        metaCache.put(cachekey, data);
                    }

                    deferred.resolve(data, status, headers, config);
                });
            }

            return deferred.promise;
        };
    }]);
});
