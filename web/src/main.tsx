import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BasketProvider } from './state/basket';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasketProvider>
      <App />
    </BasketProvider>
  </StrictMode>,
);
