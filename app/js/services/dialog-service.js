define(['app'], function(app)
{'use strict';
    app.register.service('dialogService', ['$document', '$compile', '$rootScope', '$translate', '$q', '$timeout', '$interval',
    function($document, $compile, $rootScope, $translate, $q, $timeout, $interval)
    {
        var body = $document.find('body');

        // Append dialog service content to the body
        var dialogElm = angular.element('<div id="mainDialog" class="dialog"><span>{{text}}</span></div>');
        var scope = $rootScope.$new();
        $compile(dialogElm)(scope);
        body.append(dialogElm);

        var defaultButtons = [{
            text : $translate('Dialog.Ok'),
            click : function()
            {
                $(this).dialog('close');
            }
        }];

        var confirmOptions = {
            buttons : [{
                text : $translate('Dialog.Yes'),
                click : function(e)
                {
                    e.originalEvent && e.originalEvent.stopPropagation();
                    scope.dialogResult = 'yes';

                    scope.$close();
                }
            }, {
                text : $translate('Dialog.No'),
                click : function(e)
                {
                    e.originalEvent && e.originalEvent.stopPropagation();
                    scope.dialogResult = 'no';

                    scope.$close();
                }
            }],
            dialogResult : 'no'
        };

        scope.$close = function()
        {
            dialogElm.dialog('close');

            scope.closed();
        };

        // Create the dialog
        dialogElm.dialog({
            autoOpen : false,
            draggable : false,
            modal : true,
            resizable : false,
            position : {
                my : "bottom",
                at : "center",
                of : window
            },
            open : function(event, ui)
            {
                // Get the dialog overlay and stop propagation on click
                $('.ui-widget-overlay.ui-front').bind('click', false);
            },
            close : function(event, ui)
            {

            }
        });

        return {
            open : function(text, buttons)
            {
                scope.text = text;

                dialogElm.dialog('option', 'buttons', buttons || defaultButtons);
                dialogElm.dialog('open');
            },

            confirm : function(text)
            {
                var deferred = $q.defer();
                angular.extend(scope, confirmOptions);
                scope.text = text;
                scope.closed = function()
                {
                    if (scope.dialogResult === 'no') {
                        deferred.reject();
                    }
                    else if (scope.dialogResult === 'yes') {
                        deferred.resolve();
                    }
                };

                dialogElm.dialog('option', 'buttons', scope.buttons);
                dialogElm.dialog('open');

                return deferred.promise;
            }
        };
    }]);
});
