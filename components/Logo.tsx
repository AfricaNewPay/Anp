import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className}>
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="12"/>
        <feOffset dx="0" dy="8" result="offsetblur"/>
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.2"/>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{stopColor:'#ffffff', stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:'#f1f5f9', stopOpacity:1}} />
      </linearGradient>
    </defs>
    
    {/* Main Badge Body with Shadow */}
    <g filter="url(#shadow)">
        <circle cx="256" cy="256" r="230" fill="url(#grad1)" stroke="#e2e8f0" strokeWidth="2"/>
    </g>

    {/* Content Group */}
    {/* Blue Bar Top */}
    <rect x="91" y="145" width="330" height="20" fill="#0056b3" rx="2" />

    {/* Blue Boxes */}
    <rect x="91" y="180" width="100" height="100" fill="#0056b3" rx="2" />
    <rect x="206" y="180" width="100" height="100" fill="#0056b3" rx="2" />
    <rect x="321" y="180" width="100" height="100" fill="#0056b3" rx="2" />

    {/* Letters */}
    <text x="141" y="255" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="75" fill="white" textAnchor="middle">A</text>
    <text x="256" y="255" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="75" fill="white" textAnchor="middle">N</text>
    <text x="371" y="255" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="75" fill="white" textAnchor="middle">P</text>

    {/* Blue Bar Bottom */}
    <rect x="91" y="295" width="330" height="20" fill="#0056b3" rx="2" />

    {/* Version Text */}
    <text x="256" y="380" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="60" fill="#334155" textAnchor="middle" letterSpacing="1">v2.0</text>
  </svg>
);