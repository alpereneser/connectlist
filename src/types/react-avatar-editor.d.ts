declare module 'react-avatar-editor' {
  import * as React from 'react';

  export interface AvatarEditorProps {
    image: string | File;
    width?: number;
    height?: number;
    border?: number | number[];
    borderRadius?: number;
    color?: [number, number, number, number];
    scale?: number;
    rotate?: number;
    className?: string;
    style?: React.CSSProperties;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    onPositionChange?: (position: { x: number; y: number }) => void;
  }

  export default class AvatarEditor extends React.Component<AvatarEditorProps> {
    getImage(): HTMLCanvasElement;
    getImageScaledToCanvas(): HTMLCanvasElement;
    getCroppingRect(): { x: number; y: number; width: number; height: number };
    setImage(image: string | File): void;
  }
}