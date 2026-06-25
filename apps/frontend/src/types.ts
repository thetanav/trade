export interface User {
  id: string;
  name: string;
  email: string;
  stock: number;
  cash: number;
  portfolio: PortfolioEntry[];
  createdAt?: string;
}

export interface PortfolioEntry {
  symbol: string;
  quantity: number;
}

export interface Order {
  userId: string;
  price: number;
  quantity: number;
}

export interface AnonyOrder {
  price: number;
  quantity: number;
}

export interface Orderbook {
  symbol: string;
  asks: AnonyOrder[];
  bids: AnonyOrder[];
}

export interface Transaction {
  id: number;
  user_id: number;
  symbol: string;
  type: string;
  quantity: number;
  price: number;
  timestamp: string;
}

export interface SymbolInfo {
  id: number;
  symbol: string;
  name: string;
}
