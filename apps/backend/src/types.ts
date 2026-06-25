export interface Balances {
  stock: number;
  cash: number;
}

export interface User {
  id: string;
  name: string;
  balances: Balances;
}

export interface Order {
  orderId: string;
  userId: number;
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
}

export interface AnonyOrder {
  price: number;
  quantity: number;
}

export interface Orderbook {
  asks: AnonyOrder[];
  bids: AnonyOrder[];
}

export interface Chart {
  timestamp: Date;
  open: number;
  high: number;
  close: number;
  low: number;
}

export interface PortfolioEntry {
  symbol: string;
  quantity: number;
}

export interface SymbolInfo {
  symbol: string;
  name: string;
}
