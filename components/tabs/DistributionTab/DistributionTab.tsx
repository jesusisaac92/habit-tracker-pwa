import React from 'react';
import { useTranslation } from 'next-i18next';
import { DonutDistributionChart } from '@/components/charts/DonutDistributionChart';

interface DistributionTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentDate?: Date;
}

export const DistributionTab: React.FC<DistributionTabProps> = ({
  searchQuery,
  setSearchQuery,
  currentDate = new Date()
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DonutDistributionChart currentDate={currentDate} />
    </div>
  );
}; 