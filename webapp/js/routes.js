define(['app'], function(app)
{
	return app.config(['$routeProvider', 'routeResolverProvider', '$controllerProvider', '$compileProvider', '$filterProvider', '$provide', '$locationProvider', 'config',
	function($routeProvider, routeResolverProvider, $controllerProvider, $compileProvider, $filterProvider, $provide, $locationProvider, config)
	{
		$locationProvider.html5Mode(true).hashPrefix('!');

		app.register = {
			controller : $controllerProvider.register,
			directive : $compileProvider.directive,
			filter : $filterProvider.register,
			factory : $provide.factory,
			service : $provide.service,
			provider : $provide.provider,
			constant : $provide.constant
		};

		// Define routes - controllers will be loaded dynamically
		var route = routeResolverProvider.route;

		$routeProvider.when(config.page.search, route.resolve('searchTemplate', 'searchController', ['searchController'], ['gridStyle']));

		$routeProvider.otherwise({
			redirectTo : config.page.search
		});
	}]);
});
