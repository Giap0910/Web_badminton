# KẾ HOẠCH BACKEND

> **Source of truth:** `docs/fix/FIX_TRACKER.csv` là SOURCE OF TRUTH DUY NHẤT cho trạng thái thực thi hiện tại: backend/frontend status và verification, contract, cross-stack, overall, blocker, requested, agent, evidence, commit, last action và last updated. Trạng thái implementation, verification và contract hiện tại chỉ được đọc và ghi tại CSV. Các status/Readiness Assessment trong `.md` chỉ là **PLANNING / READINESS SNAPSHOT**, không dùng để quyết định quyền triển khai hoặc báo tiến độ. Không cập nhật status trong `.md` sau mỗi FIX; chỉ sửa specification khi thay đổi requirement, dependency, acceptance criteria, scope, API contract hoặc quyết định kiến trúc.

BACKEND_FIX_PLAN.md không phải execution tracker. Đây là specification về yêu cầu backend, file/service/controller/repository/entity, database, validation, security, backend tests và acceptance criteria backend. Codex đọc yêu cầu tại đây; đọc và cập nhật current status chỉ tại FIX_TRACKER.csv.

Trước mọi lần cập nhật FIX_TRACKER.csv, agent phải reload bản tracker mới nhất và tuân thủ Concurrent Tracker Update Protocol trong MASTER_FIX_PLAN.md.

# Giai đoạn hiện tại

Audit/Planning ban đầu đã hoàn thành. Các câu “chưa implement”, “không sửa code”, “không tạo implementation” trong lịch sử tài liệu mô tả thời điểm tạo kế hoạch; không còn là lệnh cấm toàn cục đối với giai đoạn IMPLEMENTATION. Tại thời điểm audit chưa có implementation cho các FIX được đề xuất; readiness không chứng minh code đã sửa hoặc test đã chạy.

Ở nhiệm vụ IMPLEMENTATION tiếp theo được Phong yêu cầu, chỉ được sửa source thuộc FIX có Implementation Status `READY` hoặc đã chuyển `IN_PROGRESS`, đúng phía và đúng phạm vi file của FIX. Không tự mở rộng scope; task `BLOCKED` không được triển khai phần đang bị dependency chặn. RECOMMENDED và OPTIONAL không tự trở thành bắt buộc.

Mặc định mỗi lần chỉ một FIX; chỉ làm nhóm dependency nhỏ khi prompt implementation nêu rõ từng FIX và chúng đã sẵn sàng. Không tự triển khai cả 56 FIX hoặc sửa thêm task liên quan chưa READY/IN_PROGRESS. Migration, production DB, secret, deploy, dependency mới và thay đổi môi trường nhạy cảm vẫn theo giới hạn/ủy quyền riêng của task; READY không thay thế các điều kiện này. Cross-stack verification chỉ thực hiện sau khi hai phía hoàn thành và local tests đạt.

Lần chuẩn hóa ngày 02/10/2026 chỉ thay đổi bốn tài liệu kế hoạch; chưa triển khai source, chưa chạy test ứng dụng. Trạng thái thực thi từng phía chỉ được đọc/ghi tại `docs/fix/FIX_TRACKER.csv`; không suy ra từ thứ tự FIX-ID hoặc snapshot trong plan.

Ngày: 02/10/2026. **Lịch sử lúc tạo kế hoạch: chưa sửa code/chưa chạy test.** ID tham chiếu [MASTER_FIX_PLAN.md](docs/fix/MASTER_FIX_PLAN.md); mọi giao tiếp theo [API_CHANGES.md](docs/fix/API_CHANGES.md). Tại lần audit ban đầu, API/entity mới chỉ là đề xuất và chưa tạo implementation hay chạy migration. Từ giai đoạn triển khai, áp dụng mục Giai đoạn hiện tại và Implementation Entry Point trong MASTER; trạng thái từng FIX bên dưới chỉ là snapshot readiness; chỉ đọc/ghi trạng thái hiện tại tại `docs/fix/FIX_TRACKER.csv`.

## Nguyên tắc triển khai

Giữ Java17/Spring Boot/JPA/MySQL và mô hình3 lớp; giữ transaction/locks/ownership/HMAC đã đúng. File source liệt kê là file hiện có liên quan, không khẳng định tất cả đều cần thay. Class mới nếu cần phải nêu đường dẫn và được Phong thống nhất trước khi tạo. Không sửa .env, config nhạy cảm hay DB thật trong đợt lập kế hoạch.

Tests sau sửa dùng AAA với JUnit5, Jazzer cho invariant tiền/kho/HMAC; integration DB riêng mới chứng minh rollback/concurrency. [CartFuzzTest.java](backend/src/test/java/com/sports/fuzz/CartFuzzTest.java) và [PayOSWebhookFuzzTest.java](backend/src/test/java/com/sports/fuzz/PayOSWebhookFuzzTest.java) hiện đã kiểm thử implementation thật với repository mock, cần giữ.


# Trạng thái triển khai

Tên Implementation Status/Verification Status/Contract Status dưới đây là nhãn snapshot. Mọi quy tắc chuyển trạng thái chỉ thực hiện ở BACKEND_STATUS/BACKEND_VERIFY hoặc FRONTEND_STATUS/FRONTEND_VERIFY, CONTRACT_STATUS và CROSS_STACK_VERIFY của dòng FIX trong FIX_TRACKER.csv. Phải đọc CSV trước khi quyết định làm FIX; chỉ triển khai FIX được user giao (REQUESTED=YES) và phía phụ trách READY. Tuân thủ FIX Tracker Update Protocol trong MASTER.

Đây là kế hoạch đã qua readiness pass; việc chuẩn hóa tài liệu không chứng minh một FIX đã được triển khai. Không tự đánh dấu hoàn thành từ tên file, giao diện, API đề xuất hoặc test chưa chạy.

| Implementation Status | Ý nghĩa |
|---|---|
| `TODO` | Chưa đủ điều kiện hoặc chưa bắt đầu. |
| `BLOCKED` | Bị chặn bởi dependency hoặc API contract. |
| `READY` | Đã chứng minh đủ điều kiện triển khai, gồm dependency bắt buộc. |
| `IN_PROGRESS` | Đang triển khai phần việc thuộc phạm vi của agent. |
| `DONE` | Implementation đã tự review, test/acceptance/regression/phạm vi đạt, verification tương ứng PASSED và có bằng chứng trong CSV. |
| `FAILED` | Implementation hoặc test thất bại. |
| `NEEDS_REVIEW` | Đã làm nhưng cần reviewer xác minh. |

Verification Status chỉ dùng `NOT_RUN`, `PASSED`, `FAILED`, `NEEDS_REVIEW`: lần lượt là chưa chạy, đã chạy đạt, đã chạy thất bại, hoặc cần xác minh kết quả. Cross-stack Verification Status dùng cùng tập trạng thái và được theo dõi riêng với kiểm thử từng phía.

| Contract Status | Ý nghĩa |
|---|---|
| `NO_CHANGE` | FIX không tự thay đổi API contract. |
| `PROPOSED` | Contract mới/thay đổi mới là đề xuất, chưa triển khai. |
| `APPROVED` | Contract đã được thống nhất; không có nghĩa API đã tồn tại. |
| `IMPLEMENTING` | Backend đang triển khai contract đã thống nhất. |
| `IMPLEMENTED` | Backend thực sự đã cung cấp contract, có kiểm thử và bằng chứng bàn giao. |
| `VERIFIED` | Contract đã được xác minh qua tích hợp backend–frontend. |

Readiness pass ngày 02/10/2026 đã phân loại từng FIX bên dưới. READY chỉ xác nhận đủ điều kiện bắt đầu phần việc được giao; APPROVED chỉ chốt target contract. Mọi verification vẫn NOT_RUN; chưa có DONE/PASSED/IMPLEMENTED/VERIFIED. Backend dependency bình thường chưa DONE giữ TODO; frontend có Backend Dependency chưa DONE giữ BLOCKED. RECOMMENDED/OPTIONAL chưa được chọn không tự READY.

# Quy tắc thứ tự triển khai

1. KHÔNG triển khai máy móc theo số FIX-ID. Ví dụ FIX-002 phải chờ FIX-018 và FIX-054 theo dependency hiện có dù các ID đó lớn hơn.
2. Trước mỗi FIX, kiểm tra Dependency, Backend Dependency (nếu có), API contract, các task bắt buộc liên quan và trạng thái implementation thực tế. Giữ nguyên graph; không thêm hoặc bỏ cạnh phụ thuộc để làm task có vẻ sẵn sàng.
3. Chỉ chuyển `READY` khi các dependency bắt buộc đã đáp ứng và có bằng chứng. Chưa có bằng chứng không đồng nghĩa đã hoàn thành.
4. Với Scope=`BOTH`, quy trình mặc định: Backend → Backend test → API contract sẵn sàng → Frontend → Frontend test → Cross-stack verification.
5. Frontend không được giả định API đề xuất đã tồn tại; không tạo mock/local array hoặc trạng thái thành công giả để thay API bắt buộc còn thiếu.
6. Nếu Backend Dependency chưa `DONE`, Frontend Implementation Status phải là `BLOCKED`. Có thể chuẩn bị UI độc lập trong phạm vi cho phép, nhưng không coi phần integration đã hoàn thành.
7. FIX không đổi contract dùng `NO_CHANGE`. FIX có API mới/thay đổi chưa được duyệt dùng `PROPOSED`; target đủ rõ dùng `APPROVED`, đang code dùng `IMPLEMENTING`; chỉ sau khi backend thực sự triển khai mới được `IMPLEMENTED`, và chỉ sau integration verification mới được `VERIFIED`.
8. Frontend chỉ tích hợp API mới khi Contract Status thực tế là `IMPLEMENTED` hoặc `VERIFIED`. `APPROVED`/`IMPLEMENTING` chưa đủ. FIX có `NO_CHANGE` vẫn phải kiểm tra readiness của API mới do dependency cung cấp; nhãn này không bỏ qua dependency.
9. Cùng FIX-ID ở hai file biểu thị hai trách nhiệm của một vấn đề. Backend Dependency trỏ phần backend cùng ID không phải cạnh tự phụ thuộc trong graph MASTER.
10. Giữ nguyên Acceptance Criteria nghiệp vụ. Với BOTH, tiêu chí có nội dung xuyên hai phía là mục tiêu tích hợp; mỗi agent chỉ sửa phần mình và bàn giao bằng chứng. Không yêu cầu agent tự sửa phía còn lại để đạt toàn bộ tiêu chí.
11. Test fixtures dùng trong kiểm thử có kiểm soát không phải implementation thay API. Không dùng chúng để công bố integration đã pass khi backend bắt buộc chưa sẵn sàng. Không chạy test thay đổi dữ liệu trong nhiệm vụ chỉnh tài liệu này.
12. Giữ OPTIONAL là OPTIONAL. Task chưa được chọn không tự trở thành bắt buộc và không được tự mở rộng feature/contract.
13. Khi cập nhật trạng thái sau này, chỉ ghi vào FIX_TRACKER.csv cùng bằng chứng implementation, môi trường test và kết quả tương ứng; code xong phải NEEDS_REVIEW, chỉ DONE sau verification PASSED. Hai trạng thái local không tự kéo theo cross-stack `PASSED`. Với `NO_CHANGE`, giữ nguyên nhãn contract và ghi kết quả tích hợp ở Verification Status.
14. Nếu phát hiện dependency thiếu/vòng/mâu thuẫn, ghi cuối file trong `Planning Issues Detected`; không âm thầm đổi graph. Lần chuẩn hóa trước chỉ chỉnh hai kế hoạch chuyên trách; đó là giới hạn lịch sử. Ở nhiệm vụ tiếp theo, chỉ chỉnh tài liệu được prompt cho phép; không tự đổi graph/contract hoặc nghiệp vụ.

Workflow tổng thể: Codex Audit → Plan → kiểm tra backend dependency sẵn sàng → Codex triển khai Backend → Backend tests pass → API contract implemented → Antigravity triển khai Frontend → Frontend tests pass → Codex reviewer kiểm tra Cross-stack → Verified.

## Phân công agent và bàn giao

Codex backend chỉ chịu trách nhiệm backend theo file này. Frontend được thực hiện theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md) bởi Antigravity IDE; Codex reviewer xác minh tích hợp cuối. Không tự sửa UI. Bàn giao cho frontend HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Không đánh dấu API_CHANGES.md đã được triển khai chỉ vì hai file kế hoạch có trạng thái mới.

