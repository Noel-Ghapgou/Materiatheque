// opts:
//	minHeight : (int) minimum height
// 	maxHeight : (int) maximum height
// 	sizeToContent : (bool) true : size to content, false : size to remaining height
function angularGridAutoHeightPlugin(opts)
{
    var optsDefaults = {
        minHeight : null,
        maxHeight : null,
        sizeToContent : true,
    };

    opts = angular.extend({}, optsDefaults, opts);

    var self = this;
    self.grid = null;
    self.scope = null;
    self.init = function(scope, grid, services)
    {
        self.domUtilityService = services.DomUtilityService;
        self.grid = grid;
        self.scope = scope;

        if (opts.sizeToContent) {
            var recalcHeightForData = function()
            {
                setTimeout(innerRecalcForData, 1);
            };
            var innerRecalcForData = function()
            {
                var gridId = self.grid.gridId;
                var footerPanelSel = '.' + gridId + ' .ngFooterPanel';
                var extraHeight = self.grid.$topPanel.height() + $(footerPanelSel).height();
                var naturalHeight = self.grid.$canvas.height() + 1;
                if (self.grid.$topPanel.width() < self.grid.$canvas.width()) {
                    naturalHeight += 18;
                }

                if (opts.minHeight != null && (naturalHeight + extraHeight) < opts.minHeight) {
                    naturalHeight = opts.minHeight - extraHeight - 2;
                }
                if (opts.maxHeight != null && (naturalHeight + extraHeight) > opts.maxHeight) {
                    naturalHeight = opts.maxHeight - extraHeight - 2;
                }

                var newViewportHeight = naturalHeight + 2;
                if (!self.scope.baseViewportHeight || self.scope.baseViewportHeight !== newViewportHeight) {
                    self.grid.$viewport.css('height', newViewportHeight + 'px');
                    self.grid.$root.css('height', (newViewportHeight + extraHeight) + 'px');
                    self.scope.baseViewportHeight = newViewportHeight;
                    self.domUtilityService.RebuildGrid(self.scope, self.grid);
                }
            };
            self.scope.catHashKeys = function()
            {
                var hash = '', idx;
                for (idx in self.scope.renderedRows) {
                    hash += self.scope.renderedRows[idx].$$hashKey;
                }
                return hash;
            };
            self.scope.$watch('catHashKeys()', innerRecalcForData);
            self.scope.$watch(self.grid.config.data, recalcHeightForData);
        }
        else {
            self.scope.$watch(self.grid.config.data, self.calcGridIdealSize);
            scope.gridOptions.$gridScope.$on('ngGridEventGroups', function(event)
            {
                self.calcGridIdealSize();
            });
            scope.$on('ngGridEventRecalcSize', function(event){
                self.calcGridIdealSize();
            });
            $(window).resize(function()
            {
                self.calcGridIdealSize();
            });
        }
    };

    self.calcGridIdealSize = function()
    {
        var height = $('body').height() - self.grid.$root.offset().top;
        if (opts.minHeight != null && height < opts.minHeight) {
            height = opts.minHeight;
        }
        if (opts.maxHeight != null && height > opts.maxHeight) {
            height = opts.maxHeight;
        }

        var gridId = self.grid.gridId;
        var footerPanelSel = '.' + gridId + ' .ngFooterPanel';
        var extraHeight = self.grid.$topPanel.height() + ($(footerPanelSel).is(":visible") ? $(footerPanelSel).height() : 0) + (opts.bottomMargin || 0);
        var newViewportHeight = height - extraHeight;
        if (!self.scope.baseViewportHeight || self.scope.baseViewportHeight !== newViewportHeight) {
            self.grid.$root.css('height', height + 'px');
            self.domUtilityService.RebuildGrid(self.scope, self.grid);
            setTimeout(function()
            {
                self.grid.$viewport.css('height', newViewportHeight + 'px');
            }, 200);
            self.scope.baseViewportHeight = newViewportHeight;
        }
    };
}