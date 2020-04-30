var loopback = require('loopback');

module.exports = function (app, done) {
  var Label = loopback.findModel('Label');
  Label.destroyAll({}, { fetchAllScopes: true }, function (err) {
    var item0 = {
      key: 'country',
      value: 'Country'
    };
    var item1 = {
      key: 'country',
      value: 'Country-US',
      scope: {
        lang: 'en-us'
      }
    };
    var item2 = {
      key: 'country',
      value: 'Country-FR',
      scope: {
        lang: 'fr'
      }
    };
    var item3 = {
      key: 'country',
      value: 'Country-IT',
      scope: {
        lang: 'it'
      }
    };
    var item4 = {
      key: 'country',
      value: 'Country-HI',
      scope: {
        lang: 'hi'
      }
    };
    var item5 = {
      key: 'country',
      value: 'Country-CN',
      scope: {
        lang: 'cn'
      }
    };
    Label.create([item0, item1, item2, item3, item4, item5], {}, function (err, r) {
      var MetaData = loopback.findModel('MetaData');
      MetaData.destroyAll({}, { fetchAllScopes: true }, function (err) {
        var item0 = {
          key: 'country',
          value: 'Country'
        };
        var item1 = {
          key: 'country',
          value: 'Country-US',
          scope: {
            lang: 'en-us'
          }
        };
        var item2 = {
          key: 'country',
          value: 'Country-FR',
          scope: {
            lang: 'fr'
          }
        };
        var item3 = {
          key: 'country',
          value: 'Country-IT',
          scope: {
            lang: 'it'
          }
        };
        var item4 = {
          key: 'country',
          value: 'Country-HI',
          scope: {
            lang: 'hi'
          }
        };
        var item5 = {
          key: 'country',
          value: 'Country-CN',
          scope: {
            lang: 'cn'
          }
        };
        MetaData.create([item0, item1, item2, item3, item4, item5], {}, function (err, r) {
          return done(err);
        });
      });
    });
  });
};