## Task backend (44)

### FIX-001 — Loại bỏ khóa JWT mặc định trong cấu hình

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; file cấu hình/provider và tiêu chí fail-fast đã rõ; NO_CHANGE. READY cho sửa source theo prompt tiếp theo, không tự xoay secret hoặc sửa môi trường thật.
- **Frontend Coordination:** NOT_REQUIRED
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Critical / Security / BACKEND; ESSENTIAL.
- **File backend cần xem/sửa:** [application.yml](backend/src/main/resources/application.yml); [JwtTokenProvider.java](backend/src/main/java/com/sports/security/JwtTokenProvider.java).
- **Class / Method / Endpoint:** JwtTokenProvider.validateSigningKey/getSigningKey; app.jwt.secret.
- **Hiện tại / Nguyên nhân:** application.yml có fallback khóa ký cố định; rủi ro giả mạo JWT nếu môi trường không ghi đè. validateSigningKey kiểm tra định dạng/độ dài, không ngăn dùng khóa đã nằm trong source.
- **Phần backend phải làm:** Bắt buộc cung cấp JWT_SECRET từ môi trường; thiếu khóa phải dừng khởi động; lập phương án xoay khóa và vô hiệu token cũ khi triển khai.
- **Database:** Không đổi schema.
- **Security:** Giữ auth/role/ownership của endpoint; Không log khóa; từ chối khóa rỗng/sai định dạng; quyền vẫn lấy từ DB.
- **Validation:** Không log khóa; từ chối khóa rỗng/sai định dạng; quyền vẫn lấy từ DB.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** Không.
- **Phối hợp frontend:** Không có task frontend đối ứng; tránh mở rộng phạm vi.
- **Acceptance Criteria:** Không khởi động bằng khóa fallback; JWT ký bằng khóa cũ không dùng được sau xoay khóa có kiểm soát.

### Backend Tests

- **Test cần thực hiện:** Kiểm tra thiếu/sai/đúng biến môi trường và token cũ trên môi trường test.

