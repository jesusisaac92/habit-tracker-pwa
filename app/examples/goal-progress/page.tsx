"use client"

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GoalProgressCard from '@/components/ui/composite/stats/GoalProgressCard';
import StreakCard2 from '@/components/ui/composite/stats/StreakCard2';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GoalProgressExample() {
  const { t } = useTranslation();
  const [totalDays, setTotalDays] = useState(193);
  const [daysCompleted, setDaysCompleted] = useState(1);
  const [currentStreak, setCurrentStreak] = useState(1);
  const [recordStreak, setRecordStreak] = useState(3);
  const [variant, setVariant] = useState<'dark' | 'light'>('dark');
  const [showGoalLabel, setShowGoalLabel] = useState(true);
  
  const incrementDaysCompleted = () => {
    setDaysCompleted(prev => Math.min(prev + 1, totalDays));
  };
  
  const decrementDaysCompleted = () => {
    setDaysCompleted(prev => Math.max(0, prev - 1));
  };
  
  const incrementTotalDays = () => {
    setTotalDays(prev => prev + 10);
  };
  
  const decrementTotalDays = () => {
    setTotalDays(prev => Math.max(10, prev - 10));
  };
  
  const incrementStreak = () => {
    setCurrentStreak(prev => prev + 1);
  };
  
  const decrementStreak = () => {
    setCurrentStreak(prev => Math.max(0, prev - 1));
  };
  
  const incrementRecord = () => {
    setRecordStreak(prev => prev + 1);
  };
  
  const decrementRecord = () => {
    setRecordStreak(prev => Math.max(0, prev - 1));
  };
  
  const toggleVariant = () => {
    setVariant(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  const toggleGoalLabel = () => {
    setShowGoalLabel(prev => !prev);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Volver al Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold mb-2">Ejemplos de Tarjeta de Objetivo</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Este componente muestra el objetivo de tiempo, el progreso actual y los días restantes.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Controles de Demostración</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Días Totales: {totalDays}</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={decrementTotalDays}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  -10
                </button>
                <button 
                  onClick={incrementTotalDays}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  +10
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Días Completados: {daysCompleted}</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={decrementDaysCompleted}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  -
                </button>
                <button 
                  onClick={incrementDaysCompleted}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  +
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Racha Actual: {currentStreak}</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={decrementStreak}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  -
                </button>
                <button 
                  onClick={incrementStreak}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  +
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Récord: {recordStreak}</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={decrementRecord}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  -
                </button>
                <button 
                  onClick={incrementRecord}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  +
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Variante: {variant === 'dark' ? 'Oscuro' : 'Claro'}</h3>
              <button 
                onClick={toggleVariant}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Cambiar Tema
              </button>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Etiqueta Meta: {showGoalLabel ? 'Visible' : 'Oculta'}</h3>
              <button 
                onClick={toggleGoalLabel}
                className="px-3 py-1 bg-teal-500 text-white rounded hover:bg-teal-600"
              >
                {showGoalLabel ? 'Ocultar Etiqueta' : 'Mostrar Etiqueta'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
            <h2 className="text-xl font-semibold mb-4">Tarjeta de Objetivo ({variant === 'dark' ? 'Oscuro' : 'Claro'})</h2>
            <GoalProgressCard 
              totalDays={totalDays}
              daysCompleted={daysCompleted}
              creationDate="22/06/2025"
              variant={variant}
              showGoalLabel={showGoalLabel}
            />
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
            <h2 className="text-xl font-semibold mb-4">Tarjeta de Racha</h2>
            <StreakCard2 
              currentStreak={currentStreak}
              recordStreak={recordStreak}
              isActive={true}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Modo Oscuro</h2>
          <div className="space-y-6">
            <GoalProgressCard 
              totalDays={totalDays}
              daysCompleted={daysCompleted}
              creationDate="22/06/2025"
              variant="dark"
              showGoalLabel={showGoalLabel}
            />
            
            <StreakCard2 
              currentStreak={currentStreak}
              recordStreak={recordStreak}
              isActive={true}
            />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Modo Claro</h2>
          <div className="space-y-6">
            <GoalProgressCard 
              totalDays={totalDays}
              daysCompleted={daysCompleted}
              creationDate="22/06/2025"
              variant="light"
              showGoalLabel={showGoalLabel}
            />
            
            <StreakCard2 
              currentStreak={currentStreak}
              recordStreak={recordStreak}
              isActive={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 