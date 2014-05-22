define(['app'], function(app)
{'use strict';

    app.register.service('searchService', ['proxyService', 'config', 
    function(proxyService, config)
    {
        return {
            search : function(query)
            {
                var searchRequest = {
                    query : query
                };

                return proxyService({
                    method : 'post',
                    url : config.search.searchUrl,
                    data : searchRequest,
                });
            },
        };
    }]);
});
