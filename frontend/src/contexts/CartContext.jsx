import { createContext, useContext, useState, useCallback } from 'react'
import { cart as cartApi } from '../utils/api'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => cartApi.getAll())
  const [drawerOpen, setDrawerOpen] = useState(false)

  const addToCart = useCallback((item) => {
    const updated = cartApi.add(item)
    setItems([...updated])
    setDrawerOpen(true)
  }, [])

  const removeFromCart = useCallback((id) => {
    const updated = cartApi.remove(id)
    setItems([...updated])
  }, [])

  const updateQty = useCallback((id, qty) => {
    const updated = cartApi.updateQty(id, qty)
    setItems([...updated])
  }, [])

  const clearCart = useCallback(() => {
    cartApi.clear()
    setItems([])
  }, [])

  const totalUnits = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal   = items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items, totalUnits, subtotal,
      addToCart, removeFromCart, updateQty, clearCart,
      drawerOpen, setDrawerOpen,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)