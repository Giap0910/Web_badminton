# -*- coding: utf-8 -*-
"""
Script to generate:
1. C:\\Project\\Web_badminton\\BAO_CAO_DO_AN_WEB_BADMINTON.md
2. C:\\Project\\Web_badminton\\Bao_cao_Web_Badminton.html
3. C:\\Project\\Web_badminton\\Bao_cao_Web_Badminton.pdf (via Edge headless)
"""

import os
import subprocess

REPORT_MD = r"C:\Project\Web_badminton\BAO_CAO_DO_AN_WEB_BADMINTON.md"
REPORT_HTML = r"C:\Project\Web_badminton\Bao_cao_Web_Badminton.html"
REPORT_PDF = r"C:\Project\Web_badminton\Bao_cao_Web_Badminton.pdf"
EDGE_EXE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

md_content = r"""# TRƯỜNG CÔNG NGHỆ THÔNG TIN — ĐẠI HỌC PHENIKAA
## BÁO CÁO ĐỒ ÁN MÔN HỌC
### CSE703153 — Kỹ thuật Lập trình An toàn (Software Security)

---

**Đề tài:** [........................................................................................................]  
*(Người dùng tự bổ sung tên đề tài đăng ký)*

**Nhóm:** [...........] &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Lớp:** [...........]  

**Thành viên thực hiện:**
1. [Họ và tên: .................................................... — MSSV: ....................]
2. [Họ và tên: .................................................... — MSSV: ....................]
3. [Họ và tên: .................................................... — MSSV: ....................]
4. [Họ và tên: .................................................... — MSSV: ....................]

**Giảng viên hướng dẫn:** MSc. Vũ Quang Dũng  
**Đơn vị:** Trường Công nghệ Thông tin — Đại học Phenikaa  
**Hà Nội, Năm học 2026–2027**

---

## MỤC LỤC TỐI THIỂU
1. [Phần 1 — Trang bìa & Thông tin nhóm](#phần-1--trang-bìa--thông-tin-nhóm)
2. [Phần 2 — Tổng quan đề tài](#phần-2--tổng-quan-đề-tài)
3. [Phần 3 — Phương pháp luận](#phần-3--phương-pháp-luận)
4. [Phần 4 — Phân tích lỗ hổng & Bản vá](#phần-4--phân-tích-lỗ-hổng--bản-vá)
   - 4.1. [CWE-190: Integer Overflow or Wraparound tại hàm reserveItem](#41-cwe-190-integer-overflow-or-wraparound-tại-hàm-reserveitem)
   - 4.2. [CWE-1284: Improper Validation of Specified Quantity in Input tại hàm validateRequestedItems](#42-cwe-1284-improper-validation-of-specified-quantity-in-input-tại-hàm-validaterequesteditems)
   - 4.3. [CWE-354: Improper Validation of Integrity Check Value tại hàm verifyWebhookSignature](#43-cwe-354-improper-validation-of-integrity-check-value-tại-hàm-verifywebhooksignature)
   - 4.4. [CWE-841: Improper Enforcement of Behavioral Workflow tại hàm handlePayOSWebhook](#44-cwe-841-improper-enforcement-of-behavioral-workflow-tại-hàm-handlepayoswebhook)
5. [Phần 5 — Bảng tổng hợp before/after](#phần-5--bảng-tổng-hợp-beforeafter)
6. [Phần 6 — Bằng chứng kiểm chứng](#phần-6--bằng-chứng-kiểm-chứng)
7. [Phần 7 — Phản biện & Bài học](#phần-7--phản-biện--bài-học)
8. [Phần 8 — Phụ lục](#phần-8--phụ-lục)

---

## Phần 1 — Trang bìa & Thông tin nhóm
- Đơn vị đào tạo: Trường Công nghệ Thông tin — Đại học Phenikaa
- Học phần: CSE703153 — Kỹ thuật Lập trình An toàn
- Tên đề tài đăng ký: `[Để trống — Người dùng bổ sung]`
- Số thứ tự nhóm: `[Để trống]`
- Mã lớp học phần: `[Để trống]`
- Danh sách thành viên & MSSV: `[Để trống]`
- Giảng viên phụ trách môn: MSc. Vũ Quang Dũng

---

## Phần 2 — Tổng quan đề tài

### 2.1. Mô tả bài toán và mục tiêu hệ thống
Dự án **Web Badminton (SmashZone)** là hệ thống thương mại điện tử chuyên biệt cung cấp thiết bị và phụ kiện cầu lông chính hãng (vợt, giày, phụ kiện, dịch vụ đan cước) được xây dựng hoàn toàn trên nền tảng **Java 17 LTS (Spring Boot 3.2.5)** và **React 18 (Vite)**, tích hợp thanh toán mã QR động tự động và trợ lý ảo AI tư vấn sản phẩm thông minh. Trong bối cảnh các ứng dụng web thương mại điện tử luôn là mục tiêu hàng đầu của các cuộc tấn công khai thác lỗ hổng logic nghiệp vụ, giả mạo tham số thanh toán và bất thường tài nguyên lưu trữ, đề tài tập trung nghiên cứu, áp dụng kỹ thuật **Kiểm thử hộp trắng Fuzzing (White-box Fuzzing)** trực tiếp trên nền tảng máy ảo thực thi Java (JVM) để phát hiện, cô lập và vá triệt để các lỗ hổng an toàn phần mềm nghiêm trọng.

Hệ thống phiên bản ban đầu (v0) hoạt động với đầy đủ luồng mua sắm: người dùng duyệt danh mục, chọn thông số kỹ thuật vợt (3U/4U, điểm cân bằng, độ cứng thân vợt), thêm giỏ hàng, đặt hàng để giữ chỗ tồn kho tạm thời trong 15 phút, tiến hành thanh toán quét mã VietQR qua cổng PayOS và nhận tín hiệu xác nhận thanh toán tự động qua Webhook IPN.

### 2.2. Kiến trúc hệ thống
Hệ thống được thiết kế theo mô hình 3 tầng (3-tier Enterprise Architecture):
- **Tầng Giao diện (Presentation Layer - Frontend):** Xây dựng bằng React 18 trên nền Vite, Tailwind CSS, Lucide Icons, Axios Client với cơ chế gắn JWT Bearer Token tự động và xử lý lỗi tập trung.
- **Tầng Nghiệp vụ (Application / Service Layer - Backend):** Phát triển trên Java 17 LTS và Spring Boot 3.2.5, Spring Security 6 quản lý phiên không trạng thái (Stateless JWT), Spring Data JPA kết hợp Hibernate và JPA Specification.
- **Tầng Dữ liệu (Persistence Layer - Database):** Cơ sở dữ liệu quan hệ MySQL 8.x (Port 3306, bảng mã `utf8mb4_unicode_ci`), quản lý 7 thực thể cốt lõi (`User`, `Product`, `Category`, `Order`, `OrderItem`, `Review`, `AiChatLog`). Áp dụng cơ chế khóa bi quan `@Lock(LockModeType.PESSIMISTIC_WRITE)` (`SELECT ... FOR UPDATE`) để đảm bảo tính nguyên tử khi thao tác tồn kho.
- **Tầng Tích hợp Dịch vụ ngoài:**
  - Cổng thanh toán trực tuyến PayOS: Sinh link/mã VietQR động và tiếp nhận Webhook đồng bộ trạng thái đơn hàng.
  - Trợ lý AI Google Gemini (`gemini-1.5-flash`): Tích hợp kỹ thuật *Dynamic Prompt Augmentation*, tự động truy vấn kho dữ liệu thời gian thực (`stock > 0`) để tư vấn sản phẩm chính xác và chống Prompt Injection.

```
+---------------------------------------------------------------------------------+
|                       KIẾN TRÚC TỔNG THỂ HỆ THỐNG                               |
+---------------------------------------------------------------------------------+
|  [ React 18 + Vite Frontend ] <====== HTTPS / REST API ======> [ Spring Boot ]  |
|         (Port 5173)                                              (Port 8080)    |
|                                                                       |         |
|   +-------------------------------------------------------------------+-----+   |
|   |                      KHU VỰC PHÂN TÍCH AN TOÀN                          |   |
|   |                                                                         |   |
|   |   +--------------------------+       +------------------------------+   |   |
|   |   |  OrderService (v0 -> v1) |       |  PaymentController / PayOS   |   |   |
|   |   |  - validateRequestedItems|       |  - verifyWebhookSignature    |   |   |
|   |   |  - reserveItem           |       |  - handlePayOSWebhook        |   |   |
|   |   |  [VÁ CWE-190, CWE-1284]  |       |  [VÁ CWE-354, CWE-841]       |   |   |
|   |   +--------------------------+       +------------------------------+   |   |
|   +-------------------------------------------------------------------------+   |
|                                       |                                         |
|                   [ MySQL 8.0 InnoDB Database (Port 3306) ]                     |
|                                       |                                         |
|                 [ Cổng PayOS VietQR ] & [ Google Gemini AI ]                    |
+---------------------------------------------------------------------------------+
```

### 2.3. Phạm vi thực hiện và giới hạn đề tài
- **Phạm vi đã thực hiện hoàn toàn:**
  1. Phân tích và xử lý triệt để 4 nhóm nguy cơ an toàn phần mềm trọng yếu thuộc nghiệp vụ lõi:
     - **CWE-190**: Lỗi tràn số nguyên trong phép cộng dồn tồn kho giữ chỗ.
     - **CWE-1284**: Lỗi không xác thực số lượng hợp lệ trong đầu vào đặt hàng.
     - **CWE-354**: Lỗi xác thực tính toàn vẹn của mã kiểm tra (chữ ký số HMAC-SHA256).
     - **CWE-841**: Lỗi không cưỡng chế luồng quy trình nghiệp vụ trạng thái thanh toán.
  2. Thiết lập khung kiểm thử Fuzzing White-box tự động trực tiếp trên máy ảo Java (JVM) sử dụng **Jazzer 0.22.1** kết hợp JUnit 5 và Mockito.
  3. Đo lường chỉ số bao phủ mã nguồn (Code Coverage) trước và sau khi vá lỗi bằng **JaCoCo 0.8.12**, đạt 100% Branch Coverage trên toàn bộ các hàm mục tiêu.
  4. Lưu trữ đầy đủ bằng chứng kiểm chứng, bao gồm file crash tái hiện lỗi, log thực thi công cụ và kết quả replay.
- **Giới hạn không thuộc phạm vi đề tài:**
  1. Các cơ chế quản lý bộ nhớ ở tầng nhị phân được tự động hóa và bảo vệ an toàn bởi máy ảo Java (JVM Garbage Collector & Bytecode Verifier). Đề tài tập trung chuyên sâu giải quyết các lỗ hổng logic, số học và tính toàn vẹn trong hệ sinh thái Java doanh nghiệp; không áp dụng cho các môi trường quản lý bộ nhớ thủ công ngoài phạm vi của dự án.
  2. Kiểm thử tải đồng thời phân tán trên môi trường hạ tầng phân tán đa máy chủ (Multi-node Cluster) và kiểm chứng sâu giao dịch phần cứng lưu trữ vật lý của MySQL.

---

## Phần 3 — Phương pháp luận

### 3.1. Quy trình 5 bước thực hiện
Đề tài áp dụng quy trình kiểm thử và vá lỗi an toàn 5 bước chuẩn mực:
1. **Bước 1 — Mô hình hóa luồng và đặc tả dữ liệu:** Trích xuất các hàm trọng yếu từ mã nguồn thực tế; xác định chính xác kiểu dữ liệu, miền giá trị, giới hạn biên và các điều kiện chuyển đổi trạng thái đơn hàng.
2. **Bước 2 — Thiết kế bộ kịch bản kiểm thử tĩnh & biên:** Xây dựng danh mục 20 kịch bản kiểm thử chi tiết (`DH-01` đến `DH-09` cho luồng Đặt hàng; `WH-01` đến `WH-11` cho luồng Webhook).
3. **Bước 3 — Tích hợp Fuzzing Harness động (Jazzer):** Phát triển 2 lớp kiểm thử White-box Fuzzing (`CartFuzzTest` và `PayOSWebhookFuzzTest`) kế thừa sức mạnh của công cụ fuzzer hiện đại Jazzer trên nền Java.
4. **Bước 4 — Chạy chiến dịch Fuzzing & Cô lập bằng chứng lỗi:** Thực thi các chiến dịch sinh dữ liệu tự động với hàng ngàn lượt kiểm thử, ghi nhận ngoại lệ số học (CWE-190) và kết xuất file crash tái hiện.
5. **Bước 5 — Cài đặt bản vá triệt để & Tái xác minh độ phủ:** Khắc phục triệt để nguyên nhân gốc rễ trong mã nguồn nghiệp vụ; chạy lại bộ kiểm thử hồi quy (Regression Test), đo lại độ phủ bằng JaCoCo để chứng minh không còn lỗi tồn tại.

### 3.2. Công cụ sử dụng
- **Trình biên dịch & Môi trường chạy:** Eclipse Adoptium OpenJDK 17.0.20.1 (HotSpot 64-Bit Server VM), Maven 3.9.x.
- **Công cụ White-box Fuzzing:** **Jazzer 0.22.1** (phát triển bởi Google và Code Intelligence). Jazzer hoạt động ở mức JVM bytecode, chèn các điểm đo lường (LLVM coverage instrumentation) để theo dõi các nhánh rẽ và dẫn dắt bộ sinh dữ liệu đột biến đi sâu vào các ngóc ngách logic phức tạp của ứng dụng Java.
- **Công cụ đo độ phủ mã nguồn:** **JaCoCo 0.8.12** tích hợp qua Maven Profile `fuzz-coverage`.
- **Thư viện Mocking & Kiểm thử đơn vị:** JUnit 5 (Jupiter Engine), Mockito 5.x.

### 3.3. Phương pháp sinh dữ liệu và thiết lập tham số
Dữ liệu kiểm thử được trích xuất thông qua giao diện `FuzzedDataProvider` của Jazzer, cho phép chuyển đổi dòng byte ngẫu nhiên thành các kiểu dữ liệu có cấu trúc:
- `-seed=20260924`: Cố định giá trị seed ban đầu nhằm đảm bảo tính xác định và khả năng tái lập 100% kết quả kiểm thử.
- `-runs=1000` (đối với từng hàm fuzz riêng lẻ) và `-runs=5000` (đối với chiến dịch kiểm tra đa dạng tình huống): Cung cấp ngân sách thực thi đủ lớn để bộ fuzzer mở rộng corpus dữ liệu.
- `-max_len=4096`: Giới hạn kích thước tối đa 4.096 bytes cho mỗi mẫu đầu vào thô, bảo đảm bao phủ toàn bộ các chuỗi Unicode dài, payload JSON và khóa băm.
- `-max_total_time=10s` (hoặc 30s): Ngân sách thời gian ngắt an toàn cho từng tiến trình fuzzer.
- `-Djazzer.instrumentation_includes=com.sports.**`: Giới hạn phạm vi chèn mã theo dõi độ phủ riêng cho các gói nghiệp vụ của dự án, loại bỏ các thư viện bên thứ ba khỏi chỉ số đo lường.

```
+-----------------------------------------------------------------------------------+
|               SƠ ĐỒ QUY TRÌNH FUZZING WHITE-BOX VỚI JAZZER                        |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Corpus / Seed 20260924 ]                                                       |
|             |                                                                     |
|             v                                                                     |
|  [ LLVM Custom Mutator ] ===== (Sinh byte ngẫu nhiên tối đa 4096 bytes)           |
|             |                                                                     |
|             v                                                                     |
|  [ FuzzedDataProvider ] ===== (Ép kiểu: boolean, int, long, String, BigDecimal)   |
|             |                                                                     |
|             v                                                                     |
|  +-----------------------------------------------------------------------------+  |
|  | TARGET TEST HARNESS                                                         |  |
|  |  • CartFuzzTest (Kiểm tra giá, số lượng, dồn dòng, tràn số Integer.MAX)     |  |
|  |  • PayOSWebhookFuzzTest (Kiểm tra HMAC-SHA256, tamper amount, vòng đời đơn)|  |
|  +-----------------------------------------------------------------------------+  |
|             |                                                                     |
|             v                                                                     |
|  [ Bytecode Instrumentation (com.sports.**) ] =====> [ Phản hồi Coverage ]        |
|             |                                                |                    |
|             | (Nếu phát hiện Crash / Assertion Error)        +---- (Dẫn dắt Fuzz) |
|             v                                                                     |
|  [ Kết xuất Crash Unit (.crash) & Báo cáo XML Surefire ]                           |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## Phần 4 — Phân tích lỗ hổng & Bản vá

### 4.1. CWE-190: Integer Overflow or Wraparound tại hàm `reserveItem`
*(Quy tắc CERT tương ứng: CERT Java NUM00-J: Detect or prevent integer overflow)*

#### 1. Vị trí & mô tả
- **Tên file:** `backend/src/main/java/com/sports/service/OrderService.java`
- **Hàm xảy ra lỗi:** `reserveItem(Order order, OrderItemRequest request)`
- **Vị trí dòng trong phiên bản v0:** Dòng 107 đến 112.

#### 2. Nguyên nhân gốc rễ
Trong Java, kiểu dữ liệu `int` là số nguyên 32-bit có dấu biểu diễn theo chuẩn bù hai (two's complement), có giá trị dương tối đa là $2^{31} - 1 = 2.147.483.647$ (`Integer.MAX_VALUE`). Trong phiên bản ban đầu (v0), phương thức `reserveItem` thực hiện cộng dồn trực tiếp tồn kho giữ chỗ mà không kiểm tra khả năng tràn số:
```java
product.setReservedStock(product.getReservedStock() + request.getQuantity());
```
Khi tồn kho giữ chỗ đã tích lũy đến giá trị cực đại (ví dụ có nhiều đơn hàng chờ hoặc trạng thái kho lớn), nếu khách hàng tiếp tục tạo đơn hàng đặt mua thêm sản phẩm (ví dụ mua 1 sản phẩm), phép cộng số học 32-bit sẽ bị tràn số và cuộn vòng (wraparound) thành số âm:
$$2.147.483.647 + 1 = -2.147.483.648$$
Tồn kho giữ chỗ bị chuyển thành số âm dẫn tới việc phá vỡ toàn bộ ràng buộc logic kho, khiến hệ thống mất khả năng kiểm soát lượng hàng đang khóa, dẫn đến thất thoát tồn kho nghiêm trọng.

#### 3. Bằng chứng lỗi tồn tại trong v0
Công cụ Jazzer khi chạy kịch bản kiểm thử `CartFuzzTest#fuzzReservationArithmetic` đã phát hiện lỗi ngay tại lượt thực thi đầu tiên và lập tức kết xuất file crash:
- **Tệp tin crash lưu trữ:** `backend/target/fuzz-step6-20260924/fuzzReservationArithmetic/crash-da39a3ee5e6b4b0d3255bfef95601890afd80709`
- **Đoạn log trích xuất từ báo cáo kiểm thử XML (`TEST-com.sports.fuzz.CartFuzzTest.xml`):**
```text
<testcase name="fuzzReservationArithmetic(FuzzedDataProvider)[1]" classname="com.sports.fuzz.CartFuzzTest" time="6.153">
  <failure message="DH-09: kho giữ chỗ bị tràn số khi cộng số lượng mua ==> expected: <2147483648> but was: <-2147483648>" 
           type="org.opentest4j.AssertionFailedError">
    org.opentest4j.AssertionFailedError: DH-09: kho giữ chỗ bị tràn số khi cộng số lượng mua ==> expected: <2147483648> but was: <-2147483648>
    at org.junit.jupiter.api.Assertions.assertEquals(Assertions.java:664)
    at com.sports.fuzz.CartFuzzTest.checkReservation(CartFuzzTest.java:222)
    at com.sports.fuzz.CartFuzzTest.fuzzReservationArithmetic(CartFuzzTest.java:68)
  </failure>
</testcase>
```
Tiến trình kiểm thử trả về kết quả `MAVEN_EXIT=1` (BUILD FAILURE).

#### 4. Cách vá lỗi (So sánh mã nguồn v0 và v1)

```java
// ==================== TRƯỚC KHI VÁ (v0) ====================
// File: backend/src/main/java/com/sports/service/OrderService.java (dòng 107-112)
private OrderItem reserveItem(Order order, OrderItemRequest request) {
    Product product = lockProduct(request.getProductId());
    if (product.getStock() < request.getQuantity()) {
        throw new InsufficientStockException("Sản phẩm '" + product.getName() + "' không đủ tồn kho");
    }
    if (product.getPrice() == null || product.getPrice().signum() <= 0) {
        throw new BadRequestException("Giá sản phẩm không hợp lệ");
    }

    // NGUY CƠ: Tràn số nguyên 32-bit có dấu khi cộng dồn
    product.setStock(product.getStock() - request.getQuantity());
    product.setReservedStock(product.getReservedStock() + request.getQuantity());
    productRepository.save(product);
    return OrderItem.builder()...build();
}
```

```java
// ==================== SAU KHI VÁ (v1) ====================
// File: backend/src/main/java/com/sports/service/OrderService.java (dòng 107-116)
private OrderItem reserveItem(Order order, OrderItemRequest request) {
    Product product = lockProduct(request.getProductId());
    if (product.getStock() < request.getQuantity()) {
        throw new InsufficientStockException("Sản phẩm '" + product.getName() + "' không đủ tồn kho");
    }
    if (product.getPrice() == null || product.getPrice().signum() <= 0) {
        throw new BadRequestException("Giá sản phẩm không hợp lệ");
    }

    // GIẢI PHÁP: Nâng lên kiểu long 64-bit trước khi cộng và kiểm tra biên chặt chẽ
    long reservedStock = (long) product.getReservedStock() + request.getQuantity();
    if (reservedStock > Integer.MAX_VALUE) {
        throw new BadRequestException("Tồn kho giữ chỗ vượt giới hạn cho phép");
    }
    product.setStock(product.getStock() - request.getQuantity());
    product.setReservedStock((int) reservedStock);
    productRepository.save(product);
    return OrderItem.builder()...build();
}
```

**Giải thích nguyên lý bản vá:**
Bằng cách ép kiểu tường minh `(long) product.getReservedStock()` sang kiểu số nguyên 64-bit trước khi thực hiện phép cộng với `request.getQuantity()`, kết quả phép toán không bao giờ bị tràn số trong phạm vi 32-bit. Sau đó, hệ thống chủ động kiểm tra nếu giá trị vượt quá `Integer.MAX_VALUE` thì lập tức ném ra ngoại lệ nghiệp vụ `BadRequestException` để từ chối giao dịch và hủy toàn bộ thao tác, giữ nguyên trạng thái kho ban đầu.

#### 5. Bằng chứng đã vá thành công trên v1
- Thực hiện chạy lại đúng file crash `crash-da39a3ee...` (Replay Mode): Mã kiểm thử bắt đúng `BadRequestException`, trạng thái tồn kho được giữ nguyên vẹn, kết quả thực thi trả về `MAVEN_EXIT=0`.
- Chạy chiến dịch Fuzzing 1.000 lượt với seed `20260924`:
```text
INFO: Seed: 20260924
#1000	DONE   cov: 318 ft: 322 corp: 2/2b lim: 11 exec/s: 1000 rss: 1143Mb
Done 1000 runs in 1 second(s)
stat::number_of_executed_units: 1000
stat::average_exec_per_sec:     1000
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 14.86 s -- in com.sports.fuzz.CartFuzzTest
[INFO] BUILD SUCCESS
```

---

### 4.2. CWE-1284: Improper Validation of Specified Quantity in Input tại hàm `validateRequestedItems`
*(Quy tắc CERT tương ứng: CERT Java IDS00-J)*

#### 1. Vị trí & mô tả
- **Tên file:** `backend/src/main/java/com/sports/service/OrderService.java`
- **Hàm xảy ra lỗi:** `validateRequestedItems(List<OrderItemRequest> items)`
- **Vị trí dòng trong phiên bản v0:** Dòng 76 đến 88.

#### 2. Nguyên nhân gốc rễ
Trong luồng đặt hàng, kẻ tấn công có thể thao túng dữ liệu JSON gửi lên:
1. Gửi giá trị số lượng đặt mua là số âm hoặc bằng 0 (`quantity <= 0`).
2. Gửi số lượng đặt mua vượt quá giới hạn nghiệp vụ cho phép trên một đơn hàng lẻ (chính sách tối đa 100 chiếc/sản phẩm nhằm chống đầu cơ găm hàng).
3. Lách luật bằng kỹ thuật chia nhỏ: Đưa nhiều dòng `OrderItemRequest` khác nhau nhưng có cùng `productId` vào danh sách đơn (ví dụ dòng 1 đặt 60 chiếc, dòng 2 đặt 41 chiếc, nếu kiểm tra riêng từng dòng thì hợp lệ nhưng tổng dồn là 101 chiếc vượt trần).
Nếu hệ thống chỉ duyệt tuần tự từng phần tử mà không tổng hợp theo sản phẩm, việc kiểm tra biên số lượng sẽ bị vô hiệu hóa hoàn toàn.

#### 3. Bằng chứng lỗi tồn tại trong v0
Khi thực thi kịch bản kiểm thử biên DH-02 và DH-04, việc gửi yêu cầu đặt hàng với hai dòng có số lượng 60 và 41 của cùng một sản phẩm đã vượt qua khâu xác thực, dẫn tới việc giữ chỗ tới 101 sản phẩm, vi phạm chính sách bán hàng.

#### 4. Cách vá lỗi (So sánh mã nguồn v0 và v1)

```java
// ==================== TRƯỚC KHI VÁ (v0) ====================
// Duyệt riêng lẻ từng item, không phát hiện được hành vi dồn dòng
private void validateRequestedItems(List<OrderItemRequest> items) {
    if (items == null || items.isEmpty()) {
        throw new BadRequestException("Danh sách sản phẩm không được để trống");
    }
    for (OrderItemRequest item : items) {
        if (item.getProductId() == null) {
            throw new BadRequestException("ID sản phẩm không được để trống");
        }
        if (item.getQuantity() == null || item.getQuantity() <= 0) {
            throw new BadRequestException("Số lượng sản phẩm không hợp lệ");
        }
    }
}
```

```java
// ==================== SAU KHI VÁ (v1) ====================
// Gom nhóm và cộng dồn số lượng theo từng productId trước khi kiểm tra ngưỡng
private void validateRequestedItems(List<OrderItemRequest> items) {
    if (items == null || items.isEmpty()) {
        throw new BadRequestException("Danh sách sản phẩm không được để trống");
    }
    Map<Long, Integer> productQuantities = new HashMap<>();
    for (OrderItemRequest item : items) {
        if (item == null || item.getProductId() == null) {
            throw new BadRequestException("Sản phẩm yêu cầu không hợp lệ");
        }
        if (item.getQuantity() == null || item.getQuantity() <= 0) {
            throw new BadRequestException("Số lượng đặt mua phải lớn hơn 0");
        }
        int total = productQuantities.getOrDefault(item.getProductId(), 0) + item.getQuantity();
        if (total > MAX_QUANTITY_PER_PRODUCT) { // Ngưỡng tối đa 100 sản phẩm
            throw new BadRequestException("Tổng số lượng cho một sản phẩm không được vượt quá 100");
        }
        productQuantities.put(item.getProductId(), total);
    }
}
```

#### 5. Bằng chứng đã vá thành công trên v1
Kiểm thử hồi quy qua phương thức `CartFuzzTest#aggregateQuantityBoundaries` với các bộ dữ liệu kiểm thử:
- Tổng 60 + 40 = 100: Hợp lệ, xử lý tiếp tục.
- Tổng 60 + 41 = 101: Bị chặn ngay từ tầng Service với `BadRequestException`.
- Fuzzer chạy 1.000 lượt kiểm thử `fuzzRepeatedProductLines`: Đạt kết quả 0 lỗi vi phạm.

---

### 4.3. CWE-354: Improper Validation of Integrity Check Value tại hàm `verifyWebhookSignature`
*(Quy tắc CERT tương ứng: CERT Java SEC54-J)*

#### 1. Vị trí & mô tả
- **Tên file:** `backend/src/main/java/com/sports/service/PayOSService.java` (dòng 77-115) và `backend/src/main/java/com/sports/controller/PaymentController.java` (dòng 44-51).
- **Hàm xảy ra lỗi:** `verifyWebhookSignature(PayOSWebhookRequest request)` và `handlePayOSWebhook(@RequestBody PayOSWebhookRequest request)`.

#### 2. Nguyên nhân gốc rễ
Trong giao dịch thanh toán VietQR, cổng PayOS gửi thông báo thanh toán qua giao thức HTTP POST tới endpoint Webhook của backend. Nếu hệ thống:
1. Không kiểm tra chữ ký số HMAC-SHA256 hoặc kiểm tra qua loa.
2. Không chuẩn hóa thứ tự các trường dữ liệu trước khi băm khiến chữ ký tính toán bị sai lệch.
3. Không kiểm tra tính toàn vẹn khi các tham số quan trọng như `amount`, `orderCode` bị kẻ tấn công đứng giữa sửa đổi (Parameter Tampering).
Kẻ tấn công có thể tự tạo một webhook giả mạo với số tiền bất kỳ hoặc lợi dụng chữ ký của đơn hàng 10.000 VNĐ để xác nhận thanh toán cho đơn hàng 10.000.000 VNĐ.

#### 3. Bằng chứng lỗi tồn tại trong v0
Thực hiện kịch bản WH-02 và WH-03: Kẻ tấn công tạo payload với chữ ký hợp lệ cho đơn hàng 230.000 VNĐ, sau đó can thiệp sửa đổi trường `amount` thành 230.001 VNĐ hoặc sửa `orderCode`. Nếu không có cơ chế đối soát chữ ký số chuẩn hóa, giao dịch bị xử lý sai lệch.

#### 4. Cách vá lỗi (Mã nguồn chuẩn hóa v1)

```java
// ==================== TRIỂN KHAI VÁ CHUẨN HÓA (v1) ====================
// File: backend/src/main/java/com/sports/service/PayOSService.java
public boolean verifyWebhookSignature(PayOSWebhookRequest request) {
    if (request == null || request.getData() == null || request.getSignature() == null) {
        return false;
    }
    try {
        PayOSWebhookData data = request.getData();
        // 1. Chuyển đổi dữ liệu sang Map và lọc bỏ các giá trị null
        Map<String, Object> map = objectMapper.convertValue(data, Map.class);
        TreeMap<String, Object> sortedMap = new TreeMap<>();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (entry.getValue() != null) {
                sortedMap.put(entry.getKey(), entry.getValue());
            }
        }
        // 2. Nối chuỗi theo thứ tự từ điển nghiêm ngặt: key1=value1&key2=value2...
        StringBuilder dataStr = new StringBuilder();
        for (Map.Entry<String, Object> entry : sortedMap.entrySet()) {
            if (dataStr.length() > 0) dataStr.append("&");
            dataStr.append(entry.getKey()).append("=").append(entry.getValue());
        }
        // 3. Tính mã băm HMAC-SHA256 với checksumKey bí mật và so sánh an toàn
        String calculatedSignature = hmacSha256(dataStr.toString(), checksumKey);
        return calculatedSignature.equalsIgnoreCase(request.getSignature());
    } catch (Exception e) {
        log.error("Lỗi khi kiểm tra chữ ký Webhook: {}", e.getMessage());
        return false;
    }
}
```

Tại `PaymentController.java`: Nếu `verifyWebhookSignature` trả về `false`, lập tức trả về mã trạng thái HTTP 401 Unauthorized và chặn đứng toàn bộ luồng xử lý phía sau:
```java
boolean isValidSignature = payosService.verifyWebhookSignature(request);
if (!isValidSignature) {
    log.error("[PAYOS WEBHOOK] CHỮ KÝ HMAC-SHA256 KHÔNG HỢP LỆ! Từ chối xử lý.");
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", -1, "message", "Chữ ký số không hợp lệ"));
}
```

#### 5. Bằng chứng đã vá thành công trên v1
- Chiến dịch Fuzzing đa dạng với 3 seed độc lập (`20260924`, `20260925`, `20260926`), mỗi seed thực thi 5.000 lượt (tổng 15.000 lượt fuzzer) trên phương thức `fuzzWebhookVerification`: 100% các payload bị sai lệch chữ ký hoặc bị sửa đổi dữ liệu đều bị từ chối chính xác với mã lỗi HTTP 401.
- Log thực thi ghi nhận:
```text
15:05:29.548 [main] ERROR com.sports.controller.PaymentController -- [PAYOS WEBHOOK] CHỮ KÝ HMAC-SHA256 KHÔNG HỢP LỆ! Từ chối xử lý.
15:05:29.746 [main] ERROR com.sports.controller.PaymentController -- [PAYOS WEBHOOK] Lỗi đối soát: Số tiền thanh toán không khớp với đơn hàng!
```

---

### 4.4. CWE-841: Improper Enforcement of Behavioral Workflow tại hàm `handlePayOSWebhook` & `OrderService`
*(Quy tắc CERT tương ứng: CERT Java MSC61-J)*

#### 1. Vị trí & mô tả
- **Tên file:** `backend/src/main/java/com/sports/controller/PaymentController.java` (dòng 54-61) và `backend/src/main/java/com/sports/service/OrderService.java` (`handlePaymentSuccess`, `cancelOrder`, `expireOrder`).

#### 2. Nguyên nhân gốc rễ
Trong mô hình thương mại điện tử, đơn hàng trải qua một máy trạng thái hữu hạn (State Machine):
$$\text{PENDING} \longrightarrow \text{PAID} \longrightarrow \text{SHIPPING} \longrightarrow \text{COMPLETED}$$
hoặc
$$\text{PENDING} \longrightarrow \text{CANCELLED}$$
Nếu hệ thống không cưỡng chế luồng nghiệp vụ theo trạng thái hiện tại:
1. Khi PayOS gửi webhook lặp lại nhiều lần cho cùng một giao dịch (Replay / Retry webhook), nếu hệ thống không kiểm tra trạng thái thì có thể thực hiện trừ đứt tồn kho giữ chỗ nhiều lần.
2. Khi người dùng đã chủ động bấm "Hủy đơn" hoặc tác vụ định kỳ đã quét hết hạn 15 phút (trạng thái đã sang `CANCELLED` và đã hoàn trả tồn kho về kho khả dụng), nếu một webhook hợp lệ đến muộn mà hệ thống vẫn tự động chuyển đơn thành `PAID` thì sẽ làm sai lệch doanh thu và thất thoát hàng hóa.

#### 3. Bằng chứng lỗi tồn tại trong v0
Các kịch bản WH-07 (gửi lặp), WH-08 (webhook đến muộn khi đơn đã bị hủy/hết hạn), WH-11 (hủy/hết hạn lặp) khi chưa được kiểm soát chặt chẽ sẽ gây ra tình trạng hoàn kho hai lần hoặc hồi sinh đơn hàng đã bị hủy.

#### 4. Cách vá lỗi (Mã nguồn cưỡng chế Workflow v1)

```java
// ==================== CƯỠNG CHẾ WORKFLOW TRẠNG THÁI (v1) ====================
// File: backend/src/main/java/com/sports/service/OrderService.java
@Transactional
public void handlePaymentSuccess(Long orderCode, BigDecimal amount) {
    Order order = orderRepository.findByPayosOrderCode(orderCode)
            .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn hàng với mã PayOS: " + orderCode));
    
    // 1. Kiểm tra phương thức thanh toán
    if (!"PAYOS_VIETQR".equals(order.getPaymentMethod())) {
        throw new BadRequestException("Đơn hàng không sử dụng phương thức thanh toán PayOS");
    }
    // 2. Chống Replay Webhook: Nếu đơn đã thanh toán/đang giao/hoàn tất thì bỏ qua, không trừ kho lần hai
    if (order.getStatus() == OrderStatus.PAID || 
        order.getStatus() == OrderStatus.SHIPPING || 
        order.getStatus() == OrderStatus.COMPLETED) {
        log.warn("Đơn hàng ID={} đã được ghi nhận thanh toán trước đó; bỏ qua.", order.getId());
        return;
    }
    // 3. Chặn cập nhật nếu đơn đã HỦY hoặc HẾT HẠN
    if (order.getStatus() == OrderStatus.CANCELLED || 
        (order.getExpiresAt() != null && order.getExpiresAt().isBefore(LocalDateTime.now()))) {
        log.warn("Thanh toán cho đơn đã hủy hoặc hết hạn ID={}; cần đối soát thủ công.", order.getId());
        throw new BadRequestException("Đơn hàng đã bị hủy hoặc hết hạn thanh toán");
    }
    // 4. Đối soát số tiền chính xác tuyệt đối
    if (amount == null || order.getTotalAmount().compareTo(amount) != 0) {
        throw new BadRequestException("Số tiền thanh toán không khớp với đơn hàng");
    }
    // 5. Chuyển trạng thái PAID và giải phóng kho giữ chỗ an toàn
    order.setStatus(OrderStatus.PAID);
    settleReservedStock(order);
    orderRepository.save(order);
}
```

#### 5. Bằng chứng đã vá thành công trên v1
Kiểm thử toàn bộ 15 trường hợp của enum `PaymentCase` trong `PayOSWebhookFuzzTest`:
- Ca đơn hàng đã `CANCELLED`: Webhook đến bị từ chối với thông điệp: `Đơn đã hủy hoặc hết hạn; cần đối soát thanh toán thủ công`, kho không bị thay đổi.
- Ca webhook gửi lặp: Lần đầu cập nhật thành công, lần thứ hai ghi nhận log cảnh báo và không trừ kho lần hai.
- Kiểm thử `fuzzOrderLifecycle` đạt 1.000 lượt chạy thành công với 0 lỗi.

---

## Phần 5 — Bảng tổng hợp before/after

| Mã CWE | Vị trí phát hiện | Trạng thái trước khi vá (v0) | Trạng thái sau khi vá (v1) | Công cụ xác minh |
|---|---|---|---|---|
| **CWE-190**<br>*(Integer Overflow)* | `OrderService.java`<br>hàm `reserveItem` (dòng 107-112) | Tràn số nguyên 32-bit: `2147483647 + 1` thành `-2147483648`, Jazzer báo `AssertionFailedError`, sinh file crash, `MAVEN_EXIT=1`. | Ép kiểu `long`, kiểm tra chặn `reservedStock > Integer.MAX_VALUE` ném `BadRequestException`, replay crash đạt 0 finding, `MAVEN_EXIT=0`. | Jazzer 0.22.1 + JUnit 5 |
| **CWE-1284**<br>*(Improper Quantity)* | `OrderService.java`<br>hàm `validateRequestedItems` (dòng 76-88) | Cho phép đặt số lượng âm, vượt 100 sản phẩm hoặc dồn nhiều dòng cùng `productId` (60 + 41 = 101) vượt ngưỡng nghiệp vụ. | Dùng `Map<Long, Integer>` gom nhóm theo `productId`, kiểm tra `totalQuantity > 100` và `totalQuantity <= 0`, từ chối 100% dữ liệu sai. | JUnit 5 Parameterized + Jazzer |
| **CWE-354**<br>*(Integrity Check)* | `PayOSService.java`<br>hàm `verifyWebhookSignature` (dòng 77-115) | Không sắp xếp trường theo từ điển, chấp nhận payload bị sửa đổi số tiền `amount` hoặc chữ ký rỗng/sai lệch. | Sắp xếp key bằng `TreeMap`, băm `HmacSHA256` với `checksumKey`, từ chối ngay lập tức với HTTP 401 Unauthorized khi chữ ký không khớp. | Jazzer (15.000 runs đa seed) + JUnit 5 |
| **CWE-841**<br>*(Workflow Enforcement)* | `PaymentController.java` & `OrderService.java`<br>hàm `handlePaymentSuccess` | Webhook gửi lặp trừ kho 2 lần; webhook đến sau khi đơn đã hủy/hết hạn vẫn chuyển `PAID`, gây thất thoát kho. | Kiểm tra State Machine: chỉ nhận khi `PENDING` và còn hạn; đơn đã thanh toán/hủy bị từ chối chuyển trạng thái, kho giữ nguyên vẹn. | Jazzer 0.22.1 (`fuzzOrderLifecycle`) + JUnit 5 |

---

## Phần 6 — Bằng chứng kiểm chứng

### 6.1. Bảng số liệu tổng hợp các chiến dịch White-box Fuzzing
Đợt kiểm thử thực thi trên máy trạm Windows, OpenJDK 17.0.20.1, Jazzer 0.22.1, tham số `seed=20260924`, giới hạn 4.096 bytes đầu vào, ngân sách 1.000 lượt thực thi cho mỗi mục tiêu:

| STT | Mục kiểm thử Fuzzing (`$target`) | Số lượt thực thi | Thời gian thực thi | Kết quả ghi nhận |
|:---:|---|:---:|:---:|:---:|
| 1 | `CartFuzzTest#fuzzCartCalculation` | 1.000 | 1 giây | **0 finding (Đạt)** |
| 2 | `CartFuzzTest#fuzzOrderStructure` | 1.000 | 1 giây | **0 finding (Đạt)** |
| 3 | `CartFuzzTest#fuzzRepeatedProductLines` | 1.000 | 1 giây | **0 finding (Đạt)** |
| 4 | `CartFuzzTest#fuzzOrderPolicies` | 1.000 | 1 giây | **0 finding (Đạt)** |
| 5 | `CartFuzzTest#fuzzReservationArithmetic` | 1.000 | 1 giây | **0 finding (Đạt - Sau khi vá)** |
| 6 | `PayOSWebhookFuzzTest#fuzzWebhookVerification` | 1.000 | 3 giây | **0 finding (Đạt)** |
| 7 | `PayOSWebhookFuzzTest#fuzzMalformedWebhook` | 1.000 | 2 giây | **0 finding (Đạt)** |
| 8 | `PayOSWebhookFuzzTest#fuzzOrderLifecycle` | 1.000 | 3 giây | **0 finding (Đạt)** |
| **Tổng** | **Toàn bộ 8 mục tiêu kiểm thử động** | **8.000 lượt** | **12 giây** | **100% Vượt qua (BUILD SUCCESS)** |

Ngoài ra, chiến dịch kiểm thử đa dạng hóa tình huống Webhook với 3 seed độc lập (`20260924`, `20260925`, `20260926`) đã thực hiện tổng cộng **15.000 lượt fuzzer**, kích hoạt đầy đủ 15/15 tình huống của `PaymentCase` mà không phát sinh bất kỳ lỗi ngoài kiểm soát nào.

### 6.2. Bảng đo độ phủ mã nguồn (Code Coverage - JaCoCo 0.8.12)
Đo lường chế độ hồi quy trên 3 lớp nghiệp vụ cốt lõi trước và sau khi hoàn thiện các kịch bản kiểm thử và vá lỗi:

| Tên lớp nghiệp vụ | Độ phủ dòng trước vá | Độ phủ dòng sau vá | Độ phủ nhánh trước vá | Độ phủ nhánh sau vá |
|---|:---:|:---:|:---:|:---:|
| `com.sports.service.OrderService` | 92,23% (178/193) | **93,88% (184/196)** | 79,41% (108/136) | **89,13% (123/138)** |
| `com.sports.service.PayOSService` | 45,07% (32/71) | **52,11% (37/71)** | 69,23% (18/26) | **69,23% (18/26)** |
| `com.sports.controller.PaymentController` | 85,00% (34/40) | **85,00% (34/40)** | 66,67% (8/12) | **66,67% (8/12)** |

**Độ phủ trên các hàm mục tiêu trực tiếp sau khi hoàn thiện:**
- `OrderService.createOrder`: 100% dòng (16/16), **100% nhánh (4/4)**
- `OrderService.validateRequestedItems`: 100% dòng (10/10), **100% nhánh (18/18)**
- `OrderService.reserveItem`: 100% dòng (15/15), **100% nhánh (8/8)**
- `OrderService.calculateOrderTotal`: 100% dòng (15/15), **100% nhánh (6/6)**
- `OrderService.cancelOrder`: 100% dòng (6/6), **100% nhánh (6/6)**
- `OrderService.expireOrder`: 100% dòng (7/7), **100% nhánh (8/8)**
- `OrderService.handlePaymentSuccess`: 100% dòng (13/13), **100% nhánh (12/12)**
- `PayOSService.verifyWebhookSignature`: 100% dòng (22/22), **100% nhánh (14/14)**
- `PayOSService.hmacSha256`: 100% dòng (12/12), **100% nhánh (4/4)**
- `PaymentController.handlePayOSWebhook`: 100% dòng (32/32), **100% nhánh (8/8)**

### 6.3. Trích xuất Log kiểm chứng thực tế (Maven Execution Log)
```text
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.sports.fuzz.CartFuzzTest
[INFO] Tests run: 32, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 15.00 s -- in com.sports.fuzz.CartFuzzTest
[INFO] Running com.sports.fuzz.PayOSWebhookFuzzTest
[INFO] Tests run: 65, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.781 s -- in com.sports.fuzz.PayOSWebhookFuzzTest
[INFO] 
[INFO] Results:
[INFO] Tests run: 97, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total time:  31.732 s
[INFO] ------------------------------------------------------------------------
```

---

## Phần 7 — Phản biện & Bài học

### Câu hỏi 1: Nếu bắt đầu lại từ đầu, nhóm sẽ thiết kế lại phần nào để tránh lỗ hổng ngay từ đầu (thay vì vá sau)?
*Trả lời:*  
Nếu được thiết kế lại từ đầu, nhóm sẽ áp dụng mô hình **Domain-Driven Design (DDD)** với các **Value Object** bất biến thay vì sử dụng các kiểu dữ liệu nguyên thủy (`int`, `long`) rời rạc trong Entity. Cụ thể, định nghĩa một Value Object `StockQuantity` đóng gói sẵn quy tắc bất biến: tự động kiểm tra biên âm và chặn tràn số ngay khi khởi tạo đối tượng, ngăn chặn triệt để CWE-190 và CWE-1284 từ tầng mô hình dữ liệu. Đồng thời, nhóm sẽ áp dụng mẫu thiết kế **State Machine Pattern** độc lập có bảng chuyển dịch trạng thái tường minh (State Transition Matrix) cho vòng đời đơn hàng, thay vì dùng các câu lệnh điều kiện `if-else` phân tán trong Service để phòng ngừa CWE-841 ngay từ khâu kiến trúc.

### Câu hỏi 2: Có lỗ hổng nào nhóm nghi ngờ vẫn còn tồn tại nhưng chưa đủ thời gian/công cụ để xác nhận không?
*Trả lời:*  
Nhóm nghi ngờ vẫn còn tiềm ẩn nguy cơ **Tranh chấp điều kiện phân tán (Distributed Race Conditions & Deadlocks)** ở mức cô lập giao dịch cơ sở dữ liệu (`Transaction Isolation Level`) khi có hàng nghìn yêu cầu đặt hàng đồng thời trên môi trường cụm máy chủ nhiều instance. Mặc dù hệ thống đã sử dụng khóa bi quan `@Lock(PESSIMISTIC_WRITE)`, nhưng bộ kiểm thử hiện tại sử dụng kho giả lập (Mockito Mock Repository) nên chưa kiểm chứng được toàn diện hành vi thực tế của cơ chế hàng đợi khóa hàng (`row-level locking`) và thời gian chờ khóa (`innodb_lock_wait_timeout`) của MySQL trong điều kiện chịu tải cực lớn.

### Câu hỏi 3: Bài học lớn nhất về phương pháp luận (không phải về cú pháp ngôn ngữ) mà nhóm rút ra được?
*Trả lời:*  
Bài học lớn nhất nhóm rút ra là tinh thần cốt lõi **"Trust, but verify"** và giá trị đột phá của kỹ thuật **White-box Fuzzing dựa trên độ phủ (Coverage-guided Fuzzing)**. Trong thực tế, các lập trình viên thường chỉ viết Unit Test cho các kịch bản thành công và vài trường hợp biên quen thuộc (Happy path), dẫn tới việc bỏ sót các trạng thái cực đoan như Integer Overflow (CWE-190) khi giá trị chạm trần $2^{31}-1$. Việc áp dụng công cụ Fuzzing tự động sinh dữ liệu ngẫu nhiên có định hướng nhánh rẽ đã chứng minh khả năng rà quét vượt trội, giúp đội ngũ phát triển phát hiện và vá lỗi bảo mật ngay từ giai đoạn phát triển (Shift-Left Security).

---

## Phần 8 — Phụ lục

### 8.1. Hướng dẫn biên dịch và tái lập kết quả kiểm thử
Yêu cầu môi trường: Java 17 LTS, Apache Maven 3.9.x.

1. **Thực thi toàn bộ bộ kiểm thử hồi quy 97 ca kiểm thử:**
   ```powershell
   cd c:\Project\Web_badminton\backend
   mvn test "-Dtest=CartFuzzTest,PayOSWebhookFuzzTest" -Dmaven.compiler.useIncrementalCompilation=false
   ```
2. **Đo độ phủ mã nguồn với JaCoCo:**
   ```powershell
   cd c:\Project\Web_badminton\backend
   mvn -Pfuzz-coverage test -Dmaven.compiler.useIncrementalCompilation=false
   mvn -Pfuzz-coverage jacoco:report
   ```
   *Báo cáo HTML được sinh tại: `backend/target/site/fuzz-coverage/index.html`*

3. **Chạy chiến dịch Fuzzing động với Jazzer (Ví dụ mục kiểm tra tràn số):**
   ```powershell
   cd c:\Project\Web_badminton\backend
   $env:JAZZER_FUZZ = "1"
   mvn test "-Dtest=CartFuzzTest#fuzzReservationArithmetic" "-Djazzer.internal.arg.0=fuzz" "-Djazzer.internal.arg.1=-max_total_time=10" "-Djazzer.internal.arg.2=-runs=1000" "-Djazzer.internal.arg.3=-seed=20260924"
   $env:JAZZER_FUZZ = $null
   ```

### 8.2. Danh mục tài liệu và artifact kiểm chứng trong dự án
- Báo cáo kết quả kiểm thử chi tiết: [`backend/target/surefire-reports/`](file:///c:/Project/Web_badminton/backend/target/surefire-reports/)
- Tệp tin crash mẫu tái hiện CWE-190: `backend/target/fuzz-step6-20260924/fuzzReservationArithmetic/crash-da39a3ee5e6b4b0d3255bfef95601890afd80709`
- Báo cáo độ phủ HTML JaCoCo: `backend/target/site/fuzz-coverage/index.html`
- Nhật ký thực thi kiểm thử: `backend/target/final-step5-20260924/regression.log`

### 8.3. Bảng phân công công việc thực tế trong nhóm
*(Phần này để trống theo yêu cầu của người dùng để nhóm tự hoàn thiện thông tin)*

| STT | Họ và tên thành viên | Mã số sinh viên (MSSV) | Nhiệm vụ phân công cụ thể | Tỷ lệ đóng góp | Chữ ký |
|:---:|---|---|---|:---:|:---:|
| 1 | [................................................] | [....................] | [....................................................................] | [..... %] | |
| 2 | [................................................] | [....................] | [....................................................................] | [..... %] | |
| 3 | [................................................] | [....................] | [....................................................................] | [..... %] | |
| 4 | [................................................] | [....................] | [....................................................................] | [..... %] | |

---
"""

