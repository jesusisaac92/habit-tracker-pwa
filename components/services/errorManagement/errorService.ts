import { useToast } from '@/components/ui/providers/toast/use-toast';

type ErrorSeverity = 'error' | 'warning' | 'info';
type ToastVariant = 'default' | 'destructive' | 'success' | 'error' | 'warning';

interface ErrorConfig {
  severity?: ErrorSeverity;
  silent?: boolean;
  retry?: () => void;
}

export class ErrorService {
  static handleError(error: Error, context: string, config: ErrorConfig = {}) {
    const { severity = 'error', silent = false, retry } = config;
    
    console.error(`[${context}]:`, error);

    return {
      title: this.getErrorTitle(severity),
      description: this.getErrorMessage(error, context),
      variant: (severity === 'error' ? 'destructive' : 'default') as ToastVariant,
      action: retry ? {
        altText: "Reintentar",
        children: "Reintentar",
        onClick: retry
      } : undefined
    };
  }

  private static getErrorTitle(severity: ErrorSeverity): string {
    switch (severity) {
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      case 'info':
        return 'Información';
      default:
        return 'Error';
    }
  }

  private static getErrorMessage(error: Error, context: string): string {
    // Customize error messages based on context and error type
    switch (context) {
      case 'HabitUpdate':
        return 'Error al actualizar el hábito. Por favor, inténtalo de nuevo.';
      case 'ChartData':
        return 'Error al cargar los datos del gráfico.';
      case 'StatusUpdate':
        return 'Error al actualizar el estado del hábito.';
      default:
        return error.message || 'Ha ocurrido un error inesperado.';
    }
  }
} 