// Modules
var bind = require('bind')
  , guid = require('guid')
  , each = require('each')
  , Emitter = require('emitter');

// DDP Protocol:
// https://github.com/meteor/meteor/blob/master/packages/livedata/DDP.md

/////////////////////
// DDP Constructor //
/////////////////////

var DDP = function(socket){
  if (!(this instanceof DDP)) return new DDP(socket);
  if (!socket) throw new TypeError('DDP() requires a socket.');
  this.socket = socket;
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

DDP.prototype.connect = function(fn){
  if (fn) this.callbacks.connected = fn;
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

DDP.prototype.call = function(name){
  var fn;
  var args = Array.prototype.slice.call(arguments, 1);
  if (args.length && typeof args[args.length - 1] === 'function')
    fn = args.pop();

  return this.apply(name, args, fn);
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
 * @return {id} the id of the subscription.
 */

DDP.prototype.subscribe = function(name, params, fn){
  if (typeof params === 'function') fn = params;
  var id = guid();
  if (fn) this.callbacks[id] = fn;
  this.send({
    msg: 'sub',
    id: id,
    name: name,
    params: params
  });
  return id;
};

// We need the ID provided to sub in order to unsubscribe
// returned from subscribe method.
DDP.prototype.unsubscribe = function(id){
  this.send({
    msg: 'unsub',
    id: id
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

    // This isn't (currently) part of the DDP1 protocol, but
    // I'm leaving it in for now. It's useful for when you want to
    // send an entire snapshot of a collection. It's also useful if
    // you don't want to constantly run a database diff (w/ snapshots)
    // and simply want the client to sort out what is new, removed,
    // or changed.
    case 'data':
      this.emit('data', data);
      return;

    // We need a better 'collection' hook, one so that we can use
    // our own custom collections that emit events... and even
    // our own custom models.

    // Document added to collection
    //
    // collection: string (collection name)
    // id: string (document ID)
    // fields: optional object with EJSON values
    case 'added':
      this.emit('added', data);
      return;

    // Document removed from collection
    //
    // collection: string (collection name)
    // id: string (document ID)

    case 'removed':
      this.emit('removed', data);
      return;

    // Document changed in collection
    //
    // collection: string (collection name)
    // id: string (document ID)
    // fields: optional object with EJSON values
    // cleared: optional array of strings (field names to delete)
    case 'changed':
      this.emit('changed', data);
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
