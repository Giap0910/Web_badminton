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
  - `CartFuzzTest`: Hiện sinh số lượng, giá và tồn kho để kiểm tra phép tính mô phỏng trong test; chưa gọi nghiệp vụ đặt hàng thật.
  - `PayOSWebhookFuzzTest`: Hiện đưa đối tượng Java chứa dữ liệu ngẫu nhiên vào hàm xác minh chữ ký; chưa kiểm tra kết quả xác minh hoặc bước đọc JSON từ HTTP.

### Đặc tả kịch bản White-box Fuzzing — bước 1

**Trạng thái:** Đây là đặc tả để triển khai kiểm thử ở các bước tiếp theo, không phải báo cáo đã chạy hoặc xác nhận các kịch bản đã đạt. Sử dụng Java/Jazzer; không có phần mô phỏng C. Phạm vi gồm nghiệp vụ đặt hàng, giữ chỗ tồn kho và tiếp nhận thanh toán PayOS ở backend.

#### Luồng mã nguồn và dữ liệu

| Luồng | Điểm vào và các bước xử lý cần kiểm tra | Dữ liệu, điều kiện chính |
|---|---|---|
| Tạo đơn | `OrderService.createOrder` → `lockOrderingUser` → `validateRequestedItems` → `normalizePaymentMethod` → `reserveItem` → `calculateOrderTotal` → lưu đơn | Người dùng tồn tại, dưới 3 đơn `PENDING`; danh sách sản phẩm hợp lệ; tổng số lượng mỗi sản phẩm tối đa 100; đủ kho; giá dương. |
| Xác minh chữ ký | `PayOSService.verifyWebhookSignature` → chuyển dữ liệu thành map → bỏ trường null, sắp xếp khóa → ghép dữ liệu → `hmacSha256` → so sánh chữ ký | Phân biệt đối tượng thiếu dữ liệu, chữ ký hợp lệ, chữ ký sai và dữ liệu bị sửa sau khi ký. |
| Ghi nhận thanh toán | `PaymentController.handlePayOSWebhook` → xác minh chữ ký → kiểm tra `data.code` → `OrderService.handlePaymentSuccess` → `validatePayment` → `settleReservedStock` | Chỉ mã thành công `00` được chuyển sang đối soát; đúng phương thức, đúng số tiền, đúng trạng thái và còn hạn. |
| Hủy/hết hạn | `OrderService.cancelOrder` hoặc `expireOrder` → `cancelPendingOrder` → `settleReservedStock` | Hủy đơn `PENDING`, hoàn kho một lần; đơn PayOS hết hạn chuyển sang `CANCELLED`; COD không tự hết hạn theo cơ chế PayOS. |

| Dữ liệu | Kiểu và miền kiểm thử dự kiến | Nguồn dữ liệu |
|---|---|---|
| `quantity` | `Integer`: null, `Integer.MIN_VALUE`, -1, 0, 1, 99, 100, 101, `Integer.MAX_VALUE`; tổng nhiều dòng cùng sản phẩm tại biên 100/101 | `OrderItemRequest`; kiểm tra lại trong service, không chỉ dựa vào validation HTTP. |
| `items`, `productId` | Danh sách null/rỗng, phần tử null, ID null/không tồn tại, ID trùng ở nhiều dòng; tối đa 20 dòng trong mỗi lượt fuzz ban đầu | Yêu cầu tạo đơn; giới hạn 20 dòng là ngân sách test, không phải giới hạn nghiệp vụ hiện có. |
| `price`, `amount` | `BigDecimal`: null, âm, 0, dương, phần thập phân; giá trị quanh `Long.MAX_VALUE`; các giá trị quanh ngưỡng phí vận chuyển 1.000.000 | Giá lấy từ sản phẩm giả lập trong repository; số tiền thanh toán lấy từ webhook. Không giả định khách gửi giá trong yêu cầu đặt hàng. |
| `stock`, `reservedStock` | `Integer`: 0, ít hơn/bằng/nhiều hơn số lượng mua; gần `Integer.MAX_VALUE`; kho giữ chỗ thiếu so với đơn | Trạng thái kho giả lập, gồm cả trạng thái bất thường để kiểm tra xử lý lỗi số học. |
| `orderCode`, chữ ký, chuỗi webhook | `Long`: null, âm, 0, ID có/không tồn tại và các biên; chữ ký null/rỗng/sai độ dài/sai nội dung; chuỗi Unicode, `&`, `=`, rỗng; tối đa 4.096 ký tự mỗi trường khi fuzz ban đầu | Đối tượng `PayOSWebhookRequest` và `PayOSWebhookData`; dùng khóa ký dành riêng cho test. Giới hạn chuỗi là ngân sách test. |
| Trạng thái và thời gian | `PENDING`, `PAID`, `SHIPPING`, `COMPLETED`, `CANCELLED`; hạn null, trước/bằng/sau thời điểm đối soát | Đơn hàng giả lập; các ca sát thời điểm hết hạn cần kiểm soát thời gian để tránh kết quả chập chờn. |

