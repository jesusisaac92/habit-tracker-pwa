"use client"
import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

export interface AnnualCustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: any }>;
  label?: string;
  annualSummary: {
    totalCompleted: number;
    totalPartial: number;
    totalNotCompleted: number;
  };
  displaySummary?: {
    completionRate: string;
    bestMonth: string;
    longestStreak: string;
    daysCompleted: string;
  };
}

export const AnnualCustomTooltip: React.FC<AnnualCustomTooltipProps> = ({ 
  active, 
  payload, 
  label, 
  annualSummary,
  displaySummary 
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const improvement = data.improvementVsLastYear;
    
    const getComparisonText = () => {
      if (improvement === null) return "N/A";
      return `${improvement > 0 ? '+' : ''}${improvement.toFixed(2)}%`;
    };

    const comparisonText = getComparisonText();
    const completionRate = `${data.completionRate.toFixed(2)}%`;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-md border border-gray-200 dark:border-gray-700 max-w-[200px] text-xs">
        <h3 className="font-bold text-sm mb-1">{label}</h3>
        <div className="space-y-1">
          <p className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">Tasa:</span>
            <span className="font-medium">{completionRate}</span>
          </p>
          <p className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400">vs Anterior:</span>
            <span className={`font-medium flex items-center ${improvement > 0 ? "text-green-500" : "text-red-500"}`}>
              {improvement > 0 ? <ArrowUpIcon className="h-3 w-3 mr-0.5" /> : <ArrowDownIcon className="h-3 w-3 mr-0.5" />}
              {comparisonText}
            </span>
          </p>
        </div>
        {displaySummary && (
          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
            <p className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Mejor Mes:</span>
              <span className="font-medium">{displaySummary.bestMonth}</span>
            </p>
            <p className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400">Total Completados:</span>
              <span className="font-medium">{annualSummary.totalCompleted}</span>
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};


