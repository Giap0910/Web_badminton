# KẾ HOẠCH FRONTEND

> **Source of truth:** `docs/fix/FIX_TRACKER.csv` là SOURCE OF TRUTH DUY NHẤT cho trạng thái thực thi hiện tại: backend/frontend status và verification, contract, cross-stack, overall, blocker, requested, agent, evidence, commit, last action và last updated. Trạng thái implementation, verification và contract hiện tại chỉ được đọc và ghi tại CSV. Các status/Readiness Assessment trong `.md` chỉ là **PLANNING / READINESS SNAPSHOT**, không dùng để quyết định quyền triển khai hoặc báo tiến độ. Không cập nhật status trong `.md` sau mỗi FIX; chỉ sửa specification khi thay đổi requirement, dependency, acceptance criteria, scope, API contract hoặc quyết định kiến trúc.

FRONTEND_FIX_PLAN.md không phải execution tracker. Đây là specification về yêu cầu frontend, pages/components/hooks/services, UI/UX, state, request/response handling, loading/error/empty, responsive, frontend tests và acceptance criteria frontend. Antigravity đọc yêu cầu tại đây; đọc và cập nhật current status chỉ tại FIX_TRACKER.csv.

Trước mọi lần cập nhật FIX_TRACKER.csv, agent phải reload bản tracker mới nhất và tuân thủ Concurrent Tracker Update Protocol trong MASTER_FIX_PLAN.md.

# Giai đoạn hiện tại

Audit/Planning ban đầu đã hoàn thành. Các câu “chưa implement”, “không sửa code”, “không tạo implementation” trong lịch sử tài liệu mô tả thời điểm tạo kế hoạch; không còn là lệnh cấm toàn cục đối với giai đoạn IMPLEMENTATION. Tại thời điểm audit chưa có implementation cho các FIX được đề xuất; readiness không chứng minh code đã sửa hoặc test đã chạy.

Ở nhiệm vụ IMPLEMENTATION tiếp theo được Phong yêu cầu, chỉ được sửa source thuộc FIX có Implementation Status `READY` hoặc đã chuyển `IN_PROGRESS`, đúng phía và đúng phạm vi file của FIX. Không tự mở rộng scope; task `BLOCKED` không được triển khai phần đang bị dependency chặn. RECOMMENDED và OPTIONAL không tự trở thành bắt buộc.

Mặc định mỗi lần chỉ một FIX; chỉ làm nhóm dependency nhỏ khi prompt implementation nêu rõ từng FIX và chúng đã sẵn sàng. Không tự triển khai cả 56 FIX hoặc sửa thêm task liên quan chưa READY/IN_PROGRESS. Migration, production DB, secret, deploy, dependency mới và thay đổi môi trường nhạy cảm vẫn theo giới hạn/ủy quyền riêng của task; READY không thay thế các điều kiện này. Cross-stack verification chỉ thực hiện sau khi hai phía hoàn thành và local tests đạt.

Lần chuẩn hóa ngày 02/10/2026 chỉ thay đổi bốn tài liệu kế hoạch; chưa triển khai source, chưa chạy test ứng dụng. Trạng thái thực thi từng phía chỉ được đọc/ghi tại `docs/fix/FIX_TRACKER.csv`; không suy ra từ thứ tự FIX-ID hoặc snapshot trong plan.

Ngày: 02/10/2026. **Lịch sử lúc tạo kế hoạch: chưa sửa code/chưa chạy test.** ID tham chiếu [MASTER_FIX_PLAN.md](docs/fix/MASTER_FIX_PLAN.md); mọi giao tiếp theo [API_CHANGES.md](docs/fix/API_CHANGES.md). Tại lần audit ban đầu, API/entity mới chỉ là đề xuất và chưa tạo implementation hay chạy migration. Từ giai đoạn triển khai, áp dụng mục Giai đoạn hiện tại và Implementation Entry Point trong MASTER; trạng thái từng FIX bên dưới chỉ là snapshot readiness; chỉ đọc/ghi trạng thái hiện tại tại `docs/fix/FIX_TRACKER.csv`.

## Nguyên tắc triển khai

Giữ React JSX/Vite/Tailwind/Lucide/Axios/Context. API base local hiện tại http://localhost:8080/api. Không thay framework. axiosClient trả trực tiếp response.data; PageResponse dùng content/pageNo/pageSize, không bọc data tùy ý. API đề xuất chưa tồn tại không được giả thành công bằng local array.

Mỗi task có loading/error/empty phù hợp; chỉ cập nhật trạng thái thành công sau phản hồi thực hoặc addToCart thành công. Với công việc chỉ UI không gọi API, loading network là không áp dụng. Đường dẫn page/component/hook mới phải được chốt trước tạo trong đợt implementation.

Responsive chung khi có UI thay đổi: kiểm tra360px,768px,1440px; không tràn viewport, modal cuộn được và không che CTA, điều khiển dùng bàn phím có focus/label; bảng admin cho phép cuộn ngang trong vùng bảng. Đây là tiêu chí cần kiểm tra, không khẳng định có lỗi responsive đã tái hiện.


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

Antigravity IDE chỉ chịu trách nhiệm frontend theo file này. Backend được Codex thực hiện theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md); Codex reviewer xác minh tích hợp cuối. Không tự sửa backend/DB hoặc đổi API contract. Frontend DONE chỉ chứng minh phần frontend và các test thuộc trách nhiệm đã đạt; cross-stack phải có bằng chứng riêng.

## Task frontend (48)