### FIX-002 — Hoàn thiện tạo link thanh toán PayOS

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-001, FIX-018, FIX-054.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PAYMENT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Critical / Integration / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [PayOSService.java](backend/src/main/java/com/sports/service/PayOSService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [PaymentController.java](backend/src/main/java/com/sports/controller/PaymentController.java); [OrderResponse.java](backend/src/main/java/com/sports/dto/OrderResponse.java).
- **Class / Method / Endpoint:** OrderService.createOrder; PayOSService.createSignatureForPaymentLink; PaymentController; phương thức tạo/truy vấn link mới (đề xuất).
- **Hiện tại / Nguyên nhân:** Đơn PayOS chỉ được gán payosOrderCode; không gọi gateway và không điền checkoutUrl/qrCode. PayOSService mới có hàm chữ ký, không có tạo/truy vấn link.
- **Phần backend phải làm:** Tạo/truy vấn link cho đơn đã được lưu và giữ kho; timeout phải tra cứu theo mã trước khi thử lại; không giữ transaction DB qua cuộc gọi HTTP.
- **Database:** PaymentAttempt liên kết Order, unique mã gateway/paymentLinkId, trạng thái và thời điểm.
- **Security:** Giữ auth/role/ownership của endpoint; Chủ đơn; chỉ PAYOS_VIETQR/PENDING/chưa hết hạn; số tiền từ DB, VND nguyên và trong giới hạn gateway.
- **Validation:** Chủ đơn; chỉ PAYOS_VIETQR/PENDING/chưa hết hạn; số tiền từ DB, VND nguyên và trong giới hạn gateway.
- **Request / Response:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-001, FIX-018, FIX-054
- **Phối hợp frontend:** Phần frontend cùng FIX-002 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Đơn hợp lệ nhận link thực; timeout không tạo đơn mới hoặc trừ kho lần hai.

### Backend Tests

- Kiểm thử service/controller tạo và truy vấn link với HTTP gateway test: thành công, lỗi, timeout và retry; xác minh số tiền DB, quyền chủ đơn và không tạo đơn/giữ kho lần hai.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-002.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Mock HTTP lỗi/timeout và fixture gateway; thử môi trường thanh toán được cấp riêng. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-003 — Lưu giao dịch và đối soát thanh toán muộn

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-002.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PAYMENT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [PaymentController.java](backend/src/main/java/com/sports/controller/PaymentController.java); [AdminPaymentController.java](backend/src/main/java/com/sports/controller/AdminPaymentController.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java).
- **Class / Method / Endpoint:** PaymentController.handlePayOSWebhook; OrderService.handlePaymentSuccess; AdminPaymentController.getAllPayments.
- **Hiện tại / Nguyên nhân:** Callback muộn/đơn đã hủy chỉ bị từ chối và ghi log; admin payments dựng từ đơn, thiếu transaction reference thật. Không có payment ledger, hàng đợi đối soát hoặc dấu vết kết quả xử lý.
- **Phần backend phải làm:** Lưu sự kiện đã xác minh và reference; áp dụng idempotency, đối soát số tiền; giao dịch muộn chuyển NEEDS_REVIEW, không hồi sinh đơn đã hủy.
- **Database:** PaymentAttempt/PaymentEvent với unique reference theo gateway, paidAt, amount, reviewReason; khóa cập nhật.
- **Security:** Giữ auth/role/ownership của endpoint; Giữ HMAC, so sánh amount, khóa order; không tin return query hay client; admin không tự đánh PAID.
- **Validation:** Giữ HMAC, so sánh amount, khóa order; không tin return query hay client; admin không tự đánh PAID.
- **Request / Response:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-002
- **Phối hợp frontend:** Phần frontend cùng FIX-003 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Webhook lặp không trừ kho hai lần; tiền nhận muộn có hồ sơ đối soát; lỗi commit không mất khả năng xử lý lại.

### Backend Tests

- Callback hợp lệ/lặp/đồng thời/sai tiền/đơn hủy; giả lập lỗi commit và retry trên DB test; xác minh reference, trạng thái đối soát và settle đúng một lần.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-003.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Callback lặp/đồng thời/sai tiền/đơn hủy; giả lập lỗi DB sau gateway thành công và thử lại. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-004 — Sửa trang QR và đường dẫn trả về thanh toán

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-002, FIX-003.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PAYMENT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Integration / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [PayOSService.java](backend/src/main/java/com/sports/service/PayOSService.java); [application.yml](backend/src/main/resources/application.yml).
- **Class / Method / Endpoint:** PayOSService.returnUrl/cancelUrl; đường dẫn frontend return/cancel.
- **Hiện tại / Nguyên nhân:** Return URL /orders/success không có orderId; /orders/cancel có thể khớp route order detail; qrCode được dùng như URL ảnh. Chưa thống nhất route, mã đơn nội bộ và payload QR.
- **Phần backend phải làm:** Dùng return/cancel URL có orderId nội bộ; lưu mapping mã gateway; URL không phải bằng chứng thanh toán.
- **Database:** Đọc mapping FIX-002, không thêm bảng riêng.
- **Security:** Giữ auth/role/ownership của endpoint; Kiểm tra owner khi fetch; callback/query giả không thay đổi payment status.
- **Validation:** Kiểm tra owner khi fetch; callback/query giả không thay đổi payment status.
- **Request / Response:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-002, FIX-003
- **Phối hợp frontend:** Phần frontend cùng FIX-004 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Reload/mở trực tiếp/back/đóng cửa sổ vẫn xem đúng đơn; cancel redirect không tự hủy đơn.

### Backend Tests

- Kiểm tra URL return/cancel được tạo đúng mapping orderId; API đọc payment/order kiểm tra owner; query status giả không thay trạng thái; response phân biệt payload QR với URL.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-004.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Thử return trước/sau webhook, query status giả, QR payload không phải URL. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-006 — Giữ đầy đủ tùy chọn từ chi tiết đến đơn hàng

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-007, FIX-008. Xem thêm Planning Issues Detected.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Integration / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [OrderItemRequest.java](backend/src/main/java/com/sports/dto/OrderItemRequest.java); [OrderItemResponse.java](backend/src/main/java/com/sports/dto/OrderItemResponse.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderItem.java](backend/src/main/java/com/sports/entity/OrderItem.java).
- **Class / Method / Endpoint:** OrderService.reserveItem/toDto; OrderItemRequest/Response.
- **Hiện tại / Nguyên nhân:** normalizeOptions loại gauge/stringing/texture/feather/speed/pack/variant/addon/customPrint; lựa chọn bị mất hoặc gộp dòng sai. Tên option không thống nhất; checkout chỉ gửi vài chuỗi và ghép phần khác vào note.
- **Phần backend phải làm:** Nhận variantId và serviceSelection theo schema chuẩn; snapshot lựa chọn đã xác minh; không nhận option tự do làm căn cứ giá.
- **Database:** OrderItem lưu variantId nullable cho dữ liệu cũ và optionsSnapshot.
- **Security:** Giữ auth/role/ownership của endpoint; Variant thuộc product, active, tổ hợp hợp lệ; note không thay cho định danh biến thể.
- **Validation:** Variant thuộc product, active, tổ hợp hợp lệ; note không thay cho định danh biến thể.
- **Request / Response:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-007, FIX-008
- **Phối hợp frontend:** Phần frontend cùng FIX-006 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Mỗi lựa chọn có ảnh hưởng giao hàng được giữ qua reload và tạo đơn; không gộp sai dòng.

### Backend Tests

- Kiểm tra request/response và persistence của variantId/serviceSelection/optionsSnapshot cho năm nhóm sản phẩm; chặn lựa chọn không hợp lệ; xác minh dữ liệu legacy theo phương án hiện có.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-006.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Chạy bảng test 5 loại sản phẩm với lựa chọn khác nhau và cart cũ. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-007 — Biến thể, giá và tồn kho theo SKU bán được

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-021, FIX-045, FIX-055.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [Product.java](backend/src/main/java/com/sports/entity/Product.java); [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [ProductRepository.java](backend/src/main/java/com/sports/repository/ProductRepository.java); [ProductDto.java](backend/src/main/java/com/sports/dto/ProductDto.java).
- **Class / Method / Endpoint:** ProductService.createProduct/updateProduct; OrderService.lockProduct/reserveItem/settleReservedStock.
- **Hiện tại / Nguyên nhân:** Chỉ có stock/price cấp Product; size/màu/3U-G5 hardcode; sweatband tự cộng giá trên client nhưng backend tính giá Product. Chưa có ProductVariant và nguồn dữ liệu lựa chọn chuẩn.
- **Phần backend phải làm:** Bổ sung variant có SKU, attributes, price, stock, reservedStock, active; giữ khóa/transaction; kế hoạch chuyển mỗi SKU cũ sang một variant mặc định.
- **Database:** ProductVariant FK Product, SKU unique, unique tổ hợp chuẩn hóa; backfill có đối chiếu kho cũ; không tự chia stock cho các màu/size.
- **Security:** Giữ auth/role/ownership của endpoint; Giá dương, stock nguyên không âm; variant thuộc Product; tổng stock khả dụng+reserved có giới hạn.
- **Validation:** Giá dương, stock nguyên không âm; variant thuộc Product; tổng stock khả dụng+reserved có giới hạn.
- **Request / Response:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-021, FIX-045, FIX-055
- **Phối hợp frontend:** Phần frontend cùng FIX-007 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Không mua biến thể không tồn tại/ngừng bán; hai người mua chiếc cuối chỉ một đơn thành công.

### Backend Tests

- Integration MySQL: tranh mua SKU cuối, sửa kho đồng thời, variant không thuộc product/ngừng bán, giá và stock riêng từng SKU.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-007.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Integration MySQL tranh mua, admin sửa kho đồng thời; E2E size/màu/weight/grip. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-008 — Dịch vụ căng cước và phụ phí có dữ liệu thật

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-007. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Integration / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderItemRequest.java](backend/src/main/java/com/sports/dto/OrderItemRequest.java); [OrderItem.java](backend/src/main/java/com/sports/entity/OrderItem.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java).
- **Class / Method / Endpoint:** OrderService.reserveItem/calculateOrderTotal; DTO serviceSelection đề xuất.
- **Hiện tại / Nguyên nhân:** UI chọn loại cước/mức căng và thông báo miễn phí, backend chỉ lưu chuỗi; không định giá dịch vụ hoặc kiểm tra sức căng. Cấu hình dịch vụ nằm trong JSX, chưa có bảng giá và giới hạn kỹ thuật có đơn vị.
- **Phần backend phải làm:** Định nghĩa danh mục dịch vụ tối thiểu với stringVariantId, tensionLbs, laborFee; tính giá tại server; quản lý vật tư nếu bán kèm.
- **Database:** ServiceOption và snapshot phí/thông số trong OrderItem; vật tư liên kết variant khi cần trừ kho.
- **Security:** Giữ auth/role/ownership của endpoint; Căng không vượt maxTensionLbs; đơn vị thống nhất; cước tương thích/active/còn kho.
- **Validation:** Căng không vượt maxTensionLbs; đơn vị thống nhất; cước tương thích/active/còn kho.
- **Request / Response:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-007
- **Phối hợp frontend:** Phần frontend cùng FIX-008 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Tổng tiền bao gồm đúng phí đã xác nhận; yêu cầu kỹ thuật xuất hiện trong đơn admin.

### Backend Tests

- Service tính tiền và validate không căng/có căng, vượt sức căng, cước hết hàng, phí client bị sửa; round-trip cấu hình dịch vụ.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-008.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Chọn không căng/có căng, vượt sức căng, cước hết hàng, sửa phí client. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-012 — Review gắn với lần mua và chống trùng

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-011, FIX-020.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** REVIEW
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Validation / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [ReviewService.java](backend/src/main/java/com/sports/service/ReviewService.java); [ReviewRequest.java](backend/src/main/java/com/sports/dto/ReviewRequest.java); [ReviewResponse.java](backend/src/main/java/com/sports/dto/ReviewResponse.java); [Review.java](backend/src/main/java/com/sports/entity/Review.java); [ReviewRepository.java](backend/src/main/java/com/sports/repository/ReviewRepository.java).
- **Class / Method / Endpoint:** ReviewService.addReview/toDto; ReviewController.addReview và endpoint sửa/xóa/eligible đề xuất.
- **Hiện tại / Nguyên nhân:** Người đăng nhập có thể review sản phẩm chưa mua và gửi nhiều lần. Chỉ kiểm tra user/product tồn tại, không liên kết OrderItem.
- **Phần backend phải làm:** Yêu cầu orderItemId thuộc đơn COMPLETED của user; unique mỗi orderItem; bổ sung sửa/xóa review của chính chủ.
- **Database:** Review FK order_item, unique(order_item_id); review cũ đánh dấu chưa xác minh, không tự gán đơn.
- **Security:** Giữ auth/role/ownership của endpoint; Rating 1..5, comment sau sanitize không rỗng và <=2000 ký tự, ownership.
- **Validation:** Rating 1..5, comment sau sanitize không rỗng và <=2000 ký tự, ownership.
- **Request / Response:** Nhóm REVIEW trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-011, FIX-020
- **Phối hợp frontend:** Phần frontend cùng FIX-012 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Mua chưa hoàn tất bị chặn; gửi trùng đồng thời chỉ một review; sửa/xóa đúng owner.

### Backend Tests

- Controller/service/repository: chưa mua, khác user, rating biên, comment sau sanitize, orderItem sai product, duplicate đồng thời và ownership sửa/xóa.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-012.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** API test chưa mua/khác user/rating biên/trùng và E2E review sau mua. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-014 — Quy tắc đổi trả và hoàn tiền có kiểm soát

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-003, FIX-013, FIX-039. Xem thêm Planning Issues Detected.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** RETURN
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Validation / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [ReturnService.java](backend/src/main/java/com/sports/service/ReturnService.java); [ReturnController.java](backend/src/main/java/com/sports/controller/ReturnController.java); [ReturnRequest.java](backend/src/main/java/com/sports/entity/ReturnRequest.java); [ReturnCreateRequest.java](backend/src/main/java/com/sports/dto/ReturnCreateRequest.java).
- **Class / Method / Endpoint:** ReturnService.createReturnRequest/updateStatus/toDto; ReturnController.updateStatus.
- **Hiện tại / Nguyên nhân:** Tạo đổi trả chỉ kiểm tra ownership; updateStatus chấp nhận chuyển bất kỳ; chưa có hoàn tiền hay hoàn kho hàng trả. Thiếu điều kiện đủ hạn, chống trùng và quy trình xử lý sau duyệt.
- **Phần backend phải làm:** Chốt chính sách returnWindowDays; chỉ cho đơn COMPLETED; PENDING→APPROVED/REJECTED, APPROVED→COMPLETED; hoàn tiền thủ công có bằng chứng giao dịch, hoàn kho chỉ sau kiểm nhận.
- **Database:** Return thêm processedAt; RefundRecord với amount/reference/status; unique yêu cầu đang hoạt động theo order; lịch sử nhập lại kho.
- **Security:** Giữ auth/role/ownership của endpoint; Không vượt số tiền đã nhận/trừ refund trước; không hoàn tiền/kho hai lần; quyền admin.
- **Validation:** Không vượt số tiền đã nhận/trừ refund trước; không hoàn tiền/kho hai lần; quyền admin.
- **Request / Response:** Nhóm RETURN trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-003, FIX-013, FIX-039
- **Phối hợp frontend:** Phần frontend cùng FIX-014 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Đơn chưa giao/ngoài hạn/trùng bị chặn; không chuyển lùi; hoàn tiền và nhập lại kho có dấu vết riêng.

### Backend Tests

- Ma trận chuyển trạng thái, điều kiện hạn/đơn, duplicate concurrent, refund lặp/quá tiền và restock không đủ điều kiện trên DB test.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-014.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Test các cặp trạng thái, duplicate concurrent, refund lặp, hàng không đủ điều kiện nhập lại. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-015 — Địa chỉ có cấu trúc và checkout chọn đúng địa chỉ

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Chưa chốt bộ dữ liệu địa chỉ theo ADDRESS; xem Planning Issues Detected.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ADDRESS
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Bug / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [ShippingAddressDto.java](backend/src/main/java/com/sports/dto/ShippingAddressDto.java); [ShippingAddress.java](backend/src/main/java/com/sports/entity/ShippingAddress.java); [ShippingAddressService.java](backend/src/main/java/com/sports/service/ShippingAddressService.java).
- **Class / Method / Endpoint:** ShippingAddressService.createAddress/updateAddress/toDto; ShippingAddressDto.
- **Hiện tại / Nguyên nhân:** Sửa địa chỉ ghép chuỗi lần nữa và giữ địa phương mặc định; checkout tải danh sách nhưng không có selector/saveInfo thật. DB chỉ có address/province; form detail lại nhận địa chỉ đầy đủ.
- **Phần backend phải làm:** Lưu addressLine/provinceCode/wardCode và districtCode tùy hệ địa chỉ; giữ legacy address cho dữ liệu cũ, không đoán tách chuỗi.
- **Database:** Bổ sung trường cấu trúc, nhãn tùy chọn; bảo toàn address cũ.
- **Security:** Giữ auth/role/ownership của endpoint; Phone đúng regex không có ký tự |; kiểm tra địa bàn theo bộ dữ liệu được shop chọn; owner từ JWT.
- **Validation:** Phone đúng regex không có ký tự |; kiểm tra địa bàn theo bộ dữ liệu được shop chọn; owner từ JWT.
- **Request / Response:** Nhóm ADDRESS trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-015 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Sửa/lưu nhiều lần không nhân đôi địa chỉ; checkout dùng đúng địa chỉ được chọn.

### Backend Tests

- Round-trip DTO/service/database cho địa chỉ ngoài TP.HCM, legacy, ký tự |, thiếu phường và ownership; kiểm tra default qua API.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-015.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Tạo/sửa địa chỉ ngoài TP.HCM, legacy, ký tự |, thiếu phường và đổi default. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-016 — Bảo đảm một địa chỉ mặc định khi thao tác đồng thời

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-015.
- **Frontend Coordination:** NOT_REQUIRED
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / Bug / BACKEND; ESSENTIAL.
- **File backend cần xem/sửa:** [ShippingAddressService.java](backend/src/main/java/com/sports/service/ShippingAddressService.java); [ShippingAddressRepository.java](backend/src/main/java/com/sports/repository/ShippingAddressRepository.java); [UserRepository.java](backend/src/main/java/com/sports/repository/UserRepository.java).
- **Class / Method / Endpoint:** ShippingAddressService.setDefaultAddress/createAddress/deleteAddress; resetDefaultAddressForUser.
- **Hiện tại / Nguyên nhân:** Bulk resetDefault và entity đang managed có nguy cơ stale state; thao tác đồng thời chưa khóa theo user. Đây là rủi ro cần tái hiện MySQL. Bulk JPQL không đồng bộ persistence context, không ràng buộc duy nhất mặc định.
- **Phần backend phải làm:** Khóa user trong thao tác default; cập nhật entity/context nhất quán; định nghĩa khi xóa địa chỉ cuối hoặc chọn lại địa chỉ hiện tại.
- **Database:** Cân nhắc default_address_id trên user hoặc invariant trong transaction; kiểm tra dữ liệu cũ trước migration.
- **Security:** Giữ auth/role/ownership của endpoint; Owner; addressId thuộc user; idempotent khi chọn lại.
- **Validation:** Owner; addressId thuộc user; idempotent khi chọn lại.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** FIX-015
- **Phối hợp frontend:** Không có task frontend đối ứng; tránh mở rộng phạm vi.
- **Acceptance Criteria:** User có địa chỉ thì đúng một mặc định; user không có địa chỉ thì không có mặc định.

### Backend Tests

- **Test cần thực hiện:** Integration chọn lại default hiện tại, hai request khác nhau đồng thời, xóa default.

### FIX-017 — Checkout dùng báo giá server và validation đầy đủ

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-006, FIX-015, FIX-023, FIX-054.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Integration / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderCreateRequest.java](backend/src/main/java/com/sports/dto/OrderCreateRequest.java); [OrderController.java](backend/src/main/java/com/sports/controller/OrderController.java); [VoucherService.java](backend/src/main/java/com/sports/service/VoucherService.java).
- **Class / Method / Endpoint:** OrderService.calculateOrderTotal/createOrder; endpoint quote đề xuất, dùng cùng hàm tính tiền.
- **Hiện tại / Nguyên nhân:** UI tính tổng trên giá snapshot; email/địa phương chưa được xử lý đầy đủ; không có quote thống nhất. Tính shipping/voucher lặp ở client và server; dữ liệu cart có thể cũ.
- **Phần backend phải làm:** Thêm POST /orders/quote dùng chung tính tiền với createOrder; quote không giữ kho/voucher; create kiểm tra lại và so expectedTotal, trả conflict nếu giá đổi.
- **Database:** Không cần bảng quote; email nhận đơn snapshot nếu cung cấp.
- **Security:** Giữ auth/role/ownership của endpoint; Giới hạn số dòng, note, tên, số điện thoại; shippingMethod=STANDARD giai đoạn đầu; dữ liệu client không quyết định giá.
- **Validation:** Giới hạn số dòng, note, tên, số điện thoại; shippingMethod=STANDARD giai đoạn đầu; dữ liệu client không quyết định giá.
- **Request / Response:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-006, FIX-015, FIX-023, FIX-054
- **Phối hợp frontend:** Phần frontend cùng FIX-017 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Tổng tiền trên xác nhận khớp server; giá đổi giữa quote/create không âm thầm thu khác.

### Backend Tests

- Gửi trực tiếp request giả giá/discount/fee, voucher hết hạn và stock đổi; quote không giữ kho; create tính lại/PRICE_CHANGED và rollback đúng.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-017.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Sửa giá/discount/fee DevTools; voucher hết hạn; stock đổi; network mất khi quote. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-018 — Chống tạo đơn trùng bằng idempotency

- **Implementation Status:** READY
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; ORDER đủ quy tắc UUID, replay, request hash, status 200/201/409 và CORS cho idempotency; triển khai phần idempotency trên request hiện hữu, chưa bật CheckoutInput của các FIX chưa sẵn sàng.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [OrderController.java](backend/src/main/java/com/sports/controller/OrderController.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java); [SecurityConfig.java](backend/src/main/java/com/sports/security/SecurityConfig.java).
- **Class / Method / Endpoint:** OrderController.createOrder; OrderService.createOrder/lockOrderingUser; SecurityConfig.corsConfigurationSource.
- **Hiện tại / Nguyên nhân:** Khóa user và giới hạn 3 đơn pending không ngăn cùng yêu cầu tạo ra nhiều đơn. Không có khóa idempotency lưu phía server.
- **Phần backend phải làm:** Unique(userId,idempotencyKey), hash payload và orderId trong cùng transaction; replay cùng body trả đơn cũ; key khác body trả 409; cho phép header trong CORS.
- **Database:** Order bổ sung idempotencyKey/requestHash với unique composite.
- **Security:** Giữ auth/role/ownership của endpoint; Key UUID; xác thực user; lookup replay trước kiểm tra pending limit.
- **Validation:** Key UUID; xác thực user; lookup replay trước kiểm tra pending limit.
- **Request / Response:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-018 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Hai request cùng key chỉ một order và một lần giữ kho/voucher.

