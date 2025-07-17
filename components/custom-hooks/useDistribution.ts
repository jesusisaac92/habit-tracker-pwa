import { useState, useEffect } from 'react';
import { distributionService, DistributionData, WeeklyBarData } from '@/src/supabase/services/distribution.service';
import { supabase } from '@/src/supabase/config/client';

type ViewType = 'day' | 'week' | 'month';

export const useDistribution = (currentDate: Date, activeView: ViewType) => {
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [weeklyBarData, setWeeklyBarData] = useState<WeeklyBarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDistribution = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener el usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setDistributionData([]);
          setWeeklyBarData([]);
          return;
        }

        let data: DistributionData[] = [];
        let barData: WeeklyBarData[] = [];

        switch (activeView) {
          case 'day':
            data = await distributionService.getDayDistribution(user.id, currentDate);
            break;
          case 'week':
            data = await distributionService.getWeekDistribution(user.id, currentDate);
            barData = await distributionService.getWeeklyBarData(user.id, currentDate);
            break;
          case 'month':
            data = await distributionService.getMonthDistribution(user.id, currentDate);
            break;
          default:
            data = await distributionService.getDayDistribution(user.id, currentDate);
        }

        setDistributionData(data);
        setWeeklyBarData(barData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching distribution data');
        setDistributionData([]);
        setWeeklyBarData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDistribution();
  }, [currentDate, activeView]);

  return {
    distributionData,
    weeklyBarData,
    loading,
    error
  };
}; 