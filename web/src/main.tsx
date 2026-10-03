import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Dashboard } from './dashboard/Dashboard';
import { VideoPlayerProvider } from './components/VideoReviews';
import { BasketProvider } from './state/basket';
import './styles.css';

// Two "sites" in one bundle: the shopper app and the brand dashboard.
const isDashboard = window.location.pathname.replace(/\/+$/, '') === '/dashboard';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BasketProvider>
      <VideoPlayerProvider>{isDashboard ? <Dashboard /> : <App />}</VideoPlayerProvider>
    </BasketProvider>
  </StrictMode>,
);