### Backend Tests

- Cùng key đồng thời, cùng key khác body, retry sau commit/timeout, lookup replay khi user đủ ba đơn pending; kiểm tra unique/transaction.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-018.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Concurrent cùng key, khác body, timeout sau commit, retry khi đã đủ 3 đơn pending. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-020 — Snapshot lịch sử sản phẩm trong OrderItem

- **Implementation Status:** READY
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; ORDER xác định snapshot lịch sử và tên trường response. Giữ contract hiện hữu trong giai đoạn đầu; không tự triển khai variant/service/history của FIX khác.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Bug / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [OrderItem.java](backend/src/main/java/com/sports/entity/OrderItem.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderItemResponse.java](backend/src/main/java/com/sports/dto/OrderItemResponse.java).
- **Class / Method / Endpoint:** OrderService.reserveItem/toDto; OrderItem.
- **Hiện tại / Nguyên nhân:** Giá đã snapshot nhưng tên/ảnh/brand/weightGrip lấy Product hiện tại; sửa catalog làm lịch sử đơn đổi. DTO đọc quan hệ Product khi hiển thị lịch sử.
- **Phần backend phải làm:** Snapshot tên/SKU/brand/ảnh/options lúc tạo; backfill dữ liệu cũ có nhãn không bảo đảm khôi phục lịch sử nguyên bản.
- **Database:** Thêm trường snapshot trong order_items, giữ FK và không cascade xóa đơn.
- **Security:** Giữ auth/role/ownership của endpoint; Không nhận snapshot giá/tên từ client.
- **Validation:** Không nhận snapshot giá/tên từ client.
- **Request / Response:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-020 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Sửa tên/ảnh hoặc ngừng bán sản phẩm không thay đổi đơn mới đã tạo.

### Backend Tests

- Tạo đơn rồi đổi catalog; GET chủ đơn/admin trả snapshot không đổi; kiểm tra backfill legacy theo kế hoạch.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-020.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Tạo đơn rồi đổi catalog; đọc chi tiết khách/admin. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-021 — Lưu đầy đủ thuộc tính và bộ ảnh sản phẩm

- **Implementation Status:** READY
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; PRODUCT đủ ProductWrite, round-trip thuộc tính, gallery, quyền và lỗi. Chỉ phần mapping/ảnh của FIX này; không bật variant/paging của FIX khác.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Bug / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [ProductDto.java](backend/src/main/java/com/sports/dto/ProductDto.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java); [ProductImage.java](backend/src/main/java/com/sports/entity/ProductImage.java).
- **Class / Method / Endpoint:** ProductService.createProduct/updateProduct/toDto/getProductImages.
- **Hiện tại / Nguyên nhân:** DTO/entity có nhiều thuộc tính nhưng create/update chỉ map core và vài trường vợt; imageUrls không được lưu. Mapping viết chưa đầy đủ; form admin chỉ hỗ trợ phần nhỏ.
- **Phần backend phải làm:** Map các trường được hỗ trợ; update ảnh có thứ tự trong transaction; phân biệt null bỏ qua và [] xóa gallery; tài liệu rõ.
- **Database:** Giữ Product/ProductImage; thêm createdAt/updatedAt theo FIX-045.
- **Security:** Giữ auth/role/ownership của endpoint; Độ dài tương ứng column, JSON sizes hợp lệ, URL ảnh được cho phép, giá gốc>=giá bán.
- **Validation:** Độ dài tương ứng column, JSON sizes hợp lệ, URL ảnh được cho phép, giá gốc>=giá bán.
- **Request / Response:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-021 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Lưu rồi GET lại không mất thông số/ảnh; dữ liệu nhóm sản phẩm khác không bị xóa ngoài ý muốn.

### Backend Tests

