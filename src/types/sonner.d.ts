declare module 'sonner' {
  export const toast: {
    (title: string, options?: { description?: string }): any;
    error(message: string): any;
    success(message: string): any;
  };
} 