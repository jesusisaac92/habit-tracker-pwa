import React from 'react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ 
  text,
  size = 'md', 
  className = '' 
}: LoadingSpinnerProps) {
  // Tamaños más pequeños para el spinner
  const sizes = {
    sm: 'w-6 h-6 border',
    md: 'w-8 h-8 border-2',
    lg: 'w-10 h-10 border-2'  // Reducido de w-16 h-16
  }[size];

  // Tamaños correspondientes para el efecto de luz
  const glowSizes = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'  // Reducido de w-24 h-24
  }[size];

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Efecto de luz más pronunciado con tamaño ajustado */}
          <div className={`absolute ${glowSizes} rounded-full bg-white opacity-50 animate-[ping_1.5s_ease-out_infinite]`}></div>
          {/* Spinner con animación más notoria */}
          <div className={`animate-[spin_0.8s_linear_infinite] rounded-full border-t-2 border-white border-opacity-80 ${sizes}`}></div>
        </div>
        {text && <div className="mt-4 text-white font-medium">{text}</div>}
      </div>
    </div>
  );
}