Phạm vi ban đầu gọi trực tiếp đối tượng Java qua service/controller. JSON hỏng cú pháp, HTTP binding, frontend, LocalStorage, đồng thời nhiều giao dịch và giới hạn lưu trữ MySQL chưa thuộc phạm vi này. Kết quả test cô lập không chứng minh transaction rollback hoặc khóa database hoạt động thực tế.

#### Kịch bản đặt hàng và tồn kho

Điều kiện mặc định: người dùng tồn tại, có 0 đơn chờ; sản phẩm có giá 100.000, `stock = 10`, `reservedStock = 0`; không voucher; phương thức PayOS. Mỗi kịch bản thay đổi riêng dữ liệu được nêu. Các nhánh riêng tư được kiểm tra thông qua hàm công khai, không gọi trực tiếp bằng reflection.

| Mã | Đầu vào hoặc trạng thái trước xử lý | Nhánh cần đi qua | Kết quả mong đợi |
|---|---|---|---|
| DH-01 | Mua 2 sản phẩm theo điều kiện mặc định | Đặt hàng hợp lệ | Đơn `PENDING`; kho khả dụng 8, kho giữ chỗ 2; tiền hàng 200.000, phí giao 30.000, tổng 230.000; có mã PayOS và hạn khoảng 15 phút. |
| DH-02 | Số lượng null, âm, 0, 101 hoặc cực lớn; đối chiếu 1 và 100 với đủ kho | Kiểm tra số lượng | Giá trị ngoài 1–100 bị `BadRequestException` trước khi lưu kho/đơn; giá trị trong miền tiếp tục xử lý khi đủ điều kiện. |
| DH-03 | `items` null/rỗng, phần tử null, ID sản phẩm null; sản phẩm/người dùng không tồn tại | Kiểm tra cấu trúc và tra cứu | Dữ liệu thiếu bị từ chối có kiểm soát; đối tượng không tồn tại gây `ResourceNotFoundException`; không tạo đơn thành công. |
| DH-04 | Hai dòng cùng ID có số lượng 60 + 40 hoặc 60 + 41; kho đủ | Cộng dồn số lượng theo sản phẩm | Tổng 100 được phép; tổng 101 bị từ chối trước khi giữ kho. |
| DH-05 | Mua 3 khi kho là 2, 3 hoặc 4 | Nhánh thiếu/đủ tồn kho | Kho 2 gây `InsufficientStockException`; kho 3/4 thành công, giảm khả dụng và tăng giữ chỗ đúng 3. |
| DH-06 | Giá null, âm, 0; đối chiếu giá dương lớn và giá thập phân | Kiểm tra giá, nhân và cộng tiền | Giá không hợp lệ bị từ chối; giá dương tính chính xác bằng `BigDecimal`, không âm hoặc bị cắt về kiểu `long`. Không kết luận khả năng lưu MySQL từ ca test này. |
| DH-07 | Tiền hàng 999.999, 1.000.000, 1.000.001; thêm voucher có mức giảm hợp lệ hoặc bị service voucher từ chối | Phí vận chuyển và giảm giá | Phí lần lượt 30.000, 0, 0; tổng = tiền hàng − giảm giá + phí; voucher sai không tạo đơn thành công. Phí client gửi không quyết định phí server tính. |
| DH-08 | Có 2 hoặc 3 đơn `PENDING`; phương thức null/rỗng, `PAYOS_VIETQR`, `COD`, giá trị lạ | Giới hạn đơn chờ và chuẩn hóa phương thức | Có 3 đơn chờ bị từ chối; null/rỗng mặc định PayOS; COD có hạn và mã PayOS null; phương thức lạ bị từ chối. |
| DH-09 | Kho giữ chỗ gần `Integer.MAX_VALUE` rồi mua thêm; ID đơn khiến phép cộng mã PayOS vượt `long` | Cộng kho và sinh mã | Không chấp nhận kết quả tràn thành số âm hoặc mã bị cuộn vòng; lỗi số học phải được ghi nhận, không bắt rồi bỏ qua như test đạt. Đây là yêu cầu cần xác minh, chưa khẳng định code hiện tại đáp ứng. |

