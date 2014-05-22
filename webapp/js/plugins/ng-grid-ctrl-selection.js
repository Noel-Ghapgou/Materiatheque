function angularGridCtrlSelection()
{
	var self = this;
	self.init = function(scope, grid)
	{
		self.toggleSelectAll = scope.toggleSelectAll;

		var redefineChangeSelectionFunction = function()
		{
			var selectionProvider = scope.gridOptions.$gridScope.selectionProvider;
			selectionProvider.ChangeSelectionBase = selectionProvider.ChangeSelection;
			selectionProvider.ChangeSelection = function(rowItem, evt)
			{
				if (evt && !evt.shiftKey && !evt.ctrlKey && selectionProvider.multi) {
					self.toggleSelectAll(false);
					selectionProvider.setSelection(rowItem, true);
				}
				else {
					selectionProvider.ChangeSelectionBase(rowItem, evt);
				}
				selectionProvider.lastClickedRow = rowItem;
				selectionProvider.lastClickedRowIndex = rowItem.rowIndex;
				return true;
			};
		};

		scope.$watch(scope.gridOptions, redefineChangeSelectionFunction);
	};

}