import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      width="200" 
      height="200" 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bgGradient" x1="0" y1="0" x2="200" y2="200">
          <stop offset="0%" stopColor="#FF8A2A"/>
          <stop offset="100%" stopColor="#F97316"/>
        </linearGradient>

        <filter id="blurGlass" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
      </defs>

      {/* Rounded Background */}
      <rect x="10" y="10" width="180" height="180" rx="40"
            fill="url(#bgGradient)"/>

      {/* Glass Layer */}
      <rect x="20" y="20" width="160" height="160" rx="35"
            fill="white"
            fillOpacity="0.15"
            filter="url(#blurGlass)"/>

      {/* Shield */}
      <path d="M100 50 
               L140 70 
               L140 110 
               C140 140 100 160 100 160 
               C100 160 60 140 60 110 
               L60 70 Z"
            fill="white"
            fillOpacity="0.85"/>

      {/* Inner Circle */}
      <circle cx="100" cy="105" r="25" fill="#F97316"/>

      {/* Checkmark */}
      <path d="M88 105 L98 115 L115 95"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"/>
    </svg>
  );
};
