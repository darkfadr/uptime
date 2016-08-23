/*
 * Monitor remote server uptime.
 */

import http       from 'http';
import url        from 'url';
import express    from 'express';
import config     from 'config';
import socketIo   from 'socket.io';
import fs         from 'fs';
var monitor    = require('./lib/monitor');
import Analyzer from './lib/analyzer';
var CheckEvent = require('./models/checkEvent');
var Ping       = require('./models/ping');
var PollerCollection = require('./lib/pollers/pollerCollection');
import apiApp from './app/api/app';
var dashboardApp = require('./app/dashboard/app');

let serverUrl = url.parse(config.url);
let port = process.env.PORT || serverUrl || 80;
const host = process.env.HOST || serverUrl.hostname;

// database

import mongoose from './bootstrap';

var a = new Analyzer(config.analyzer);
a.start();

// web front

var app = module.exports = express();
var server = http.createServer(app);

app.configure(function(){
  app.use(app.router);
  // the following middlewares are only necessary for the mounted 'dashboard' app, 
  // but express needs it on the parent app (?) and it therefore pollutes the api
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('Z5V45V6B5U56B7J5N67J5VTH345GC4G5V4'));
  app.use(express.cookieSession({
    key:    'uptime',
    secret: 'FZ5HEE5YHD3E566754:JBV*DV$SFNSF35725745BY4DSFZ4',
    proxy:  true,
    cookie: { maxAge: 60 * 60 * 1000 }
  }));
  app.set('pollerCollection', new PollerCollection());
});

// load plugins (may add their own routes and middlewares)
config.plugins.forEach(function(pluginName) {
  var plugin = require(pluginName);
  if (typeof plugin.initWebApp !== 'function') return;
  console.log('loading plugin %s on app', pluginName);
  plugin.initWebApp({
    app:       app,
    api:       apiApp,       // mounted into app, but required for events
    dashboard: dashboardApp, // mounted into app, but required for events
    io:        io,
    config:    config,
    mongoose:  mongoose
  });
});

app.emit('beforeFirstRoute', app, apiApp);

app.configure('development', () => {
  config.verbose && mongoose.set('debug', true);
  app.use(express.static(`${__dirname}/public`));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', () => {
  app.use(express.static(`${__dirname}/public`, { maxAge: 31557600000 }));
  app.use(express.errorHandler());
});

// Routes
app.emit('beforeApiRoutes', app, apiApp);
app.use('/api', apiApp);
app.emit('beforeDashboardRoutes', app, dashboardApp);
app.use('/dashboard', dashboardApp);

app.get('/', (req, res)  => res.redirect('/dashboard/events'));
app.get('/favicon.ico', (req, res) => res.redirect(301, '/dashboard/favicon.ico'));

app.emit('afterLastRoute', app);

// Sockets
//TODO: pass io object to controllers and route handlers to further decouple app.js
var io = socketIo.listen(server);

io.configure('production', () => {
  io.enable('browser client etag');
  io.set('log level', 1);
});

io.configure('development', () => {
  !config.verbose && io.set('log level', 1);
});

CheckEvent.on('afterInsert', (event) => {
  io.sockets.emit('CheckEvent', event.toJSON());
});

io.sockets.on('connection', socket => {
  socket.on('set check', check => socket.set('check', check));
  Ping.on('afterInsert', ping => {
    socket.get('check', (err, check) => {
      (ping.check == check) && socket.emit('ping', ping);
    });
  });
});

// old way to load plugins, kept for BC
fs.exists('./plugins/index.js', (exists) => {
  if (exists) {
    const pluginIndex = require('./plugins');
    const initFunction = pluginIndex.init || pluginIndex.initWebApp;
    if (typeof initFunction === 'function') {
      initFunction({
        app:       app,
        api:       apiApp,       // mounted into app, but required for events
        dashboard: dashboardApp, // mounted into app, but required for events
        io:        io,
        config:    config,
        mongoose:  mongoose
      });
    }
  }
});

module.exports = app;

var monitorInstance;

if (!module.parent) {
  if (config.server && config.server.port) {
    console.error('Warning: The server port setting is deprecated, please use the url setting instead');
    port = config.server.port;
  } else {
    port = serverUrl.port || 80;
  }
  
  server.listen(port, () => console.log(`Express server listening on host ${host}, port ${port} in ${app.settings.env} mode`));
  server.on('error', e => {
    if (monitorInstance) {
      monitorInstance.stop();
      process.exit(1);
    }
  });
}

// monitor
if (config.autoStartMonitor) {
  monitorInstance = require('./monitor');
}