- Round-trip đầy đủ thuộc tính năm nhóm sản phẩm; imageUrls nhiều ảnh/[]/null và rollback khi validation thất bại.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-021.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Round-trip toàn bộ trường vợt/giày/áo/túi/phụ kiện; gallery nhiều ảnh/[]/null. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-022 — Ngừng bán và xóa catalog an toàn

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-020.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [Product.java](backend/src/main/java/com/sports/entity/Product.java); [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [CategoryService.java](backend/src/main/java/com/sports/service/CategoryService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java).
- **Class / Method / Endpoint:** ProductService.deleteProduct; CategoryService.deleteCategory; OrderService.reserveItem.
- **Hiện tại / Nguyên nhân:** Product/category delete thẳng có thể lỗi FK; chưa có active/inactive dù có nút trạng thái. Thiếu vòng đời catalog; lịch sử đơn phụ thuộc Product.
- **Phần backend phải làm:** Thêm active; xóa sản phẩm có lịch sử trả 409, ưu tiên ngừng bán; category còn product trả 409; createOrder kiểm tra active.
- **Database:** Product.active default true; không cascade sang order/review.
- **Security:** Giữ auth/role/ownership của endpoint; Admin write; user không mua active=false; preserve historical FK.
- **Validation:** Admin write; user không mua active=false; preserve historical FK.
- **Request / Response:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-020
- **Phối hợp frontend:** Phần frontend cùng FIX-022 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Không mất lịch sử; delete bị ràng buộc trả lỗi rõ; ngừng bán loại khỏi catalog public.

### Backend Tests

- Xóa product có order/images/review; category có product; inactive bị chặn tại createOrder; không cascade mất lịch sử.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-022.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Xóa product có order/images/review; category còn product; checkout khi admin disable. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-023 — Voucher không làm tăng tiền và sửa/tắt được thật

- **Implementation Status:** READY
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; VOUCHER đủ validation tiền, cập nhật/tắt, null và status; giữ preview legacy tới khi các FIX chuyển items sẵn sàng, không triển khai điều kiện nâng cao FIX-024.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** VOUCHER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Validation / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [VoucherDto.java](backend/src/main/java/com/sports/dto/VoucherDto.java); [VoucherService.java](backend/src/main/java/com/sports/service/VoucherService.java); [AdminVoucherController.java](backend/src/main/java/com/sports/controller/AdminVoucherController.java).
- **Class / Method / Endpoint:** VoucherService.createVoucher/updateVoucher/validateVoucher/reserveVoucher/releaseVoucher.
- **Hiện tại / Nguyên nhân:** VoucherDto không constraints; maxDiscountAmount âm có thể tạo discount âm; update bỏ qua code/null; toggle UI chưa gọi API. @Valid không hiệu lực nếu DTO không có rule; update semantics chưa rõ.
- **Phần backend phải làm:** Validate type FIXED/PERCENT, range và thời gian; discount trong [0,subtotal]; code bất biến sau tạo; update hỗ trợ xóa trường nullable bằng null và khóa cùng hàng voucher.
- **Database:** Giữ unique code; không tin usedCount từ client; dùng lock cùng reserve/update.
- **Security:** Giữ auth/role/ownership của endpoint; PERCENT 0..100; tiền/limit không âm; maxUses>=usedCount; normalize code.
- **Validation:** PERCENT 0..100; tiền/limit không âm; maxUses>=usedCount; normalize code.
- **Request / Response:** Nhóm VOUCHER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-023 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Voucher bất hợp lệ không được lưu/áp dụng; tắt và bỏ giới hạn phản ánh sau reload.

### Backend Tests

- Voucher maxDiscount=-1/type lạ/code trùng; update cùng reserve; isActive/null/usedCount và discount trong miền hợp lệ.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-023.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** maxDiscount=-1, type lạ, code trùng, update cùng reserve, toggle và null. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-024 — Điều kiện voucher theo thời gian, người dùng, sản phẩm

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-023, FIX-017. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** VOUCHER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [Voucher.java](backend/src/main/java/com/sports/entity/Voucher.java); [VoucherService.java](backend/src/main/java/com/sports/service/VoucherService.java); [VoucherDto.java](backend/src/main/java/com/sports/dto/VoucherDto.java).
- **Class / Method / Endpoint:** VoucherService.validateVoucher/reserveVoucher/releaseVoucher; VoucherValidateRequest.
- **Hiện tại / Nguyên nhân:** Chưa có startsAt, limit/user hay phạm vi category/product; tên mô tả voucher không tự áp điều kiện. Mô hình chỉ tổng đơn/expiry/global count.
- **Phần backend phải làm:** Bổ sung điều kiện khi shop dùng; validate dựa items DB và user JWT; reserve/release usage trong transaction.
- **Database:** VoucherUsage liên kết order/user và quan hệ phạm vi product/category; unique usage/order.
- **Security:** Giữ auth/role/ownership của endpoint; Không vượt global/per-user dưới concurrency; release idempotent; startsAt<=expiresAt.
- **Validation:** Không vượt global/per-user dưới concurrency; release idempotent; startsAt<=expiresAt.
- **Request / Response:** Nhóm VOUCHER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-023, FIX-017
- **Phối hợp frontend:** Phần frontend cùng FIX-024 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Hai tab không vượt hạn mức cá nhân; voucher giới hạn vợt không dùng cho giày.

### Backend Tests

- Biên thời gian, phạm vi category/product hỗn hợp, giới hạn global/per-user, hai request đồng thời và release khi hủy.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-024.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Biên thời gian, category hỗn hợp, hai request đồng thời và hủy đơn. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-025 — Ngăn admin tự khóa hoặc khóa admin cuối

- **Implementation Status:** READY
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; ADMINUSER chốt PUT, query active, ROLE_ADMIN, response và lỗi self-lock/last-admin.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ADMINUSER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Security / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [AdminUserController.java](backend/src/main/java/com/sports/controller/AdminUserController.java); [UserService.java](backend/src/main/java/com/sports/service/UserService.java).
- **Class / Method / Endpoint:** AdminUserController.updateUserStatus; UserService.updateUserStatus.
- **Hiện tại / Nguyên nhân:** updateUserStatus không biết người thao tác và không chặn self-lock. Chỉ setIsActive theo id request.
- **Phần backend phải làm:** Lấy currentUserId từ principal; chặn tự khóa và admin hoạt động cuối; khóa transaction để chống hai admin đồng thời.
- **Database:** Không bắt buộc schema mới; truy vấn/khóa tập admin hoạt động.
- **Security:** Giữ auth/role/ownership của endpoint; Admin-only; userId từ principal, không từ body.
- **Validation:** Admin-only; userId từ principal, không từ body.
- **Request / Response:** Nhóm ADMINUSER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-025 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Không mất toàn bộ tài khoản quản trị do thao tác UI/API.

### Backend Tests

- API/service chặn tự khóa, cho khóa user hợp lệ, khóa hai admin đồng thời không làm mất admin cuối.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-025.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Admin tự khóa, khóa user, hai admin khóa nhau đồng thời. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-026 — Đăng ký/đăng nhập không tự tạo email giả

- **Implementation Status:** READY
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; AUTH chốt username/email thật, request đăng ký/đăng nhập, quyền public, response và lỗi. Chưa triển khai logout/reset/Remember login của FIX-027/FIX-028.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** AUTH
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [AuthService.java](backend/src/main/java/com/sports/service/AuthService.java); [RegisterRequest.java](backend/src/main/java/com/sports/dto/RegisterRequest.java); [UserDetailsServiceImpl.java](backend/src/main/java/com/sports/security/UserDetailsServiceImpl.java).
- **Class / Method / Endpoint:** AuthService.register/login; UserDetailsServiceImpl.loadUserByUsername.
- **Hiện tại / Nguyên nhân:** Frontend nhận email/phone, sinh username ngẫu nhiên và email phone@hgbadminton.vn; backend chỉ lookup username/email. UI hứa đăng nhập phone rộng hơn implementation.
- **Phần backend phải làm:** Phương án tối thiểu giữ login username/email và register yêu cầu username/email thật; chuẩn hóa email; xử lý trùng đồng thời.
- **Database:** Giữ unique username/email; đối chiếu tài khoản email giả cũ bằng quy trình hỗ trợ, không tự sửa dữ liệu.
- **Security:** Giữ auth/role/ownership của endpoint; Email/password/fullName/phone validate độc lập; role luôn ROLE_USER.
- **Validation:** Email/password/fullName/phone validate độc lập; role luôn ROLE_USER.
- **Request / Response:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-026 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Đăng ký cung cấp thông tin thật; thông báo trùng rõ; tài khoản cũ vẫn login username.

### Backend Tests

- Normalize email hoa/thường/whitespace; đăng ký trùng đồng thời; giới hạn password UTF-8; không nhận role client.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-026.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Email hoa/thường, whitespace, trùng đồng thời, password độ dài UTF-8. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-027 — Quên và đặt lại mật khẩu

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-026, FIX-028, FIX-041. Xem thêm Planning Issues Detected.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** AUTH
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [AuthController.java](backend/src/main/java/com/sports/controller/AuthController.java); [AuthService.java](backend/src/main/java/com/sports/service/AuthService.java); [User.java](backend/src/main/java/com/sports/entity/User.java).
- **Class / Method / Endpoint:** AuthController/AuthService: forgotPassword/resetPassword (đề xuất).
- **Hiện tại / Nguyên nhân:** Không có endpoint và luồng reset mật khẩu. Auth chỉ login/register/me.
- **Phần backend phải làm:** Reset token ngẫu nhiên một lần, lưu hash/expiry, gửi email; trả thông báo chung để tránh lộ tài khoản; vô hiệu token đăng nhập cũ khi reset.
- **Database:** PasswordResetToken FK user, hash unique, expiresAt/usedAt.
- **Security:** Giữ auth/role/ownership của endpoint; Rate limit, không log token, password hợp lệ; dùng lại token bị chặn.
- **Validation:** Rate limit, không log token, password hợp lệ; dùng lại token bị chặn.
- **Request / Response:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-026, FIX-028, FIX-041
- **Phối hợp frontend:** Phần frontend cùng FIX-027 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Khách reset được bằng email thật; token cũ không tái sử dụng.

### Backend Tests

- Email tồn tại/không tồn tại cùng response công khai; token hết hạn/đã dùng, resend, hai reset đồng thời và thu hồi token cũ.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-027.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Email không tồn tại, token hết hạn/dùng lại, resend, hai reset đồng thời. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-028 — Vòng đời phiên và Remember login

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-001.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** AUTH
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Security / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [JwtTokenProvider.java](backend/src/main/java/com/sports/security/JwtTokenProvider.java); [JwtAuthenticationFilter.java](backend/src/main/java/com/sports/security/JwtAuthenticationFilter.java); [UserService.java](backend/src/main/java/com/sports/service/UserService.java); [AuthController.java](backend/src/main/java/com/sports/controller/AuthController.java); [User.java](backend/src/main/java/com/sports/entity/User.java).
- **Class / Method / Endpoint:** JwtTokenProvider.generateToken; JwtAuthenticationFilter.doFilterInternal; UserService.changePassword; AuthController.logout (đề xuất).
- **Hiện tại / Nguyên nhân:** Logout chỉ xóa local; đổi mật khẩu không thu hồi JWT; rememberMe không ảnh hưởng lưu token. JWT 24 giờ không có cơ chế thu hồi; checkbox không nối context.
- **Phần backend phải làm:** Phương án đơn giản tokenVersion trên user, check JWT, tăng khi đổi/reset/logout toàn bộ phiên; chưa thêm refresh token nếu không cần.
- **Database:** User.tokenVersion default0; token cũ thiếu version coi không hợp lệ khi rollout có kế hoạch.
- **Security:** Giữ auth/role/ownership của endpoint; JWT expiry, locked user, tokenVersion; logout all-session được mô tả rõ.
- **Validation:** JWT expiry, locked user, tokenVersion; logout all-session được mô tả rõ.
- **Request / Response:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-001
- **Phối hợp frontend:** Phần frontend cùng FIX-028 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** JWT cũ bị chặn sau đổi/reset/logout thành công; checkbox có tác dụng thật.

### Backend Tests

- JWT/tokenVersion khi đổi/reset/logout, token sao chép, expiry và user bị khóa; lỗi logout không được ghi nhận thành công phía server.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-028.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Token bị sao chép, hai tab, reload, đóng/mở trình duyệt, logout offline. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-029 — Đồng bộ hồ sơ và trạng thái người dùng

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-030. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PROFILE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / UX / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [UserService.java](backend/src/main/java/com/sports/service/UserService.java); [UserProfileUpdateRequest.java](backend/src/main/java/com/sports/dto/UserProfileUpdateRequest.java); [UserProfileResponse.java](backend/src/main/java/com/sports/dto/UserProfileResponse.java); [User.java](backend/src/main/java/com/sports/entity/User.java).
- **Class / Method / Endpoint:** UserService.updateUserProfile/toProfileResponse; UserProfileUpdateRequest/Response.
- **Hiện tại / Nguyên nhân:** Họ tên/phone lưu thật; dob/gender/avatar chưa lưu; AuthContext không cập nhật sau sửa tên. UI nhiều trường hơn DTO và thiếu cập nhật user context.
- **Phần backend phải làm:** Bổ sung dob/gender/avatarUrl nếu giữ các trường này; không cho cập nhật role/email qua profile.
- **Database:** User bổ sung trường tùy chọn; không suy diễn dữ liệu người dùng cũ.
- **Security:** Giữ auth/role/ownership của endpoint; Tên trim không rỗng, phone, DOB không tương lai; avatar chỉ URL tài sản được cấp.
- **Validation:** Tên trim không rỗng, phone, DOB không tương lai; avatar chỉ URL tài sản được cấp.
- **Request / Response:** Nhóm PROFILE trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-030
- **Phối hợp frontend:** Phần frontend cùng FIX-029 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Reload giữ giá trị đã lưu, Navbar và hồ sơ đồng nhất.

### Backend Tests

- Update từng field/null; validate profile và avatar ownership; reject role/email/isActive ngoài phạm vi; GET trả dữ liệu lưu thực.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-029.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Update từng trường/null, lỗi API, reload, tài khoản khác. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-030 — Upload ảnh có xác thực và kiểm soát tài sản

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** RECOMMENDED chưa được chọn cho release. Xem thêm Planning Issues Detected.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** UPLOAD
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [ProductDto.java](backend/src/main/java/com/sports/dto/ProductDto.java); [ReturnCreateRequest.java](backend/src/main/java/com/sports/dto/ReturnCreateRequest.java); [SecurityConfig.java](backend/src/main/java/com/sports/security/SecurityConfig.java).
- **Class / Method / Endpoint:** Upload controller/service (đề xuất, chưa tồn tại); validate URL tài sản khi lưu product/profile/return.
- **Hiện tại / Nguyên nhân:** Chưa có upload endpoint/storage; giao diện ảnh profile/đổi trả không có luồng lưu file thật. Hiện lưu URL ảnh trong DB; nút chọn ảnh không đủ để upload.
- **Phần backend phải làm:** Thiết kế upload tối thiểu, chọn một storage sau khi chốt vận hành; sinh tên server, kiểm tra nội dung file; ghi owner/purpose; xóa tài sản chỉ khi hết tham chiếu.
- **Database:** Asset metadata ownerId/purpose/mime/size/key; FK hoặc tham chiếu kiểm tra quyền.
- **Security:** Giữ auth/role/ownership của endpoint; JPEG/PNG/WebP tối đa5MiB đề xuất; sniff/decode, giới hạn pixel; cấm SVG/HTML; path traversal; owner và admin theo purpose.
- **Validation:** JPEG/PNG/WebP tối đa5MiB đề xuất; sniff/decode, giới hạn pixel; cấm SVG/HTML; path traversal; owner và admin theo purpose.
- **Request / Response:** Nhóm UPLOAD trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-030 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** File giả MIME/quá lớn/path lạ bị từ chối; reload ảnh hợp lệ; không xóa ảnh còn dùng.

### Backend Tests

- Upload byte hợp lệ/đổi đuôi/quá lớn/ảnh hỏng/path traversal/cross-owner; storage timeout không tạo thành công giả.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-030.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Upload hợp lệ/đổi đuôi/quá lớn/ảnh lỗi/cross-owner; network fail. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-031 — Wishlist thực sự lưu và dùng lại

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-007, FIX-022. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** WISHLIST
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [User.java](backend/src/main/java/com/sports/entity/User.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java).
- **Class / Method / Endpoint:** Wishlist controller/service/repository/entity (đề xuất, chưa tồn tại).
- **Hiện tại / Nguyên nhân:** Heart chỉ state cục bộ; chưa có danh sách/API/model wishlist. Chưa triển khai persistence.
- **Phần backend phải làm:** Thêm API wishlist owner-scoped và unique(user,product); thêm/xóa idempotent.
- **Database:** WishlistItem FK user/product, unique cặp; không ảnh hưởng order.
- **Security:** Giữ auth/role/ownership của endpoint; User lấy JWT; product tồn tại; không nhận userId client.
- **Validation:** User lấy JWT; product tồn tại; không nhận userId client.
- **Request / Response:** Nhóm WISHLIST trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-007, FIX-022
- **Phối hợp frontend:** Phần frontend cùng FIX-031 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Reload/đăng nhập lại còn danh sách, không duplicate; sản phẩm ngừng bán được báo rõ.

### Backend Tests

- Thêm lặp/xóa lặp, unique(user,product), hai user và ownership, sản phẩm không tồn tại/ngừng bán theo contract.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-031.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Thêm lặp, hai user, xóa lặp, chuyển variant vào giỏ. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-032 — Search/filter/sort/pagination thống nhất server

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-007, FIX-042.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [ProductController.java](backend/src/main/java/com/sports/controller/ProductController.java); [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [ProductSpecification.java](backend/src/main/java/com/sports/repository/ProductSpecification.java).
- **Class / Method / Endpoint:** ProductController.getProducts; ProductService.getProductsPaged; ProductSpecification.filterProducts.
- **Hiện tại / Nguyên nhân:** ProductsPage lấy toàn bộ rồi lọc/phân trang client; backend có paged mode nhưng size không trần, sortBy tự do; sale/inStock chưa hỗ trợ. Hai cách lọc khác nhau; danh mục/brand hardcode.
- **Phần backend phải làm:** Chọn page response cố định; page>=0,size1..100, sort allowlist; thêm sale/inStock/variant filters; không âm thầm cắt danh sách ở client cũ.
- **Database:** Index theo query thực tế; filter attributes từ variant.
- **Security:** Giữ auth/role/ownership của endpoint; min<=max, query length, enum/filter allowlist; ID category thật.
- **Validation:** min<=max, query length, enum/filter allowlist; ID category thật.
- **Request / Response:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-007, FIX-042
- **Phối hợp frontend:** Phần frontend cùng FIX-032 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Filter đúng trên toàn catalog; số lượng/trang khớp; sale=true có hiệu lực; không fetch toàn DB.

### Backend Tests

- Query DB với dữ liệu nhiều trang; size100/101, sort lạ, filter cùng variant, tìm tiếng Việt và total/page chính xác.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-032.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Dataset lớn, size100/101, sort lạ, back/forward, tìm tiếng Việt, response race. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-033 — Giảm N+1 ở catalog và đọc đơn

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-032.
- **Frontend Coordination:** NOT_REQUIRED
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / Performance / BACKEND; ESSENTIAL.
- **File backend cần xem/sửa:** [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [ReviewService.java](backend/src/main/java/com/sports/service/ReviewService.java); [ReviewRepository.java](backend/src/main/java/com/sports/repository/ReviewRepository.java); [ProductImageRepository.java](backend/src/main/java/com/sports/repository/ProductImageRepository.java); [AdminDashboardService.java](backend/src/main/java/com/sports/service/AdminDashboardService.java).
- **Class / Method / Endpoint:** ProductService.toDto; ReviewService.getAverageRating/getReviewCount; AdminDashboardService.getDashboardStats.
- **Hiện tại / Nguyên nhân:** Mỗi ProductDto gọi query ảnh và hai lần đọc reviews để tính avg/count; catalog không giới hạn khuếch đại chi phí. Tổng hợp theo từng item thay batch/aggregate.
- **Phần backend phải làm:** Batch ảnh và aggregate review theo các productId trong trang; fetch đúng relations khi đọc order, không tải toàn bộ reviews.
- **Database:** Index product_id/created_at và aggregate phù hợp sau EXPLAIN.
- **Security:** Giữ auth/role/ownership của endpoint; Giữ đúng avg=0 khi chưa review; không làm lộ review ẩn khi moderation có hiệu lực.
- **Validation:** Giữ đúng avg=0 khi chưa review; không làm lộ review ẩn khi moderation có hiệu lực.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** FIX-032
- **Phối hợp frontend:** Không có task frontend đối ứng; tránh mở rộng phạm vi.
- **Acceptance Criteria:** Số query không tăng tuyến tính với số sản phẩm trong trang; dữ liệu không đổi.

### Backend Tests

- **Test cần thực hiện:** Đếm query cho trang12/100 sản phẩm; so aggregate với mẫu, không dùng benchmark máy thật đang bán.

### FIX-034 — Trang chủ và liên kết khuyến mãi phản ánh catalog thật

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-032, FIX-045. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [OrderItemRepository.java](backend/src/main/java/com/sports/repository/OrderItemRepository.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java).
- **Class / Method / Endpoint:** ProductService.getProductsPaged; aggregate OrderItem cho sort soldQuantity.
- **Hiện tại / Nguyên nhân:** Bestseller/new dùng slice; link cước dùng slug không phải Long; sale=true không được xử lý. Banner/link/static ordering chưa nối dữ liệu kinh doanh.
- **Phần backend phải làm:** Thêm sort bestseller theo lượng đơn COMPLETED và createdAt cho newest; category lookup ID thật.
- **Database:** Product.createdAt; query OrderItem để tính soldQuantity, không đếm đơn hủy.
- **Security:** Giữ auth/role/ownership của endpoint; Chỉ sản phẩm active; soldQuantity tính theo chính sách return được nêu rõ.
- **Validation:** Chỉ sản phẩm active; soldQuantity tính theo chính sách return được nêu rõ.
- **Request / Response:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-032, FIX-045
- **Phối hợp frontend:** Phần frontend cùng FIX-034 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Banner không dẫn lỗi ID; bestseller đúng dữ liệu; newest không dựa phần tử đầu tùy ý.

### Backend Tests

- Aggregate bestseller từ đơn hoàn thành/hủy; createdAt cho newest; trả ID/category/sale đúng catalog active.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-034.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Đơn hoàn thành/hủy, sản phẩm mới, banner từng danh mục/sale. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-036 — Dashboard lấy thống kê thật theo khoảng thời gian

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-003, FIX-039.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** DASHBOARD
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [AdminDashboardService.java](backend/src/main/java/com/sports/service/AdminDashboardService.java); [DashboardStatsResponse.java](backend/src/main/java/com/sports/dto/DashboardStatsResponse.java); [OrderRepository.java](backend/src/main/java/com/sports/repository/OrderRepository.java).
- **Class / Method / Endpoint:** AdminDashboardService.getDashboardStats; OrderRepository.findRecognizedPaymentOrders.
- **Hiện tại / Nguyên nhân:** Backend có totals/dailyRevenue; FE chart/topProducts mảng rỗng, timeRange không gửi; ngày/thời gian hiển thị cố định. Chưa nối chart với response; doanh thu ngày đang dùng order.createdAt.
- **Phần backend phải làm:** Định nghĩa revenue theo paidAt/thu COD, tách gross/refund/net; nhận from/to/groupBy và tổng hợp DB.
- **Database:** paidAt và lịch sử refund từ payment; không tự suy paidAt của dữ liệu cũ.
- **Security:** Giữ auth/role/ownership của endpoint; Admin; range hữu hạn và timezone Asia/Ho_Chi_Minh; không tính COD pending vào doanh thu.
- **Validation:** Admin; range hữu hạn và timezone Asia/Ho_Chi_Minh; không tính COD pending vào doanh thu.
- **Request / Response:** Nhóm DASHBOARD trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-003, FIX-039
- **Phối hợp frontend:** Phần frontend cùng FIX-036 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Số KPI/chart cùng kỳ khớp giao dịch; không giả inventory alert từ pendingOrders.

### Backend Tests

- Doanh thu theo paidAt, COD chưa thu, refund, ngày/tháng và timezone; totals/bucket/query range đúng contract.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-036.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Đơn tạo hôm trước trả hôm sau, COD chưa thu, refund, đổi ngày/tháng. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-037 — Quản trị danh mục và thương hiệu tối thiểu

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-022. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** CATEGORY
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [CategoryService.java](backend/src/main/java/com/sports/service/CategoryService.java); [CategoryController.java](backend/src/main/java/com/sports/controller/CategoryController.java); [Category.java](backend/src/main/java/com/sports/entity/Category.java); [ProductRepository.java](backend/src/main/java/com/sports/repository/ProductRepository.java).
- **Class / Method / Endpoint:** CategoryController CRUD; CategoryService CRUD; distinct brand query đề xuất.
- **Hiện tại / Nguyên nhân:** Category CRUD backend có nhưng không có admin UI; brand là chuỗi với bộ lọc hardcode, chưa có quản trị riêng. Chưa nối endpoint có sẵn; thiếu nguồn danh sách brand thống nhất.
- **Phần backend phải làm:** Giữ category CRUD, normalize tên; cung cấp distinct brand từ DB; chưa buộc tạo Brand entity nếu chỉ cần tên.
- **Database:** Category.name unique sau dọn duplicate có kiểm soát; Brand riêng để OPTIONAL.
- **Security:** Giữ auth/role/ownership của endpoint; Admin write; không xóa category đang dùng; trim tên, chặn trùng.
- **Validation:** Admin write; không xóa category đang dùng; trim tên, chặn trùng.
- **Request / Response:** Nhóm CATEGORY trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-022
- **Phối hợp frontend:** Phần frontend cùng FIX-037 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Admin tạo/sửa category rồi dùng ngay; brand mới xuất hiện trong filter.

### Backend Tests

- Category trùng/đang dùng/không tồn tại, quyền admin; distinct/normalize brand khác hoa thường.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-037.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Category trùng/đang dùng/không tồn tại; brand khác hoa/thường. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-038 — Lịch sử nhập/điều chỉnh tồn kho

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-007, FIX-055. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** INVENTORY
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java).
- **Class / Method / Endpoint:** ProductService.updateProduct; OrderService.reserveItem/settleReservedStock; inventory endpoints đề xuất.
- **Hiện tại / Nguyên nhân:** Admin ghi đè stock có expectedStock nhưng chưa có inventory ledger/phiếu nhập/lý do điều chỉnh. Chưa có lịch sử truy vết thay đổi kho.
- **Phần backend phải làm:** Giữ expectedStock guard; thêm điều chỉnh delta có lý do và actor; ghi movement cho reserve/release/settle/return theo variant.
- **Database:** InventoryMovement variantId/orderId, type, delta, before/after, actor, createdAt; unique operationKey.
- **Security:** Giữ auth/role/ownership của endpoint; Admin; không âm/tràn số; không giảm reserved bằng form sửa sản phẩm.
- **Validation:** Admin; không âm/tràn số; không giảm reserved bằng form sửa sản phẩm.
- **Request / Response:** Nhóm INVENTORY trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-007, FIX-055
- **Phối hợp frontend:** Phần frontend cùng FIX-038 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Mọi thay đổi kho có nguồn; replay không nhập hai lần; stock tổng cân đối.

### Backend Tests

- Điều chỉnh/nhập kho, delta âm, expectedStock conflict, operationKey lặp và movement của reserve/release/return không ghi đè reserved.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-038.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Nhập kho, điều chỉnh âm, conflict, hủy/hoàn tiền và reserved không bị ghi đè. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-039 — Phân biệt thanh toán, giao hàng và lịch sử trạng thái

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-003, FIX-020.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [Order.java](backend/src/main/java/com/sports/entity/Order.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderResponse.java](backend/src/main/java/com/sports/dto/OrderResponse.java); [OrderController.java](backend/src/main/java/com/sports/controller/OrderController.java).
- **Class / Method / Endpoint:** OrderService.updateOrderStatus/canShip/handlePaymentSuccess/toDto; cod-payment endpoint đề xuất.
- **Hiện tại / Nguyên nhân:** Một enum OrderStatus gộp paid và shipping; chưa lưu thu COD riêng hoặc shipment/tracking/timestamp chuyển trạng thái. Chưa có paymentStatus và history dù UI có timeline.
- **Phần backend phải làm:** Giữ transition hợp lệ hiện có; thêm paymentStatus độc lập, shippedAt/completedAt, history; COD hoàn tất không tự suy đã thu nếu chưa xác nhận.
- **Database:** OrderStatusHistory; paymentStatus UNPAID/PAID/REFUND_PENDING/PARTIALLY_REFUNDED/REFUNDED; carrier/tracking tùy chọn.
- **Security:** Giữ auth/role/ownership của endpoint; Admin-only chuyển trạng thái, owner đọc; không cho COMPLETED→PENDING hoặc dùng status API để ép PayOS PAID.
- **Validation:** Admin-only chuyển trạng thái, owner đọc; không cho COMPLETED→PENDING hoặc dùng status API để ép PayOS PAID.
- **Request / Response:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-003, FIX-020
- **Phối hợp frontend:** Phần frontend cùng FIX-039 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Trạng thái rõ cả COD/PayOS, không chuyển lùi; mỗi lần chuyển có timestamp/actor.

### Backend Tests

- Ma trận trạng thái, gọi lặp, concurrent cancel/webhook, owner/admin, COD giao chưa thu và receipt/history đúng.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-039.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Ma trận trạng thái, gọi lặp, concurrent cancel/webhook, COD giao nhưng chưa thu. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-041 — Email xác nhận đơn và hạ tầng gửi thông báo

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-026. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** NOT_REQUIRED
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BACKEND; RECOMMENDED.
- **File backend cần xem/sửa:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [AuthService.java](backend/src/main/java/com/sports/service/AuthService.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java).
- **Class / Method / Endpoint:** Sự kiện sau commit createOrder/reset; mail/outbox service (đề xuất, chưa tồn tại).
- **Hiện tại / Nguyên nhân:** Chưa có gửi email đơn/reset, low-stock alert hay lưu lần gửi. Không có mail integration hoặc cơ chế retry sau commit.
- **Phần backend phải làm:** Gửi email sau commit qua outbox tối thiểu; retry có dedup; ưu tiên reset và xác nhận đơn, cảnh báo kho tùy giai đoạn.
- **Database:** NotificationOutbox unique(eventType,aggregateId,eventVersion), attempts,nextAttemptAt,sentAt; địa chỉ email hợp lệ.
- **Security:** Giữ auth/role/ownership của endpoint; Không gửi secret, không log token reset; email lỗi không rollback đơn đã tạo; không tự gửi trong đợt lập kế hoạch.
- **Validation:** Không gửi secret, không log token reset; email lỗi không rollback đơn đã tạo; không tự gửi trong đợt lập kế hoạch.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** FIX-026
- **Phối hợp frontend:** Không có task frontend đối ứng; tránh mở rộng phạm vi.
- **Acceptance Criteria:** Một sự kiện gửi một email logic; lỗi nhà cung cấp có retry và dấu vết.

### Backend Tests

- **Test cần thực hiện:** Commit/rollback, gửi timeout/lặp, địa chỉ lỗi, nội dung tiền và options đúng.

### FIX-042 — Lỗi API và validation có contract nhất quán

- **Implementation Status:** READY
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; ERROR đủ schema, status và ngoại lệ webhook; file handler/DTO liên quan đã xác định.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ERROR
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Validation / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [GlobalExceptionHandler.java](backend/src/main/java/com/sports/exception/GlobalExceptionHandler.java); [SecurityConfig.java](backend/src/main/java/com/sports/security/SecurityConfig.java); [OrderCreateRequest.java](backend/src/main/java/com/sports/dto/OrderCreateRequest.java); [ShippingAddressDto.java](backend/src/main/java/com/sports/dto/ShippingAddressDto.java); [UserProfileUpdateRequest.java](backend/src/main/java/com/sports/dto/UserProfileUpdateRequest.java).
- **Class / Method / Endpoint:** GlobalExceptionHandler; SecurityConfig.writeSecurityError; các Request DTO.
- **Hiện tại / Nguyên nhân:** Error response khác nhau; enum/query/JSON sai và FK duplicate có thể rơi generic500; validation phone/length chưa thống nhất. Handler tổng quát, DTO thiếu ràng buộc tương ứng column.
- **Phần backend phải làm:** Chuẩn hóa ApiError giữ message/errors; thêm code/path; mapping malformed400, auth401/403, notfound404, conflict409, rate429.
- **Database:** Không bắt buộc đổi DB; bổ sung constraint riêng FIX-045.
- **Security:** Giữ auth/role/ownership của endpoint; Validation độc lập backend, trim/sanitize xong kiểm tra lại; không trả SQL/stacktrace.
- **Validation:** Validation độc lập backend, trim/sanitize xong kiểm tra lại; không trả SQL/stacktrace.
- **Request / Response:** Nhóm ERROR trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-042 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Đầu vào lỗi nhận status/mã đúng; UI giữ dữ liệu form và không báo thành công.

### Backend Tests

- JSON/enum/query lỗi, số âm/quá dài, duplicate/FK, authentication/authorization và schema/status ApiError; không lộ stack/SQL.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-042.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** JSON lỗi, enum lạ, số âm/quá dài, duplicate, FK, network và quyền. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-043 — Giới hạn lạm dụng auth, AI và API tốn tài nguyên

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-042.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ERROR
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Security / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [SecurityConfig.java](backend/src/main/java/com/sports/security/SecurityConfig.java); [AiChatController.java](backend/src/main/java/com/sports/controller/AiChatController.java); [AiChatRequest.java](backend/src/main/java/com/sports/dto/AiChatRequest.java); [GeminiService.java](backend/src/main/java/com/sports/service/GeminiService.java); [AuthController.java](backend/src/main/java/com/sports/controller/AuthController.java).
- **Class / Method / Endpoint:** SecurityFilterChain; AiChatController.chatWithAi; GeminiService.callGeminiApi; DTO AiChatRequest.
- **Hiện tại / Nguyên nhân:** Không thấy rate limit auth/AI; AI public có thể tạo chi phí và chat log không giới hạn. Chưa có quota/message bound/timeouts.
- **Phần backend phải làm:** Giới hạn IP+tài khoản theo endpoint, message<=2000, timeout và số kết quả; không khóa toàn hệ thống vì một IP chung.
- **Database:** Chính sách lưu/xóa chat log cần chủ dự án duyệt riêng; không tự xóa.
- **Security:** Giữ auth/role/ownership của endpoint; 429 chuẩn, không log password/token; xác minh proxy IP từ cấu hình đáng tin.
- **Validation:** 429 chuẩn, không log password/token; xác minh proxy IP từ cấu hình đáng tin.
- **Request / Response:** Nhóm ERROR trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-042
- **Phối hợp frontend:** Phần frontend cùng FIX-043 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Spam bị hạn chế có kiểm soát, request thường vẫn hoạt động.

### Backend Tests

- Rate limit auth/AI, Retry-After, message bound, Gemini timeout/response lớn và quyền; kiểm thử không tác động dịch vụ thật.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-043.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Burst login/register/AI, timeout Gemini, response quá lớn. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-044 — Cấu hình môi trường và quy trình triển khai an toàn

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-001.
- **Frontend Coordination:** REQUIRED
- **API Contract:** NO API CONTRACT CHANGE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Security / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [application.yml](backend/src/main/resources/application.yml); [.env.example](backend/.env.example); [run-backend.bat](run-backend.bat); [run-frontend.bat](run-frontend.bat).
- **Class / Method / Endpoint:** application.yml; backend/.env.example; axiosClient baseURL; run-backend.bat/run-frontend.bat (chỉ đề xuất cấu hình, cần duyệt khi thực hiện).
- **Hiện tại / Nguyên nhân:** DB root/local và ddl-auto:update/sql init always; API localhost hardcode; .env.example thiếu JWT_SECRET; không thấy loader .env. Cấu hình local chưa tách rõ vận hành; file .env không tự được Spring đọc.
- **Phần backend phải làm:** Lập kế hoạch env/profile, DB user tối thiểu, backup/restore/migration đã duyệt; kiểm tra PayOS/Gemini credentials không in giá trị.
- **Database:** Không chạy migration trong task này; staging riêng và rollback trước schema change.
- **Security:** Giữ auth/role/ownership của endpoint; Secret không fallback, mock/dev seed tắt production, CORS domain thật/HTTPS; kiểm tra CI secret exposure.
- **Validation:** Secret không fallback, mock/dev seed tắt production, CORS domain thật/HTTPS; kiểm tra CI secret exposure.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** FIX-001
- **Phối hợp frontend:** Phần frontend cùng FIX-044 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Môi trường test và production tách; không tự update schema thật khi khởi động.

### Backend Tests

- Kiểm tra biến môi trường/profile backend, CORS allowed/disallowed và backup/restore trên staging được duyệt; không sửa môi trường thật.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-044.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Kiểm tra cấu hình thiếu biến, build URL, CORS allowed/disallowed, backup restore staging. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-045 — Schema constraint/index/timestamp và migration có kiểm soát

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency hoặc quyết định nghiệp vụ mở; entity, SQL và quy trình kiểm tra schema đã xác định. Bắt đầu bằng đọc schema trong môi trường được cấp quyền; chỉ chốt migration/index sau bằng chứng schema/dữ liệu/EXPLAIN, không tự chạy migration hay tác động DB thật.
- **Frontend Coordination:** NOT_REQUIRED
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BACKEND; ESSENTIAL.
- **File backend cần xem/sửa:** [Product.java](backend/src/main/java/com/sports/entity/Product.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java); [Review.java](backend/src/main/java/com/sports/entity/Review.java); [ReturnRequest.java](backend/src/main/java/com/sports/entity/ReturnRequest.java); [ShippingAddress.java](backend/src/main/java/com/sports/entity/ShippingAddress.java); [update_accessories.sql](backend/src/main/resources/update_accessories.sql).
- **Class / Method / Endpoint:** @Table/@Column/@JoinColumn ở entity; SQL update_accessories; migration versioned chỉ đề xuất.
- **Hiện tại / Nguyên nhân:** Không thấy migration versioned/explicit composite index/check; timestamp thiếu; SQL phụ kiện dùng ID cố định và bảng chưa có JPA mapping. Schema phụ thuộc ddl-auto; quy tắc chủ yếu trong service.
- **Phần backend phải làm:** Đọc schema thật ở bước triển khai được duyệt; đề xuất index theo query; thêm constraint cần thiết sau rà dữ liệu; không chạy update_accessories.sql mù.
- **Database:** Ứng viên: orders(user_id,created_at), orders(status,payment_method,expires_at), reviews(product_id,created_at), images(product_id,display_order), addresses(user_id); check stock/price/qty; createdAt/updatedAt.
- **Security:** Giữ auth/role/ownership của endpoint; Không khẳng định DB live thiếu index khi chưa kiểm tra; MySQL có thể tự tạo index FK.
- **Validation:** Không khẳng định DB live thiếu index khi chưa kiểm tra; MySQL có thể tự tạo index FK.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** Không.
- **Phối hợp frontend:** Không có task frontend đối ứng; tránh mở rộng phạm vi.
- **Acceptance Criteria:** Migration có backfill/rollback và không mất order history; EXPLAIN chứng minh index cần.

### Backend Tests

- **Test cần thực hiện:** Schema diff staging, dữ liệu duplicate/orphan/negative, restore backup và đo query.

### FIX-046 — Bổ sung kiểm thử tích hợp và E2E còn thiếu

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-018, FIX-017, FIX-002.
- **Frontend Coordination:** REQUIRED
- **API Contract:** NO API CONTRACT CHANGE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [PayOSService.java](backend/src/main/java/com/sports/service/PayOSService.java); [PaymentController.java](backend/src/main/java/com/sports/controller/PaymentController.java); [OrderServiceTest.java](backend/src/test/java/com/sports/service/OrderServiceTest.java); [PayOSSecurityTest.java](backend/src/test/java/com/sports/service/PayOSSecurityTest.java); [CartFuzzTest.java](backend/src/test/java/com/sports/fuzz/CartFuzzTest.java); [PayOSWebhookFuzzTest.java](backend/src/test/java/com/sports/fuzz/PayOSWebhookFuzzTest.java); [pom.xml](backend/pom.xml).
- **Class / Method / Endpoint:** OrderServiceTest, PayOSSecurityTest, CartFuzzTest, PayOSWebhookFuzzTest; integration/HTTP test bổ sung sau duyệt.
- **Hiện tại / Nguyên nhân:** Hiện có4 test files:56 @Test,8 @FuzzTest,12 @ParameterizedTest; chưa thấy MySQL integration/FE/E2E. Các con số là annotation, không phải số test đã chạy. Mock repository không chứng minh lock/rollback thật; chưa có kiểm thử trình duyệt.
- **Phần backend phải làm:** Giữ tests hiện có, bổ sung MySQL isolated transaction/concurrency và MockMvc authorization/validation; fixture webhook từ gateway độc lập.
- **Database:** Chỉ DB test; không dùng database bán hàng.
- **Security:** Giữ auth/role/ownership của endpoint; AAA JUnit5; Jazzer kiểm tra invariant thật; không suy coverage từ tên file.
- **Validation:** AAA JUnit5; Jazzer kiểm tra invariant thật; không suy coverage từ tên file.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** FIX-018, FIX-017, FIX-002
- **Phối hợp frontend:** Phần frontend cùng FIX-046 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Các flow tiền/kho/quyền chạy qua; không tuyên bố pass nếu chưa chạy.

### Backend Tests

- MySQL isolated: tranh mua, callback lặp, rollback nửa chừng, idempotency; MockMvc validation/IDOR/quyền; giữ JUnit/Jazzer hiện có.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-046.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Hai người mua cuối, callback lặp, rollback nửa chừng, idempotency, IDOR, lỗi mạng và viewport360/768/1440. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-049 — Backlog tùy chọn không chặn bán hàng

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** OPTIONAL chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract:** NO API CONTRACT CHANGE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Low / Missing Feature / BOTH; OPTIONAL.
- **File backend cần xem/sửa:** [Product.java](backend/src/main/java/com/sports/entity/Product.java); [User.java](backend/src/main/java/com/sports/entity/User.java).
- **Class / Method / Endpoint:** Chưa tạo class/endpoint mới; chỉ backlog và quyết định phạm vi.
- **Hiện tại / Nguyên nhân:** Chưa có recently viewed, flash sale theo thời gian, banner CMS, loyalty, STAFF, cart đa thiết bị, combo engine và tích hợp hãng vận chuyển. Chưa nằm trong phạm vi bán hàng tối thiểu.
- **Phần backend phải làm:** Chưa triển khai; tách yêu cầu nhỏ và chốt nghiệp vụ/contract riêng nếu Phong chọn; không cài framework trước.
- **Database:** Chưa đề xuất bảng mới trước khi chốt tính năng.
- **Security:** Giữ auth/role/ownership của endpoint; STAFF phải có ma trận quyền nếu chọn; flash sale/combo phải tính giá server.
- **Validation:** STAFF phải có ma trận quyền nếu chọn; flash sale/combo phải tính giá server.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** Không.
- **Phối hợp frontend:** Phần frontend cùng FIX-049 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Backlog được ghi OPTIONAL và không bị hiểu là task bắt buộc hay đã triển khai.

### Backend Tests

- Chưa có implementation được chọn để test. Khi tính năng OPTIONAL được chọn, xác định kiểm thử backend theo acceptance/contract được chốt trước code.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-049.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Khi chọn từng tính năng phải bổ sung acceptance/contract riêng trước code. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-052 — Phân trang các danh sách quản trị và tài khoản

- **Implementation Status:** TODO
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-042. RECOMMENDED chưa được chọn cho release.
- **Frontend Coordination:** REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PAGING
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Performance / BOTH; RECOMMENDED.
- **File backend cần xem/sửa:** [AdminPaymentController.java](backend/src/main/java/com/sports/controller/AdminPaymentController.java); [UserService.java](backend/src/main/java/com/sports/service/UserService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [ReviewService.java](backend/src/main/java/com/sports/service/ReviewService.java); [ReturnService.java](backend/src/main/java/com/sports/service/ReturnService.java); [VoucherService.java](backend/src/main/java/com/sports/service/VoucherService.java).
- **Class / Method / Endpoint:** Các getAll/getUser list của User/Order/Review/Return/Voucher; AdminPaymentController.getAllPayments.
- **Hiện tại / Nguyên nhân:** Phần lớn list trả findAll rồi sort/filter in-memory; bảng FE tải toàn bộ. Chưa có bounded pageable/search server; payment controller query repository trực tiếp.
- **Phần backend phải làm:** Thêm paged mode opt-in cho list, query DB có giới hạn; đưa logic payment listing vào service khi sửa payment; không refactor hàng loạt.
- **Database:** Index theo user/status/createdAt và query; giữ đường legacy trong chuyển tiếp.
- **Security:** Giữ auth/role/ownership của endpoint; Page0,size1..100; auth/owner, sort allowlist; không trả PII cho public.
- **Validation:** Page0,size1..100; auth/owner, sort allowlist; không trả PII cho public.
- **Request / Response:** Nhóm PAGING trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** FIX-042
- **Phối hợp frontend:** Phần frontend cùng FIX-052 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Mỗi bảng dùng đúng total; không tải toàn bộ để lọc; auth không đổi.

### Backend Tests

- Repository/service/controller phân trang dữ liệu lớn, filter/status/owner/admin, page cuối rỗng sau xóa và response shape/total.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-052.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Dataset nhiều trang, empty cuối trang sau xóa, filter status, 403, race response. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-053 — AI chỉ đề xuất sản phẩm phù hợp đang bán

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-007, FIX-043.
- **Frontend Coordination:** REQUIRED
- **API Contract:** NO API CONTRACT CHANGE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Bug / BOTH; ESSENTIAL.
- **File backend cần xem/sửa:** [GeminiService.java](backend/src/main/java/com/sports/service/GeminiService.java); [ProductRepository.java](backend/src/main/java/com/sports/repository/ProductRepository.java).
- **Class / Method / Endpoint:** GeminiService.chatWithAi/callGeminiApi/getRuleBasedAdvisorResponse.
- **Hiện tại / Nguyên nhân:** Khi hết hàng service fallback findAll nhưng prompt vẫn nói stock>0; IDs từ model không giới hạn tập dữ liệu; không giới hạn số truy vấn enrichment. Prompt được dùng như lớp kiểm soát chính.
- **Phần backend phải làm:** Lọc category vợt/active/stock theo mục tiêu; giới hạn query tại DB; intersect IDs model với tập được phép; kiểm tra schema/length; không tin prompt để chống injection.
- **Database:** Giữ AiChatLog; retention là quyết định vận hành riêng.
- **Security:** Giữ auth/role/ownership của endpoint; Model output không quyết định giá/kho; không thực thi tool từ output; reply render text an toàn.
- **Validation:** Model output không quyết định giá/kho; không thực thi tool từ output; reply render text an toàn.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** FIX-007, FIX-043
- **Phối hợp frontend:** Phần frontend cùng FIX-053 trong FRONTEND_FIX_PLAN. Backend không tự thay UI; bàn giao contract và ví dụ lỗi trước nghiệm thu.
- **Acceptance Criteria:** Hết kho không được mô tả là có sẵn; ID ngoài catalog không hiện; timeout có fallback.

### Backend Tests

- Model trả ID ngoài tập được phép/1000 ID/JSON lỗi/prompt injection, kho0; kiểm tra lọc/giới hạn/fallback tại service.

- **Giới hạn trách nhiệm:** Codex chỉ triển khai/kiểm thử backend. Frontend theo [FRONTEND_FIX_PLAN.md](docs/fix/FRONTEND_FIX_PLAN.md), giữ nguyên FIX-053.
- **Bàn giao frontend bắt buộc:** HTTP method, endpoint, authentication requirement, request schema, response schema, error schema, relevant status codes, backward compatibility nếu có và ví dụ response cần thiết. Với NO_CHANGE, xác nhận contract hiện hữu; không tạo API giả. Backend không tự chỉnh UI.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Test cần thực hiện:** Model trả ID lạ/1000 ID/JSON lỗi, prompt injection, kho0. Bổ sung kiểm tra request/response với frontend cùng ID.

### FIX-054 — Giới hạn tiền, kích thước đơn và dữ liệu đầu vào

- **Implementation Status:** READY
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; ERROR và quy ước tiền/độ dài/danh sách đã đủ để giới hạn request hiện hữu. Giới hạn gateway thấp hơn phải được xác minh trước thao tác gateway tương ứng.
- **Frontend Coordination:** NOT_REQUIRED
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ERROR


- **Mức độ / Loại / Phạm vi gốc:** High / Validation / BACKEND; ESSENTIAL.
- **File backend cần xem/sửa:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderCreateRequest.java](backend/src/main/java/com/sports/dto/OrderCreateRequest.java); [OrderItemRequest.java](backend/src/main/java/com/sports/dto/OrderItemRequest.java); [ProductDto.java](backend/src/main/java/com/sports/dto/ProductDto.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java).
- **Class / Method / Endpoint:** OrderService.validateRequestedItems/reserveItem/calculateOrderTotal; OrderCreateRequest/OrderItemRequest.
- **Hiện tại / Nguyên nhân:** Giá mỗi product có giới hạn precision nhưng tổng nhiều dòng có thể vượt decimal(12,2); items và một số chuỗi chưa giới hạn; gateway signature dùng longValue. Valid từng field chưa đảm bảo tổng và đơn vị tiền.
- **Phần backend phải làm:** Kiểm tra subtotal/discount/shipping/total trong giới hạn schema và gateway trước save/call; VND nguyên; đề xuất tối đa100 dòng, tổng qty/product<=100 giữ nguyên.
- **Database:** Không cần tăng precision nếu chặn giới hạn đúng; không âm thầm round/truncate.
- **Security:** Giữ auth/role/ownership của endpoint; Tên100, phone20 và format, note2000; options theo schema; tiền <=9,999,999,999 VND nguyên hoặc giới hạn gateway thấp hơn.
- **Validation:** Tên100, phone20 và format, note2000; options theo schema; tiền <=9,999,999,999 VND nguyên hoặc giới hạn gateway thấp hơn.
- **Request / Response:** Nhóm ERROR trong [API_CHANGES.md](docs/fix/API_CHANGES.md). Contract là phương án đích, phải áp dụng chuyển tiếp được mô tả trong API_CHANGES trước khi bỏ field cũ.
- **Dependency:** Không.
- **Phối hợp frontend:** Không có task frontend đối ứng; tránh mở rộng phạm vi.
- **Acceptance Criteria:** Request quá giới hạn trả400/409 và rollback; không500 hoặc số tiền ký bị cắt.

### Backend Tests

- **Test cần thực hiện:** Max price×qty, nhiều product, số lẻ, cực lớn, null item và chuỗi dài.

### FIX-055 — Chặn tràn số khi hoàn kho và sửa kho đang giữ chỗ

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; invariant overflow/reservedStock, vị trí sửa và kiểm thử đã rõ; NO_CHANGE.
- **Frontend Coordination:** NOT_REQUIRED
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** High / Bug / BACKEND; ESSENTIAL.
- **File backend cần xem/sửa:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java).
- **Class / Method / Endpoint:** OrderService.settleReservedStock; ProductService.validateStockAndPrice/validateStockSnapshot.
- **Hiện tại / Nguyên nhân:** reserveItem hiện đã kiểm tra overflow reservedStock; settleReservedStock vẫn cộng int trực tiếp. Admin có thể tăng available rất lớn khi còn reserved. Không giữ invariant available+reserved<=Integer.MAX_VALUE.
- **Phần backend phải làm:** Validate tổng vật lý trước admin update/reserve/release; dùng phép cộng có kiểm tra hoặc long trung gian và lỗi nghiệp vụ; giữ transaction/lock.
- **Database:** Có thể giữ INT với giới hạn; bổ sung CHECK/invariant phù hợp sau kiểm tra dữ liệu.
- **Security:** Giữ auth/role/ownership của endpoint; Không cho stock âm hoặc tràn; không clamp che bất nhất; không sửa reserved từ request.
- **Validation:** Không cho stock âm hoặc tràn; không clamp che bất nhất; không sửa reserved từ request.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** Không.
- **Phối hợp frontend:** Không có task frontend đối ứng; tránh mở rộng phạm vi.
- **Acceptance Criteria:** Stock không wrap âm khi hủy đơn sau nhập kho sát giới hạn.

### Backend Tests

- **Test cần thực hiện:** Đặt1, admin đặt available=Integer.MAX_VALUE khi reserved1 phải bị chặn; cancel/expiry không overflow.

### FIX-056 — Giảm nguy cơ lộ credential trong log và script vận hành

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL; không có dependency; vị trí log/script và yêu cầu không lộ credential đã rõ; NO_CHANGE. Không tự đổi credential, chạy script push hoặc thực hiện thao tác vận hành.
- **Frontend Coordination:** NOT_REQUIRED
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / Security / BACKEND; ESSENTIAL.
- **File backend cần xem/sửa:** [GeminiService.java](backend/src/main/java/com/sports/service/GeminiService.java); [JwtTokenProvider.java](backend/src/main/java/com/sports/security/JwtTokenProvider.java); [JwtAuthenticationFilter.java](backend/src/main/java/com/sports/security/JwtAuthenticationFilter.java); [push-to-github.bat](push-to-github.bat).
- **Class / Method / Endpoint:** GeminiService.callGeminiApi catch; JWT filter/provider logging; push-to-github.bat (tách duyệt vận hành).
- **Hiện tại / Nguyên nhân:** Gemini key nằm trong URL và log e.getMessage có thể chứa URL; script push nhận token và đưa vào lệnh. Đây là nguy cơ, chưa xác nhận đã lộ secret thật. Log exception thô và truyền credential qua command arguments.
- **Phần backend phải làm:** Redact URL/query/token khỏi log; log mã lỗi/traceId; xem lại cơ chế credential của script riêng khi được phép, không in hoặc thay secret hiện tại.
- **Database:** Không đổi DB.
- **Security:** Giữ auth/role/ownership của endpoint; Không ghi JWT/reset token/payment key vào log; fixture test không coi là production secret.
- **Validation:** Không ghi JWT/reset token/payment key vào log; fixture test không coi là production secret.
- **Request / Response:** NO API CONTRACT CHANGE. Giữ hình dạng request/response hiện có; thay đổi nội bộ hoặc backlog chưa thực hiện.
- **Dependency:** Không.
- **Phối hợp frontend:** Không có task frontend đối ứng; tránh mở rộng phạm vi.
- **Acceptance Criteria:** Log lỗi outbound không chứa key; quy trình vận hành không để token trong command URL.

### Backend Tests

- **Test cần thực hiện:** Mô phỏng exception URL với key giả và quét log; review script read-only trước thay đổi.

# Planning Issues Detected

Các điểm dưới đây là điều kiện chưa chốt của task cụ thể, không phải dependency bị thiếu hoặc vòng lặp. Không tự thay nghiệp vụ hay dependency graph.

| FIX liên quan | Vấn đề | Đề xuất xử lý / trạng thái |
|---|---|---|
| FIX-015 | Nguồn/phiên bản danh mục địa chỉ chưa được shop chọn; districtCode và validation địa bàn phụ thuộc lựa chọn này. | Backend BLOCKED; Frontend BLOCKED; ADDRESS PROPOSED. Phong chốt cùng bộ dữ liệu cho hai phía trước khi đưa backend READY; không tự thêm API geography. |
| FIX-006, FIX-008 | FIX-006 ESSENTIAL phụ thuộc FIX-008 RECOMMENDED, trong khi roadmap cho phép chưa bán dịch vụ căng cước. | Giữ graph và TODO/BLOCKED. Phong chọn FIX-008 cho release hoặc duyệt điều chỉnh dependency/phạm vi trong nhiệm vụ planning riêng; không tự bỏ cạnh. |
| FIX-027, FIX-041 | FIX-027 ESSENTIAL phụ thuộc email FIX-041 RECOMMENDED, chưa có quyết định chọn release/provider gửi email. | Giữ graph và TODO/BLOCKED. Chốt phần email cần cho reset và phạm vi release trước khi triển khai các task này. |
| FIX-014 | returnWindowDays và chính sách hoàn tiền cần shop duyệt theo nhóm RETURN. | Giữ TODO/BLOCKED và PROPOSED; chốt giá trị/chính sách trước readiness, ngoài việc hoàn tất các dependency hiện có. |
| FIX-030 | Storage upload chưa được chọn sau khi chốt vận hành. | Giữ Backend TODO vì RECOMMENDED chưa được chọn; Frontend BLOCKED, UPLOAD PROPOSED. Chốt storage khi chọn task cho release. |
| FIX-048 | Chưa có bằng chứng nội dung chính sách, bảo hành và size guide đã được shop duyệt. | Frontend TODO, NO_CHANGE; không đánh READY toàn task. Phong cung cấp/duyệt nội dung trước khi triển khai đầy đủ; không tự sáng tác chính sách. |


