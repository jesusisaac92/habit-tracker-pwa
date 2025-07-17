// Tipos básicos
export type Difficulty = 'easy' | 'medium' | 'hard';
export type MedalType = 'bronce' | 'plata' | 'oro';
export type BarPieChartType = 'bar' | 'pie';

// Interface base para el rendimiento
export interface Performance {
  completionRate: string;
  consistencyRate: string;
  completed: number;
  partial: number;
  notCompleted: number;
}

// Interface base para hábito
export interface Habit {
  id: string | number;
  supabase_id?: string;
  index: number;
  name: string;
  title?: string;
  description: string;
  time: string | null;
  difficulty: Difficulty;
  color: string;
  noSpecificTime: boolean;
  record: number;
  currentStreak: number;
  timeObjective: number | "indefinite";
  startDate: string;
  endDate?: string;
  selectedDays: number[];
  days?: number[];
  icon: string;
  isIndefinite: boolean;
  objectiveHistory: ObjectiveHistory[];
  currentObjective: ObjectiveHistory;
  medals?: {
    bronze: boolean;
    silver: boolean;
    gold: boolean;
    awarded: boolean;
    level: number;
  };
  type: 'habit';
  getColor: () => string;
  time_exceptions: { [date: string]: { time: string } };
  completed?: boolean;
}

// Interface para hábito con rendimiento
export interface HabitWithPerformance extends Habit {
  performance?: {
    completionRate: string;
    consistencyRate: string;
    completed: number;
    partial: number;
    totalDays?: number;
    streak?: number;
    notCompleted: number;
  };
  completedToday?: boolean;
  supabase_id?: string;
}

// Interface para hábito en edición
export interface EditingHabit extends Omit<Habit, 'record' | 'currentStreak' | 'startDate'> {
  record?: number;
  currentStreak?: number;
  startDate?: string;
}

// Interface para datos mensuales
export interface MonthlyDataType {
  month: string;
  year: number;
  completionRate: number;
  improvementVsLastYear: number;
  yearOverYearComparison: {
    selectedYear: number;
    previousYear: number;
    twoPreviousYear: number;
    improvement: number;
  };
};

// Interface para estado del hábito
export interface HabitStatus {
  status: "" | "completed" | "pending";
  time?: string;  // Hacer time opcional de nuevo
}

// Actualizar HabitStatusMap para que coincida con HabitStatus
export interface HabitStatusMap {
  [key: string]: HabitStatus;
}

// Interfaces para emociones y notas
export interface Emotion {
  emoji: string;
  text: string;
}

export interface EmotionNote {
  emotion: string;
  note: string;
}

export interface ViewingNote extends EmotionNote {
  habitIndex: number;
  date: string;
}

export type EmotionNotesMap = Record<string, EmotionNote>;

// Interfaces para gráficos y visualización
export interface GraphDataPoint {
  day: number;
  points: number;
  status: string;
  time: string;
}

export interface RenderActiveShapeProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: { name: string };
  percent: number;
  value: number;
}

export interface WeekData {
  period: string;
  count: number;
  [key: string]: string | number;
}

export interface CustomPayload {
  name: string;
  value: number;
  color?: string;
}

export interface Reward {
  name: string;
  points: number;
  classification: MedalType;
  index: number;
  habit?: {
    name: string;
    icon: string;
    color: string;
  };
}

export interface BalanceData {
  period: string;
  fullPeriod?: string;
  [key: string]: string | number | Record<string, number> | undefined;
}

export type MedalEmojis = Record<MedalType, string>;

export interface User {
  name: string;
  lastName: string;
  email: string;
  age: number;
  gender: string;
  country: string;
}

export type ViewMode = 'month' | 'year';
export type GraphPeriodType = 'monthly' | 'annual';
export type GenerateGraphDataFunction = (habitIndex: number, type: GraphPeriodType) => void;

// Nueva interface para los datos de rendimiento anual
export interface YearlyPerformanceData {
  month: string;
  [year: string]: number | string; // Permite datos dinámicos por año (year2024, year2023, etc.)
}

// Interface para la configuración del gráfico anual
export interface YearlyComparisonConfig {
  selectedYears: number[];
  colors: Record<number, string>; // Mapeo de años a colores
  maxYears?: number; // Número máximo de años a comparar (default: 3)
}

