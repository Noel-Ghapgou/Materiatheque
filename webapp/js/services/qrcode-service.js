define(['app', 'qrcode'], function(app, qrcode)
{'use strict';
	// Load qrcode non-require file
	app.register.service('qrcodeService', function (){ return qrcode;});
});