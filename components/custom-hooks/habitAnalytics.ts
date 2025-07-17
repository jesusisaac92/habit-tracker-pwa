import { MonthlyDataType, HabitStatusMap } from "@/components/types/types";
import { getMonthName } from '@/components/lib/dateUtils';

interface AnnualDataResult {
  monthlyData: MonthlyDataType[];
  annualSummary: {
    totalCompleted: number;
    totalPartial: number;
    totalNotCompleted: number;
  };
}

/**
 * Genera datos anuales de rendimiento para un hábito específico
 * @param habitIndex - Índice del hábito
 * @param year - Año seleccionado (opcional, por defecto año actual)
 * @param habitStatus - Estado del hábito
 * @returns Objeto con datos mensuales y resumen anual
 */
export const generateAnnualData = (
  habitIndex: number, 
  year: number,
  habitStatus: HabitStatusMap
): AnnualDataResult => {
  // Usar el año pasado como parámetro
  const selectedYear = year;
  
  const monthlyData: MonthlyDataType[] = [];

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();
    let selectedYearCompleted = 0;
    let previousYearCompleted = 0;
    let twoPreviousYearCompleted = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const selectedYearKey = `${habitIndex}-${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const previousYearKey = `${habitIndex}-${selectedYear - 1}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const twoPreviousYearKey = `${habitIndex}-${selectedYear - 2}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (habitStatus[selectedYearKey]?.status === 'completed') selectedYearCompleted++;
      if (habitStatus[previousYearKey]?.status === 'completed') previousYearCompleted++;
      if (habitStatus[twoPreviousYearKey]?.status === 'completed') twoPreviousYearCompleted++;
    }

    const selectedYearRate = (selectedYearCompleted / daysInMonth) * 100;
    const previousYearRate = (previousYearCompleted / daysInMonth) * 100;
    const twoPreviousYearRate = (twoPreviousYearCompleted / daysInMonth) * 100;

    const improvement = previousYearRate > 0 ? 
      parseFloat(((selectedYearRate - previousYearRate) / previousYearRate * 100).toFixed(1)) : 0;

    monthlyData.push({
      month: getMonthName(month),
      year: selectedYear,
      completionRate: parseFloat(selectedYearRate.toFixed(1)),
      improvementVsLastYear: improvement,
      yearOverYearComparison: {
        selectedYear: parseFloat(selectedYearRate.toFixed(1)),
        previousYear: parseFloat(previousYearRate.toFixed(1)),
        twoPreviousYear: parseFloat(twoPreviousYearRate.toFixed(1)),
        improvement: improvement
      }
    });
  }

  return {
    monthlyData,
    annualSummary: {
      totalCompleted: monthlyData.reduce((acc, curr) => acc + curr.completionRate, 0),
      totalPartial: 0,
      totalNotCompleted: monthlyData.reduce((acc, curr) => acc + (100 - curr.completionRate), 0)
    }
  };
};

/**
 * Calcula el promedio de completado para un período específico
 * @param monthlyData - Datos mensuales
 * @returns Promedio de completado
 */
export const calculateCompletionAverage = (monthlyData: MonthlyDataType[]): number => {
  if (!monthlyData.length) return 0;
  return monthlyData.reduce((acc, curr) => acc + curr.completionRate, 0) / monthlyData.length;
};

/**
 * Obtiene el mes con mejor rendimiento
 * @param monthlyData - Datos mensuales
 * @returns Mes con mejor rendimiento y su tasa
 */
export const getBestPerformanceMonth = (monthlyData: MonthlyDataType[]) => {
  if (!monthlyData.length) return null;
  
  return monthlyData.reduce((best, current) => {
    return current.completionRate > best.completionRate ? current : best;
  });
};

/**
 * Calcula la tendencia de mejora año tras año
 * @param monthlyData - Datos mensuales
 * @returns Porcentaje de mejora promedio
 */
export const calculateYearOverYearTrend = (monthlyData: MonthlyDataType[]): number => {
  if (!monthlyData.length) return 0;
  
  const improvements = monthlyData
    .map(month => month.improvementVsLastYear)
    .filter(improvement => !isNaN(improvement));

  if (!improvements.length) return 0;
  
  return improvements.reduce((acc, curr) => acc + curr, 0) / improvements.length;
};