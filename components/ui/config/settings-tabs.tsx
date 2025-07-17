"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils" 

const SettingsTabs = TabsPrimitive.Root

const SettingsTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "grid w-full grid-cols-2 rounded-lg p-1",
      "bg-gray-50/50 dark:bg-gray-800/50",
      className
    )}
    {...props}
  />
))
SettingsTabsList.displayName = "SettingsTabsList"

const SettingsTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2",
      "text-sm font-medium transition-all",
      "text-gray-500 dark:text-gray-400",
      "data-[state=active]:bg-black data-[state=active]:text-white",
      "dark:data-[state=active]:bg-white dark:data-[state=active]:text-black",
      "data-[state=inactive]:hover:text-gray-900 dark:data-[state=inactive]:hover:text-gray-100",
      className
    )}
    {...props}
  />
))
SettingsTabsTrigger.displayName = "SettingsTabsTrigger"

const SettingsTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
SettingsTabsContent.displayName = "SettingsTabsContent"

export { 
  SettingsTabs, 
  SettingsTabsList, 
  SettingsTabsTrigger, 
  SettingsTabsContent as TabsContent 
}