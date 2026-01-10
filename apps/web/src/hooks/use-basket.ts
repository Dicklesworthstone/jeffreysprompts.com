"use client";

import { useBasketContext } from "@/contexts/basket-context";

export function useBasket() {
  return useBasketContext();
}
