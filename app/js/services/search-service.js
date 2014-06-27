define(['app'], function(app)
{'use strict';

    app.register.service('searchService', ['proxyService', 'config', 
    function(proxyService, config)
    {
        return {
            search : function(query)
            {
                return proxyService({
                    method : 'get',
                    cachekey : 'search',
                    request : 'search',
                    query: query,
                });
            },
        };
    }]);
});