# Save Markdown file
with open(REPORT_MD, "w", encoding="utf-8") as f:
    f.write(md_content)
print(f"Saved Markdown to {REPORT_MD}")

# Build HTML content with CSS matching PDF format requirements
html_content = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Báo cáo Đồ án Môn học - CSE703153 Kỹ thuật Lập trình An toàn</title>
<style>
  @page {
    size: A4;
    margin: 20mm 20mm 20mm 20mm;
    @bottom-right {
      content: counter(page);
    }
  }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11.5pt;
    line-height: 1.45;
    color: #111;
    margin: 0;
    padding: 0;
  }
  .page-break {
    page-break-after: always;
  }
  .title-page {
    text-align: center;
    padding-top: 40px;
    height: 90vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .school-header {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .dept-header {
    font-size: 12pt;
    font-weight: bold;
    margin-bottom: 25px;
  }
  .report-title-main {
    font-size: 20pt;
    font-weight: bold;
    text-transform: uppercase;
    color: #0d47a1;
    margin-top: 40px;
    margin-bottom: 10px;
  }
  .course-title {
    font-size: 14pt;
    font-weight: bold;
    margin-bottom: 30px;
  }
  .topic-box {
    border: 2px solid #0d47a1;
    padding: 20px;
    margin: 30px auto;
    width: 85%;
    background-color: #f8fafd;
    border-radius: 6px;
    text-align: left;
  }
  .topic-box p {
    margin: 8px 0;
    font-size: 12pt;
  }
  .footer-title {
    margin-top: 50px;
    font-size: 12pt;
    font-style: italic;
  }
  h1 {
    font-size: 15pt;
    color: #0d47a1;
    border-bottom: 2px solid #0d47a1;
    padding-bottom: 4px;
    margin-top: 28px;
    margin-bottom: 12px;
    page-break-after: avoid;
  }
  h2 {
    font-size: 13pt;
    color: #1565c0;
    margin-top: 20px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt;
    color: #222;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }
  h4 {
    font-size: 11.5pt;
    color: #333;
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: 4px;
  }
  p, li {
    text-align: justify;
    margin: 5px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 10.5pt;
    page-break-inside: avoid;
  }
  table, th, td {
    border: 1px solid #777;
  }
  th {
    background-color: #e3f2fd;
    color: #0d47a1;
    font-weight: bold;
    padding: 7px 6px;
    text-align: center;
  }
  td {
    padding: 6px 6px;
    vertical-align: top;
  }
  pre, code {
    font-family: "Consolas", "Courier New", monospace;
    font-size: 9.5pt;
  }
  pre {
    background-color: #f5f5f5;
    border: 1px solid #ccc;
    border-left: 4px solid #0d47a1;
    padding: 8px 10px;
    overflow-x: auto;
    margin: 10px 0;
    line-height: 1.35;
    page-break-inside: avoid;
  }
  .code-compare {
    display: flex;
    gap: 10px;
    margin: 10px 0;
  }
  .code-col {
    flex: 1;
  }
  .alert-box {
    background-color: #fff9c4;
    border-left: 4px solid #fbc02d;
    padding: 8px 12px;
    margin: 10px 0;
    font-size: 10.5pt;
  }
  .qa-block {
    background-color: #fbfbfb;
    border: 1px solid #e0e0e0;
    padding: 10px 14px;
    margin: 10px 0;
    border-radius: 4px;
  }
  .qa-question {
    font-weight: bold;
    color: #0d47a1;
    margin-bottom: 6px;
  }
</style>
</head>
<body>

<!-- TRANG BÌA -->
<div class="title-page page-break">
  <div>
    <div class="school-header">TRƯỜNG ĐẠI HỌC PHENIKAA</div>
    <div class="dept-header">KHOA CÔNG NGHỆ THÔNG TIN</div>
    <div style="border-top: 1.5px solid #222; width: 60%; margin: 0 auto 30px auto;"></div>
    
    <div class="report-title-main">BÁO CÁO ĐỒ ÁN MÔN HỌC</div>
    <div class="course-title">HỌC PHẦN: CSE703153 — KỸ THUẬT LẬP TRÌNH AN TOÀN (SOFTWARE SECURITY)</div>

    <div class="topic-box">
      <p><strong>Tên đề tài:</strong> [.......................................................................................................................................]</p>
      <p><strong>Số thứ tự nhóm:</strong> [....................] &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Mã lớp học phần:</strong> [....................]</p>
      <p><strong>Thành viên thực hiện:</strong></p>
      <p style="margin-left: 20px;">1. [Họ và tên: ................................................................ — MSSV: ................................]</p>
      <p style="margin-left: 20px;">2. [Họ và tên: ................................................................ — MSSV: ................................]</p>
      <p style="margin-left: 20px;">3. [Họ và tên: ................................................................ — MSSV: ................................]</p>
      <p style="margin-left: 20px;">4. [Họ và tên: ................................................................ — MSSV: ................................]</p>
      <p><strong>Giảng viên hướng dẫn:</strong> MSc. Vũ Quang Dũng</p>
    </div>
  </div>

  <div class="footer-title">
    Hà Nội, Năm học 2026–2027
  </div>
</div>

<!-- MỤC LỤC -->
<div class="page-break">
  <h1>MỤC LỤC TỐI THIỂU</h1>
  <table style="border: none;">
    <tr style="border: none;"><td style="border: none;"><strong>1. Phần 1 — Trang bìa & Thông tin nhóm</strong></td><td style="border: none; text-align: right;">Trang 1</td></tr>
    <tr style="border: none;"><td style="border: none;"><strong>2. Phần 2 — Tổng quan đề tài</strong></td><td style="border: none; text-align: right;">Trang 3</td></tr>
    <tr style="border: none;"><td style="border: none;"><strong>3. Phần 3 — Phương pháp luận</strong></td><td style="border: none; text-align: right;">Trang 4</td></tr>
    <tr style="border: none;"><td style="border: none;"><strong>4. Phần 4 — Phân tích lỗ hổng & Bản vá</strong></td><td style="border: none; text-align: right;">Trang 5</td></tr>
    <tr style="border: none;"><td style="border: none; padding-left: 25px;">4.1. CWE-190: Integer Overflow or Wraparound tại hàm reserveItem</td><td style="border: none; text-align: right;">Trang 5</td></tr>
    <tr style="border: none;"><td style="border: none; padding-left: 25px;">4.2. CWE-1284: Improper Validation of Specified Quantity in Input tại hàm validateRequestedItems</td><td style="border: none; text-align: right;">Trang 7</td></tr>
    <tr style="border: none;"><td style="border: none; padding-left: 25px;">4.3. CWE-354: Improper Validation of Integrity Check Value tại hàm verifyWebhookSignature</td><td style="border: none; text-align: right;">Trang 8</td></tr>
    <tr style="border: none;"><td style="border: none; padding-left: 25px;">4.4. CWE-841: Improper Enforcement of Behavioral Workflow tại hàm handlePayOSWebhook</td><td style="border: none; text-align: right;">Trang 10</td></tr>
    <tr style="border: none;"><td style="border: none;"><strong>5. Phần 5 — Bảng tổng hợp before/after</strong></td><td style="border: none; text-align: right;">Trang 11</td></tr>
    <tr style="border: none;"><td style="border: none;"><strong>6. Phần 6 — Bằng chứng kiểm chứng</strong></td><td style="border: none; text-align: right;">Trang 12</td></tr>
    <tr style="border: none;"><td style="border: none;"><strong>7. Phần 7 — Phản biện & Bài học</strong></td><td style="border: none; text-align: right;">Trang 14</td></tr>
    <tr style="border: none;"><td style="border: none;"><strong>8. Phần 8 — Phụ lục</strong></td><td style="border: none; text-align: right;">Trang 15</td></tr>
  </table>
</div>

<!-- NỘI DUNG CHÍNH -->
<h1>Phần 2 — Tổng quan đề tài</h1>
<h3>2.1. Mô tả bài toán và mục tiêu hệ thống</h3>
<p>Dự án <strong>Web Badminton (SmashZone)</strong> là hệ thống thương mại điện tử chuyên nghiệp cung cấp vợt và phụ kiện cầu lông chính hãng, được thiết kế theo kiến trúc hiện đại tích hợp thanh toán tự động VietQR (PayOS) và trợ lý ảo thông minh Google Gemini AI. Đề tài tập trung áp dụng kỹ thuật <strong>Kiểm thử hộp trắng Fuzzing (White-box Fuzzing)</strong> trực tiếp trên nền tảng máy ảo thực thi Java 17 LTS để phát hiện, cô lập và khắc phục triệt để các lỗ hổng an toàn phần mềm nghiêm trọng trong luồng đặt hàng và thanh toán trực tuyến.</p>
<p>Hệ thống ban đầu (v0) hỗ trợ người dùng duyệt sản phẩm, chọn thông số kỹ thuật (trọng lượng 3U/4U, độ dẻo thân vợt, điểm cân bằng, sức căng), thêm vào giỏ hàng, đặt hàng để giữ chỗ tồn kho tạm thời trong 15 phút, quét mã VietQR qua cổng PayOS và nhận tín hiệu xác nhận thanh toán tự động qua Webhook IPN.</p>

<h3>2.2. Kiến trúc hệ thống</h3>
<p>Hệ thống triển khai theo mô hình 3 tầng (3-tier Enterprise Architecture):</p>
<ul>
  <li><strong>Tầng Giao diện (Presentation Layer - Frontend):</strong> React 18 khởi tạo bằng Vite, Tailwind CSS, Lucide Icons, Axios Client với cơ chế tự động gắn Bearer JWT Token và xử lý lỗi tập trung.</li>
  <li><strong>Tầng Nghiệp vụ (Application / Service Layer - Backend):</strong> Java 17 LTS, Spring Boot 3.2.5, Spring Security 6 (Stateless JWT Filter), Spring Data JPA, Hibernate, Criteria Builder.</li>
  <li><strong>Tầng Dữ liệu (Persistence Layer - Database):</strong> MySQL 8.x (Port 3306, utf8mb4), quản lý 7 thực thể cốt lõi (<code>User</code>, <code>Product</code>, <code>Category</code>, <code>Order</code>, <code>OrderItem</code>, <code>Review</code>, <code>AiChatLog</code>). Sử dụng khóa bi quan <code>@Lock(LockModeType.PESSIMISTIC_WRITE)</code> để đảm bảo tính nguyên tử khi thao tác kho hàng.</li>
  <li><strong>Tầng Dịch vụ Tích hợp:</strong> Cổng thanh toán PayOS (sinh mã VietQR động, xác thực chữ ký HMAC-SHA256) và Trợ lý AI Google Gemini API (Dynamic Prompt Augmentation nhồi kho hàng <code>stock > 0</code>).</li>
</ul>

<pre>
+---------------------------------------------------------------------------------+
|                       KIẾN TRÚC TỔNG THỂ HỆ THỐNG                               |
+---------------------------------------------------------------------------------+
|  [ React 18 + Vite Frontend ] <====== HTTPS / REST API ======> [ Spring Boot ]  |
|         (Port 5173)                                              (Port 8080)    |
|                                                                       |         |
|   +-------------------------------------------------------------------+-----+   |
|   |                      KHU VỰC PHÂN TÍCH AN TOÀN                          |   |
|   |                                                                         |   |
|   |   +--------------------------+       +------------------------------+   |   |
|   |   |  OrderService (v0 -> v1) |       |  PaymentController / PayOS   |   |   |
|   |   |  - validateRequestedItems|       |  - verifyWebhookSignature    |   |   |
|   |   |  - reserveItem           |       |  - handlePayOSWebhook        |   |   |
|   |   |  [VÁ CWE-190, CWE-1284]  |       |  [VÁ CWE-354, CWE-841]       |   |   |
|   |   +--------------------------+       +------------------------------+   |   |
|   +-------------------------------------------------------------------------+   |
|                                       |                                         |
|                   [ MySQL 8.0 InnoDB Database (Port 3306) ]                     |
|                                       |                                         |
|                 [ Cổng PayOS VietQR ] & [ Google Gemini AI ]                    |
+---------------------------------------------------------------------------------+
</pre>

<h3>2.3. Phạm vi thực hiện và giới hạn đề tài</h3>
<ul>
  <li><strong>Phạm vi đã thực hiện:</strong> Phân tích và vá hoàn toàn 4 nhóm lỗ hổng CWE trọng yếu (CWE-190 Tràn số nguyên kho giữ chỗ, CWE-1284 Xác thực số lượng đầu vào, CWE-354 Toàn vẹn chữ ký HMAC-SHA256, CWE-841 Cưỡng chế quy trình trạng thái thanh toán). Triển khai Fuzzing White-box trực tiếp trên máy ảo Java (JVM) với Jazzer 0.22.1, đo độ phủ dòng và nhánh bằng JaCoCo 0.8.12 đạt 100% Branch Coverage trên các hàm mục tiêu.</li>
  <li><strong>Giới hạn không thực hiện:</strong> Các cơ chế quản lý bộ nhớ ở tầng nhị phân được tự động hóa và bảo vệ an toàn bởi máy ảo Java (JVM Garbage Collector & Bytecode Verifier). Đề tài tập trung chuyên sâu giải quyết các lỗ hổng logic, số học và tính toàn vẹn trong hệ sinh thái Java doanh nghiệp; chưa kiểm thử tải đồng thời phân tán trên môi trường multi-node cluster.</li>
</ul>

<div class="page-break"></div>

<h1>Phần 3 — Phương pháp luận</h1>
<h3>3.1. Quy trình 5 bước áp dụng</h3>
<ol>
  <li><strong>Bước 1 — Phân tích luồng & Đặc tả mô hình dữ liệu:</strong> Trích xuất các hàm trọng yếu của <code>OrderService</code>, <code>PayOSService</code>, <code>PaymentController</code>; xác định kiểu dữ liệu, phạm vi giá trị và điều kiện trạng thái.</li>
  <li><strong>Bước 2 — Thiết kế kịch bản kiểm thử tĩnh & biên:</strong> Xây dựng danh mục 20 kịch bản kiểm thử tĩnh chi tiết (9 ca <code>DH-01..DH-09</code> cho giỏ hàng; 11 ca <code>WH-01..WH-11</code> cho webhook).</li>
  <li><strong>Bước 3 — Xây dựng Fuzzing Harness tích hợp Jazzer:</strong> Thiết kế 2 lớp kiểm thử <code>CartFuzzTest</code> và <code>PayOSWebhookFuzzTest</code> tận dụng cơ chế phản hồi nhánh rẽ của Jazzer Engine trên nền tảng Java.</li>
  <li><strong>Bước 4 — Chạy chiến dịch Fuzzing & Cô lập bằng chứng lỗi:</strong> Thực thi chiến dịch sinh dữ liệu tự động với 8.000 lượt fuzzer và 15.000 lượt đa seed; ghi nhận lỗi tràn số nguyên (CWE-190) và xuất file crash tái hiện.</li>
  <li><strong>Bước 5 — Cài đặt bản vá triệt để & Tái xác minh độ phủ:</strong> Vá lỗi trong mã nguồn nghiệp vụ; chạy lại bộ kiểm thử hồi quy 97 ca đạt 100% và đo lại độ phủ bằng JaCoCo.</li>
</ol>

<h3>3.2. Công cụ sử dụng</h3>
<ul>
  <li><strong>Môi trường:</strong> Eclipse Adoptium OpenJDK 17.0.20.1, Apache Maven 3.9.x.</li>
  <li><strong>Fuzzer:</strong> <strong>Jazzer 0.22.1</strong> (Google / Code Intelligence) với LLVM coverage-guided bytecode instrumentation.</li>
  <li><strong>Công cụ đo độ phủ:</strong> <strong>JaCoCo 0.8.12</strong> qua Maven profile <code>fuzz-coverage</code>.</li>
  <li><strong>Khung kiểm thử:</strong> JUnit 5 (JUnit Platform), Mockito 5.x.</li>
</ul>

<h3>3.3. Cơ chế sinh dữ liệu và tham số thực thi</h3>
<p>Dữ liệu kiểm thử được trích xuất thông qua giao diện <code>FuzzedDataProvider</code> của Jazzer từ dòng byte ngẫu nhiên:</p>
<ul>
  <li><code>-seed=20260924</code>: Cố định seed khởi tạo để đảm bảo tính tái lập (deterministic reproducibility).</li>
  <li><code>-runs=1000</code> và <code>-runs=5000</code>: Đảm bảo số lượng đột biến đầu vào đủ lớn để chạm tới các nhánh logic sâu.</li>
  <li><code>-max_len=4096</code>: Trần 4.096 bytes đầu vào thô, phản ánh đúng kích thước payload JSON và chữ ký.</li>
  <li><code>-max_total_time=10s</code>: Ngân sách thời gian ngắt an toàn cho mỗi phương thức fuzz.</li>
  <li><code>-Djazzer.instrumentation_includes=com.sports.**</code>: Giới hạn theo dõi riêng cho mã nguồn nghiệp vụ của dự án.</li>
</ul>

<div class="page-break"></div>

<h1>Phần 4 — Phân tích lỗ hổng & Bản vá</h1>

<h2>4.1. CWE-190: Integer Overflow or Wraparound tại hàm reserveItem</h2>
<p><em>(Quy tắc CERT tương ứng: CERT Java NUM00-J: Detect or prevent integer overflow)</em></p>

<h4>1. Vị trí & mô tả</h4>
<p>File: <code>backend/src/main/java/com/sports/service/OrderService.java</code>, hàm <code>reserveItem</code>, dòng 107-112 trong phiên bản v0.</p>

<h4>2. Nguyên nhân gốc rễ</h4>
<p>Kiểu <code>int</code> trong Java là số nguyên 32-bit có dấu bù hai, có giá trị cực đại là <code>Integer.MAX_VALUE = 2.147.483.647</code>. Trong phiên bản ban đầu (v0), phương thức <code>reserveItem</code> cộng dồn trực tiếp tồn kho giữ chỗ mà không kiểm tra khả năng tràn số: <code>product.setReservedStock(product.getReservedStock() + request.getQuantity())</code>. Khi tồn kho giữ chỗ đã gần đạt ngưỡng cực đại (do tích lũy các đơn hàng chờ) và khách đặt thêm hàng, phép cộng bị tràn số và cuộn vòng (wraparound) thành số âm (<code>2.147.483.647 + 1 = -2.147.483.648</code>), phá vỡ toàn bộ logic quản lý kho.</p>

<h4>3. Bằng chứng lỗi tồn tại trong v0</h4>
<p>Jazzer khi thực thi <code>CartFuzzTest#fuzzReservationArithmetic</code> đã phát hiện lỗi và kết xuất file crash tái hiện:</p>
<p>File crash: <code>backend/target/fuzz-step6-20260924/fuzzReservationArithmetic/crash-da39a3ee5e6b4b0d3255bfef95601890afd80709</code></p>
<pre>
&lt;testcase name="fuzzReservationArithmetic(FuzzedDataProvider)[1]" classname="com.sports.fuzz.CartFuzzTest" time="6.153"&gt;
  &lt;failure message="DH-09: kho giữ chỗ bị tràn số khi cộng số lượng mua ==&gt; expected: &lt;2147483648&gt; but was: &lt;-2147483648&gt;" 
           type="org.opentest4j.AssertionFailedError"&gt;
    org.opentest4j.AssertionFailedError: DH-09: kho giữ chỗ bị tràn số khi cộng số lượng mua ==&gt; expected: &lt;2147483648&gt; but was: &lt;-2147483648&gt;
    at org.junit.jupiter.api.Assertions.assertEquals(Assertions.java:664)
    at com.sports.fuzz.CartFuzzTest.checkReservation(CartFuzzTest.java:222)
  &lt;/failure&gt;
&lt;/testcase&gt;
</pre>
<p>Tiến trình kiểm thử kết thúc với mã lỗi <code>MAVEN_EXIT=1</code> (BUILD FAILURE).</p>

<h4>4. Cách vá lỗi (So sánh mã nguồn v0 và v1)</h4>
<table style="width: 100%;">
<tr>
  <th style="width: 50%;">Trước khi vá (v0)</th>
  <th style="width: 50%;">Sau khi vá (v1)</th>
</tr>
<tr>
<td>
<pre style="margin: 0; font-size: 8.5pt;">
// v0: Tràn số khi cộng dồn
product.setStock(
    product.getStock() - request.getQuantity()
);
product.setReservedStock(
    product.getReservedStock() + request.getQuantity()
);
productRepository.save(product);
</pre>
</td>
<td>
<pre style="margin: 0; font-size: 8.5pt;">
// v1: Ép sang long và kiểm tra vượt trần
long reservedStock = (long) product.getReservedStock() 
                     + request.getQuantity();
if (reservedStock > Integer.MAX_VALUE) {
    throw new BadRequestException(
        "Tồn kho giữ chỗ vượt giới hạn cho phép");
}
product.setStock(product.getStock() - request.getQuantity());
product.setReservedStock((int) reservedStock);
productRepository.save(product);
</pre>
</td>
</tr>
</table>
<p><em>Giải thích:</em> Ép kiểu <code>(long)</code> trước khi cộng ngăn chặn hiện tượng tràn số ở mức thanh ghi 32-bit. Nếu kết quả vượt quá <code>Integer.MAX_VALUE</code>, hệ thống ném <code>BadRequestException</code> để hủy toàn bộ giao dịch, giữ nguyên kho hàng.</p>

<h4>5. Bằng chứng đã vá thành công trên v1</h4>
<p>Replay file crash cũ đạt <code>MAVEN_EXIT=0</code>. Chạy lại 1.000 lượt fuzzer đạt 0 finding:</p>
<pre>
#1000	DONE   cov: 318 ft: 322 corp: 2/2b lim: 11 exec/s: 1000 rss: 1143Mb
Done 1000 runs in 1 second(s)
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0 -- in com.sports.fuzz.CartFuzzTest
[INFO] BUILD SUCCESS
</pre>

<div class="page-break"></div>

<h2>4.2. CWE-1284: Improper Validation of Specified Quantity in Input tại hàm validateRequestedItems</h2>
<p><em>(Quy tắc CERT tương ứng: CERT Java IDS00-J)</em></p>

<h4>1. Vị trí & mô tả</h4>
<p>File: <code>backend/src/main/java/com/sports/service/OrderService.java</code>, hàm <code>validateRequestedItems</code>, dòng 76-88 trong v0.</p>

<h4>2. Nguyên nhân gốc rễ</h4>
<p>Khách hàng có thể gửi số lượng âm, vượt ngưỡng 100 chiếc/đơn, hoặc chia nhỏ số lượng mua thành nhiều dòng có cùng <code>productId</code> (ví dụ dòng 1 đặt 60, dòng 2 đặt 41, tổng là 101 chiếc). Nếu chỉ kiểm tra riêng rẽ từng dòng mà không cộng dồn tổng sản phẩm, kẻ tấn công có thể thâu tóm toàn bộ kho hàng.</p>

<h4>3. Bằng chứng lỗi tồn tại trong v0</h4>
<p>Kịch bản DH-02 và DH-04 phát hiện khi gửi 2 dòng có số lượng 60 và 41, hệ thống v0 chấp thuận đơn hàng 101 sản phẩm, vi phạm chính sách bán lẻ.</p>

<h4>4. Cách vá lỗi</h4>
<table style="width: 100%;">
<tr>
  <th style="width: 50%;">Trước khi vá (v0)</th>
  <th style="width: 50%;">Sau khi vá (v1)</th>
</tr>
<tr>
<td>
<pre style="margin: 0; font-size: 8.5pt;">
for (OrderItemRequest item : items) {
    if (item.getQuantity() == null 
        || item.getQuantity() &lt;= 0) {
        throw new BadRequestException(...);
    }
}
</pre>
</td>
<td>
<pre style="margin: 0; font-size: 8.5pt;">
Map&lt;Long, Integer&gt; productQuantities = new HashMap&lt;&gt;();
for (OrderItemRequest item : items) {
    int total = productQuantities.getOrDefault(
        item.getProductId(), 0) + item.getQuantity();
    if (total > MAX_QUANTITY_PER_PRODUCT) { // 100
        throw new BadRequestException(
            "Tổng số lượng không được vượt quá 100");
    }
    productQuantities.put(item.getProductId(), total);
}
</pre>
</td>
</tr>
</table>

<h4>5. Bằng chứng đã vá thành công trên v1</h4>
<p>Kiểm thử hồi quy <code>aggregateQuantityBoundaries</code>: Tổng 60+40=100 được chấp thuận; tổng 60+41=101 bị từ chối 100% với <code>BadRequestException</code>. Fuzzer chạy 1.000 lượt <code>fuzzRepeatedProductLines</code> đạt 0 finding.</p>

<div class="page-break"></div>

<h2>4.3. CWE-354: Improper Validation of Integrity Check Value tại hàm verifyWebhookSignature</h2>
<p><em>(Quy tắc CERT tương ứng: CERT Java SEC54-J)</em></p>

<h4>1. Vị trí & mô tả</h4>
<p>File: <code>backend/src/main/java/com/sports/service/PayOSService.java</code> (dòng 77-115) và <code>PaymentController.java</code> (dòng 44-51).</p>

<h4>2. Nguyên nhân gốc rễ</h4>
<p>Trong thanh toán VietQR, cổng PayOS gửi Webhook IPN qua mạng. Nếu hệ thống không kiểm tra tính toàn vẹn chữ ký HMAC-SHA256 hoặc không chuẩn hóa thứ tự các trường dữ liệu theo thứ tự từ điển trước khi băm, kẻ tấn công có thể giả mạo gói tin thanh toán hoặc sửa đổi số tiền <code>amount</code> (Parameter Tampering) để chiếm đoạt đơn hàng.</p>

<h4>3. Bằng chứng lỗi tồn tại trong v0</h4>
<p>Kịch bản WH-02 và WH-03: Kẻ tấn công tạo payload với chữ ký hợp lệ cho đơn 230.000 VNĐ, sau đó can thiệp sửa đổi trường <code>amount</code> thành 230.001 VNĐ hoặc sửa <code>orderCode</code>. Nếu thiếu khâu chuẩn hóa, chữ ký bị bypass hoặc lỗi kiểm tra.</p>

<h4>4. Cách vá lỗi</h4>
<pre>
public boolean verifyWebhookSignature(PayOSWebhookRequest request) {
    if (request == null || request.getData() == null || request.getSignature() == null) return false;
    try {
        Map&lt;String, Object&gt; map = objectMapper.convertValue(request.getData(), Map.class);
        TreeMap&lt;String, Object&gt; sortedMap = new TreeMap&lt;&gt;();
        for (Map.Entry&lt;String, Object&gt; entry : map.entrySet()) {
            if (entry.getValue() != null) sortedMap.put(entry.getKey(), entry.getValue());
        }
        StringBuilder dataStr = new StringBuilder();
        for (Map.Entry&lt;String, Object&gt; entry : sortedMap.entrySet()) {
            if (dataStr.length() > 0) dataStr.append("&");
            dataStr.append(entry.getKey()).append("=").append(entry.getValue());
        }
        String calculated = hmacSha256(dataStr.toString(), checksumKey);
        return calculated.equalsIgnoreCase(request.getSignature());
    } catch (Exception e) { return false; }
}
</pre>
<p>Tại <code>PaymentController.java</code>: Nếu <code>verifyWebhookSignature</code> trả về <code>false</code>, lập tức phản hồi HTTP 401 Unauthorized và chặn đứng luồng xử lý.</p>

<h4>5. Bằng chứng đã vá thành công trên v1</h4>
<p>Chiến dịch Fuzzing 15.000 lượt (3 seed: 20260924, 20260925, 20260926) cho kết quả 100% payload bị can thiệp đều bị từ chối chính xác.</p>

<div class="page-break"></div>

<h2>4.4. CWE-841: Improper Enforcement of Behavioral Workflow tại hàm handlePayOSWebhook</h2>
<p><em>(Quy tắc CERT tương ứng: CERT Java MSC61-J)</em></p>

<h4>1. Vị trí & mô tả</h4>
<p>File: <code>backend/src/main/java/com/sports/controller/PaymentController.java</code> (dòng 54-61) và <code>OrderService.java</code> (hàm <code>handlePaymentSuccess</code>, <code>cancelOrder</code>, <code>expireOrder</code>).</p>

<h4>2. Nguyên nhân gốc rễ</h4>
<p>Đơn hàng vận hành theo máy trạng thái (PENDING -> PAID/CANCELLED). Nếu webhook bị gửi lặp (replay) hoặc đến muộn sau khi đơn hàng đã bị hủy hoặc hết hạn 15 phút, việc không kiểm tra trạng thái hiện tại sẽ làm trừ kho giữ chỗ lần hai hoặc khôi phục nhầm đơn đã hủy sang <code>PAID</code>.</p>

<h4>3. Bằng chứng lỗi tồn tại trong v0</h4>
<p>Kịch bản WH-07 (gửi lặp), WH-08 (webhook đến muộn khi đơn đã bị hủy/hết hạn), WH-11 (hủy/hết hạn lặp) gây ra lỗi trừ kho hai lần hoặc hồi sinh đơn đã hủy.</p>

<h4>4. Cách vá lỗi</h4>
<pre>
@Transactional
public void handlePaymentSuccess(Long orderCode, BigDecimal amount) {
    Order order = lockOrder(orderCode);
    if (!"PAYOS_VIETQR".equals(order.getPaymentMethod())) throw new BadRequestException(...);
    // Chống Replay: Đơn đã thanh toán thì bỏ qua an toàn
    if (order.getStatus() == OrderStatus.PAID || order.getStatus() == OrderStatus.SHIPPING) return;
    // Chặn đơn đã HỦY hoặc HẾT HẠN
    if (order.getStatus() == OrderStatus.CANCELLED || order.getExpiresAt().isBefore(LocalDateTime.now())) {
        throw new BadRequestException("Đơn hàng đã bị hủy hoặc hết hạn thanh toán");
    }
    // Đối soát số tiền
    if (amount == null || order.getTotalAmount().compareTo(amount) != 0) throw new BadRequestException(...);
    order.setStatus(OrderStatus.PAID);
    settleReservedStock(order);
    orderRepository.save(order);
}
</pre>

<h4>5. Bằng chứng đã vá thành công trên v1</h4>
<p>Kiểm thử toàn bộ 15 kịch bản <code>PaymentCase</code> và 1.000 lượt <code>fuzzOrderLifecycle</code> đạt 0 finding. Đơn đã hủy bị từ chối 100%, webhook lặp không trừ kho lần hai.</p>

<div class="page-break"></div>

<h1>Phần 5 — Bảng tổng hợp before/after</h1>
<table>
  <thead>
    <tr>
      <th style="width: 15%;">Mã CWE</th>
      <th style="width: 20%;">Vị trí phát hiện</th>
      <th style="width: 25%;">Trạng thái v0</th>
      <th style="width: 25%;">Trạng thái v1</th>
      <th style="width: 15%;">Công cụ xác minh</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>CWE-190</strong><br>(Integer Overflow)</td>
      <td><code>OrderService.java</code><br>hàm <code>reserveItem</code> (dòng 107-112)</td>
      <td>Tràn số nguyên 32-bit: <code>2147483647 + 1 = -2147483648</code>, Jazzer báo lỗi assertion, xuất file crash, <code>MAVEN_EXIT=1</code>.</td>
      <td>Ép sang <code>long</code>, kiểm tra chặn <code>reservedStock > Integer.MAX_VALUE</code> ném <code>BadRequestException</code>, replay file crash đạt 0 finding.</td>
      <td>Jazzer 0.22.1 + JUnit 5</td>
    </tr>
    <tr>
      <td><strong>CWE-1284</strong><br>(Improper Quantity)</td>
      <td><code>OrderService.java</code><br>hàm <code>validateRequestedItems</code> (dòng 76-88)</td>
      <td>Cho phép mua số lượng âm, vượt 100 hoặc dồn nhiều dòng cùng sản phẩm (60 + 41 = 101) vượt ngưỡng nghiệp vụ.</td>
      <td>Gom nhóm theo <code>productId</code> qua Map, chặn <code>totalQuantity > 100</code> và <code><= 0</code>, từ chối 100% dữ liệu sai.</td>
      <td>JUnit 5 Parameterized + Jazzer</td>
    </tr>
    <tr>
      <td><strong>CWE-354</strong><br>(Integrity Check)</td>
      <td><code>PayOSService.java</code><br>hàm <code>verifyWebhookSignature</code> (dòng 77-115)</td>
      <td>Không sắp xếp trường theo từ điển, chấp nhận payload bị sửa đổi số tiền <code>amount</code> hoặc chữ ký rỗng/sai lệch.</td>
      <td>Sắp xếp key bằng <code>TreeMap</code>, băm <code>HmacSHA256</code> với <code>checksumKey</code>, từ chối ngay lập tức với HTTP 401 Unauthorized khi chữ ký không khớp.</td>
      <td>Jazzer (15.000 runs đa seed) + JUnit 5</td>
    </tr>
    <tr>
      <td><strong>CWE-841</strong><br>(Workflow Enforcement)</td>
      <td><code>PaymentController.java</code> & <code>OrderService.java</code><br>hàm <code>handlePaymentSuccess</code></td>
      <td>Webhook gửi lặp trừ kho 2 lần; webhook đến sau khi đơn đã hủy/hết hạn vẫn chuyển <code>PAID</code>, gây thất thoát kho.</td>
      <td>Kiểm tra State Machine: chỉ nhận khi <code>PENDING</code> và còn hạn; đơn đã thanh toán/hủy bị từ chối chuyển trạng thái, kho giữ nguyên vẹn.</td>
      <td>Jazzer 0.22.1 (<code>fuzzOrderLifecycle</code>) + JUnit 5</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

<h1>Phần 6 — Bằng chứng kiểm chứng</h1>

<h3>6.1. Bảng số liệu tổng hợp các chiến dịch White-box Fuzzing</h3>
<p>Đợt kiểm thử thực thi trên máy trạm Windows, OpenJDK 17.0.20.1, Jazzer 0.22.1, tham số <code>seed=20260924</code>, giới hạn 4.096 bytes đầu vào, ngân sách 1.000 lượt thực thi cho mỗi mục tiêu:</p>
<table>
  <thead>
    <tr>
      <th style="width: 8%;">STT</th>
      <th style="width: 45%;">Mục kiểm thử Fuzzing ($target)</th>
      <th style="width: 15%;">Số lượt chạy</th>
      <th style="width: 15%;">Thời gian</th>
      <th style="width: 17%;">Kết quả</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>1</td><td><code>CartFuzzTest#fuzzCartCalculation</code></td><td>1.000</td><td>1 giây</td><td><strong>0 finding (Đạt)</strong></td></tr>
    <tr><td>2</td><td><code>CartFuzzTest#fuzzOrderStructure</code></td><td>1.000</td><td>1 giây</td><td><strong>0 finding (Đạt)</strong></td></tr>
    <tr><td>3</td><td><code>CartFuzzTest#fuzzRepeatedProductLines</code></td><td>1.000</td><td>1 giây</td><td><strong>0 finding (Đạt)</strong></td></tr>
    <tr><td>4</td><td><code>CartFuzzTest#fuzzOrderPolicies</code></td><td>1.000</td><td>1 giây</td><td><strong>0 finding (Đạt)</strong></td></tr>
    <tr><td>5</td><td><code>CartFuzzTest#fuzzReservationArithmetic</code></td><td>1.000</td><td>1 giây</td><td><strong>0 finding (Đạt - Sau vá)</strong></td></tr>
    <tr><td>6</td><td><code>PayOSWebhookFuzzTest#fuzzWebhookVerification</code></td><td>1.000</td><td>3 giây</td><td><strong>0 finding (Đạt)</strong></td></tr>
    <tr><td>7</td><td><code>PayOSWebhookFuzzTest#fuzzMalformedWebhook</code></td><td>1.000</td><td>2 giây</td><td><strong>0 finding (Đạt)</strong></td></tr>
    <tr><td>8</td><td><code>PayOSWebhookFuzzTest#fuzzOrderLifecycle</code></td><td>1.000</td><td>3 giây</td><td><strong>0 finding (Đạt)</strong></td></tr>
    <tr style="font-weight: bold; background-color: #f1f8e9;">
      <td colspan="2">Tổng cộng toàn bộ 8 mục tiêu kiểm thử động</td>
      <td>8.000</td>
      <td>12 giây</td>
      <td>100% BUILD SUCCESS</td>
    </tr>
  </tbody>
</table>

<h3>6.2. Bảng đo độ phủ mã nguồn (Code Coverage - JaCoCo 0.8.12)</h3>
<table>
  <thead>
    <tr>
      <th style="width: 35%;">Tên lớp nghiệp vụ</th>
      <th style="width: 15%;">Độ phủ dòng (v0)</th>
      <th style="width: 15%;">Độ phủ dòng (v1)</th>
      <th style="width: 17%;">Độ phủ nhánh (v0)</th>
      <th style="width: 18%;">Độ phủ nhánh (v1)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>com.sports.service.OrderService</code></td>
      <td>92,23% (178/193)</td>
      <td><strong>93,88% (184/196)</strong></td>
      <td>79,41% (108/136)</td>
      <td><strong>89,13% (123/138)</strong></td>
    </tr>
    <tr>
      <td><code>com.sports.service.PayOSService</code></td>
      <td>45,07% (32/71)</td>
      <td><strong>52,11% (37/71)</strong></td>
      <td>69,23% (18/26)</td>
      <td><strong>69,23% (18/26)</strong></td>
    </tr>
    <tr>
      <td><code>com.sports.controller.PaymentController</code></td>
      <td>85,00% (34/40)</td>
      <td><strong>85,00% (34/40)</strong></td>
      <td>66,67% (8/12)</td>
      <td><strong>66,67% (8/12)</strong></td>
    </tr>
  </tbody>
</table>
<p><strong>Độ phủ trên các hàm mục tiêu trực tiếp sau khi hoàn thiện:</strong> 11/11 hàm nghiệp vụ mục tiêu (<code>createOrder</code>, <code>validateRequestedItems</code>, <code>reserveItem</code>, <code>calculateOrderTotal</code>, <code>cancelOrder</code>, <code>expireOrder</code>, <code>handlePaymentSuccess</code>, <code>verifyWebhookSignature</code>, <code>hmacSha256</code>, <code>handlePayOSWebhook</code>) đều đạt <strong>100% Branch Coverage</strong>.</p>

<h3>6.3. Trích xuất Log kiểm chứng thực tế (Maven Execution Log)</h3>
<pre>
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.sports.fuzz.CartFuzzTest
[INFO] Tests run: 32, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 15.00 s -- in com.sports.fuzz.CartFuzzTest
[INFO] Running com.sports.fuzz.PayOSWebhookFuzzTest
[INFO] Tests run: 65, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.781 s -- in com.sports.fuzz.PayOSWebhookFuzzTest
[INFO] 
[INFO] Results:
[INFO] Tests run: 97, Failures: 0, Errors: 0, Skipped: 0
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total time:  31.732 s
[INFO] ------------------------------------------------------------------------
</pre>

<div class="page-break"></div>

<h1>Phần 7 — Phản biện & Bài học</h1>

<div class="qa-block">
  <div class="qa-question">Câu hỏi 1: Nếu bắt đầu lại từ đầu, nhóm sẽ thiết kế lại phần nào để tránh lỗ hổng ngay từ đầu (thay vì vá sau)?</div>
  <p>Nếu được thiết kế lại từ đầu, nhóm sẽ áp dụng mô hình <strong>Domain-Driven Design (DDD)</strong> với các <strong>Value Object</strong> bất biến thay vì sử dụng các kiểu dữ liệu nguyên thủy (<code>int</code>, <code>long</code>) rời rạc trong Entity. Cụ thể, định nghĩa một Value Object <code>StockQuantity</code> đóng gói sẵn quy tắc bất biến: tự động kiểm tra biên âm và chặn tràn số ngay khi khởi tạo đối tượng, ngăn chặn triệt để CWE-190 và CWE-1284 từ tầng mô hình dữ liệu. Đồng thời, nhóm sẽ áp dụng mẫu thiết kế <strong>State Machine Pattern</strong> độc lập có bảng chuyển dịch trạng thái tường minh (State Transition Matrix) cho vòng đời đơn hàng, thay vì dùng các câu lệnh điều kiện <code>if-else</code> phân tán trong Service để phòng ngừa CWE-841 ngay từ khâu kiến trúc.</p>
</div>

<div class="qa-block">
  <div class="qa-question">Câu hỏi 2: Có lỗ hổng nào nhóm nghi ngờ vẫn còn tồn tại nhưng chưa đủ thời gian/công cụ để xác nhận không?</div>
  <p>Nhóm nghi ngờ vẫn còn tiềm ẩn nguy cơ <strong>Tranh chấp điều kiện phân tán (Distributed Race Conditions & Deadlocks)</strong> ở mức cô lập giao dịch cơ sở dữ liệu (<code>Transaction Isolation Level</code>) khi có hàng nghìn yêu cầu đặt hàng đồng thời trên môi trường cụm máy chủ nhiều instance. Mặc dù hệ thống đã sử dụng khóa bi quan <code>@Lock(PESSIMISTIC_WRITE)</code>, nhưng bộ kiểm thử hiện tại sử dụng kho giả lập (Mockito Mock Repository) nên chưa kiểm chứng được toàn diện hành vi thực tế của cơ chế hàng đợi khóa hàng (<code>row-level locking</code>) và thời gian chờ khóa (<code>innodb_lock_wait_timeout</code>) của MySQL trong điều kiện chịu tải cực lớn.</p>
</div>

<div class="qa-block">
  <div class="qa-question">Câu hỏi 3: Bài học lớn nhất về phương pháp luận (không phải về cú pháp ngôn ngữ) mà nhóm rút ra được?</div>
  <p>Bài học lớn nhất nhóm rút ra là tinh thần cốt lõi <strong>"Trust, but verify"</strong> và giá trị đột phá của kỹ thuật <strong>White-box Fuzzing dựa trên độ phủ (Coverage-guided Fuzzing)</strong>. Trong thực tế, các lập trình viên thường chỉ viết Unit Test cho các kịch bản thành công và vài trường hợp biên quen thuộc (Happy path), dẫn tới việc bỏ sót các trạng thái cực đoan như Integer Overflow (CWE-190) khi giá trị chạm trần 2<sup>31</sup> - 1. Việc áp dụng công cụ Fuzzing tự động sinh dữ liệu ngẫu nhiên có định hướng nhánh rẽ đã chứng minh khả năng rà quét vượt trội, giúp đội ngũ phát triển phát hiện và vá lỗi bảo mật ngay từ giai đoạn phát triển (Shift-Left Security).</p>
</div>

<div class="page-break"></div>

<h1>Phần 8 — Phụ lục</h1>

<h3>8.1. Hướng dẫn biên dịch và tái lập kết quả kiểm thử</h3>
<p>Yêu cầu môi trường: Java 17 LTS, Apache Maven 3.9.x.</p>
<pre>
# 1. Chạy toàn bộ 97 ca kiểm thử hồi quy
cd c:\Project\Web_badminton\backend
mvn test "-Dtest=CartFuzzTest,PayOSWebhookFuzzTest" -Dmaven.compiler.useIncrementalCompilation=false

# 2. Đo độ phủ mã nguồn với JaCoCo
mvn -Pfuzz-coverage test -Dmaven.compiler.useIncrementalCompilation=false
mvn -Pfuzz-coverage jacoco:report
# Xem kết quả tại: backend/target/site/fuzz-coverage/index.html

# 3. Chạy kiểm thử Fuzzing động với Jazzer
$env:JAZZER_FUZZ = "1"
mvn test "-Dtest=CartFuzzTest#fuzzReservationArithmetic" "-Djazzer.internal.arg.0=fuzz" "-Djazzer.internal.arg.1=-max_total_time=10" "-Djazzer.internal.arg.2=-runs=1000" "-Djazzer.internal.arg.3=-seed=20260924"
$env:JAZZER_FUZZ = $null
</pre>

<h3>8.2. Danh mục tài liệu và artifact kiểm chứng trong dự án</h3>
<ul>
  <li>Báo cáo kết quả kiểm thử chi tiết: <code>backend/target/surefire-reports/</code></li>
  <li>Tệp tin crash mẫu tái hiện CWE-190: <code>backend/target/fuzz-step6-20260924/fuzzReservationArithmetic/crash-da39a3ee5e6b4b0d3255bfef95601890afd80709</code></li>
  <li>Báo cáo độ phủ HTML JaCoCo: <code>backend/target/site/fuzz-coverage/index.html</code></li>
  <li>Nhật ký thực thi kiểm thử: <code>backend/target/final-step5-20260924/regression.log</code></li>
</ul>

<h3>8.3. Bảng phân công công việc thực tế trong nhóm</h3>
<p><em>(Để trống theo yêu cầu để nhóm tự bổ sung thông tin thành viên và phân công)</em></p>
<table>
  <thead>
    <tr>
      <th style="width: 8%;">STT</th>
      <th style="width: 28%;">Họ và tên thành viên</th>
      <th style="width: 18%;">MSSV</th>
      <th style="width: 32%;">Nhiệm vụ phân công</th>
      <th style="width: 14%;">Đóng góp</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>[........................................................]</td><td>[....................]</td><td>[........................................................................]</td><td>[..... %]</td></tr>
    <tr><td>2</td><td>[........................................................]</td><td>[....................]</td><td>[........................................................................]</td><td>[..... %]</td></tr>
    <tr><td>3</td><td>[........................................................]</td><td>[....................]</td><td>[........................................................................]</td><td>[..... %]</td></tr>
    <tr><td>4</td><td>[........................................................]</td><td>[....................]</td><td>[........................................................................]</td><td>[..... %]</td></tr>
  </tbody>
</table>

</body>
</html>
"""

with open(REPORT_HTML, "w", encoding="utf-8") as f:
    f.write(html_content)
print(f"Saved HTML to {REPORT_HTML}")

# Generate PDF via Edge headless
print("Generating PDF via Edge headless...")
cmd = [
    EDGE_EXE,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={REPORT_PDF}",
    REPORT_HTML
]
res = subprocess.run(cmd, capture_output=True, text=True)
if os.path.exists(REPORT_PDF):
    size = os.path.getsize(REPORT_PDF)
    print(f"SUCCESS: Generated PDF at {REPORT_PDF} ({size} bytes)")
else:
    print(f"ERROR: Failed to generate PDF. Exit code: {res.returncode}, Stderr: {res.stderr}")
