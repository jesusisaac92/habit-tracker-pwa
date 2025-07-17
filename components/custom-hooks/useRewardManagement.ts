import { useState, useCallback } from 'react';
import { Reward, MedalType } from '@/components/types/types';
import { toast } from '@/components/ui/use-toast';

const INITIAL_REWARDS: Reward[] = [
  { name: 'Película en el cine', points: 20, classification: 'bronce', index: 0 },
  { name: 'Cena en restaurante', points: 50, classification: 'plata', index: 1 },
  { name: 'Día de spa', points: 100, classification: 'oro', index: 2 }
];

export const useRewardManagement = () => {
  const [rewards, setRewards] = useState<Reward[]>(INITIAL_REWARDS);
  const [totalPoints, setTotalPoints] = useState(0);
  const [claimedMedals, setClaimedMedals] = useState<Record<MedalType, number>>({
    bronce: 0,
    plata: 0,
    oro: 0
  });

  const addReward = useCallback((rewardData: { name: string, classification: MedalType }) => {
    const getRandomPoints = (min: number, max: number) => {
      const range = max - min + 1;
      const bias = Math.random() * 0.3;
      return Math.floor(min + (Math.random() * (1 + bias)) * range);
    };

    const pointsRange = {
      bronce: { min: 25, max: 50 },
      plata: { min: 51, max: 100 },
      oro: { min: 101, max: 200 }
    };

    const range = pointsRange[rewardData.classification];
    const points = getRandomPoints(range.min, range.max);

    setRewards(prev => [
      ...prev,
      {
        ...rewardData,
        points,
        index: prev.length
      }
    ]);

    toast.title(
      `Nueva recompensa añadida: ${rewardData.name}`,
      `${points} puntos (${rewardData.classification})`
    );
  }, [toast]);

  const claimReward = useCallback((rewardIndex: number) => {
    const reward = rewards[rewardIndex];
    if (reward && totalPoints >= reward.points) {
      setTotalPoints(prev => prev - reward.points);
      setRewards(prev => prev.filter((_, index) => index !== rewardIndex));
      setClaimedMedals(prev => ({
        ...prev,
        [reward.classification]: prev[reward.classification] + 1
      }));

      toast.success(
        `¡Recompensa reclamada! Has canjeado "${reward.name}"`
      );
    }
  }, [rewards, totalPoints, toast]);

  return {
    rewards,
    totalPoints,
    claimedMedals,
    addReward,
    claimReward,
    setTotalPoints
  };
};