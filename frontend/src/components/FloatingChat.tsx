// src/components/FloatingChat.tsx
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { warehouseChatbotApi } from '../services/chatbotService';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isError?: boolean;
}

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào! Tôi là **Trợ lý Giám sát Kho hàng Warehouse_017**.\n\nBạn có thể hỏi tôi về:\n• Va chạm & gần va chạm\n• Vị trí người/xe nâng\n• Khung hình nguy hiểm\n• Báo cáo tổng quan\n\nHãy hỏi bằng **tiếng Việt** hoặc **tiếng Anh** nhé!',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await warehouseChatbotApi.query({
        question: inputValue,
        top_k: 5,
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer || 'Tôi không tìm thấy thông tin phù hợp.',
        sender: 'bot',
        timestamp: new Date(),
        isError: response.status === 'error',
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Không thể kết nối đến hệ thống.';
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: `Lỗi kết nối\n\`\`\`\n${errorText}\n\`\`\``,
          sender: 'bot',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[620px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-cyan-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Trợ lý Kho hàng</h3>
                <p className="text-xs opacity-90 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Đang hoạt động
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-linear-to-b from-gray-50 to-white">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-linear-to-br from-cyan-500 to-blue-600 text-white shadow-md'
                }`}>
                  {message.sender === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                </div>

                <div className={`max-w-[88%] rounded-2xl px-5 py-4 shadow-lg border ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none border-blue-700'
                    : message.isError
                    ? 'bg-red-50 border-red-300 text-red-800'
                    : 'bg-white border-gray-200 text-gray-800 rounded-tl-none'
                }`}>
                  {message.sender === 'bot' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          // Văn bản
                          strong: ({ children }) => <span className="font-bold text-blue-700">{children}</span>,
                          em: ({ children }) => <em className="italic text-cyan-600">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-3 ml-4 text-gray-700">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-3 ml-4 text-gray-700">{children}</ol>,

                          // Code block
                          code: ({ children }) => (
                            <code className="bg-gray-100 text-red-700 px-2 py-1 rounded text-xs font-mono">
                              {children}
                            </code>
                          ),
                          pre: ({ children }) => (
                            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs my-4 font-mono">
                              {children}
                            </pre>
                          ),

                          // Bảng đẹp + cuộn ngang + highlight CRITICAL
                          table: ({ children }) => (
                            <div className="my-4 -mx-5 overflow-x-auto">
                              <div className="inline-block min-w-full">
                                <table className="min-w-full divide-y divide-gray-300 border border-gray-300 rounded-lg shadow-sm">
                                  {children}
                                </table>
                              </div>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="bg-linear-to-r from-blue-600 to-cyan-600 text-white">
                              {children}
                            </thead>
                          ),
                          th: ({ children }) => (
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider sticky top-0 z-10 bg-linear-to-r from-blue-600 to-cyan-600">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="px-5 py-3.5 text-sm border-t border-gray-200 whitespace-nowrap">
                              {children}
                            </td>
                          ),
                          tr: ({ node, children }) => {
                            const text = node.children?.map(child => 
                              typeof child === 'object' ? child.value : ''
                            ).join('');
                            const hasCritical = text?.includes('CRITICAL') || text?.includes('Va chạm');
                            return (
                              <tr className={`transition-colors ${hasCritical ? 'bg-red-100 font-bold' : 'hover:bg-gray-50'}`}>
                                {children}
                              </tr>
                            );
                          },
                        }}
                      >
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  )}

                  <p className={`text-xs mt-3 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="bg-white border border-gray-200 px-5 py-4 rounded-2xl rounded-tl-none shadow-md">
                  <Loader2 className="w-6 h-6 text-cyan-600 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Hỏi về va chạm, xe nâng, khung hình nguy hiểm..."
                disabled={isTyping}
                className="flex-1 px-5 py-3.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all text-gray-800 placeholder-gray-500"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="bg-linear-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-full hover:shadow-2xl transform hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl"
              >
                {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50"
      >
        {isOpen ? (
          <X className="w-8 h-8" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-9 h-9" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full"></span>
          </div>
        )}
      </button>
    </>
  );
}