define(['app', 'modalService'], function(app)
{'use strict';

    app.register.directive('contextmenu', ['$document', '$compile', '$filter', 'modalService', '$timeout',
    function($document, $compile, $filter, modalService, $timeout)
    {
        var itemdefaults = {
            textAttribute : '_text',
            valueAttribute : '_value',
            itemtext : function(value)
            {
                if ( typeof value != 'undefined') {
                    this[this.textAttribute] = value;
                }
                else {
                    return this[this.textAttribute];
                }
            },
            itemvalue : function(value)
            {
                if ( typeof value != 'undefined') {
                    this[this.valueAttribute] = value;
                }
                else {
                    return this[this.valueAttribute];
                }
            },
        };

        var defaults = {
            autoFocus : false,
            autoSelect : true,
            filter : null,
            position : {
                my : "left top",
                at : "left bottom",
                collision : "flipfit",
                within : "body"
            },
            items : {},
            parentElement : null,
            selectedIndex : -1,
            visibleItems : function()
            {
                return $filter('filter')(this.items, function(item)
                {
                    return item.visible != false && !item.filtered && item.itemvalue();
                });
            },
            next : function(value)
            {
                var item = typeof value == 'number' ? this.items[value] : value || this.selectedItem();
                if (item) {
                    var visibleItems = this.visibleItems();
                    var index = visibleItems.indexOf(item);
                    return index >= 0 && index < visibleItems.length - 1 && visibleItems[++index];
                }
                else {
                    return this.first();
                }
            },
            prev : function(value)
            {
                var item = typeof value == 'number' ? this.items[value] : value || this.selectedItem();
                if (item) {
                    var visibleItems = this.visibleItems();
                    var index = visibleItems.indexOf(item);
                    return index > 0 && index < visibleItems.length && visibleItems[--index];
                }
                else {
                    return this.last();
                }
            },
            first : function()
            {
                var visibleItems = this.visibleItems();
                return visibleItems.length && visibleItems[0];
            },
            last : function()
            {
                var visibleItems = this.visibleItems();
                return visibleItems.length && visibleItems[visibleItems.length - 1];
            },
            selectedItem : function(value)
            {
                var that = this;

                if ( typeof value == 'number') {
                    // Selected index specified
                    that.selectedItem(value >= 0 && value < that.items.length ? that.items[value] : null);
                }
                else if ( value instanceof jQuery) {
                    // Selected element specified
                    var selectedItem = null;
                    angular.forEach(that.items, function(item, index)
                    {
                        if (item.element.is(value)) {
                            selectedItem = item;
                        }
                    });

                    that.selectedItem(selectedItem);
                }
                else if ( typeof value != 'undefined') {
                    var selectedValue = value && value.itemvalue && value.itemvalue() || value;
                    var selectedItem = null;
                    that.selectedIndex = -1;
                    angular.forEach(that.items, function(item, index)
                    {
                        if (selectedValue && item.itemvalue() == selectedValue) {
                            selectedItem = item;
                            that.selectedIndex = index;
                            item.element && item.element.addClass("contextmenu-item-active");
                        }
                        else {
                            item.element && item.element.removeClass("contextmenu-item-active");
                        }
                    });

                    that.scrollToView(selectedItem && selectedItem.element);

                    // Callback
                    that.onitemselected && that.onitemselected(selectedItem);
                }
                else {
                    return that.selectedIndex >= 0 && that.selectedIndex < that.items.length ? that.items[that.selectedIndex] : null;
                }
            },
            scrollToView : function(element)
            {
                if (!element || !element.is(":visible")) {
                    return;
                }

                var parent = element.parent();
                var maxHeight = parent.height() - element.height() - 1;
                var min = parent.scrollTop();
                var max = min + maxHeight;
                var position = min + element.position().top;
                if (position < min) {
                    parent.animate({
                        scrollTop : position
                    }, 100);
                    // Not in view so scroll to it
                    return false;
                }
                else if (position > max) {
                    parent.animate({
                        scrollTop : position - maxHeight
                    }, 100);
                    // Not in view so scroll to it
                    return false;
                }
                return true;
            },
            // Callbacks
            onopened : null,
            onopening : null,
            onclosed : null,
            onresized : null,
            onitemclicked : null,
            onitemselected : null,
            onitemsrequired : null,
        };

        return {
            restrict : 'E',
            template : '<ul class="contextmenu transparent"></ul>',
            replace : true,
            scope : true,
            compile : function()
            {
                return {
                    pre : function($scope, element, attrs)
                    {
                        var backdropHtml = '<div class="contextmenu-backdrop" ng-click="options.close()"></div>';
                        var backdrop = angular.element(backdropHtml);
                        $compile(backdrop)($scope);
                        $('body').append(backdrop);
                        backdrop.hide();
                        element.hide();

                        var escape = function(value)
                        {
                            return value && value.toString().replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
                        };

                        var onKeyDown = function(e)
                        {
                            switch ( e.keyCode )
                            {
                                case $.ui.keyCode.HOME:
                                    var item = $scope.options.first();
                                    item && $scope.options.selectedItem(item);
                                    break;
                                case $.ui.keyCode.END:
                                    var item = $scope.options.last();
                                    item && $scope.options.selectedItem(item);
                                    break;
                                case $.ui.keyCode.PAGE_UP:
                                case $.ui.keyCode.UP:
                                    if (e.altKey) {
                                        $scope.options.close();
                                    }
                                    else if (!e.ctrlKey) {
                                        var item = $scope.options.prev();
                                        item && $scope.options.selectedItem(item);
                                    }
                                    break;
                                case $.ui.keyCode.PAGE_DOWN:
                                case $.ui.keyCode.DOWN:
                                    if (e.altKey) {
                                        $scope.options.close();
                                    }
                                    else if (!e.ctrlKey) {
                                        var item = $scope.options.next();
                                        item && $scope.options.selectedItem(item);
                                    }
                                    break;
                                case $.ui.keyCode.LEFT:
                                case $.ui.keyCode.ESCAPE:
                                case $.ui.keyCode.RIGHT:
                                    $scope.options.close();
                                    break;
                                case $.ui.keyCode.ENTER:
                                case $.ui.keyCode.SPACE:
                                    var selectedElement = $scope.options.selectedItem();
                                    selectedElement && $scope.onitemclicked(selectedElement.itemvalue());
                                    break;
                                default:
                                    if (!$scope.options.autoSelect) {
                                        return;
                                    }

                                    var previousText = $scope.options.currentFilter && $scope.options.currentFilter.text || "";
                                    var currentText = String.fromCharCode(e.keyCode);
                                    var selectedElement = $scope.options.selectedItem() && $scope.options.selectedItem().element;

                                    $timeout.cancel(this.filterTimer);

                                    if (currentText == previousText) {
                                        // Next match
                                    }
                                    else {
                                        // New Match
                                        currentText = previousText + currentText;

                                        var regex = new RegExp("^" + escape(currentText), "i");
                                        $scope.options.currentFilter = element.children(".contextmenu-item").filter(function()
                                        {
                                            return regex.test($(this).children("a").text());
                                        });

                                        $scope.options.currentFilter.text = currentText;
                                    }

                                    // If no matches on the current filter, reset to the last character pressed
                                    // to move down the menu to the first item that starts with that character
                                    if (!$scope.options.currentFilter.length) {
                                        currentText = String.fromCharCode(e.keyCode);
                                        regex = new RegExp("^" + escape(currentText), "i");
                                        $scope.options.currentFilter = element.children(".contextmenu-item").filter(function()
                                        {
                                            return regex.test($(this).children("a").text());
                                        });

                                        $scope.options.currentFilter.text = currentText;
                                    }

                                    if ($scope.options.currentFilter.length) {
                                        var currentIndex = selectedElement ? $scope.options.currentFilter.index(selectedElement) : -1;
                                        if (++currentIndex >= $scope.options.currentFilter.length) {
                                            currentIndex = 0;
                                        }
                                        $scope.options.selectedItem($scope.options.currentFilter.eq(currentIndex));

                                        if ($scope.options.currentFilter.length > 1) {
                                            this.filterTimer = $timeout(function()
                                            {
                                                delete $scope.options.currentFilter;
                                            }, 1000);
                                        }
                                        else {
                                            delete $scope.options.currentFilter;
                                        }
                                    }
                                    else {
                                        delete $scope.options.currentFilter;
                                    }

                            }
                        };

                        $scope.onitemclicked = function(value)
                        {
                            var clickedItems = $filter('filter')($scope.options.items, function(item)
                            {
                                return item.itemvalue() == value;
                            });

                            if (clickedItems.length) {
                                var item = clickedItems[0];
                                if (item.onclicked) {
                                    item.onclicked();
                                    $scope.options.close();
                                }
                                else if ($scope.options.onitemclicked) {
                                    $scope.options.onitemclicked(value);
                                }
                            }
                        };

                        var optionsWatcher = function(value)
                        {
                            var closeTimer;

                            $scope.options = value || {};
                            $scope.options.element = element;

                            // Complete the current option instance
                            angular.extend($scope.options, defaults, angular.extend({}, $scope.options));

                            $scope.options.isVisible = function(value)
                            {
                                if ( typeof value != "undefined") {
                                    if (value) {
                                        $scope.options.open();
                                    }
                                    else {
                                        $scope.options.close();
                                    }
                                }
                                else {
                                    return element.is(":visible");
                                }
                            };

                            $scope.options.refresh = function()
                            {
                                angular.forEach($scope.options.items, function(item)
                                {
                                    if (item.visible && !item.filtered) {
                                        item.element.removeClass('hidden');
                                    }
                                    else {
                                        item.element.addClass('hidden');
                                    }

                                    item.element.find('a').text(item.itemtext());
                                });
                            };

                            $scope.options.open = function()
                            {
                                if (!element.is(":visible")) {
                                    // Close all other instances
                                    modalService.closeAllModalInstances();

                                    // Load on demand
                                    if ($scope.options.onitemsrequired) {
                                        if ($scope.options.onitemsrequired($scope.options, function(options)
                                        {
                                            // By callback
                                            if (options) {
                                                optionsWatcher(options);
                                            }

                                            showMenu(true);
                                        })) {
                                            // Open directly
                                            showMenu(true);
                                        }
                                        else {
                                            showMenu(false);
                                        }

                                        // Waiting for callback
                                        return;
                                    }
                                                                        
                                    showMenu(true);
                                }
                            };

                            $scope.options.filter = function(filter)
                            {
                                filter = filter && filter.toLowerCase();
                                var visibleCount = 0;
                                var lastVisibleItem;
                                angular.forEach($scope.options.visibleItems(), function(item)
                                {
                                    item.filtered = filter && item.itemtext().toLowerCase().indexOf(filter) != 0;
                                    if (!item.filtered) {
                                        visibleCount++;
                                        lastVisibleItem = item;
                                    }
                                });

                                $scope.options.refresh();
                                $scope.options.selectedItem(visibleCount == 1 ? lastVisibleItem : null);
                            };

                            function htmlDecode(value)
                            {
                                return $('<div/>').html(value).text();
                            }
                            
                            var showMenu = function(refreshHtml)
                            {                                
                                var event = {
                                    cancelable : true,
                                    cancel : false
                                };
                                $scope.options.onopening && $scope.options.onopening(event);
                                if (event.cancel) {
                                    return;
                                }

                                if (refreshHtml) {
                                    element.empty();
                                    angular.forEach($scope.options.items, function(item)
                                    {
                                        if (item.isSeparator) {
                                            var itemhtml = '<li class="contextmenu-separator' + (item.visible == false || item.filtered ? ' hidden' : '') + '">' + htmlDecode(item.itemtext()) + '</li>';
                                        }
                                        else {
                                            var itemhtml = '<li class="contextmenu-item' + (item.visible == false || item.filtered ? ' hidden' : '') + '"><a ng-click="onitemclicked(\'' + escape(item.itemvalue()) + '\')">' + (htmlDecode(item.itemtext()) || '&nbsp;') + '</a></li>';
                                        }
                                        var itemelement = angular.element(itemhtml);
                                        $compile(itemelement)($scope);
                                        item.element = itemelement;
                                        element.append(itemelement);
                                    });
                                }

                                delete $scope.options.currentFilter;

                                // size and position menu
                                element.show();
                                backdrop.show();

                                $scope.options.resize();

                                if ($scope.options.left) {
                                    $scope.options.position.at = "left+" + $scope.options.left + " bottom";
                                }
                                else {
                                    $scope.options.position.at = "left bottom";
                                }

                                var position = angular.extend({
                                    of : $scope.options.parentElement
                                }, $scope.options.position);
                                element.position(position);

                                if ($scope.options.autoFocus && $scope.options.selectedIndex == -1) {
                                    $scope.options.selectedItem(0);
                                }
                                else {
                                    $scope.options.selectedItem($scope.options.selectedIndex);
                                }

                                element.removeClass('transparent');

                                $scope.options.onopened && $scope.options.onopened();
                                $document.on('keydown', onKeyDown);
                            };

                            $scope.options.close = function(immediate)
                            {
                                if (element.is(":visible")) {
                                    backdrop.hide();
                                    $document.off('keydown', onKeyDown);
                                    $scope.options.onclosed && $scope.options.onclosed();
                                    element.addClass('transparent');
                                    if (closeTimer) {
                                        $timeout.cancel(closeTimer);
                                        closeTimer = null;
                                    }
                                    if (immediate) {
                                        element.hide();
                                    }
                                    else {
                                        closeTimer = $timeout(function()
                                        {
                                            element.hide();
                                        }, 200);
                                    }
                                }
                            };

                            modalService.addModalInstance($scope.$id, function()
                            {
                                $scope.options.close(true);
                            });

                            $scope.options.resize = function()
                            {
                                // Firefox wraps long text (possibly a rounding bug)
                                // so we add 1px to avoid the wrapping (#7513)
                                if ($scope.options.left) {
                                    element.outerWidth(Math.max(element.width("").outerWidth() + 1, 100));
                                }
                                else {
                                    element.outerWidth(Math.max(element.width("").outerWidth() + 1, ($scope.options.parentElement && $scope.options.parentElement.outerWidth()) || 1000));
                                }
                                $scope.options.onresized && $scope.options.onresized();
                            };
                        };

                        $scope.$parent.$watch(attrs.options, optionsWatcher);
                    },
                };
            },
        };
    }]);
});
