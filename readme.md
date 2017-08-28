# Redux Effects Nes

[![Downloads][npm-dm]][package-url]
[![Downloads][npm-dt]][package-url]
[![NPM Version][npm-v]][package-url]
[![Dependencies][deps]][package-url]
[![Dev Dependencies][dev-deps]][package-url]
[![License][license]][package-url]

__Redux effects Nes Middleware__

# Install

```bash
npm i -S redux-effects-nes
```

```bash
yarn add redux-effects-nes
```

# Usage

## Setup

This requires a publish on the Hapi side with a object structured like so.
`{ event: 'eventName', data: {} }`

```javascript
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import createSocket from 'redux-effects-nes';
import effects from 'redux-effects';

...

const middlewareList = [
  effects,
  createSocket()
];

const enhancer = composeEnhancers(applyMiddleware(...middlewareList));
```

## Dispatch

```javascript
import { connect, on } from 'redux-effects-nes';

...

dispatch(connect(socketurl, cb, authHeaders, 'wss'));
dispatch(on('/path', 'eventName', (res) => {
  // Get the res data
}));
dispatch(emit('/path', 'eventName', (res) => {
  // Get the res data
}));
dispatch(emit('someEventName', someDataObject, () => {}));
dispatch(connect(socketurl, cb, authHeaders, 'wss'));
```

# Available methods
 - `connect` : (socketUrl, callback, headerObject, protocal = 'ws', name = 'default') Used to connect to the socket
 - `disconnect` : (name = 'default') Used to disconnect from the socket
 - `of` : (path, name = 'default') Used to create a path event group
 - `on` : (path, eventName, callback, name = 'default') Used to add a event handler
 - `emit` : (eventName, dataToSend, callback, name = 'default') Used to send a event back to the server
 - `request`: (path, callback, options, name = 'default') Used to make a nes request

The `name` used in `connect` creates a socket connection assigned to that name.
This allows you make multiple connections and reference them.

[npm-dm]: https://img.shields.io/npm/dm/redux-effects-nes.svg
[npm-dt]: https://img.shields.io/npm/dt/redux-effects-nes.svg
[npm-v]: https://img.shields.io/npm/v/redux-effects-nes.svg
[deps]: https://img.shields.io/david/jcgertig/redux-effects-nes.svg
[dev-deps]: https://img.shields.io/david/dev/jcgertig/redux-effects-nes.svg
[license]: https://img.shields.io/npm/l/redux-effects-nes.svg
[package-url]: https://npmjs.com/package/redux-effects-nes
