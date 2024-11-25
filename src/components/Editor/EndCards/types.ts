export interface EndCard {
  id: string;
  type: 'video' | 'playlist' | 'subscribe' | 'link' | 'custom';
  title: string;
  subtitle?: string;
  url: string;
  thumbnail?: string;
  duration: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    backgroundColor: string;
    textColor: string;
    opacity: number;
    borderRadius: number;
    animation: 'fade' | 'slide' | 'zoom' | 'bounce';
    shadow: boolean;
    blur: boolean;
    border: {
      width: number;
      color: string;
      style: 'solid' | 'dashed' | 'dotted';
    };
    hover: {
      scale: number;
      rotate: number;
      translateY: number;
    };
  };
  isVisible: boolean;
  zIndex: number;
}