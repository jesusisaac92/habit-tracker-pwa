import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider
const ToastViewport = React.forwardRef<...>((props, ref) => ...)
const Toast = React.forwardRef<...>((props, ref) => ...)
const ToastAction = React.forwardRef<...>((props, ref) => ...)
const ToastClose = React.forwardRef<...>((props, ref) => ...)
const ToastTitle = React.forwardRef<...>((props, ref) => ...)
const ToastDescription = React.forwardRef<...>((props, ref) => ...)

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} 