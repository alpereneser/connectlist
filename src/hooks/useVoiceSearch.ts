import { useState, useEffect, useRef, useCallback } from 'react';
import { useHapticFeedback } from './useHapticFeedback';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

export interface UseVoiceSearchOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export function useVoiceSearch({
  onResult,
  onError,
  language = 'tr-TR',
  continuous = false,
  interimResults = true
}: UseVoiceSearchOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { triggerHaptic } = useHapticFeedback();

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;

      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        triggerHaptic('light');
      };

      recognition.onend = () => {
        setIsListening(false);
        triggerHaptic('light');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        const fullTranscript = finalTranscript || interimTranscript;
        setTranscript(fullTranscript);

        if (finalTranscript && onResult) {
          onResult(finalTranscript.trim());
          triggerHaptic('medium');
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const errorMessage = getErrorMessage(event.error);
        setError(errorMessage);
        setIsListening(false);
        triggerHaptic('heavy');
        
        if (onError) {
          onError(errorMessage);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, continuous, interimResults, onResult, onError, triggerHaptic]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      const errorMsg = 'Ses tanıma bu tarayıcıda desteklenmiyor';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (err) {
        const errorMsg = 'Ses tanıma başlatılamadı';
        setError(errorMsg);
        if (onError) onError(errorMsg);
      }
    }
  }, [isSupported, isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening
  };
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'no-speech':
      return 'Ses algılanamadı. Lütfen tekrar deneyin.';
    case 'audio-capture':
      return 'Mikrofon erişimi sağlanamadı.';
    case 'not-allowed':
      return 'Mikrofon izni verilmedi.';
    case 'network':
      return 'Ağ hatası oluştu.';
    case 'service-not-allowed':
      return 'Ses tanıma servisi kullanılamıyor.';
    case 'bad-grammar':
      return 'Dil tanıma hatası.';
    case 'language-not-supported':
      return 'Bu dil desteklenmiyor.';
    default:
      return 'Ses tanıma hatası oluştu.';
  }
}

export default useVoiceSearch;