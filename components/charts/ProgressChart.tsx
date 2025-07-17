"use client";
import React from 'react';
import { useTranslation } from 'next-i18next';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Button } from "@/components/ui/primitives/button";
import { Reward } from "@/components/types/types";
import NoHabitsMessage from '@/components/ui/composite/charts/NoHabitsMessage';

interface ProgressChartProps {
    progressChartData: Array<{ name: string; value: number; color: string }>;
    selectedReward: Reward | null;
    totalPoints: number;
    claimReward: (index: number) => void;
    onClose: () => void;
}

const ProgressChart: React.FC<ProgressChartProps> = ({
  progressChartData,
  selectedReward,
  totalPoints,
  claimReward,
  onClose
}) => {
  const { t } = useTranslation();

  // Si no hay datos de progreso, mostrar mensaje amigable
  if (!progressChartData || progressChartData.length === 0) {
    return (
      <NoHabitsMessage 
        title={t('rewards.noDataTitle') || 'No hay datos de progreso disponibles'}
        description={t('rewards.noDataDescription') || 'Completa tus hábitos para acumular puntos y ver tu progreso hacia recompensas.'}
      />
    );
  }

  return (
    <>
      <div className="w-full h-[250px] sm:h-[300px] md:h-[400px] bg-white dark:bg-gray-800">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={progressChartData}
            margin={{ 
              top: 10,
              right: 10, 
              left: 0,
              bottom: 5 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
            <XAxis 
              type="number" 
              domain={[0, 'dataMax']} 
              tick={{
                fontSize: window.innerWidth < 640 ? 10 : 12,
                fill: 'currentColor'
              }}
              tickFormatter={(value) => `${value}p`}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={window.innerWidth < 640 ? 80 : 100}
              tick={{
                fontSize: window.innerWidth < 640 ? 10 : 12,
                fill: 'currentColor'
              }}
              tickFormatter={(value) => 
                window.innerWidth < 640 && value.length > 15 
                  ? `${value.substring(0, 15)}...` 
                  : value
              }
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '8px',
                fontSize: window.innerWidth < 640 ? '12px' : '14px'
              }}
              formatter={(value) => [`${value} ${t('rewards.points', { count: Number(value) })}`]}
            />
            <Bar 
              dataKey="value" 
              stackId="a" 
              fill="#8884d8"
              radius={[0, 4, 4, 0]}
            >
              {progressChartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
        {progressChartData.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm sm:text-base">
            <div 
              className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs sm:text-sm font-medium truncate">
              {entry.name}: {entry.value.toFixed(1)}p
            </span>
          </div>
        ))}
      </div>
      {selectedReward && (
        <div className="mt-4 sm:mt-6 flex justify-center sm:justify-end">
          <Button
            disabled={totalPoints < selectedReward.points}
            onClick={() => {
              claimReward(selectedReward.index);
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium 
              text-white bg-blue-600 hover:bg-blue-700 
              disabled:bg-gray-400 disabled:cursor-not-allowed
              rounded-md transition-colors duration-300 shadow-sm"
          >
            {totalPoints < selectedReward.points 
              ? t('rewards.pointsNeeded') + `: ${(selectedReward.points - totalPoints).toFixed(1)}`
              : t('rewards.claim')}
          </Button>
        </div>
      )}
    </>
  );
};

export default ProgressChart;
export const MemoizedProgressChart = React.memo(ProgressChart);