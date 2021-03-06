const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
// const daoutils = require('loopback-datasource-juggler/lib/utils');
const util = require('oe-cloud/lib/common/util');
var _ = require('lodash');

const log = require('oe-logger')('oe-personalization');

var _createOptionsFromRemotingContext = loopback.findModel('Model').createOptionsFromRemotingContext;

function _newCreateOptionsFromRemotingContext(ctx) {
  var options = _createOptionsFromRemotingContext.call(this, ctx);
  var callContext = null;
  if (ctx && ctx.req && ctx.req.callContext && ctx.req.callContext.ctx) {
    callContext = ctx.req.callContext;
  }
  // options.ctx = {tenantId: 'default'};
  if (!options.ctx) options.ctx = {};
  if (!callContext) { return options; }
  for (var p in callContext.ctx) {
    if (callContext.ctx.hasOwnProperty(p) && !options.ctx.hasOwnProperty(p)) {
      options.ctx[p] = callContext.ctx[p];
    }
  }
  if (callContext.ctxWeights) {
    if (!options.ctxWeights) options.ctxWeights = {};
    for (p in callContext.ctxWeights) {
      if (callContext.ctxWeights.hasOwnProperty(p) && !options.ctxWeights.hasOwnProperty(p)) {
        options.ctxWeights[p] = callContext.ctxWeights[p];
      }
    }
  }
  return options;
}

if (_createOptionsFromRemotingContext) {
  for (var m in loopback.registry.modelBuilder.models) {
    if (loopback.registry.modelBuilder.models.hasOwnProperty(m)) {
      loopback.registry.modelBuilder.models[m].createOptionsFromRemotingContext = _newCreateOptionsFromRemotingContext;
    }
  }
}


function byIdQuery(m, id) {
  var pk = util.idName(m);
  var query = {
    where: {}
  };
  query.where[pk] = id;
  return query;
}

function removeIdValue(m, data) {
  delete data[util.idName(m)];
  return data;
}

function findByIdAndCreate(self, id, data, options, cb) {
  if (!id) {
    return self.create(data, options, cb);
  }
  var q = byIdQuery(self, id);
  var flagOptionsModified = false;
  if (typeof options.fetchAllScopes === 'undefined') {
    options.fetchAllScopes = true;
    flagOptionsModified = true;
  }
  self.find(q, options, function (err, r) {
    if (flagOptionsModified) {
      delete options.fetchAllScopes;
    }
    if (err) {
      log.error(options, 'Error while finding record. ', err);
      return cb(err);
    }
    if (r && r.length >= 1) {
      var inst = r[0];
      var properties = self.definition.properties;
      for (var p in properties) {
        if (properties.hasOwnProperty(p) && p.toLowerCase() !== 'id' && p.toLowerCase() !== 'scope' && p.toLowerCase() !== '_scope'
          && !data.hasOwnProperty(p)) {
          data[p] = inst[p];
        }
      }
      var resultScope = (inst.scope && inst.scope.__data) || inst.scope || null;
      data.scope = data.scope || null;
      if (!_.isEqual(data.scope, resultScope)) {
        if (self.definition.settings.idInjection) {
          removeIdValue(self, data);
          return self.create(data, options, cb);
        }

        var error = new Error({ name: 'Data Error', message: 'Manual scope change update with same id not allowed', code: 'DATA_ERROR_023', type: 'ScopeChangeWithSameId', retriable: false, status: 422 });
        return cb(error);
      }

      return cb('NO-ACTION', inst);
    }

    // removeIdValue(self, data);
    return self.create(data, options, cb);
  });
}


function callUpdateOnModel(self, actualFn, args) {
  var model = self;
  var ary = [];
  if (args.hasOwnProperty('id')) {
    ary.push(args.id);
  }
  ary.push(args.data);
  ary.push(args.options);
  var optionsIndex = ary.length;
  ary.push(args.cb);
  if (self.constructor.name !== 'Function') {
    model = self.constructor;
  }
  if (!model.definition.settings.mixins || !model.definition.settings.mixins.DataPersonalizationMixin) {
    return actualFn.apply(self, ary);
  }
  var id = args.id || util.getIdValue(model, args.data);

  var dataScope = args.data.scope;
  if (!id) {
    return model.create.apply(model, ary);
  }

  // var q = byIdQuery(model, id);

  var newOptions = args.options;
  if (!newOptions) {
    newOptions = {};
  }
  // var saveContext = args.options.ctx;
  if (!newOptions.ctx) {
    newOptions.ctx = {};
  }

  // var newCtx = Object.assign({}, args.options);
  // if (!newCtx.ctx) {
  // newCtx.ctx = {};
  // }
  // design break. should not use autoscope here.
  const modelSettings = model.definition.settings;
  const autoScope = modelSettings.autoscope;
  if (dataScope) {
    Object.keys(dataScope).forEach(function (k) {
      // must not be allowed to change autoscope fields
      if (autoScope && autoScope.indexOf && autoScope.indexOf(k) >= 0) {
        return;
      }
      newOptions.ctx[k] = this[k];
    }, dataScope);
  }


  findByIdAndCreate(model, id, args.data, newOptions, function (err, r) {
    // newOptions.ctx = saveContext;
    if (err === 'NO-ACTION') {
      ary[optionsIndex - 1] = newOptions;
      return actualFn.apply(self, ary);
    }
    if (err) {
      return args.cb(err);
    }
    return args.cb(err, r);
  });
}

// this function is called for PUT by ID request
const _replaceById = DataAccessObject.replaceById;
DataAccessObject.replaceById = function replaceById(id, data, options, cb) {
  var self = this;
  if (!id) {
    return _replaceById.call(self, id, data, options, cb);
  }
  return callUpdateOnModel(self, _replaceById, { id, data, options, cb });
};

// this function is called for PUT request.
const _replaceOrCreate = DataAccessObject.replaceOrCreate;
DataAccessObject.replaceOrCreate = DataAccessObject.updateOrCreate = function (data, options, cb) {
  var self = this;
  // var id = util.getIdValue(self, data);
  return callUpdateOnModel(self, _replaceOrCreate, { data, options, cb });
};

const _updateAttributes = DataAccessObject.prototype.updateAttributes;
DataAccessObject.prototype.updateAttributes =
  DataAccessObject.prototype.patchAttributes = function (data, options, cb) {
    var self = this;
    var idField = this.getIdName();
    data[idField] = data[idField] || self[idField];
    return callUpdateOnModel(self, _updateAttributes, { data, options, cb });
  };

const _upsert = DataAccessObject.upsert;
DataAccessObject.updateOrCreate =
  DataAccessObject.patchOrCreate =
  DataAccessObject.upsert = function upsert(data, options, cb) {
    var self = this;
    // var id = util.getIdValue(self, data);

    return callUpdateOnModel(self, function (data, opts, cb) {
      return _upsert.call(self, data, opts, cb);
    }, { data, options, cb });
  };
