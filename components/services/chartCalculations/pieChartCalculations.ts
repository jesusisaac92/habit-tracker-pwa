// Función para generar datos para el gráfico de pie
export const generatePieChartData = (habits: any[], habitStatus: Record<string, any>) => {
  // Si no hay hábitos, devolver un array vacío
  if (!habits || habits.length === 0) {
    return [];
  }

  // Calcular totales para completados, parciales y no completados
  const totals = {
    completed: 0,
    partial: 0,
    notCompleted: 0
  };

  // Contar hábitos por estado
  habits.forEach(habit => {
    const status = habitStatus[habit.id];
    if (status) {
      if (status.completed > 0) totals.completed++;
      else if (status.partial > 0) totals.partial++;
      else totals.notCompleted++;
    } else {
      totals.notCompleted++;
    }
  });

  // Generar datos para el gráfico de pie
  return [
    { name: 'Completados', value: totals.completed, color: '#10b981' },
    { name: 'Parciales', value: totals.partial, color: '#f59e0b' },
    { name: 'No Completados', value: totals.notCompleted, color: '#ef4444' }
  ];
}; 