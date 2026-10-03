import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { VideoPlayerProvider } from './components/VideoReviews';
import { BasketProvider } from './state/basket';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasketProvider>
      <VideoPlayerProvider>
        <App />
      </VideoPlayerProvider>
    </BasketProvider>
  </StrictMode>,
);
