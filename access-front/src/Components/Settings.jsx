// src/Components/Settings.jsx
import React, { useState } from "react";
import "./Settings.css";

export default function Settings({
  onReaderSettingsChange,
  onTextSettingsChange,
  onSave
}) {
  const [activeTab, setActiveTab] = useState("reader");

  const [readerSettings, setReaderSettings] = useState({
    rate: 1,
    pitch: 1
  });

  const [textSettings, setTextSettings] = useState({
    fontSize: "16",
    fontFamily: "Arial",
    textColor: "#000000",
    backgroundColor: "#ffffff"
  });

  // Detiene cualquier lectura activa
  const stopSpeaking = () => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };

  // Clamp para rate y pitch
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const handleReaderChange = (e) => {
    stopSpeaking();
    const { name, value: raw } = e.target;
    let parsed;
    if (name === "rate") {
      parsed = clamp(parseFloat(raw) || 0, 0.1, 10);
    } else {
      // name === "pitch"
      parsed = clamp(parseFloat(raw) || 0, 0, 2);
    }
    const next = { ...readerSettings, [name]: parsed };
    setReaderSettings(next);
    onReaderSettingsChange(next);
  };

  const handleTextChange = (e) => {
    stopSpeaking();
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

  const testVoice = () => {
    stopSpeaking();
    if (!window.speechSynthesis) {
      alert("Tu navegador no soporta la API de voz.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      "Esta es una prueba de voz con los ajustes actuales."
    );
    utterance.lang = "es-ES";
    utterance.rate = readerSettings.rate;
    utterance.pitch = readerSettings.pitch;
    window.speechSynthesis.speak(utterance);
  };

  const resetReaderDefaults = () => {
    stopSpeaking();
    const defaults = { rate: 1, pitch: 1 };
    setReaderSettings(defaults);
    onReaderSettingsChange(defaults);
  };

  const resetTextDefaults = () => {
    stopSpeaking();
    const defaults = {
      fontSize: "16",
      fontFamily: "Arial",
      textColor: "#000000",
      backgroundColor: "#ffffff"
    };
    setTextSettings(defaults);
    onTextSettingsChange({
      fontSize: `${defaults.fontSize}px`,
      fontFamily: defaults.fontFamily,
      textColor: defaults.textColor,
      backgroundColor: defaults.backgroundColor
    });
  };

  return (
    <div className="settings-container">
      <h2>Ajustes</h2>
      <div className="tabs">
        <button
          className={activeTab === "reader" ? "active" : ""}
          onClick={() => setActiveTab("reader")}
        >
          Lector de Pantalla
        </button>
        <button
          className={activeTab === "text" ? "active" : ""}
          onClick={() => setActiveTab("text")}
        >
          Texto Plano
        </button>
      </div>

      {activeTab === "reader" && (
        <div className="tab-content">
          {/* Velocidad */}
          <div className="control-row">
            <label htmlFor="rate">Velocidad:</label>
            <input
              id="rate"
              type="range"
              name="rate"
              min="0.1"
              max="10"
              step="0.1"
              value={readerSettings.rate}
              onChange={handleReaderChange}
            />
            <input
              type="number"
              name="rate"
              min="0.1"
              max="10"
              step="0.1"
              value={readerSettings.rate}
              onChange={handleReaderChange}
            />
          </div>

          {/* Timbre */}
          <div className="control-row">
            <label htmlFor="pitch">Timbre:</label>
            <input
              id="pitch"
              type="range"
              name="pitch"
              min="0"
              max="2"
              step="0.1"
              value={readerSettings.pitch}
              onChange={handleReaderChange}
            />
            <input
              type="number"
              name="pitch"
              min="0"
              max="2"
              step="0.1"
              value={readerSettings.pitch}
              onChange={handleReaderChange}
            />
          </div>

          {/* Botones de acción - Lector de Pantalla */}
          <div className="control-row buttons-row">
            <button onClick={testVoice} className="action-btn">
              🔊 Probar voz
            </button>
            <button onClick={resetReaderDefaults} className="action-btn">
              🗘 Predeterminados
            </button>
          </div>
        </div>
      )}

      {activeTab === "text" && (
        <div className="tab-content">
          {/* Tamaño de fuente */}
          <div className="control-row">
            <label htmlFor="fontSize">Tamaño de fuente (px):</label>
            <input
              id="fontSize"
              className="narrow-input"
              type="number"
              name="fontSize"
              value={textSettings.fontSize}
              onChange={handleTextChange}
              min="7"
              max="72"
              step="1"
            />
          </div>

          {/* Fuente */}
          <div className="control-row">
            <label htmlFor="fontFamily">Fuente:</label>
            <select
              id="fontFamily"
              className="narrow-input"
              name="fontFamily"
              value={textSettings.fontFamily}
              onChange={handleTextChange}
            >
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
            </select>
          </div>

          {/* Color de texto */}
          <div className="control-row">
            <label htmlFor="textColor">Color de texto:</label>
            <input
              id="textColor"
              className="narrow-input"
              type="color"
              name="textColor"
              value={textSettings.textColor}
              onChange={handleTextChange}
            />
          </div>

          {/* Color de fondo */}
          <div className="control-row">
            <label htmlFor="backgroundColor">Color de fondo:</label>
            <input
              id="backgroundColor"
              className="narrow-input"
              type="color"
              name="backgroundColor"
              value={textSettings.backgroundColor}
              onChange={handleTextChange}
            />
          </div>

          {/* Texto de prueba */}
          <div className="control-row sample-row">
            <label>Texto de prueba:</label>
            <div
              className="sample-text"
              style={{
                fontSize: `${textSettings.fontSize}px`,
                fontFamily: textSettings.fontFamily,
                color: textSettings.textColor,
                backgroundColor: textSettings.backgroundColor
              }}
            >
              Este es un texto de prueba para previsualizar los ajustes.
            </div>
          </div>

          {/* Botón de acción - Reset Texto Plano */}
          <div className="control-row text-buttons-row">
            <div /> {/* espacio vacío para la etiqueta */}
            <button onClick={resetTextDefaults} className="action-btn text-btn-wide">
              🗘 Predeterminados
            </button>
          </div>
        </div>
      )}

      {/* Botón "Guardar" */}
      <div className="save-row">
        <button
          onClick={() => onSave(readerSettings, textSettings)}
          className="action-btn save-btn"
        >
          💾 Guardar
        </button>
      </div>
    </div>
  );
}