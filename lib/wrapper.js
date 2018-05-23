const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const daoutils = require('loopback-datasource-juggler/lib/utils');
const util = require('oe-cloud/lib/common/util')
var _ = require('lodash');

const log = require('oe-logger')('oe-personalization');


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

function findByIdAndCreate(self, q, options, cb){
  self.find(q, options, function(err, r) {
    if(err){
      log.error(ctx.options, 'Error while finding record. ', err);
      return cb(err);
    }
    if(r && r.length >=1){
      var inst = r[0];
      var resultScope = (inst.scope && inst.scope.__data) || inst.scope;
      if (!_.isEqual(dataScope, resultScope)) {
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
      else{
        return cb('NO-ACTION', inst);
      }    
    }
    else{
      return self.create.call(self, data, options, cb);
    }  
  });
}

// this function is called for PUT by ID request
const _replaceById = DataAccessObject.replaceById;
DataAccessObject.replaceById = function replaceById(id, data, options, cb) {
  var self=this;
  if(!id){
    return _replaceById.call(self, id, data, options, cb);
  }

  var newCtx = {};

  if(dataScope){
    Object.keys(dataScope).forEach(function (k) {
      newCtx[k] = this[k];
    }, dataScope);
  }

  var q = byIdQuery(this, id);
  findByIdAndCreate(self, q, {ctx:newCtx}, function(err, r) {
    if(err === 'NO-ACTION'){
      return _replaceById.call(self, id, data, options, cb);
    }
    if(err){
      return cb(err);
    }
    return cb(err, r);
  });
}

// this function is called for PUT request.
const _replaceOrCreate = DataAccessObject.replaceOrCreate;
DataAccessObject.replaceOrCreate = DataAccessObject.updateOrCreate = DataAccessObject.upsert = function upsert(data, options, cb) {
  var self=this;
  if (!self.definition.settings.mixins.DataPersonalizationMixin) {
    return _upsert.apply(self, [].slice.call(arguments));
  }

  var id = util.getIdValue(self, data);
  var dataScope = data.scope;

  if (!id || !dataScope) {
    return self.creaet.call(self, data, options, cb);
  }

  var newCtx = {};

  if(dataScope){
    Object.keys(dataScope).forEach(function (k) {
      newCtx[k] = this[k];
    }, dataScope);
  }

  var q = byIdQuery(this, id);
  findByIdAndCreate(self, q, {ctx:newCtx}, function(err, r) {
    if(err === 'NO-ACTION'){
      r.replaceAttributes(data, options, cb);
    }
    if(err){
      return cb(err);
    }
    return cb(err, r);
  });
}
