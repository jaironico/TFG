// src/Components/FileUploader.jsx
import React from 'react';
import { useDropzone } from 'react-dropzone';

export function FileUploader({ onFileUpload }) {
  const { getRootProps, getInputProps } = useDropzone({
    accept: {},
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0 && onFileUpload) {
        onFileUpload(acceptedFiles[0]);
      }
    }
  });

  return (
    <div
      {...getRootProps()}
      style={{
        border: '2px dashed #888',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        width: '100%',
        maxWidth: '400px'
      }}
    >
      <input {...getInputProps()} />
      <p>Arrastra o haz clic para seleccionar imagen</p>
      <button style={{ marginTop: '10px', padding: '8px 16px' }}>
        Seleccionar imagen
      </button>
    </div>
  );
}