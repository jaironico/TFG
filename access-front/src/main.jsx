import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Asegúrate que la ruta es correcta
import Login from './Components/Auth/login'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)