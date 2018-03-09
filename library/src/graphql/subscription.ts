/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { withDefaults } from '../utils/withDefaults';
import { ReconnectingWebSocket, WebSocketOptions } from '../utils/ReconnectingWebSocket';
import { ObjectMap } from '../utils/ObjectMap';

export interface Options<DataType> extends WebSocketOptions {
  // Data to send to the server on connection init
  initPayload: any;
  onDataReceived: (data: DataType) => void;
  onError: (error: Error) => void;
  onClosed: () => void;
}

export const defaultSubscriptionOpts: Options<any> = {
  url: '/graphql',
  protocols: 'graphql-ws',
  reconnectInterval: 1000,
  connectTimeout: 2000,
  initPayload: {},
  onDataReceived: data => console.log(data),
  onError: e => console.error(e),
  onClosed: () => null,
};


// Follows Apollo GraphQL Protocol -- https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md

// Client -> Server
const GQL_CONNECTION_INIT = 'connection_init';
const GQL_START = 'start';
const GQL_STOP = 'stop';
const GQL_CONNECTION_TERMINATE = 'connection_terminate';

// Server -> Client
const GQL_CONNECTION_ACK = 'connection_ack';
const GQL_CONNECTION_ERROR = 'connection_error';
// NOTE: The keep alive message type does not follow the standard due to connection optimizations
const GQL_CONNECTION_KEEP_ALIVE = 'ka';
const GQL_DATA = 'data';
const GQL_ERROR = 'error';
const GQL_COMPLETE = 'complete';

export interface OperationMessage {
  type: string;
  id?: string;
  payload?: any;
}

export interface SubscriptionResult<T> {
  data: T;
  errors?: Error[];
}

export interface OnData<T> {
  (result: SubscriptionResult<T>): void;
}

export type OnError = (e: ErrorEvent) => void;

export interface SubscriptionHandle {
  id: string;
  start: OperationMessage;
  onError: OnError;
  onData: OnData<any>;
}

export interface Subscription {
  query: string;
  variables?: ObjectMap<any>;
  operationName?: string;
}

export const defaultSubscription: Subscription = {
  operationName: null,
  query: '{}',
  variables: null,
};

export class SubscriptionManager {
  private socket: ReconnectingWebSocket;
  private idCounter = 0;
  private initPayload: any;
  private subscriptions: ObjectMap<SubscriptionHandle>;
  private keepAliveTimeoutHandler: number;

  constructor(options: Partial<Options<any>>) {
    this.socket = new ReconnectingWebSocket(options);
    this.socket.onopen = this.init;
    this.socket.onmessage = this.messageHandler;
    this.socket.onerror = this.errorHandler;
  }

  public subscribe = <T>(
    subscription: Subscription,
    onData: OnData<T>,
    onError?: OnError) => {
    
    const id = this.idCounter++ + '';

    const start = {
      id,
      type: GQL_START,
      payload: JSON.stringify(subscription),
    };

    this.subscriptions[id] = {
      id,
      start,
      onData,
      onError,
    };

    this.send(start);
    return id;
  }

  public stop = (id: string) => {
    if (this.subscriptions[id]) {
      delete this.subscriptions[id];
    }
    this.send({
      id,
      type: GQL_STOP,
    });
  }

  private init = () => {
    this.socket.send(JSON.stringify({
      type: GQL_CONNECTION_INIT,
      payload: this.initPayload,
    }));
  }

  private messageHandler = (e: MessageEvent) => {
    const op = JSON.parse(e.data) as OperationMessage;
    switch (op.type) {
      case GQL_CONNECTION_ACK: {
        Object.values(this.subscriptions).forEach(s => this.send(s.start));
        break;
      }
      case GQL_DATA: {
        const subscription = this.subscriptions[op.id];
        if (subscription && subscription.onData) {
          subscription.onData(op.payload);
        }
      }
      case GQL_CONNECTION_KEEP_ALIVE: {
        clearTimeout(this.keepAliveTimeoutHandler);
        this.keepAliveTimeoutHandler = setTimeout(() => {
          this.socket.refresh();
        }, 5000);
        break;
      }
      case GQL_CONNECTION_ERROR: {
        this.errorHandler(new ErrorEvent('GQL_CONNECTION_ERROR', {
          error: new Error('GQL_CONNECTION_ERROR'),
          message: JSON.stringify(op.payload), 
        }));
        break;
      }
      case GQL_COMPLETE: {
        const subscription = this.subscriptions[op.id];
        if (subscription) {
          if (subscription.onError) {
            const message = `SubscriptionManager | GQL_COMPLETE received for id ${op.id} without acknowledged stop request`;
            subscription[op.id].onError(new ErrorEvent('GQL_COMPLETE', {
              message,
              error: new Error(message),
            }));
          }
          delete this.subscriptions[op.id]; 
        }
        break;
      }
      case GQL_ERROR: {
        const subscription = this.subscriptions[op.id];
        if (subscription && subscription.onError) {
          subscription[op.id].onError(new ErrorEvent('GQL_ERROR', {
            error: new Error(op.payload),
            message: op.payload,
          }));
        }
        break;
      }
    }
  }

  private errorHandler = (e: ErrorEvent) => {
    console.error(e);
  }

  private send = (op: OperationMessage) => {
    if (this.socket.isOpen) {
      this.socket.send(JSON.stringify(op));
    }
  }
}


// GLOBAL SINGLE INSTANCE
let subscriptionManager: SubscriptionManager = null;
export function subscribe<DataType>(
  subscription: Subscription,
  onData: OnData<DataType>,
  options?: Partial<Options<DataType>>,
  onError?: OnError,
) {

  if (!(window as any).WebSocket) {
    throw new Error('WebSockets not supported by this browser');
  }

  if (subscriptionManager === null) {
    subscriptionManager = new SubscriptionManager(options);
  }

  return {
    id: subscriptionManager.subscribe(subscription, onData, onError),
    subscriptions: subscriptionManager,
  };
}