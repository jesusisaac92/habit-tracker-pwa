import React from 'react';
import AnnualPerformanceDialog from '@/components/dialogs/performance/AnnualPerformanceDialog';
import { HabitWithPerformance, MonthlyDataType, HabitStatus } from '@/components/types/types';

interface AnnualPerformanceDialogContainerProps {
    initialIsOpen: boolean;
    onClose?: () => void;
    selectedHabit: HabitWithPerformance | null;
    selectedYear: number;
    setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
    generateYearOptions: () => number[];
    monthlyData: MonthlyDataType[];
    setMonthlyData: React.Dispatch<React.SetStateAction<MonthlyDataType[]>>;
    annualSummary: {
      totalCompleted: number;
      totalPartial: number;
      totalNotCompleted: number;
    };
    habitStatus: Record<string, HabitStatus>;
    generateAnnualData: (habitIndex: number, habitStatus: any, year?: number) => {
      monthlyData: MonthlyDataType[];
      annualSummary: {
        totalCompleted: number;
        totalPartial: number;
        totalNotCompleted: number;
      };
    };
    currentDate: Date;
}

export const AnnualPerformanceDialogContainer = ({
  initialIsOpen,
  onClose,
  selectedHabit,
  selectedYear,
  setSelectedYear,
  monthlyData,
  setMonthlyData,
  annualSummary,
  habitStatus,
  generateAnnualData,
  currentDate
}: AnnualPerformanceDialogContainerProps) => {
  const [isOpen, setIsOpen] = React.useState(initialIsOpen);
  
  const calendarYear = currentDate.getFullYear();
  
  // Siempre mostrar el año del calendario y el anterior
  const availableYears = React.useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const startYear = selectedHabit ? new Date(selectedHabit.startDate).getFullYear() : currentYear;
    
    // Generar array de años desde el inicio del hábito hasta el año actual
    return Array.from(
      { length: currentYear - startYear + 1 },
      (_, i) => startYear + i
    ).filter(year => year <= currentYear);
  }, [currentDate, selectedHabit]);

  React.useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && onClose) {
      onClose();
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
  };

  React.useEffect(() => {
    if (selectedHabit) {
      const { monthlyData: newData } = generateAnnualData(
        Number(selectedHabit.id),
        habitStatus,
        selectedYear
      );
      setMonthlyData(newData);
    }
  }, [selectedYear, selectedHabit, habitStatus]);

  return (
    <AnnualPerformanceDialog
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      selectedHabit={selectedHabit}
      habitStatus={habitStatus}
      currentDate={currentDate}
    />
  );
};

