define(['app', 'datepickerDirective', 'contextmenuDirective', 'angularDateParser'], function(app)
{'use strict';

    app.register.constant('multiselectModes', {
        select : 0x1,
        autoComplete : 0x2,
        freeText : 0x4,
        datePicker : 0x8,
        multiselect : 0x10,
        hasInput : 0x1E,
        hasDropDown : 0xD
    });

    app.register.directive('multiselect', ['$filter', '$compile', 'multiselectModes', '$parse', '$dateParser', '$timeout',
    function($filter, $compile, multiselectModes, $parse, $dateParser, $timeout)
    {
        // Complexe object for the selected item in multiselect mode
        var multiSelectItem = function()
        {
            return {
                _selectedItem : null,
                tostring : function()
                {
                    if (this._freeText) {
                        return this._freeText;
                    }

                    var stack = [];
                    var currentItem = this._selectedItem;
                    var additionalText = this.filteredItems && this.filteredItems.additionalText;
                    var currentPosition = 0;
                    var lastPosition = 0;
                    while (currentItem) {
                        // Add the item text
                        var itemtext = currentItem.tostring && currentItem.tostring() || currentItem.toString();
                        stack.push(itemtext);
                        currentItem.position = {
                            start : lastPosition,
                            end : currentPosition + itemtext.length,
                        };
                        currentPosition = lastPosition = currentItem.position.end;
                        // Add a space
                        stack.push(' ');
                        currentPosition++,
                        // Get the additional text of the last item
                        additionalText = currentItem.filteredItems && currentItem.filteredItems.additionalText;
                        currentItem = currentItem._selectedItem;
                    };

                    // Add the additional text of the last item
                    stack.push(additionalText);

                    return stack.join('');
                },
                toQueryString : function()
                {
                    if (this._freeText) {
                        return this._freeText.indexOf(' ') ? '"' + this._freeText + '"' : this._freeText;
                    }

                    var text = [];
                    var currentItem = this._selectedItem;
                    while (currentItem) {
                        var value = currentItem.itemvalue();
                        if ( value instanceof Date) {
                            var txt = value.toISOString();
                        }
                        else {
                            var txt = value && value.toString() || currentItem.toString();
                        }
                        var hasSpace = txt.indexOf(' ') > 0;
                        hasSpace && text.push('"');
                        text.push(txt);
                        hasSpace && text.push('"');
                        text.push(' ');
                        currentItem = currentItem._selectedItem;
                    };

                    return text.join('');
                },
                last : function()
                {
                    var current = this._selectedItem;
                    while (current && current._selectedItem) {
                        current = current._selectedItem;
                    }

                    return current || this;
                },
                previous : function(item)
                {
                    var current = this._selectedItem != item && this._selectedItem;
                    while (current && current._selectedItem && current._selectedItem != item) {
                        current = current._selectedItem;
                    }

                    return current && current._selectedItem && current;
                },
                atPosition : function(position)
                {
                    var current = this._selectedItem;
                    (!current || !current.position) && this.tostring();
                    while (current) {
                        if (current.position && current.position.start <= position && current.position.end > position) {
                            return {
                                current : current,
                                textBefore : current.tostring().substr(0, position - current.position.start - 1)
                            };
                        }
                        current = current._selectedItem;
                    }

                    return null;
                }
            };
        };

        multiSelectItem.equals = function(item1, item2)
        {
            if (!item1 && !item2) {
                return true;
            }
            else if ( item1 ? !item2 : item2) {
                return false;
            }
            else if (item1._freeText != item2._freeText) {
                return false;
            }

            var current1 = item1._selectedItem;
            var current2 = item2._selectedItem;
            while (current1 && current2) {
                if (!angular.equals(current1.itemvalue(), current2.itemvalue()) || current1.itemtext() != current2.itemtext()) {
                    return false;
                }
                current1 = current1._selectedItem;
                current2 = current2._selectedItem;
            }

            return !current1 && !current2;
        };

        multiSelectItem.parse = function(options, text, isQueryString)
        {
            try {
                var item = new multiSelectItem();
                item.items = options.normalizedItems(options.items);
                var currentItem = item;
                var openParenthesis = options.openParenthesisItems()[0];
                var closeParenthesis = options.closeParenthesisItems()[0];

                if (text) {
                    var validateSelection = function(currentItem, displayName, isQueryString)
                    {
                        var selectedItem;
                        var currentItems;
                        var filteredItems;
                        var additionalText;
                        if (currentItem.items == '[date]' || currentItem.items == '[date-range]') {
                            // Try to parse
                            try {
                                var date = $dateParser(displayName, isQueryString ? '' : options.dateFormat);
                                var text = isQueryString ? $filter('date')(date, options.dateFormat) : displayName;
                            }
                            catch (e) {
                                return null;
                            };

                            var dateItem = angular.extend({}, itemdefaults);
                            dateItem.itemvalue(date);
                            dateItem.itemtext(text);
                            dateItem.isValue = true;
                            dateItem.isDate = true, selectedItem = dateItem;

                            if (currentItem.items == '[date-range]') {
                                selectedItem.items = options.rangeOperatorItems();
                                selectedItem.items[0].items = '[date]';
                            }
                        }
                        else if (currentItem.items == '[value]' || currentItem.items == '[value-range]') {
                            selectedItem = options.normalizedItems([displayName])[0];
                            selectedItem.isValue = true;
                            if (currentItem.items == '[value-range]') {
                                selectedItem.items = options.rangeOperatorItems();
                                selectedItem.items[0].items = '[value]';
                            }
                        }
                        else if (currentItem.isOperator || currentItem.isOpenParenthesis) {
                            // No current item, root list is displayed
                            currentItems = options.normalizedItems(options.items);
                        }
                        else if (!currentItem.items) {
                            currentItems = options.andOrOperatorsItems();
                        }
                        else {
                            currentItems = options.normalizedItems(currentItem.items);
                        }

                        if (currentItems) {
                            if (isQueryString) {
                                var matchItems = $filter('filter')(currentItems, function(value)
                                {
                                    return value.itemvalue() == displayName;
                                });
                            }
                            else {
                                var matchItems = $filter('filter')(currentItems, function(value)
                                {
                                    return value.itemtext().toLowerCase() == displayName.toLowerCase();
                                });

                                if (!matchItems.length) {
                                    filteredItems = $filter('filter')(currentItems, function(value)
                                    {
                                        return value.itemtext().toLowerCase().indexOf(displayName.toLowerCase()) == 0;
                                    });

                                    filteredItems.additionalText = filteredItems.length > 0 ? displayName : '';
                                }
                            }

                            selectedItem = matchItems.length > 0 ? matchItems[0] : null;
                        }

                        selectedItem && (currentItem._selectedItem = selectedItem);
                        currentItem.filteredItems = filteredItems;
                        return selectedItem;
                    };

                    var createFreeTextItem = function(text)
                    {
                        var item = new multiSelectItem();
                        item._freeText = text;
                        return item;
                    };

                    item.inquote = false;
                    var currentWord = [];
                    var ensureNextChar = false;
                    angular.forEach(text, function(chr, index)
                    {
                        if (currentItem) {
                            if (ensureNextChar) {
                                currentWord.push(chr);
                                ensureNextChar = false;
                            }
                            else if (!item.inquote && chr == openParenthesis.itemtext()) {
                                // Validate current word
                                if (currentWord.length) {
                                    currentItem = validateSelection(currentItem, currentWord.join(''), isQueryString);
                                    currentWord = [];
                                }

                                currentItem.items = options.openParenthesisItems();
                                currentItem._selectedItem = currentItem.items[0];
                                currentItem = currentItem._selectedItem;
                            }
                            else if (!item.inquote && chr == closeParenthesis.itemtext()) {
                                if (currentWord.length) {
                                    currentItem = validateSelection(currentItem, currentWord.join(''), isQueryString);
                                    currentWord = [];
                                }

                                currentItem.items = options.closeParenthesisItems();
                                currentItem._selectedItem = currentItem.items[0];
                                currentItem = currentItem._selectedItem;
                            }
                            else if (item.inquote && item.inquote == chr) {
                                item.inquote = null;
                            }
                            else if (chr == '"' || chr == "'") {
                                item.inquote = chr;
                            }
                            else if (chr == '\\') {
                                currentWord.push(chr);
                                ensureNextChar = true;
                            }
                            else if (chr != ' ' || item.inquote) {
                                currentWord.push(chr);
                            }
                            else if (currentWord.length) {
                                // Validate current word
                                currentItem = validateSelection(currentItem, currentWord.join(''), isQueryString);
                                currentWord = [];
                            }
                        }
                    });

                    var lastItem = currentItem;
                    if (lastItem && currentWord.length) {
                        // Validate last word
                        var lastItem = validateSelection(lastItem, currentWord.join(''), isQueryString);
                        currentItem.position = {
                            start : text.length - currentWord.length,
                            end : text.length - 1,
                        };
                    }

                    if (!lastItem) {
                        var regex = new RegExp("^\".*\"$", "i");
                        if (regex.test(text)) {
                            return multiSelectItem.parse(options, text.substr(1, text.length - 2), isQueryString);
                        }
                        else if (currentItem && currentItem.filteredItems && currentItem.filteredItems.length > 0) {
                            // Auto select
                        }
                        else {
                            return createFreeTextItem(text);
                        }
                    }
                }

                return item;
            }
            catch (e) {
                console.log("Error at MultiSelect.parse: fail to parse text, " + e.toString());
                return createFreeTextItem(text);
            }
        };

        // Item extension
        var itemdefaults = {
            textAttribute : '_text',
            valueAttribute : '_value',
            itemtext : function(value)
            {
                if ( typeof value != 'undefined') {
                    this[this.textAttribute] = value;
                }
                else {
                    return this[this.textAttribute] || '';
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
            tostring : function()
            {
                var formated = [];
                var text = this.itemtext();
                var hasSpace = text.indexOf(' ') > 0;
                hasSpace && formated.push('"');
                formated.push(text);
                hasSpace && formated.push('"');
                return formated.join('');
            },
        };

        // Wait item
        var waititem = angular.extend({}, itemdefaults);
        waititem.isWaitItem = true;

        // Base control default options
        var defaults = {
            mode : multiselectModes.select,
            items : [waititem],
            _selectedItem : null,
            selectedtext : '',
            textAttribute : '_text',
            valueAttribute : '_value',
            dateFormat : 'dd/MM/yy',
            dropDownWithin : "body",
            formatSelectionCssClass : function(element)
            {
                return undefined;
            },
            _isReadOnly : false,
            isReadOnly : function(value)
            {
                if ( typeof value != 'undefined') {
                    this._isReadOnly = value;
                }
                else {
                    return this._isReadOnly;
                }
            },
            visibleItems : function()
            {
                return $filter('filter')(this.items, function(value)
                {
                    return value.visible != false;
                });
            },
            normalizedItems : function(items)
            {
                var that = this;
                var resultitems = [];
                angular.forEach(items || that.items, function(item)
                {
                    if (that.mode == multiselectModes.multiselect) {
                        var msitem = angular.extend({}, itemdefaults);
                        if ( typeof item === 'string') {
                            msitem.itemtext(item);
                            msitem.itemvalue(item);
                        }
                        else {
                            msitem.itemtext(item[that.textAttribute]);
                            msitem.itemvalue(item[that.valueAttribute]);
                        }
                        if (item.updatable) {
                            msitem.updatable = item.updatable;
                        }
                        angular.extend(msitem, item, angular.extend({}, msitem));
                        this.push(msitem);
                    }
                    else {
                        var value = null;
                        if ( typeof item === 'string') {
                            value = item;
                            item = {};
                        }

                        item.textAttribute = that.textAttribute;
                        item.valueAttribute = that.valueAttribute;
                        angular.extend(item, itemdefaults, angular.extend({}, item));

                        if (value) {
                            item.itemtext(value);
                            item.itemvalue(value);
                        }

                        this.push(item);
                    }
                }, resultitems);

                return resultitems;
            },
            andOrOperatorsItems : function()
            {
                var items = this.normalizedItems(['AND', 'OR']);
                items[0].isOperator = true;
                items[1].isOperator = true;
                return items;
            },
            rangeOperatorItems : function()
            {
                var items = this.normalizedItems(['-']);
                items[0].isOperator = true;
                return items;
            },
            openParenthesisItems : function()
            {
                var items = this.normalizedItems(['(']);
                items[0].isOpenParenthesis = true;
                items.isParenthesis = true;
                return items;
            },
            closeParenthesisItems : function()
            {
                var items = this.normalizedItems([')']);
                items[0].isCloseParenthesis = true;
                items.isParenthesis = true;
                return items;
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
            queryString : function(value)
            {
                if ( typeof value == 'undefined') {
                    return this._selectedItem && this._selectedItem.toQueryString() || '';
                };

                if (this.mode == multiselectModes.multiselect) {
                    return this.selectedItem(multiSelectItem.parse(this, value, true));
                }
                else {
                    return this.selectedItem(value);
                }
            },
            selectedItem : function(value)
            {
                var that = this;
                if ( typeof value == 'undefined') {
                    return that._selectedItem;
                };

                if (that.mode == multiselectModes.multiselect) {
                    if ( typeof value == 'string') {
                        return that.selectedItem(multiSelectItem.parse(that, value));
                    }
                    else {
                        // Check for modification
                        if (multiSelectItem.equals(that._selectedItem, value)) {
                            that._selectedItem = value;
                            return that._selectedItem;
                        }

                        that._selectedItem = value;
                        that.selectedtext = that._selectedItem && that._selectedItem.tostring() || '';
                    }
                }
                else if (that.mode == multiselectModes.datePicker) {
                    if ( value instanceof Date || value === null) {
                        var dateItem = angular.extend({}, itemdefaults);
                        dateItem.itemvalue(value);
                        dateItem.itemtext( value ? $filter('date')(value, that.dateFormat) : value);
                        dateItem.isValue = true;
                        dateItem.isDate = true;

                        if (angular.equals(dateItem, that._selectedItem)) {
                            that._selectedItem = dateItem;
                            return that._selectedItem;
                        };

                        that._selectedItem = dateItem;
                        that.selectedtext = dateItem.itemtext();
                    }
                    else {
                        // Try to parse
                        try {
                            var date = $dateParser(value.toString(), that.dateFormat);
                        }
                        catch (e) {
                            var date = null;
                        };
                        return that.selectedItem( date instanceof Date ? date : null);
                    }
                }
                else if ( typeof value == 'number') {
                    // Selected index specified
                    return that.selectedItem(value >= 0 && value < that.items.length ? that.items[value] : null);
                }
                else {
                    var selectedValue = value && value.itemvalue && value.itemvalue() || value;
                    var selectedItem = null;
                    for (var i = 0; i < (that.items || []).length; i++) {
                        if (that.items[i].itemvalue() == selectedValue) {
                            selectedItem = that.items[i];
                            break;
                        }
                    }

                    if (angular.equals(that._selectedItem, selectedItem)) {
                        return null;
                    }

                    // Callback
                    that._selectedItem = selectedItem;
                    that.selectedtext = selectedItem && selectedItem.itemtext() || '';
                }

                return (that.onitemselected && that.onitemselected(that._selectedItem)) || that._selectedItem;
            },
            // Callbacks
            onitemselected : null,
            onitemsrequired : null,
            ondropdownopening : null,
            ondropdownopened : null,
            onkeydown : null,
            ontextchanged : null
        };

        // Main control
        return {
            restrict : 'E',
            template : '<span class="multiselect" tabindex="0"><input ng-show="hasInput()" ng-model="options.selectedtext" ng-trim="false"></input><span class="placeHolder" ng-hide="hasInput()">{{options.selectedtext}}</span><span ng-show="hasDropDown()" class="multiselect-dropdown-button"></span></span>',
            replace : true,
            scope : true,
            compile : function()
            {
                return {
                    pre : function($scope, element, attrs)
                    {
                        var selectChoice = 'input';
                        var multiSelecteParserTimer;
                        var lastClickedPosition = {
                            offsetX : 0,
                            offsetY : 0
                        };

                        $scope.hasInput = function()
                        {
                            return $scope.options.mode & multiselectModes.hasInput;
                        };

                        $scope.hasDropDown = function()
                        {
                            return $scope.options.mode & multiselectModes.hasDropDown;
                        };

                        // For multiselect only, current listed item
                        $scope.dropdown = {
                            datepicker : null,
                            context : null,
                        };

                        $scope.dtpoptions = {
                            parentElement : element,
                            ondateselected : function(value)
                            {
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    var currents = this.currents;
                                    var current = currents.current;

                                    if (!$scope.options._selectedItem) {
                                        var newItem = new multiSelectItem();
                                        newItem.items = $scope.options.items;
                                        current = $scope.options.selectedItem(newItem);
                                    }

                                    if (currents && current && (currents.items == '[date]' || currents.items == '[date-range]')) {
                                        if (current.isDate) {
                                            if (value) {
                                                // Change an existing date
                                                current.itemvalue(value);
                                                current.itemtext($filter('date')(value, $scope.options.dateFormat));
                                            }
                                        }
                                        else if (value) {
                                            // Add a new date
                                            var dateItem = angular.extend({}, itemdefaults);
                                            dateItem.itemvalue(value);
                                            dateItem.itemtext($filter('date')(value, $scope.options.dateFormat));
                                            dateItem.isValue = true;
                                            dateItem.isDate = true;
                                            current._selectedItem = dateItem;
                                        }
                                        else {
                                            delete current._selectedItem;
                                        }

                                        if (currents.isAtEnd && current.items == '[date-range]') {
                                            var rangeOperators = $scope.options.rangeOperatorItems();
                                            rangeOperators[0].items = '[date]';
                                            dateItem._selectedItem = rangeOperators[0];
                                        }

                                        $scope.options.refresh(currents);
                                        this.close();

                                        if (currents.isAtEnd) {
                                            ensureMultiSelect();
                                        }
                                    }
                                    else {
                                        throw "invalid string format.";
                                    }
                                }
                                else {
                                    $scope.options.selectedItem(value);
                                    this.close();
                                }
                            },
                            onopening : function(e)
                            {
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    this.currents = $scope.options.getCurrents();
                                }

                                e.options = this;
                                $scope.options.ondropdownopening && $scope.options.ondropdownopening(e);
                            },
                            onopened : function()
                            {
                                var value;
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    if (this.currents && !this.currents.isAtEnd && this.currents.current && this.currents.current.isDate) {
                                        value = this.currents.current.itemvalue();
                                    }
                                    element.addClass('multiselect-opened');
                                }
                                else {
                                    trySelectItem(selectElement().value());
                                    value = $scope.options.selectedItem();
                                    value = value && value.itemvalue();
                                    element.addClass('datepicker-opened');
                                }
                                value instanceof Date && this.selectedDate(value);
                                $scope.options.ondropdownopened && $scope.options.ondropdownopened(this);
                            },
                            onclosed : function()
                            {
                                selectElement().focus();
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    element.removeClass('multiselect-opened');
                                }
                                else {
                                    element.removeClass('datepicker-opened');
                                }
                            },
                        };

                        $scope.ctxoptions = {
                            autoSelect : false,
                            parentElement : element,
                            onitemclicked : function(selectedValue)
                            {
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    var currents = this.currents;
                                    var current = currents.current;

                                    if (!$scope.options._selectedItem) {
                                        var newItem = new multiSelectItem();
                                        newItem.items = $scope.options.items;
                                        current = $scope.options.selectedItem(newItem);
                                    }
                                    else if (!current) {
                                        current = $scope.options._selectedItem;
                                    }

                                    // Search for current object
                                    var currentItems = $scope.options.normalizedItems(currents.items);
                                    var selectedItem = $filter('filter')(currentItems, function(item){
                                    return item.itemvalue() == selectedValue;
                                    })[0];

                                    if (currents.isAtEnd) {
                                        // add a new item
                                        current._selectedItem = selectedItem;
                                    }
                                    else {
                                        // Change an existing item
                                        current.itemvalue(selectedItem.itemvalue());
                                        current.itemtext(selectedItem.itemtext());
                                    }

                                    $scope.options.refresh(currents);
                                    this.close();

                                    if (!currents || currents.isAtEnd) {
                                        ensureMultiSelect();
                                    }
                                }
                                else {
                                    $scope.options.selectedItem(selectedValue);
                                    this.close();
                                }
                            },
                            onopening : function(e)
                            {
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    this.currents = $scope.options.getCurrents();
                                }

                                e.options = this;
                                $scope.options.ondropdownopening && $scope.options.ondropdownopening(e);
                            },
                            onopened : function()
                            {
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    this.selectedItem && this.selectedItem(null);
                                    element.addClass('multiselect-opened');
                                }
                                else {
                                    var item = $scope.options.selectedItem();
                                    item && item.itemvalue && this.selectedItem && this.selectedItem(item.itemvalue());
                                    element.addClass('combobox-opened');
                                }

                                $scope.options.ondropdownopened && $scope.options.ondropdownopened(this);
                            },
                            onclosed : function()
                            {
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    element.removeClass('multiselect-opened');
                                }
                                else {
                                    element.removeClass('combobox-opened');
                                }
                                selectElement().focus();
                            },
                            onitemsrequired : function(options, callback)
                            {
                                if ($scope.options.mode == multiselectModes.multiselect) {
                                    var currents = $scope.options.getCurrents();
                                    if (!currents) {
                                        return false;
                                    }

                                    var current = currents.current;
                                    if (current && (current.isOpenParenthesis || current.isCloseParenthesis) && !currents.isAtEnd) {
                                        return false;
                                    }

                                    var items = $scope.options.normalizedItems(currents.items);
                                    options.items = currents.isAtEnd ? items : $filter('filter')(items, function(item)
                                    {
                                        if ( typeof current.updatable == 'number' || typeof item.updatable == 'number') {
                                            return item.updatable == current.updatable;
                                        }
                                        else {
                                            return item.updatable;
                                        }
                                    });
                                }
                                else {
                                    var items = $scope.options.normalizedItems($scope.options.items);
                                    if (angular.equals(options.items, items))          
                                    {
                                        return false;
                                    }                
                                              
                                    options.items = $scope.options.normalizedItems($scope.options.items);
                                    
                                    if (options.items.length == 1 &&options.items[0].isWaitItem)        
                                    {
                                        options.element.addClass("waiting");
                                    }      
                                    else
                                    {
                                        options.element.removeClass("waiting");
                                    }                      
                                }

                                return true;
                            }
                        };

                        var onBlur = function()
                        {
                            isFocus(false);
                        };

                        var onFocus = function()
                        {
                            isFocus(true);
                        };

                        var isFocus = function(state)
                        {
                            if ( typeof state != 'undefined') {
                                (!$scope.options.isReadOnly() && state && element.addClass("multiselect-active")) || element.removeClass("multiselect-active");
                            }
                            else {
                                return !$scope.options.isReadOnly() && selectElement().is(":focus") || $scope.options.dropDownIsVisible();
                            }
                        };

                        var selectElement = function()
                        {
                            var el = element.find(selectChoice);
                            el.value = $scope.hasInput() ? el.val : el.html;
                            return el;
                        };

                        var optionsWatcher = function(value)
                        {
                            $scope.options = value || {};

                            // Extend the current option instance with isolated attributes
                            if (attrs.mode && typeof $scope.options.mode == 'undefined') {
                                $scope.options.mode = multiselectModes[attrs.mode] || eval(attrs.mode);
                            };

                            var valueAttr = attrs.value;
                            if (valueAttr && typeof $scope.options.selectedValue == 'undefined') {
                                $scope.options.selectedValue = $scope.$eval(valueAttr);
                            };

                            if (attrs.itemText && typeof $scope.options.textAttribute == 'undefined') {
                                $scope.options.textAttribute = attrs.itemText;
                            };

                            if (attrs.itemValue && typeof $scope.options.valueAttribute == 'undefined') {
                                $scope.options.valueAttribute = attrs.itemValue;
                            };

                            if (attrs.onitemselected && typeof $scope.options.onitemselected == 'undefined') {
                                $scope.options.onitemselected = $scope.$eval(attrs.onitemselected);
                            };

                            if (attrs.dateFormat && typeof $scope.options.dateFormat == 'undefined') {
                                $scope.options.dateFormat = attrs.dateFormat;
                            };

                            if (attrs.items && typeof $scope.options.items == 'undefined') {
                                $scope.options.items = $scope.$eval(attrs.items);
                            };

                            if (valueAttr) {
                                $scope.options.onitemselected = function(item)
                                {
                                    var model = $parse(valueAttr);
                                    model.assign($scope, item && item.itemvalue());
                                };
                                
                                $scope.options.ontextchanged = function(text){
                                    var model = $parse(valueAttr);
                                    model.assign($scope, text);
                                };
                            };

                            // Extend the current option instance with default values
                            delete $scope.options.selectedItem;
                            angular.extend($scope.options, defaults, angular.extend({}, $scope.options));

                            selectChoice = $scope.hasInput() ? 'input' : '.placeHolder';

                            $scope.options.items = $scope.options.normalizedItems();
                            $scope.dtpoptions.dateFormat = $scope.options.dateFormat;

                            ($scope.options._isReadOnly && element.addClass('readonly')) || element.removeClass('readonly');
                            delete $scope.options._isReadOnly;
                            $scope.options.isReadOnly = function(value)
                            {
                                if ( typeof value != 'undefined') {
                                    (value && element.addClass('readonly')) || element.removeClass('readonly');
                                }
                                else {
                                    return element.hasClass('readonly');
                                }
                            };

                            $scope.options.dropDownIsVisible = function()
                            {
                                return ($scope.ctxoptions.isVisible && $scope.ctxoptions.isVisible()) || ($scope.dtpoptions.isVisible && $scope.dtpoptions.isVisible());
                            };

                            $scope.options.getCurrents = function()
                            {
                                if (inputElement[0].selectionStart != inputElement[0].selectionEnd) {
                                    return null;
                                }

                                var instance = $scope.options._selectedItem;
                                
                                if (!instance) {
                                    return {
                                        instance : null,
                                        current : null,
                                        items : $scope.options.items,
                                        isLast : true,
                                        isAtEnd : true,
                                    };
                                }
                            
                                var item = instance;
                                if (item._freeText) {
                                    return null;
                                }

                                var currentItemInfos = item.atPosition(inputElement[0].selectionEnd);
                                var currentItem = currentItemInfos && currentItemInfos.current;
                                var previousItem = currentItem ? item.previous(currentItem) : item.last();
                                var listItem = currentItem && previousItem || previousItem;

                                var items;
                                if (!listItem || (listItem && listItem.isOpenParenthesis) || (listItem.items && listItem.items.isParenthesis) || (!listItem.items && listItem.isOperator)) {
                                    items = $scope.options.items;
                                }
                                else if (!listItem.items) {
                                    items = $scope.options.andOrOperatorsItems();
                                }
                                else {
                                    items = listItem.items;
                                }

                                return {
                                    instance : instance,
                                    textBefore : currentItemInfos && currentItemInfos.textBefore || '',
                                    current : currentItem || previousItem,
                                    items : items,
                                    isLast : !currentItem || !currentItem._selectedItem,
                                    isAtEnd : !currentItem,
                                };
                            };

                            $scope.options.refresh = function(currents)
                            {
                                var item = (currents && currents.instance) || $scope.options.selectedItem();
                                var text = item.tostring();
                                selectElement().value(text);
                                $scope.options.selectedtext = text;
                            };

                            var cssClass = $scope.options.formatSelectionCssClass(element);
                            if (cssClass !== undefined) {
                                element.addClass(cssClass);
                            }

                            if ( typeof $scope.options.selectedValue != 'undefined') {
                                delete $scope.options._selectedItem;
                                // Force event
                                $scope.options.selectedItem($scope.options.selectedValue);
                                delete $scope.options.selectedValue;
                            }
                            else if ( typeof $scope.options._queryString != 'undefined') {
                                $scope.options.selectedItem(multiSelectItem.parse($scope.options, $scope.options._queryString, true));
                                delete $scope.options._queryString;
                            }

                            element.off('blur', selectChoice, onBlur);
                            element.off('focus', selectChoice, onFocus);
                            element.off('focus', $scope.focus);
                            element.on('blur', selectChoice, onBlur);
                            element.on('focus', selectChoice, onFocus);
                            element.on('focus', $scope.focus);

                            if (!$scope.dropdown.datepicker && ($scope.options.mode == multiselectModes.datePicker || $scope.options.mode == multiselectModes.multiselect)) {
                                var dropdownHtml = '<datepicker class="multiselect-dropdown" options="dtpoptions"></datepicker>';
                                var dropdown = angular.element(dropdownHtml);
                                $compile(dropdown)($scope);
                                $('body').append(dropdown);
                                $scope.dropdown.datepicker = dropdown;
                            }

                            if (!$scope.dropdown.context && $scope.options.mode != multiselectModes.datePicker) {
                                var dropdownHtml = '<contextmenu class="multiselect-dropdown" options="ctxoptions"></contextmenu>';
                                var dropdown = angular.element(dropdownHtml);
                                $compile(dropdown)($scope);
                                $('body').append(dropdown);
                                $scope.dropdown.context = dropdown;
                            }

                            if ($scope.options.dropDownIsVisible()) {
                                closeDropDown(true);
                                toogleDropDown();
                            }
                        };
                        attrs.options && $scope.$parent.$watch(attrs.options, optionsWatcher);

                        $scope.focus = function()
                        {
                            selectElement().focus(100);
                        };

                        var trySelectItem = function(text)
                        {
                            return $scope.options.selectedItem(text);
                        };

                        var getMeasureElement = function()
                        {
                            var tmElement = element.find("#textmeasure");
                            if (!tmElement.length) {
                                tmElement = angular.element('<div id="textmeasure"></div>');
                                element.append(tmElement);
                            }
                            return tmElement;
                        };

                        var toogleDropDown = function()
                        {
                            if ($scope.options.dropDownIsVisible()) {
                                closeDropDown();
                            }
                            else if ($scope.options.mode == multiselectModes.datePicker) {
                                $scope.dtpoptions.open();
                            }
                            else if ($scope.options.mode != multiselectModes.multiselect) {
                                if ($scope.options.onitemsrequired) {
                                    if ($scope.options.onitemsrequired($scope.options, function(options)
                                    {
                                        // By callback
                                        if (options) {
                                            optionsWatcher(options);
                                        }

                                        $scope.ctxoptions.open();
                                    })) {
                                        // Open directly
                                        $scope.ctxoptions.open();
                                    };
                                }
                                else {
                                    $scope.ctxoptions.open();
                                }
                            }
                            else {
                                // Multi select
                                var currents = $scope.options.getCurrents();
                                if (!currents) {
                                    return;
                                }

                                if (currents.items == '[value]' || currents.items == '[value-range]') {
                                    // Waiting for text
                                    return;
                                }

                                // Calc left menu position
                                var leftPos = 0;
                                try {
                                    var textmeasure = getMeasureElement();
                                    var previousText;

                                    if (currents.isAtEnd) {
                                        var previousText = $scope.options.selectedtext;
                                        if (previousText && previousText.trim()) {
                                            textmeasure.html(previousText);
                                            leftPos = textmeasure.width();
                                        }

                                        leftPos = Math.max(leftPos + 8, 13);
                                    }
                                    else if (currents.current && currents.current.position && currents.current.position.start < 2) {
                                        leftPos = 5;
                                    }
                                    else {
                                        var previousText = currents.textBefore;
                                        if (previousText) {
                                            textmeasure.html(previousText);
                                            leftPos = textmeasure.width();
                                        }

                                        leftPos = Math.max(lastClickedPosition.offsetX - leftPos + 4, 5);
                                    }
                                }
                                catch (e) {
                                    console.log("Error at MultiSelect.toogleDropDown: fail to measure text size, " + e.toString());
                                    leftPos = 0;
                                }

                                var dropDownWithin = leftPos < element.width() / 2 ? null : $scope.options.dropDownWithin;

                                if (currents.items == '[date]' || currents.items == '[date-range]') {
                                    // Open calendar
                                    $scope.dtpoptions.left = leftPos;
                                    $scope.dtpoptions.position.within = dropDownWithin;
                                    $scope.dtpoptions.open();
                                    return;
                                }
                                else {
                                    $scope.ctxoptions.left = leftPos;
                                    $scope.ctxoptions.position.within = dropDownWithin;
                                    if ($scope.options.onitemsrequired) {
                                        if ($scope.options.onitemsrequired($scope.options, function(options)
                                        {
                                            // By callback
                                            if (options) {
                                                optionsWatcher(options);
                                            }

                                            $scope.ctxoptions.open();
                                        }, currents)) {
                                            // Open directly
                                            $scope.ctxoptions.open();
                                        };
                                    }
                                    else {
                                        $scope.ctxoptions.open();
                                    }
                                }
                            }
                        };

                        var closeDropDown = function(immediate)
                        {
                            $scope.dtpoptions.close && $scope.dtpoptions.close(immediate);
                            $scope.ctxoptions.close && $scope.ctxoptions.close(immediate);
                        };

                        element.on('click', function(e)
                        {
                            if ($scope.options.isReadOnly()) {
                                return;
                            }

                            if ($scope.options.mode == multiselectModes.multiselect) {
                                if (selectElement().is($(e.target))) {
                                    ensureMultiSelect('click');
                                }
                            }
                            else if (!selectElement().is($(e.target)) || !$scope.hasInput()) {
                                toogleDropDown();
                            }

                            selectElement().focus(100);
                        });

                        var clearMultiSelecteParserTimer = function()
                        {
                            if (!multiSelecteParserTimer) {
                                return;
                            }

                            $timeout.cancel(multiSelecteParserTimer);
                            multiSelecteParserTimer = null;
                        };

                        var inputElement = element.find('input');
                        inputElement.on('dblclick', function(e)
                        {
                            if ($scope.options.mode == multiselectModes.multiselect) {
                                clearMultiSelecteParserTimer();
                                closeDropDown();
                            }
                        });

                        inputElement.on('mouseup', function(e)
                        {
                            lastClickedPosition = {
                                offsetX : e.clientX - inputElement.offset().left,
                                offsetY : e.clientY - inputElement.offset().top
                            };

                            if ($scope.options.mode == multiselectModes.multiselect && e.clientX > $(this).width() - 20) {
                                // Delete button is pressed
                                closeDropDown();
                            }
                        });

                        inputElement.on('keyup', function(e)
                        {
                            switch ( e.keyCode )
                            {
                                case $.ui.keyCode.BACKSPACE:
                                    if ($scope.options.mode == multiselectModes.multiselect && !$scope.options.dropDownIsVisible()) {
                                        ensureMultiSelect($.ui.keyCode.BACKSPACE);
                                    }
                                    break;
                            }
                        });

                        inputElement.on('keydown', function(e)
                        {
                            if ($scope.options.isReadOnly()) {
                                return;
                            }

                            switch ( e.keyCode )
                            {
                                case $.ui.keyCode.BACKSPACE:
                                    if ($scope.options.mode == multiselectModes.multiselect) {
                                        var currents = $scope.options.getCurrents();
                                        var lastitem = currents && currents.isLast && currents.current;
                                        var text = selectElement().value();
                                        if (lastitem && text) {
                                            if (!lastitem.isValue && lastitem.itemtext) {
                                                if (text.match("\"$")) {
                                                    text = text.substring(0, text.length - 1);
                                                }
                                                var searchText = lastitem.itemtext();
                                                if (searchText.length == 1) {
                                                    searchText = '\\' + searchText;
                                                }
                                                if (text.match(searchText + "[\"\']*$")) {
                                                    var previousItem = $scope.options._selectedItem.previous(lastitem);
                                                    if (previousItem) {
                                                        delete previousItem._selectedItem;
                                                        delete previousItem.filteredItems;
                                                    }
                                                    else {
                                                        delete $scope.options._selectedItem._selectedItem;
                                                        delete $scope.options._selectedItem.filteredItems;
                                                    }

                                                    $scope.options.refresh(currents);
                                                    closeDropDown(true);

                                                    if (!previousItem.isValue) {
                                                        ensureMultiSelect();
                                                    }

                                                    e.stopPropagation();
                                                }
                                            }
                                            else {
                                                closeDropDown();
                                            }
                                        }
                                    }
                                    break;

                                case $.ui.keyCode.ESCAPE:
                                    // Prevent escape to cancel the text of the input
                                    closeDropDown();
                                    this.blur();
                                    this.focus();
                                    e.stopPropagation();
                                    break;
                            };
                        });

                        inputElement.on('change', function(e)
                        {
                            var item = trySelectItem(selectElement().value());
                            if (!item && $scope.options.mode == multiselectModes.freeText){
                                $scope.options.ontextchanged && $scope.options.ontextchanged(selectElement().value()); 
                            }
                            
                        });

                        inputElement.on('cut', function(e)
                        {
                            if ($scope.options.mode == multiselectModes.multiselect) {
                                closeDropDown();
                            }
                        });

                        inputElement.on('paste', function(e)
                        {
                            if ($scope.options.mode == multiselectModes.multiselect) {
                                closeDropDown();
                            }
                        });

                        var ensureMultiSelect = function(code)
                        {
                            if (code == $.ui.keyCode.ENTER) {
                                return;
                            }

                            clearMultiSelecteParserTimer();
                            var delay = 20;

                            if (code == $.ui.keyCode.ESCAPE) {
                                closeDropDown();
                                return;
                            }
                            else if (code == 'click') {
                                // Waiting for double click
                                delay = 200;
                                code = null;
                            }

                            // Ensure the scope is digest and selectedText is up to date
                            multiSelecteParserTimer = $timeout(function()
                            {
                                if (!$scope.options.selectedtext) {
                                    if ($scope.options._selectedItem) {
                                        delete $scope.options._selectedItem;
                                    }

                                    if (code == $.ui.keyCode.BACKSPACE) {
                                        closeDropDown(true);
                                    }

                                    toogleDropDown();
                                }
                                else {
                                    var item = multiSelectItem.parse($scope.options, $scope.options.selectedtext);
                                    if (item && item.items && item.items.length && !item.inquote) {
                                        $scope.options._selectedItem = item;

                                        var currents = $scope.options.getCurrents();
                                        if (currents) {
                                            if (!code || currents.isAtEnd && code == $.ui.keyCode.SPACE || code == 40 || code == 41) {
                                                if (currents.isAtEnd && currents.items && currents.items.length == 1 && currents.items[0].isOperator && currents.items[0].items) {
                                                    // Auto select the unique operator
                                                    currents.current._selectedItem = currents.items[0];

                                                    // Current is modified, just refresh
                                                    $scope.options.refresh(currents);

                                                    // Move the cursor to the end
                                                    inputElement[0].selectionStart = inputElement[0].selectionEnd = $scope.options.selectedtext.length;
                                                }

                                                closeDropDown(true);
                                                toogleDropDown();
                                            }

                                            // Auto select the first item containing the additional text if any
                                            var filteredItems = currents.current.filteredItems;
                                            if (filteredItems && filteredItems.length && $scope.ctxoptions.isVisible()) {
                                                var selectedDropDownValue = $scope.ctxoptions.selectedItem();
                                                selectedDropDownValue = selectedDropDownValue && selectedDropDownValue.itemvalue();
                                                if (!selectedDropDownValue || $filter('filter')(filteredItems, function(item)
                                                {
                                                    return item.itemvalue() == selectedDropDownValue;
                                                }).length == 0) {
                                                    $scope.ctxoptions.selectedItem(filteredItems[0].itemvalue());
                                                    filteredItems.currentIndex = 0;
                                                }
                                            }
                                        }
                                    }
                                    else if (item._freeText) {
                                        $scope.options.selectedItem(item);
                                        closeDropDown();
                                    }
                                }
                            }, delay);
                        };

                        inputElement.on('keypress', function(e)
                        {
                            if ($scope.options.mode == multiselectModes.multiselect) {
                                ensureMultiSelect(e.keyCode || e.charCode);
                            }
                        });

                        inputElement.on('keyup', function(e)
                        {
                            if ($scope.options.mode == multiselectModes.multiselect) {
                                switch ( e.keyCode )
                                {
                                    case $.ui.keyCode.PAGE_UP:
                                    case $.ui.keyCode.UP:
                                    case $.ui.keyCode.PAGE_DOWN:
                                    case $.ui.keyCode.DOWN:
                                        var currents = $scope.options.getCurrents();
                                        if (e.altKey && (!currents || currents.isAtEnd)) {
                                            toogleDropDown();
                                            e.stopPropagation();
                                        }
                                        else if (e.ctrlKey && $scope.options.dropDownIsVisible()) {
                                            inputElement[0].setSelectionRange(32767, 32767);
                                            var currents = $scope.options.getCurrents();
                                            if (currents) {
                                                var filteredItems = currents.current && currents.current.filteredItems;
                                                if (filteredItems && filteredItems.length) {
                                                    if (e.keyCode == $.ui.keyCode.PAGE_UP || e.keyCode == $.ui.keyCode.UP) {
                                                        var currentIndex = isNaN(filteredItems.currentIndex) ? filteredItems.length : filteredItems.currentIndex;
                                                        if (--currentIndex < 0) {
                                                            currentIndex = filteredItems.length - 1;
                                                        }
                                                    }
                                                    else {
                                                        var currentIndex = isNaN(filteredItems.currentIndex) ? -1 : filteredItems.currentIndex;
                                                        if (++currentIndex >= filteredItems.length) {
                                                            currentIndex = 0;
                                                        }
                                                    }

                                                    $scope.ctxoptions.selectedItem(filteredItems[currentIndex].itemvalue());
                                                    filteredItems.currentIndex = currentIndex;
                                                }
                                            }

                                            $timeout(function()
                                            {
                                                inputElement[0].setSelectionRange(32767, 32767);
                                            }, 200);
                                        }
                                }
                            }
                        });

                        element.on('keydown', function(e)
                        {
                            var prev, character, skip;

                            $scope.options && $scope.options.onkeydown && $scope.options.onkeydown(e);

                            if ($scope.options.isReadOnly() || e.isPropagationStopped()) {
                                return;
                            }

                            function escape(value)
                            {
                                return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
                            }

                            if ($scope.options.mode == multiselectModes.multiselect) {
                                return;
                            }

                            switch ( e.keyCode )
                            {
                                case $.ui.keyCode.HOME:
                                    if ($scope.options.dropDownIsVisible()) {
                                        return;
                                    }

                                    var item = $scope.options.first();
                                    item && $scope.options.selectedItem(item);
                                    break;
                                case $.ui.keyCode.END:
                                    if ($scope.options.dropDownIsVisible()) {
                                        return;
                                    }

                                    var item = $scope.options.last();
                                    item && $scope.options.selectedItem(item);
                                    break;
                                case $.ui.keyCode.PAGE_UP:
                                case $.ui.keyCode.UP:
                                    if (e.altKey) {
                                        toogleDropDown();
                                    }
                                    else if ($scope.options.dropDownIsVisible()) {
                                        return;
                                    }
                                    else if ($scope.options.mode == multiselectModes.datePicker) {
                                        var date = $scope.options.selectedItem() || new Date();
                                        if (e.ctrlKey) {
                                            date.setFullYear(date.getFullYear() + 1);
                                        }
                                        else if (e.shiftKey) {
                                            date.setMonth(date.getMonth() + 1);
                                        }
                                        else {
                                            date.setDate(date.getDate() + 1);
                                        }
                                        $scope.options.selectedItem(date);
                                    }
                                    else {
                                        var item = $scope.options.prev();
                                        item && $scope.options.selectedItem(item);
                                    }
                                    break;
                                case $.ui.keyCode.PAGE_DOWN:
                                case $.ui.keyCode.DOWN:
                                    if (e.altKey) {
                                        toogleDropDown();
                                    }
                                    else if ($scope.options.dropDownIsVisible()) {
                                        return;
                                    }
                                    else if ($scope.options.mode == multiselectModes.datePicker) {
                                        var date = $scope.options.selectedItem() || new Date();
                                        if (e.ctrlKey) {
                                            date.setFullYear(date.getFullYear() - 1);
                                        }
                                        else if (e.shiftKey) {
                                            date.setMonth(date.getMonth() - 1);
                                        }
                                        else {
                                            date.setDate(date.getDate() - 1);
                                        }
                                        $scope.options.selectedItem(date);
                                    }
                                    else {
                                        var item = $scope.options.next();
                                        item && $scope.options.selectedItem(item);
                                    }
                                    break;

                                default:
                                    if ($scope.options.mode == multiselectModes.autoComplete) {
                                        // Autocomplete
                                        $timeout(function()
                                        {
                                            var text = selectElement().value();
                                            if (!text) {
                                                return;
                                            }

                                            var regex = new RegExp(escape(text), "i");
                                            var match = $filter('filter')($scope.options.items, function(value)
                                            {
                                                return value.visible = regex.test(value.itemtext());
                                            });

                                            if (match.length) {
                                                $scope.ctxoptions.selectedItem(null);
                                                $scope.ctxoptions.open();
                                                $scope.ctxoptions.refresh();
                                            }
                                            else {
                                                $scope.ctxoptions.close();
                                            }
                                        }, 100);
                                    }
                                    else if (!$scope.hasInput()) {
                                        var previousText = $scope.options.currentFilter && $scope.options.currentFilter.text || "";
                                        var currentText = String.fromCharCode(e.keyCode);
                                        var selectedItem = $scope.options.selectedItem();

                                        $timeout.cancel(this.filterTimer);

                                        if (currentText == previousText) {
                                            // Next match
                                        }
                                        else {
                                            // New Match
                                            currentText = previousText + currentText;

                                            var regex = new RegExp("^" + escape(currentText), "i");
                                            $scope.options.currentFilter = $filter('filter')($scope.options.items, function(item)
                                            {
                                                return regex.test(item.itemtext());
                                            });

                                            $scope.options.currentFilter.text = currentText;
                                        }

                                        // If no matches on the current filter, reset to the last character pressed
                                        // to move down the menu to the first item that starts with that character
                                        if (!$scope.options.currentFilter.length) {
                                            currentText = String.fromCharCode(e.keyCode);
                                            regex = new RegExp("^" + escape(currentText), "i");
                                            $scope.options.currentFilter = $filter('filter')($scope.options.items, function(item)
                                            {
                                                return regex.test(item.itemtext());
                                            });

                                            $scope.options.currentFilter.text = currentText;
                                        }

                                        if ($scope.options.currentFilter.length) {
                                            var currentIndex = selectedItem ? $scope.options.currentFilter.indexOf(selectedItem) : -1;
                                            if (++currentIndex >= $scope.options.currentFilter.length) {
                                                currentIndex = 0;
                                            }
                                            var selectedItem = $scope.options.selectedItem($scope.options.currentFilter[currentIndex]);

                                            if ($scope.ctxoptions.isVisible()) {
                                                $scope.ctxoptions.selectedItem(selectedItem.itemvalue());
                                            }

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

                                        return;
                                    }
                            }

                            e.stopPropagation();
                        });

                        element.on('mousewheel', function(e)
                        {
                            if ($scope.options.isReadOnly()) {
                                return;
                            }

                            var item = !$scope.ctxoptions.autoComplete && !$scope.ctxoptions.isVisible() && (e.originalEvent.wheelDelta > 0 ? $scope.options.prev() : $scope.options.next());
                            item && $scope.options.selectedItem(item);
                            item && selectElement().select();
                        });

                        optionsWatcher(null);
                    }
                };
            },
        };
    }]);
});
