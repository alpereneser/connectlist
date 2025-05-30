/// <reference types="vite/client" />

// Microsoft Clarity types
interface Window {
  clarity: (method: string, ...args: any[]) => void;
  dataLayer: any[];
  gtag: (...args: any[]) => void;
}