import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardNavigationOptions {
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onTab?: () => void;
  onShiftTab?: () => void;
  onSpace?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: boolean;
}

export const useKeyboardNavigation = (options: KeyboardNavigationOptions = {}) => {
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onTab,
    onShiftTab,
    onSpace,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault = false,
    stopPropagation = false,
    enabled = true
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, shiftKey, ctrlKey, altKey, metaKey } = event;
    
    // Modifier tuşları varsa bazı işlemleri atla
    if (ctrlKey || altKey || metaKey) return;

    let handled = false;

    switch (key) {
      case 'ArrowUp':
        if (onArrowUp) {
          onArrowUp();
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          onArrowDown();
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          onArrowLeft();
          handled = true;
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          onArrowRight();
          handled = true;
        }
        break;
      case 'Enter':
        if (onEnter) {
          onEnter();
          handled = true;
        }
        break;
      case 'Escape':
        if (onEscape) {
          onEscape();
          handled = true;
        }
        break;
      case 'Tab':
        if (shiftKey && onShiftTab) {
          onShiftTab();
          handled = true;
        } else if (!shiftKey && onTab) {
          onTab();
          handled = true;
        }
        break;
      case ' ':
      case 'Space':
        if (onSpace) {
          onSpace();
          handled = true;
        }
        break;
      case 'Home':
        if (onHome) {
          onHome();
          handled = true;
        }
        break;
      case 'End':
        if (onEnd) {
          onEnd();
          handled = true;
        }
        break;
      case 'PageUp':
        if (onPageUp) {
          onPageUp();
          handled = true;
        }
        break;
      case 'PageDown':
        if (onPageDown) {
          onPageDown();
          handled = true;
        }
        break;
    }

    if (handled) {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
    }
  }, [
    enabled,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onTab,
    onShiftTab,
    onSpace,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault,
    stopPropagation
  ]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return { handleKeyDown };
};

// Hook for element-specific keyboard navigation
export const useElementKeyboardNavigation = <T extends HTMLElement>(
  options: KeyboardNavigationOptions = {}
) => {
  const elementRef = useRef<T>(null);
  const {
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onTab,
    onShiftTab,
    onSpace,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault = false,
    stopPropagation = false,
    enabled = true
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, shiftKey, ctrlKey, altKey, metaKey } = event;
    
    if (ctrlKey || altKey || metaKey) return;

    let handled = false;

    switch (key) {
      case 'ArrowUp':
        if (onArrowUp) {
          onArrowUp();
          handled = true;
        }
        break;
      case 'ArrowDown':
        if (onArrowDown) {
          onArrowDown();
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (onArrowLeft) {
          onArrowLeft();
          handled = true;
        }
        break;
      case 'ArrowRight':
        if (onArrowRight) {
          onArrowRight();
          handled = true;
        }
        break;
      case 'Enter':
        if (onEnter) {
          onEnter();
          handled = true;
        }
        break;
      case 'Escape':
        if (onEscape) {
          onEscape();
          handled = true;
        }
        break;
      case 'Tab':
        if (shiftKey && onShiftTab) {
          onShiftTab();
          handled = true;
        } else if (!shiftKey && onTab) {
          onTab();
          handled = true;
        }
        break;
      case ' ':
      case 'Space':
        if (onSpace) {
          onSpace();
          handled = true;
        }
        break;
      case 'Home':
        if (onHome) {
          onHome();
          handled = true;
        }
        break;
      case 'End':
        if (onEnd) {
          onEnd();
          handled = true;
        }
        break;
      case 'PageUp':
        if (onPageUp) {
          onPageUp();
          handled = true;
        }
        break;
      case 'PageDown':
        if (onPageDown) {
          onPageDown();
          handled = true;
        }
        break;
    }

    if (handled) {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
    }
  }, [
    enabled,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onEnter,
    onEscape,
    onTab,
    onShiftTab,
    onSpace,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    preventDefault,
    stopPropagation
  ]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('keydown', handleKeyDown);
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return elementRef;
};

// Utility function for focus management
export const useFocusManagement = () => {
  const focusNext = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    (focusableElements[nextIndex] as HTMLElement)?.focus();
  }, []);

  const focusPrevious = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as Element);
    const previousIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    (focusableElements[previousIndex] as HTMLElement)?.focus();
  }, []);

  const focusFirst = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusableElements[0] as HTMLElement)?.focus();
  }, []);

  const focusLast = useCallback(() => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    (focusableElements[focusableElements.length - 1] as HTMLElement)?.focus();
  }, []);

  return {
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast
  };
};

export default useKeyboardNavigation;