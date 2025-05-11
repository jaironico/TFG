import React, { useState } from 'react';
import { FileUploader } from './Components/FileUploader';
import TextEditor from './Components/TextEditor';
import VoiceReader from './Components/VoiceReader';

function App() {
  const [documentState, setDocumentState] = useState({
    originalText: '',
    correctedText: '',
    type: '',
    isLoading: false,
    isVerifying: false,
    error: null,
    warning: null,
    apiAvailable: true
  });

  const verifyTextWithGemini = async (text) => {
    if (!text.trim() || !documentState.apiAvailable) return;

    setDocumentState(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const response = await fetch('http://localhost:8000/verify-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error en la verificación');
      }

      setDocumentState(prev => ({
        ...prev,
        correctedText: data.corrected_text || prev.correctedText,
        isVerifying: false,
        warning: data.warning || null
      }));

    } catch (error) {
      console.error("Error en verificación:", error);
      setDocumentState(prev => ({
        ...prev,
        isVerifying: false,
        error: error.message.includes('quota') ? 
          'Límite de correcciones alcanzado. Usando versión OCR.' : 
          'Error en verificación',
        apiAvailable: !error.message.includes('quota')
      }));
    }
  };

  const handleUpload = async (file) => {
    setDocumentState({
      originalText: '',
      correctedText: '',
      type: '',
      isLoading: true,
      isVerifying: false,
      error: null,
      warning: null,
      apiAvailable: true
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

      setDocumentState(prev => ({
        originalText: data.original_text || '',
        correctedText: data.corrected_text || data.original_text || '',
        type: data.type || 'document',
        isLoading: false,
        isVerifying: false,
        error: null,
        warning: data.warning || null,
        apiAvailable: !data.warning?.includes('quota')
      }));

      // Verificación automática solo si el backend no la hizo y la API está disponible
      if (data.original_text && !data.corrected_text && documentState.apiAvailable) {
        await verifyTextWithGemini(data.original_text);
      }

    } catch (error) {
      console.error("Error:", error);
      setDocumentState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        apiAvailable: !error.message.includes('quota')
      }));
    }
  };

  return (
    <div className="App" style={styles.app}>
      <h1 style={styles.title}>Editor Accesible de Documentos</h1>
      
      <FileUploader 
        onFileUpload={handleUpload} 
        disabled={documentState.isLoading}
        accept="image/*,.pdf,.docx"
      />
      
      {/* Estado de carga */}
      {documentState.isLoading && (
        <div style={styles.statusBox}>
          <p>Procesando documento...</p>
        </div>
      )}

      {/* Mensajes de error */}
      {documentState.error && (
        <div style={{
          ...styles.statusBox,
          backgroundColor: '#ffecec',
          borderLeft: '4px solid #ff6b6b'
        }}>
          <p style={{ color: '#d32f2f' }}>{documentState.error}</p>
          {documentState.error.includes('Límite') && (
            <p style={{ fontSize: '0.9em', marginTop: '8px' }}>
              Puedes editar manualmente el texto mostrado.
            </p>
          )}
        </div>
      )}

      {/* Advertencias (no críticas) */}
      {documentState.warning && (
        <div style={{
          ...styles.statusBox,
          backgroundColor: '#fff8e1',
          borderLeft: '4px solid #ffc107'
        }}>
          <p style={{ color: '#ff8f00' }}>{documentState.warning}</p>
        </div>
      )}

      {/* Contenido procesado */}
      {documentState.correctedText && (
        <div style={styles.contentContainer}>
          <div style={styles.headerContainer}>
            <h2 style={styles.sectionTitle}>
              {documentState.type === 'image' ? 'Texto Extraído' : 'Documento Procesado'}
            </h2>
            
            <div style={styles.controlsContainer}>
              <VoiceReader 
                text={documentState.correctedText} 
                disabled={documentState.isVerifying}
              />
              <button 
                onClick={() => verifyTextWithGemini(documentState.correctedText)}
                disabled={documentState.isVerifying || !documentState.apiAvailable}
                style={{
                  ...styles.button,
                  backgroundColor: documentState.isVerifying ? '#e0e0e0' : 
                    (documentState.apiAvailable ? '#e3f2fd' : '#f5f5f5'),
                  cursor: documentState.isVerifying || !documentState.apiAvailable ? 
                    'not-allowed' : 'pointer'
                }}
              >
                {documentState.isVerifying ? 'Verificando...' : 
                  (documentState.apiAvailable ? 'Revisar con IA' : 'API no disponible')}
              </button>
            </div>
          </div>

          {/* Comparación entre original y corregido */}
          {documentState.originalText !== documentState.correctedText && (
            <details style={styles.comparisonContainer}>
              <summary style={styles.comparisonSummary}>
                Mostrar comparación OCR vs Corregido
              </summary>
              <div style={styles.comparisonGrid}>
                <div>
                  <h3 style={styles.comparisonTitle}>Versión Original (OCR):</h3>
                  <TextEditor 
                    text={documentState.originalText} 
                    readOnly 
                    style={{ backgroundColor: '#f9f9f9' }}
                  />
                </div>
                <div>
                  <h3 style={styles.comparisonTitle}>Versión Corregida:</h3>
                  <TextEditor 
                    text={documentState.correctedText} 
                    readOnly
                    style={{ backgroundColor: '#f0f7ff' }}
                  />
                </div>
              </div>
            </details>
          )}

          {/* Editor principal */}
          <TextEditor 
            text={documentState.correctedText} 
            readOnly={documentState.isVerifying}
            style={styles.mainEditor}
          />

          {/* Estado de verificación */}
          {documentState.isVerifying && (
            <div style={styles.verificationStatus}>
              <p>Verificando texto con inteligencia artificial...</p>
            </div>
          )}
        </div>
      )}

      {/* Mejoras de accesibilidad */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        style={styles.screenReaderOnly}
      >
        {documentState.isLoading 
          ? "Procesando documento" 
          : documentState.correctedText 
            ? "Documento listo para editar" 
            : "Esperando subida de documento"}
      </div>
    </div>
  );
}

// Estilos separados para mejor mantenimiento
const styles = {
  app: {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6'
  },
  title: {
    color: '#2c3e50',
    marginBottom: '30px',
    textAlign: 'center',
    fontSize: '2em'
  },
  statusBox: {
    margin: '20px 0',
    padding: '15px',
    borderRadius: '4px',
    textAlign: 'center'
  },
  contentContainer: {
    marginTop: '30px',
    borderTop: '1px solid #eee',
    paddingTop: '20px'
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.5em',
    color: '#333'
  },
  controlsContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  button: {
    padding: '8px 16px',
    border: '1px solid #bbdefb',
    borderRadius: '4px',
    fontSize: '0.9em',
    transition: 'background-color 0.3s'
  },
  comparisonContainer: {
    marginBottom: '20px',
    border: '1px solid #eee',
    borderRadius: '4px',
    padding: '10px'
  },
  comparisonSummary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    outline: 'none'
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '15px',
    '@media (maxWidth: 768px)': {
      gridTemplateColumns: '1fr'
    }
  },
  comparisonTitle: {
    fontSize: '1em',
    color: '#666',
    marginBottom: '8px'
  },
  mainEditor: {
    minHeight: '300px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '15px',
    marginTop: '15px'
  },
  verificationStatus: {
    marginTop: '10px',
    color: '#666',
    fontStyle: 'italic',
    fontSize: '0.9em'
  },
  screenReaderOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0
  }
};

export default App;