import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiApi } from '../api/aiApi';
import { useCart } from '../context/CartContext';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  ShoppingCart, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

const quickPrompts = [
  "Tư vấn vợt tấn công smash uy lực tầm 3 - 4 triệu",
  "Vợt phản tạt nhanh nhẹ đầu chuyên đánh lưới",
  "Vợt công thủ toàn diện dễ thuần cho người mới",
  "Vợt Yonex cao cấp nào bền và trợ lực tốt nhất?"
];

const AiChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Chuyên gia Tư vấn Thiết bị Cầu Lông AI của SmashZone. Bạn đang tìm kiếm cây vợt theo lối chơi nào (tấn công, phản tạt, công thủ toàn diện) hay phân khúc giá bao nhiêu? Hãy chia sẻ với tôi nhé!',
      products: []
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { addToCart } = useCart();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = textToSend || inputValue;
    if (!query.trim() || loading) return;

    // Add user message
    const newMessages = [...messages, { sender: 'user', text: query }];
    setMessages(newMessages);
    setInputValue('');
    setLoading(true);

    try {
      const res = await aiApi.chat(query);
      setMessages([
        ...newMessages,
        {
          sender: 'ai',
          text: res.reply || 'Dưới đây là một số gợi ý phù hợp nhất với bạn:',
          products: res.recommendedProducts || []
        }
      ]);
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          sender: 'ai',
          text: 'Rất tiếc, đã có sự cố kết nối tới máy chủ AI. Bạn hãy thử lại sau ít giây hoặc tham khảo danh mục vợt của shop nhé!',
          products: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white pl-4 pr-5 py-3.5 rounded-full shadow-xl shadow-emerald-700/25 hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin-slow" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
          </div>
          <div className="text-left">
            <div className="text-xs font-black tracking-wide flex items-center gap-1">
              AI TƯ VẤN VỢT <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded">Gemini</span>
            </div>
            <div className="text-[10px] text-emerald-100 font-medium">Bắt đúng lối chơi • Chuẩn kho hàng</div>
          </div>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[94vw] sm:w-[440px] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scale-up">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-amber-300">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold flex items-center gap-1.5">
                  Chuyên Gia Cầu Lông AI
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                </div>
                <div className="text-[11px] text-emerald-100 font-medium">
                  RAG Augmented • Live Inventory Connected
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/70 text-sm">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Embedded Interactive Product Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Đề xuất sản phẩm phù hợp:
                      </span>
                      {msg.products.map((p) => (
                        <div
                          key={p.id}
                          className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-3 hover:bg-white transition-all shadow-sm"
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {p.name}
                            </h4>
                            <div className="text-[11px] text-emerald-700 font-extrabold">
                              {formatPrice(p.price)}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {p.balancePoint} • {p.weightGrip}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Link
                              to={`/products/${p.id}`}
                              onClick={() => setIsOpen(false)}
                              className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700"
                              title="Xem chi tiết"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => addToCart(p, 1)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                              title="Thêm vào giỏ"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs italic pl-10">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Chuyên gia AI đang phân tích kho vợt phù hợp...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200 overflow-x-auto flex gap-2 no-scrollbar">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium rounded-full bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-600 transition-colors shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Hỏi về lối chơi, trợ lực, chọn vợt..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-full border border-slate-300 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="p-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiChatbotWidget;
