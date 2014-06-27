function angularGridStoreParams(paramServiceFn, hashKey)
{
	var self = this;
	self.init = function(scope, grid)
	{
		self.toggleSelectAll = scope.toggleSelectAll;
		self.grid = grid;
		self.hashKey = hashKey;

		var getHashKey = function()
		{
			if ( typeof hashKey === 'function') {
				return hashKey();
			}
			else {
				return hashKey.toString();
			}
		};

		var getStorableParams = function(columns)
		{
			if (!columns || columns.length == 0) {
				return null;
			}

			var storableParams = {
				hashKey : getHashKey(),
				colInfos : [],
				groupInfos : [],
				sortInfos : []
			};

			angular.forEach(columns, function(value, index)
			{
				if (value.field) {
					storableParams.colInfos.push({
						field : value.field,
						index : value.index,
						width : Math.ceil(value.width),
						visible : value.visible,
					});

					if (value.groupIndex > 0) {
						storableParams.groupInfos.push({
							field : value.field,
							index : value.groupIndex
						});
					}
				}
			});

			var sortInfos = self.grid.config.sortInfo;
			if (sortInfos) {
				for (var i = 0; i < sortInfos.fields.length; i++) {
					var sortinfo = {
						field : sortInfos.fields[i],
						index : i,
						direction : sortInfos.directions[i],
					};

					storableParams.sortInfos.push(sortinfo);
				}
			}

			return storableParams;
		};

		scope.gridOptions.$gridScope.$on('ngGridEventColumns', function(event, columns)
		{     
			if (columns.length == 0) {
				// Columns reset
				delete self.storableParams;
				return;
			}

			if (!self.storableParams) {
				self.storableParams = getStorableParams(columns);
				return;
			}
            
			storableParams = getStorableParams(columns);
			if (!angular.equals(storableParams.colInfos, self.storableParams.colInfos) || !angular.equals(storableParams.groupInfos, self.storableParams.groupInfos) || !angular.equals(storableParams.sortInfos, self.storableParams.sortInfos)) {

				// Columns position /group / sort changed
				self.storableParams = storableParams;
				paramServiceFn(storableParams);
			}
		});
	};
}