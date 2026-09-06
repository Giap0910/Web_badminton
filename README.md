# SmashZone Badminton - Hệ Thống Fullstack Tích Hợp AI

> **Dự án Shop Badminton Fullstack Tích Hợp AI** được thiết kế và xây dựng theo chuẩn kiến trúc cấp cao (Enterprise Senior Architecture) và bảo mật nghiêm ngặt theo tiêu chuẩn OWASP Top 10.

---

## 1. Công Nghệ & Môi Trường Thực Thi (100% Localhost)

* **Back-end**: 
  - Java 17 LTS (Eclipse Adoptium OpenJDK 17)
  - Spring Boot 3.2.5
  - Spring Data JPA, Hibernate, Criteria Builder (JPA Specification)
  - Spring Security 6 (Stateless JWT Filter với `jjwt 0.11.5`)
  - Jsoup 1.17.2 (Anti-Stored XSS Sanitizer)
  - Jazzer 0.22.1 (White-box Fuzzing cho máy ảo JVM)
  - JUnit 5, Mockito
* **Cơ sở dữ liệu**:
  - MySQL 8.x chạy qua XAMPP Server (Port 3306)
  - Database: `web_badminton`, Charset: `utf8mb4_unicode_ci`
  - Tự động nạp tài khoản mẫu và 12+ cây vợt danh tiếng qua `DataInitializer`
* **Front-end**:
  - React 18 khởi tạo bằng Vite 6
  - Tailwind CSS, Lucide React Icons
  - React Router DOM v6
  - Axios (Tự động gắn Bearer Token và xử lý lỗi tập trung)
* **Cổng thanh toán**:
  - PayOS (Tạo link / mã VietQR động & Webhook IPN tự động)
  - Tích hợp **Mock Webhook Runner** sinh chữ ký HMAC-SHA256 chuẩn để kiểm thử 100% localhost không cần ngrok
* **Tích hợp AI**:
  - Google Gemini API (`gemini-1.5-flash`) kết nối trung gian bảo mật qua Spring Boot
  - **Dynamic Prompt Augmentation**: Tự động truy vấn kho MySQL (`stock > 0`) nhồi thông số vợt vào System Prompt
  - Phòng vệ nghiêm ngặt chống Jailbreak & Prompt Injection
  - Trả về cấu trúc JSON tự động render các thẻ sản phẩm (Product Cards) trực tiếp trong khung chat

---

## 2. Cấu Trúc 7 Entities Cốt Lõi (`com.sports.entity`)

1. **`Category`**: `id`, `name`, `description`.
2. **`Product`**: `id`, `name`, `brand` (Yonex, Victor, Lining, Mizuno), `price`, `original_price`, `stock` (kho khả dụng), `reserved_stock` (kho khóa tạm thời 15 phút), `image_url`, `description`.
   - *Thuộc tính kỹ thuật cầu lông*: `weight_grip` (3U-G5, 4U-G5, 5U), `stiffness` (Extra Stiff, Stiff, Medium, Flexible), `balance_point` (Head-Heavy, Even, Head-Light), `max_tension`, `play_style`.
3. **`User`**: `id`, `username` (unique), `email` (unique), `password` (BCrypt cost 12), `full_name`, `phone`, `address`, `role` (`ROLE_USER`, `ROLE_ADMIN`), `created_at`.
4. **`Order`**: `id`, `user_id`, `total_amount`, `status` (`PENDING`, `PAID`, `SHIPPING`, `COMPLETED`, `CANCELLED`), `payment_method`, `payos_order_code`, `expires_at` (hạn 15 phút), `shipping_address`, `shipping_phone`, `customer_name`, `created_at`.
5. **`OrderItem`**: `id`, `order_id`, `product_id`, `quantity`, `price`.
6. **`Review`**: `id`, `user_id`, `product_id`, `rating` (1-5 sao), `comment` (sanitized chống Stored XSS), `created_at`.
7. **`AiChatLog`**: `id`, `user_id`, `user_message`, `ai_response`, `created_at`.

---

## 3. Các Tính Năng Đột Phá & Cơ Chế Bảo Mật

### Tính năng Đột phá 1: Trình So Sánh Thông Số Vợt (Racket Comparison Tool)
- Cho phép chọn tối đa 3 cây vợt từ catalog.
- Bảng so sánh trực quan các thông số chuyên ngành: Điểm cân bằng, Thân vợt, Trọng lượng & Cán, Sức căng tối đa, Lối chơi đề xuất, Giá bán và Tồn kho.
- Nút "Thêm vào giỏ" tức thì cho từng cây vợt ngay tại bảng so sánh.

### Tính năng Đột phá 2: Khóa Tồn Kho Tạm Thời Nguyên Tử (Atomic Stock Reservation)
- Áp dụng khóa bi quan `@Lock(LockModeType.PESSIMISTIC_WRITE)` (`SELECT ... FOR UPDATE`) khi khách bấm *"Sinh mã VietQR"*.
- Chuyển số lượng đặt mua từ `stock` sang `reserved_stock`, sinh `expires_at = NOW() + 15 phút`.
- Khách chủ động bấm *"Hủy đơn"*: Hoàn trả ngay `reserved_stock` về `stock`.
- Tác vụ định kỳ Spring `@Scheduled(fixedRate = 60000)`: Quét các đơn `PENDING` quá hạn 15 phút, tự động hủy và hoàn kho.
- **Phòng chống Denial of Inventory**: Giới hạn tối đa **3 đơn `PENDING`** đồng thời cho mỗi tài khoản.
- Chặn số lượng âm và kiểm tra tính toán an toàn chống Integer Overflow.

