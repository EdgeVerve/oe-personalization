var oecloud = require('oe-cloud');
var loopback=require('loopback');

oecloud.attachMixinsToBaseEntity("DataPersonalizationMixin");


oecloud.boot(__dirname, function (err) {
  oecloud.start();
  oecloud.emit('test-start');
  var Customer=loopback.findModel("Customer");
});