// Interface para las estadísticas anuales
export interface YearlyStats {
  year: number;
  averageCompletionRate: number;
  totalCompleted: number;
  totalPartial: number;
  totalNotCompleted: number;
  bestMonth: {
    month: string;
    completionRate: number;
  };
  worstMonth: {
    month: string;
    completionRate: number;
  };
}

export interface YearlyDataPoint {
  month: string;
  [key: string]: number | string; // Esto permitirá años dinámicos como `year${currentYear}`
}

// Para YearlyTrendChart
export interface DailyDataPoint {
  date: string;
  points: number;
  status: "completed" | "not-completed";
}

// Para AnnualPerformanceChart
export interface YearlyComparisonDataPoint {
  month: string;
  [key: `year${number}`]: number; // Esto permite años dinámicos como year2025, year2024, etc.
}

// Agregar una nueva interfaz para los datos del gráfico
export interface YearlyComparisonData {
  month: string;
  year2024: number;
  year2023: number;
  year2022: number;
}

// Para el gráfico de progreso de hábitos
export interface ProgressDataPoint {
  period: string;
  dayNumber?: number;     // Número de día para ordenamiento en vista mensual
  monthIndex?: number;    // Índice del mes para ordenamiento en vista anual
  month?: string;         // Nombre del mes para vista anual
  _realValues?: Record<string, number>; // Valores reales para el tooltip
  [habitName: string]: string | number | undefined | Record<string, number>; // Permite 'period' como string y valores de hábitos como number
}

export interface HabitProgressData {
  name: string;
  color: string;
}

export interface HabitCounter {
  [habitName: string]: {
    accumulatedCompleted: number;
    accumulatedTotal: number;
  };
}

export interface YearlyCounter {
  [habitName: string]: {
    yearlyCompleted: number;
    yearlyTotal: number;
  };
}

export interface HabitsProgressChartProps {
  data: ProgressDataPoint[];
  habits: Habit[];
  selectedMonth?: Date;
  period?: ViewPeriodType;
  onMonthChange?: (date: Date) => void;
  habitStatus?: Record<string, HabitStatus>;
}

// Agregar una interface más específica para los datos de hábitos
export interface HabitProgressPoint {
  period: string;
  [habitName: string]: number | string;
}

// Añadir estas interfaces
export interface PerformanceCalculationConfig {
  windowSize: number;
  decayRate: number;
  pointsPerDay: number;
}

export interface DailyPerformanceData {
  day: number;
  points: number;
  status: string;
  time: string;
  trend?: number;
  previousMonth?: number;
}

export interface MonthlyPerformanceResult {
  currentMonthData: DailyPerformanceData[];
  previousMonthData: DailyPerformanceData[];
}

export interface ObjectiveHistory {
  startDate: string;
  endDate?: string;
  timeObjective: number | 'indefinite';
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  dueDate?: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  time?: string | null;
  color?: string | null;
  is_recurring: boolean;
  label_id?: string | null;
  label?: TaskLabel | null;
  recurring_data?: any;
  recurring_dates?: string[] | null;
  recurring_exceptions?: Record<string, { time?: string }>;
  note?: string | null;
  type?: 'task';
  custom_label_name?: string | null;
  custom_label_color?: string | null;
  time_exceptions?: Record<string, { time?: string }>;
}

// Primero las interfaces
export interface TaskLabel {
  id: string;
  name: string;
  color: string;
  isCustom?: boolean;
}

// Luego importar y re-exportar DEFAULT_TASK_LABELS
import { DEFAULT_TASK_LABELS as DefaultLabels } from './defaultLabels';
export const DEFAULT_TASK_LABELS = DefaultLabels;

// Ahora podemos usar DEFAULT_TASK_LABELS
export const taskLabels = DEFAULT_TASK_LABELS;

// Finalmente exportar el hook
export { useTaskLabels } from '@/components/dialogs/tasks/useTaskLabels';

export type BalancePeriod = 'week' | 'month';

export type ViewPeriodType = 'month' | 'year';
export type PeriodType = 'month' | 'year';  // Cambiar de 'week' | 'month' a 'month' | 'year'

