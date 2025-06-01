// src/components/Auth/Login.jsx
import React, { useState } from 'react';
import './Auth.css';

export default function Login({ onLogin, switchToRegister, errorMessage }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Iniciar Sesión</h2>
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
          <button type="submit">Entrar</button>
        </form>
        <button onClick={switchToRegister} className="link-button">
          ¿No tienes cuenta? Regístrate
        </button>
      </div>
    </div>
  );
}
