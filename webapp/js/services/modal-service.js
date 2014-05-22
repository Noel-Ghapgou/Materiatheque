define(['app'], function(app)
{'use strict';
    app.register.service('modalService', ["$document", "$compile", "$rootScope", "$controller", "$timeout", '$animate',
    function($document, $compile, $rootScope, $controller, $timeout, $animate)
    {
        var modalInstances = {};

        var contextMenuDefaults = {
            id : null,
            template : null,
            templateUrl : null,
            title : '',
            backdrop : false,
            backdropCancel : false,
            parentId : '',
            parentClass : '',
            success : {
                label : 'OK',
                fn : null
            },
            cancel : {
                label : 'Cancel',
                fn : null
            },
            backdropClicked : null,
            controller : null, //just like route controller declaration
            footerTemplate : '',
            headerTemplate : '',
            modalClass : 'menu',
            css : {
                top : '130px',
                width : '130px',
            },
            onclosed : null
        };

        var popupWindowDefaults = {
            id : null,
            template : null,
            templateUrl : null,
            title : 'Default Title',
            backdrop : true,
            success : {
                label : 'OK',
                fn : null
            },
            cancel : {
                label : 'Close',
                fn : null
            },
            controller : null, //just like route controller declaration
            backdropClass : null,
            backdropCancel : true,
            footerTemplate : '<div class="modal-footer"><button class="btn" ng-click="$modalCancel()">{{$modalCancelLabel}}</button><button class="btn btn-primary" ng-click="$modalSuccess()">{{$modalSuccessLabel}}</button></div>',
            headerTemplate : '<div class="modal-header"><button type="button" class="btn closebtn icon icon-cancel" ng-click="$modalCancel()"></button><h2>{{$title}}</h2></div>',
            modalClass : null,
            cancelOnEsc : true,
            css : {
                top : '10%',
                width : '560px',
            },
            onclosed : null
        };

        var body = $document.find('body');

        return {
            ContextMenu : function(templateUrl, options, parameters)
            {
                // Handle arguments if optional template isn't provided.
                if (angular.isObject(templateUrl)) {
                    parameters = options;
                    options = templateUrl;
                }
                else {
                    options.templateUrl = templateUrl;
                }

                options = angular.extend({}, contextMenuDefaults, options);

                return Modal(options, parameters);
            },

            PopupWindow : function(templateUrl, options, parameters)
            {
                // Handle arguments if optional template isn't provided.
                if (angular.isObject(templateUrl)) {
                    parameters = options;
                    options = templateUrl;
                }
                else {
                    options.templateUrl = templateUrl;
                }

                options = angular.extend({}, popupWindowDefaults, options);

                return Modal(options, parameters);
            },

            closeAllModalInstances : function()
            {
                for (var name in modalInstances) {
                    if ( typeof modalInstances[name] === 'function') {
                        modalInstances[name]();
                    }
                }
            },

            addModalInstance : function(name, closefn)
            {
                modalInstances[name] = closefn;
            },

            removeModalInstance : function(name)
            {
                delete modalInstances[name];
            },
        };

        function Modal(options, parameters)
        {
            var key;
            var idAttr = options.id ? ' id="' + options.id + '" ' : '';
            var headerTemplate = options.headerTemplate;
            var footerTemplate = options.footerTemplate;
            var modalBody = (function()
            {
                if (options.template) {
                    if (angular.isString(options.template)) {
                        // Simple string template
                        return '<div class="modal-body">' + options.template + '</div>';
                    }
                    else {
                        // jQuery/JQlite wrapped object
                        return '<div class="modal-body">' + options.template.html() + '</div>';
                    }
                }
                else {
                    // Template url
                    return '<div class="modal-body" ng-include="\'' + options.templateUrl + '\'"></div>';
                }
            })();
            //We don't have the scope we're gonna use yet, so just get a compile function for modal
            var modalEl = angular.element('<div class="' + options.modalClass + ' modal ' + options.animEnterCss + '"' + idAttr + ' style="display: block;"><div class="modal-dialog"><div class="modal-content">' + headerTemplate + modalBody + footerTemplate + '</div></div></div>');

            for (key in options.css) {
                modalEl.css(key.replace('_', '-'), options.css[key]);
            }
            var divHTML = "<div ";
            if (options.backdropCancel) {
                divHTML += 'ng-click="$modalCancel(true)"';
            }
            divHTML += ">";
            if (options.backdrop) {
                var backdropEl = angular.element(divHTML);
                backdropEl.addClass(options.backdropClass);
                backdropEl.addClass('modal-backdrop fade in');
            }

            if (options.parentId && options.parentClass) {
                $(options.parentId).addClass(options.parentClass);
            }

            var handleEscPressed = function(event)
            {
                if (event.keyCode === 27 && options.cancelOnEsc) {
                    scope.$modalCancel();
                }
            };

            var closeFn = function()
            {
                body.unbind('keydown', handleEscPressed);
                scope.htmlHandler && body.unbind('click', scope.htmlHandler);

                modalEl.removeClass(options.animEnterCss);
                modalEl.addClass(options.animExitCss);

                var duration = options.animDuration || 500;
                if (!options.animExitCss) {
                    duration = 0;
                }
                $timeout(function()
                {
                    modalEl.remove();
                }, duration);

                if (backdropEl) {
                    backdropEl.remove();
                }

                if (options.parentId && options.parentClass) {
                    $(options.parentId).removeClass(options.parentClass);
                }

                options.onclosed && options.onclosed();
            };

            body.bind('keydown', handleEscPressed);

            var ctrl, locals, scope = options.scope || $rootScope.$new();

            scope.$title = options.title;
            scope.$modalClose = closeFn;
            scope.$modalCancel = function(isBackdrop)
            {
                var e = {
                    cancel : false,
                    scope : scope,
                    isBackdrop : isBackdrop || false,
                    options : options
                };
                var callFn = options.cancel.fn || closeFn;
                var promise = callFn.call(this, e);
                if (promise && promise.then) {
                    promise.then(function()
                    {
                        scope.$modalClose();
                    });
                }
                else {
                    if (e.cancel) {
                        return;
                    }
                    scope.$modalClose();
                }
            };
            scope.$modalSuccess = function()
            {
                var e = {
                    cancel : false,
                    scope : scope
                };
                var callFn = options.success.fn || closeFn;
                var promise = callFn.call(this, e);
                if (promise && promise.then) {
                    promise.then(function()
                    {
                        scope.$modalClose();
                    });
                }
                else {
                    if (e.cancel) {
                        return;
                    }
                    scope.$modalClose();
                }
            };
            scope.$modalSuccessLabel = options.success.label;
            scope.$modalCancelLabel = options.cancel.label;

            var element = $compile(modalEl)(scope);
            body.append(modalEl);
            if (backdropEl) {
                $compile(backdropEl)(scope);
                body.append(backdropEl);
            }
            else {
                // let the menu open
                $timeout(function()
                {
                    scope.htmlHandler = function(event)
                    {
                        if (element[0] != event.target && !$.contains(element[0], event.target)) {
                            scope.$modalCancel(true);
                        }
                    };

                    body.bind('click', scope.htmlHandler);
                }, 200);
            }

            if (options.controller) {
                locals = angular.extend({
                    $scope : scope,
                    $element : element
                }, parameters);
                ctrl = $controller(options.controller, locals);
                // Yes, ngControllerController is not a typo
                modalEl.contents().data('$ngControllerController', ctrl);
            }

            $timeout(function()
            {
                modalEl.addClass('in');
            }, 200);

            return scope;
        };
    }]);
});
