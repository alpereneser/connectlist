import React, { useCallback } from 'react';

// Haptic feedback türleri
export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';

// Vibration API için pattern türleri
type VibrationPattern = number | number[];

// Haptic feedback hook'u
export const useHapticFeedback = () => {
  const triggerHaptic = useCallback((type: HapticFeedbackType = 'light') => {
    // iOS Safari için Haptic Feedback API kontrolü
    if ('vibrate' in navigator) {
      let pattern: VibrationPattern;
      
      switch (type) {
        case 'light':
          pattern = 10;
          break;
        case 'medium':
          pattern = 20;
          break;
        case 'heavy':
          pattern = 30;
          break;
        case 'selection':
          pattern = [10, 10, 10];
          break;
        case 'impact':
          pattern = [20, 10, 20];
          break;
        case 'notification':
          pattern = [50, 30, 50, 30, 50];
          break;
        default:
          pattern = 10;
      }
      
      try {
        navigator.vibrate(pattern);
      } catch (error) {
        console.warn('Haptic feedback not supported:', error);
      }
    }
    
    // iOS Safari için alternatif haptic feedback
    if ('DeviceMotionEvent' in window && typeof (window as any).DeviceMotionEvent.requestPermission === 'function') {
      // iOS 13+ için haptic feedback simulation
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.01;
        audio.play().catch(() => {});
      } catch (error) {
        // Sessiz hata
      }
    }
  }, []);

  // Özel haptic feedback fonksiyonları
  const lightHaptic = useCallback(() => triggerHaptic('light'), [triggerHaptic]);
  const mediumHaptic = useCallback(() => triggerHaptic('medium'), [triggerHaptic]);
  const heavyHaptic = useCallback(() => triggerHaptic('heavy'), [triggerHaptic]);
  const selectionHaptic = useCallback(() => triggerHaptic('selection'), [triggerHaptic]);
  const impactHaptic = useCallback(() => triggerHaptic('impact'), [triggerHaptic]);
  const notificationHaptic = useCallback(() => triggerHaptic('notification'), [triggerHaptic]);

  return {
    triggerHaptic,
    lightHaptic,
    mediumHaptic,
    heavyHaptic,
    selectionHaptic,
    impactHaptic,
    notificationHaptic
  };
};

// HOC bileşen için haptic feedback wrapper
export const withHapticFeedback = <T extends object>(
  Component: React.ComponentType<T>,
  hapticType: HapticFeedbackType = 'light'
) => {
  return (props: T) => {
    const { triggerHaptic } = useHapticFeedback();
    
    const handleClick = useCallback((event: React.MouseEvent) => {
      // Haptik geri bildirim tetikle
      triggerHaptic(hapticType);
      
      // Orijinal onClick fonksiyonunu çağır
      if ((props as any).onClick) {
        (props as any).onClick(event);
      }
    }, [hapticType, triggerHaptic, props]);

    return React.createElement(Component, {
      ...props,
      onClick: handleClick
    });
  };
};

export default useHapticFeedback;