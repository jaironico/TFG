// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import Login from './Components/Auth/login';
import Register from './Components/Auth/Register';
import { FileUploader } from './Components/FileUploader';
import TextEditor from './Components/TextEditor';
import VoiceReader from './Components/VoiceReader';
import Settings from './Components/Settings';

import './index.css';   // Estilos globales e index
import './App.css';     // Estilos de la App (colores oscuros)

/* -----------------------------------------
   API_BASE apuntando a tu backend local
   ----------------------------------------- */
const API_BASE = 'http://localhost:8000';

function App() {
  // Estados de autenticación
  const [token, setToken] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authMode, setAuthMode] = useState('login');

  // Estados de ajustes
  const [readerSettings, setReaderSettings] = useState({
    rate: 1,
    pitch: 1,
    volume: 5,
    voice: 'default'
  });
  const [textSettings, setTextSettings] = useState({
    fontSize: '16px',
    fontFamily: 'Arial',
    textColor: '#EEE',
    backgroundColor: '#111'
  });

  // Estado del documento (OCR + descripción)
  const [documentState, setDocumentState] = useState({
    text: '',
    description: '',
    isCorrected: false,
    correctionAttempted: false,
    isLoading: false,
    error: null
  });

  // Para mostrar la imagen original
  const [originalImageURL, setOriginalImageURL] = useState(null);

  // Mostrar/Ocultar ajustes
  const [showSettings, setShowSettings] = useState(false);

  // Referencia al contenedor del botón de Ajustes
  const ajustesRef = useRef(null);

  // Detener voz al cambiar ajustes
  useEffect(() => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }, [readerSettings, textSettings]);

  // Al montar, intento cargar token y ajustes
  useEffect(() => {
    const saved = localStorage.getItem('token');
    if (saved) {
      setToken(saved);
      fetchSettings(saved);
    }
  }, []);

  const handleLogout = () => {
    const confirmLogout = window.confirm('¿Estás seguro de que quieres cerrar sesión?');
    if (!confirmLogout) return;

    localStorage.removeItem('token');
    setToken(null);
    setReaderSettings({ rate: 1, pitch: 1, volume: 2, voice: 'default' });
    setTextSettings({
      fontSize: '16px',
      fontFamily: 'Arial',
      textColor: '#EEE',
      backgroundColor: '#111'
    });
    setOriginalImageURL(null);
    setDocumentState({
      text: '',
      description: '',
      isCorrected: false,
      correctionAttempted: false,
      isLoading: false,
      error: null
    });
  };

  const login = async (username, password) => {
    setAuthError(null);
    try {
      const form = new URLSearchParams();
      form.append('username', username);
      form.append('password', password);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Credenciales inválidas');
      }
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      fetchSettings(data.access_token);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const register = async (username, password) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 422 && Array.isArray(data.detail)) {
          const messages = data.detail
            .map(err => {
              const field = err.loc.includes('username')
                ? 'Usuario'
                : err.loc.includes('password')
                ? 'Contraseña'
                : 'Campo';
              if (err.type === 'value_error.any_str.min_length') {
                return `• ${field} debe tener al menos ${err.ctx.limit_value} caracteres`;
              }
              if (err.type === 'value_error.any_str.max_length') {
                return `• ${field} no debe superar ${err.ctx.limit_value} caracteres`;
              }
              return `• Error en ${field}: ${err.msg}`;
            })
            .join('\n');
          throw new Error(messages);
        }
        throw new Error(data.detail || 'Error al registrar usuario');
      }

      await login(username, password);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const fetchSettings = async (jwtToken) => {
    try {
      const res = await fetch(`${API_BASE}/me/settings`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        }
      });
      if (!res.ok) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setTextSettings({
        fontSize: data.font_size + 'px',
        fontFamily: data.font_family,
        textColor: '#EEE',
        backgroundColor: '#111'
      });
      setReaderSettings({
        rate: parseFloat(data.rate),
        pitch: parseFloat(data.pitch),
        volume: parseFloat(data.volume || 2),
        voice: 'default'
      });
    } catch (err) {
      console.error('Error cargando ajustes:', err);
      handleLogout();
    }
  };

  const saveSettingsToServer = async (newReader, newText) => {
    const jwtToken = localStorage.getItem('token');
    if (!jwtToken) return;
    try {
      const res = await fetch(`${API_BASE}/me/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`
        },
        body: JSON.stringify({
          font_size: newText.fontSize.replace('px', ''),
          font_family: newText.fontFamily,
          text_color: newText.textColor,
          background_color: newText.backgroundColor,
          rate: String(newReader.rate),
          pitch: String(newReader.pitch),
          volume: String(newReader.volume)
        })
      });

      if (!res.ok) {
        throw new Error('Error al guardar ajustes');
      }

      // Ventana emergente de confirmación
      window.alert("Ajustes guardados");
    } catch (err) {
      console.error('Error guardando ajustes:', err);
      window.alert("Error guardando ajustes");
    }
  };

  const handleUpload = async (file) => {
    // Mostrar imagen original
    setOriginalImageURL(URL.createObjectURL(file));

    // Resetear estado de procesamiento
    setDocumentState({
      text: '',
      description: '',
      isCorrected: false,
      correctionAttempted: false,
      isLoading: true,
      error: null
    });

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Error al procesar el archivo');
      }

      // Guardar texto y descripción
      setDocumentState({
        text: data.corrected_text || data.original_text || '',
        description: data.description || '',
        isCorrected: data.correction_source === 'gemini',
        correctionAttempted: Boolean(data.gemini_available),
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error:', error);
      setDocumentState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  const handleClear = () => {
    setOriginalImageURL(null);
    setDocumentState({
      text: '',
      description: '',
      isCorrected: false,
      correctionAttempted: false,
      isLoading: false,
      error: null
    });
  };

  // Si no hay token, mostramos login o registro
  if (!token) {
    return authMode === 'login' ? (
      <Login
        onLogin={login}
        switchToRegister={() => {
          setAuthMode('register');
          setAuthError(null);
        }}
        errorMessage={authError}
      />
    ) : (
      <Register
        onRegister={register}
        switchToLogin={() => {
          setAuthMode('login');
          setAuthError(null);
        }}
        errorMessage={authError}
      />
    );
  }

  return (
    <div className="app-outer-container">
      <div className="app-container">

        {/* ======================================== */}
        {/* 1) Cabecera con nuevo título */}
        {/* ======================================== */}
        <h1 className="app-title">Acceso Inteligente a Documentos</h1>

        {/* ======================================== */}
        {/* 2) TopBar con “Ajustes” en la esquina */}
        {/* ======================================== */}
        <div className="top-bar">
          <div ref={ajustesRef} className="ajustes-wrapper">
            <button
              onClick={() => setShowSettings(v => !v)}
              className="ajustes-button"
              aria-expanded={showSettings}
            >
              ⚙️ Ajustes
            </button>

            {showSettings && (
              <div className="settingsDropdown">
                <Settings
                  initialReaderSettings={readerSettings}
                  initialTextSettings={{
                    fontSize: textSettings.fontSize.replace('px', ''),
                    fontFamily: textSettings.fontFamily,
                    textColor: textSettings.textColor,
                    backgroundColor: textSettings.backgroundColor
                  }}
                  onReaderSettingsChange={readerNew => {
                    setReaderSettings(readerNew);
                  }}
                  onTextSettingsChange={textNew => {
                    setTextSettings(textNew);
                  }}
                  onSave={() => saveSettingsToServer(readerSettings, textSettings)}
                />
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="logout-button"
          >
            🚪 Cerrar Sesión
          </button>
        </div>

        {/* ======================================== */}
        {/* 3) Área principal: Selector + Clear */}
        {/* ======================================== */}
        <div className="upload-section">
          <FileUploader
            onFileUpload={handleUpload}
            disabled={documentState.isLoading}
          />
          {(originalImageURL || documentState.text || documentState.description) && (
            <button onClick={handleClear} className="clear-button">
              X
            </button>
          )}
        </div>

        {/* ======================================== */}
        {/* 4) Contenido dividido en dos columnas: */}
        {/*     - Izquierda: imagen original       */}
        {/*     - Derecha: texto o descripción     */}
        {/* ======================================== */}
        <div className="content-container">
          <div className="left-column">
            {originalImageURL && (
              <img
                src={originalImageURL}
                alt="Original subida"
                className="image-preview"
              />
            )}
          </div>
          <div className="right-column">
            {documentState.isLoading && (
              <div className="message-box" role="status" aria-live="polite">
                <p>Procesando documento...</p>
              </div>
            )}

            {documentState.error && (
              <div
                className="message-box"
                style={{ backgroundColor: '#550000' }} /* error en rojo oscuro */
                role="alert"
              >
                <p>Error: {documentState.error}</p>
              </div>
            )}

            {documentState.text !== '' ? (
              <>
                {documentState.correctionAttempted && !documentState.isCorrected && (
                  <div
                    className="message-box"
                    style={{ backgroundColor: '#554400' }} /* advertencia en amarillo oscuro */
                    role="alert"
                  >
                    <p>✋ Esta es una versión sin revisar, podría contener errores</p>
                  </div>
                )}
                <TextEditor
                  text={documentState.text}
                  readOnly={documentState.isLoading}
                  textSettings={textSettings}
                />
                <div className="controls">
                  <VoiceReader
                    text={documentState.text}
                    readerSettings={readerSettings}
                  />
                </div>
              </>
            ) : (
              documentState.description && (
                <>
                  <h3 className="description-title">Descripción de la imagen:</h3>
                  <TextEditor
                    text={documentState.description}
                    readOnly={true}
                    textSettings={textSettings}
                  />
                  <div className="controls">
                    <VoiceReader
                      text={documentState.description}
                      readerSettings={readerSettings}
                    />
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;