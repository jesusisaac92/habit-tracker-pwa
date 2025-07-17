"use client";

import React from 'react'
import { Toast, ToastClose, ToastDescription, ToastTitle } from "@/components/ui/providers/toast/toast"  

interface ModernToastProps {
  title: string;
  description: string;
  variant?: 'default' | 'destructive' | 'success' | 'error' | 'warning';
}

const ModernToast: React.FC<ModernToastProps> = ({ title, description, variant = 'default' }) => {
  return (
    <Toast variant={variant}>
      <div className="grid gap-1">
        <ToastTitle>{title}</ToastTitle>
        <ToastDescription>{description}</ToastDescription>
      </div>
      <ToastClose />
    </Toast>
  );
};

export default ModernToast;