export interface ProgressPoints {
  basePoints: number;
  streakBonus: number;
  consistencyBonus: number;
  totalPoints: number;
}

export interface PerformanceDataPoint {
  day: number;
  points: number;
  status: string;
  time: string;
  streakCount?: number;
  progressPoints?: ProgressPoints;
} 

export interface PerformanceTabProps {
  generateProgressTrendData: (period: PeriodType) => void;
} 

// Modificar o añadir esta interfaz
export interface MonthlyTrendData {
  month: string;
  points: number;
  lastYearPoints: number;
  period: string;
  monthIndex?: number;
  historicalAverage?: number;
  completedDays?: number;
  totalDays?: number;
  year?: number;
}

// Actualizar la interfaz existente para el YearlyTrendChart
export interface YearlyTrendChartProps {
  yearlyData: MonthlyTrendData[];
} 

// Para el diálogo de múltiples hábitos
export interface HabitsProgressTrendDialogProps {
  isOpen: boolean;
  onOpenChange: (value: boolean) => void;
  data: ProgressDataPoint[];
  habits: Habit[];
  period: ViewPeriodType;
  onPeriodChange: (period: ViewPeriodType) => void;
  currentDate: Date;
  habitStatus: Record<string, HabitStatus>;
  generateProgressTrendData: (
    habits: Habit[],
    habitStatus: Record<string, HabitStatus>,
    period: ViewPeriodType
  ) => {
    data: ProgressDataPoint[];
    processedHabits: { name: string; color: string; }[];
  };
} 

// Para HabitsAnnualProgressChart
export interface HabitsAnnualProgressChartProps {
  data: ProgressDataPoint[];
  habits: HabitProgressData[];
  year: number;
} 

export type GenerateTrendDataFn = (
  habits: Habit[],
  habitStatus: Record<string, HabitStatus>,
  period: ViewPeriodType,
  currentDate: Date
) => {
  data: ProgressDataPoint[];
  processedHabits: HabitProgressData[];
} | null;

export interface PerformanceData {
  completionRate?: number;
  consistencyRate?: number;
  streak?: number;
  totalCompleted?: number;
  totalPartial?: number;
  totalNotCompleted?: number;
  // Otros campos relevantes para el rendimiento
} 

// Añadir estas interfaces
export interface HabitsTabProps {
  habits: Habit[];
  habitStatus: Record<string, HabitStatus>;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onHabitComplete: (habitId: number) => void;
  onHabitEdit: (habit: Habit) => void;
  onAddHabit: () => void;
  onViewDetail: (habitId: number) => void;
}

export interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
} 

export type DialogType = 
  | 'habitDetail' 
  | 'editHabit' 
  | 'calendar' 
  | 'updateProfile' 
  | 'help'
  | 'addNote'; 

export type ItemType = 'habit' | 'task';

export type TimelineItemType = 'task' | 'habit' | undefined;

// Primero definir la interfaz base
export interface BaseTimelineItem {
  id: string | number;
  type: 'task' | 'habit';
  title: string;
  time?: string | null;
  color?: string | null;
  noSpecificTime?: boolean;
  label?: TaskLabel;
  completed?: boolean;
  time_exceptions?: Record<string, { time?: string }>;
  recurring_exceptions?: Record<string, { time?: string }>;
}

// Luego extender de la interfaz base
export interface TaskItem extends BaseTimelineItem {
  type: 'task';
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  note?: string | null;
  dueDate?: string;
  created_at?: string;
}

export interface HabitItem extends BaseTimelineItem {
  type: 'habit';
  name: string;
  time: string | null | undefined;
  index?: number;
  selectedDays?: number[];
  days?: number[];
  startDate?: string;
  endDate?: string;
  isIndefinite?: boolean;
  isRecurring?: boolean;
  recurringDates?: string[];
  noSpecificTime?: boolean;
  time_exceptions: { [date: string]: { time: string } };
}

// Definir el tipo TimelineItem como unión
export type TimelineItem = TaskItem | HabitItem;

export interface TimelinePosition {
  top: number;
  left: number | string;
  width: number | string;
  height: number;
  column?: number;
} 

export interface TrendDataResult {
  data: any[];
  processedHabits: {
    name: string;
    color: string;
  }[];
} 

