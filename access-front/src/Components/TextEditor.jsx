import React from 'react';

export default function TextEditor({ text, textSettings }) {
  const style = {
    border: '1px solid #ddd',
    padding: '15px',
    minHeight: '200px',
    margin: '20px 0',
    backgroundColor: textSettings.backgroundColor,
    color: textSettings.textColor,
    fontSize: textSettings.fontSize,
    fontFamily: textSettings.fontFamily,
  };

  return (
    <div
      contentEditable
      aria-label="Editor de texto"
      role="textbox"
      tabIndex={0}
      style={style}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}