#### Kịch bản webhook và chuyển trạng thái

Điều kiện mặc định: đơn PayOS `PENDING`, còn hạn, tổng tiền 230.000, đã giữ 2 sản phẩm; webhook có `data.code = "00"` và chữ ký hợp lệ bằng khóa test. Đầu vào hợp lệ cần có mẫu chữ ký/kết quả đối chiếu độc lập; chỉ dùng hàm sinh và hàm xác minh chung một thuật toán chưa đủ để phát hiện lỗi chung của cả hai.

| Mã | Đầu vào hoặc chuỗi sự kiện | Nhánh cần đi qua | Kết quả mong đợi |
|---|---|---|---|
| WH-01 | Webhook hợp lệ theo điều kiện mặc định | Xác minh đúng → đối soát → ghi nhận | Xác minh trả `true`; controller trả 200; đơn thành `PAID`; kho giữ chỗ giảm đúng 2, kho khả dụng không bị trừ lần nữa. |
| WH-02 | Chữ ký rỗng, sai độ dài hoặc thay đổi một ký tự của chữ ký đúng | Xác minh sai | Xác minh trả `false`; controller trả 401; không gọi xử lý thanh toán, không thay đổi đơn/kho. |
| WH-03 | Sau khi ký, sửa riêng `amount`, `orderCode` hoặc một trường nội dung được ký | Dữ liệu bị thay đổi | Xác minh trả `false`; không ghi nhận thanh toán. Tạo biến đổi chắc chắn khác dữ liệu ban đầu. |
| WH-04 | `request`, `data` hoặc `signature` null; chuỗi Unicode, `&`, `=`, trường tùy chọn null | Thiếu dữ liệu và chuẩn hóa chuỗi | Hàm xác minh trả `false` cho request/data/signature null; trường tùy chọn được xử lý nhất quán với mẫu ký. Request null được thử tại hàm xác minh; không suy ra hành vi HTTP từ lời gọi controller trực tiếp. |
| WH-05 | Chữ ký đúng nhưng `data.code` khác `00` hoặc null | Thanh toán chưa thành công | Controller trả 200 để phản hồi đã nhận; không gọi đối soát và không chuyển đơn thành `PAID`. HTTP 200 ở đây không có nghĩa đã thanh toán. |
| WH-06 | Ký đúng dữ liệu có amount null, âm, lệch tổng ±1; đối chiếu amount bằng tổng nhưng khác scale thập phân | `validatePayment` | Null/âm/lệch tổng bị `BadRequestException`, controller trả 400; không đổi đơn/kho. Hai số tiền bằng nhau về giá trị được chấp nhận dù khác scale. |
| WH-07 | Webhook hợp lệ gửi lặp sau lần đầu, hoặc khi đơn đã `SHIPPING`/`COMPLETED` | Nhánh thanh toán đã ghi nhận | Không trừ giữ chỗ lần hai, không đổi trạng thái trở lại `PAID`; số tiền và phương thức vẫn phải được đối soát. |
| WH-08 | Tạo đơn → hủy hoặc `expireOrder` → webhook hợp lệ đến muộn; thử PENDING đã quá hạn và hạn null | Trạng thái/hạn không cho phép thanh toán | Từ chối đối soát với lỗi nghiệp vụ, controller trả 400; không phục hồi đơn đã hủy, không trừ/hoàn kho thêm. PENDING quá hạn chưa qua tác vụ hết hạn không tự được đánh dấu PAID. |
| WH-09 | Mã đơn không tồn tại hoặc đơn dùng COD | Tra cứu đơn và kiểm tra phương thức | Không cập nhật đơn/kho; service trả lỗi không tìm thấy hoặc lỗi nghiệp vụ. Controller hiện bắt lỗi không tìm thấy ở nhánh chung và trả 500; cần ghi nhận hạn chế này, không mô tả là 404 đã được hỗ trợ. |
| WH-10 | Kho giữ chỗ ít hơn số lượng trong đơn khi nhận thanh toán | `settleReservedStock` | Từ chối có kiểm soát, không tự ép kho về 0 và không đánh dấu đơn đã thanh toán. |
| WH-11 | Tạo đơn → hủy → hủy lại; hoặc tạo đơn PayOS → hết hạn → hết hạn lại; đối chiếu đơn COD | Hoàn kho một lần | Lần đầu hoàn kho đúng số lượng và chuyển `CANCELLED`; lần sau không hoàn thêm; `expireOrder` không tự hủy COD. |

