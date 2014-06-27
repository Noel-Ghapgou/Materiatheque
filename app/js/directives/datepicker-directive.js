define(['app', 'modalService', 'jqueryUIDatePickerI18n'], function(app)
{'use strict';

    app.register.directive('datepicker', ['$document', '$compile', '$translate', '$dateParser', 'modalService', '$timeout',
    function($document, $compile, $translate, $dateParser, modalService, $timeout)
    {
        var defaults = {
            autoFocus : false,
            dateFormat : 'dd/MM/yy',
            position : {
                my : "left top",
                at : "left bottom",
                collision : "flipfit",
                within : "body"
            },
            parentElement : null,
            _selectedDate : null,
            selectedDate : function(date)
            {
                if ( typeof date != 'undefined') {
                    this._selectedDate = date instanceof Date ? date : null;
                }
                else {
                    return this._selectedDate;
                }
            },
            // Callbacks
            onopening : null,
            onopened : null,
            onclosed : null,
            onresized : null,
            ondateselected : null,
        };

        return {
            restrict : 'E',
            template : '<span class="datepicker transparent"></span>',
            replace : true,
            scope : true,
            compile : function()
            {
                return {
                    pre : function($scope, element, attrs)
                    {
                        var backdropHtml = '<div class="datepicker-backdrop" ng-click="options.close()"></div>';
                        var backdrop = angular.element(backdropHtml);
                        $compile(backdrop)($scope);
                        $('body').append(backdrop);
                        backdrop.hide();
                        element.hide();

                        var escape = function(value)
                        {
                            return value && value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
                        };

                        var onKeyDown = function(e)
                        {
                            switch ( e.keyCode )
                            {
                                case $.ui.keyCode.HOME:
                                    var date = $scope.options.selectedDate();
                                    date.setDate(1);
                                    $scope.options.selectedDate(date);
                                    break;
                                case $.ui.keyCode.END:
                                    var date = $scope.options.selectedDate();
                                    date.setMonth(date.getMonth() + 1);
                                    date.setDate(0);
                                    $scope.options.selectedDate(date);
                                    break;
                                case $.ui.keyCode.PAGE_UP:
                                case $.ui.keyCode.UP:
                                    var date = $scope.options.selectedDate();
                                    if (e.ctrlKey) {
                                        date.setFullYear(date.getFullYear() - 1);
                                    }
                                    else if (e.shiftKey) {
                                        date.setMonth(date.getMonth() - 1);
                                    }
                                    else {
                                        date.setDate(date.getDate() - 7);
                                    }
                                    $scope.options.selectedDate(date);
                                    break;
                                case $.ui.keyCode.PAGE_DOWN:
                                case $.ui.keyCode.DOWN:
                                    var date = $scope.options.selectedDate();
                                    if (e.ctrlKey) {
                                        date.setFullYear(date.getFullYear() + 1);
                                    }
                                    else if (e.shiftKey) {
                                        date.setMonth(date.getMonth() + 1);
                                    }
                                    else {
                                        date.setDate(date.getDate() + 7);
                                    }
                                    $scope.options.selectedDate(date);
                                    break;
                                case $.ui.keyCode.LEFT:
                                    var date = $scope.options.selectedDate();
                                    if (e.ctrlKey) {
                                        date.setFullYear(date.getFullYear() - 1);
                                    }
                                    else if (e.shiftKey) {
                                        date.setMonth(date.getMonth() - 1);
                                    }
                                    else {
                                        date.setDate(date.getDate() - 1);
                                    }
                                    $scope.options.selectedDate(date);
                                    break;
                                case $.ui.keyCode.RIGHT:
                                    var date = $scope.options.selectedDate();
                                    if (e.ctrlKey) {
                                        date.setFullYear(date.getFullYear() + 1);
                                    }
                                    else if (e.shiftKey) {
                                        date.setMonth(date.getMonth() + 1);
                                    }
                                    else {
                                        date.setDate(date.getDate() + 1);
                                    }
                                    $scope.options.selectedDate(date);
                                    break;
                                case $.ui.keyCode.ESCAPE:
                                    $scope.options.close();
                                    break;
                                case $.ui.keyCode.ENTER:
                                case $.ui.keyCode.SPACE:
                                    var date = $scope.options.selectedDate();
                                    $scope.options.ondateselected && $scope.options.ondateselected(date);
                                    break;
                                default:
                                    $timeout.cancel(this.filterTimer);

                                    this.previousFilter = (this.previousFilter || "") + e.char;
                                    if (this.previousFilter == 'now' || this.previousFilter == 'today') {
                                        $scope.options.selectedDate(new Date());
                                        delete this.previousFilter;
                                    }
                                    else {
                                        try {
                                            var date = $dateParser(this.previousFilter, $scope.options.dateFormat);
                                        }
                                        catch (e) {
                                            // Wrong date format, waiting for next char
                                        };

                                        if (date) {
                                            $scope.options.selectedDate(date);
                                        }

                                        var that = this;
                                        this.filterTimer = $timeout(function()
                                        {
                                            delete that.previousFilter;
                                        }, 2000);
                                    }
                            }

                            e.stopPropagation();
                        };

                        var dataWatcher = function(value)
                        {
                            var closeTimer;
                            
                            $scope.options = angular.extend(value || {}, $.datepicker.regional[$translate.uses()] || $.datepicker.regional['']);
                            $scope.options.element = element;

                            // Extend the current option instance
                            for (name in defaults) {
                                if (!$scope.options[name]) {
                                    $scope.options[name] = defaults[name];
                                }
                            };

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

                            $scope.options.open = function()
                            {
                                if (!element.is(":visible")) {
                                    var event = {
                                        cancelable : true,
                                        cancel : false
                                    };
                                    $scope.options.onopening && $scope.options.onopening(event);
                                    if (event.cancel) {
                                        return;
                                    }

                                    // Close all other instances
                                    modalService.closeAllModalInstances();

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

                                    element.position(angular.extend({
                                        of : $scope.options.parentElement
                                    }, $scope.options.position));

                                    if ($scope.options._selectedDate) {
                                        $scope.options.selectedDate($scope.options._selectedDate);
                                        $scope.options._selectedDate = null;
                                    }

                                    element.removeClass('transparent');

                                    $scope.options.onopened && $scope.options.onopened();
                                    $document.on('keydown', onKeyDown);
                                }
                            };

                            $scope.options.selectedDate = function(value)
                            {
                                if ( value instanceof Date) {
                                    $(element).datepicker("setDate", value);
                                }
                                else if (value === null) {
                                    $scope.options.selectedDate(new Date());
                                }
                                else if ( typeof value != 'undefined') {
                                    // Try to parse
                                    var date = $filter('date')(date[value.toString(), that.dateFormat]);
                                    $scope.options.selectedDate( date instanceof Date ? date : null);
                                }
                                else {
                                    return element.datepicker("getDate");
                                }
                            };

                            $scope.options.close = function(immediate)
                            {
                                if (element.is(":visible")) {
                                    backdrop.hide();
                                    $scope.options.onclosed && $scope.options.onclosed();
                                    $document.off('keydown', onKeyDown);
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

                            $scope.options.onSelect = function(value, picker)
                            {
                                $scope.$apply(function()
                                {
                                    $scope.options.ondateselected && $scope.options.ondateselected(element.datepicker("getDate"));
                                });
                            };

                            $scope.options.resize = function()
                            {
                                // Firefox wraps long text (possibly a rounding bug)
                                // so we add 1px to avoid the wrapping (#7513)
                                element.outerWidth(Math.max(element.width("").outerWidth() + 1, 100));
                                $scope.options.onresized && $scope.options.onresized();
                            };

                            element.datepicker($scope.options);
                        };

                        $scope.$parent.$watch(attrs.options, dataWatcher);
                    },
                };
            },
        };
    }]);
});
