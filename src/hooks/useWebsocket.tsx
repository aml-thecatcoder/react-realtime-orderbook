import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useIntervalWhen } from 'rooks';

import {
  debugIntervalAtom,
  OrderBookStateAction,
  subscribeMessageAtom,
  unsubscribeMessageAtom,
  updateOrderBookState,
} from '../state';
import { CF_WSS } from '../utils/constants';
import { useWindowFocus } from './useWindowFocus';
import { feedWorker } from '../utils/feed-worker';
import type { EventMessage } from '../utils/feed.worker';

export enum SOCKET_STATE {
  DISCONNECTED = 0,
  CONNECTED = 1,
}

// Returning this from a function in setState would cause 2 connections to be created
export const DEFAULT_SOCKET_STATE = new WebSocket(CF_WSS);

export const useWebSocket = () => {
  const [socket, setSocket] = useState<WebSocket>(DEFAULT_SOCKET_STATE);
  const [socketState, setSocketState] = useState<SOCKET_STATE>(1);

  const closeSocket = useCallback(() => {
    socket.close();
  }, [socket]);

  const restartSocket = useCallback(() => {
    setSocketState(1);
    const newSocket = new WebSocket(CF_WSS);
    setSocket(newSocket);
  }, []);

  // Whenever we create a new socket, attach default error and close handlers
  useEffect(() => {
    socket.onerror = () => {
      setSocketState(0);
    };
    socket.onclose = () => {
      console.log('socket close callback');
      setSocketState(0);
    };
  }, [socket]);

  return {
    socket,
    closeSocket,
    restartSocket,
    socketState,
  };
};

export const useOrderBookSocket = () => {
  const { socket, closeSocket, restartSocket, socketState } = useWebSocket();
  const tabFocus = useWindowFocus();

  const subMessage = useAtomValue(subscribeMessageAtom);
  const unsubMessage = useAtomValue(unsubscribeMessageAtom);
  const refreshInterval = useAtomValue(debugIntervalAtom);

  const updateState = useSetAtom(updateOrderBookState);

  const bookCache = useRef<OrderBookStateAction | null>(null);
  const didMount = useRef<boolean>(false);

  // If the socket is currently connected & the user leaves the tab
  useEffect(() => {
    if (tabFocus !== undefined && !tabFocus && socketState === 1) {
      console.info('[Focus lost] -> closing socket');
      closeSocket();
    }
  }, [tabFocus, socketState, closeSocket]);

  const flushBookCache = useCallback(() => {
    if (socket.OPEN) {
      if (bookCache.current) {
        updateState(bookCache.current);
      }
    }
    bookCache.current = null;
  }, [socket.OPEN, updateState]);

  useIntervalWhen(flushBookCache, refreshInterval, true);

  useEffect(() => {
    socket.onopen = () => {
      console.info('[Socket open] -> sending subscription message');
      socket.send(subMessage);
    };
    socket.onmessage = (e: MessageEvent<EventMessage>) => {
      feedWorker.postMessage(e.data);
      feedWorker.onmessage = (d) => {
        bookCache.current = d.data as OrderBookStateAction;
      };
    };
  }, [socket, subMessage]);

  useEffect(() => {
    if (didMount.current) {
      bookCache.current = null;

      socket.send(unsubMessage);
      socket.send(subMessage);
    } else {
      didMount.current = true;
    }
  }, [unsubMessage, subMessage]);

  return {
    connected: socketState,
    reconnect: restartSocket,
  };
};
