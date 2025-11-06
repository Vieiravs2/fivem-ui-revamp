import React from 'react';
import ReactDOM from 'react-dom/client';
import { VisibilityProvider } from './providers/VisibilityProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import App from './components/App';
import './index.css';

// Componente de notificação sempre visível
const NotificationContainer: React.FC = () => {
  const [notification, setNotification] = React.useState<{ message: string; restaurant: string } | null>(null);

  React.useEffect(() => {
    const eventListener = (event: MessageEvent) => {
      console.log('NotificationContainer recebeu evento:', event.data);
      if (event.data && event.data.action === 'showOrderNotification') {
        console.log('Mostrando notificação:', event.data.data);
        setNotification(event.data.data);
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    };

    window.addEventListener('message', eventListener);
    return () => window.removeEventListener('message', eventListener);
  }, []);

  if (!notification) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #4dd0e1 0%, #00acc1 100%)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 8px 24px rgba(77, 208, 225, 0.4)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      minWidth: '350px',
      maxWidth: '450px',
      animation: 'slideInRight 0.3s ease-out',
      border: '2px solid rgba(255, 255, 255, 0.2)',
      visibility: 'visible !important' as any,
      pointerEvents: 'auto'
    }}>
      <div style={{ fontSize: '32px', animation: 'pulse 2s infinite' }}>🔔</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>Novo Pedido!</h3>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255, 255, 255, 0.95)', fontWeight: 500 }}>{notification.message}</p>
        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{notification.restaurant}</span>
      </div>
      <button 
        onClick={() => setNotification(null)}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          color: '#fff',
          fontSize: '20px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
          padding: 0
        }}
      >×</button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <NotificationContainer />
      <VisibilityProvider>
        <App />
      </VisibilityProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
