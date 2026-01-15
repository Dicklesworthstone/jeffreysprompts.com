"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface BasketContextValue {
  items: string[];
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearBasket: () => void;
  isInBasket: (id: string) => boolean;
}

const BasketContext = createContext<BasketContextValue | null>(null);

export function BasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useLocalStorage<string[]>("jfp-basket", []);

  const addItem = (id: string) => {
    setItems((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item !== id));
  };

  const clearBasket = () => {
    setItems([]);
  };

  const isInBasket = (id: string) => items.includes(id);

  return (
    <BasketContext.Provider value={{ items, addItem, removeItem, clearBasket, isInBasket }}>
      {children}
    </BasketContext.Provider>
  );
}

export function useBasketContext() {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error("useBasket must be used within BasketProvider");
  }
  return context;
}
