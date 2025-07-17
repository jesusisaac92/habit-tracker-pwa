import { useMemo } from 'react';
import { Reward } from '../types/types';

const useRewardSearch = (rewards: Reward[], searchQuery: string) => {
  const filteredRewards = useMemo(() => {
    return rewards.filter((reward) =>
      reward.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [rewards, searchQuery]);

  return { filteredRewards };
};

export default useRewardSearch;