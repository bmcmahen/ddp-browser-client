;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    module.exports = {};
    module.client = module.component = true;
    module.call(this, module.exports, require.relative(resolved), module);
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);
  var index = path + '/index.js';

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
  }

  if (require.aliases.hasOwnProperty(index)) {
    return require.aliases[index];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("component-indexof/index.js", function(exports, require, module){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
});
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = index(callbacks, fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("component-bind/index.js", function(exports, require, module){

/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = [].slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

});
require.register("apily-guid/index.js", function(exports, require, module){

/**
 * guid
 * Simple prefixed unique id generator
 * 
 * @copyright 2013 Enrico Marino and Federico Spini
 * @license MIT
 */

/**
 * Expose `guid`
 */

module.exports = guid;

/**
 * id
 */

var id = 0;

/**
 * guid
 *
 * @param {String} prefix prefix
 * @return {String} prefixed unique id
 * @api public
 */

function guid (prefix) {
  prefix = prefix || '';
  id += 1;
  return prefix + id;
};

});
require.register("component-type/index.js", function(exports, require, module){

/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};

});
require.register("component-each/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var type = require('type');

/**
 * HOP reference.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Iterate the given `obj` and invoke `fn(val, i)`.
 *
 * @param {String|Array|Object} obj
 * @param {Function} fn
 * @api public
 */

module.exports = function(obj, fn){
  switch (type(obj)) {
    case 'array':
      return array(obj, fn);
    case 'object':
      if ('number' == typeof obj.length) return array(obj, fn);
      return object(obj, fn);
    case 'string':
      return string(obj, fn);
  }
};

/**
 * Iterate string chars.
 *
 * @param {String} obj
 * @param {Function} fn
 * @api private
 */

function string(obj, fn) {
  for (var i = 0; i < obj.length; ++i) {
    fn(obj.charAt(i), i);
  }
}

/**
 * Iterate object keys.
 *
 * @param {Object} obj
 * @param {Function} fn
 * @api private
 */

function object(obj, fn) {
  for (var key in obj) {
    if (has.call(obj, key)) {
      fn(key, obj[key]);
    }
  }
}

/**
 * Iterate array-ish.
 *
 * @param {Array|Object} obj
 * @param {Function} fn
 * @api private
 */

function array(obj, fn) {
  for (var i = 0; i < obj.length; ++i) {
    fn(obj[i], i);
  }
}
});
require.register("ddp-browser-client/index.js", function(exports, require, module){
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

});
require.alias("component-emitter/index.js", "ddp-browser-client/deps/emitter/index.js");
require.alias("component-emitter/index.js", "emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-bind/index.js", "ddp-browser-client/deps/bind/index.js");
require.alias("component-bind/index.js", "bind/index.js");

require.alias("apily-guid/index.js", "ddp-browser-client/deps/guid/index.js");
require.alias("apily-guid/index.js", "guid/index.js");

require.alias("component-each/index.js", "ddp-browser-client/deps/each/index.js");
require.alias("component-each/index.js", "each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

if (typeof exports == "object") {
  module.exports = require("ddp-browser-client");
} else if (typeof define == "function" && define.amd) {
  define(function(){ return require("ddp-browser-client"); });
} else {
  this["ddp"] = require("ddp-browser-client");
}})();