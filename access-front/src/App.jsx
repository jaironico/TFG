// src/App.jsx
import React, { useState, useEffect } from 'react';
import Login from './Components/Auth/login';
import Register from './Components/Auth/Register';
import { FileUploader } from './Components/FileUploader';
import TextEditor from './Components/TextEditor';
import VoiceReader from './Components/VoiceReader';
import Settings from './Components/Settings';

const API_BASE = 'http://localhost:8000';

function App() {
  // Estados de autenticación
  const [token, setToken] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' o 'register'

  // Estados de ajustes
  const [readerSettings, setReaderSettings] = useState({ rate: 1, pitch: 1, voice: 'default' });
  const [textSettings, setTextSettings] = useState({
    fontSize: '16px',
    fontFamily: 'Arial',
    textColor: '#333333',
    backgroundColor: '#ffffff'
  });

  // Estado del documento (OCR)
  const [documentState, setDocumentState] = useState({
    text: '',
    isCorrected: false,
    correctionAttempted: false,
    isLoading: false,
    error: null
  });

  // Para mostrar la imagen original
  const [originalImageURL, setOriginalImageURL] = useState(null);

  // Mostrar/Ocultar ajustes
  const [showSettings, setShowSettings] = useState(false);

  // Mensaje temporal al guardar ajustes
  const [saveMessage, setSaveMessage] = useState('');

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
    setReaderSettings({ rate: 1, pitch: 1, voice: 'default' });
    setTextSettings({
      fontSize: '16px',
      fontFamily: 'Arial',
      textColor: '#333333',
      backgroundColor: '#ffffff'
    });
    setOriginalImageURL(null);
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
        headers: {
          'Content-Type': 'application/json'
        },
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
        textColor: data.text_color,
        backgroundColor: data.background_color
      });
      setReaderSettings({
        rate: parseFloat(data.rate),
        pitch: parseFloat(data.pitch),
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
          pitch: String(newReader.pitch)
        })
      });

      if (!res.ok) {
        throw new Error('Error al guardar ajustes');
      }

      setSaveMessage('Ajustes guardados');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('Error guardando ajustes:', err);
      setSaveMessage('Error al guardar ajustes');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleUpload = async (file) => {
    setOriginalImageURL(URL.createObjectURL(file));
    setDocumentState({
      text: '',
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
      setDocumentState({
        text: data.corrected_text || data.original_text || '',
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
    <div style={styles.outerContainer}>
      <div style={styles.app}>
        <h1 style={styles.title}>Editor de Documentos con IA</h1>

        <div style={styles.topBar}>
          <button
            onClick={() => setShowSettings(v => !v)}
            style={styles.ajustesButton}
            aria-expanded={showSettings}
          >
            Ajustes
          </button>
          <button
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Cerrar Sesión
          </button>
        </div>

        {showSettings && (
          <div>
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
            {saveMessage && (
              <div style={styles.saveMessage}>{saveMessage}</div>
            )}
          </div>
        )}

        <FileUploader
          onFileUpload={handleUpload}
          disabled={documentState.isLoading}
        />

        {originalImageURL && (
          <div style={styles.imagePreviewContainer}>
            <p>Imagen original:</p>
            <img
              src={originalImageURL}
              alt="Original subida"
              style={styles.imagePreview}
            />
          </div>
        )}

        {documentState.isLoading && (
          <div style={styles.messageBox} role="status" aria-live="polite">
            <p>Procesando documento...</p>
          </div>
        )}

        {documentState.error && (
          <div style={{ ...styles.messageBox, backgroundColor: '#ffebee' }} role="alert">
            <p>Error: {documentState.error}</p>
          </div>
        )}

        {documentState.text && (
          <div style={styles.documentContainer}>
            {documentState.correctionAttempted && !documentState.isCorrected && (
              <div style={{ ...styles.messageBox, backgroundColor: '#fff8e1' }} role="alert">
                <p>✋ Esta es una versión sin revisar, podría contener errores</p>
              </div>
            )}

            <TextEditor
              text={documentState.text}
              readOnly={documentState.isLoading}
              textSettings={textSettings}
            />

            <div style={styles.controls}>
              <VoiceReader
                text={documentState.text}
                readerSettings={readerSettings}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  outerContainer: {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '20px'
  },
  app: {
    width: '100%',
    maxWidth: '800px',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box'
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '20px'
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px'
  },
  ajustesButton: {
    padding: '10px 20px',
    backgroundColor: '#2c3e50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#b71c1c',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  messageBox: {
    padding: '15px',
    borderRadius: '4px',
    margin: '20px 0',
    textAlign: 'center'
  },
  documentContainer: {
    marginTop: '30px'
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px'
  },
  saveMessage: {
    marginTop: '10px',
    textAlign: 'center',
    color: '#388e3c',
    fontWeight: 'bold'
  },
  imagePreviewContainer: {
    textAlign: 'center',
    marginTop: '20px'
  },
  imagePreview: {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '4px',
    border: '1px solid #ccc'
  }
};

export default App;