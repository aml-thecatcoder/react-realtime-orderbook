import { atom } from 'jotai';

import { CONTRACTS } from '../utils/constants';

export type OrderBookItem = [number, number, number];
export type OrderBookData = OrderBookItem[];
export type OrderBookAction = [number, number][];
export type SpreadState = { value: number; percent: number };

export type OrderBookStateAction = {
  asks: OrderBookData;
  bids: OrderBookData;
  spread: SpreadState;
  highestTotal: number;
};

export const bidsAtom = atom<OrderBookData>([]);
export const asksAtom = atom<OrderBookData>([]);

export const spreadAtom = atom<SpreadState>({ value: 0, percent: 0 });

export const highestTotalAtom = atom(0);

export const updateOrderBookState = atom(
  null,
  (get, set, action: OrderBookStateAction) => {
    if (action.asks.length) {
      set(asksAtom, action.asks);
    }
    if (action.bids.length) {
      set(bidsAtom, action.bids);
    }
    if (action.spread) {
      set(spreadAtom, action.spread);
    }
    if (action.highestTotal) {
      set(highestTotalAtom, action.highestTotal);
    }
  },
);

export const contractAtom = atom(CONTRACTS.XBT_USD);

export const updateContractAtom = atom(null, (get, set) => {
  const currentContract = get(contractAtom);
  // We can get away with this because we are only
  // toggling between 2 contracts
  // If there was selection from a list, you would set the contract
  // based on the action
  if (currentContract === CONTRACTS.XBT_USD) {
    set(contractAtom, CONTRACTS.ETH_USD);
  } else {
    set(contractAtom, CONTRACTS.XBT_USD);
  }
  set(bidsAtom, []);
  set(asksAtom, []);
});

export const subscribeMessageAtom = atom((get) => {
  const contract = get(contractAtom);
  return `{"event":"subscribe","feed":"book_ui_1","product_ids":["${contract}"]}`;
});

export const unsubscribeMessageAtom = atom((get) => {
  const contract = get(contractAtom);
  // If we had N options I would keep an atom for the previus selection
  // maybe for a csgo QQ-style order book swap, haha
  const prevContract =
    contract === CONTRACTS.ETH_USD ? CONTRACTS.XBT_USD : CONTRACTS.ETH_USD;
  return `{"event":"unsubscribe","feed":"book_ui_1","product_ids":["${prevContract}"]}`;
});

export const debugIntervalAtom = atom(1000)