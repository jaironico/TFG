// src/components/Auth/Register.jsx
import React, { useState } from 'react';
import './Auth.css';

export default function Register({ onRegister, switchToLogin, errorMessage }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    await onRegister(username, password);
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Registrar Usuario</h2>
        {errorMessage && (
          <div className="error-message">
            {errorMessage.split('\n').map((msg, i) => (
              <p key={i}>{msg}</p>
            ))}
          </div>
        )}
        <form onSubmit={submit}>
          <label>
            Usuario:
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
            />
          </label>
          <label>
            Contraseña:
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <button type="submit">Crear cuenta</button>
        </form>
        <button onClick={switchToLogin} className="link-button">
          ¿Ya tienes cuenta? Iniciar Sesión
        </button>
      </div>
    </div>
  );
}
