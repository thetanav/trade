import type { Order } from "./types";

export type Fill = {
  makerOrderId: string;
  makerUserId: number;
  /** Price of the resting (maker) order — trade executes here. */
  price: number;
  quantity: number;
};

export type MatchResult = {
  remainingQty: number;
  remainingBook: Order[];
  fills: Fill[];
};

/**
 * Pure matching: taker order against an in-memory opposite book.
 * Does not touch Redis/DB — easy to unit test.
 */
export function matchAgainstBook(
  side: "bid" | "ask",
  price: number,
  quantity: number,
  userId: number,
  market: boolean,
  book: Order[],
): MatchResult {
  const orders = [...book];

  if (side === "bid") {
    // Match against asks: lowest price first, then FIFO
    orders.sort((a, b) =>
      a.price !== b.price ? a.price - b.price : a.timestamp - b.timestamp,
    );
  } else {
    // Match against bids: highest price first, then FIFO
    orders.sort((a, b) =>
      a.price !== b.price ? b.price - a.price : a.timestamp - b.timestamp,
    );
  }

  let remainingQty = quantity;
  const remainingBook: Order[] = [];
  const fills: Fill[] = [];

  for (const ord of orders) {
    if (remainingQty <= 0 || ord.userId === userId) {
      remainingBook.push(ord);
      continue;
    }

    const shouldMatch = market
      ? true
      : side === "bid"
        ? ord.price <= price
        : ord.price >= price;

    if (!shouldMatch) {
      remainingBook.push(ord);
      continue;
    }

    if (ord.quantity > remainingQty) {
      fills.push({
        makerOrderId: ord.orderId,
        makerUserId: ord.userId,
        price: ord.price,
        quantity: remainingQty,
      });
      remainingBook.push({ ...ord, quantity: ord.quantity - remainingQty });
      remainingQty = 0;
    } else {
      fills.push({
        makerOrderId: ord.orderId,
        makerUserId: ord.userId,
        price: ord.price,
        quantity: ord.quantity,
      });
      remainingQty -= ord.quantity;
    }
  }

  return { remainingQty, remainingBook, fills };
}

/** Where a limit order sits in a price-time priority book. */
export function findInsertIndex(
  orders: Order[],
  order: Order,
  isAsk: boolean,
): number {
  for (let i = 0; i < orders.length; i++) {
    if (isAsk) {
      if (
        order.price < orders[i].price ||
        (order.price === orders[i].price &&
          order.timestamp < orders[i].timestamp)
      ) {
        return i;
      }
    } else if (
      order.price > orders[i].price ||
      (order.price === orders[i].price &&
        order.timestamp < orders[i].timestamp)
    ) {
      return i;
    }
  }
  return orders.length;
}
