"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/providers/toast/toaster";
import { ToastProvider as RadixToastProvider } from "@radix-ui/react-toast";
import { ToastProvider } from "@/components/ui/providers/toast/use-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>
        <RadixToastProvider swipeDirection="right">
          {children}
          <Toaster />
        </RadixToastProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}