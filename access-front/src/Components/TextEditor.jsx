import React from 'react';

// Usa "export default" si lo importas sin llaves en App.jsx
export default function TextEditor({ text }) {
  return (
    <div
      contentEditable
      aria-label="Editor de texto"
      role="textbox"
      style={{
        border: '1px solid #ddd',
        padding: '15px',
        minHeight: '200px',
        margin: '20px 0',
        backgroundColor: '#fff',
        color: '#333'
      }}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}