### FIX-002 — Hoàn thiện tạo link thanh toán PayOS

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PAYMENT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Critical / Integration / BOTH; ESSENTIAL.
- **Page cần sửa:** [QRPaymentPage.jsx](frontend/src/pages/QRPaymentPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [orderApi.js](frontend/src/api/orderApi.js)
- **Hiện tại / Nguyên nhân:** Đơn PayOS chỉ được gán payosOrderCode; không gọi gateway và không điền checkoutUrl/qrCode. PayOSService mới có hàm chữ ký, không có tạo/truy vấn link.
- **Phần frontend phải làm / UI-UX:** Gọi tạo link sau khi có orderId; hiển thị chờ, retry trên cùng đơn; dùng checkoutUrl đã xác minh.
- **API frontend đang sử dụng:** POST /api/orders; GET /api/orders/{id}. Chưa có payment-link API.
- **API sau sửa:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của QRPaymentPage, CheckoutPage với dữ liệu đã xác nhận; Gọi tạo link sau khi có orderId; hiển thị chờ, retry trên cùng đơn; dùng checkoutUrl đã xác minh.
- **Validation:** Chủ đơn; chỉ PAYOS_VIETQR/PENDING/chưa hết hạn; số tiền từ DB, VND nguyên và trong giới hạn gateway. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-002 — phần backend cùng task; FIX-001; FIX-018; FIX-054
- **Dependency khác:** FIX-001, FIX-018, FIX-054
- **Acceptance Criteria:** Đơn hợp lệ nhận link thực; timeout không tạo đơn mới hoặc trừ kho lần hai.

### Frontend Tests

- Kiểm tra request tạo link sau orderId, rendering chờ/link/QR, lỗi/timeout và retry giữ cùng đơn; không tự gửi amount hoặc đánh paid.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-002; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Mock HTTP lỗi/timeout và fixture gateway; thử môi trường thanh toán được cấp riêng. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-003 — Lưu giao dịch và đối soát thanh toán muộn

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PAYMENT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **Page cần sửa:** [AdminPaymentsPage.jsx](frontend/src/pages/AdminPaymentsPage.jsx); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [adminApi.js](frontend/src/api/adminApi.js)
- **Hiện tại / Nguyên nhân:** Callback muộn/đơn đã hủy chỉ bị từ chối và ghi log; admin payments dựng từ đơn, thiếu transaction reference thật. Không có payment ledger, hàng đợi đối soát hoặc dấu vết kết quả xử lý.
- **Phần frontend phải làm / UI-UX:** Hiển thị giao dịch thật và trường hợp cần xử lý; phân biệt tiền đã nhận với trạng thái giao hàng.
- **API frontend đang sử dụng:** GET /api/admin/payments; GET /api/orders/{id}; POST /api/payment/payos-webhook do gateway gọi.
- **API sau sửa:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminPaymentsPage, OrderDetailPage với dữ liệu đã xác nhận; Hiển thị giao dịch thật và trường hợp cần xử lý; phân biệt tiền đã nhận với trạng thái giao hàng.
- **Validation:** Giữ HMAC, so sánh amount, khóa order; không tin return query hay client; admin không tự đánh PAID. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-003 — phần backend cùng task; FIX-002
- **Dependency khác:** FIX-002
- **Acceptance Criteria:** Webhook lặp không trừ kho hai lần; tiền nhận muộn có hồ sơ đối soát; lỗi commit không mất khả năng xử lý lại.

### Frontend Tests

- Render reference/payment status/reviewReason thật; phân biệt tiền nhận và giao hàng; kiểm tra request đối soát, loading và lỗi giữ state.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-003; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Callback lặp/đồng thời/sai tiền/đơn hủy; giả lập lỗi DB sau gateway thành công và thử lại. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-004 — Sửa trang QR và đường dẫn trả về thanh toán

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PAYMENT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Integration / BOTH; ESSENTIAL.
- **Page cần sửa:** [App.jsx](frontend/src/App.jsx); [QRPaymentPage.jsx](frontend/src/pages/QRPaymentPage.jsx); [OrderSuccessPage.jsx](frontend/src/pages/OrderSuccessPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [orderApi.js](frontend/src/api/orderApi.js)
- **Hiện tại / Nguyên nhân:** Return URL /orders/success không có orderId; /orders/cancel có thể khớp route order detail; qrCode được dùng như URL ảnh. Chưa thống nhất route, mã đơn nội bộ và payload QR.
- **Phần frontend phải làm / UI-UX:** Dùng /order-success/:orderId và /payment/qr/:orderId?cancelled=1; fetch lại order; render qrPayload thành QR, không gán payload thô vào img.src.
- **API frontend đang sử dụng:** GET /api/orders/{id}; browser return/cancel routes (không phải REST endpoint).
- **API sau sửa:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của App, QRPaymentPage, OrderSuccessPage với dữ liệu đã xác nhận; Dùng /order-success/:orderId và /payment/qr/:orderId?cancelled=1; fetch lại order; render qrPayload thành QR, không gán payload thô vào img.src.
- **Validation:** Kiểm tra owner khi fetch; callback/query giả không thay đổi payment status. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-004 — phần backend cùng task; FIX-002; FIX-003
- **Dependency khác:** FIX-002, FIX-003
- **Acceptance Criteria:** Reload/mở trực tiếp/back/đóng cửa sổ vẫn xem đúng đơn; cancel redirect không tự hủy đơn.

### Frontend Tests

- Điều hướng return/cancel, reload/mở trực tiếp/back, QR payload không gán img.src; query status giả không tạo UI đã trả tiền khi GET chưa xác nhận.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-004; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Thử return trước/sau webhook, query status giả, QR payload không phải URL. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-005 — Sửa lỗi render trang băng chặn mồ hôi

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL, frontend-only; không có dependency bắt buộc; dùng API hiện hữu/NO_CHANGE; file và tiêu chí đã rõ.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** High / Bug / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** JSX dùng Award nhưng không import/khai báo; tab mặc định có thể gây ReferenceError. Thiếu import icon trong component.
- **Phần frontend phải làm / UI-UX:** Bổ sung đúng icon hoặc dùng icon có sẵn; giữ giao diện và luồng hiện có.
- **API frontend đang sử dụng:** GET /api/products/{id}; GET /api/reviews/product/{productId}.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của SweatbandDetailPage với dữ liệu đã xác nhận; Bổ sung đúng icon hoặc dùng icon có sẵn; giữ giao diện và luồng hiện có.
- **Validation:** Không áp dụng backend. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Không thêm request chỉ để sửa hiển thị; giữ loader đang có nếu page tải dữ liệu.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** Không.
- **Acceptance Criteria:** Trang và tab mô tả render được khi API trả sản phẩm.

### Frontend Tests

- **Cách test:** Mở trực tiếp sản phẩm sweatband, đổi tab, kiểm tra console. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-006 — Giữ đầy đủ tùy chọn từ chi tiết đến đơn hàng

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Integration / BOTH; ESSENTIAL.
- **Page cần sửa:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [ShuttlecockDetailPage.jsx](frontend/src/pages/ShuttlecockDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [CartContext.jsx](frontend/src/context/CartContext.jsx)
- **Hiện tại / Nguyên nhân:** normalizeOptions loại gauge/stringing/texture/feather/speed/pack/variant/addon/customPrint; lựa chọn bị mất hoặc gộp dòng sai. Tên option không thống nhất; checkout chỉ gửi vài chuỗi và ghép phần khác vào note.
- **Phần frontend phải làm / UI-UX:** Chuẩn hóa mọi trang dùng cùng variantId/serviceSelection và line key; chuyển cart cũ an toàn, yêu cầu chọn lại khi thiếu.
- **API frontend đang sử dụng:** GET /api/products/{id}; POST /api/orders; giỏ hiện không có API.
- **API sau sửa:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProductDetailPage, RacketGripDetailPage, StringDetailPage, ShuttlecockDetailPage, SweatbandDetailPage, CheckoutPage với dữ liệu đã xác nhận; Chuẩn hóa mọi trang dùng cùng variantId/serviceSelection và line key; chuyển cart cũ an toàn, yêu cầu chọn lại khi thiếu.
- **Validation:** Variant thuộc product, active, tổ hợp hợp lệ; note không thay cho định danh biến thể. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-006 — phần backend cùng task; FIX-007; FIX-008
- **Dependency khác:** FIX-007, FIX-008
- **Acceptance Criteria:** Mỗi lựa chọn có ảnh hưởng giao hàng được giữ qua reload và tạo đơn; không gộp sai dòng.

### Frontend Tests

- Kiểm tra selectors, normalize cart/line key, reload cart cũ, payload variantId/serviceSelection và render snapshot cho năm nhóm sản phẩm.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-006; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Chạy bảng test 5 loại sản phẩm với lựa chọn khác nhau và cart cũ. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-007 — Biến thể, giá và tồn kho theo SKU bán được

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **Page cần sửa:** [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx)
- **Component cần sửa:** [ProductCard.jsx](frontend/src/components/ProductCard.jsx)
- **Hook / Service / Tiện ích:** [CartContext.jsx](frontend/src/context/CartContext.jsx)
- **Hiện tại / Nguyên nhân:** Chỉ có stock/price cấp Product; size/màu/3U-G5 hardcode; sweatband tự cộng giá trên client nhưng backend tính giá Product. Chưa có ProductVariant và nguồn dữ liệu lựa chọn chuẩn.
- **Phần frontend phải làm / UI-UX:** Admin quản lý tổ hợp thực; khách chọn đúng biến thể; giá và hết hàng lấy từ API, không cộng giá giả.
- **API frontend đang sử dụng:** GET/POST /api/products; GET/PUT /api/products/{id}; POST /api/orders. Chưa có variants endpoint.
- **API sau sửa:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminProductsPage, ProductDetailPage, SweatbandDetailPage với dữ liệu đã xác nhận; Admin quản lý tổ hợp thực; khách chọn đúng biến thể; giá và hết hàng lấy từ API, không cộng giá giả.
- **Validation:** Giá dương, stock nguyên không âm; variant thuộc Product; tổng stock khả dụng+reserved có giới hạn. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-007 — phần backend cùng task; FIX-021; FIX-045; FIX-055
- **Dependency khác:** FIX-021, FIX-045, FIX-055
- **Acceptance Criteria:** Không mua biến thể không tồn tại/ngừng bán; hai người mua chiếc cuối chỉ một đơn thành công.

### Frontend Tests

- Form biến thể admin và selectors khách, giá/kho từ response, lựa chọn size/màu/weight/grip; xử lý conflict/disabled và loading.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-007; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Integration MySQL tranh mua, admin sửa kho đồng thời; E2E size/màu/weight/grip. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-008 — Dịch vụ căng cước và phụ phí có dữ liệu thật

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Bổ sung trách nhiệm quản trị dịch vụ:** [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx) và [adminApi.js](frontend/src/api/adminApi.js): form cấu hình stringing-options, giá công, vật tư và giới hạn sức căng; PUT danh sách theo nhóm ORDER. State danh sách dịch vụ/loading/saving/error; chỉ báo lưu sau response, kiểm tra min<=max và phí không âm. Nghiệm thu: admin lưu, reload và trang khách thấy đúng tùy chọn/giá; lỗi400 giữ form.

- **Mức độ / Loại / Phạm vi gốc:** High / Integration / BOTH; RECOMMENDED.
- **Page cần sửa:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** UI chọn loại cước/mức căng và thông báo miễn phí, backend chỉ lưu chuỗi; không định giá dịch vụ hoặc kiểm tra sức căng. Cấu hình dịch vụ nằm trong JSX, chưa có bảng giá và giới hạn kỹ thuật có đơn vị.
- **Phần frontend phải làm / UI-UX:** Chỉ hiện dịch vụ thật; hiển thị giá cước/công riêng và yêu cầu kỹ thuật trên đơn; nếu chưa cung cấp thì không cho chọn.
- **API frontend đang sử dụng:** GET /api/products/{id}; POST /api/orders. Chưa có stringing-options endpoint.
- **API sau sửa:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProductDetailPage, StringDetailPage, CheckoutPage, AdminOrdersPage với dữ liệu đã xác nhận; Chỉ hiện dịch vụ thật; hiển thị giá cước/công riêng và yêu cầu kỹ thuật trên đơn; nếu chưa cung cấp thì không cho chọn.
- **Validation:** Căng không vượt maxTensionLbs; đơn vị thống nhất; cước tương thích/active/còn kho. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-008 — phần backend cùng task; FIX-007
- **Dependency khác:** FIX-007
- **Acceptance Criteria:** Tổng tiền bao gồm đúng phí đã xác nhận; yêu cầu kỹ thuật xuất hiện trong đơn admin.

### Frontend Tests

- Form cấu hình stringing-options và lựa chọn không căng/có căng, validation sức căng/phí, request payload và hiển thị phí/yêu cầu kỹ thuật trên đơn.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-008; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Chọn không căng/có căng, vượt sức căng, cước hết hàng, sửa phí client. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-009 — Không báo thêm giỏ thành công hoặc mua nhầm giỏ khi thêm thất bại

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL, frontend-only; không có dependency bắt buộc; dùng API hiện hữu/NO_CHANGE; file và tiêu chí đã rõ.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** High / Bug / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [ShuttlecockDetailPage.jsx](frontend/src/pages/ShuttlecockDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx); [CartPage.jsx](frontend/src/pages/CartPage.jsx); [ComparePage.jsx](frontend/src/pages/ComparePage.jsx)
- **Component cần sửa:** [AiChatbotWidget.jsx](frontend/src/components/AiChatbotWidget.jsx)
- **Hook / Service / Tiện ích:** [CartContext.jsx](frontend/src/context/CartContext.jsx)
- **Hiện tại / Nguyên nhân:** Handler bỏ qua null từ addToCart; buyNow gửi selectedItemIds undefined khiến checkout chọn toàn giỏ. Không kiểm tra kết quả thao tác và mặc định selection quá rộng.
- **Phần frontend phải làm / UI-UX:** Kiểm tra kết quả ở mọi điểm thêm; chỉ điều hướng khi có lineId; lỗi phải giữ nguyên selection và cho biết thiếu kho/chưa chọn variant.
- **API frontend đang sử dụng:** addToCart là hàm Context local; checkout hiện POST /api/orders khi xác nhận.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProductDetailPage, RacketGripDetailPage, StringDetailPage, ShuttlecockDetailPage, SweatbandDetailPage, CartPage, ComparePage với dữ liệu đã xác nhận; Kiểm tra kết quả ở mọi điểm thêm; chỉ điều hướng khi có lineId; lỗi phải giữ nguyên selection và cho biết thiếu kho/chưa chọn variant.
- **Validation:** Số lượng nguyên 1..100, yêu cầu chọn biến thể trước khi thêm. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** Không.
- **Acceptance Criteria:** Thêm thất bại không có toast thành công; mua ngay không thanh toán những dòng cũ ngoài ý muốn.

### Frontend Tests

- **Cách test:** Giỏ đã có sản phẩm A, mua ngay B hết hàng; double click; thêm từ chat/compare/related. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-010 — Combo quấn cán không dùng sản phẩm giả

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-009.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / Bug / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** handleAddCombo dựng product id 99901 không có stock thật, rồi báo thành công. Combo minh họa chưa nối catalog.
- **Phần frontend phải làm / UI-UX:** Thay bằng các SKU thật lấy từ catalog khi cấu hình có sẵn; trước mắt hiển thị chưa hỗ trợ và không thêm dummy vào giỏ.
- **API frontend đang sử dụng:** GET /api/products/{id}; combo hiện chỉ dựng object local.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của RacketGripDetailPage với dữ liệu đã xác nhận; Thay bằng các SKU thật lấy từ catalog khi cấu hình có sẵn; trước mắt hiển thị chưa hỗ trợ và không thêm dummy vào giỏ.
- **Validation:** Mọi ID mua được phải tồn tại và đủ kho. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Không thêm request chỉ để sửa hiển thị; giữ loader đang có nếu page tải dữ liệu.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** FIX-009
- **Acceptance Criteria:** Không phát sinh cart item giả hoặc toast sai.

### Frontend Tests

- **Cách test:** Nhấn combo, reload giỏ, đối chiếu ID với API. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-011 — Không tạo review giả khi API lỗi

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL, frontend-only; không có dependency bắt buộc; dùng API hiện hữu/NO_CHANGE; file và tiêu chí đã rõ.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** High / Bug / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** catch tạo fallbackRev bằng Date.now và báo thành công dù server từ chối. Nhánh lỗi dùng dữ liệu giả thay cho error state.
- **Phần frontend phải làm / UI-UX:** Giữ comment/rating để thử lại, hiển thị lỗi; chỉ thêm response server vào danh sách khi thành công.
- **API frontend đang sử dụng:** POST /api/reviews; GET /api/reviews/product/{productId}.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProductDetailPage với dữ liệu đã xác nhận; Giữ comment/rating để thử lại, hiển thị lỗi; chỉ thêm response server vào danh sách khi thành công.
- **Validation:** 401 yêu cầu đăng nhập; 400/403/409 hiển thị lý do. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** Không.
- **Acceptance Criteria:** API thất bại không làm tăng số review hoặc xóa nội dung đang viết.

### Frontend Tests

- **Cách test:** Mock 401/403/500/timeout; gửi thành công rồi reload. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-012 — Review gắn với lần mua và chống trùng

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** REVIEW
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Validation / BOTH; ESSENTIAL.
- **Page cần sửa:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx); [ReviewedProductsPage.jsx](frontend/src/pages/ReviewedProductsPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [reviewApi.js](frontend/src/api/reviewApi.js)
- **Hiện tại / Nguyên nhân:** Người đăng nhập có thể review sản phẩm chưa mua và gửi nhiều lần. Chỉ kiểm tra user/product tồn tại, không liên kết OrderItem.
- **Phần frontend phải làm / UI-UX:** Hiển thị lựa chọn dòng hàng đủ điều kiện và trạng thái đã review; không tin userFullName gửi client.
- **API frontend đang sử dụng:** POST /api/reviews; GET /api/reviews/my-reviews; GET /api/reviews/product/{productId}.
- **API sau sửa:** Nhóm REVIEW trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProductDetailPage, SweatbandDetailPage, ReviewedProductsPage với dữ liệu đã xác nhận; Hiển thị lựa chọn dòng hàng đủ điều kiện và trạng thái đã review; không tin userFullName gửi client.
- **Validation:** Rating 1..5, comment sau sanitize không rỗng và <=2000 ký tự, ownership. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-012 — phần backend cùng task; FIX-020
- **Dependency khác:** FIX-011, FIX-020
- **Acceptance Criteria:** Mua chưa hoàn tất bị chặn; gửi trùng đồng thời chỉ một review; sửa/xóa đúng owner.

### Frontend Tests

- Form chọn dòng đủ điều kiện, rating/comment, payload orderItemId, response review thật và lỗi chưa mua/trùng/khác owner; state sau sửa/xóa.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-012; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** API test chưa mua/khác user/rating biên/trùng và E2E review sau mua. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-013 — Đồng bộ trạng thái và dữ liệu đổi trả trên UI

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL, frontend-only; không có dependency bắt buộc; dùng API hiện hữu/NO_CHANGE; file và tiêu chí đã rõ.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** High / Integration / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [ReturnRequestPage.jsx](frontend/src/pages/ReturnRequestPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [adminApi.js](frontend/src/api/adminApi.js); [returnApi.js](frontend/src/api/returnApi.js)
- **Hiện tại / Nguyên nhân:** Frontend gửi IN_REVIEW/lọc RECEIVED nhưng enum backend là PENDING/APPROVED/REJECTED/COMPLETED; đọc customerName thay userFullName. UI dựa mô hình demo khác backend.
- **Phần frontend phải làm / UI-UX:** Dùng enum backend hiện có, userFullName và dữ liệu đơn thật; trạng thái lỗi giữ nguyên, không tự chuyển timeline.
- **API frontend đang sử dụng:** GET /api/returns/my-returns; GET /api/returns/all; PUT /api/returns/{id}/status?status=...; GET /api/orders/my-orders.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminReviewsPage, ReturnRequestPage với dữ liệu đã xác nhận; Dùng enum backend hiện có, userFullName và dữ liệu đơn thật; trạng thái lỗi giữ nguyên, không tự chuyển timeline.
- **Validation:** Không gửi enum lạ; chỉ hiện hành động phù hợp. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** Không.
- **Acceptance Criteria:** Admin cập nhật được trạng thái hợp lệ; tab của khách hiển thị đúng tất cả yêu cầu.

### Frontend Tests

- **Cách test:** Mỗi trạng thái và response field; 400/409 không đổi UI. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-014 — Quy tắc đổi trả và hoàn tiền có kiểm soát

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** RETURN
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Validation / BOTH; ESSENTIAL.
- **Page cần sửa:** [ReturnRequestPage.jsx](frontend/src/pages/ReturnRequestPage.jsx); [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [AdminPaymentsPage.jsx](frontend/src/pages/AdminPaymentsPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Tạo đổi trả chỉ kiểm tra ownership; updateStatus chấp nhận chuyển bất kỳ; chưa có hoàn tiền hay hoàn kho hàng trả. Thiếu điều kiện đủ hạn, chống trùng và quy trình xử lý sau duyệt.
- **Phần frontend phải làm / UI-UX:** Form chỉ chọn đơn đủ điều kiện, theo dõi trạng thái và lý do; admin nhập bằng chứng hoàn tiền, không gọi duyệt là đã hoàn tiền.
- **API frontend đang sử dụng:** POST /api/returns; GET /api/returns/my-returns; GET /api/returns/all; PUT /api/returns/{id}/status. Refund/restock chưa có.
- **API sau sửa:** Nhóm RETURN trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ReturnRequestPage, AdminReviewsPage, AdminPaymentsPage với dữ liệu đã xác nhận; Form chỉ chọn đơn đủ điều kiện, theo dõi trạng thái và lý do; admin nhập bằng chứng hoàn tiền, không gọi duyệt là đã hoàn tiền.
- **Validation:** Không vượt số tiền đã nhận/trừ refund trước; không hoàn tiền/kho hai lần; quyền admin. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-014 — phần backend cùng task; FIX-003; FIX-039
- **Dependency khác:** FIX-003, FIX-013, FIX-039
- **Acceptance Criteria:** Đơn chưa giao/ngoài hạn/trùng bị chặn; không chuyển lùi; hoàn tiền và nhập lại kho có dấu vết riêng.

### Frontend Tests

- Form đơn đủ điều kiện, trạng thái/lý do/refund và bằng chứng; kiểm tra payload, UI permissions, lỗi409 không tự chuyển timeline.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-014; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Test các cặp trạng thái, duplicate concurrent, refund lặp, hàng không đủ điều kiện nhập lại. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-015 — Địa chỉ có cấu trúc và checkout chọn đúng địa chỉ

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ADDRESS
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Bug / BOTH; ESSENTIAL.
- **Page cần sửa:** [ShippingAddressPage.jsx](frontend/src/pages/ShippingAddressPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [shippingAddressApi.js](frontend/src/api/shippingAddressApi.js)
- **Hiện tại / Nguyên nhân:** Sửa địa chỉ ghép chuỗi lần nữa và giữ địa phương mặc định; checkout tải danh sách nhưng không có selector/saveInfo thật. DB chỉ có address/province; form detail lại nhận địa chỉ đầy đủ.
- **Phần frontend phải làm / UI-UX:** Nạp lại đúng các trường; thêm selector; saveInfo thực sự gọi API; không ép quận/huyện nếu hệ địa chỉ không cần.
- **API frontend đang sử dụng:** GET/POST /api/shipping-addresses; GET/PUT/DELETE /api/shipping-addresses/{id}; PATCH /api/shipping-addresses/{id}/default.
- **API sau sửa:** Nhóm ADDRESS trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ShippingAddressPage, CheckoutPage với dữ liệu đã xác nhận; Nạp lại đúng các trường; thêm selector; saveInfo thực sự gọi API; không ép quận/huyện nếu hệ địa chỉ không cần.
- **Validation:** Phone đúng regex không có ký tự |; kiểm tra địa bàn theo bộ dữ liệu được shop chọn; owner từ JWT. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-015 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Sửa/lưu nhiều lần không nhân đôi địa chỉ; checkout dùng đúng địa chỉ được chọn.

### Frontend Tests

- Tạo/sửa nhiều lần không nhân đôi địa chỉ; legacy cần xác nhận, chọn saved address, saveInfo, phone validation và loading/error.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-015; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Tạo/sửa địa chỉ ngoài TP.HCM, legacy, ký tự |, thiếu phường và đổi default. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-017 — Checkout dùng báo giá server và validation đầy đủ

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Integration / BOTH; ESSENTIAL.
- **Page cần sửa:** [CartPage.jsx](frontend/src/pages/CartPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [orderApi.js](frontend/src/api/orderApi.js); [voucherApi.js](frontend/src/api/voucherApi.js)
- **Hiện tại / Nguyên nhân:** UI tính tổng trên giá snapshot; email/địa phương chưa được xử lý đầy đủ; không có quote thống nhất. Tính shipping/voucher lặp ở client và server; dữ liệu cart có thể cũ.
- **Phần frontend phải làm / UI-UX:** Làm mới báo giá khi items/address/voucher thay đổi; báo sản phẩm ngừng bán/hết hàng; khách xác nhận giá mới; không gửi discount tự tính.
- **API frontend đang sử dụng:** POST /api/orders; POST /api/vouchers/validate; GET /api/shipping-addresses; chưa có quote.
- **API sau sửa:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của CartPage, CheckoutPage với dữ liệu đã xác nhận; Làm mới báo giá khi items/address/voucher thay đổi; báo sản phẩm ngừng bán/hết hàng; khách xác nhận giá mới; không gửi discount tự tính.
- **Validation:** Giới hạn số dòng, note, tên, số điện thoại; shippingMethod=STANDARD giai đoạn đầu; dữ liệu client không quyết định giá. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-017 — phần backend cùng task; FIX-006; FIX-015; FIX-023; FIX-054
- **Dependency khác:** FIX-006, FIX-015, FIX-023, FIX-054
- **Acceptance Criteria:** Tổng tiền trên xác nhận khớp server; giá đổi giữa quote/create không âm thầm thu khác.

### Frontend Tests

- Quote lại khi giỏ/địa chỉ/voucher đổi, payload expectedTotal, bỏ response cũ, hiển thị giá thay đổi/hết kho, mạng lỗi giữ form/giỏ.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-017; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Sửa giá/discount/fee DevTools; voucher hết hạn; stock đổi; network mất khi quote. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-018 — Chống tạo đơn trùng bằng idempotency

- **Implementation Status:** BLOCKED
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **Page cần sửa:** [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [orderApi.js](frontend/src/api/orderApi.js)
- **Hiện tại / Nguyên nhân:** Khóa user và giới hạn 3 đơn pending không ngăn cùng yêu cầu tạo ra nhiều đơn. Không có khóa idempotency lưu phía server.
- **Phần frontend phải làm / UI-UX:** Tạo UUID cho một lần xác nhận giỏ; giữ key khi retry/timeout/reload; khi thay đổi nội dung cần key mới, disable submit trong lúc gửi.
- **API frontend đang sử dụng:** POST /api/orders qua orderApi.createOrder; chưa gửi Idempotency-Key.
- **API sau sửa:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của CheckoutPage với dữ liệu đã xác nhận; Tạo UUID cho một lần xác nhận giỏ; giữ key khi retry/timeout/reload; khi thay đổi nội dung cần key mới, disable submit trong lúc gửi.
- **Validation:** Key UUID; xác thực user; lookup replay trước kiểm tra pending limit. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-018 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Hai request cùng key chỉ một order và một lần giữ kho/voucher.

### Frontend Tests

- Double click, lưu key theo lần xác nhận, retry/timeout/reload giữ key, đổi nội dung tạo key mới; xử lý201/200/409 không xóa giỏ sai.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-018; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Concurrent cùng key, khác body, timeout sau commit, retry khi đã đủ 3 đơn pending. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-019 — Trang kết quả và đơn hàng dùng đúng response

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL, frontend-only; không có dependency bắt buộc; dùng API hiện hữu/NO_CHANGE; file và tiêu chí đã rõ.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / Bug / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [OrderSuccessPage.jsx](frontend/src/pages/OrderSuccessPage.jsx); [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [formatters.js](frontend/src/utils/formatters.js)
- **Hiện tại / Nguyên nhân:** OrderSuccess đọc item.name/imageUrl thay productName/productImageUrl; link /user/orders sai; thời gian/phí/mô tả mẫu và danh sách chỉ dòng đầu gây hiểu nhầm. Màn hình còn mapper theo demo và fallback giả.
- **Phần frontend phải làm / UI-UX:** Sửa mapper và route /my-orders; hiện đủ item, shippingFee/discountAmount/voucherCode/createdAt thật; COD chưa thu tiền không ghi đã thanh toán.
- **API frontend đang sử dụng:** GET /api/orders/{id}; GET /api/orders/my-orders; GET /api/orders/all.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của OrderSuccessPage, MyOrdersPage, OrderDetailPage, AdminOrdersPage với dữ liệu đã xác nhận; Sửa mapper và route /my-orders; hiện đủ item, shippingFee/discountAmount/voucherCode/createdAt thật; COD chưa thu tiền không ghi đã thanh toán.
- **Validation:** Đơn không tồn tại/khác owner không dùng state cũ giả thành công. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** Không.
- **Acceptance Criteria:** Reload vẫn hiện cùng thông tin và tổng tiền; đơn nhiều dòng không mất hàng.

### Frontend Tests

- **Cách test:** COD/PayOS, đơn 3 dòng, có/không voucher, 403/404. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-020 — Snapshot lịch sử sản phẩm trong OrderItem

- **Implementation Status:** BLOCKED
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Bug / BOTH; ESSENTIAL.
- **Page cần sửa:** [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx); [OrderSuccessPage.jsx](frontend/src/pages/OrderSuccessPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Giá đã snapshot nhưng tên/ảnh/brand/weightGrip lấy Product hiện tại; sửa catalog làm lịch sử đơn đổi. DTO đọc quan hệ Product khi hiển thị lịch sử.
- **Phần frontend phải làm / UI-UX:** Tiếp tục dùng productName/productImageUrl từ order; không fetch catalog để thay thông tin lịch sử.
- **API frontend đang sử dụng:** GET /api/orders/{id}, /api/orders/my-orders, /api/orders/all; hiện DTO lấy tên/ảnh Product.
- **API sau sửa:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của OrderDetailPage, OrderSuccessPage, AdminOrdersPage với dữ liệu đã xác nhận; Tiếp tục dùng productName/productImageUrl từ order; không fetch catalog để thay thông tin lịch sử.
- **Validation:** Không nhận snapshot giá/tên từ client. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-020 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Sửa tên/ảnh hoặc ngừng bán sản phẩm không thay đổi đơn mới đã tạo.

### Frontend Tests

- Render snapshot productName/productImageUrl/options từ order response; không thay bằng catalog hiện tại; loading/error các màn hình khách/admin.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-020; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Tạo đơn rồi đổi catalog; đọc chi tiết khách/admin. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-021 — Lưu đầy đủ thuộc tính và bộ ảnh sản phẩm

- **Implementation Status:** BLOCKED
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Bug / BOTH; ESSENTIAL.
- **Page cần sửa:** [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [ShuttlecockDetailPage.jsx](frontend/src/pages/ShuttlecockDetailPage.jsx); [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** DTO/entity có nhiều thuộc tính nhưng create/update chỉ map core và vài trường vợt; imageUrls không được lưu. Mapping viết chưa đầy đủ; form admin chỉ hỗ trợ phần nhỏ.
- **Phần frontend phải làm / UI-UX:** Form theo nhóm sản phẩm; gửi đúng trường; gallery đọc imageUrls từ API và fallback ảnh chính.
- **API frontend đang sử dụng:** GET/POST /api/products; GET/PUT /api/products/{id}; GET /api/categories. GET /api/products/{id}/images có wrapper nhưng gallery chưa nối đầy đủ.
- **API sau sửa:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminProductsPage, ProductDetailPage, StringDetailPage, ShuttlecockDetailPage, RacketGripDetailPage, SweatbandDetailPage với dữ liệu đã xác nhận; Form theo nhóm sản phẩm; gửi đúng trường; gallery đọc imageUrls từ API và fallback ảnh chính.
- **Validation:** Độ dài tương ứng column, JSON sizes hợp lệ, URL ảnh được cho phép, giá gốc>=giá bán. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-021 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Lưu rồi GET lại không mất thông số/ảnh; dữ liệu nhóm sản phẩm khác không bị xóa ngoài ý muốn.

### Frontend Tests

- Form mọi nhóm thuộc tính và gallery; payload null/[] theo contract; reload form từ response, validation/error giữ dữ liệu và ảnh đúng thứ tự.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-021; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Round-trip toàn bộ trường vợt/giày/áo/túi/phụ kiện; gallery nhiều ảnh/[]/null. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-022 — Ngừng bán và xóa catalog an toàn

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; ESSENTIAL.
- **Page cần sửa:** [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx)
- **Component cần sửa:** [ProductCard.jsx](frontend/src/components/ProductCard.jsx)
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Product/category delete thẳng có thể lỗi FK; chưa có active/inactive dù có nút trạng thái. Thiếu vòng đời catalog; lịch sử đơn phụ thuộc Product.
- **Phần frontend phải làm / UI-UX:** Nút ngừng bán gọi API thật; xác nhận delete; hiển thị conflict thay thông báo chung; cart đánh dấu không mua được.
- **API frontend đang sử dụng:** DELETE /api/products/{id}; không có PATCH status hiện tại.
- **API sau sửa:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminProductsPage, CheckoutPage với dữ liệu đã xác nhận; Nút ngừng bán gọi API thật; xác nhận delete; hiển thị conflict thay thông báo chung; cart đánh dấu không mua được.
- **Validation:** Admin write; user không mua active=false; preserve historical FK. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-022 — phần backend cùng task; FIX-020
- **Dependency khác:** FIX-020
- **Acceptance Criteria:** Không mất lịch sử; delete bị ràng buộc trả lỗi rõ; ngừng bán loại khỏi catalog public.

### Frontend Tests

- Nút active/delete và quyền UI, payload đúng, conflict không báo thành công; cart/checkout hiển thị ngừng bán từ response.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-022; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Xóa product có order/images/review; category còn product; checkout khi admin disable. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-023 — Voucher không làm tăng tiền và sửa/tắt được thật

- **Implementation Status:** BLOCKED
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** VOUCHER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Validation / BOTH; ESSENTIAL.
- **Page cần sửa:** [AdminVouchersPage.jsx](frontend/src/pages/AdminVouchersPage.jsx); [CartPage.jsx](frontend/src/pages/CartPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** VoucherDto không constraints; maxDiscountAmount âm có thể tạo discount âm; update bỏ qua code/null; toggle UI chưa gọi API. @Valid không hiệu lực nếu DTO không có rule; update semantics chưa rõ.
- **Phần frontend phải làm / UI-UX:** Không cho sửa code đã tạo; toggle isActive thật; form thể hiện lỗi trường và null để bỏ giới hạn.
- **API frontend đang sử dụng:** GET/POST /api/admin/vouchers; PUT/DELETE /api/admin/vouchers/{id}; POST /api/vouchers/validate.
- **API sau sửa:** Nhóm VOUCHER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminVouchersPage, CartPage, CheckoutPage với dữ liệu đã xác nhận; Không cho sửa code đã tạo; toggle isActive thật; form thể hiện lỗi trường và null để bỏ giới hạn.
- **Validation:** PERCENT 0..100; tiền/limit không âm; maxUses>=usedCount; normalize code. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-023 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Voucher bất hợp lệ không được lưu/áp dụng; tắt và bỏ giới hạn phản ánh sau reload.

### Frontend Tests

- Form voucher range/type/code bất biến, toggle thực, payload null bỏ giới hạn; loading/error/field errors và reload giá trị.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-023; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** maxDiscount=-1, type lạ, code trùng, update cùng reserve, toggle và null. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-024 — Điều kiện voucher theo thời gian, người dùng, sản phẩm

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** VOUCHER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **Page cần sửa:** [AdminVouchersPage.jsx](frontend/src/pages/AdminVouchersPage.jsx); [CartPage.jsx](frontend/src/pages/CartPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Chưa có startsAt, limit/user hay phạm vi category/product; tên mô tả voucher không tự áp điều kiện. Mô hình chỉ tổng đơn/expiry/global count.
- **Phần frontend phải làm / UI-UX:** Admin khai báo điều kiện; khách thấy lý do không áp dụng; chuyển preview từ orderTotal tự khai sang items.
- **API frontend đang sử dụng:** POST /api/vouchers/validate hiện nhận code/orderTotal; GET /api/vouchers/active có wrapper chưa tích hợp.
- **API sau sửa:** Nhóm VOUCHER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminVouchersPage, CartPage, CheckoutPage với dữ liệu đã xác nhận; Admin khai báo điều kiện; khách thấy lý do không áp dụng; chuyển preview từ orderTotal tự khai sang items.
- **Validation:** Không vượt global/per-user dưới concurrency; release idempotent; startsAt<=expiresAt. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-024 — phần backend cùng task; FIX-023; FIX-017
- **Dependency khác:** FIX-023, FIX-017
- **Acceptance Criteria:** Hai tab không vượt hạn mức cá nhân; voucher giới hạn vợt không dùng cho giày.

### Frontend Tests

- Form điều kiện voucher, payload items và thông báo không áp dụng/hết lượt/hết hạn; không tính discount tự khai làm nguồn xác nhận.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-024; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Biên thời gian, category hỗn hợp, hai request đồng thời và hủy đơn. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-025 — Ngăn admin tự khóa hoặc khóa admin cuối

- **Implementation Status:** BLOCKED
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ADMINUSER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Security / BOTH; ESSENTIAL.
- **Page cần sửa:** [AdminCustomersPage.jsx](frontend/src/pages/AdminCustomersPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [adminApi.js](frontend/src/api/adminApi.js)
- **Hiện tại / Nguyên nhân:** updateUserStatus không biết người thao tác và không chặn self-lock. Chỉ setIsActive theo id request.
- **Phần frontend phải làm / UI-UX:** Hiển thị role thật; disable thao tác tự khóa; xử lý lỗi 409; không dùng role làm hạng hội viên.
- **API frontend đang sử dụng:** GET /api/admin/users; PUT /api/admin/users/{id}/status?active=...
- **API sau sửa:** Nhóm ADMINUSER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminCustomersPage với dữ liệu đã xác nhận; Hiển thị role thật; disable thao tác tự khóa; xử lý lỗi 409; không dùng role làm hạng hội viên.
- **Validation:** Admin-only; userId từ principal, không từ body. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-025 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Không mất toàn bộ tài khoản quản trị do thao tác UI/API.

### Frontend Tests

- Hiển thị role thực, disable tự khóa, gửi active đúng;409 giữ state và thông báo rõ, không suy role thành tier.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-025; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Admin tự khóa, khóa user, hai admin khóa nhau đồng thời. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-026 — Đăng ký/đăng nhập không tự tạo email giả

- **Implementation Status:** BLOCKED
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** AUTH
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / BOTH; ESSENTIAL.
- **Page cần sửa:** [LoginPage.jsx](frontend/src/pages/LoginPage.jsx); [RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [AuthContext.jsx](frontend/src/context/AuthContext.jsx)
- **Hiện tại / Nguyên nhân:** Frontend nhận email/phone, sinh username ngẫu nhiên và email phone@hgbadminton.vn; backend chỉ lookup username/email. UI hứa đăng nhập phone rộng hơn implementation.
- **Phần frontend phải làm / UI-UX:** Form yêu cầu email thật và username; label đăng nhập đúng; không tự sinh thông tin liên hệ.
- **API frontend đang sử dụng:** POST /api/auth/login; POST /api/auth/register; GET /api/auth/me.
- **API sau sửa:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của LoginPage, RegisterPage với dữ liệu đã xác nhận; Form yêu cầu email thật và username; label đăng nhập đúng; không tự sinh thông tin liên hệ.
- **Validation:** Email/password/fullName/phone validate độc lập; role luôn ROLE_USER. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-026 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Đăng ký cung cấp thông tin thật; thông báo trùng rõ; tài khoản cũ vẫn login username.

### Frontend Tests

- Cả form login/register yêu cầu email/username thật; validation, payload không sinh email giả; lỗi trùng/quyền và navigation.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-026; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Email hoa/thường, whitespace, trùng đồng thời, password độ dài UTF-8. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-027 — Quên và đặt lại mật khẩu

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** AUTH
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **Page cần sửa:** [LoginPage.jsx](frontend/src/pages/LoginPage.jsx); [App.jsx](frontend/src/App.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [authApi.js](frontend/src/api/authApi.js)
- **Hiện tại / Nguyên nhân:** Không có endpoint và luồng reset mật khẩu. Auth chỉ login/register/me.
- **Phần frontend phải làm / UI-UX:** Thêm form yêu cầu/reset bằng token; xử lý expired/used; không báo email tồn tại hay không.
- **API frontend đang sử dụng:** Chưa có forgot/reset endpoint; LoginPage chỉ login/register.
- **API sau sửa:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của LoginPage, App với dữ liệu đã xác nhận; Thêm form yêu cầu/reset bằng token; xử lý expired/used; không báo email tồn tại hay không.
- **Validation:** Rate limit, không log token, password hợp lệ; dùng lại token bị chặn. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-027 — phần backend cùng task; FIX-026; FIX-028; FIX-041
- **Dependency khác:** FIX-026, FIX-028, FIX-041
- **Acceptance Criteria:** Khách reset được bằng email thật; token cũ không tái sử dụng.

### Frontend Tests

- Form forgot/reset, token từ route, validation password, trạng thái gửi/chờ/lỗi token dùng lại/hết hạn; không tiết lộ email tồn tại.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-027; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Email không tồn tại, token hết hạn/dùng lại, resend, hai reset đồng thời. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-028 — Vòng đời phiên và Remember login

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** AUTH
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Security / BOTH; ESSENTIAL.
- **Page cần sửa:** [LoginPage.jsx](frontend/src/pages/LoginPage.jsx); [RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx); [ProfilePage.jsx](frontend/src/pages/ProfilePage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [AuthContext.jsx](frontend/src/context/AuthContext.jsx); [axiosClient.js](frontend/src/api/axiosClient.js)
- **Hiện tại / Nguyên nhân:** Logout chỉ xóa local; đổi mật khẩu không thu hồi JWT; rememberMe không ảnh hưởng lưu token. JWT 24 giờ không có cơ chế thu hồi; checkbox không nối context.
- **Phần frontend phải làm / UI-UX:** Nhớ đăng nhập dùng localStorage, không nhớ dùng sessionStorage; interceptor/context dùng cùng nơi; logout gọi backend và vẫn xóa local khi network lỗi kèm trạng thái rõ.
- **API frontend đang sử dụng:** POST /api/auth/login/register; GET /api/auth/me; PUT /api/users/change-password; logout hiện local.
- **API sau sửa:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của LoginPage, RegisterPage, ProfilePage với dữ liệu đã xác nhận; Nhớ đăng nhập dùng localStorage, không nhớ dùng sessionStorage; interceptor/context dùng cùng nơi; logout gọi backend và vẫn xóa local khi network lỗi kèm trạng thái rõ.
- **Validation:** JWT expiry, locked user, tokenVersion; logout all-session được mô tả rõ. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-028 — phần backend cùng task; FIX-001
- **Dependency khác:** FIX-001
- **Acceptance Criteria:** JWT cũ bị chặn sau đổi/reset/logout thành công; checkbox có tác dụng thật.

### Frontend Tests

- sessionStorage/localStorage theo remember, đồng bộ Context/interceptor, hai tab/reload/đóng mở,401 và logout offline không hứa thu hồi server.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-028; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Token bị sao chép, hai tab, reload, đóng/mở trình duyệt, logout offline. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-029 — Đồng bộ hồ sơ và trạng thái người dùng

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PROFILE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / UX / BOTH; RECOMMENDED.
- **Page cần sửa:** [ProfilePage.jsx](frontend/src/pages/ProfilePage.jsx)
- **Component cần sửa:** [Navbar.jsx](frontend/src/components/Navbar.jsx); [UserLayout.jsx](frontend/src/components/UserLayout.jsx)
- **Hook / Service / Tiện ích:** [AuthContext.jsx](frontend/src/context/AuthContext.jsx)
- **Hiện tại / Nguyên nhân:** Họ tên/phone lưu thật; dob/gender/avatar chưa lưu; AuthContext không cập nhật sau sửa tên. UI nhiều trường hơn DTO và thiếu cập nhật user context.
- **Phần frontend phải làm / UI-UX:** Cập nhật context từ response; trường chưa hỗ trợ phải disable rõ; avatar chỉ lưu sau upload thành công.
- **API frontend đang sử dụng:** GET/PUT /api/users/profile; PUT /api/users/change-password.
- **API sau sửa:** Nhóm PROFILE trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProfilePage với dữ liệu đã xác nhận; Cập nhật context từ response; trường chưa hỗ trợ phải disable rõ; avatar chỉ lưu sau upload thành công.
- **Validation:** Tên trim không rỗng, phone, DOB không tương lai; avatar chỉ URL tài sản được cấp. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-029 — phần backend cùng task; FIX-030
- **Dependency khác:** FIX-030
- **Acceptance Criteria:** Reload giữ giá trị đã lưu, Navbar và hồ sơ đồng nhất.

### Frontend Tests

- Form từng field/null, update AuthContext/Navbar từ response, upload lỗi không báo lưu avatar, reload và error state.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-029; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Update từng trường/null, lỗi API, reload, tài khoản khác. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-030 — Upload ảnh có xác thực và kiểm soát tài sản

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** UPLOAD
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **Page cần sửa:** [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ProfilePage.jsx](frontend/src/pages/ProfilePage.jsx); [ReturnRequestPage.jsx](frontend/src/pages/ReturnRequestPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [axiosClient.js](frontend/src/api/axiosClient.js)
- **Hiện tại / Nguyên nhân:** Chưa có upload endpoint/storage; giao diện ảnh profile/đổi trả không có luồng lưu file thật. Hiện lưu URL ảnh trong DB; nút chọn ảnh không đủ để upload.
- **Phần frontend phải làm / UI-UX:** Upload multipart riêng; preview, tiến độ/lỗi và URL response; không gửi path máy khách làm URL.
- **API frontend đang sử dụng:** Không có upload endpoint hiện tại; chỉ URL trong product/profile/return.
- **API sau sửa:** Nhóm UPLOAD trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminProductsPage, ProfilePage, ReturnRequestPage với dữ liệu đã xác nhận; Upload multipart riêng; preview, tiến độ/lỗi và URL response; không gửi path máy khách làm URL.
- **Validation:** JPEG/PNG/WebP tối đa5MiB đề xuất; sniff/decode, giới hạn pixel; cấm SVG/HTML; path traversal; owner và admin theo purpose. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-030 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** File giả MIME/quá lớn/path lạ bị từ chối; reload ảnh hợp lệ; không xóa ảnh còn dùng.

### Frontend Tests

- Preview, multipart không tự set boundary, progress/error, response URL; validation file UX không thay kiểm tra server, lỗi mạng giữ form.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-030; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Upload hợp lệ/đổi đuôi/quá lớn/ảnh lỗi/cross-owner; network fail. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-031 — Wishlist thực sự lưu và dùng lại

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** WISHLIST
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **Page cần sửa:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [App.jsx](frontend/src/App.jsx)
- **Component cần sửa:** [Navbar.jsx](frontend/src/components/Navbar.jsx); [ProductCard.jsx](frontend/src/components/ProductCard.jsx)
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Heart chỉ state cục bộ; chưa có danh sách/API/model wishlist. Chưa triển khai persistence.
- **Phần frontend phải làm / UI-UX:** Nối heart, trang danh sách; sang cart vẫn phải chọn variant và kiểm tra kho.
- **API frontend đang sử dụng:** Không có wishlist endpoint hiện tại.
- **API sau sửa:** Nhóm WISHLIST trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProductDetailPage, App với dữ liệu đã xác nhận; Nối heart, trang danh sách; sang cart vẫn phải chọn variant và kiểm tra kho.
- **Validation:** User lấy JWT; product tồn tại; không nhận userId client. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-031 — phần backend cùng task; FIX-007; FIX-022
- **Dependency khác:** FIX-007, FIX-022
- **Acceptance Criteria:** Reload/đăng nhập lại còn danh sách, không duplicate; sản phẩm ngừng bán được báo rõ.

### Frontend Tests

- Heart/list persistence qua API, thêm/xóa lặp ở UI, empty/error, chuyển sang cart yêu cầu variant và hiển thị sản phẩm ngừng bán.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-031; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Thêm lặp, hai user, xóa lặp, chuyển variant vào giỏ. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-032 — Search/filter/sort/pagination thống nhất server

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / BOTH; ESSENTIAL.
- **Page cần sửa:** [ProductsPage.jsx](frontend/src/pages/ProductsPage.jsx); [HomePage.jsx](frontend/src/pages/HomePage.jsx); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ComparePage.jsx](frontend/src/pages/ComparePage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [productApi.js](frontend/src/api/productApi.js)
- **Hiện tại / Nguyên nhân:** ProductsPage lấy toàn bộ rồi lọc/phân trang client; backend có paged mode nhưng size không trần, sortBy tự do; sale/inStock chưa hỗ trợ. Hai cách lọc khác nhau; danh mục/brand hardcode.
- **Phần frontend phải làm / UI-UX:** Cập nhật tất cả getProducts callers, URL sync, debounce và hủy kết quả cũ; phân trang không lọc lại riêng trang.
- **API frontend đang sử dụng:** GET /api/products (các page thường thiếu page/size); GET /api/categories.
- **API sau sửa:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProductsPage, HomePage, AdminProductsPage, ComparePage với dữ liệu đã xác nhận; Cập nhật tất cả getProducts callers, URL sync, debounce và hủy kết quả cũ; phân trang không lọc lại riêng trang.
- **Validation:** min<=max, query length, enum/filter allowlist; ID category thật. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-032 — phần backend cùng task; FIX-007; FIX-042
- **Dependency khác:** FIX-007, FIX-042
- **Acceptance Criteria:** Filter đúng trên toàn catalog; số lượng/trang khớp; sale=true có hiệu lực; không fetch toàn DB.

### Frontend Tests

- URL query/page/sort/filter, debounce/race response, back/forward, PageResponse và tổng/trang; không lọc toàn cục trên một trang.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-032; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Dataset lớn, size100/101, sort lạ, back/forward, tìm tiếng Việt, response race. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-034 — Trang chủ và liên kết khuyến mãi phản ánh catalog thật

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PRODUCT
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / BOTH; RECOMMENDED.
- **Page cần sửa:** [HomePage.jsx](frontend/src/pages/HomePage.jsx); [ProductsPage.jsx](frontend/src/pages/ProductsPage.jsx)
- **Component cần sửa:** [Navbar.jsx](frontend/src/components/Navbar.jsx)
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Bestseller/new dùng slice; link cước dùng slug không phải Long; sale=true không được xử lý. Banner/link/static ordering chưa nối dữ liệu kinh doanh.
- **Phần frontend phải làm / UI-UX:** Dùng query server, link id thực; nếu chưa có dữ liệu không gắn nhãn bán chạy giả.
- **API frontend đang sử dụng:** GET /api/products; GET /api/categories; sale là URL query UI chưa có backend filter.
- **API sau sửa:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của HomePage, ProductsPage với dữ liệu đã xác nhận; Dùng query server, link id thực; nếu chưa có dữ liệu không gắn nhãn bán chạy giả.
- **Validation:** Chỉ sản phẩm active; soldQuantity tính theo chính sách return được nêu rõ. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-034 — phần backend cùng task; FIX-032; FIX-045
- **Dependency khác:** FIX-032, FIX-045
- **Acceptance Criteria:** Banner không dẫn lỗi ID; bestseller đúng dữ liệu; newest không dựa phần tử đầu tùy ý.

### Frontend Tests

- Banner link ID thật, query bestseller/newest/sale, empty/error và rendering danh mục; không gắn nhãn giả khi response thiếu dữ liệu.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-034; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Đơn hoàn thành/hủy, sản phẩm mới, banner từng danh mục/sale. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-035 — Thông số/rating/ảnh không lấy số liệu minh họa làm thật

- **Implementation Status:** BLOCKED
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / UX / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [ShuttlecockDetailPage.jsx](frontend/src/pages/ShuttlecockDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Rating0 có fallback4.9; số bán/review, badge còn hàng, ảnh và nhiều thông số cố định cho mọi sản phẩm. Thiết kế demo còn nằm trong JSX live.
- **Phần frontend phải làm / UI-UX:** Hiện giá trị API; chưa có thì ghi chưa cập nhật/ẩn claim; giữ size guide chung với nhãn tham khảo; tồn kho theo variant.
- **API frontend đang sử dụng:** GET /api/products/{id}; GET /api/reviews/product/{productId}.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của ProductDetailPage, RacketGripDetailPage, StringDetailPage, ShuttlecockDetailPage, SweatbandDetailPage với dữ liệu đã xác nhận; Hiện giá trị API; chưa có thì ghi chưa cập nhật/ẩn claim; giữ size guide chung với nhãn tham khảo; tồn kho theo variant.
- **Validation:** Không biến 0 thành fallback; tránh khẳng định chứng nhận/bảo hành khi thiếu dữ liệu. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Không thêm request chỉ để sửa hiển thị; giữ loader đang có nếu page tải dữ liệu.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** FIX-021; FIX-007
- **Dependency khác:** FIX-021, FIX-007
- **Acceptance Criteria:** Sản phẩm chưa có đánh giá hiển thị đúng 0; ảnh và thông số không mượn từ sản phẩm khác.

### Frontend Tests

- **Cách test:** Mẫu rỗng/0/hết hàng, nhiều category; kiểm tra mọi tab. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### FIX-036 — Dashboard lấy thống kê thật theo khoảng thời gian

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** DASHBOARD
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / BOTH; ESSENTIAL.
- **Page cần sửa:** [AdminDashboardPage.jsx](frontend/src/pages/AdminDashboardPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [adminApi.js](frontend/src/api/adminApi.js)
- **Hiện tại / Nguyên nhân:** Backend có totals/dailyRevenue; FE chart/topProducts mảng rỗng, timeRange không gửi; ngày/thời gian hiển thị cố định. Chưa nối chart với response; doanh thu ngày đang dùng order.createdAt.
- **Phần frontend phải làm / UI-UX:** Kết nối dailyRevenue/topProducts/totalProducts; bỏ timestamp demo; hiển thị empty khác error.
- **API frontend đang sử dụng:** GET /api/admin/dashboard; chưa gửi timeRange và chưa dùng dailyRevenue.
- **API sau sửa:** Nhóm DASHBOARD trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminDashboardPage với dữ liệu đã xác nhận; Kết nối dailyRevenue/topProducts/totalProducts; bỏ timestamp demo; hiển thị empty khác error.
- **Validation:** Admin; range hữu hạn và timezone Asia/Ho_Chi_Minh; không tính COD pending vào doanh thu. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-036 — phần backend cùng task; FIX-003; FIX-039
- **Dependency khác:** FIX-003, FIX-039
- **Acceptance Criteria:** Số KPI/chart cùng kỳ khớp giao dịch; không giả inventory alert từ pendingOrders.

### Frontend Tests

- Payload from/to/groupBy, mapping KPI/chart/bucket/timezone, đổi ngày/tháng, empty/error và nhãn gross/refund/net đúng.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-036; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Đơn tạo hôm trước trả hôm sau, COD chưa thu, refund, đổi ngày/tháng. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-037 — Quản trị danh mục và thương hiệu tối thiểu

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** CATEGORY
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **Page cần sửa:** [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx)
- **Component cần sửa:** [AdminLayout.jsx](frontend/src/components/AdminLayout.jsx)
- **Hook / Service / Tiện ích:** [productApi.js](frontend/src/api/productApi.js)
- **Hiện tại / Nguyên nhân:** Category CRUD backend có nhưng không có admin UI; brand là chuỗi với bộ lọc hardcode, chưa có quản trị riêng. Chưa nối endpoint có sẵn; thiếu nguồn danh sách brand thống nhất.
- **Phần frontend phải làm / UI-UX:** Thêm quản lý category trong khu vực admin; dropdown brand từ API và nhập chuẩn khi tạo product.
- **API frontend đang sử dụng:** GET /api/categories; POST/PUT/DELETE category đã có backend nhưng chưa có admin UI; chưa có /products/brands.
- **API sau sửa:** Nhóm CATEGORY trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminProductsPage với dữ liệu đã xác nhận; Thêm quản lý category trong khu vực admin; dropdown brand từ API và nhập chuẩn khi tạo product.
- **Validation:** Admin write; không xóa category đang dùng; trim tên, chặn trùng. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-037 — phần backend cùng task; FIX-022
- **Dependency khác:** FIX-022
- **Acceptance Criteria:** Admin tạo/sửa category rồi dùng ngay; brand mới xuất hiện trong filter.

### Frontend Tests

- Form category/brand, payload CRUD và distinct brand, lỗi duplicate/FK/quyền; dropdown đồng bộ sau lưu.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-037; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Category trùng/đang dùng/không tồn tại; brand khác hoa/thường. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-038 — Lịch sử nhập/điều chỉnh tồn kho

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** INVENTORY
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Missing Feature / BOTH; RECOMMENDED.
- **Page cần sửa:** [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [adminApi.js](frontend/src/api/adminApi.js)
- **Hiện tại / Nguyên nhân:** Admin ghi đè stock có expectedStock nhưng chưa có inventory ledger/phiếu nhập/lý do điều chỉnh. Chưa có lịch sử truy vết thay đổi kho.
- **Phần frontend phải làm / UI-UX:** Form nhập/điều chỉnh, kho khả dụng và đang giữ; conflict yêu cầu tải lại.
- **API frontend đang sử dụng:** PUT /api/products/{id} với stock/expectedStock; chưa có ledger endpoint.
- **API sau sửa:** Nhóm INVENTORY trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminProductsPage với dữ liệu đã xác nhận; Form nhập/điều chỉnh, kho khả dụng và đang giữ; conflict yêu cầu tải lại.
- **Validation:** Admin; không âm/tràn số; không giảm reserved bằng form sửa sản phẩm. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-038 — phần backend cùng task; FIX-007; FIX-055
- **Dependency khác:** FIX-007, FIX-055
- **Acceptance Criteria:** Mọi thay đổi kho có nguồn; replay không nhập hai lần; stock tổng cân đối.

### Frontend Tests

- Form delta/lý do/expectedStock, history rendering và conflict yêu cầu tải lại; không cho UI sửa reserved.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-038; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Nhập kho, điều chỉnh âm, conflict, hủy/hoàn tiền và reserved không bị ghi đè. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-039 — Phân biệt thanh toán, giao hàng và lịch sử trạng thái

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ORDER
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **Page cần sửa:** [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [formatters.js](frontend/src/utils/formatters.js)
- **Hiện tại / Nguyên nhân:** Một enum OrderStatus gộp paid và shipping; chưa lưu thu COD riêng hoặc shipment/tracking/timestamp chuyển trạng thái. Chưa có paymentStatus và history dù UI có timeline.
- **Phần frontend phải làm / UI-UX:** Hiện payment và delivery riêng; timeline chỉ event thật; admin nhập tracking tùy chọn và xác nhận thu COD có kiểm soát.
- **API frontend đang sử dụng:** GET /api/orders/{id}, /my-orders, /all; PUT /api/orders/{id}/status?status=...; POST /api/orders/{id}/cancel.
- **API sau sửa:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của MyOrdersPage, OrderDetailPage, AdminOrdersPage với dữ liệu đã xác nhận; Hiện payment và delivery riêng; timeline chỉ event thật; admin nhập tracking tùy chọn và xác nhận thu COD có kiểm soát.
- **Validation:** Admin-only chuyển trạng thái, owner đọc; không cho COMPLETED→PENDING hoặc dùng status API để ép PayOS PAID. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-039 — phần backend cùng task; FIX-003; FIX-020
- **Dependency khác:** FIX-003, FIX-020
- **Acceptance Criteria:** Trạng thái rõ cả COD/PayOS, không chuyển lùi; mỗi lần chuyển có timestamp/actor.

### Frontend Tests

- Hiển thị payment/shipping riêng, timeline thật, hành động hợp lệ, tracking/COD payload, repeat click và lỗi409 giữ trạng thái.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-039; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Ma trận trạng thái, gọi lặp, concurrent cancel/webhook, COD giao nhưng chưa thu. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-040 — Mua lại đơn có kiểm tra catalog hiện tại

- **Implementation Status:** BLOCKED
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Low / Missing Feature / FRONTEND; RECOMMENDED.
- **Page cần sửa:** [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [CartContext.jsx](frontend/src/context/CartContext.jsx); [productApi.js](frontend/src/api/productApi.js)
- **Hiện tại / Nguyên nhân:** Nút mua lại chủ yếu dẫn catalog, chưa khôi phục các dòng mua được. Chưa có handler kiểm tra từng sản phẩm/variant.
- **Phần frontend phải làm / UI-UX:** Đọc items của đơn, fetch sản phẩm hiện tại, thêm dòng còn bán; báo dòng hết hàng/đổi giá và yêu cầu chọn lại biến thể cũ thiếu mapping.
- **API frontend đang sử dụng:** GET /api/orders/my-orders; GET /api/orders/{id}; GET /api/products/{id} có thể dùng cho mua lại.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của MyOrdersPage, OrderDetailPage với dữ liệu đã xác nhận; Đọc items của đơn, fetch sản phẩm hiện tại, thêm dòng còn bán; báo dòng hết hàng/đổi giá và yêu cầu chọn lại biến thể cũ thiếu mapping.
- **Validation:** Dùng giá/kho mới, không dùng snapshot đơn cũ để định giá. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** FIX-006; FIX-007; FIX-020
- **Dependency khác:** FIX-006, FIX-007, FIX-009, FIX-020
- **Acceptance Criteria:** Mua lại giữ lựa chọn hợp lệ, báo rõ các dòng không mua được.

### Frontend Tests

- **Cách test:** Đơn nhiều dòng, product ngừng bán, thiếu stock, variant xóa. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### FIX-042 — Lỗi API và validation có contract nhất quán

- **Implementation Status:** BLOCKED
- **Contract Status:** APPROVED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ERROR
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Validation / BOTH; ESSENTIAL.
- **Page cần sửa:** [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ShippingAddressPage.jsx](frontend/src/pages/ShippingAddressPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [axiosClient.js](frontend/src/api/axiosClient.js)
- **Hiện tại / Nguyên nhân:** Error response khác nhau; enum/query/JSON sai và FK duplicate có thể rơi generic500; validation phone/length chưa thống nhất. Handler tổng quát, DTO thiếu ràng buộc tương ứng column.
- **Phần frontend phải làm / UI-UX:** Hiện errors theo field, message fallback; phân biệt 401/403/404/409/429/500; không swallow thành empty/success.
- **API frontend đang sử dụng:** axiosClient và các wrapper hiện có dưới frontend/src/api; toàn bộ API lỗi cần tương thích.
- **API sau sửa:** Nhóm ERROR trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của CheckoutPage, AdminProductsPage, ShippingAddressPage với dữ liệu đã xác nhận; Hiện errors theo field, message fallback; phân biệt 401/403/404/409/429/500; không swallow thành empty/success.
- **Validation:** Validation độc lập backend, trim/sanitize xong kiểm tra lại; không trả SQL/stacktrace. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-042 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Đầu vào lỗi nhận status/mã đúng; UI giữ dữ liệu form và không báo thành công.

### Frontend Tests

- Xử lý401/403/404/409/429/500 và network error, field errors, form/giỏ giữ nguyên; không chuyển lỗi thành empty/success.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-042; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** JSON lỗi, enum lạ, số âm/quá dài, duplicate, FK, network và quyền. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-043 — Giới hạn lạm dụng auth, AI và API tốn tài nguyên

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** ERROR
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Security / BOTH; ESSENTIAL.
- **Page cần sửa:** [LoginPage.jsx](frontend/src/pages/LoginPage.jsx); [RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx)
- **Component cần sửa:** [AiChatbotWidget.jsx](frontend/src/components/AiChatbotWidget.jsx)
- **Hook / Service / Tiện ích:** [axiosClient.js](frontend/src/api/axiosClient.js)
- **Hiện tại / Nguyên nhân:** Không thấy rate limit auth/AI; AI public có thể tạo chi phí và chat log không giới hạn. Chưa có quota/message bound/timeouts.
- **Phần frontend phải làm / UI-UX:** Hiển thị cooldown Retry-After, giữ nội dung khi lỗi; disable gửi trùng.
- **API frontend đang sử dụng:** POST /api/ai-chat; POST /api/auth/login/register.
- **API sau sửa:** Nhóm ERROR trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của LoginPage, RegisterPage với dữ liệu đã xác nhận; Hiển thị cooldown Retry-After, giữ nội dung khi lỗi; disable gửi trùng.
- **Validation:** 429 chuẩn, không log password/token; xác minh proxy IP từ cấu hình đáng tin. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-043 — phần backend cùng task; FIX-042
- **Dependency khác:** FIX-042
- **Acceptance Criteria:** Spam bị hạn chế có kiểm soát, request thường vẫn hoạt động.

### Frontend Tests

- Cooldown Retry-After, disable gửi trùng, giới hạn message UX, giữ nội dung khi429/timeout và hiển thị fallback đúng.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-043; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Burst login/register/AI, timeout Gemini, response quá lớn. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-044 — Cấu hình môi trường và quy trình triển khai an toàn

- **Implementation Status:** BLOCKED
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract:** NO API CONTRACT CHANGE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Security / BOTH; ESSENTIAL.
- **Page cần sửa:** Không có page riêng; tích hợp qua component/context bên dưới.
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [axiosClient.js](frontend/src/api/axiosClient.js)
- **Hiện tại / Nguyên nhân:** DB root/local và ddl-auto:update/sql init always; API localhost hardcode; .env.example thiếu JWT_SECRET; không thấy loader .env. Cấu hình local chưa tách rõ vận hành; file .env không tự được Spring đọc.
- **Phần frontend phải làm / UI-UX:** Giữ localhost cho dev; đưa base URL theo môi trường build khi triển khai được duyệt, không đưa secret vào VITE_*.
- **API frontend đang sử dụng:** axiosClient baseURL http://localhost:8080/api; không đổi endpoint/resource.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của context/component với dữ liệu đã xác nhận; Giữ localhost cho dev; đưa base URL theo môi trường build khi triển khai được duyệt, không đưa secret vào VITE_*.
- **Validation:** Secret không fallback, mock/dev seed tắt production, CORS domain thật/HTTPS; kiểm tra CI secret exposure. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-044 — phần backend cùng task; FIX-001
- **Dependency khác:** FIX-001
- **Acceptance Criteria:** Môi trường test và production tách; không tự update schema thật khi khởi động.

### Frontend Tests

- Đối chiếu baseURL theo môi trường đã được duyệt, request URL/Bearer và xử lý CORS/network error trên browser; không đưa secret vào frontend.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-044; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Kiểm tra cấu hình thiếu biến, build URL, CORS allowed/disallowed, backup restore staging. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-046 — Bổ sung kiểm thử tích hợp và E2E còn thiếu

- **Implementation Status:** BLOCKED
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract:** NO API CONTRACT CHANGE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** High / Missing Feature / BOTH; ESSENTIAL.
- **Page cần sửa:** [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [QRPaymentPage.jsx](frontend/src/pages/QRPaymentPage.jsx); [App.jsx](frontend/src/App.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [CartContext.jsx](frontend/src/context/CartContext.jsx)
- **Hiện tại / Nguyên nhân:** Hiện có4 test files:56 @Test,8 @FuzzTest,12 @ParameterizedTest; chưa thấy MySQL integration/FE/E2E. Các con số là annotation, không phải số test đã chạy. Mock repository không chứng minh lock/rollback thật; chưa có kiểm thử trình duyệt.
- **Phần frontend phải làm / UI-UX:** Kiểm tra route smoke, cart options, COD, thanh toán retry/return, address, review, admin và responsive; chỉ thêm test stack khi được duyệt.
- **API frontend đang sử dụng:** Toàn bộ52 API hiện tại và các API được duyệt sau sửa; không thêm endpoint vì mục đích test.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của CheckoutPage, QRPaymentPage, App với dữ liệu đã xác nhận; Kiểm tra route smoke, cart options, COD, thanh toán retry/return, address, review, admin và responsive; chỉ thêm test stack khi được duyệt.
- **Validation:** AAA JUnit5; Jazzer kiểm tra invariant thật; không suy coverage từ tên file. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-046 — phần backend cùng task; FIX-018; FIX-017; FIX-002
- **Dependency khác:** FIX-018, FIX-017, FIX-002
- **Acceptance Criteria:** Các flow tiền/kho/quyền chạy qua; không tuyên bố pass nếu chưa chạy.

### Frontend Tests

- Route smoke, form/state/cart/checkout/payment return/retry, API payload/error/permissions UI và viewport360/768/1440; không tự kiểm tra transaction DB.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-046; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Hai người mua cuối, callback lặp, rollback nửa chừng, idempotency, IDOR, lỗi mạng và viewport360/768/1440. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-047 — Khả năng phục hồi UI và dữ liệu so sánh

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Dependency chưa DONE: FIX-009.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / UX / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [App.jsx](frontend/src/App.jsx); [ComparePage.jsx](frontend/src/pages/ComparePage.jsx)
- **Component cần sửa:** [RacketComparisonBar.jsx](frontend/src/components/RacketComparisonBar.jsx); [ProductCard.jsx](frontend/src/components/ProductCard.jsx)
- **Hook / Service / Tiện ích:** [CompareContext.jsx](frontend/src/context/CompareContext.jsx)
- **Hiện tại / Nguyên nhân:** Không có ErrorBoundary; fallback route về home che link hỏng; compare dùng snapshot local và readCart/storage có tình huống lỗi; API comparison có nhưng chưa dùng. Thiếu kiểm tra kiểu LocalStorage và trạng thái lỗi rõ.
- **Phần frontend phải làm / UI-UX:** Thêm boundary và trang404 trong cấu trúc được duyệt; validate array localStorage; compare gọi API hiện có, tối đa3; storage lỗi không làm crash app.
- **API frontend đang sử dụng:** GET /api/products; GET /api/comparison?ids=1,2 có wrapper nhưng ComparePage đang dùng snapshots.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của App, ComparePage với dữ liệu đã xác nhận; Thêm boundary và trang404 trong cấu trúc được duyệt; validate array localStorage; compare gọi API hiện có, tối đa3; storage lỗi không làm crash app.
- **Validation:** Không dùng snapshot compare để bỏ qua chọn variant; xử lý clipboard promise lỗi. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** FIX-009
- **Acceptance Criteria:** Storage JSON hợp lệ nhưng sai kiểu không crash; comparison hiện giá/thông số mới; lỗi có retry.

### Frontend Tests

- **Cách test:** LocalStorage={} hoặc quota exceeded, route lạ, API404/500, keyboard/modal/mobile. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-048 — Nút chưa tích hợp và nội dung chính sách minh bạch

- **Implementation Status:** TODO
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Chưa có nội dung chính sách/bảo hành/size guide được shop duyệt; xem Planning Issues Detected.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Low / UX / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [AdminSettingsPage.jsx](frontend/src/pages/AdminSettingsPage.jsx); [AdminCustomersPage.jsx](frontend/src/pages/AdminCustomersPage.jsx); [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [AdminPaymentsPage.jsx](frontend/src/pages/AdminPaymentsPage.jsx); [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx)
- **Component cần sửa:** [AdminLayout.jsx](frontend/src/components/AdminLayout.jsx); [Footer.jsx](frontend/src/components/Footer.jsx); [UserLayout.jsx](frontend/src/components/UserLayout.jsx)
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Settings/newsletter/social login/export/reply/ẩn review/toolbar và hội viên chưa tích hợp; một số có thông báo rõ, một số chỉ alert hoặc không handler. Thiết kế có chức năng vượt backend; tier từ role và dữ liệu minh họa.
- **Phần frontend phải làm / UI-UX:** Lập danh sách nút; giữ thông báo chưa hỗ trợ đúng sự thật; disable hành động chưa có; hoàn thiện link chính sách, bảo hành/size guide bằng nội dung shop duyệt. Không mở rộng CMS.
- **API frontend đang sử dụng:** Các nút được nêu chưa gọi API riêng; API đã có của page tiếp tục dùng, không tạo dummy request.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminSettingsPage, AdminCustomersPage, AdminReviewsPage, AdminPaymentsPage, MyOrdersPage với dữ liệu đã xác nhận; Lập danh sách nút; giữ thông báo chưa hỗ trợ đúng sự thật; disable hành động chưa có; hoàn thiện link chính sách, bảo hành/size guide bằng nội dung shop duyệt. Không mở rộng CMS.
- **Validation:** Không cho nhập secret vào settings chưa lưu; không giả hóa đơn/role thành VIP. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Không thêm request chỉ để sửa hiển thị; giữ loader đang có nếu page tải dữ liệu.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** Không.
- **Acceptance Criteria:** Mọi nút hoặc hoạt động thật hoặc nêu rõ chưa hỗ trợ; không báo đã xuất/gửi khi không có.

### Frontend Tests

- **Cách test:** Click toàn bộ toolbar/footer/settings/export/loyalty; kiểm tra keyboard và mobile. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-049 — Backlog tùy chọn không chặn bán hàng

- **Implementation Status:** BLOCKED
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. OPTIONAL chưa được chọn cho release.
- **API Contract:** NO API CONTRACT CHANGE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Low / Missing Feature / BOTH; OPTIONAL.
- **Page cần sửa:** [HomePage.jsx](frontend/src/pages/HomePage.jsx)
- **Component cần sửa:** [UserLayout.jsx](frontend/src/components/UserLayout.jsx)
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Chưa có recently viewed, flash sale theo thời gian, banner CMS, loyalty, STAFF, cart đa thiết bị, combo engine và tích hợp hãng vận chuyển. Chưa nằm trong phạm vi bán hàng tối thiểu.
- **Phần frontend phải làm / UI-UX:** Recently viewed có thể dùng local; còn lại không giả dữ liệu. Không cần tạo UI mới trong đợt sửa thiết yếu.
- **API frontend đang sử dụng:** Không có API mới được chốt; NO API CONTRACT CHANGE trong giai đoạn này.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của HomePage với dữ liệu đã xác nhận; Recently viewed có thể dùng local; còn lại không giả dữ liệu. Không cần tạo UI mới trong đợt sửa thiết yếu.
- **Validation:** STAFF phải có ma trận quyền nếu chọn; flash sale/combo phải tính giá server. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Không thêm request chỉ để sửa hiển thị; giữ loader đang có nếu page tải dữ liệu.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. Backlog không làm UI mới trong giai đoạn này.
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-049 — phần backend cùng task
- **Dependency khác:** Không.
- **Acceptance Criteria:** Backlog được ghi OPTIONAL và không bị hiểu là task bắt buộc hay đã triển khai.

### Frontend Tests

- Chưa có tính năng OPTIONAL được chọn; không tạo UI/test network giả. Khi được chọn, chốt tiêu chí frontend riêng trước implementation.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-049; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Khi chọn từng tính năng phải bổ sung acceptance/contract riêng trước code. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-050 — Phân tách giỏ khách và giỏ theo tài khoản trên thiết bị

- **Implementation Status:** BLOCKED
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / UX / FRONTEND; RECOMMENDED.
- **Page cần sửa:** [CartPage.jsx](frontend/src/pages/CartPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [CartContext.jsx](frontend/src/context/CartContext.jsx); [AuthContext.jsx](frontend/src/context/AuthContext.jsx)
- **Hiện tại / Nguyên nhân:** badminton_cart dùng chung mọi tài khoản trên trình duyệt; nút đồng bộ chỉ alert; không có giỏ server. Không namespace user hoặc chính sách merge guest.
- **Phần frontend phải làm / UI-UX:** Giữ LocalStorage giai đoạn đầu: namespace theo user, merge guest có xác nhận và kiểm tra lại variant; nút làm mới fetch catalog/quote thật.
- **API frontend đang sử dụng:** Giỏ hiện local; làm mới có thể dùng GET /api/products/{id}, POST /api/orders/quote sau FIX-017.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của CartPage với dữ liệu đã xác nhận; Giữ LocalStorage giai đoạn đầu: namespace theo user, merge guest có xác nhận và kiểm tra lại variant; nút làm mới fetch catalog/quote thật.
- **Validation:** Không mất guest cart khi login lỗi; không lẫn selection của tài khoản khác. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** FIX-006; FIX-017
- **Dependency khác:** FIX-006, FIX-009, FIX-017
- **Acceptance Criteria:** Đăng xuất/đổi tài khoản không lẫn giỏ; reload và merge không duplicate.

### Frontend Tests

- **Cách test:** Guest→login A→logout→login B, cart cũ, thiếu kho khi merge. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### FIX-051 — Nối API quản trị xóa review đã có

- **Implementation Status:** READY
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** ESSENTIAL, frontend-only; không có dependency bắt buộc; dùng API hiện hữu/NO_CHANGE; file và tiêu chí đã rõ.
- **API Contract:** NO API CONTRACT CHANGE


- **Mức độ / Loại / Phạm vi gốc:** Medium / Integration / FRONTEND; ESSENTIAL.
- **Page cần sửa:** [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [adminApi.js](frontend/src/api/adminApi.js)
- **Hiện tại / Nguyên nhân:** Backend DELETE /admin/reviews/{id} và wrapper có nhưng UI chưa sử dụng; hide/reply chưa có API. Giao diện moderation chưa nối tác vụ thật.
- **Phần frontend phải làm / UI-UX:** Thêm thao tác xóa có xác nhận dùng API có sẵn; cập nhật danh sách từ kết quả; giữ hide/reply chưa hỗ trợ rõ, không giả lưu.
- **API frontend đang sử dụng:** GET /api/admin/reviews; DELETE /api/admin/reviews/{id} có wrapper, UI chưa gọi.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminReviewsPage với dữ liệu đã xác nhận; Thêm thao tác xóa có xác nhận dùng API có sẵn; cập nhật danh sách từ kết quả; giữ hide/reply chưa hỗ trợ rõ, không giả lưu.
- **Validation:** Chỉ admin; xử lý 403/404; không dùng API admin cho khách tự xóa. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; giữ bố cục hiện có, kiểm tra thao tác và thông báo.
- **Backend Dependency:** Không có task backend bắt buộc; dùng contract hiện hữu.
- **Dependency khác:** Không.
- **Acceptance Criteria:** Xóa review thực sự biến mất sau reload; lỗi giữ dữ liệu.

### Frontend Tests

- **Cách test:** Admin/customer token, cancel confirmation, DELETE204/403/404/500. Kiểm tra thêm lỗi mạng và viewport liên quan.

- Chỉ kiểm tra network/response nếu thao tác dùng API hiện hữu; không tạo request hoặc API giả để có test. Quyền API server do backend/reviewer xác minh; frontend kiểm tra quyền UI và xử lý response.

### Backend Readiness Rule

- Theo dependency gốc, task này không chờ backend mới. Đọc FRONTEND_STATUS và blocker trong FIX_TRACKER.csv; Readiness Assessment ở đây chỉ là snapshot: chỉ READY khi ESSENTIAL, dependency khác đã đáp ứng và không còn quyết định bắt buộc; không suy ra READY chỉ vì không chờ backend.
- Nếu dùng API hiện hữu, đối chiếu contract và response thực trước nghiệm thu; không tự giả định có API mới.
- Không tự thêm Backend Dependency, sửa backend hoặc thay API contract. Quy tắc BLOCKED/IMPLEMENTED ở đầu tài liệu chỉ áp dụng khi có dependency/contract mới được xác định và thống nhất, không tự tạo điều kiện mới cho task này.

### FIX-052 — Phân trang các danh sách quản trị và tài khoản

- **Implementation Status:** BLOCKED
- **Contract Status:** PROPOSED
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp. RECOMMENDED chưa được chọn cho release.
- **API Contract Source:** `docs/fix/API_CHANGES.md`
- **API Contract Group:** PAGING
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Performance / BOTH; RECOMMENDED.
- **Page cần sửa:** [AdminCustomersPage.jsx](frontend/src/pages/AdminCustomersPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx); [AdminPaymentsPage.jsx](frontend/src/pages/AdminPaymentsPage.jsx); [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [AdminVouchersPage.jsx](frontend/src/pages/AdminVouchersPage.jsx); [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [ReturnRequestPage.jsx](frontend/src/pages/ReturnRequestPage.jsx); [ReviewedProductsPage.jsx](frontend/src/pages/ReviewedProductsPage.jsx)
- **Component cần sửa:** Component page ở trên và form/bảng con trong cùng file; chưa yêu cầu tách file mới.
- **Hook / Service / Tiện ích:** [adminApi.js](frontend/src/api/adminApi.js)
- **Hiện tại / Nguyên nhân:** Phần lớn list trả findAll rồi sort/filter in-memory; bảng FE tải toàn bộ. Chưa có bounded pageable/search server; payment controller query repository trực tiếp.
- **Phần frontend phải làm / UI-UX:** Các bảng gửi page/size/query/status, đọc PageResponse, reset page khi filter, không lọc cục bộ toàn cục giả.
- **API frontend đang sử dụng:** GET list /api/admin/users,/orders/all,/admin/payments,/admin/reviews,/admin/vouchers,/orders/my-orders,/returns/all,/returns/my-returns,/reviews/my-reviews.
- **API sau sửa:** Nhóm PAGING trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **State cần thay đổi:** Đồng bộ state hiển thị/form của AdminCustomersPage, AdminOrdersPage, AdminPaymentsPage, AdminReviewsPage, AdminVouchersPage, MyOrdersPage, ReturnRequestPage, ReviewedProductsPage với dữ liệu đã xác nhận; Các bảng gửi page/size/query/status, đọc PageResponse, reset page khi filter, không lọc cục bộ toàn cục giả.
- **Validation:** Page0,size1..100; auth/owner, sort allowlist; không trả PII cho public. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-052 — phần backend cùng task; FIX-042
- **Dependency khác:** FIX-042
- **Acceptance Criteria:** Mỗi bảng dùng đúng total; không tải toàn bộ để lọc; auth không đổi.

### Frontend Tests

- Payload page/size/query/status, reset page khi filter, xử lý page cuối rỗng sau xóa,403/race response và bảng responsive.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-052; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Dataset nhiều trang, empty cuối trang sau xóa, filter status, 403, race response. Kiểm tra thêm lỗi mạng và viewport liên quan.

### FIX-053 — AI chỉ đề xuất sản phẩm phù hợp đang bán

- **Implementation Status:** BLOCKED
- **Contract Status:** NO_CHANGE
- **Verification Status:** NOT_RUN
- **Readiness Assessment (02/10/2026):** Backend Dependency bên dưới chưa DONE; contract mới cần IMPLEMENTED/VERIFIED trước tích hợp.
- **API Contract:** NO API CONTRACT CHANGE
- **Cross-stack Verification Status:** NOT_RUN


- **Mức độ / Loại / Phạm vi gốc:** Medium / Bug / BOTH; ESSENTIAL.
- **Page cần sửa:** Không có page riêng; tích hợp qua component/context bên dưới.
- **Component cần sửa:** [AiChatbotWidget.jsx](frontend/src/components/AiChatbotWidget.jsx)
- **Hook / Service / Tiện ích:** useState/useEffect và API wrapper hiện có của page; thêm wrapper chỉ khi contract yêu cầu.
- **Hiện tại / Nguyên nhân:** Khi hết hàng service fallback findAll nhưng prompt vẫn nói stock>0; IDs từ model không giới hạn tập dữ liệu; không giới hạn số truy vấn enrichment. Prompt được dùng như lớp kiểm soát chính.
- **Phần frontend phải làm / UI-UX:** Hiển thị tình trạng thật và fallback không có hàng; thêm giỏ phải đi chọn variant; báo lỗi tư vấn riêng.
- **API frontend đang sử dụng:** POST /api/ai-chat; addToCart hiện local.
- **API sau sửa:** NO API CONTRACT CHANGE.
- **State cần thay đổi:** Đồng bộ state hiển thị/form của context/component với dữ liệu đã xác nhận; Hiển thị tình trạng thật và fallback không có hàng; thêm giỏ phải đi chọn variant; báo lỗi tư vấn riêng.
- **Validation:** Model output không quyết định giá/kho; không thực thi tool từ output; reply render text an toàn. FE hỗ trợ người dùng; backend vẫn kiểm tra độc lập.
- **Loading state:** Tách tải ban đầu và submitting theo thao tác; khóa gửi lặp, xử lý kết quả request cũ; không xóa form/giỏ khi đang chờ.
- **Error / Empty state:** Hiển thị lỗi và nút thử lại tại vùng thao tác; phân biệt không có dữ liệu với tải thất bại; không mock response hoặc báo thành công trong catch. 
- **Responsive:** Áp dụng tiêu chí360/768/1440 ở đầu tài liệu cho vùng thay đổi; đảm bảo form/bảng/chi tiết không mất field khi viewport nhỏ.
- **Backend Dependency:** FIX-053 — phần backend cùng task; FIX-007; FIX-043
- **Dependency khác:** FIX-007, FIX-043
- **Acceptance Criteria:** Hết kho không được mô tả là có sẵn; ID ngoài catalog không hiện; timeout có fallback.

### Frontend Tests

- Render recommendation/fallback/error từ API, kho0 và thao tác thêm giỏ phải chọn variant; response lỗi không giả trạng thái có hàng.
- Kiểm tra loading/error/empty và responsive theo yêu cầu gốc ở vùng UI thay đổi; không tự chạy kiểm thử DB/concurrency/transaction.

- **Giới hạn trách nhiệm:** Antigravity chỉ triển khai/kiểm thử frontend. Backend theo [BACKEND_FIX_PLAN.md](docs/fix/BACKEND_FIX_PLAN.md), giữ nguyên FIX-053; không tự sửa server hoặc database.

### Backend Readiness Rule

- Nếu dependency backend chưa `DONE` → Implementation Status của frontend là `BLOCKED`.
- Nếu API contract mới chưa `IMPLEMENTED` hoặc `VERIFIED` → không tích hợp API mới. Với `NO_CHANGE`, kiểm tra API/dependency đang dùng thay vì tạo yêu cầu API mới.
- Có thể chuẩn bị UI độc lập chỉ khi không tạo dữ liệu giả hoặc trạng thái thành công giả; không nâng trạng thái integration vì UI đã render.
- Không tự sửa backend.
- Không tự thay API contract.

### Cross-stack Verification

- **Thời điểm / người thực hiện:** Codex reviewer kiểm tra sau khi backend và frontend hoàn thành phần tương ứng, local tests pass và contract mới đã IMPLEMENTED (hoặc contract hiện hữu NO_CHANGE đã được đối chiếu). Chưa chạy: NOT_RUN.
- **Luồng đối chiếu:** Frontend request → Controller → Service → Database (nếu có persistence) → response → Frontend rendering/state. Với cấu hình/backlog, chỉ kiểm tra phần luồng thực sự áp dụng; không tạo API mới cho việc xác minh.
- **Kịch bản gốc được giữ nguyên dưới đây:** backend cung cấp bằng chứng service/DB/transaction/concurrency/security; frontend cung cấp bằng chứng UI/payload/navigation/responsive; reviewer đối chiếu tích hợp. Không giao các kiểm tra DB cho frontend hoặc responsive cho backend.
- **Cách test:** Model trả ID lạ/1000 ID/JSON lỗi, prompt injection, kho0. Kiểm tra thêm lỗi mạng và viewport liên quan.

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


