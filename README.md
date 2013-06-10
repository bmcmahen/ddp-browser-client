ddp-browser-client
=================

Use your socket of choice (native or SockJS) websockets to connect to Meteor publish functions and methods inside of a non-Meteor javascript app. It's also useful as a general means of managing your socket connections following the DDP Protocol.

## Install

Use as a component:

	component install bmcmahen/ddp-browser-client

Or use the standalone build located in the `standalone` folder, with the constructor available under the global `ddp`.

## API

### new DDP(socket);

Pass in a socket (native, SockJS) to the DDP constructor.

### DDP.connect(fn)

### DDP.apply(name, [params], fn)

### DDP.call(name, params, fn)

### DDP.subscribe(name, params, fn)

Return an id of the subscription. Pass this to the unsubscribe method to unsubscribe.

### DDP.unsubscribe(id)

## Events

### ddp.on('connected', fn)

### ddp.on('added', fn(data))

Document added to a collection

### ddp.on('removed', fn(data))

Document removed from a collection

### ddp.on('changed', fn(data))

Document changed in a collection

## Example

		var DDP = require('bmcmahen-ddp-browser-client');
		var sock = new SockJS('http://localhost:3000/sockjs');
		var socket = new DDP(sock).connect(function(){
			console.log('connected');

			socket.on('added', function(data){
				var collectionName = data.collection;
				var documentId = data.id;
				var fields = data.fields;

				// We can then create new models and populate
				// our local collections.
				var model = new Model(fields);
				var myCollection.add(model);
			});

		});