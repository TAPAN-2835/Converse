import React from "react";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";

const TechyBg = ({ children }) => {
  const { theme } = useThemeStore();
  const themeObj = THEMES.find((t) => t.name === theme) || THEMES[0];
  const [color1, color2, color3, color4] = themeObj.colors;

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-center items-stretch overflow-hidden shadow-xl transition-colors duration-500">
      {/* SVG Animated Pattern */}
      <svg
        className="absolute inset-0 w-full h-full animate-gradient-move"
        style={{ zIndex: 0 }}
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="techyGradient" x1="0" y1="0" x2="800" y2="600" gradientUnits="userSpaceOnUse">
            <stop stopColor={color1} />
            <stop offset="0.5" stopColor={color2} />
            <stop offset="1" stopColor={color3} />
          </linearGradient>
          <radialGradient id="techyRadial" cx="50%" cy="50%" r="0.8">
            <stop offset="0%" stopColor={color4} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color2} stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="600" fill="url(#techyGradient)" />
        <circle cx="400" cy="300" r="250" fill="url(#techyRadial)" />
        <g stroke={color4} strokeWidth="1.5" opacity="0.12">
          {Array.from({ length: 12 }).map((_, i) => (
            <rect
              key={i}
              x={50 + i * 20}
              y={50 + i * 10}
              width={700 - i * 40}
              height={500 - i * 20}
              rx={30 - i}
              fill="none"
            />
          ))}
        </g>
      </svg>
      <div className="relative z-10 w-full h-full flex-1 flex flex-col justify-center items-stretch">{children}</div>
    </div>
  );
};

export default TechyBg; 