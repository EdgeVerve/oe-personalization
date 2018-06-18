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
    .get(url + '?filter={"where" : {"key" : "city"}}')
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal("City-default");
      done();
    });
  });

  it('t19 calling javascript API with special flag fetchAllScope', function (done) {
    Label.find({}, { fetchAllScopes: true }, function (err, results) {
      expect(results.length).to.be.above(5);
      expect(results.length).to.equal(11);
      return done(err);
    });
  });


  it('t20 create more records for lang=xxx and device (more than one context)over HTTP REST API', function (done) {
    var url2 = url + '?access_token=' + infyToken;
    api.set('Accept', 'application/json')
    .post(url2)
    .send([{ key: "ssn", value: "SSN", scope: { lang: "xxx", device: "mobile" } },
          { key: "ssn", value: "SSN-xxx", scope: { lang: "xxx" } },
          { key: "ssn", value: "SSN-mobile", scope: { device: "mobile" } },
          { key: "ssn", value: "SSN-xxx-tab", scope: { lang: "xxx", device: "tab" } },
          { key: "ssn", value: "Social Security Number" },
          { key: "aadhar", value: "AADHAR" },
          { key: "aadhar", value: "AADHAR-mobile", scope: { device: "mobile" } },
          { key: "aadhar", value: "AADHAR-xxx", scope: { lang: "xxx" } }
    ])
    .end(function (err, response) {
      var result = response.body;
      expect(result.length).to.be.equal(8);
      done();
    });
  });

  it('t21 do nothing test', function (done) {
    return done();
  });

  it('t22 calling javascript API with more than one context', function (done) {
    Label.find({ where: { key: "aadhar" } }, { ctx: { lang: "xxx", device: "mobile" }, ctxWeights: { lang: 100 } }, function (err, results) {
      expect(results[0].value).to.equal("AADHAR-xxx");
      return done(err);
    });
  });

  it('t23 calling javascript API with more than one context with weight', function (done) {
    Label.find({ where: { key: "aadhar" } }, { ctx: { lang: "xxx", device: "mobile" }, ctxWeights: { device :100} }, function (err, results) {
      expect(results[0].value).to.equal("AADHAR-mobile");
      return done(err);
    });
  });


  it('t24 calling javascript API with without context', function (done) {
    Label.find({ where: { key: "aadhar" } }, {}, function (err, results) {
      expect(results[0].value).to.equal("AADHAR");
      return done(err);
    });
  });

  it('t25 calling javascript API without context (2)', function (done) {
    Label.find({ where: { key: "ssn" } }, {}, function (err, results) {
      expect(results[0].value).to.equal("Social Security Number");
      return done(err);
    });
  });

  it('t26 calling javascript API with more than one context', function (done) {
    Label.find({ where: { key: "ssn" } }, { ctx: { lang: "xxx", device : "mobile" } }, function (err, results) {
      expect(results[0].value).to.equal("SSN");
      return done(err);
    });
  });

  it('t27 calling javascript API with one context', function (done) {
    Label.find({ where: { key: "ssn" } }, { ctx: { device: "mobile" } }, function (err, results) {
      expect(results[0].value).to.equal("SSN-mobile");
      return done(err);
    });
  });


  it('t28 calling javascript API with one context(2)', function (done) {
    Label.find({ where: { key: "ssn" } }, { ctx: { lang: "xxx" } }, function (err, results) {
      expect(results[0].value).to.equal("SSN-xxx");
      return done(err);
    });
  });

  it('t29 getting default record with no scope for metadata model for memory connector', function (done) {
    MetaData.find({}, {}, function (err, results) {
      expect(results[0].value).to.equal('Country');
      expect(results[0].scope).to.be.undefined;
      return done(err);
    });
  });

  it('t30 getting record for lang=eng-us for memory connector', function (done) {
    MetaData.find({}, { ctx: { lang: "en-us" } }, function (err, results) {
      expect(results[0].value).to.equal('Country-US');
      return done(err);
    });
  });

  it('t31 getting record for lang=fr for memory connector', function (done) {
    MetaData.find({}, { ctx: { lang: "fr" } }, function (err, results) {
      expect(results[0].value).to.equal('Country-FR');
      return done(err);
    });
  });
  var metaurl = basePath + "/MetaDatas";
  it('t32 getting record for lang=eng-us over HTTP REST API for memory connector', function (done) {
    api.set('Accept', 'application/json')
    .set('accept-language', 'en-US')
    .get(metaurl)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country-US');
      done();
    });
  });
  it('t33 getting default record by not passing language us over HTTP REST API for memory connector', function (done) {
    api.set('Accept', 'application/json')
    .set('accept-language', '')
    .get(metaurl)
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal('Country');
      done();
    });
  });



  it('t34 create more records for lang=xxx and device (more than one context)over HTTP REST API - repeating test for memory connector', function (done) {
    var url2 = metaurl + '?access_token=' + infyToken;
    api.set('Accept', 'application/json')
    .post(url2)
    .send([{ key: "ssn", value: "SSN", scope: { lang: "xxx", device: "mobile" } },
          { key: "ssn", value: "SSN-xxx", scope: { lang: "xxx" } },
          { key: "ssn", value: "SSN-mobile", scope: { device: "mobile" } },
          { key: "ssn", value: "SSN-xxx-tab", scope: { lang: "xxx", device: "tab" } },
          { key: "ssn", value: "Social Security Number" },
          { key: "aadhar", value: "AADHAR" },
          { key: "aadhar", value: "AADHAR-mobile", scope: { device: "mobile" } },
          { key: "aadhar", value: "AADHAR-xxx", scope: { lang: "xxx" } }
    ])
    .end(function (err, response) {
      var result = response.body;
      expect(result.length).to.be.equal(8);
      done();
    });
  });

  it('t35 calling javascript API with more than one context- repeating test for memory connector', function (done) {
    MetaData.find({ where: { key: "aadhar" } }, { ctx: { lang: "xxx", device: "mobile" }, ctxWeights: { lang: 100 } }, function (err, results) {
      expect(results[0].value).to.equal("AADHAR-xxx");
      return done(err);
    });
  });

  it('t36 calling javascript API with more than one context with weight - repeating test for memory connector', function (done) {
    MetaData.find({ where: { key: "aadhar" } }, { ctx: { lang: "xxx", device: "mobile" }, ctxWeights: { device: 100 } }, function (err, results) {
      expect(results[0].value).to.equal("AADHAR-mobile");
      return done(err);
    });
  });


  it('t37 calling javascript API with without passing context - repeating test for memory connector', function (done) {
    MetaData.find({ where: { key: "aadhar" } }, {}, function (err, results) {
      expect(results[0].value).to.equal("AADHAR");
      return done(err);
    });
  });

  it('t38 calling javascript API with more than one context(2) - repeating test for memory connector', function (done) {
    MetaData.find({ where: { key: "ssn" } }, {}, function (err, results) {
      expect(results[0].value).to.equal("Social Security Number");
      return done(err);
    });
  });

  it('t39 calling javascript API with more than one context (passing two context values)- repeating test for memory connector', function (done) {
    MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "xxx", device: "mobile" } }, function (err, results) {
      expect(results[0].value).to.equal("SSN");
      return done(err);
    });
  });

  it('t40 calling javascript API with more than one context (passing one context value)- repeating test for memory connector', function (done) {
    MetaData.find({ where: { key: "ssn" } }, { ctx: { device: "mobile" } }, function (err, results) {
      expect(results[0].value).to.equal("SSN-mobile");
      return done(err);
    });
  });


  it('t41 calling javascript API with more than one context(passing one context) - repeating test for memory connector', function (done) {
    MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "xxx" } }, function (err, results) {
      expect(results[0].value).to.equal("SSN-xxx");
      return done(err);
    });
  });

  it('t42-1 getting record based on context and context weight - language has heigher weight - for memory connector', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'xxx')
    .set('device', 'mobile')
    .set('x-ctx-weight-lang', '100')
