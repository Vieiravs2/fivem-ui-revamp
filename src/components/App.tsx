import React, { useState, useEffect } from "react";
import { useNuiEvent } from "../hooks/useNuiEvent";
import { fetchNui } from "../utils/fetchNui";
import { useTheme } from "../providers/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, Sun, Moon, X, Plus, Minus, ChefHat, 
  DollarSign, Calendar, Package, TrendingUp, Clock, 
  CheckCircle, AlertCircle, Building2, ArrowRight,
  ShoppingBag, Utensils, Coffee, Candy
} from "lucide-react";

// ============= INTERFACES - NÃO ALTERAR =============
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
  
  // ============= ESTADOS - NÃO ALTERAR =============
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

  // ============= NUI EVENTS - NÃO ALTERAR =============
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

  useNuiEvent<{ message: string; restaurant: string }>("showOrderNotification", (data) => {
    setNotification(data);
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  });

  useNuiEvent<{ openOrders?: Order[]; completedOrders?: Order[] }>("updateOrders", (data) => {
    if (data.openOrders) {
      setOpenOrders(data.openOrders);
      if (selectedOrder) {
        const updatedOrder = data.openOrders.find(o => o.id === selectedOrder.id);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
      }
    }
    if (data.completedOrders) {
      setCompletedOrders(data.completedOrders);
      if (selectedOrder) {
        const updatedOrder = data.completedOrders.find(o => o.id === selectedOrder.id);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
      }
    }
  });

  // ============= FUNÇÕES - NÃO ALTERAR =============
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

      await fetchNui("submitOrder", order);
      
      setCart([]);
      setOrderName("");
      setShowCheckoutModal(false);
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
    }
  };

  const handleOrderStatusChange = async (orderId: string, newStatus: "em_preparo" | "concluido") => {
    try {
      const response = await fetchNui<{ success?: boolean }>("updateOrderStatus", { orderId, status: newStatus });
      
      if (response && response.success) {
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        
        setOpenOrders(prev => {
          const updated = prev.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus }
              : order
          );
          
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
        return "text-yellow-500";
      case "em_preparo":
        return "text-blue-500";
      case "concluido":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const getFilteredItems = () => {
    if (!activeFilter) return items;
    return items.filter(item => item.type.toLowerCase() === activeFilter.toLowerCase());
  };

  const getItemImageUrl = (itemIndex: string) => {
    return `nui://vrp/config/inventory/${itemIndex}.png`;
  };

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

  const getPaginatedOrders = (orders: Order[]) => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    return orders.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(completedOrders.length / ordersPerPage);

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

  // ============= RENDER COM TAILWIND CSS =============
  return (
    <div className="flex items-center justify-center w-screen h-screen bg-transparent">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[1300px] h-[800px] bg-bg-secondary rounded-[32px] shadow-2xl overflow-hidden border border-border"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-8 py-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
                Cardápio Digital
              </h1>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="w-12 h-12 rounded-xl bg-bg-tertiary hover:bg-primary/20 flex items-center justify-center transition-all duration-300 border border-border-hover"
                title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
              >
                {theme === "dark" ? <Sun className="w-5 h-5 text-primary" /> : <Moon className="w-5 h-5 text-primary" />}
              </motion.button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-8 py-4 bg-bg-tertiary/50 border-b border-border">
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab("cardapio")}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
                  activeTab === "cardapio"
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-transparent text-text-secondary hover:bg-bg-tertiary"
                }`}
              >
                Cardápio
              </motion.button>
              {isEmployeeWorking && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab("pedidos_abertos")}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
                      activeTab === "pedidos_abertos"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-transparent text-text-secondary hover:bg-bg-tertiary"
                    }`}
                  >
                    Pedidos Abertos ({openOrders.length})
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab("pedidos_concluidos")}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      activeTab === "pedidos_concluidos"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-transparent text-text-secondary hover:bg-bg-tertiary"
                    }`}
                  >
                    Pedidos Concluídos ({completedOrders.length})
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setActiveTab("gerenciamento");
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
                      
                      fetchNui<{ balance: number }>("getBankBalance", {}).then((response) => {
                        if (response) {
                          const balance = Number(response.balance) || 0;
                          setBankBalance(balance);
                        }
                      });
                    }}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                      activeTab === "gerenciamento"
                        ? "bg-primary text-white shadow-lg shadow-primary/30"
                        : "bg-transparent text-text-secondary hover:bg-bg-tertiary"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Gerenciamento
                  </motion.button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {/* TAB: CARDÁPIO */}
              {activeTab === "cardapio" && (
                <motion.div
                  key="cardapio"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex h-full gap-6 p-6"
                >
                  {/* Items Section */}
                  <div className="flex-1 flex flex-col gap-4">
                    {/* Category Filters */}
                    <div className="flex gap-2">
                      {painelType === "restaurant" ? (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveFilter("")}
                            className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                              activeFilter === ""
                                ? "bg-gradient-to-r from-primary to-primary-light text-white shadow-lg"
                                : "bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80"
                            }`}
                          >
                            <ShoppingBag className="w-4 h-4 inline mr-2" />
                            Tudo
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveFilter("food")}
                            className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                              activeFilter === "food"
                                ? "bg-gradient-to-r from-primary to-primary-light text-white shadow-lg"
                                : "bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80"
                            }`}
                          >
                            <Utensils className="w-4 h-4 inline mr-2" />
                            Comidas
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveFilter("drink")}
                            className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                              activeFilter === "drink"
                                ? "bg-gradient-to-r from-primary to-primary-light text-white shadow-lg"
                                : "bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80"
                            }`}
                          >
                            <Coffee className="w-4 h-4 inline mr-2" />
                            Bebidas
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveFilter("candy")}
                            className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                              activeFilter === "candy"
                                ? "bg-gradient-to-r from-primary to-primary-light text-white shadow-lg"
                                : "bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary/80"
                            }`}
                          >
                            <Candy className="w-4 h-4 inline mr-2" />
                            Doces
                          </motion.button>
                        </>
                      ) : painelType === "utils" ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveFilter("utils")}
                          className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-primary to-primary-light text-white shadow-lg"
                        >
                          <Package className="w-4 h-4 inline mr-2" />
                          Utilidades
                        </motion.button>
                      ) : null}
                    </div>

                    {/* Items Grid */}
                    <div className="flex-1 overflow-y-auto scrollbar-modern pr-2">
                      <div className="grid grid-cols-2 gap-4">
                        {getFilteredItems().map((item) => (
                          <motion.div
                            key={item.index}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => openItemModal(item)}
                            className="bg-bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/50 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl group"
                          >
                            <div className="relative h-40 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                              <img
                                src={getItemImageUrl(item.index)}
                                alt={item.label}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  if (!target.nextElementSibling) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'w-full h-full flex items-center justify-center text-6xl';
                                    fallback.textContent = '🍔';
                                    target.parentElement?.appendChild(fallback);
                                  }
                                }}
                              />
                            </div>
                            <div className="p-4">
                              <h3 className="font-bold text-lg text-text-primary mb-1 truncate">{item.label}</h3>
                              <p className="text-2xl font-bold text-primary">R$ {item.price.toFixed(2)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cart Section */}
                  <div className="w-80 flex flex-col gap-4 bg-gradient-to-br from-bg-card to-bg-tertiary rounded-2xl border border-border p-6 shadow-xl">
                    <div className="flex items-center gap-3 pb-4 border-b border-border">
                      <ShoppingCart className="w-6 h-6 text-primary" />
                      <h2 className="text-2xl font-bold text-text-primary">Carrinho</h2>
                      <span className="ml-auto bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
                        {cart.length}
                      </span>
                    </div>

                    {cart.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                        <ShoppingCart className="w-16 h-16 text-text-tertiary mb-4" />
                        <p className="text-text-secondary">Seu carrinho está vazio</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto scrollbar-modern space-y-3">
                          {cart.map((item) => (
                            <motion.div
                              key={item.index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="bg-bg-secondary rounded-xl p-3 border border-border"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-text-primary">{item.label}</h4>
                                  <p className="text-sm text-primary font-bold">R$ {item.price.toFixed(2)}</p>
                                </div>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => removeFromCart(item.index)}
                                  className="text-red-500 hover:text-red-600 transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </motion.button>
                              </div>
                              <div className="flex items-center gap-2">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => updateCartQuantity(item.index, item.quantity - 1)}
                                  className="w-8 h-8 rounded-lg bg-bg-tertiary hover:bg-primary/20 flex items-center justify-center transition-colors"
                                >
                                  <Minus className="w-4 h-4 text-primary" />
                                </motion.button>
                                <span className="flex-1 text-center font-bold text-text-primary">{item.quantity}</span>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => updateCartQuantity(item.index, item.quantity + 1)}
                                  className="w-8 h-8 rounded-lg bg-bg-tertiary hover:bg-primary/20 flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-primary" />
                                </motion.button>
                                <span className="ml-2 font-bold text-text-primary">
                                  R$ {(item.price * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        <div className="space-y-3 pt-4 border-t border-border">
                          <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-4 text-white">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-semibold">Total:</span>
                              <span className="text-3xl font-bold">R$ {getTotalPrice().toFixed(2)}</span>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowCheckoutModal(true)}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300"
                          >
                            FINALIZAR PEDIDO
                          </motion.button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB: PEDIDOS ABERTOS */}
              {activeTab === "pedidos_abertos" && (
                <motion.div
                  key="pedidos_abertos"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-8 h-8 text-primary" />
                    <h2 className="text-3xl font-bold text-text-primary">Pedidos Abertos</h2>
                  </div>

                  {openOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[calc(100%-80px)] text-center">
                      <Clock className="w-24 h-24 text-text-tertiary mb-4" />
                      <p className="text-xl text-text-secondary">Nenhum pedido aberto no momento</p>
                    </div>
                  ) : (
                    <div className="space-y-4 overflow-y-auto h-[calc(100%-80px)] scrollbar-modern pr-2">
                      {openOrders.map((order) => (
                        <motion.div
                          key={order.id}
                          whileHover={{ scale: 1.01, y: -2 }}
                          onClick={() => openOrderModal(order)}
                          className="bg-bg-card rounded-2xl border border-border hover:border-primary/50 p-6 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-text-primary mb-1">{order.name}</h3>
                              <p className="text-sm text-text-tertiary">{formatDate(order.timestamp)}</p>
                            </div>
                            <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(order.status)} bg-current/10`}>
                              {getStatusLabel(order.status)}
                            </span>
                          </div>

                          <div className="space-y-2 mb-4">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                                <span className="text-text-primary">{item.label} <span className="text-text-tertiary">x{item.quantity}</span></span>
                                <span className="font-bold text-primary">R$ {(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold text-text-primary">Total: R$ {order.total.toFixed(2)}</span>
                            {order.status === "pendente" && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOrderStatusChange(order.id, "em_preparo");
                                }}
                                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors"
                              >
                                Em Preparo
                              </motion.button>
                            )}
                            {order.status === "em_preparo" && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOrderStatusChange(order.id, "concluido");
                                }}
                                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
                              >
                                Concluir
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB: PEDIDOS CONCLUÍDOS */}
              {activeTab === "pedidos_concluidos" && (
                <motion.div
                  key="pedidos_concluidos"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <h2 className="text-3xl font-bold text-text-primary">Pedidos Concluídos</h2>
                  </div>

                  {completedOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[calc(100%-80px)] text-center">
                      <CheckCircle className="w-24 h-24 text-text-tertiary mb-4" />
                      <p className="text-xl text-text-secondary">Nenhum pedido concluído</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 overflow-y-auto h-[calc(100%-140px)] scrollbar-modern pr-2 mb-4">
                        {getPaginatedOrders(completedOrders).map((order) => (
                          <motion.div
                            key={order.id}
                            whileHover={{ scale: 1.01, y: -2 }}
                            onClick={() => openOrderModal(order)}
                            className="bg-bg-card rounded-2xl border border-border hover:border-green-500/50 p-6 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-xl"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-bold text-text-primary mb-1">{order.name}</h3>
                                <p className="text-sm text-text-tertiary">{formatDate(order.timestamp)}</p>
                              </div>
                              <span className="px-4 py-2 rounded-full text-sm font-bold text-green-500 bg-green-500/10">
                                ✓ Concluído
                              </span>
                            </div>

                            <div className="space-y-2 mb-4">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                                  <span className="text-text-primary">{item.label} <span className="text-text-tertiary">x{item.quantity}</span></span>
                                  <span className="font-bold text-primary">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>

                            <div className="text-2xl font-bold text-text-primary">Total: R$ {order.total.toFixed(2)}</div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between bg-bg-card rounded-xl p-4 border border-border">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 bg-bg-tertiary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-text-primary font-medium rounded-lg transition-colors"
                        >
                          ← Anterior
                        </motion.button>
                        <span className="text-text-secondary font-medium">
                          Página {currentPage} de {totalPages} ({completedOrders.length} pedidos)
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 bg-bg-tertiary hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed text-text-primary font-medium rounded-lg transition-colors"
                        >
                          Próxima →
                        </motion.button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* TAB: GERENCIAMENTO */}
              {activeTab === "gerenciamento" && (
                <motion.div
                  key="gerenciamento"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full overflow-y-auto scrollbar-modern p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <h2 className="text-3xl font-bold text-text-primary">Dashboard de Gerenciamento</h2>
                  </div>

                  {/* Bank Balance Card */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    onClick={openWithdrawModal}
                    className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 mb-6 cursor-pointer transition-all duration-300 shadow-xl hover:shadow-2xl border border-green-400/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Building2 className="w-12 h-12 text-white" />
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">Caixa do Servidor</h3>
                          <p className="text-4xl font-bold text-white">R$ {(Number(bankBalance) || 0).toFixed(2)}</p>
                          <p className="text-green-100 text-sm mt-1">Clique para sacar</p>
                        </div>
                      </div>
                      <ArrowRight className="w-8 h-8 text-white" />
                    </div>
                  </motion.div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border border-primary/20 shadow-lg"
                    >
                      <DollarSign className="w-10 h-10 text-primary mb-3" />
                      <h3 className="text-sm font-semibold text-text-secondary mb-1">Receita Total</h3>
                      <p className="text-3xl font-bold text-text-primary">R$ {dashboardStats?.totalRevenue.toFixed(2) || "0.00"}</p>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-6 border border-blue-500/20 shadow-lg"
                    >
                      <Calendar className="w-10 h-10 text-blue-500 mb-3" />
                      <h3 className="text-sm font-semibold text-text-secondary mb-1">Receita Hoje</h3>
                      <p className="text-3xl font-bold text-text-primary">R$ {dashboardStats?.todayRevenue.toFixed(2) || "0.00"}</p>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-2xl p-6 border border-purple-500/20 shadow-lg"
                    >
                      <Calendar className="w-10 h-10 text-purple-500 mb-3" />
                      <h3 className="text-sm font-semibold text-text-secondary mb-1">Receita do Mês</h3>
                      <p className="text-3xl font-bold text-text-primary">R$ {dashboardStats?.monthRevenue.toFixed(2) || "0.00"}</p>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-2xl p-6 border border-orange-500/20 shadow-lg"
                    >
                      <Package className="w-10 h-10 text-orange-500 mb-3" />
                      <h3 className="text-sm font-semibold text-text-secondary mb-1">Total de Pedidos</h3>
                      <p className="text-3xl font-bold text-text-primary">{dashboardStats?.totalOrders || 0}</p>
                    </motion.div>
                  </div>

                  {/* Order Statistics */}
                  <div className="bg-bg-card rounded-2xl border border-border p-6 mb-6 shadow-lg">
                    <h3 className="text-xl font-bold text-text-primary mb-6">Estatísticas de Pedidos</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="w-6 h-6 text-yellow-500" />
                          <span className="font-semibold text-text-secondary text-sm">Pendentes</span>
                        </div>
                        <p className="text-4xl font-bold text-yellow-500">{dashboardStats?.pendingOrders || 0}</p>
                      </div>

                      <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <ChefHat className="w-6 h-6 text-blue-500" />
                          <span className="font-semibold text-text-secondary text-sm">Em Preparo</span>
                        </div>
                        <p className="text-4xl font-bold text-blue-500">{dashboardStats?.inProgressOrders || 0}</p>
                      </div>

                      <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                        <div className="flex items-center gap-3 mb-2">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                          <span className="font-semibold text-text-secondary text-sm">Concluídos</span>
                        </div>
                        <p className="text-4xl font-bold text-green-500">{dashboardStats?.completedOrders || 0}</p>
                      </div>

                      <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="w-6 h-6 text-primary" />
                          <span className="font-semibold text-text-secondary text-sm">Pedidos Hoje</span>
                        </div>
                        <p className="text-4xl font-bold text-primary">{todayOrders.length || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Visual Summary */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-bg-card rounded-2xl border border-border p-6 shadow-lg">
                      <h4 className="text-lg font-bold text-text-primary mb-4">Pedidos por Status</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-text-secondary">Pendentes</span>
                            <span className="font-bold text-yellow-500">{dashboardStats?.pendingOrders || 0}</span>
                          </div>
                          <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ 
                                width: dashboardStats?.totalOrders 
                                  ? `${((dashboardStats.pendingOrders / dashboardStats.totalOrders) * 100)}%` 
                                  : '0%' 
                              }}
                              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-text-secondary">Em Preparo</span>
                            <span className="font-bold text-blue-500">{dashboardStats?.inProgressOrders || 0}</span>
                          </div>
                          <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ 
                                width: dashboardStats?.totalOrders 
                                  ? `${((dashboardStats.inProgressOrders / dashboardStats.totalOrders) * 100)}%` 
                                  : '0%' 
                              }}
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-text-secondary">Concluídos</span>
                            <span className="font-bold text-green-500">{dashboardStats?.completedOrders || 0}</span>
                          </div>
                          <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ 
                                width: dashboardStats?.totalOrders 
                                  ? `${((dashboardStats.completedOrders / dashboardStats.totalOrders) * 100)}%` 
                                  : '0%' 
                              }}
                              className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-bg-card rounded-2xl border border-border p-6 shadow-lg">
                      <h4 className="text-lg font-bold text-text-primary mb-4">Receita por Período</h4>
                      <div className="flex items-end justify-around h-48 gap-4">
                        <div className="flex flex-col items-center flex-1">
                          <div className="flex-1 w-full flex flex-col justify-end mb-2">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ 
                                height: dashboardStats?.totalRevenue 
                                  ? `${Math.min((dashboardStats.todayRevenue / dashboardStats.totalRevenue) * 100, 100)}%` 
                                  : '0%' 
                              }}
                              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg"
                            />
                          </div>
                          <span className="text-xs text-text-secondary mb-1">Hoje</span>
                          <span className="text-sm font-bold text-primary">R$ {dashboardStats?.todayRevenue.toFixed(2) || "0.00"}</span>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                          <div className="flex-1 w-full flex flex-col justify-end mb-2">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ 
                                height: dashboardStats?.totalRevenue 
                                  ? `${Math.min((dashboardStats.monthRevenue / dashboardStats.totalRevenue) * 100, 100)}%` 
                                  : '0%' 
                              }}
                              className="w-full bg-gradient-to-t from-purple-500 to-purple-400 rounded-t-lg"
                            />
                          </div>
                          <span className="text-xs text-text-secondary mb-1">Mês</span>
                          <span className="text-sm font-bold text-primary">R$ {dashboardStats?.monthRevenue.toFixed(2) || "0.00"}</span>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                          <div className="flex-1 w-full flex flex-col justify-end mb-2">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: '100%' }}
                              className="w-full bg-gradient-to-t from-primary to-primary-light rounded-t-lg"
                            />
                          </div>
                          <span className="text-xs text-text-secondary mb-1">Total</span>
                          <span className="text-sm font-bold text-primary">R$ {dashboardStats?.totalRevenue.toFixed(2) || "0.00"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* MODAIS */}
      <AnimatePresence>
        {/* Modal: Adicionar Item */}
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeItemModal}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary rounded-3xl border border-border max-w-md w-full mx-4 overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                    <ShoppingCart className="w-7 h-7 text-primary" />
                    Adicionar ao carrinho
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeItemModal}
                    className="w-10 h-10 rounded-xl bg-bg-tertiary hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-6 h-6 text-red-500" />
                  </motion.button>
                </div>
              </div>

              <div className="p-6">
                <div className="relative h-56 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl overflow-hidden mb-6">
                  <img
                    src={getItemImageUrl(selectedItem.index)}
                    alt={selectedItem.label}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (!target.nextElementSibling) {
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-full flex items-center justify-center text-8xl';
                        fallback.textContent = '🍔';
                        target.parentElement?.appendChild(fallback);
                      }
                    }}
                  />
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">{selectedItem.label}</h3>
                  <p className="text-text-tertiary capitalize">{selectedItem.type}</p>
                </div>

                <div className="bg-bg-tertiary rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg text-text-secondary">Preço unitário</span>
                    <span className="text-2xl font-bold text-primary">R$ {selectedItem.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-lg text-text-secondary">Quantidade</span>
                    <div className="flex items-center gap-3">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-12 h-12 rounded-xl bg-bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors border border-border"
                      >
                        <Minus className="w-5 h-5 text-primary" />
                      </motion.button>
                      <span className="text-3xl font-bold text-text-primary w-16 text-center">{quantity}</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-12 h-12 rounded-xl bg-bg-secondary hover:bg-primary/20 flex items-center justify-center transition-colors border border-border"
                      >
                        <Plus className="w-5 h-5 text-primary" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-4 mb-6 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-4xl font-bold">R$ {(selectedItem.price * quantity).toFixed(2)}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addToCart}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-lg rounded-2xl shadow-lg transition-all duration-300"
                >
                  ADICIONAR AO CARRINHO
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal: Detalhes do Pedido */}
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOrderModal}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary rounded-3xl border border-border max-w-2xl w-full mx-4 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                    <Package className="w-7 h-7 text-primary" />
                    Detalhes do Pedido
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeOrderModal}
                    className="w-10 h-10 rounded-xl bg-bg-tertiary hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-6 h-6 text-red-500" />
                  </motion.button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="bg-bg-tertiary rounded-2xl p-6 mb-6">
                  <h3 className="text-2xl font-bold text-text-primary mb-2">{selectedOrder.name}</h3>
                  <p className="text-text-tertiary mb-4">{formatDate(selectedOrder.timestamp)}</p>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(selectedOrder.status)} bg-current/10`}>
                    Status: {getStatusLabel(selectedOrder.status)}
                  </span>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-text-primary mb-4">Itens do Pedido:</h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="bg-bg-tertiary rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-text-primary text-lg">{item.label}</p>
                          <p className="text-sm text-text-tertiary">Quantidade: {item.quantity}</p>
                          <p className="text-sm text-text-secondary">R$ {item.price.toFixed(2)} cada</p>
                        </div>
                        <span className="text-2xl font-bold text-primary">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 text-white mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-semibold">Total do Pedido:</span>
                    <span className="text-4xl font-bold">R$ {selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>

                {isEmployeeWorking && selectedOrder.status !== "concluido" && (
                  <div className="flex gap-4">
                    {selectedOrder.status === "pendente" && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          handleOrderStatusChange(selectedOrder.id, "em_preparo");
                          closeOrderModal();
                        }}
                        className="flex-1 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold text-lg rounded-2xl shadow-lg transition-colors"
                      >
                        Colocar em Preparo
                      </motion.button>
                    )}
                    {selectedOrder.status === "em_preparo" && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          handleCompleteOrder(selectedOrder.id);
                        }}
                        className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-2xl shadow-lg transition-colors"
                      >
                        Concluir Pedido
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal: Checkout */}
        {showCheckoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCheckoutModal(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary rounded-3xl border border-border max-w-2xl w-full mx-4 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                    <ShoppingCart className="w-7 h-7 text-green-500" />
                    Finalizar Pedido
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowCheckoutModal(false)}
                    className="w-10 h-10 rounded-xl bg-bg-tertiary hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-6 h-6 text-red-500" />
                  </motion.button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Resumo do Pedido</h3>
                  <div className="space-y-2 mb-4">
                    {cart.map((item) => (
                      <div key={item.index} className="flex items-center justify-between py-3 border-b border-border">
                        <div>
                          <p className="font-semibold text-text-primary">{item.label}</p>
                          <p className="text-sm text-text-tertiary">x{item.quantity}</p>
                        </div>
                        <span className="font-bold text-primary">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-4 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-4xl font-bold">R$ {getTotalPrice().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-text-primary mb-4">Informações do Pedido</h3>
                  <div>
                    <label htmlFor="checkout-order-name" className="block text-sm font-semibold text-text-secondary mb-2">
                      Nome do Pedido
                    </label>
                    <input
                      id="checkout-order-name"
                      type="text"
                      value={orderName}
                      onChange={(e) => setOrderName(e.target.value)}
                      placeholder="Digite seu nome"
                      autoFocus
                      className="w-full px-4 py-4 bg-bg-tertiary border-2 border-border focus:border-primary rounded-xl text-text-primary placeholder-text-tertiary transition-colors outline-none text-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 py-4 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary font-bold text-lg rounded-2xl transition-colors"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-2xl transition-all duration-300"
                >
                  Confirmar Pedido
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal: Saque */}
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeWithdrawModal}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-secondary rounded-3xl border border-border max-w-md w-full mx-4 overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-r from-green-500/10 to-green-500/5 p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                    <DollarSign className="w-7 h-7 text-green-500" />
                    Sacar Dinheiro
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={closeWithdrawModal}
                    className="w-10 h-10 rounded-xl bg-bg-tertiary hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <X className="w-6 h-6 text-red-500" />
                  </motion.button>
                </div>
              </div>

              <div className="p-6">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white mb-6">
                  <p className="text-sm font-semibold mb-1 opacity-90">Saldo Disponível</p>
                  <p className="text-4xl font-bold">R$ {(Number(bankBalance) || 0).toFixed(2)}</p>
                </div>

                <div className="mb-6">
                  <label htmlFor="withdraw-amount" className="block text-sm font-semibold text-text-secondary mb-2">
                    Valor do Saque
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-primary">R$</span>
                    <input
                      id="withdraw-amount"
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      max={bankBalance}
                      autoFocus
                      className="w-full pl-14 pr-4 py-4 bg-bg-tertiary border-2 border-border focus:border-primary rounded-xl text-text-primary placeholder-text-tertiary transition-colors outline-none text-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm font-semibold text-text-secondary mb-3">Atalhos</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "25%", value: 0.25 },
                      { label: "50%", value: 0.5 },
                      { label: "75%", value: 0.75 },
                      { label: "Tudo", value: 1 }
                    ].map((option) => (
                      <motion.button
                        key={option.label}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setWithdrawAmount((bankBalance * option.value).toFixed(2))}
                        className="py-3 bg-bg-tertiary hover:bg-primary/20 text-text-primary font-bold rounded-xl transition-colors"
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-border flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={closeWithdrawModal}
                  className="flex-1 py-4 bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-primary font-bold text-lg rounded-2xl transition-colors"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleWithdraw(parseFloat(withdrawAmount))}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > bankBalance}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg rounded-2xl transition-all duration-300"
                >
                  Sacar R$ {withdrawAmount ? parseFloat(withdrawAmount).toFixed(2) : "0.00"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Notificação */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-6 right-6 z-50 bg-gradient-to-r from-primary to-primary-light rounded-2xl border border-primary-light p-6 shadow-2xl max-w-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1">Novo Pedido!</h3>
                <p className="text-white/90 mb-1">{notification.message}</p>
                <span className="text-sm text-white/80">{notification.restaurant}</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setNotification(null)}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
