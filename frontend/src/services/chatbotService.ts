const API_BASE_URL = 'https://citatory-kristen-noninferably.ngrok-free.dev';

export interface QueryRequest {
  question: string;
  top_k?: number;
}

export interface QueryResponse {
  status: string;
  answer: string;
  source_type?: string | null;
  original_language?: string | null;
}

export interface ApiError {
  message: string;
  status?: number;
}

class WarehouseChatbotApi {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        let errorMessage = 'Đã xảy ra lỗi khi kết nối đến hệ thống';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          errorMessage = `Lỗi ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Lỗi mạng hoặc server không phản hồi');
    }
  }

  // Gửi câu hỏi đến chatbot
  async query(request: QueryRequest): Promise<QueryResponse> {
    return this.request<QueryResponse>('/query', {
      method: 'POST',
      body: JSON.stringify({
        question: request.question,
        top_k: request.top_k ?? 5,
      }),
    });
  }

  // Kiểm tra sức khỏe API (tùy chọn)
  async healthCheck() {
    return this.request<{ status: string; message?: string }>('/health');
  }
}

// Export instance để dùng toàn cục
export const warehouseChatbotApi = new WarehouseChatbotApi();

// Hoặc export class để tạo nhiều instance nếu cần
export default WarehouseChatbotApi;