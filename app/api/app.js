/**
 * Module dependencies.
 */
import express from 'express';
var Check      = require('../../models/check');
var CheckEvent = require('../../models/checkEvent');

var app = express();

function debugErrorHandler() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}

// middleware
app.configure(() => app.use(app.router));
app.configure('test', debugErrorHandler);
app.configure('development', debugErrorHandler);
app.configure('production', () => app.use(express.errorHandler()));


// up count
var upCount;
var refreshUpCount = function(callback) {
  var count = { up: 0, down: 0, paused: 0, total: 0 };
  Check
  .find()
  .select({ isUp: 1, isPaused: 1 })
  .exec(function(err, checks) {
    if (err) return callback(err);
    checks.forEach(function(check) {
      count.total++;
      if (check.isPaused) {
        count.paused++;
      } else if (check.isUp) {
        count.up++;
      } else {
        count.down++;
      }
    });
    upCount = count;
    callback();
  });
};

Check.on('afterInsert', function() { upCount = undefined; });
Check.on('afterRemove', function() { upCount = undefined; });
CheckEvent.on('afterInsert', function() { upCount = undefined; });

app.get('/checks/count', function(req, res, next) {
  if (upCount) {
    res.json(upCount);
  } else {
    refreshUpCount(function(err) {
      if (err) return next(err);
      res.json(upCount);
    });
  }
});



// endpoints
require('./routes/check')(app);
require('./routes/tag')(app);
require('./routes/ping')(app);

// route list
app.get('/', (req, res) => {
  let routes = [];
  for (var verb in app.routes) {
    app.routes[verb]
      .forEach(route => routes.push({method: verb.toUpperCase() , path: `${app.route}${route.path}`}) );
  }
  res.json(routes);
});

if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}

export default app;
