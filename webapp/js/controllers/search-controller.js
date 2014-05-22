define(['app', 'searchService'], function(app)
{'use strict';

    app.register.controller('searchController', ['$scope', 'searchService',
    function($scope, searchService)
    {

        $scope.search = function()
        {
            var promise = searchService.search("toto").then(function(result)
            { debugger;
            });
            
            promise['catch'](function()
            { debugger;
            });            
        };
    }]);
});
