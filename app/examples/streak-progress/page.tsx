"use client"

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StreakStatCard from '@/components/ui/StreakStatCard';
import StreakStatCardVertical from '@/components/ui/StreakStatCardVertical';
import StreakProgressBarVertical from '@/components/ui/StreakProgressBarVertical';
import StreakCard from '@/components/ui/composite/stats/StreakCard';
import StreakCardVertical from '@/components/ui/composite/stats/StreakCardVertical';
import StreakCard2 from '@/components/ui/composite/stats/StreakCard2';
import { Zap, Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StreakProgressExample() {
  const { t } = useTranslation();
  const [currentStreak, setCurrentStreak] = useState(1);
  const [recordStreak, setRecordStreak] = useState(3);
  const [isActive, setIsActive] = useState(true);
  
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
  
  const toggleActive = () => {
    setIsActive(prev => !prev);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center text-blue-600 hover:text-blue-800 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          <span>Volver al Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold mb-2">Ejemplos de Tarjeta de Racha</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Este componente muestra la racha actual, el récord histórico y el progreso hacia un nuevo récord.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Controles de Demostración</h2>
          
          <div className="space-y-6">
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
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Estado: {isActive ? 'Activo' : 'Inactivo'}</h3>
              <button 
                onClick={toggleActive}
                className={`px-3 py-1 rounded ${isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}
              >
                Cambiar
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Tarjeta de Racha con Progreso</h2>
          <StreakCard2 
            currentStreak={currentStreak} 
            recordStreak={recordStreak}
            isActive={isActive}
          />
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Tarjeta Horizontal</h2>
          <StreakStatCard
            title={t('habitDetail.currentStreak', 'Racha actual')}
            currentStreak={currentStreak}
            recordStreak={recordStreak}
            icon={<Zap className="h-4 w-4 text-yellow-500" />}
          />
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Tarjeta Vertical</h2>
          <StreakStatCardVertical
            title={t('habitDetail.currentStreak', 'Racha actual')}
            currentStreak={currentStreak}
            recordStreak={recordStreak}
            icon={<Zap className="h-4 w-4 text-yellow-500" />}
          />
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Tarjeta Simple</h2>
          <StreakCard
            currentStreak={currentStreak}
            recordStreak={recordStreak}
          />
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
          <h2 className="text-xl font-semibold mb-4">Tarjeta Vertical Simple</h2>
          <StreakCardVertical
            currentStreak={currentStreak}
            recordStreak={recordStreak}
          />
        </div>
      </div>
      
      <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow">
        <h2 className="text-xl font-semibold mb-4">Ejemplos de Estados (Vertical)</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Racha Baja (30%)</h3>
            <StreakProgressBarVertical currentStreak={3} recordStreak={10} />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Racha Media (60%)</h3>
            <StreakProgressBarVertical currentStreak={6} recordStreak={10} />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Racha Alta (90%)</h3>
            <StreakProgressBarVertical currentStreak={9} recordStreak={10} />
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">¡Nuevo Récord!</h3>
            <StreakProgressBarVertical currentStreak={12} recordStreak={10} />
          </div>
        </div>
      </div>
    </div>
  );
} 