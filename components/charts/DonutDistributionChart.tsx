"use client"

import type React from "react"
import { useState } from "react"
import { Cell, PieChart, Pie, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts"
import { Clock, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/primitives/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useDistribution } from "@/components/custom-hooks/useDistribution"
import { DistributionData } from "@/src/supabase/services/distribution.service"

interface DonutDistributionChartProps {
  currentDate?: Date;
  className?: string;
}

type ViewType = "day" | "week" | "month"

export const DonutDistributionChart: React.FC<DonutDistributionChartProps> = ({
  currentDate = new Date(),
  className = ""
}) => {
  const [activeView, setActiveView] = useState<ViewType>("day")
  
  const { distributionData, weeklyBarData, loading, error } = useDistribution(currentDate, activeView)
  
  const totalHours = distributionData.reduce((sum, item) => sum + item.hours, 0)
  
  // Calcular datos completos del día (solo para vista diaria)
  const completeDistributionData = activeView === "day" ? (() => {
    const programmedHours = totalHours
    const freeHours = Math.max(0, 24 - programmedHours)
    
    // Si no hay actividades programadas, mostrar solo tiempo libre
    if (distributionData.length === 0) {
      return [{
        name: "Tiempo libre",
        value: 100,
        color: "#f3f4f6", // Gris claro
        hours: 24,
        suffix: {
          text: "Disponible",
          style: "text-[11px] text-gray-400"
        }
      }]
    }
    
    // Datos de actividades programadas
    const activitiesData = distributionData.map(item => ({
      ...item,
      value: Math.round((item.hours / 24) * 100) // Recalcular porcentaje basado en 24h
    }))
    
    // Agregar tiempo libre si hay horas no programadas
    if (freeHours > 0) {
      activitiesData.push({
        name: "Tiempo libre",
        value: Math.round((freeHours / 24) * 100),
        color: "#f3f4f6", // Gris claro
        hours: Number(freeHours.toFixed(1)),
        suffix: {
          text: "Disponible",
          style: "text-[11px] text-gray-400"
        }
      })
    }
    
    return activitiesData
  })() : activeView === "month" ? (() => {
    // Calcular horas totales del mes
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const totalMonthHours = daysInMonth * 24
    const programmedHours = totalHours
    const freeHours = Math.max(0, totalMonthHours - programmedHours)
    
    // Si no hay actividades programadas, mostrar solo tiempo libre
    if (distributionData.length === 0) {
      return [{
        name: "Tiempo libre",
        value: 100,
        color: "#f3f4f6", // Gris claro
        hours: totalMonthHours,
        suffix: {
          text: "Disponible",
          style: "text-[11px] text-gray-400"
        }
      }]
    }
    
    // Datos de actividades programadas
    const activitiesData = distributionData.map(item => ({
      ...item,
      value: Math.round((item.hours / totalMonthHours) * 100) // Recalcular porcentaje basado en horas del mes
    }))
    
    // Agregar tiempo libre si hay horas no programadas
    if (freeHours > 0) {
      activitiesData.push({
        name: "Tiempo libre",
        value: Math.round((freeHours / totalMonthHours) * 100),
        color: "#f3f4f6", // Gris claro
        hours: Number(freeHours.toFixed(0)), // Sin decimales para vista mensual
        suffix: {
          text: "Disponible",
          style: "text-[11px] text-gray-400"
        }
      })
    }
    
    return activitiesData
  })() : distributionData
  
  const getTimeUnit = () => "h"
  
  const currentDateFormatted = format(currentDate, "dd 'de' MMMM", { locale: es })

  // Mostrar estado de carga
  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border dark:border-gray-700">
          {[
            { key: "day" as ViewType, label: "Día" },
            { key: "week" as ViewType, label: "Semana" },
            { key: "month" as ViewType, label: "Mes" },
          ].map((view) => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeView === view.key 
                  ? "bg-[#1c1c1c] dark:bg-gradient-to-r dark:from-blue-600 dark:to-purple-600 text-white shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
        
        <Card className="border-0 shadow-sm dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              {currentDateFormatted}
            </div>
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mostrar mensaje cuando no hay datos
  if (!distributionData || (distributionData.length === 0 && activeView === "week")) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border dark:border-gray-700">
          {[
            { key: "day" as ViewType, label: "Día" },
            { key: "week" as ViewType, label: "Semana" },
            { key: "month" as ViewType, label: "Mes" },
          ].map((view) => (
            <button
              key={view.key}
              onClick={() => setActiveView(view.key)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeView === view.key 
                  ? "bg-[#1c1c1c] dark:bg-gradient-to-r dark:from-blue-600 dark:to-purple-600 text-white shadow-sm" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
        
        <Card className="border-0 shadow-sm dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              {currentDateFormatted}
            </div>
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-center">
                No hay datos de distribución para {activeView === "day" ? "hoy" : activeView === "week" ? "esta semana" : "este mes"}
              </p>
              <p className="text-sm text-center mt-2">
                Agrega hábitos y tareas para ver la distribución de tiempo
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-100px)] ${className}`}>
      {/* View Selector - Fixed at top */}
      <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border dark:border-gray-700 mb-4">
        {[
          { key: "day" as ViewType, label: "Día" },
          { key: "week" as ViewType, label: "Semana" },
          { key: "month" as ViewType, label: "Mes" },
        ].map((view) => (
          <button
            key={view.key}
            onClick={() => setActiveView(view.key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeView === view.key 
                ? "bg-[#1c1c1c] dark:bg-gradient-to-r dark:from-blue-600 dark:to-purple-600 text-white shadow-sm" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Chart Section */}
      <Card className="border-0 shadow-sm dark:bg-gray-800 mb-4 flex-shrink-0">
        <CardContent className="p-6">
          {/* Current Date Display - Inside chart card */}
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            {currentDateFormatted}
          </div>

          {activeView === "week" ? (
            // Gráfico de barras con hábitos individuales y etiquetas de tareas apiladas
            <div>
              <div className="flex items-center justify-center mb-4">
                <TrendingUp className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {weeklyBarData.reduce((sum, day) => sum + day.total, 0).toFixed(0)}h esta semana
                </span>
              </div>
              
              {/* Gráfico de barras personalizado */}
              <div className="h-48 flex items-end justify-center gap-1 px-4">
                {weeklyBarData.map((dayData, dayIndex) => (
                  <div key={dayData.day} className="flex flex-col items-center flex-1">
                    <div className="flex flex-col-reverse items-center justify-start h-40 bg-gray-100 dark:bg-gray-800/10 rounded-t-lg overflow-hidden">
                      {/* Barras de hábitos individuales */}
                      {dayData.habits.map((habit, habitIndex) => (
                        <div
                          key={`habit-${habitIndex}`}
                          className="w-8"
                          style={{
                            height: `${Math.max((habit.hours / 24) * 100, 4)}%`,
                            backgroundColor: habit.color,
                            minHeight: habit.hours > 0 ? '4px' : '0px'
                          }}
                          title={`${habit.name}: ${habit.hours}h`}
                        />
                      ))}
                      
                      {/* Barra apilada de etiquetas de tareas */}
                      {dayData.taskLabels.map((label, labelIndex) => (
                        <div
                          key={`label-${labelIndex}`}
                          className="w-8"
                          style={{
                            height: `${Math.max((label.hours / 24) * 100, 4)}%`,
                            backgroundColor: label.color,
                            minHeight: label.hours > 0 ? '4px' : '0px'
                          }}
                          title={`${label.labelName}: ${label.hours}h`}
                        />
                      ))}
                      
                      {/* Barra de tiempo libre */}
                      {dayData.freeTime > 0 && (
                        <div
                          className="w-8 opacity-30"
                          style={{
                            height: `${Math.max((dayData.freeTime / 24) * 100, 2)}%`,
                            backgroundColor: "#f3f4f6",
                            minHeight: '2px'
                          }}
                          title={`Tiempo libre: ${dayData.freeTime}h`}
                        />
                      )}
                    </div>
                    
                    <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {dayData.day}
                    </span>
                  </div>
                ))}
              </div>
              
            </div>
          ) : (
            // Gráfico de dona para vista diaria y mensual
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={completeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={90}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {completeDistributionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className="h-6 w-6 text-gray-400 mb-1" />
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeView === "day" ? totalHours.toFixed(1) : totalHours.toFixed(activeView === "month" ? 0 : 1)}{getTimeUnit()}
                </span>
                <span className={`text-xs text-gray-500 dark:text-gray-400 mt-1 text-center`}>
                  Programadas
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main content area with flex layout */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Fixed Tiempo libre section */}
        {(activeView === "day" || activeView === "month" ? completeDistributionData : distributionData)
          .filter(item => item.name === "Tiempo libre")
          .map((item, index) => (
            <div key={`free-${index}`} className="flex-shrink-0 flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border dark:border-gray-700 relative mb-2">
              {item.suffix && (
                <span className={`absolute top-2 right-2 ${item.suffix.style} px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700`}>
                  {item.suffix.text}
                </span>
              )}
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                <p className={`text-xs ${item.name === "Tiempo libre" ? "text-blue-500 dark:text-blue-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
                  {activeView === "month" ? `${item.hours.toFixed(0)}h` : `${item.hours}h`} ({item.value}%)
                </p>
              </div>
            </div>
          ))}

        {/* Scrollable area for regular items */}
        <div className="overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-2 gap-2">
            {(activeView === "day" || activeView === "month" ? completeDistributionData : distributionData)
              .filter(item => item.name !== "Tiempo libre")
              .map((item, index) => (
                <div key={index} className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border dark:border-gray-700 relative">
                  {item.suffix && (
                    <span className={`absolute top-2 right-2 ${item.suffix.style} px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700`}>
                      {item.suffix.text}
                    </span>
                  )}
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className={`text-xs ${item.name === "Tiempo libre" ? "text-blue-500 dark:text-blue-400 font-semibold" : "text-gray-500 dark:text-gray-400"}`}>
                      {activeView === "month" ? `${item.hours.toFixed(0)}h` : `${item.hours}h`} ({item.value}%)
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
} 