.set('x-ctx-weight-device', '0')
    .get(metaurl + '?filter={"where" : {"key" : "aadhar"}}')
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal("AADHAR-xxx");
      done();
    });
  });

  it('t42-2 getting record based on context and context weight - device has heigher weight - for memory connector', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'xxx')
    .set('device', 'mobile')
    .set('x-ctx-weight-lang', '0')
    .set('x-ctx-weight-device', '100')
    .get(metaurl + '?filter={"where" : {"key" : "aadhar"}}')
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal("AADHAR-mobile");
      done();
    });
  });

  it('t42-3 getting record based on context and context weight - language has heigher weight', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'xxx')
    .set('device', 'mobile')
    .set('x-ctx-weight-device', '0')
    .set('x-ctx-weight-lang', '100')
    .get(url + '?filter={"where" : {"key" : "aadhar"}}')
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal("AADHAR-xxx");
      done();
    });
  });

  it('t42-4 getting record based on context and context weight - device has heigher weight', function (done) {
    api.set('Accept', 'application/json')
     .set('accept-language', 'xxx')
    .set('device', 'mobile')
    .set('x-ctx-weight-lang', '0')
    .set('x-ctx-weight-device', '100')
    .get(url + '?filter={"where" : {"key" : "aadhar"}}')
    .end(function (err, response) {
      var result = response.body;
      expect(result[0].value).to.equal("AADHAR-mobile");
      done();
    });
  });

  it('t43-1 Preparing models for update test cases', function (done) {
    MetaData.destroyAll({}, { fetchAllScopes: true }, function (err) {
      if (err) {
        return done(err);
      }
      Label.destroyAll({}, { fetchAllScopes: true }, function (err) {
        return done(err);
      })
    });
  });

  it('t43-1 Preparing models for update test cases', function (done) {
    MetaData.destroyAll({}, { fetchAllScopes: true }, function (err) {
      if (err) {
        return done(err);
      }
      Label.destroyAll({}, { fetchAllScopes: true }, function (err) {
        return done(err);
      })
    });
  });


  it('t43-2 create fresh records for lang=xxx and device (more than one context)over HTTP REST API', function (done) {
    var url2 = url + '?access_token=' + infyToken;
    api.set('Accept', 'application/json')
    .post(url2)
    .send([{ key: "ssn", value: "Social Security Number" },
          { key: "aadhar", value: "AAdhar Card" }
    ])
    .end(function (err, response) {
      var result = response.body;
      expect(result.length).to.be.equal(2);
      done();
    });
  });

  it('t43-3 create fresh records for lang=xxx and device (more than one context)over HTTP REST API - for memory connector', function (done) {
    var url2 = metaurl + '?access_token=' + infyToken;
    api.set('Accept', 'application/json')
    .post(url2)
    .send([{ key: "ssn", value: "Social Security Number" },
          { key: "aadhar", value: "AAdhar Card" }
    ])
    .end(function (err, response) {
      var result = response.body;
      expect(result.length).to.be.equal(2);
      done();
    });
  });

  it('t44-1 - trying to modify record updateAttributes - should create new record', function (done) {
    Label.find({ where: {key : "ssn"}}, {ctx:{ device : "mobile" }}, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("Social Security Number");
      var rcd = results[0];
      rcd.updateAttributes({ value: "SSN", id: rcd.id, scope: {device : "mobile"} }, {}, function (err, result) {
        expect(result.value).to.equal("SSN");
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        Label.find({ where: { key: "ssn" } }, { ctx: { device: "mobile" } }, function (err, results) {
          expect(results.length).to.equal(1);
          expect(results[0].value).to.be.equal("SSN");
          return done(err);
        });
      });
    });
  });

  it('t44-2 trying to modify record replacebyid - should create new record', function (done) {
    Label.find({ where: { key: "ssn" } }, { ctx: { lang: "xxx" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("Social Security Number");
      var rcd = results[0];
      Label.replaceById(rcd.id, { value: "SSN-xxx", id: rcd.id, key: "ssn", scope: { lang: "xxx" } }, {}, function (err, result) {
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        expect(result.value).to.equal("SSN-xxx");
        Label.find({ where: { key: "ssn" } }, { ctx: { lang: "xxx" } }, function (err, results) {
          expect(results.length).to.equal(1);
          expect(results[0].value).to.be.equal("SSN-xxx");
          return done(err);
        });
      });
    });
  });


  it('t44-3 trying to modify record replaceOrCreate - should create new record', function (done) {
    Label.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("Social Security Number");
      var rcd = results[0];
      Label.replaceOrCreate({value: "SSN-yyy", id: rcd.id, key: "ssn", scope: { lang: "yyy" } }, {}, function (err, result) {
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        expect(result.value).to.equal("SSN-yyy");
        return done();
      });
    });
  });

  it('t44-4 trying to modify record replaceOrCreate - should update existing record as scope is matching', function (done) {
    Label.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("SSN-yyy");
      var rcd = results[0];
      Label.replaceOrCreate({ value: "SSN-yyyyyy", id: rcd.id, key: "ssn", scope: { lang: "yyy" } }, {}, function (err, result) {
        expect(rcd.id.toString()).to.equal(result.id.toString());
        expect(result.value).to.equal("SSN-yyyyyy");
        Label.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
          expect(results.length).to.equal(1);
          expect(results[0].value).to.be.equal("SSN-yyyyyy");
          return done(err);
        });
      });
    });
  });
 
  it('t44-5 trying to modify record upsert - should update existing record as scope is matching', function (done) {
    Label.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("SSN-yyyyyy");
      var rcd = results[0];
      Label.upsert({ value: "SSN-modified for yyy", id: rcd.id, key : "ssn", scope: { lang: "yyy" } }, {}, function (err, result) {
        expect(rcd.id.toString()).to.equal(result.id.toString());
        expect(result.value).to.equal("SSN-modified for yyy");
        Label.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
          expect(results.length).to.equal(1);
          expect(results[0].value).to.be.equal("SSN-modified for yyy");
          return done(err);
        });
      });
    });
  });


  it('t45-1 - trying to modify record updateAttributes - should create new record (on memory connector)', function (done) {
    MetaData.find({ where: { key: "ssn" } }, { ctx: { device: "mobile" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("Social Security Number");
      var rcd = results[0];
      rcd.updateAttributes({ value: "SSN", id: rcd.id, scope: { device: "mobile" } }, {}, function (err, result) {
        expect(result.value).to.equal("SSN");
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        MetaData.find({ where: { key: "ssn" } }, { ctx: { device: "mobile" } }, function (err, results) {
          expect(results.length).to.equal(1);
          expect(results[0].value).to.be.equal("SSN");
          return done(err);
        });
      });
    });
  });

  it('t45-2 trying to modify record replacebyid - should create new record (on memory connector)', function (done) {
    MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "xxx" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("Social Security Number");
      var rcd = results[0];
      MetaData.replaceById(rcd.id, { value: "SSN-xxx", id: rcd.id, key: "ssn", scope: { lang: "xxx" } }, {}, function (err, result) {
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        expect(result.value).to.equal("SSN-xxx");
        MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "xxx" } }, function (err, results) {
          expect(results.length).to.equal(1);
          expect(results[0].value).to.be.equal("SSN-xxx");
          return done(err);
        });
      });
    });
  });


  it('t45-3 trying to modify record replaceOrCreate - should create new record (on memory connector)', function (done) {
    MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("Social Security Number");
      var rcd = results[0];
      MetaData.replaceOrCreate({ value: "SSN-yyy", id: rcd.id, key: "ssn", scope: { lang: "yyy" } }, {}, function (err, result) {
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        expect(result.value).to.equal("SSN-yyy");
        return done();
      });
    });
  });

  it('t45-4 trying to modify record replaceOrCreate - should update existing record as scope is matching (on memory connector)', function (done) {
    MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("SSN-yyy");
      var rcd = results[0];
      MetaData.replaceOrCreate({ value: "SSN-yyyyyy", id: rcd.id, key: "ssn", scope: { lang: "yyy" } }, {}, function (err, result) {
        expect(rcd.id.toString()).to.equal(result.id.toString());
        expect(result.value).to.equal("SSN-yyyyyy");
        MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
          expect(results.length).to.equal(1);
          expect(results[0].value).to.be.equal("SSN-yyyyyy");
          return done(err);
        });
      });
    });
  });

  it('t45-5 trying to modify record upsert - should update existing record as scope is matching (on memory connector)', function (done) {
    MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].value).to.be.equal("SSN-yyyyyy");
      var rcd = results[0];
      MetaData.upsert({ value: "SSN-modified for yyy", id: rcd.id, key: "ssn", scope: { lang: "yyy" } }, {}, function (err, result) {
        expect(rcd.id.toString()).to.equal(result.id.toString());
        expect(result.value).to.equal("SSN-modified for yyy");
        MetaData.find({ where: { key: "ssn" } }, { ctx: { lang: "yyy" } }, function (err, results) {
          expect(results.length).to.equal(1);
          expect(results[0].value).to.be.equal("SSN-modified for yyy");
          return done(err);
        });
      });
    });
  });



});

