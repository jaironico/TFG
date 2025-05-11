import React, { useState } from 'react';

export default function VoiceReader({ text }) {
  const [isReading, setIsReading] = useState(false);

  const toggleReading = () => {
    if (!window.speechSynthesis) {
      alert("Tu navegador no soporta la API de voz.");
      return;
    }

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1;
      utterance.onend = () => setIsReading(false);
      speechSynthesis.speak(utterance);
      setIsReading(true);

    }
  };
  
  return (
    <div>
      <button onClick={toggleReading}>
        {isReading ? 'Detener lectura' : 'Leer en voz alta'}
      </button>
    </div>
  );
}