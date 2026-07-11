export interface User {
  id: string;
  name: string;
  email: string;
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
  quantity: number | string;
  price: number | string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SymbolInfo {
  id: number;
  symbol: string;
  name: string;
}

export interface UserOrder {
  orderId: string;
  price: number;
  quantity: number;
  symbol: string;
}

export interface OrderHistoryEntry {
  orderId: string;
  symbol: string;
  side: "bid" | "ask" | string;
  price: number;
  quantity: number;
  filledQuantity: number;
  status: "open" | "filled" | "cancelled" | "partial" | string;
  market: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}
