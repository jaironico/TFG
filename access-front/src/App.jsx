import React, { useState } from 'react';
import { FileUploader } from './Components/FileUploader';
import TextEditor from './Components/TextEditor';
import VoiceReader from './Components/VoiceReader';
import Settings from './Components/Settings';

function App() {
  // Estado de documento
  const [documentState, setDocumentState] = useState({
    text: '',
    isCorrected: false,
    correctionAttempted: false,
    isLoading: false,
    error: null
  });

  // Estado global de ajustes
  const [readerSettings, setReaderSettings] = useState({
    rate: 1,
    pitch: 1,
    voice: 'default'
  });
  const [textSettings, setTextSettings] = useState({
    fontSize: '16px',
    fontFamily: 'Arial',
    textColor: '#333333',
    backgroundColor: '#ffffff'
  });

  const handleUpload = async (file) => {
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

      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
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
      console.error("Error:", error);
      setDocumentState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  return (
    <div style={styles.app}>
      <h1 style={styles.title}>Editor de Documentos con IA</h1>

      {/* Panel de ajustes */}
      <Settings
        onReaderSettingsChange={setReaderSettings}
        onTextSettingsChange={setTextSettings}
      />

      <FileUploader 
        onFileUpload={handleUpload} 
        disabled={documentState.isLoading}
      />
      
      {documentState.isLoading && (
        <div style={styles.messageBox} role="status" aria-live="polite">
          <p>Procesando documento...</p>
        </div>
      )}

      {documentState.error && (
        <div style={{...styles.messageBox, backgroundColor: '#ffebee'}} role="alert">
          <p>Error: {documentState.error}</p>
        </div>
      )}

      {documentState.text && (
        <div style={styles.documentContainer}>
          {documentState.correctionAttempted && !documentState.isCorrected && (
            <div style={{...styles.messageBox, backgroundColor: '#fff8e1'}} role="alert">
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
  );
}

const styles = {
  app: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '30px'
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
  }
};

export default App;
