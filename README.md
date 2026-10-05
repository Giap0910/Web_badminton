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
- Chặn số lượng âm; phép sinh mã PayOS dùng `Math.addExact`. Phép cộng kho giữ chỗ kiểm tra giới hạn bằng `long` trước khi cập nhật kho; lỗi DH-09 được xử lý ở bước 4 của kế hoạch hoàn thiện bên dưới.

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
  - `CartFuzzTest`: Gọi nghiệp vụ đặt hàng thật với repository giả lập; kiểm tra dữ liệu đầu vào, tiền hàng, giữ chỗ tồn kho và tràn số.
  - `PayOSWebhookFuzzTest`: Kiểm tra chữ ký, đối soát và chuỗi trạng thái qua service/controller thật với dữ liệu giả lập; chưa kiểm tra bước đọc JSON từ HTTP.

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

### Đo coverage cho hai lớp fuzz test — bước 5

Profile Maven `fuzz-coverage` bật JaCoCo 0.8.12 cho `CartFuzzTest` và `PayOSWebhookFuzzTest`. Chỉ ba lớp `OrderService`, `PayOSService`, `PaymentController` được đưa vào báo cáo; các phương thức chưa được chạy trong ba lớp vẫn được hiển thị để nhận biết khoảng trống. Build thông thường không bật profile này.

Chạy trong thư mục `backend`:

```powershell
mvn -Pfuzz-coverage test
```

Sau khi lệnh test kết thúc, chạy riêng lệnh tạo báo cáo, kể cả khi test báo thất bại:

```powershell
mvn -Pfuzz-coverage jacoco:report
```

- Mở `backend/target/site/fuzz-coverage/index.html` để xem HTML; dữ liệu số nằm trong `jacoco.xml` và `jacoco.csv` cùng thư mục. Dữ liệu thực thi nằm tại `backend/target/jacoco-fuzz.exec`.
- Mỗi lần chạy test thay thế dữ liệu coverage trước đó, không cộng dồn với lần cũ. Không sửa/biên dịch lại mã nguồn giữa lần chạy test và lần tạo báo cáo vì bytecode cần khớp với dữ liệu thực thi. Chỉ tạo báo cáo khi lần test vừa chạy đã sinh dữ liệu mới.
- Báo cáo này đo chế độ hồi quy: các test JUnit và đầu vào hồi quy của `@FuzzTest`. Profile loại biến `JAZZER_FUZZ` khỏi môi trường tiến trình test; không đặt giá trị `0` vì Jazzer 0.22.1 vẫn coi biến có nội dung là bật fuzz. Số liệu này không phải kết quả của chiến dịch fuzz sinh đầu vào liên tục. Không cộng kết quả các test nghiệp vụ khác vào số liệu hai lớp fuzz test.
- Coverage tính cả đường đi của test thất bại. Lệnh tạo báo cáo thành công không có nghĩa test đạt; luôn đọc kết quả test trong `backend/target/surefire-reports/`. Không bật bỏ qua lỗi test để làm kết quả build thành công.
- Trong HTML, màu xanh là dòng đã chạy, đỏ là chưa chạy, vàng là chỉ chạy một phần. Xem cả tỷ lệ dòng và tỷ lệ nhánh, rồi mở từng hàm để xác định điều kiện còn thiếu. Coverage toàn lớp có thể thấp hơn các hàm mục tiêu vì còn các chức năng ngoài phạm vi.
- Các kho dữ liệu và phụ thuộc ngoài trong test được mô phỏng; coverage không chứng minh khóa MySQL, rollback giao dịch, tiếp nhận HTTP hoặc thanh toán PayOS thật đã hoạt động.

