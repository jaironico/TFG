import React, { useState } from "react";
import "./Settings.css";

export default function Settings({ onReaderSettingsChange, onTextSettingsChange }) {
  const [activeTab, setActiveTab] = useState("reader");

  const [readerSettings, setReaderSettings] = useState({
    rate: 1,
    pitch: 1,
    voice: "default",
  });

  const [textSettings, setTextSettings] = useState({
    fontSize: "16",
    fontFamily: "Arial",
    textColor: "#000000",
    backgroundColor: "#ffffff",
  });

  const handleReaderChange = (e) => {
    const { name, value } = e.target;
    const next = { ...readerSettings, [name]: value };
    setReaderSettings(next);
    onReaderSettingsChange(next);
  };

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    const next = { ...textSettings, [name]: value };
    setTextSettings(next);
    onTextSettingsChange({
      fontSize: `${next.fontSize}px`,
      fontFamily: next.fontFamily,
      textColor: next.textColor,
      backgroundColor: next.backgroundColor
    });
  };

  return (
    <div className="settings-container">
      <h2>Ajustes</h2>
      <div className="tabs">
        <button onClick={() => setActiveTab("reader")}>Lector de Pantalla</button>
        <button onClick={() => setActiveTab("text")}>Texto Plano</button>
      </div>

      {activeTab === "reader" && (
        <div className="tab-content">
          <label>Velocidad: {readerSettings.rate}</label>
          <input
            type="range"
            name="rate"
            min="0.5"
            max="2"
            step="0.1"
            value={readerSettings.rate}
            onChange={handleReaderChange}
          />

          <label>Timbre: {readerSettings.pitch}</label>
          <input
            type="range"
            name="pitch"
            min="0"
            max="2"
            step="0.1"
            value={readerSettings.pitch}
            onChange={handleReaderChange}
          />

          <label>Voz:</label>
          <select name="voice" value={readerSettings.voice} onChange={handleReaderChange}>
            <option value="default">Por defecto</option>
            <option value="male">Masculina</option>
            <option value="female">Femenina</option>
          </select>
        </div>
      )}

      {activeTab === "text" && (
        <div className="tab-content">
          <label>Tamaño de fuente (px):</label>
          <input
            type="number"
            name="fontSize"
            value={textSettings.fontSize}
            onChange={handleTextChange}
            min="10"
            max="40"
          />

          <label>Fuente:</label>
          <select name="fontFamily" value={textSettings.fontFamily} onChange={handleTextChange}>
            <option value="Arial">Arial</option>
            <option value="Verdana">Verdana</option>
            <option value="Georgia">Georgia</option>
            <option value="Courier New">Courier New</option>
          </select>

          <label>Color de texto:</label>
          <input
            type="color"
            name="textColor"
            value={textSettings.textColor}
            onChange={handleTextChange}
          />

          <label>Color de fondo:</label>
          <input
            type="color"
            name="backgroundColor"
            value={textSettings.backgroundColor}
            onChange={handleTextChange}
          />
        </div>
      )}
    </div>
  );
}
