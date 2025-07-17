// Servicio para gestionar la persistencia del estado entre navegaciones

// Añadir esta importación al principio del archivo
import { markHabitAsCompleted } from '@/src/supabase/services/habitCompletion.service';

// Clave para almacenar el estado de la aplicación
const APP_STATE_KEY = 'habit_tracker_app_state';

// Función para guardar el estado actual
export const saveAppState = (state: any) => {
  try {
    // Usar sessionStorage para mantener el estado durante la sesión del navegador
    sessionStorage.setItem(APP_STATE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: state
    }));
    console.log('Estado guardado correctamente');
    return true;
  } catch (error) {
    console.error('Error al guardar el estado:', error);
    return false;
  }
};

// Función para recuperar el estado guardado
export const loadAppState = () => {
  try {
    const savedState = sessionStorage.getItem(APP_STATE_KEY);
    if (!savedState) return null;
    
    const parsedState = JSON.parse(savedState);
    
    // Verificar si el estado es reciente (menos de 30 minutos)
    const isRecent = Date.now() - parsedState.timestamp < 30 * 60 * 1000;
    
    if (isRecent) {
      console.log('Estado recuperado correctamente');
      return parsedState.data;
    } else {
      console.log('Estado expirado, se usarán datos frescos');
      return null;
    }
  } catch (error) {
    console.error('Error al recuperar el estado:', error);
    return null;
  }
};

// Función para limpiar el estado guardado
export const clearAppState = () => {
  try {
    sessionStorage.removeItem(APP_STATE_KEY);
    return true;
  } catch (error) {
    console.error('Error al limpiar el estado:', error);
    return false;
  }
};

// Función para verificar si hay un estado guardado
export const hasAppState = () => {
  try {
    return !!sessionStorage.getItem(APP_STATE_KEY);
  } catch {
    return false;
  }
};

export const queueHabitCompletion = (habitId: string, userId: string, date: string, time: string | null) => {
  try {
    // Obtener la cola actual
    const queueString = localStorage.getItem('pendingCompletions') || '[]';
    const queue = JSON.parse(queueString);
    
    // Añadir la nueva acción a la cola
    queue.push({
      habitId,
      userId,
      date,
      time,
      timestamp: new Date().toISOString()
    });
    
    // Guardar la cola actualizada
    localStorage.setItem('pendingCompletions', JSON.stringify(queue));
    
    return true;
  } catch (error) {
    console.error('Error al encolar completación:', error);
    return false;
  }
};

export const processPendingCompletions = async () => {
  try {
    const queueString = localStorage.getItem('pendingCompletions');
    if (!queueString) return;
    
    const queue = JSON.parse(queueString);
    if (queue.length === 0) return;
    
    const newQueue = [];
    
    for (const item of queue) {
      const result = await markHabitAsCompleted(
        item.habitId,
        item.userId,
        item.date,
        item.time
      );
      
      if (!result.success) {
        newQueue.push(item);
      }
    }
    
    localStorage.setItem('pendingCompletions', JSON.stringify(newQueue));
  } catch (error) {
    console.error('Error al procesar completaciones pendientes:', error);
  }
};

// Añadir esta función para guardar localmente
export const saveCompletionLocally = (habitId: string, userId: string, date: string, time: string | null) => {
  try {
    // Obtener completaciones guardadas
    const savedCompletions = localStorage.getItem('localCompletions') || '{}';
    const completions = JSON.parse(savedCompletions);
    
    // Crear clave única para esta completación
    const key = `${userId}-${habitId}-${date}`;
    
    // Guardar la completación
    completions[key] = {
      habitId,
      userId,
      date,
      time,
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    // Guardar en localStorage
    localStorage.setItem('localCompletions', JSON.stringify(completions));
    
    return true;
  } catch (error) {
    console.error('Error al guardar localmente:', error);
    return false;
  }
};

// Añadir esta función para verificar si un hábito está completado localmente
export const isCompletedLocally = (habitId: string, userId: string, date: string) => {
  try {
    const savedCompletions = localStorage.getItem('localCompletions') || '{}';
    const completions = JSON.parse(savedCompletions);
    const key = `${userId}-${habitId}-${date}`;
    
    return !!completions[key];
  } catch {
    return false;
  }
}; 