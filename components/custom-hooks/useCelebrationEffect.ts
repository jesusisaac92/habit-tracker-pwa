import { useEffect } from 'react';

type CelebrationType = 'oro' | 'plata' | 'bronce';

interface UseCelebrationEffectProps {
  isCelebrating: boolean;
  setIsCelebrating: (celebrating: boolean) => void;
  celebrationType: CelebrationType;
}

export const useCelebrationEffect = ({
  isCelebrating,
  setIsCelebrating,
  celebrationType
}: UseCelebrationEffectProps) => {
  useEffect(() => {
    if (isCelebrating) {
      const duration = 
        celebrationType === 'oro' ? 10000 :
        celebrationType === 'plata' ? 7000 : 5000;

      const timer = setTimeout(() => {
        setIsCelebrating(false);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isCelebrating, celebrationType, setIsCelebrating]);
}; 