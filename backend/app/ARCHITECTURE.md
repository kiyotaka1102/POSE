# Application Architecture

## Cấu trúc thư mục và trách nhiệm

### 📁 `app/config/` - Configuration Layer
**Trách nhiệm:** Quản lý cấu hình ứng dụng
- `settings.py`: Pydantic Settings cho environment variables
- Load từ `.env` file hoặc environment variables
- Cung cấp cấu hình cho database, CORS, paths, etc.

### 📁 `app/db/` - Database Layer
**Trách nhiệm:** Quản lý kết nối database
- `connection.py`: MongoDB connection với Motor (async)
- Initialize và close database connections
- Sẵn sàng cho việc config MongoDB sau

### 📁 `app/middleware/` - Middleware Layer
**Trách nhiệm:** Xử lý request/response trước và sau khi đến controller
- `cors.py`: CORS configuration
- `logging.py`: Request/response logging
- `error_handler.py`: Global exception handlers

### 📁 `app/services/` - **Service Layer (Business Logic)**
**Trách nhiệm:** Chứa tất cả business logic và xử lý dữ liệu
- `tracking_service.py`: Load và quản lý tracking data
- `calibration_service.py`: Load và quản lý camera calibration
- `projection_service.py`: 3D to 2D projection operations
- `projection_fast.py`: Fast vectorized projection

**Đặc điểm:**
- Stateless (không giữ state giữa các requests)
- Có thể reuse được
- Chứa business rules và validations
- Xử lý complex calculations

### 📁 `app/routes/` - **Controller Layer (Request/Response Handling)**
**Trách nhiệm:** Nhận requests, điều hướng, gọi services, trả về responses
- `root.py`: Root endpoint controller
- `info.py`: Info endpoints controller
- `websocket_routes.py`: WebSocket endpoints controller

**Đặc điểm:**
- Thin controllers (mỏng, chỉ điều hướng)
- Nhận HTTP/WebSocket requests
- Validate input
- Gọi services
- Trả về responses

### 📁 `app/websockets/` - WebSocket Layer
**Trách nhiệm:** Xử lý WebSocket connections và real-time communication
- `handlers.py`: **WebSocket Controllers** - Nhận connections, route messages
- `tracking_manager.py`: **WebSocket Service** - Quản lý tracking data broadcasting
- `stream_manager.py`: **WebSocket Service** - Quản lý video streaming
- `multi_tracking_manager.py`: **WebSocket Service** - Quản lý multi-camera tracking

**Phân biệt:**
- **Handlers** = Controllers (nhận request, điều hướng)
- **Managers** = Services (business logic cho WebSocket)

### 📁 `app/dependencies/` - Dependency Injection
**Trách nhiệm:** Quản lý dependency injection cho FastAPI
- `services.py`: Factory functions cho services và WebSocket managers
- Singleton pattern cho services
- Hỗ trợ cả Depends và direct calls

## Luồng xử lý request

```
Client Request
    ↓
Middleware (CORS, Logging, Error Handling)
    ↓
Controller (routes/) - Nhận request, validate
    ↓
Service (services/) - Xử lý business logic
    ↓
Database (db/) - Nếu cần
    ↓
Service trả về kết quả
    ↓
Controller format response
    ↓
Middleware
    ↓
Client Response
```

## WebSocket Flow

```
Client WebSocket Connection
    ↓
WebSocket Handler (websockets/handlers.py) - Controller
    ↓
WebSocket Manager (websockets/*_manager.py) - Service
    ↓
Business Services (services/) - Nếu cần
    ↓
Manager broadcast/send message
    ↓
Handler trả về cho client
```

## Best Practices

1. **Controllers (routes/)** nên mỏng:
   - Chỉ nhận request, validate, gọi service, trả response
   - Không chứa business logic

2. **Services (services/)** chứa business logic:
   - Stateless
   - Reusable
   - Testable

3. **WebSocket Handlers** là controllers:
   - Nhận connection
   - Route messages
   - Gọi managers/services

4. **WebSocket Managers** là services:
   - Quản lý connections
   - Broadcast messages
   - Xử lý business logic cho WebSocket

5. **Dependency Injection:**
   - Sử dụng FastAPI Depends
   - Singleton pattern cho services
   - Dễ test và maintain