### Module Thanh toán VietQR & Webhook PayOS
- Tiếp nhận Webhook tại `POST /api/payment/payos-webhook`.
- Xác thực chữ ký số HMAC-SHA256 tạo từ khóa bí mật `checksumKey`.
- Đối soát số tiền `amount` gửi về với `order.totalAmount` trong CSDL nhằm triệt tiêu lỗ hổng **Parameter Tampering**.
- Chuyển trạng thái sang `PAID` và trừ đứt `reserved_stock`.
- Tích hợp **Mock Webhook Runner** (`POST /api/payment/mock-webhook-trigger`) cho phép thử nghiệm luồng thanh toán thành công 100% trên localhost.

### Tính năng Đột phá 3: AI Chatbot Với Dynamic Prompt Augmentation
- Spring Boot làm cầu nối an toàn, bảo vệ Gemini API Key trong `.env`.
- Khi người dùng gửi câu hỏi (ví dụ: *"Tư vấn vợt công tầm 3 triệu"*), Service tự động truy vấn MySQL lấy các cây vợt phù hợp đang còn hàng (`stock > 0`) nhồi vào System Prompt.
- System Prompt nghiêm ngặt, chặn Prompt Injection (không đổi vai trò, không tiết lộ mã giảm giá, chỉ tư vấn cầu lông).
- Trả về JSON có cấu trúc gồm `{ reply, recommendedProductIds }` để Frontend tự động hiển thị **Product Cards** có hình ảnh, giá bán, nút *"Xem chi tiết"* và *"Thêm vào giỏ"* ngay trong khung chat!

### Bảo Mật OWASP Top 10 & Kiểm Thử Fuzzing (Jazzer JVM)
- **Chống IDOR**: Kiểm tra quyền sở hữu tại Service layer trên mọi endpoint đơn hàng (`/api/orders/{id}`, `/api/orders/{id}/cancel`).
- **Chống SQL Injection**: Toàn bộ truy vấn động sử dụng Spring Data JPA Criteria Builder / Prepared Statements.
- **Chống Stored XSS**: Làm sạch bình luận bằng Jsoup Safelist và cơ chế Output Encoding tự động của React JSX.
- **White-box Fuzzing với Jazzer**:
  - `CartFuzzTest`: Bơm dữ liệu dị dạng, số âm, số nguyên cực lớn sát `Long.MAX_VALUE` vào hàm tính toán giỏ hàng.
  - `PayOSWebhookFuzzTest`: Bắn dữ liệu rác, byte ngẫu nhiên, payload dị dạng vào bộ phân tích chữ ký Webhook để đảm bảo server không bị crash.

---

## 4. Hướng Dẫn Khởi Chạy (100% Localhost)

### Bước 1: Khởi động MySQL trên XAMPP
- Mở **XAMPP Control Panel**, nhấn **Start** tại module **MySQL** (Port 3306).
- Database `web_badminton` đã được tạo sẵn (nếu chưa, chạy lệnh `CREATE DATABASE web_badminton CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`).

### Bước 2: Khởi động Spring Boot Backend (Port 8080)
- Cách 1: Nhấp đúp vào file `run-backend.bat` ở thư mục gốc.
- Cách 2: Chạy lệnh bằng PowerShell:
  ```powershell
  cd c:\Project\Web_badminton\backend
  $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
  $env:PATH = "$env:JAVA_HOME\bin;C:\tools\apache-maven-3.9.6\bin;$env:PATH"
  java -jar target\web_badminton_backend-1.0.0.jar
  ```
- Backend sẽ lắng nghe tại: `http://localhost:8080`

### Bước 3: Khởi động React Vite Frontend (Port 5173)
- Cách 1: Nhấp đúp vào file `run-frontend.bat` ở thư mục gốc.
- Cách 2: Chạy lệnh bằng PowerShell:
  ```powershell
  cd c:\Project\Web_badminton\frontend
  $env:PATH = "C:\Program Files\nodejs;$env:PATH"
  npm run dev
  ```
- Mở trình duyệt truy cập: `http://localhost:5173`

---

## 5. Tài Khoản Dùng Thử Mẫu (Khởi Tạo Tự Động)

| Vai Trò | Tên Đăng Nhập | Mật Khẩu | Quyền Hạn |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Toàn quyền quản trị kho, thêm/sửa/xóa vợt, cập nhật đơn hàng |
| **User (Khách)** | `user` | `user123` | Mua hàng, sinh VietQR, đánh giá sản phẩm, trò chuyện AI |

*(Giao diện Đăng Nhập có sẵn nút bấm nạp nhanh tài khoản mẫu chỉ với 1 click)*
