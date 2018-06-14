var oecloud = require('oe-cloud');
var loopback = require('loopback');
oecloud.observe('loaded', function (ctx, next) {
  oecloud.attachMixinsToBaseEntity("DataPersonalizationMixin");
  return next();
})

oecloud.boot(__dirname, function (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  oecloud.start();
  oecloud.emit('test-start');
});

var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));

var expect = chai.expect;

var app = oecloud;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var Label;
var MetaData;
var api = defaults(supertest(app));
var basePath = app.get('restApiRoot');
var url = basePath + '/Labels';


describe(chalk.blue('Data Personalization Test Started'), function (done) {
  this.timeout(10000);
  before('wait for boot scripts to complete', function (done) {
    app.on('test-start', function () {
      Label = loopback.findModel("Label");
      MetaData = loopback.findModel("MetaData");
      var userModel = loopback.findModel("User");
      userModel.destroyAll({}, {}, function (err) {
        return done(err);
      });
    });
  });

  afterEach('destroy context', function (done) {
    done();
  });

  it('t1 getting default record with no scope', function (done) {
    Label.find({}, {}, function (err, results) {
      expect(results[0].value).to.equal('Country');
      expect(results[0].scope).to.be.undefined;
      return done(err);
    });
  });

  it('t2 getting record for lang=eng-us', function (done) {
    Label.find({}, { ctx: { lang: "en-us" } }, function (err, results) {
      expect(results[0].value).to.equal('Country-US');
      return done(err);
    });
  });

  it('t3 getting record for lang=fr', function (done) {
    Label.find({}, { ctx: { lang: "fr" } }, function (err, results) {
      expect(results[0].value).to.equal('Country-FR');
      return done(err);
    });
  });
  it('t4 getting record for lang=eng-us over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
    .set('accept-language', 'en-US')
    .get(url)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country-US');
      done();
    });
  });
  it('t5 getting default record by not passing language us over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
    .set('accept-language', '')
    .get(url)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country');
      done();
    });
  });
  it('t6 getting record for lang=fr over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'fr')
    .get(url)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country-FR');
      done();
    });
  });

  it('t7 getting record for lang=xxx which does not exist over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'xxx')
    .get(url)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country');
      done();
    });
  });

  it('t8 getting record for lang=fr over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'fr')
    .get(url)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country-FR');
      done();
    });
  });

  it('t9 create users', function (done) {
    var url = basePath + '/users';
    api.set('Accept', 'application/json')
    .post(url)
    .send([{ username: "admin", password: "admin", email: "admin@admin.com" },
    { username: "evuser", password: "evuser", email: "evuser@evuser.com" },
    { username: "infyuser", password: "infyuser", email: "infyuser@infyuser.com" },
    { username: "bpouser", password: "bpouser", email: "infyuser@infyuser.com" }])
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].id).to.be.defined;
      expect(result[1].id).to.be.defined;
      expect(result[2].id).to.be.defined;
      expect(result[3].id).to.be.defined;
      done();
    });
  });

  var infyToken;
  it('t10 Login with infy credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "infyuser", password: "infyuser" })
    .end(function (err, response) {
      var result = response.body;
      infyToken = result.id;
      expect(infyToken).to.be.defined;
      done();
    });
  });

  it('t11 create record for lang=xxx over HTTP REST API', function (done) {
    var url2 = url + '?access_token=' + infyToken;
    api.set('Accept', 'application/json')
    .post(url2)
    .send({ key: "country", value: "Country-xxx", scope: {lang : "xxx"} })
    .end(function (err, response) {
      var result = response.body;
      expect(result.value).to.be.equal("Country-xxx");
      done();
    });
  });

  it('t12 getting record for lang=xxx over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'xxx')
    .get(url)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country-xxx');
      done();
    });
  });

  it('t13 create more records for lang=xxx over HTTP REST API', function (done) {
    var url2 = url + '?access_token=' + infyToken;
    api.set('Accept', 'application/json')
    .post(url2)
    .send([{ key: "state", value: "State-xxx", scope: { lang: "xxx" } }, { key: "city", value: "City-xxx", scope: { lang: "xxx" } }, { key: "village", value: "Village-xxx", scope: { lang: "xxx" } }])
    .end(function (err, response) {
      var result = response.body;
      expect(result.length).to.be.equal(3);
      done();
    });
  });

  it('t14 getting record for lang=xxx by passing filter over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'xxx')
    .get(url + '?filter={"where" : {"key" : "city"} }' )
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('City-xxx');
      done();
    });
  });

  it('t15 getting record for lang=xxx by passing scope instead of header over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
    .get(url + '?filter={"where" : {"key" : "city"} , "scope" : {"lang" : "xxx"}}')
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('City-xxx');
      done();
    });
  });


  it('t16 should not get record if lang is not passed in scope or header', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', '')
    .get(url + '?filter={"where" : {"key" : "city"}}')
    .end(function (err, response) {
      var result = response.body;
      expect(result.length).to.equal(0);
      done();
    });
  });


  it('t17 create default record for lang=xxx city over HTTP REST API', function (done) {
    var url2 = url + '?access_token=' + infyToken;
    api.set('Accept', 'application/json')
    .post(url2)
    .send({key: "city", value: "City-default"})
    .end(function (err, response) {
      var result = response.body;
      expect(result.value).to.be.equal("City-default");
      done();
    });
  });


  it('t18 increasing code coverage for middleware by passing additional parameters in headers', function (done) {
    api.set('Accept', 'application/json')
       .set('accept-language', '')
      .set('x-ctx-weight-lang', '50')
      .set('x-something', 'something')
    .get(url + '?filter={"where" : {"key" : "city"}}')
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal("City-default");
      done();
    });
  });

  it('t19 getting default record with no scope for metadata model', function (done) {
    MetaData.find({}, {}, function (err, results) {
      expect(results[0].value).to.equal('Country');
      expect(results[0].scope).to.be.undefined;
      return done(err);
    });
  });



  it('t20 getting record for lang=eng-us', function (done) {
    MetaData.find({}, { ctx: { lang: "en-us" } }, function (err, results) {
      expect(results[0].value).to.equal('Country-US');
      return done(err);
    });
  });

  it('t21 getting record for lang=fr', function (done) {
    MetaData.find({}, { ctx: { lang: "fr" } }, function (err, results) {
      expect(results[0].value).to.equal('Country-FR');
      return done(err);
    });
  });
  var metaurl = basePath + "/MetaDatas";
  it('t22 getting record for lang=eng-us over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
    .set('accept-language', 'en-US')
    .get(metaurl)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country-US');
      done();
    });
  });
  it('t23 getting default record by not passing language us over HTTP REST API', function (done) {
    api.set('Accept', 'application/json')
    .set('accept-language', '')
    .get(metaurl)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country');
      done();
    });
  });


});

