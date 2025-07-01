import React from "react";
import "./Loader3D.css";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";

const Loader3D = () => {
  const { theme } = useThemeStore();
  const themeObj = THEMES.find((t) => t.name === theme) || THEMES[0];
  const [color1, color2, color3, color4] = themeObj.colors;

  return (
    <div className="loader3d-container">
      <div className="loader3d">
        <div className="cube">
          <div className="face front" style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }} />
          <div className="face back" style={{ background: `linear-gradient(135deg, ${color2}, ${color3})` }} />
          <div className="face right" style={{ background: `linear-gradient(135deg, ${color3}, ${color4})` }} />
          <div className="face left" style={{ background: `linear-gradient(135deg, ${color4}, ${color1})` }} />
          <div className="face top" style={{ background: `linear-gradient(135deg, ${color2}, ${color4})` }} />
          <div className="face bottom" style={{ background: `linear-gradient(135deg, ${color1}, ${color3})` }} />
        </div>
      </div>
      <span className="loader3d-text">Loading...</span>
    </div>
  );
};

export default Loader3D; 