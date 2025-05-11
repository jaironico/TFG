import { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useButton } from '@react-aria/button';

export function FileUploader({ onFileUpload }) {  // Asegúrate de recibir la prop
  const { getRootProps, getInputProps } = useDropzone({
    accept: { /* tus tipos de archivo */ },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0 && onFileUpload) {  // Validación extra
        onFileUpload(acceptedFiles[0]);  // Llama a la función padre
      }
    }
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>Arrastra archivos aquí o haz clic</p>
    </div>
  );
}

