/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

var util = require('oe-cloud/lib/common/util');
module.exports = function (option) {
  return function (req, res, next) {
    if (req.query && req.query.filter) {
      var t = req.query.filter;
      if (typeof req.query.filter === 'string') {
        t = JSON.parse(req.query.filter);
      }
      if (t.scope) {
        req.callContext = util.mergeObjects(req.callContext, { ctx: t.scope });
      }
    }
    return next();
  };
};

