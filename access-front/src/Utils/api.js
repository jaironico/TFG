export async function extractText(file) {
    const formData = new FormData();
    formData.append('file', file);
  
    const response = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData
    });
  
    if (!response.ok) throw new Error("Error en el servidor");
    return await response.json();
  }