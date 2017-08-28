import Nes from 'nes/client'; // eslint-disable-line
import { autobind } from 'core-decorators';
import assign from 'lodash.assign';

const EFFECT_NES = 'EFFECT_NES';

function has(obj, key) {
  return obj.hasOwnProperty(key); // eslint-disable-line
}

@autobind
class WsClient {
  constructor(nesClient, debug = '') {
    this.nesClient = nesClient || false;
    this.ofSet = {};
    this.connected = false;
    this.connecting = false;
    this.q = [];
    this.debug = debug;

    this.log = (msg, ...other) => {
      console.log(`[NES_SOCKET: ${this.debug}] ${msg}`, ...other); // eslint-disable-line
    };
  }

  of(path) {
    if (!has(this.ofSet, path)) {
      if (this.connected) {
        this.nesClient.subscribe(path, this._handleOf(path), (err) => {
          if (err) {
            if (this.debug) {
              this.log(`Path to ${path} errored:`, err);
            }
            throw new Error(`Path to ${path} errored: ${err.message}`);
          }
        });
      } else {
        this._handleOf(path);
      }
    }
    return this._ofBuilder(path);
  }

  on(path, event, cb) {
    if (!this.connected) {
      this.q.push({ type: 'on', args: [path, event, cb] });
    } else {
      this.of(path).on(event, cb);
    }
  }

  _ofBuilder(path) {
    return {
      on: (event, handler) => {
        if (typeof handler !== 'function') {
          if (this.debug) {
            this.log('On handler has to be a function');
          }
          throw new Error('On handler has to be a function');
        } else {
          if (!has(this.ofSet[path], event)) {
            this.ofSet[path][event] = [];
          }
          this.ofSet[path][event].push(handler);
        }
      },
    };
  }

  _handleOf(path) {
    this.ofSet[path] = {};
    return (message, flags) => { // eslint-disable-line
      if (this.debug) {
        this.log(`Got :: ${path} - ${message.event}`, message.data);
      }
      const { event, data } = message;
      if (has(this.ofSet[path], event)) {
        this.ofSet[path][event].forEach((handler) => {
          handler(data);
        });
      }
    };
  }

  emit(type, data, cb) {
    if (!this.connected) {
      return this.q.push({ type: 'emit', args: [type, data, cb] });
    }
    return this.nesClient.message({ type, data }, cb);
  }

  request(options, cb) {
    if (!this.connected) {
      return this.q.push({ type: 'request', args: [options, cb] });
    }
    return this.nesClient.message(options, cb);
  }

  connectSocket(root, cb, auth, protocal = 'ws') {
    this.disconnectSocket();
    const nesClient = new Nes.Client(`${protocal}://${root}`);
    this.nesClient = nesClient;

    if (this.debug) {
      this.log('Starting connection.');
    }

    this.connecting = true;
    const authHeaders = {};
    if (auth) {
      authHeaders.auth = { headers: { authentication: JSON.stringify(auth) } };
    }

    this.nesClient.connect(authHeaders, (err) => {
      if (this.debug) {
        if (err) {
          this.log('Connection error.', err);
        } else {
          this.log('Connection successful.');
        }
      }
      if (!err) {
        this.connected = true;
        this.connecting = false;
        Object.keys(this.ofSet).forEach(path => this.of(path));
        this.q.forEach(action => this[action.type](...action.args));
        this.q = [];
      }
      if (cb) {
        cb(err);
      }
    });
  }

  disconnectSocket() {
    if (this.nesClient !== false) {
      this.connected = false;
      this.connecting = false;
      this.ofSet = {};
      this.q = [];
      this.nesClient.disconnect();
      this.nesClient = false;
    }
    if (this.debug) {
      this.log('Disconnected socket.');
    }
  }
}

@autobind
class WsClientProvider {
  constructor(debug) {
    this.clients = {};
    this.debug = debug;
  }

  call(name) {
    if (!has(this.clients, name)) {
      this.clients[name] = new WsClient(false, this.debug ? name : '');
    }
    return this.clients[name];
  }
}

function createSocket(debug = false) {
  const clientProvider = new WsClientProvider(debug);

  function execute({ name, type, protocal, path, event, data, auth, cb, options }) {
    switch (type) {
      case 'connect':
        return Promise.reslove(clientProvider.call(name).connectSocket(path, cb, auth, protocal));
      case 'disconnect':
        return Promise.reslove(clientProvider.call(name).disconnectSocket());
      case 'of':
        return Promise.reslove(clientProvider.call(name).of(path));
      case 'on':
        return Promise.reslove(clientProvider.call(name).on(path, event, cb));
      case 'emit':
        return Promise.reslove(clientProvider.call(name).emit(event, data, cb));
      case 'request':
        return Promise.reslove(clientProvider.call(name).request(assign({ path }, options), cb));
      default:
        throw new Error('redux-effects-nes unknown action type');
    }
  }

  // eslint-disable-next-line
  return () => next => action =>
    action.type === EFFECT_NES
      ? execute(action.payload)
      : next(action);
}

function createAction(payload) {
  return {
    type: EFFECT_NES,
    payload,
  };
}

const DEFAULT_CLIENT_NAME = 'default';

// Dispatch to create a event handleing group
function of(path, name = DEFAULT_CLIENT_NAME) {
  return createAction({ type: 'of', path, name });
}

// Dispatch to assign a handler to a event
function on(path, event, cb, name = DEFAULT_CLIENT_NAME) {
  return createAction({ type: 'on', path, event, cb, name });
}

// Dispatch to emit a event to the server
function emit(event, data, cb, name = DEFAULT_CLIENT_NAME) {
  return createAction({ type: 'emit', event, data, cb, name });
}

// Dispatch to make a path based request from the server
function request(path, cb, options, name = DEFAULT_CLIENT_NAME) {
  return createAction({ type: 'request', path, cb, options, name });
}

// Dispatch to connect to the socket
function connect(path, cb, auth, protocal, name = DEFAULT_CLIENT_NAME) {
  return createAction({ type: 'connect', path, cb, auth, protocal, name });
}

// Dispatch to disconnect from the socket
function disconnect(name = DEFAULT_CLIENT_NAME) {
  return createAction({ type: 'disconnect', name });
}

export default createSocket;
export {
  of,
  on,
  emit,
  request,
  connect,
  disconnect,
  DEFAULT_CLIENT_NAME,
};
