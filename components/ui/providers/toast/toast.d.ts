import * as ToastPrimitive from "@radix-ui/react-toast"

interface ToastActionElement {
  altText: string
  action: React.ReactNode
}

declare module "@/components/ui/toast" {
  export interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
    variant?: "default" | "destructive"
  }

  export interface ToastActionElement {
    altText: string
    action: React.ReactNode
  }

  export const ToastProvider: React.FC<React.PropsWithChildren<{}>>
  export const ToastViewport: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>>
  export const Toast: React.ForwardRefExoticComponent<ToastProps>
  export const ToastTitle: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>>
  export const ToastDescription: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>>
  export const ToastClose: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>>
  export const ToastAction: React.ForwardRefExoticComponent<React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>>
}

declare module "@/components/ui/use-toast" {
  export interface Toast {
    id: string
    title?: React.ReactNode
    description?: React.ReactNode
    action?: ToastActionElement
    variant?: "default" | "destructive"
  }

  export interface UseToastOptions {
    duration?: number
  }

  export interface ToastContextType {
    toast: (props: Omit<Toast, "id">) => void
    dismiss: (toastId?: string) => void
    toasts: Toast[]
  }

  export function useToast(): ToastContextType
}