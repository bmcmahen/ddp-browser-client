// Modules
var bind = require('bind')
  , guid = require('guid')
  , each = require('each')
  , Emitter = require('emitter');


/////////////////////
// DDP Constructor //
/////////////////////

var DDP = function(options){
  options = (options || {});
  this.host = options.host || 'localhost';
  this.port = options.port || 3000;
  this.path = options.path || 'sockjs';
  this.collections = {};
  this.callbacks = {};
};

Emitter(DDP.prototype);

module.exports = DDP;

/**
 * Connection to our SockJS server
 * @param  {Socket Constructor} Socket sockjs, websocket, etc
 * @param  {callback} fn
 * @return {DDP}
 */

DDP.prototype.connect = function(Socket, fn){
  if (fn) this.callbacks.connected = fn;
  var url = 'http://' + this.host + ':' + this.port + '/' + this.path;
  this.socket = new Socket(url);
  this.bindSocketHandlers();
  return this;
};

/**
 * Bind our socket event handlers
 */

DDP.prototype.bindSocketHandlers = function(){
  this.socket.onmessage = bind(this, this.onMessage);
  this.socket.onerror = bind(this, this.onError);
  this.socket.onopen = bind(this, this.onOpen);
};


/**
 * Simple helper that strignifys JSON and
 * sends it over our socket.
 * @param  {object} json
 */

DDP.prototype.send = function(json){
  this.socket.send(JSON.stringify(json));
};

/**
 * Call a method on the server
 */

DDP.prototype.call = function(){
  var params = []
    , name, fn;

  for (var i = 0; i < arguments.length; i++){
    if (i === 0) name = arguments[i];
    else if (i === arguments.length - 1) fn = arguments[i];
    else params.push(arguments[i]);
  }

  this.apply(name, params, fn);
};

/**
 * Apply a method on the server
 * @param  {string}   name   method name
 * @param  {array}   params  array of params
 * @param  {callback} fn
 */

DDP.prototype.apply = function(name, params, fn){
  if (typeof params === 'function') fn = params;
  var id = guid();
  if (fn) this.callbacks[id] = fn;
  this.send({
    msg: 'method',
    id: id,
    method: name,
    params: params
  });
};

/**
 * Subscribe to a collection on the server
 * @param  {string}   name   subscription name
 * @param  {array}   params
 * @param  {callback} fn
 */

DDP.prototype.subscribe = function(name, params, fn){
  var id = guid();
  if (fn) this.callbacks[id] = fn;
  this.send({
    msg: 'sub',
    id: id,
    name: name,
    params: params
  });
};

/**
 * Call the appropriate callback when receiving
 * a message.
 * @param  {event} e
 */

DDP.prototype.onMessage = function(e){
  var type = e.type;
  var data = JSON.parse(e.data);
  var _this = this;
  var cb, name, id;

  if (!data.msg) return;

  switch (data.msg) {

    // Connection failure.
    case 'failed':
      this.emit('failed', data);
      return;

    // Succesfully connected.
    case 'connected' :
      this.emit('connected');
      if (this.callbacks.connected)
        this.callbacks.connected();
      return;

    // Method result.
    case 'result' :
      cb = this.callbacks[data.id];
      if (cb) {
        cb(data.error, data.result);
        delete this.callbacks[data.id];
      }
      return;

    // Missing Subscription
    case 'nosub' :
      cb = this.callbacks[data.id];
      if (cb) {
        cb(data.error);
        delete this.callbacks[data.id];
      }
      return;

    // Document added to collection
    case 'added':
      if (data.collection){
        name = data.collection;
        id = data.id;

        this.collections[name] = this.collections[name] || {};
        this.collections[name][id] = this.collections[name][id] || {};

        if (data.fields){
          each(data.fields, function(val, key){
            _this.collections[name][id][key] = value;
          });
        }
      }
      return;

    // Document removed from collection
    case 'removed':
      if (data.collection){
        name = data.collection;
        id = data.id;

        if (!this.collections[name][id]) return;
        delete this.collections[name][id];
      }
      return;

    // Document changed in collection
    case 'changed':
      if (data.collection){
        name = data.collection;
        id = data.id;

        if (!this.collections[name]) return;
        if (!this.collections[name][id]) return;

        if (data.fields){
          each(data.fields, function(val, key){
            _this.collections[name][id][key] = value;
          });
        }

        if (data.cleared){
          each(data.cleared, function(val){
            delete _this.collections[name][id][value];
          });
        }
      }
      return;

    // Subscription is ready
    case 'ready':
      each(data.subs, function(id){
        cb = _this.callbacks[id];
        if (cb) {
          cb();
          delete _this.callbacks[id];
        }
      });
      return;
  }
};

/**
 * Handle errors
 * @param  {event} e
 */

DDP.prototype.onError = function(e){
  console.log('error');
};

/**
 * When our socket opens...
 * @param  {event} e
 */

DDP.prototype.onOpen = function(e){
  this.send({
    msg: 'connect',
    version: 'pre1',
    support: ['pre1']
  });
};
