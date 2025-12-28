import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Cria o estilo básico via JavaScript para evitar erros de arquivo CSS faltando
const style = document.createElement('style');
style.textContent = `
  body { margin: 0; font-family: sans-serif; background-color: #05080f; color: white; }
  * { box-sizing: border-box; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