#### Tiêu chí triển khai và ghi nhận ở bước tiếp theo

- Mỗi lượt fuzz bắt đầu từ dữ liệu giả lập mới; repository, entity manager và phụ thuộc ngoài được mô phỏng. Không truy cập database đang dùng hoặc thanh toán thật. Dùng mẫu hợp lệ để đi sâu, rồi biến đổi một hoặc nhiều trường trong ngân sách đầu vào đã nêu.
- Kiểm tra cả giá trị trả về, ngoại lệ mong đợi, lời gọi ghi dữ liệu, số tiền và trạng thái trước/sau. Không coi mọi ngoại lệ hoặc mọi kết quả `false` là test đạt. Với các thao tác có thể ghi từng phần trước khi lỗi, test mock chỉ mô tả lời gọi/trạng thái trong bộ nhớ; rollback cần kiểm thử transaction riêng nếu mở rộng phạm vi.
- Theo dõi line/branch coverage trên các hàm trong bảng luồng; ghi nhánh đã tới, nhánh chưa tới và lý do. Không lấy số lượng ca test hoặc phần trăm toàn backend thay cho độ phủ hai luồng này; chưa đặt mục tiêu 100% hay công bố số liệu khi chưa đo.
- Mỗi mã DH/WH cần được gắn với test triển khai, lệnh chạy, thời lượng, số đầu vào đã thử và kết quả. Khi có lỗi, lưu đầu vào tái hiện và liên kết với báo cáo; khi không phát hiện lỗi, ghi rõ giới hạn đợt chạy. Việc tạo file dữ liệu/báo cáo mới phải được thống nhất trước.
- Phân loại CWE theo nguyên nhân đã xác minh ở bước báo cáo; các nhóm nguy cơ cần xem xét là xác thực đầu vào, sai tính toán/tràn số, xác minh tính toàn vẹn và xử lý trạng thái lặp. Chưa gán CWE/CVE cụ thể hoặc tuyên bố phát hiện lỗ hổng ở bước đặc tả này.

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
