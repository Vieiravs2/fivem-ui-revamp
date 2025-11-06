import React from 'react';
import ReactDOM from 'react-dom/client';
import { VisibilityProvider } from './providers/VisibilityProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import App from './components/App';
import './index.css';
import { debugData } from './utils/debugData';

// TODO: MOCK - Dados mockados para desenvolvimento (remover após integração com backend real)
debugData([
  {
    action: "setVisible",
    data: true,
  },
  {
    action: "openPainel",
    data: {
      items: JSON.stringify([
        { index: "hamburger", label: "Hambúrguer Artesanal", type: "food", price: 25.00 },
        { index: "pizza", label: "Pizza Margherita", type: "food", price: 35.00 },
        { index: "hot-dog", label: "Hot Dog Completo", type: "food", price: 18.00 },
        { index: "batata-frita", label: "Batata Frita Grande", type: "food", price: 12.00 },
        { index: "nuggets", label: "Nuggets de Frango", type: "food", price: 15.00 },
        { index: "sanduiche", label: "Sanduíche Natural", type: "food", price: 14.00 },
        { index: "coca-cola", label: "Coca-Cola 350ml", type: "drink", price: 8.00 },
        { index: "refrigerante", label: "Refrigerante Lata", type: "drink", price: 6.00 },
        { index: "suco", label: "Suco Natural", type: "drink", price: 10.00 },
        { index: "milkshake", label: "Milkshake de Chocolate", type: "drink", price: 15.00 },
        { index: "agua", label: "Água Mineral", type: "drink", price: 4.00 },
        { index: "sorvete", label: "Sorvete de Morango", type: "candy", price: 10.00 },
        { index: "pudim", label: "Pudim de Leite", type: "candy", price: 12.00 },
        { index: "brownie", label: "Brownie com Sorvete", type: "candy", price: 16.00 },
      ]),
      isEmployee: true,
      openOrders: [
        {
          id: "ORDER_001",
          name: "João Silva",
          items: [
            { index: "hamburger", label: "Hambúrguer Artesanal", type: "food", price: 25.00, quantity: 2 },
            { index: "coca-cola", label: "Coca-Cola 350ml", type: "drink", price: 8.00, quantity: 2 }
          ],
          total: 66.00,
          status: "pendente",
          timestamp: new Date().toISOString(),
        },
        {
          id: "ORDER_002",
          name: "Maria Santos",
          items: [
            { index: "pizza", label: "Pizza Margherita", type: "food", price: 35.00, quantity: 1 },
            { index: "refrigerante", label: "Refrigerante Lata", type: "drink", price: 6.00, quantity: 3 }
          ],
          total: 53.00,
          status: "em_preparo",
          timestamp: new Date(Date.now() - 600000).toISOString(), // 10 min atrás
        },
        {
          id: "ORDER_003",
          name: "Pedro Costa",
          items: [
            { index: "hot-dog", label: "Hot Dog Completo", type: "food", price: 18.00, quantity: 3 }
          ],
          total: 54.00,
          status: "pendente",
          timestamp: new Date(Date.now() - 120000).toISOString(), // 2 min atrás
        }
      ],
      completedOrders: [
        {
          id: "ORDER_004",
          name: "Ana Oliveira",
          items: [
            { index: "hamburger", label: "Hambúrguer Artesanal", type: "food", price: 25.00, quantity: 1 },
            { index: "batata-frita", label: "Batata Frita Grande", type: "food", price: 12.00, quantity: 1 },
            { index: "milkshake", label: "Milkshake de Chocolate", type: "drink", price: 15.00, quantity: 1 }
          ],
          total: 52.00,
          status: "concluido",
          timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
        },
        {
          id: "ORDER_005",
          name: "Carlos Mendes",
          items: [
            { index: "pizza", label: "Pizza Margherita", type: "food", price: 35.00, quantity: 2 },
            { index: "coca-cola", label: "Coca-Cola 350ml", type: "drink", price: 8.00, quantity: 4 }
          ],
          total: 102.00,
          status: "concluido",
          timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 horas atrás
        }
      ],
      painelType: "restaurant",
    },
  },
]);

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
