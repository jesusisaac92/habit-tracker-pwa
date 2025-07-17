/**
 * Sistema de logging centralizado para la aplicación
 */

// Configuración global de logging
const config = {
  // Cambiar el nivel global a 'warn' para mostrar solo advertencias y errores
  level: process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  
  // Configurar módulos específicos
  modules: {
    tasks: 'warn',
    habits: 'warn',
    timeline: 'warn',
    auth: 'warn',
    supabase: 'warn',
    ui: 'error'
  }
};

// Niveles de log en orden de severidad
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

/**
 * Determina si un mensaje debe ser loggeado basado en su nivel y módulo
 */
const shouldLog = (level: string, module?: string): boolean => {
  const globalLevel = LOG_LEVELS[config.level as keyof typeof LOG_LEVELS] || 0;
  const messageLevel = LOG_LEVELS[level as keyof typeof LOG_LEVELS] || 0;
  
  // Si el nivel del mensaje es menor que el global, no loggear
  if (messageLevel < globalLevel) {
    return false;
  }
  
  // Si hay un módulo específico, verificar su nivel
  if (module && config.modules[module as keyof typeof config.modules]) {
    const moduleLevel = LOG_LEVELS[config.modules[module as keyof typeof config.modules] as keyof typeof LOG_LEVELS] || 0;
    return messageLevel >= moduleLevel;
  }
  
  return true;
};

/**
 * Logger para la aplicación
 */
export const logger = {
  debug: (message: string, data?: any, module?: string) => {
    if (shouldLog('debug', module)) {
      console.log(`[DEBUG]${module ? `[${module}]` : ''} ${message}`, data || '');
    }
  },
  
  info: (message: string, data?: any, module?: string) => {
    if (shouldLog('info', module)) {
      console.log(`[INFO]${module ? `[${module}]` : ''} ${message}`, data || '');
    }
  },
  
  warn: (message: string, data?: any, module?: string) => {
    if (shouldLog('warn', module)) {
      console.warn(`[WARN]${module ? `[${module}]` : ''} ${message}`, data || '');
    }
  },
  
  error: (message: string, data?: any, module?: string) => {
    if (shouldLog('error', module)) {
      console.error(`[ERROR]${module ? `[${module}]` : ''} ${message}`, data || '');
    }
  },
  
  // Método para cambiar la configuración en tiempo de ejecución
  setConfig: (newConfig: Partial<typeof config>) => {
    Object.assign(config, newConfig);
  },
  
  // Método para cambiar el nivel de un módulo específico
  setModuleLevel: (module: string, level: string) => {
    if (config.modules.hasOwnProperty(module)) {
      (config.modules as any)[module] = level;
    }
  }
}; 