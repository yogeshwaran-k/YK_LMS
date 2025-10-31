import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Enable ACE editor by default
import './index.css';
import { AuthProvider } from './contexts/AuthContext';

(window as any).__ACE_ENABLED = true;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
