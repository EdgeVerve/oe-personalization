const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const daoutils = require('loopback-datasource-juggler/lib/utils');
const util = require('oe-cloud/lib/common/util')
var _ = require('lodash');

const log = require('oe-logger')('oe-personalization-lib-wrapper');


function byIdQuery(m, id) {
  var pk = util.idName(m);
  var query = {
      where: {}
  };
  query.where[pk] = id;
  return query;
}

function removeIdValue(m, data) {
  delete data[idName(m)];
  return data;
}



const _upsert = DataAccessObject.upsert;
DataAccessObject.updateOrCreate = DataAccessObject.upsert = function upsert(data, options, cb) {
  var self=this;

  if (!self.definition.settings.mixins.DataPersonalizationMixin) {
    return _upsert.apply(self, [].slice.call(arguments));
  }

  var id = util.getIdValue(self, data);
  var dataScope = data.scope;

  if (!id || !dataScope) {
    return _upsert.apply(self, [].slice.call(arguments));
  }

  var newCtx = {};

  if(dataScope){
    Object.keys(dataScope).forEach(function (k) {
      newCtx[k] = this[k];
    }, dataScope);
  }

  var q = byIdQuery(this, id);
  self.find(q, { ctx : newCtx }, function(err, r){
    if(err){
      log.error(ctx.options, 'Error while finding record. ', err);
      return cb(err);
    }
    if(r && r.length >=1){
      var inst = r[0];
      var resultScope = (inst.scope && inst.scope.__data) || inst.scope;
      if (dataScope && !(_.isEqual(dataScope, resultScope))) {
        if (self.definition.settings.idInjection) {
          removeIdValue(self, data);
          return self.create(data, options, cb);
        }
        else {
          var error = new Error();
          error.name = 'Data Error';
          error.message = 'Manual scope change update with same id not allowed';
          error.code = 'DATA_ERROR_023';
          error.type = 'ScopeChangeWithSameId';
          error.retriable = false;
          error.status = 422;
          return cb(error);
        }        
      }
    }
    else{
      return self.create(data, options, cb);
    }

  });
  // call original create function
  
}

