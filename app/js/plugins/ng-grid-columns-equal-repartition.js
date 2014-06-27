function angularGridColumnsEqualsRepartition($filter)
{
    var self = this;
    self.init = function(scope, grid, $filter)
    {
        self.grid = grid;
        scope.gridOptions.$gridScope.$on('ngGridEventColumns', function(event, columns)
        {
            if (columns.length == 0) {
                return;
            }

            self.ensureColumnsRepartition(columns);
        });
    };

    self.ensureColumnsRepartition = function(columns)
    {
        if (self.repartionDone) {
            return;
        }

        var resizableColumns = $filter('filter')(columns, function(column)
        {
            return column.visible && column.colDef && !column.colDef.width;
        });

        var columnsCount = resizableColumns.length;
        if (columnsCount == 0) {
            if (columns.length > 0) {
                self.repartionDone = true;
            }

            return;
        }

        self.repartionDone = true;
        var extraWidth = self.grid.$viewport.width();
        var naturalWidth = self.grid.$canvas.width() + 1;

        // Let place for the scroll
        extraWidth -= (18 + naturalWidth);

        if (extraWidth > 0) {
            angular.forEach(resizableColumns, function(column, index)
            {
                var width = column.width + Math.floor(this.extraWidth / this.columnsCount--);
                if (width < column.minWidth) {
                    width = column.minWidth;
                }
                if (width > column.maxWidth) {
                    width = column.maxWidth;
                }
                column.width = width;
                column.colDef.width = width;
                this.extraWidth -= width;
            }, {
                columnsCount : columnsCount,
                extraWidth : extraWidth
            });
        }

        angular.forEach(columns, function(column, index)
        {
            var minWidth = column.colDef.minWidth || 10;
            if (column.width < minWidth) {
                column.width = minWidth;
                column.colDef.width = minWidth;
            }
        });
    };
}
