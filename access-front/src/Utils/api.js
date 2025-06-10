//src/Utils/api.js
export async function extractText(file) {
    const formData = new FormData();
    formData.append('file', file);

    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
  
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
  
    if (!response.ok) throw new Error("Error en el servidor");
    return await response.json();
  }