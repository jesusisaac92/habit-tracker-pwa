"use client";

import React from 'react';
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority";
import { X, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  {
    variants: {
      variant: {
        default: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700",
        success: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700",
        error: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700",
        warning: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface CenteredToastProps {
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number;
  onOpenChange?: (open: boolean) => void;
}

export const CenteredToast: React.FC<CenteredToastProps> = ({
  title,
  description,
  variant = "default",
  duration = 2000,
  onOpenChange,
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <ToastPrimitives.Provider duration={duration}>
      <ToastPrimitives.Root
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "z-[9999]",
          "flex items-center justify-between gap-4",
          "rounded-lg shadow-lg p-4",
          "min-w-[300px]",
          "backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95",
          toastVariants({ variant })
        )}
        onOpenChange={onOpenChange}
      >
        <div className="flex items-center gap-3">
          {getIcon()}
          <div className="flex flex-col gap-1">
            {title && (
              <ToastPrimitives.Title className="text-sm font-semibold">
                {title}
              </ToastPrimitives.Title>
            )}
            {description && (
              <ToastPrimitives.Description className="text-sm opacity-90">
                {description}
              </ToastPrimitives.Description>
            )}
          </div>
        </div>
        <ToastPrimitives.Close className="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100">
          <X className="h-4 w-4" />
        </ToastPrimitives.Close>
      </ToastPrimitives.Root>
      <ToastPrimitives.Viewport />
    </ToastPrimitives.Provider>
  );
}; 