Cấu hình và định dạng báo cáo tham khảo [tài liệu Maven của JaCoCo](https://www.jacoco.org/jacoco/trunk/doc/maven.html); chế độ hồi quy tham khảo [tài liệu Jazzer](https://github.com/CodeIntelligenceTesting/jazzer#junit-integration).

#### Kết quả đo ngày 24/09/2026

Lượt hồi quy hoàn tất lúc 21:37:46 (giờ Việt Nam), báo cáo được tạo lúc 21:38:01. Đã chạy 64 lượt kiểm thử: 62 đạt, 2 thất bại cùng lỗi DH-09 (kho giữ chỗ `2147483647 + 1` thành `-2147483648`). Lệnh test báo `BUILD FAILURE`; lệnh tạo báo cáo thành công. Chưa sửa lỗi nghiệp vụ.

| Phạm vi toàn lớp | Dòng đã chạy / tổng | Độ phủ dòng | Nhánh đã chạy / tổng | Độ phủ nhánh |
|---|---|---|---|---|
| `OrderService` | 178/193 | 92,23% | 108/136 | 79,41% |
| `PayOSService` | 32/71 | 45,07% | 18/26 | 69,23% |
| `PaymentController` | 34/40 | 85,00% | 8/12 | 66,67% |

| Hàm mục tiêu | Dòng đã chạy / tổng | Nhánh đã chạy / tổng |
|---|---|---|
| `OrderService.createOrder` | 16/16 | 4/4 |
| `OrderService.validateRequestedItems` | 10/10 | 18/18 |
| `OrderService.reserveItem` | 12/12 | 6/6 |
| `OrderService.handlePaymentSuccess` | 13/13 | 12/12 |
| `PayOSService.verifyWebhookSignature` | 19/22 | 14/14 |
| `PaymentController.handlePayOSWebhook` | 32/32 | 8/8 |

Các khoảng trống tại thời điểm đo bước 5 (trước đợt bổ sung test dưới đây):

- Trong luồng mục tiêu: chưa đi qua điều kiện voucher chỉ chứa khoảng trắng, một số nhánh quyền hủy đơn/hủy đơn không còn `PENDING`, và trường hợp `expireOrder` nhận hạn null. Ca thiếu hạn ở thanh toán đã chạy nhưng đó là hàm khác.
- Ba dòng `catch` của `verifyWebhookSignature` và hai dòng `catch` của `hmacSha256` chưa chạy. JaCoCo không tính đường đi ngoại lệ vào chỉ số nhánh, nên 100% nhánh không đồng nghĩa đã kiểm thử phần xử lý ngoại lệ.
- Các hàm tạo link thanh toán, sinh/kích hoạt webhook giả lập và truy vấn danh sách/chi tiết đơn chưa được hai lớp fuzz test gọi. Các hàm này vẫn nằm trong mẫu số toàn lớp; không loại bỏ để nâng tỷ lệ.
- Một số nhánh chuyển trạng thái, dữ liệu null khi chuyển DTO và sắp xếp nhiều sản phẩm lúc giải phóng giữ chỗ chưa được phủ. Test mock không chứng minh transaction hoặc xử lý đồng thời.

Lượt chạy cấu hình ban đầu đã bị dừng do bật nhầm fuzz liên tục; không sử dụng làm số liệu ở trên. Sáu đầu vào tự sinh của lượt đó được giữ tại `backend/target/cifuzz-corpus/` theo chấp thuận của chủ dự án. Dữ liệu coverage được tạo lại từ đầu cho lượt hồi quy hoàn tất.

### Chiến dịch fuzz có giới hạn và minh chứng — bước 6

Các số liệu bước 5, chiến dịch ban đầu và bước 2–3 bên dưới là lịch sử trước bản sửa DH-09. Trạng thái sau sửa được ghi riêng ở bước 4; giữ nguyên log cũ để đối chiếu trước/sau, không coi các thất bại cũ là kết quả của mã hiện tại.

Đợt chạy dùng Java 17.0.20.1, Maven 3.9.16, Jazzer 0.22.1 trên Windows; không bật profile JaCoCo. Từng phương thức `@FuzzTest` được chạy trong một tiến trình test riêng, với `JAZZER_FUZZ=1`, seed `20260924`, tối đa 1.000 lượt hoặc 10 giây fuzz, tối đa 4.096 byte đầu vào thô. Thời gian biên dịch, khởi động JVM và gắn agent nằm ngoài thời gian fuzz. Mỗi mục bắt đầu với corpus trống; không dùng lại sáu mẫu của lượt chạy nhầm ở bước 5.

Jazzer instrument các lớp `com.sports.**`; log có xác nhận instrument service thật. Các giá trị `cov`/`ft` trong log là phản hồi nội bộ của fuzzer, không phải phần trăm line/branch của JaCoCo. Không cộng hoặc thay thế số liệu hồi quy ở bước 5 bằng các giá trị này.

#### Kết quả chạy ngày 24/09/2026

| Mục fuzz (giá trị `$target`) | Lượt thực thi | Giây fuzz / tổng Maven | Kết thúc (giờ Việt Nam) | Kết quả |
|---|---:|---|---|---|
| `CartFuzzTest#fuzzCartCalculation` | 1.000 | 1 / 33,219 | 21:50:51 | Chưa phát hiện lỗi |
| `CartFuzzTest#fuzzOrderStructure` | 1.000 | 2 / 39,612 | 21:52:28 | Chưa phát hiện lỗi |
| `CartFuzzTest#fuzzRepeatedProductLines` | 1.000 | 3 / 40,628 | 21:53:14 | Chưa phát hiện lỗi |
| `CartFuzzTest#fuzzOrderPolicies` | 1.000 | 2 / 42,650 | 21:54:00 | Chưa phát hiện lỗi |
| `CartFuzzTest#fuzzReservationArithmetic` | 1 | 0 / 38,490 | 21:54:42 | Thất bại: DH-09 |
| `PayOSWebhookFuzzTest#fuzzWebhookVerification` | 1.000 | 7 / 45,470 | 21:55:31 | Chưa phát hiện lỗi |
| `PayOSWebhookFuzzTest#fuzzMalformedWebhook` | 1.000 | 4 / 41,836 | 21:56:17 | Chưa phát hiện lỗi |
| `PayOSWebhookFuzzTest#fuzzOrderLifecycle` | 1.000 | 7 / 44,608 | 21:57:05 | Chưa phát hiện lỗi |

Tổng 7.001 lượt của fuzzer, không đồng nghĩa 7.001 dữ liệu khác nhau. Mỗi mục còn có lượt JUnit kiểm tra đầu vào rỗng; hai báo lỗi ở mục DH-09 là cùng một nguyên nhân, không phải hai lỗi độc lập. Thời gian fuzz được báo theo giây nguyên; 0 giây không có nghĩa không thực thi. Đợt chạy ngắn với một seed không chứng minh mọi kịch bản đã được sinh hoặc ứng dụng hết lỗi.

Minh chứng nằm trong [thư mục chiến dịch](C:/Project/Web_badminton/backend/target/fuzz-step6-20260924). Mỗi thư mục mang tên phương thức chứa `maven.log` (số lượt, thời gian, kết quả), `reports/` (XML và log test), `.cifuzz-corpus/` (mẫu được giữ lại). Các bản sao báo cáo ở đây được giữ riêng với `target/surefire-reports`.

DH-09 có [log thất bại](C:/Project/Web_badminton/backend/target/fuzz-step6-20260924/fuzzReservationArithmetic/maven.log) và [đầu vào gây lỗi](C:/Project/Web_badminton/backend/target/fuzz-step6-20260924/fuzzReservationArithmetic/crash-da39a3ee5e6b4b0d3255bfef95601890afd80709). File có 0 byte, SHA-1 `da39a3ee5e6b4b0d3255bfef95601890afd80709`: đây là đầu vào rỗng hợp lệ. Harness ánh xạ nó thành kho giữ chỗ `2147483647`, số lượng mua `1`, kho khả dụng `100`, giá `10`, phương thức COD. Mong đợi từ chối phép cộng vượt giới hạn; thực tế giữ chỗ thành `-2147483648`. Lỗi chưa sửa.

#### Cách chạy lại một mục

Chạy đoạn lệnh dưới đây trong thư mục `backend`, thay `$target` bằng mục cần chạy trong bảng kết quả. Đây là lệnh sử dụng trực tiếp, không cần tạo file script. Mỗi lần tạo thư mục kết quả riêng dưới `target` để giữ nguyên minh chứng cũ; không dùng `mvn clean` khi còn cần các báo cáo.

```powershell
$target = 'CartFuzzTest#fuzzCartCalculation'
$replayInput = $null
$fuzzSeed = 20260924
$fuzzRuns = 1000
$fuzzSeconds = 10
$traceScenarios = 'false'
$method = $target.Split('#')[1]
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$runDir = Join-Path (Get-Location).Path "target/fuzz-$stamp/$method"
New-Item -ItemType Directory -Path $runDir -ErrorAction Stop | Out-Null
$previousFuzz = $env:JAZZER_FUZZ
try {
    $env:JAZZER_FUZZ = '1'
    $options = @(
        '-o', 'test', "-Dtest=$target",
        '-Dmaven.compiler.useIncrementalCompilation=false',
        '-DlastModGranularityMs=-2147483648',
        "-DargLine=-Djava.io.tmpdir=$runDir",
        "-Djazzer.internal.basedir=$runDir",
        "-Djazzer.reproducer_path=$runDir", "-Duser.dir=$runDir",
        '-Dmaven.test.redirectTestOutputToFile=true',
        "-Dfuzz.trace.scenarios=$traceScenarios",
        '-Djazzer.instrumentation_includes=com.sports.**',
        '-Djazzer.internal.arg.0=fuzz',
        "-Djazzer.internal.arg.1=-max_total_time=$fuzzSeconds",
        "-Djazzer.internal.arg.2=-runs=$fuzzRuns",
        "-Djazzer.internal.arg.3=-seed=$fuzzSeed",
        '-Djazzer.internal.arg.4=-max_len=4096',
        '-Djazzer.internal.arg.5=-print_final_stats=1',
        '-Dsurefire.timeout=90', '-l', "$runDir/maven.log"
    )
    if ($replayInput) {
        if (-not (Test-Path -LiteralPath $replayInput -PathType Leaf)) {
            throw 'Replay input does not exist'
        }
        $options += "-Djazzer.internal.arg.6=$replayInput"
        $options += "-Djazzer.internal.arg.7=-artifact_prefix=$runDir/"
        $options += '-Djazzer.internal.arg.8=-runs=1'
    }
    & mvn @options
    $testExit = $LASTEXITCODE
    $reportDir = Join-Path $runDir 'reports'
    New-Item -ItemType Directory -Path $reportDir -ErrorAction Stop | Out-Null
    $pattern = '*com.sports.fuzz.' + $target.Split('#')[0] + '*'
    Get-ChildItem target/surefire-reports -File |
        Where-Object { $_.Name -like $pattern } |
        Copy-Item -Destination $reportDir -ErrorAction Stop
    Write-Output "MAVEN_EXIT=$testExit"
} finally {
    $env:JAZZER_FUZZ = $previousFuzz
}
```

Chế độ `-o` dùng các dependency đã tải ở các bước trước. Hai cờ compiler ép biên dịch lại bằng javac để tránh dùng class cũ do IDE tạo. Kiểm tra thời điểm cập nhật và tên phương thức trong XML trước khi sử dụng bản sao báo cáo: nếu Maven lỗi trước giai đoạn test thì `surefire-reports` có thể còn kết quả của lần trước. Các khóa `jazzer.internal.*` ở đây đã được đối chiếu với mã nguồn phiên bản 0.22.1; cần kiểm tra lại nếu nâng Jazzer.

Để tái hiện DH-09 từ file đã lưu, thay hai dòng đầu của đoạn lệnh trên bằng:

```powershell
$target = 'CartFuzzTest#fuzzReservationArithmetic'
$replayInput = 'C:/Project/Web_badminton/backend/target/fuzz-step6-20260924/fuzzReservationArithmetic/crash-da39a3ee5e6b4b0d3255bfef95601890afd80709'
```

Lệnh replay đọc file gốc và lưu kết quả vào thư mục mới dưới `target`. Trước bản sửa, lỗi là `expected: <2147483648> but was: <-2147483648>`; sau bản sửa bước 4, mong đợi `MAVEN_EXIT=0` vì phép cộng vượt giới hạn bị từ chối và kho giữ nguyên. Kết quả chạy replay được ghi ở bước 4, không cộng vào 7.001 lượt của chiến dịch ban đầu. JUnit còn chạy ca đầu vào rỗng trước lượt replay.

#### Đối chiếu đặc tả với kiểm thử hiện có

| Kịch bản | Phương thức kiểm thử liên quan | Giới hạn cần hiểu đúng |
|---|---|---|
| DH-01, DH-02, DH-05, DH-06 | `fuzzCartCalculation`, `orderBoundariesExerciseRealService`, `defaultPayosOrderExpiresExactlyFifteenMinutesAfterCreation` | Đã bổ sung mẫu DH-01 và đối chiếu hạn với thời điểm tạo đơn +15 phút; không dùng thời gian chờ thực tế. |
| DH-03 | `fuzzOrderStructure`, `invalidStructuresAreRejected` | Bảy trường hợp cấu trúc/tra cứu; không phải JSON hỏng qua HTTP. |
| DH-04 | `fuzzRepeatedProductLines`, `aggregateQuantityBoundaries` | Tổng số lượng 100/101 và tối đa 20 dòng cùng sản phẩm; chưa chứng minh xử lý nhiều sản phẩm khác nhau. |
| DH-07 | `orderBoundariesExerciseRealService`, `voucherDiscountAndRejection` | Ngưỡng phí, voucher hợp lệ/bị từ chối được chạy trong hồi quy bước 5, không có mục fuzz voucher riêng trong đợt này. |
| DH-08 | `fuzzOrderPolicies`, `pendingOrderAndPaymentMethodBoundaries` | Số đơn chờ và sáu giá trị phương thức; repository giả lập. |
| DH-09 | `fuzzReservationArithmetic`, `reservationMustNotOverflow`, `payosCodeOverflowIsReported` | Lỗi cộng kho được xác nhận; ca tràn mã PayOS kiểm tra `ArithmeticException` trong hồi quy, chưa chứng minh rollback database. |
| WH-01, WH-02, WH-03 | `fuzzWebhookVerification`, `signatureProtectsOrderCodeAndDescription` | Fuzz chữ ký đúng/sai và sửa amount; sửa orderCode/description riêng có trong hồi quy. |
| WH-04 | `fuzzMalformedWebhook`, `malformedWebhookBoundaries`, `signatureAmountBoundaries` | Null/rỗng/chuỗi sai; chuỗi 4.096 ký tự nằm trong hồi quy. Không suy ra toàn bộ chuỗi dài đã được fuzz sinh ra. |
| WH-05, WH-06, WH-08, WH-09, WH-10 | `paymentScenariosExerciseRealServices`, `fuzzWebhookVerification`, `signedUnderpaymentIsRejectedWithoutChangingStock` | 15 giá trị `PaymentCase` có test hồi quy riêng; không dùng 1.000 lượt fuzz làm bằng chứng từng giá trị đều được chọn. Đã bổ sung ca amount lệch −1 có chữ ký đúng. |
| WH-07, WH-08, WH-11 | `fuzzOrderLifecycle`, `orderLifecycleBoundaries` | Chuỗi trả tiền lặp, hủy/hết hạn và hoàn kho; không có giao dịch đồng thời hoặc thời điểm đúng sát ranh giới hết hạn. |

#### Bổ sung kiểm thử sau rà soát — bước 2 của kế hoạch hoàn thiện

Đã thêm 15 lượt hồi quy trong hai file test hiện có:

- `CartFuzzTest`: mẫu DH-01 mua 2 sản phẩm, tổng 230.000, hạn đúng thời điểm tạo +15 phút; voucher chỉ chứa khoảng trắng không gọi service voucher. Bổ sung kho 4 khi mua 3 vào ca biên hiện có.
- `PayOSWebhookFuzzTest`: amount thiếu 1 có chữ ký hợp lệ; khách khác không được hủy; admin được hủy; từ chối hủy ở ba trạng thái đã thanh toán/đang giao/hoàn tất; không tự hủy đơn thiếu hạn; khóa checksum null/rỗng phải xác minh thất bại; chặn ba chuyển trạng thái bỏ qua thanh toán PayOS; giao COD chỉ tất toán kho một lần.
- Kiểm tra cả kết quả, trạng thái kho/đơn và lời gọi lưu dữ liệu. Các khóa và repository đều thuộc fixture test; không đụng cấu hình hay database thật. Các ca checksum không dùng được đi qua xử lý ngoại lệ, không phải thử tính tương thích với PayOS thật.

Lượt xác minh kết thúc lúc **22:23:53 ngày 24/09/2026**, tổng Maven 32,039 giây: **79 lượt, 77 đạt, 2 thất bại, 0 lỗi thực thi, 0 bỏ qua**. Toàn bộ 15 lượt mới đạt; hai thất bại vẫn là lỗi tràn kho DH-09 đã biết. Maven trả mã 1 đúng với kết quả, không bỏ qua lỗi để làm build xanh. Xem [log xác minh](C:/Project/Web_badminton/backend/target/step2-regression-verified.log).

Lệnh xác minh chạy trong `backend`, với biến `JAZZER_FUZZ` không được đặt:

```powershell
mvn -o test '-Dtest=CartFuzzTest,PayOSWebhookFuzzTest' '-Dmaven.compiler.useIncrementalCompilation=false' '-DlastModGranularityMs=-2147483648' '-DargLine=-Dfile.encoding=UTF-8' '-Dmaven.test.redirectTestOutputToFile=true'
```

Lượt đầu `step2-regression.log` còn hai lỗi thiết lập mock của ca mới; đã bổ sung trả về đối tượng được lưu và chạy lại thành kết quả xác minh nêu trên. Không dùng lượt đầu làm kết quả cuối. Bước này chưa chạy chiến dịch fuzz mới hoặc đo lại JaCoCo; số liệu coverage và 7.001 lượt fuzz phía trên là mốc trước khi thêm test. Các giới hạn về thời điểm đúng ranh giới hết hạn, nhiều sản phẩm khác nhau, HTTP, transaction và đồng thời vẫn còn. Không sửa nghiệp vụ tràn kho, không sửa frontend hoặc thêm file mã nguồn.

#### Cải thiện độ đa dạng — bước 3 của kế hoạch hoàn thiện

`fuzzWebhookVerification` chọn `PaymentCase` trước khi đọc các trường số và chuỗi mô tả. Trước đây việc chọn nằm sau `consumeString(4096)`, có nguy cơ không còn dữ liệu để biến đổi tình huống. Thay đổi chỉ thuộc harness kiểm thử, không thay logic xác minh/thanh toán. Corpus webhook cũ không được dùng lại trong đợt này vì thứ tự diễn giải byte đã thay đổi.

Đã thêm 15 lượt hồi quy `webhookScenarioIsSelectedBeforeVariableLengthData`, kiểm tra từng giá trị enum và thứ tự sử dụng dữ liệu. Lượt chạy hồi quy kết thúc lúc 22:27:45 ngày 24/09/2026: **94 lượt, 92 đạt, 2 thất bại DH-09, 0 lỗi thực thi**; cả 15 lượt mới đạt. Xem [log hồi quy bước 3](C:/Project/Web_badminton/backend/target/step3-regression.log) và [bản sao báo cáo](C:/Project/Web_badminton/backend/target/fuzz-step3-20260924/regression-reports).

Cờ test tùy chọn `-Dfuzz.trace.scenarios=true` ghi một dòng `FUZZ_PAYMENT_CASE=...` sau khi các kiểm tra của một lượt webhook đều đạt. Mặc định tắt; không giữ bộ đếm hoặc chia sẻ trạng thái nghiệp vụ giữa các lượt. Bằng chứng chọn tình huống không đồng nghĩa mọi tổ hợp dữ liệu hoặc đường đi của tình huống đã được phủ.

Để chạy lại chiến dịch webhook với đoạn lệnh ở trên, đặt `$target = 'PayOSWebhookFuzzTest#fuzzWebhookVerification'`, `$replayInput = $null`, `$fuzzRuns = 5000`, `$fuzzSeconds = 30`, `$traceScenarios = 'true'`; chạy riêng lần lượt `$fuzzSeed = 20260924`, `20260925`, `20260926`. Mỗi lần giữ thư mục kết quả mới, không dùng lại corpus. Giới hạn 4.096 byte là trần đầu vào, không khẳng định fuzzer đã sinh tới độ dài đó.

Kết quả chiến dịch ngày 24/09/2026, chỉ dành cho `fuzzWebhookVerification`:

| Seed | Lượt fuzzer | Giây fuzz / tổng Maven | Tình huống ghi nhận | Kết thúc (giờ Việt Nam) | Kết quả |
|---|---:|---|---|---|---|
| 20260924 | 5.000 | 11 / 40,483 | 15/15 | 22:29:05 | Chưa phát hiện lỗi |
| 20260925 | 5.000 | 14 / 44,069 | 15/15 | 22:29:53 | Chưa phát hiện lỗi |
| 20260926 | 5.000 | 11 / 39,810 | 15/15 | 22:30:36 | Chưa phát hiện lỗi |

Tổng **15.000 lượt fuzzer**, cả ba lần Maven trả 0. Mỗi log trace có 5.001 dòng do có thêm một ca JUnit đầu vào rỗng; không cộng ba ca đó vào số lượt fuzzer. Cả 15 tình huống đều xuất hiện nhiều lần ở từng seed, nên không lấy test enum cố định làm bằng chứng thay cho chiến dịch sinh dữ liệu.

Minh chứng: [seed 20260924](C:/Project/Web_badminton/backend/target/fuzz-step3-20260924/seed-20260924/maven.log), [seed 20260925](C:/Project/Web_badminton/backend/target/fuzz-step3-20260924/seed-20260925/maven.log), [seed 20260926](C:/Project/Web_badminton/backend/target/fuzz-step3-20260924/seed-20260926/maven.log). Trong mỗi thư mục seed, `reports/com.sports.fuzz.PayOSWebhookFuzzTest-output.txt` chứa các dòng `FUZZ_PAYMENT_CASE=` và xác nhận instrument `OrderService`, `PayOSService`, `PaymentController`; `reports/TEST-com.sports.fuzz.PayOSWebhookFuzzTest.xml` lưu kết quả JUnit. Corpus và file tạm cũng nằm trong thư mục seed đó.

Đủ 15 tình huống không phải 100% coverage. Đợt này không chạy lại bảy mục fuzz khác, không kiểm chứng chuỗi dài mọi kích thước, dữ liệu HTTP hay giao dịch database. Các số coverage cũ vẫn giữ nguyên cho mốc đo cũ; việc đo lại thuộc bước 5. Lỗi tràn kho DH-09 vẫn chưa sửa và còn làm bộ hồi quy chung thất bại.

#### Sửa tràn kho DH-09 — bước 4 của kế hoạch hoàn thiện

`OrderService.reserveItem` tính tổng kho giữ chỗ bằng `long`, kiểm tra không vượt `Integer.MAX_VALUE`, rồi mới cập nhật kho khả dụng và kho giữ chỗ. Tổng bằng giới hạn vẫn được phép; tổng vượt giới hạn gây `BadRequestException` trước các thao tác thay đổi/lưu sản phẩm của lần giữ kho đó. Đây là thay đổi backend nghiệp vụ có giới hạn, không đổi schema, endpoint hoặc frontend.

`CartFuzzTest` bổ sung ba ca cộng số lượng 100 quanh giới hạn, đồng thời siết kiểm tra khi bị từ chối: cả kho khả dụng, kho giữ chỗ đều giữ nguyên và không gọi lưu sản phẩm/đơn. Không xóa hoặc bỏ qua các ca từng gây lỗi.

Kết quả ngày 24/09/2026:

- **97/97 lượt hồi quy đạt**, 0 thất bại/lỗi/bỏ qua; kết thúc 22:33:32. Xem [log hồi quy](C:/Project/Web_badminton/backend/target/step4-regression.log) và [bản sao báo cáo](C:/Project/Web_badminton/backend/target/fuzz-step4-20260924/regression-reports).
- **Replay file crash cũ đạt**, Maven trả 0; log xác nhận thực thi đúng file đầu vào rỗng, kết thúc 22:34:32. [Log replay](C:/Project/Web_badminton/backend/target/fuzz-step4-20260924/replay/maven.log). File crash gốc được giữ nguyên, SHA-1 không đổi. Replay là kiểm tra đầu vào cố định, không phải chiến dịch sinh dữ liệu mới.
- Mục `CartFuzzTest#fuzzReservationArithmetic` đã chạy **1.000 lượt fuzz trong 1 giây** với seed `20260924`, ngân sách 1.000 lượt/10 giây, đầu vào tối đa 4.096 byte; chưa phát hiện lỗi, Maven trả 0, kết thúc 22:35:05. [Log fuzz sau sửa](C:/Project/Web_badminton/backend/target/fuzz-step4-20260924/fuzz/maven.log).

Lệnh hồi quy giống bước 2. Lệnh replay dùng đúng hướng dẫn phía trên; lượt fuzz mới đặt `$target = 'CartFuzzTest#fuzzReservationArithmetic'`, `$replayInput = $null`, `$fuzzSeed = 20260924`, `$fuzzRuns = 1000`, `$fuzzSeconds = 10`, `$traceScenarios = 'false'`. Kết quả sinh trong `target`; không triển khai hoặc khởi động lại website đang chạy.

Đã khắc phục phép cộng gây lỗi trong phạm vi được tái hiện; không kết luận toàn bộ ứng dụng hết lỗi. Test dùng repository giả lập, chưa chứng minh rollback khi nhiều sản phẩm đã được xử lý trước một lỗi hoặc khóa database trong giao dịch đồng thời. Chưa đo lại JaCoCo; các số coverage phía trên vẫn là mốc trước sửa.

#### Xác minh cuối và đo lại coverage — bước 5 của kế hoạch hoàn thiện

Chạy lại hai lớp fuzz test với profile `fuzz-coverage`: **97/97 lượt hồi quy đạt**, không thất bại, lỗi thực thi hoặc bỏ qua; kết thúc lúc 22:38:34 ngày 24/09/2026. Báo cáo JaCoCo tạo lúc 22:38:38, phân tích đúng ba lớp và không có cảnh báo bytecode không khớp. Lệnh test và lệnh tạo báo cáo đều trả 0.

```powershell
mvn -o -Pfuzz-coverage test '-Dmaven.compiler.useIncrementalCompilation=false' '-DlastModGranularityMs=-2147483648' '-Dmaven.test.redirectTestOutputToFile=true'
mvn -o -Pfuzz-coverage jacoco:report
```

Minh chứng được giữ riêng: [log hồi quy](C:/Project/Web_badminton/backend/target/final-step5-20260924/regression.log), [log tạo báo cáo](C:/Project/Web_badminton/backend/target/final-step5-20260924/coverage.log), [coverage trước bổ sung/sửa lỗi](C:/Project/Web_badminton/backend/target/final-step5-20260924/coverage-before/index.html), [coverage sau bổ sung/sửa lỗi](C:/Project/Web_badminton/backend/target/final-step5-20260924/coverage-after/index.html). Hai bản sao có XML/CSV; dữ liệu thực thi được giữ bằng `jacoco-before.exec` và `jacoco-after.exec` cùng thư mục tổng hợp. Không xóa minh chứng cũ.

| Phạm vi toàn lớp | Dòng sau sửa | Tỷ lệ dòng trước → sau | Nhánh sau sửa | Tỷ lệ nhánh trước → sau |
|---|---|---|---|---|
| `OrderService` | 184/196 | 92,23% → 93,88% | 123/138 | 79,41% → 89,13% |
| `PayOSService` | 37/71 | 45,07% → 52,11% | 18/26 | 69,23% → 69,23% |
| `PaymentController` | 34/40 | 85,00% → 85,00% | 8/12 | 66,67% → 66,67% |

Mẫu số `OrderService` tăng do thêm kiểm tra tràn số; không loại phương thức chưa chạy để nâng tỷ lệ. Đây vẫn là độ phủ hồi quy, không phải độ phủ riêng của chiến dịch fuzz.

| Hàm mục tiêu sau sửa | Dòng đã chạy / tổng | Nhánh đã chạy / tổng |
|---|---|---|
| `createOrder` | 16/16 | 4/4 |
| `validateRequestedItems` | 10/10 | 18/18 |
| `reserveItem` | 15/15 | 8/8 |
| `calculateOrderTotal` | 15/15 | 6/6 |
| `cancelOrder` | 6/6 | 6/6 |
| `cancelPendingOrder` | 6/6 | 2/2 |
| `expireOrder` | 7/7 | 8/8 |
| `handlePaymentSuccess` | 13/13 | 12/12 |
| `PayOSService.verifyWebhookSignature` | 22/22 | 14/14 |
| `PayOSService.hmacSha256` | 12/12 | 4/4 |
| `PaymentController.handlePayOSWebhook` | 32/32 | 8/8 |

Chiến dịch xác minh sau sửa chạy riêng từng mục (không bật JaCoCo): seed `20260924`, tối đa 1.000 lượt hoặc 10 giây mỗi mục, trần 4.096 byte, corpus ban đầu trống. Bật `fuzz.trace.scenarios=true` để đối chiếu tình huống webhook.

| Mục fuzz | Lượt thực thi | Giây fuzz / tổng Maven | Kết thúc (24/09/2026, giờ Việt Nam) | Kết quả |
|---|---:|---|---|---|
| `fuzzCartCalculation` | 1.000 | 1 / 28,993 | 22:39:50 | Đạt |
| `fuzzOrderStructure` | 1.000 | 1 / 27,627 | 22:40:20 | Đạt |
| `fuzzRepeatedProductLines` | 1.000 | 1 / 29,368 | 22:40:53 | Đạt |
| `fuzzOrderPolicies` | 1.000 | 1 / 29,886 | 22:41:26 | Đạt |
| `fuzzReservationArithmetic` | 1.000 | 1 / 29,900 | 22:41:59 | Đạt |
| `fuzzWebhookVerification` | 1.000 | 3 / 31,751 | 22:42:33 | Đạt |
| `fuzzMalformedWebhook` | 1.000 | 2 / 29,615 | 22:43:06 | Đạt |
| `fuzzOrderLifecycle` | 1.000 | 3 / 32,023 | 22:43:41 | Đạt |

Tổng **8.000 lượt fuzzer, cả 8 lệnh Maven trả 0**, chưa phát hiện lỗi trong ngân sách chạy. JUnit có thêm một ca đầu vào rỗng cho mỗi mục, không cộng vào 8.000 lượt. Log webhook có 1.001 dòng trace và đủ 15/15 tình huống. Đây là đợt xác minh cuối riêng biệt, không cộng lẫn với đợt 15.000 lượt nhiều seed ở bước 3.

Toàn bộ minh chứng nằm tại [thư mục kết quả cuối](C:/Project/Web_badminton/backend/target/final-step5-20260924). Mỗi thư mục mang tên phương thức có `maven.log`, `reports/` và corpus riêng. Lệnh tái chạy dùng mẫu đã ghi ở bước 6, chọn từng `$target`, đặt `$replayInput = $null`, `$fuzzSeed = 20260924`, `$fuzzRuns = 1000`, `$fuzzSeconds = 10`, `$traceScenarios = 'true'`. Chạy riêng từng mục; không bật profile coverage cùng chiến dịch fuzz.

Các khoảng trống còn lại theo báo cáo mới:

- `updateOrderStatus`: 13/14 nhánh; `canShip`: 6/8 nhánh; `toDto`: 6/8 nhánh và phần lambda chuyển từng item: 8/14 nhánh. Một số dữ liệu null/trạng thái và đường đi lỗi tra cứu chưa được chạy.
- Các hàm lấy danh sách/chi tiết đơn, tạo chữ ký link thanh toán, sinh và kích hoạt webhook giả lập chưa được hai lớp này gọi; vẫn nằm trong mẫu số toàn lớp.
- Chưa kiểm tra HTTP/JSON binding, PayOS thật, rollback database, giao dịch đồng thời, mọi chuỗi sự kiện hoặc mọi độ dài đầu vào. Coverage 100% ở một hàm không chứng minh mọi giá trị/tổ hợp đều an toàn.
- Phần C vẫn ngoài phạm vi theo thống nhất với chủ dự án; nếu thầy yêu cầu bắt buộc mô phỏng C/buffer/bộ nhớ thì cần xác nhận việc dùng Java/Jazzer thay thế, không tự coi yêu cầu đó đã đạt.

**Kết luận trong phạm vi đã thống nhất:** đã hoàn tất năm bước hoàn thiện: bổ sung báo cáo/minh chứng, thêm ca hồi quy, cải thiện độ đa dạng webhook, sửa tràn kho DH-09 và xác minh lại. Có kết quả thực thi, coverage trước/sau và bằng chứng replay lỗi đã được xử lý. Không kết luận ứng dụng không còn lỗ hổng hoặc tự xác nhận đạt toàn bộ yêu cầu môn học. Bước chốt chỉ cập nhật README và kết quả trong `target`, không sửa thêm code, cấu hình hoặc frontend; không khởi động lại website.

#### Phân loại phạm vi an toàn

| Nhóm CWE tham chiếu | Bằng chứng trong phạm vi kiểm thử | Kết luận được phép |
|---|---|---|
| [CWE-190: Integer Overflow or Wraparound](https://cwe.mitre.org/data/definitions/190.html) | DH-09, cộng kho giữ chỗ từ `2147483647` thêm `1` thành `-2147483648` trong `OrderService.reserveItem` | Đã xác nhận lỗi số học với trạng thái kho giả lập. Chưa chứng minh khách ngoài hệ thống có thể tạo trạng thái kho đó. |
| [CWE-1284: Improper Validation of Specified Quantity in Input](https://cwe.mitre.org/data/definitions/1284.html) | DH-02/DH-04: số lượng âm, vượt giới hạn và tổng nhiều dòng | Nhóm rủi ro được kiểm tra, không phải một lỗ hổng mới đã phát hiện. |
| [CWE-354: Improper Validation of Integrity Check Value](https://cwe.mitre.org/data/definitions/354.html) | WH-02/WH-03: chữ ký sai và dữ liệu đã bị thay đổi | Nhóm rủi ro được kiểm tra bằng khóa test; không chứng minh tương thích toàn bộ payload thật của PayOS. |
| [CWE-841: Improper Enforcement of Behavioral Workflow](https://cwe.mitre.org/data/definitions/841.html) | WH-07/WH-08/WH-11: sự kiện lặp, sai trạng thái và hoàn kho | Nhóm rủi ro được kiểm tra theo các chuỗi đã viết, không phải mọi thứ tự sự kiện có thể xảy ra. |

Không gán CVE: chưa có mã CVE được xác nhận cho lỗi này. Không dùng CVE của sản phẩm khác để nhận là lỗi của dự án. Buffer overflow/rò rỉ bộ nhớ kiểu C không được kiểm chứng bằng đợt fuzz Java này; phần C vẫn ngoài phạm vi theo thống nhất.

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
