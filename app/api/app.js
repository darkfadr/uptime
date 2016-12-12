/**
 * Module dependencies.
 */
import express from 'express';
import {Check, CheckEvent} from '../../models';

const app = express();

function debugErrorHandler() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
}

//CORS middleware
function cors(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

// middleware
app.use(cors);
app.configure(() => app.use(app.router));
app.configure('test', debugErrorHandler);
app.configure('development', debugErrorHandler);
app.configure('production', () => app.use(express.errorHandler()));


// up count
let upCount;
const refreshUpCount = (callback) =>  {
  var count = { up: 0, down: 0, paused: 0, total: 0 };
  Check
  .find()
  .select({ isUp: 1, isPaused: 1 })
  .exec((err, checks) => {
    if (err) return callback(err);
    checks.forEach((check) => {
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

Check.on('afterInsert', () => { upCount = undefined; });
Check.on('afterRemove', () => { upCount = undefined; });
CheckEvent.on('afterInsert', () => { upCount = undefined; });

app.get('/checks/count', (req, res, next) => {
  if (upCount) {
    res.json(upCount);
  } else {
    refreshUpCount((err) => {
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
