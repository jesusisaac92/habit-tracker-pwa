import React, { useState } from 'react';
import { logger } from '@/utils/logger';

export const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  const toggleLogs = (module: string, level: string) => {
    logger.setModuleLevel(module, level);
    console.log(`Nivel de logs para ${module}: ${level}`);
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white p-2 rounded-full shadow-lg"
      >
        🐞
      </button>
      
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg mt-2 w-64">
          <h3 className="font-bold mb-2">Panel de Depuración</h3>
          
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium">Timeline</p>
              <div className="flex space-x-2 mt-1">
                <button 
                  onClick={() => toggleLogs('timeline', 'debug')}
                  className="bg-blue-500 text-white text-xs px-2 py-1 rounded"
                >
                  Debug
                </button>
                <button 
                  onClick={() => toggleLogs('timeline', 'info')}
                  className="bg-green-500 text-white text-xs px-2 py-1 rounded"
                >
                  Info
                </button>
                <button 
                  onClick={() => toggleLogs('timeline', 'warn')}
                  className="bg-yellow-500 text-white text-xs px-2 py-1 rounded"
                >
                  Warn
                </button>
                <button 
                  onClick={() => toggleLogs('timeline', 'error')}
                  className="bg-red-500 text-white text-xs px-2 py-1 rounded"
                >
                  Error
                </button>
              </div>
            </div>
            
            {/* Repetir para otros módulos */}
          </div>
        </div>
      )}
    </div>
  );
}; 