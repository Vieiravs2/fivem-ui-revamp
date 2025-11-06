import React, { useState, useEffect } from "react";
import "./App.css";
import { useNuiEvent } from "../hooks/useNuiEvent";
import { fetchNui } from "../utils/fetchNui";
import { useTheme } from "../providers/ThemeProvider";

interface Item {
  index: string;
  label: string;
  type: string;
  price: number;
}

interface CartItem extends Item {
  quantity: number;
}

interface Order {
  id: string;
  name: string;
  items: CartItem[];
  total: number;
  status: "pendente" | "em_preparo" | "concluido";
  timestamp: string;
  playerId?: number;
  playerName?: string;
}

type TabType = "cardapio" | "pedidos_abertos" | "pedidos_concluidos" | "gerenciamento";

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("cardapio");
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderName, setOrderName] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [isEmployeeWorking, setIsEmployeeWorking] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [painelType, setPainelType] = useState<string>("restaurant");
  const [dashboardStats, setDashboardStats] = useState<{
    totalRevenue: number;
    todayRevenue: number;
    monthRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    inProgressOrders: number;
    averageOrderValue: number;
  } | null>(null);
  const [bankBalance, setBankBalance] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ordersPerPage = 5;
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; restaurant: string } | null>(null);

  // Recebe os itens do painel quando o player pressiona E
  useNuiEvent<{ items: string; isEmployee: boolean; openOrders?: Order[]; completedOrders?: Order[]; painelType?: string }>("openPainel", (data) => {
    try {
      const parsedItems: Item[] = JSON.parse(data.items);
      setItems(parsedItems);
      setCart([]);
      setOrderName("");
      const newPainelType = data.painelType || "restaurant";
      setPainelType(newPainelType);
      setActiveFilter(newPainelType === "utils" ? "utils" : "");
      setIsEmployeeWorking(data.isEmployee || false);
      
      if (data.openOrders) {
        setOpenOrders(data.openOrders);
      }
      
      if (data.completedOrders) {
        setCompletedOrders(data.completedOrders);
        setCurrentPage(1);
      } else {
        setCompletedOrders([]);
      }
    } catch (error) {
      console.error("Erro ao parsear itens:", error);
    }
  });

  // Recebe notificações de novos pedidos
  useNuiEvent<{ message: string; restaurant: string }>("showOrderNotification", (data) => {
    setNotification(data);
    // Remove a notificação após 5 segundos
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  });

  // Atualiza pedidos quando recebe eventos do client
  useNuiEvent<{ openOrders?: Order[]; completedOrders?: Order[] }>("updateOrders", (data) => {
    if (data.openOrders) {
      setOpenOrders(data.openOrders);
      
      // Atualiza o pedido no modal se estiver aberto
      if (selectedOrder) {
        const updatedOrder = data.openOrders.find(o => o.id === selectedOrder.id);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
      }
    }
    if (data.completedOrders) {
      setCompletedOrders(data.completedOrders);
      
      // Atualiza o pedido no modal se estiver aberto
      if (selectedOrder) {
        const updatedOrder = data.completedOrders.find(o => o.id === selectedOrder.id);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
      }
    }
  });

  const openItemModal = (item: Item) => {
    setSelectedItem(item);
    setQuantity(1);
  };

  const closeItemModal = () => {
    setSelectedItem(null);
    setQuantity(1);
  };

  const addToCart = () => {
    if (!selectedItem) return;
    
    const existingItem = cart.find((cartItem) => cartItem.index === selectedItem.index);
    
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.index === selectedItem.index
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        )
      );
    } else {
      setCart([...cart, { ...selectedItem, quantity }]);
    }
    
    closeItemModal();
  };

  const removeFromCart = (index: string) => {
    setCart(cart.filter((cartItem) => cartItem.index !== index));
  };

  const updateCartQuantity = (index: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }
    
    setCart(
      cart.map((cartItem) =>
        cartItem.index === index
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      )
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleSubmitOrder = async () => {
    // Validações sem alert para não travar a interface
    if (cart.length === 0) {
      console.error("Carrinho vazio - não é possível finalizar pedido");
      setShowCheckoutModal(false);
      return;
    }

    if (!orderName.trim()) {
      console.error("Nome do pedido não informado");
      return;
    }

    try {
      const order = {
        name: orderName,
        items: cart,
        total: getTotalPrice(),
        status: "pendente" as const,
        timestamp: new Date().toISOString(),
      };

      // Envia o pedido para o client
      await fetchNui("submitOrder", order);
      
      // Limpa o carrinho
      setCart([]);
      setOrderName("");
      setShowCheckoutModal(false);
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
      // Não fecha o modal em caso de erro para o usuário tentar novamente
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: "em_preparo" | "concluido") => {
    try {
      const response = await fetchNui<{ success?: boolean }>("updateOrderStatus", { orderId, status: newStatus });
      
      if (response && response.success) {
        
        // Atualiza o selectedOrder se estiver aberto
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        
        // Atualiza os estados locais
        setOpenOrders(prev => {
          const updated = prev.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus }
              : order
          );
          
          // Se foi concluído, remove de abertos
          if (newStatus === "concluido") {
            const completedOrder = updated.find(o => o.id === orderId);
            if (completedOrder) {
              setCompletedOrders(prevCompleted => [...prevCompleted, completedOrder]);
            }
            return updated.filter(order => order.id !== orderId);
          }
          
          return updated;
        });
      } else {
        console.error("Falha ao atualizar status:", response);
      }
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
    }
  };

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order);
  };

  const closeOrderModal = () => {
    setSelectedOrder(null);
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const response = await fetchNui<{ success?: boolean }>("updateOrderStatus", { orderId, status: "concluido" });
      
      if (response && response.success) {
        // Atualiza os estados locais
        const order = selectedOrder || openOrders.find(o => o.id === orderId);
        if (order) {
          setCompletedOrders(prev => [...prev, { ...order, status: "concluido" }]);
          setOpenOrders(prev => prev.filter(o => o.id !== orderId));
        }
        closeOrderModal();
      }
    } catch (error) {
      console.error("Erro ao concluir pedido:", error);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("pt-BR");
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pendente":
        return "Pendente";
      case "em_preparo":
        return "Em Preparo";
      case "concluido":
        return "Concluído";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "#ff9800";
      case "em_preparo":
        return "#2196f3";
      case "concluido":
        return "#4caf50";
      default:
        return "#757575";
    }
  };

  // Filtra itens por tipo
  const getFilteredItems = () => {
    if (!activeFilter) return items;
    return items.filter(item => item.type.toLowerCase() === activeFilter.toLowerCase());
  };

  // Gera URL da imagem do item
  const getItemImageUrl = (itemIndex: string) => {
    return `nui://vrp/config/inventory/${itemIndex}.png`;
  };


  // Calcula pedidos do dia
  useEffect(() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    const todayOrdersList = completedOrders.filter(order => {
      const orderDateObj = new Date(order.timestamp);
      const orderYear = orderDateObj.getFullYear();
      const orderMonth = orderDateObj.getMonth();
      const orderDay = orderDateObj.getDate();
      
      return orderYear === todayYear && 
             orderMonth === todayMonth && 
             orderDay === todayDay && 
             order.status === "concluido";
    });
    setTodayOrders(todayOrdersList);
  }, [completedOrders]);



  // Calcula paginação
  const getPaginatedOrders = (orders: Order[]) => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    return orders.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(completedOrders.length / ordersPerPage);

  // Funções do modal de saque
  const openWithdrawModal = () => {
    setShowWithdrawModal(true);
    setWithdrawAmount("");
  };

  const closeWithdrawModal = () => {
    setShowWithdrawModal(false);
    setWithdrawAmount("");
  };

  const handleWithdraw = async (amount: number) => {
    try {
      if (!amount || amount <= 0 || amount > bankBalance) {
        return;
      }
      
      const response = await fetchNui<{ success: boolean; error?: string }>("withdrawBank", { amount });
      
      if (response && response.success) {
        // Atualiza o saldo buscando do servidor
        fetchNui<{ balance: number }>("getBankBalance", {}).then((balanceResponse) => {
          if (balanceResponse) {
            setBankBalance(Number(balanceResponse.balance) || 0);
          }
        }).catch(() => {});
        
        closeWithdrawModal();
      } else {
        console.error("Erro ao realizar saque:", response?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro ao processar saque:", error);
    }
  };

  return (
    <div className="nui-wrapper">
      <div className="popup-thing">
        <div className="menu-container">
          <div className="header-section">
            <h1 className="menu-title">Cardápio Digital</h1>
            <button className="theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}>
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          </div>

          <div className="tabs-container">
            <button
              className={`tab-button ${activeTab === "cardapio" ? "active" : ""}`}
              onClick={() => setActiveTab("cardapio")}
            >
              Cardápio
            </button>
            {isEmployeeWorking && (
              <>
                <button
                  className={`tab-button ${activeTab === "pedidos_abertos" ? "active" : ""}`}
                  onClick={() => setActiveTab("pedidos_abertos")}
                >
                  Pedidos Abertos ({openOrders.length})
                </button>
                <button
                  className={`tab-button ${activeTab === "pedidos_concluidos" ? "active" : ""}`}
                  onClick={() => setActiveTab("pedidos_concluidos")}
                >
                  Pedidos Concluídos ({completedOrders.length})
                </button>
                <button
                  className={`tab-button ${activeTab === "gerenciamento" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("gerenciamento");
                    // Busca estatísticas quando abrir a aba
                    fetchNui<{
                      totalRevenue: number;
                      todayRevenue: number;
                      monthRevenue: number;
                      totalOrders: number;
                      pendingOrders: number;
                      completedOrders: number;
                      inProgressOrders: number;
                      averageOrderValue: number;
                    }>("getDashboardStats", {}).then((stats) => {
                      if (stats) {
                        setDashboardStats(stats);
                      }
                    });
                    
                    // Busca saldo do caixa
                    fetchNui<{ balance: number }>("getBankBalance", {}).then((response) => {
                      if (response) {
                        const balance = Number(response.balance) || 0;
                        setBankBalance(balance);
                      }
                    });
                  }}
                >
                  📊 Gerenciamento
                </button>
              </>
            )}
          </div>

          {activeTab === "cardapio" && (
            <div className="menu-content">
              <div className="items-section">
                <div className="category-filters">
                  {painelType === "restaurant" ? (
                    <>
                      <button 
                        className={`filter-btn ${activeFilter === "" ? "active" : ""}`}
                        onClick={() => setActiveFilter("")}
                      >
                        Tudo
                      </button>
                      <button 
                        className={`filter-btn ${activeFilter === "food" ? "active" : ""}`}
                        onClick={() => setActiveFilter("food")}
                      >
                        Comidas
                      </button>
                      <button 
                        className={`filter-btn ${activeFilter === "drink" ? "active" : ""}`}
                        onClick={() => setActiveFilter("drink")}
                      >
                        Bebidas
                      </button>
                      <button 
                        className={`filter-btn ${activeFilter === "candy" ? "active" : ""}`}
                        onClick={() => setActiveFilter("candy")}
                      >
                        Doces
                      </button>
                    </>
                  ) : painelType === "utils" ? (
                    <button 
                      className={`filter-btn ${activeFilter === "utils" ? "active" : ""}`}
                      onClick={() => setActiveFilter("utils")}
                    >
                      Utilidades
                    </button>
                  ) : null}
                </div>

                <div className="items-grid">
                  {getFilteredItems().map((item) => (
                    <div key={item.index} className="item-card" onClick={() => openItemModal(item)}>
                      <div className="item-image">
                        <img 
                          src={getItemImageUrl(item.index)} 
                          alt={item.label}
                          className="item-image-img"
                          onError={(e) => {
                            // Fallback para emoji se a imagem não carregar
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            if (!target.nextElementSibling) {
                              const fallback = document.createElement('span');
                              fallback.className = 'item-icon';
                              fallback.textContent = '🍔';
                              target.parentElement?.appendChild(fallback);
                            }
                          }}
                        />
                      </div>
                      <div className="item-info">
                        <h3>{item.label}</h3>
                        <p className="item-price">R$ {item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cart-section">
                <div className="cart-header">
                  <h2>🛒 Carrinho</h2>
                </div>
                
                {cart.length === 0 ? (
                  <p className="empty-cart">Carrinho vazio</p>
                ) : (
                  <>
                    <div className="cart-items">
                      {cart.map((item) => (
                        <div key={item.index} className="cart-item">
                          <div className="cart-item-info">
                            <span className="cart-item-name">{item.label}</span>
                            <div className="cart-item-controls">
                              <button
                                className="quantity-btn"
                                onClick={() => updateCartQuantity(item.index, item.quantity - 1)}
                              >
                                -
                              </button>
                              <span className="cart-item-quantity">{item.quantity}</span>
                              <button
                                className="quantity-btn"
                                onClick={() => updateCartQuantity(item.index, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                            <span className="cart-item-price">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          <button
                            className="remove-button"
                            onClick={() => removeFromCart(item.index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="cart-total">
                      <strong>Total: R$ {getTotalPrice().toFixed(2)}</strong>
                    </div>
                  </>
                )}

                <button
                  className="submit-button checkout-button"
                  onClick={() => {
                    if (cart.length === 0) {
                      console.error("Carrinho vazio - não é possível abrir modal de checkout");
                      return;
                    }
                    setShowCheckoutModal(true);
                  }}
                  disabled={cart.length === 0}
                >
                  🛒 Finalizar Pedido
                </button>
              </div>
            </div>
          )}

          {activeTab === "pedidos_abertos" && (
            <div className="orders-section">
              <h2>Pedidos Abertos</h2>
              {openOrders.length === 0 ? (
                <p className="empty-orders">Nenhum pedido aberto</p>
              ) : (
                <div className="orders-list">
                  {openOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="order-card clickable"
                      onClick={() => openOrderModal(order)}
                    >
                      <div className="order-header">
                        <div className="order-info">
                          <h3>{order.name}</h3>
                          <span className="order-date">{formatDate(order.timestamp)}</span>
                        </div>
                        <span
                          className="order-status"
                          style={{ color: getStatusColor(order.status) }}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="order-items">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-item-line">
                            <span>{item.label} x{item.quantity}</span>
                            <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="order-footer">
                        <strong>Total: R$ {order.total.toFixed(2)}</strong>
                        {order.status === "pendente" && (
                          <div className="order-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="status-button"
                              onClick={() => handleOrderStatusChange(order.id, "em_preparo")}
                            >
                              Em Preparo
                            </button>
                          </div>
                        )}
                        {order.status === "em_preparo" && (
                          <div className="order-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="status-button complete"
                              onClick={() => handleOrderStatusChange(order.id, "concluido")}
                            >
                              Concluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "pedidos_concluidos" && (
            <div className="orders-section">
              <div className="orders-header">
                <h2>Pedidos Concluídos</h2>
              </div>
              
              {completedOrders.length === 0 ? (
                <p className="empty-orders">Nenhum pedido concluído</p>
              ) : (
                <>
                  <div className="orders-list">
                    {getPaginatedOrders(completedOrders).map((order) => (
                    <div 
                      key={order.id} 
                      className="order-card completed clickable"
                      onClick={() => openOrderModal(order)}
                    >
                      <div className="order-header">
                        <div className="order-info">
                          <h3>{order.name}</h3>
                          <span className="order-date">{formatDate(order.timestamp)}</span>
                        </div>
                        <span
                          className="order-status"
                          style={{ color: getStatusColor(order.status) }}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div className="order-items">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="order-item-line">
                            <span>{item.label} x{item.quantity}</span>
                            <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="order-footer">
                        <strong>Total: R$ {order.total.toFixed(2)}</strong>
                      </div>
                    </div>
                    ))}
                  </div>
                  
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      Página {currentPage} de {totalPages} ({completedOrders.length} pedidos)
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "gerenciamento" && (
            <div className="management-section">
              <div className="dashboard-header">
                <h2>📊 Dashboard de Gerenciamento</h2>
              </div>

              {/* Caixa do Servidor */}
              <div className="bank-section">
                <div className="bank-card" onClick={openWithdrawModal}>
                  <div className="bank-icon">🏦</div>
                  <div className="bank-content">
                    <h3>Caixa do Servidor</h3>
                    <p className="bank-balance">R$ {(Number(bankBalance) || 0).toFixed(2)}</p>
                    <span className="bank-action-hint">Clique para sacar</span>
                  </div>
                  <div className="bank-arrow">→</div>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="stat-card revenue-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <h3>Receita Total</h3>
                    <p className="stat-value">R$ {dashboardStats?.totalRevenue.toFixed(2) || "0.00"}</p>
                  </div>
                </div>

                <div className="stat-card today-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-content">
                    <h3>Receita Hoje</h3>
                    <p className="stat-value">R$ {dashboardStats?.todayRevenue.toFixed(2) || "0.00"}</p>
                  </div>
                </div>

                <div className="stat-card month-card">
                  <div className="stat-icon">📆</div>
                  <div className="stat-content">
                    <h3>Receita do Mês</h3>
                    <p className="stat-value">R$ {dashboardStats?.monthRevenue.toFixed(2) || "0.00"}</p>
                  </div>
                </div>

                <div className="stat-card orders-card">
                  <div className="stat-icon">📦</div>
                  <div className="stat-content">
                    <h3>Total de Pedidos</h3>
                    <p className="stat-value">{dashboardStats?.totalOrders || 0}</p>
                  </div>
                </div>
              </div>

              {/* Estatísticas de Pedidos */}
              <div className="orders-stats-section">
                <h3>Estatísticas de Pedidos</h3>
                <div className="orders-stats-grid">
                  <div className="stat-box">
                    <div className="stat-box-header pending">
                      <span className="stat-box-icon">⏳</span>
                      <span className="stat-box-label">Pendentes</span>
                    </div>
                    <div className="stat-box-value">{dashboardStats?.pendingOrders || 0}</div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-box-header in-progress">
                      <span className="stat-box-icon">👨‍🍳</span>
                      <span className="stat-box-label">Em Preparo</span>
                    </div>
                    <div className="stat-box-value">{dashboardStats?.inProgressOrders || 0}</div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-box-header completed">
                      <span className="stat-box-icon">✅</span>
                      <span className="stat-box-label">Concluídos</span>
                    </div>
                    <div className="stat-box-value">{dashboardStats?.completedOrders || 0}</div>
                  </div>

                  <div className="stat-box">
                    <div className="stat-box-header today-orders">
                      <span className="stat-box-icon">📋</span>
                      <span className="stat-box-label">Pedidos Hoje</span>
                    </div>
                    <div className="stat-box-value">{todayOrders.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Resumo Visual */}
              <div className="visual-summary">
                <h3>Resumo Visual</h3>
                <div className="summary-cards">
                  <div className="summary-card">
                    <h4>Pedidos por Status</h4>
                    <div className="status-bars">
                      <div className="status-bar">
                        <div className="status-bar-label">
                          <span>Pendentes</span>
                          <span>{dashboardStats?.pendingOrders || 0}</span>
                        </div>
                        <div className="status-bar-bg">
                          <div 
                            className="status-bar-fill pending-bar" 
                            style={{ 
                              width: dashboardStats?.totalOrders 
                                ? `${((dashboardStats.pendingOrders / dashboardStats.totalOrders) * 100)}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="status-bar">
                        <div className="status-bar-label">
                          <span>Em Preparo</span>
                          <span>{dashboardStats?.inProgressOrders || 0}</span>
                        </div>
                        <div className="status-bar-bg">
                          <div 
                            className="status-bar-fill in-progress-bar" 
                            style={{ 
                              width: dashboardStats?.totalOrders 
                                ? `${((dashboardStats.inProgressOrders / dashboardStats.totalOrders) * 100)}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="status-bar">
                        <div className="status-bar-label">
                          <span>Concluídos</span>
                          <span>{dashboardStats?.completedOrders || 0}</span>
                        </div>
                        <div className="status-bar-bg">
                          <div 
                            className="status-bar-fill completed-bar" 
                            style={{ 
                              width: dashboardStats?.totalOrders 
                                ? `${((dashboardStats.completedOrders / dashboardStats.totalOrders) * 100)}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="summary-card">
                    <h4>Receita por Período</h4>
                    <div className="revenue-chart">
                      <div className="revenue-item">
                        <span className="revenue-label">Hoje</span>
                        <div className="revenue-bar-container">
                          <div 
                            className="revenue-bar today-bar" 
                            style={{ 
                              height: dashboardStats?.totalRevenue 
                                ? `${Math.min((dashboardStats.todayRevenue / dashboardStats.totalRevenue) * 100, 100)}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                        <span className="revenue-value">R$ {dashboardStats?.todayRevenue.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="revenue-item">
                        <span className="revenue-label">Mês</span>
                        <div className="revenue-bar-container">
                          <div 
                            className="revenue-bar month-bar" 
                            style={{ 
                              height: dashboardStats?.totalRevenue 
                                ? `${Math.min((dashboardStats.monthRevenue / dashboardStats.totalRevenue) * 100, 100)}%` 
                                : '0%' 
                            }}
                          ></div>
                        </div>
                        <span className="revenue-value">R$ {dashboardStats?.monthRevenue.toFixed(2) || "0.00"}</span>
                      </div>
                      <div className="revenue-item">
                        <span className="revenue-label">Total</span>
                        <div className="revenue-bar-container">
                          <div 
                            className="revenue-bar total-bar" 
                            style={{ height: '100%' }}
                          ></div>
                        </div>
                        <span className="revenue-value">R$ {dashboardStats?.totalRevenue.toFixed(2) || "0.00"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de adicionar item */}
          {selectedItem && (
            <div className="modal-overlay" onClick={closeItemModal}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>🛒 Adicionar ao carrinho</h2>
                  <button className="modal-close" onClick={closeItemModal}>×</button>
                </div>
                <div className="modal-body">
                  <div className="modal-item-image">
                    <img 
                      src={getItemImageUrl(selectedItem.index)} 
                      alt={selectedItem.label}
                      className="modal-item-image-img"
                      onError={(e) => {
                        // Fallback para emoji se a imagem não carregar
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        if (!target.nextElementSibling) {
                          const fallback = document.createElement('span');
                          fallback.className = 'item-icon-large';
                          fallback.textContent = '🍔';
                          target.parentElement?.appendChild(fallback);
                        }
                      }}
                    />
                  </div>
                  <div className="modal-item-info">
                    <h3>{selectedItem.label}</h3>
                    <p>{selectedItem.type}</p>
                    <div className="modal-quantity-controls">
                      <span className="modal-price">R$ {selectedItem.price.toFixed(2)}x{quantity}</span>
                      <div className="quantity-controls">
                        <button
                          className="quantity-btn-large minus"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                          -
                        </button>
                        <span className="quantity-display">{quantity}</span>
                        <button
                          className="quantity-btn-large plus"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="add-cart-button" onClick={addToCart}>
                    ADICIONAR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de detalhes do pedido */}
          {selectedOrder && (
            <div className="modal-overlay" onClick={closeOrderModal}>
              <div className="modal-content order-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>📋 Detalhes do Pedido</h2>
                  <button className="modal-close" onClick={closeOrderModal}>×</button>
                </div>
                <div className="modal-body">
                  <div className="order-detail-section">
                    <div className="order-detail-info">
                      <h3>{selectedOrder.name}</h3>
                      <p className="order-detail-date">{formatDate(selectedOrder.timestamp)}</p>
                      <span
                        className="order-detail-status"
                        style={{ color: getStatusColor(selectedOrder.status) }}
                      >
                        Status: {getStatusLabel(selectedOrder.status)}
                      </span>
                    </div>
                    
                    <div className="order-detail-items">
                      <h4>Itens do Pedido:</h4>
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="order-detail-item">
                          <div className="order-detail-item-info">
                            <span className="order-detail-item-name">{item.label}</span>
                            <span className="order-detail-item-quantity">Quantidade: {item.quantity}</span>
                            <span className="order-detail-item-price">R$ {item.price.toFixed(2)} cada</span>
                          </div>
                          <span className="order-detail-item-total">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="order-detail-total">
                      <strong>Total: R$ {selectedOrder.total.toFixed(2)}</strong>
                    </div>

                    {isEmployeeWorking && selectedOrder.status !== "concluido" && (
                      <div className="order-detail-actions">
                        {selectedOrder.status === "pendente" && (
                          <button
                            className="status-button"
                            onClick={() => {
                              handleOrderStatusChange(selectedOrder.id, "em_preparo");
                              closeOrderModal();
                            }}
                          >
                            Colocar em Preparo
                          </button>
                        )}
                        {selectedOrder.status === "em_preparo" && (
                          <button
                            className="status-button complete"
                            onClick={() => {
                              handleCompleteOrder(selectedOrder.id);
                            }}
                          >
                            Concluir Pedido
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Finalização de Pedido */}
          {showCheckoutModal && (
            <div className="modal-overlay" onClick={() => setShowCheckoutModal(false)}>
              <div className="modal-content checkout-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>🛒 Finalizar Pedido</h2>
                  <button className="modal-close" onClick={() => setShowCheckoutModal(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="checkout-content">
                    {/* Resumo do Carrinho */}
                    <div className="checkout-summary">
                      <h3>Resumo do Pedido</h3>
                      <div className="checkout-items">
                        {cart.map((item) => (
                          <div key={item.index} className="checkout-item">
                            <div className="checkout-item-info">
                              <span className="checkout-item-name">{item.label}</span>
                              <span className="checkout-item-quantity">x{item.quantity}</span>
                            </div>
                            <span className="checkout-item-price">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="checkout-total-section">
                        <div className="checkout-subtotal">
                          <span>Subtotal</span>
                          <span>R$ {getTotalPrice().toFixed(2)}</span>
                        </div>
                        <div className="checkout-total">
                          <span>Total</span>
                          <span>R$ {getTotalPrice().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Informações do Cliente */}
                    <div className="checkout-customer-info">
                      <h3>Informações do Pedido</h3>
                      <div className="customer-input-group">
                        <label htmlFor="checkout-order-name">Nome do Pedido</label>
                        <input
                          id="checkout-order-name"
                          type="text"
                          className="checkout-input"
                          value={orderName}
                          onChange={(e) => setOrderName(e.target.value)}
                          placeholder="Digite seu nome"
                          autoFocus
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    className="cancel-button" 
                    onClick={() => setShowCheckoutModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="confirm-order-button"
                    onClick={async () => {
                      if (cart.length === 0) {
                        console.error("Carrinho vazio - fechando modal");
                        setShowCheckoutModal(false);
                        return;
                      }
                      if (!orderName.trim()) {
                        console.error("Nome do pedido não informado");
                        return;
                      }
                      await handleSubmitOrder();
                    }}
                    disabled={!orderName.trim() || cart.length === 0}
                  >
                    Confirmar Pedido
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Saque */}
          {showWithdrawModal && (
            <div className="modal-overlay" onClick={closeWithdrawModal}>
              <div className="modal-content withdraw-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>💵 Sacar Dinheiro</h2>
                  <button className="modal-close" onClick={closeWithdrawModal}>×</button>
                </div>
                <div className="modal-body">
                  <div className="withdraw-modal-content">
                    <div className="withdraw-balance-display">
                      <span className="withdraw-balance-label">Saldo Disponível</span>
                      <span className="withdraw-balance-value">R$ {(Number(bankBalance) || 0).toFixed(2)}</span>
                    </div>
                    
                    <div className="withdraw-input-group">
                      <label htmlFor="withdraw-amount">Valor do Saque</label>
                      <div className="withdraw-input-wrapper">
                        <span className="currency-symbol">R$</span>
                        <input
                          id="withdraw-amount"
                          type="number"
                          className="withdraw-modal-input"
                          placeholder="0.00"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          min="0"
                          step="0.01"
                          max={bankBalance}
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="withdraw-quick-options">
                      <button
                        className="quick-amount-btn"
                        onClick={() => setWithdrawAmount((bankBalance * 0.25).toFixed(2))}
                      >
                        25%
                      </button>
                      <button
                        className="quick-amount-btn"
                        onClick={() => setWithdrawAmount((bankBalance * 0.5).toFixed(2))}
                      >
                        50%
                      </button>
                      <button
                        className="quick-amount-btn"
                        onClick={() => setWithdrawAmount((bankBalance * 0.75).toFixed(2))}
                      >
                        75%
                      </button>
                      <button
                        className="quick-amount-btn"
                        onClick={() => setWithdrawAmount(bankBalance.toFixed(2))}
                      >
                        Tudo
                      </button>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="cancel-button" onClick={closeWithdrawModal}>
                    Cancelar
                  </button>
                  <button
                    className="confirm-withdraw-button"
                    onClick={() => handleWithdraw(parseFloat(withdrawAmount))}
                    disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > bankBalance}
                  >
                    Sacar R$ {withdrawAmount ? parseFloat(withdrawAmount).toFixed(2) : "0.00"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notificação de Novo Pedido */}
          {notification && (
            <div className="order-notification">
              <div className="notification-icon">🔔</div>
              <div className="notification-content">
                <h3>Novo Pedido!</h3>
                <p>{notification.message}</p>
                <span className="notification-restaurant">{notification.restaurant}</span>
              </div>
              <button className="notification-close" onClick={() => setNotification(null)}>×</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
