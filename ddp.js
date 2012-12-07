// TO DO
// use SockJS client, wrap it as a component
// use component event emitter


var DDPClient = function(options) {
	options = options || {};
	var self = this; 
	self.host = options.host || 'localhost';
	self.port = options.port || 3000;
	self.path = options.path || 'sockjs';

	self.collections = {}; 

	self._next_id = 0; 
	self._callbacks = {}; 
}

DDPClient.prototype._prepareHandlers = function(){
	var self = this; 
	
	this.socket.onmessage = function(e){
		console.log('message', e.data);
		self._message(e.data, e.type);
	};

	this.socket.onerror = function(){
		console.log('error');
	};

	this.socket.onopen = function(){
		console.log('opened');
		self._send({msg: 'connect'});
	};
}

DDPClient.prototype._send = function(data) {
	console.log('SEND', data);
	this.socket.send(JSON.stringify(data));
}

DDPClient.prototype._message = function(data, flags) {
	var self = this
		, data = JSON.parse(data);

	if (!data.msg) {
		return; 
	} else if (data.msg === 'connected') {
		if (self._callbacks.connected)
			self._callbacks.connected(); 

	// method result 
	} else if (data.msg === 'result') {
		var cb = self._callbacks[data.id];

		if (cb) {
			cb(data.error, data.result);
			delete self._callbacks[data.id]
		}

	// missing subscription
	} else if (data.msg === 'nosub') {
		var cb = self._callbacks[data.id];

		if (cb) {
			cb(data.error);
			delete self._callbacks[data.id];
		}

	} else if (data.msg === 'data') {

		if (data.collection) {
			console.log('update collection', data);
			self._updateCollection(data);
		} else if (data.subs) {

			_.each(data.subs, function(id){
				var cb = self._callbacks[id];
				if (cb) {
					cb();
					delete self._callbacks[id]
				}
			});
		}
	}
}

DDPClient.prototype._nextId = function() {
	return (this._next_id += 1).toString(); 
}

DDPClient.prototype._updateCollection = function(data) {
	var self = this;

	var name = data.collection, id = data.id; 

	if (!self.collections[name])
		self.collections[name] = {};
	if (!self.collections[name][id])
		self.collections[name][id] = {};

	if (data.set) {
		_.each(data.set, function(value, key) {
			self.collections[name][id][key] = value; 
		});
	}

	if (data.unset) {
		_.each(data.unset, function(value, key){
			delete self.collections[name][id][key];
		});
	}

	if (_.isEmpty(self.collections[name][id]))
		delete self.collections[name][id];


}

// Public API 

DDPClient.prototype.connect = function(callback){
	var self = this;

	if (callback)
		self._callbacks.connected = callback; 

	this.socket = new SockJS('http://localhost:3000/sockjs');
	self._prepareHandlers(); 
	return this; 
}

DDPClient.prototype.call = function(name, params, callback) {
	var self = this
		, id = self._nextId();

	if (callback)
		self._callbacks[id] = callback; 

	self._send({msg: 'method', id: id, method: name, params: params });
}


DDPClient.prototype.subscribe = function(name, params, callback) {
	var self = this
		, id = self._nextId();

	if (callback)
		self._callbacks[id] = callback; 

	self._send({msg: 'sub', id: id, name: name, params: params });
}