import React, { useState } from 'react';

export default function VoiceReader({ text, readerSettings }) {
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
      utterance.rate = parseFloat(readerSettings.rate);
      utterance.pitch = parseFloat(readerSettings.pitch);

      if (readerSettings.voice !== 'default') {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find(v =>
          v.name.toLowerCase().includes(readerSettings.voice)
        );
        if (match) utterance.voice = match;
      }

      utterance.onend = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
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