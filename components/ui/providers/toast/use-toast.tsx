"use client";

import React from "react"
import { cn } from "@/lib/utils" 

type Position = "top" | "bottom" | "calendar";

export type ToastProps = {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: "default" | "destructive" | "success" | "error" | "warning"
  position?: Position
  duration?: number
}

type ToastContextType = {
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, "id">) => void
  removeToast: (id: string) => void
  toast: (props: Omit<ToastProps, "id">) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const addToast = React.useCallback((toast: Omit<ToastProps, "id">) => {
    setToasts((prevToasts) => [
      ...prevToasts,
      { ...toast, id: Math.random().toString() },
    ])
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const toast = React.useCallback((props: Omit<ToastProps, "id">) => {
    const { position = "bottom", ...rest } = props
    addToast({ ...rest, position })
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast debe usarse dentro de un ToastProvider")
  }
  return context
}