# KẾ HOẠCH TỔNG THỂ KHẮC PHỤC BADMINTON SHOP

> **Source of truth:** `docs/fix/FIX_TRACKER.csv` là SOURCE OF TRUTH DUY NHẤT cho trạng thái thực thi hiện tại: backend/frontend status và verification, contract, cross-stack, overall, blocker, requested, agent, evidence, commit, last action và last updated. Trạng thái implementation, verification và contract hiện tại chỉ được đọc và ghi tại CSV. Các status/Readiness Assessment trong `.md` chỉ là **PLANNING / READINESS SNAPSHOT**, không dùng để quyết định quyền triển khai hoặc báo tiến độ. Không cập nhật status trong `.md` sau mỗi FIX; chỉ sửa specification khi thay đổi requirement, dependency, acceptance criteria, scope, API contract hoặc quyết định kiến trúc.

MASTER là specification về danh sách/tên FIX, severity, scope, requirement, dependency graph, business problem, acceptance criteria tổng thể, roadmap/priorities và planning issues. Không xác định tiến độ bằng status trong MASTER; khi báo tiến độ phải đọc FIX_TRACKER.csv.

# Giai đoạn hiện tại

Audit/Planning ban đầu đã hoàn thành. Các câu “chưa implement”, “không sửa code”, “không tạo implementation” trong lịch sử tài liệu mô tả thời điểm tạo kế hoạch; không còn là lệnh cấm toàn cục đối với giai đoạn IMPLEMENTATION. Tại thời điểm audit chưa có implementation cho các FIX được đề xuất; readiness không chứng minh code đã sửa hoặc test đã chạy.

Ở nhiệm vụ IMPLEMENTATION tiếp theo được Phong yêu cầu, chỉ được sửa source thuộc FIX có Implementation Status `READY` hoặc đã chuyển `IN_PROGRESS`, đúng phía và đúng phạm vi file của FIX. Không tự mở rộng scope; task `BLOCKED` không được triển khai phần đang bị dependency chặn. RECOMMENDED và OPTIONAL không tự trở thành bắt buộc.

Mặc định mỗi lần chỉ một FIX; chỉ làm nhóm dependency nhỏ khi prompt implementation nêu rõ từng FIX và chúng đã sẵn sàng. Không tự triển khai cả 56 FIX hoặc sửa thêm task liên quan chưa READY/IN_PROGRESS. Migration, production DB, secret, deploy, dependency mới và thay đổi môi trường nhạy cảm vẫn theo giới hạn/ủy quyền riêng của task; READY không thay thế các điều kiện này. Cross-stack verification chỉ thực hiện sau khi hai phía hoàn thành và local tests đạt.

Lần chuẩn hóa ngày 02/10/2026 chỉ thay đổi bốn tài liệu kế hoạch; chưa triển khai source, chưa chạy test ứng dụng. Trạng thái thực thi từng phía chỉ được đọc/ghi tại `docs/fix/FIX_TRACKER.csv`; không suy ra từ thứ tự FIX-ID hoặc snapshot trong plan.

Ngày rà soát: 02/10/2026 (Asia/Saigon). Trạng thái tại lần audit ban đầu: **CHỈ PHÂN TÍCH VÀ LẬP KẾ HOẠCH — CHƯA IMPLEMENT**. Readiness pass và hai kế hoạch chuyên trách chỉ lưu snapshot; trạng thái hiện tại của từng FIX nằm duy nhất trong `docs/fix/FIX_TRACKER.csv`.

## Phạm vi và độ tin cậy

- Đối chiếu source hiện tại: 97 file Java main, 54 file frontend src (28 page React), 17 controller/52 endpoint, 11 JPA entity và3 enum, DTO/repository/security/exception/service, SQL, cấu hình build/môi trường và4 file test.
- Kiến trúc: React18 + Vite6 + Tailwind3, Context/LocalStorage, Axios REST JSON; Java17 + Spring Boot3.2.5 + JPA/Hibernate + Spring Security JWT; MySQL. Roles thực tế ROLE_USER/ROLE_ADMIN; chưa có STAFF.
- Luồng: page/component → Context hoặc api wrapper → axiosClient → Controller + Security → Service transaction → JPA Repository → MySQL → DTO → state/UI. Giỏ và compare đang local, không có Cart/Wishlist/Payment/Variant entity.
- Bản thiết kế trong [design](design) và accessoriesMockData.json không được xem là chức năng chạy; generated report/PDF không là bằng chứng implementation. Binary, node_modules, target, dist, cache IDE/Git không được coi là source tự viết cần audit line-by-line.
- Rà soát tĩnh theo module, mapping và luồng quan trọng; không khởi động ứng dụng, không chạy test/build/migration, không gọi gateway/email hoặc đọc DB live. Không khẳng định toàn bộ lỗi runtime hay schema production đã được kiểm chứng; mọi cách test là kế hoạch sau sửa.
- Những thay đổi đã có từ trước ở README, pom, OrderService và fuzz tests được giữ nguyên. Báo cáo dùng implementation hiện tại, không lặp kết luận cũ rằng fuzz chỉ kiểm thử công thức sao chép.
- Severity phản ánh hậu quả; Critical PayOS chỉ chặn phát hành online nếu gateway là phạm vi bán hàng. ESSENTIAL/RECOMMENDED/OPTIONAL là mức cần thiết của tính năng, khác severity.
- Trong giai đoạn AUDIT/PLANNING ban đầu, bốn tài liệu này là đầu ra duy nhất được phép tạo. Quy tắc này không giới hạn các thay đổi source code hợp lệ trong giai đoạn IMPLEMENTATION đối với task đã READY/IN_PROGRESS. Mọi đường dẫn source dưới đây là nơi **dự kiến** sửa, không phải đã sửa. Entity/endpoint ghi “đề xuất” hiện chưa tồn tại.
- Schema migration, thêm dependency/upload storage/email provider, sửa cấu hình nhạy cảm, gửi email và deploy đều chưa được thực hiện hoặc tự động được cho phép bởi kế hoạch.

## Mục lục công việc

| ID | Vấn đề | Mức độ | Loại | Phạm vi | Cần thiết |
|---|---|---|---|---|---|
| FIX-001 | Loại bỏ khóa JWT mặc định trong cấu hình | Critical | Security | BACKEND | ESSENTIAL |
| FIX-002 | Hoàn thiện tạo link thanh toán PayOS | Critical | Integration | BOTH | ESSENTIAL |
| FIX-003 | Lưu giao dịch và đối soát thanh toán muộn | High | Missing Feature | BOTH | ESSENTIAL |
| FIX-004 | Sửa trang QR và đường dẫn trả về thanh toán | High | Integration | BOTH | ESSENTIAL |
| FIX-005 | Sửa lỗi render trang băng chặn mồ hôi | High | Bug | FRONTEND | ESSENTIAL |
| FIX-006 | Giữ đầy đủ tùy chọn từ chi tiết đến đơn hàng | High | Integration | BOTH | ESSENTIAL |
| FIX-007 | Biến thể, giá và tồn kho theo SKU bán được | High | Missing Feature | BOTH | ESSENTIAL |
| FIX-008 | Dịch vụ căng cước và phụ phí có dữ liệu thật | High | Integration | BOTH | RECOMMENDED |
| FIX-009 | Không báo thêm giỏ thành công hoặc mua nhầm giỏ khi thêm thất bại | High | Bug | FRONTEND | ESSENTIAL |
| FIX-010 | Combo quấn cán không dùng sản phẩm giả | Medium | Bug | FRONTEND | ESSENTIAL |
| FIX-011 | Không tạo review giả khi API lỗi | High | Bug | FRONTEND | ESSENTIAL |
| FIX-012 | Review gắn với lần mua và chống trùng | Medium | Validation | BOTH | ESSENTIAL |
| FIX-013 | Đồng bộ trạng thái và dữ liệu đổi trả trên UI | High | Integration | FRONTEND | ESSENTIAL |
| FIX-014 | Quy tắc đổi trả và hoàn tiền có kiểm soát | High | Validation | BOTH | ESSENTIAL |
| FIX-015 | Địa chỉ có cấu trúc và checkout chọn đúng địa chỉ | High | Bug | BOTH | ESSENTIAL |
| FIX-016 | Bảo đảm một địa chỉ mặc định khi thao tác đồng thời | Medium | Bug | BACKEND | ESSENTIAL |
| FIX-017 | Checkout dùng báo giá server và validation đầy đủ | High | Integration | BOTH | ESSENTIAL |
| FIX-018 | Chống tạo đơn trùng bằng idempotency | High | Missing Feature | BOTH | ESSENTIAL |
| FIX-019 | Trang kết quả và đơn hàng dùng đúng response | Medium | Bug | FRONTEND | ESSENTIAL |
| FIX-020 | Snapshot lịch sử sản phẩm trong OrderItem | Medium | Bug | BOTH | ESSENTIAL |
| FIX-021 | Lưu đầy đủ thuộc tính và bộ ảnh sản phẩm | High | Bug | BOTH | ESSENTIAL |
| FIX-022 | Ngừng bán và xóa catalog an toàn | Medium | Missing Feature | BOTH | ESSENTIAL |
| FIX-023 | Voucher không làm tăng tiền và sửa/tắt được thật | High | Validation | BOTH | ESSENTIAL |
| FIX-024 | Điều kiện voucher theo thời gian, người dùng, sản phẩm | Medium | Missing Feature | BOTH | RECOMMENDED |
| FIX-025 | Ngăn admin tự khóa hoặc khóa admin cuối | High | Security | BOTH | ESSENTIAL |
| FIX-026 | Đăng ký/đăng nhập không tự tạo email giả | Medium | Integration | BOTH | ESSENTIAL |
| FIX-027 | Quên và đặt lại mật khẩu | High | Missing Feature | BOTH | ESSENTIAL |
| FIX-028 | Vòng đời phiên và Remember login | High | Security | BOTH | ESSENTIAL |
| FIX-029 | Đồng bộ hồ sơ và trạng thái người dùng | Medium | UX | BOTH | RECOMMENDED |
| FIX-030 | Upload ảnh có xác thực và kiểm soát tài sản | Medium | Missing Feature | BOTH | RECOMMENDED |
| FIX-031 | Wishlist thực sự lưu và dùng lại | Medium | Missing Feature | BOTH | RECOMMENDED |
| FIX-032 | Search/filter/sort/pagination thống nhất server | Medium | Integration | BOTH | ESSENTIAL |
| FIX-033 | Giảm N+1 ở catalog và đọc đơn | Medium | Performance | BACKEND | ESSENTIAL |
| FIX-034 | Trang chủ và liên kết khuyến mãi phản ánh catalog thật | Medium | Integration | BOTH | RECOMMENDED |
| FIX-035 | Thông số/rating/ảnh không lấy số liệu minh họa làm thật | Medium | UX | FRONTEND | ESSENTIAL |
| FIX-036 | Dashboard lấy thống kê thật theo khoảng thời gian | Medium | Integration | BOTH | ESSENTIAL |
| FIX-037 | Quản trị danh mục và thương hiệu tối thiểu | Medium | Missing Feature | BOTH | RECOMMENDED |
| FIX-038 | Lịch sử nhập/điều chỉnh tồn kho | Medium | Missing Feature | BOTH | RECOMMENDED |
| FIX-039 | Phân biệt thanh toán, giao hàng và lịch sử trạng thái | High | Missing Feature | BOTH | ESSENTIAL |
| FIX-040 | Mua lại đơn có kiểm tra catalog hiện tại | Low | Missing Feature | FRONTEND | RECOMMENDED |
| FIX-041 | Email xác nhận đơn và hạ tầng gửi thông báo | Medium | Missing Feature | BACKEND | RECOMMENDED |
| FIX-042 | Lỗi API và validation có contract nhất quán | Medium | Validation | BOTH | ESSENTIAL |
| FIX-043 | Giới hạn lạm dụng auth, AI và API tốn tài nguyên | High | Security | BOTH | ESSENTIAL |
| FIX-044 | Cấu hình môi trường và quy trình triển khai an toàn | High | Security | BOTH | ESSENTIAL |
| FIX-045 | Schema constraint/index/timestamp và migration có kiểm soát | Medium | Missing Feature | BACKEND | ESSENTIAL |
| FIX-046 | Bổ sung kiểm thử tích hợp và E2E còn thiếu | High | Missing Feature | BOTH | ESSENTIAL |
| FIX-047 | Khả năng phục hồi UI và dữ liệu so sánh | Medium | UX | FRONTEND | ESSENTIAL |
| FIX-048 | Nút chưa tích hợp và nội dung chính sách minh bạch | Low | UX | FRONTEND | ESSENTIAL |
| FIX-049 | Backlog tùy chọn không chặn bán hàng | Low | Missing Feature | BOTH | OPTIONAL |
| FIX-050 | Phân tách giỏ khách và giỏ theo tài khoản trên thiết bị | Medium | UX | FRONTEND | RECOMMENDED |
| FIX-051 | Nối API quản trị xóa review đã có | Medium | Integration | FRONTEND | ESSENTIAL |
| FIX-052 | Phân trang các danh sách quản trị và tài khoản | Medium | Performance | BOTH | RECOMMENDED |
| FIX-053 | AI chỉ đề xuất sản phẩm phù hợp đang bán | Medium | Bug | BOTH | ESSENTIAL |
| FIX-054 | Giới hạn tiền, kích thước đơn và dữ liệu đầu vào | High | Validation | BACKEND | ESSENTIAL |
| FIX-055 | Chặn tràn số khi hoàn kho và sửa kho đang giữ chỗ | High | Bug | BACKEND | ESSENTIAL |
| FIX-056 | Giảm nguy cơ lộ credential trong log và script vận hành | Medium | Security | BACKEND | ESSENTIAL |

## Trình tự thực hiện đề xuất

1. **P0:** FIX-001. Nếu mở PayOS bán thật, FIX-002/FIX-003/FIX-004 là điều kiện phát hành thanh toán online. Có thể đưa COD ra trước sau khi các điều kiện checkout/kho/quyền đạt.
2. **P1 — lỗi trực tiếp, tiền và dữ liệu:** FIX-005, FIX-009, FIX-011, FIX-013, FIX-023, FIX-025, FIX-054, FIX-055; chuẩn bị FIX-042 để có lỗi nhất quán.
3. **Nền catalog:** FIX-045 → FIX-021 → FIX-007; FIX-020/FIX-022 để giữ lịch sử. FIX-008 chỉ bắt buộc nếu thực sự bán dịch vụ căng cước, nếu chưa thì khóa lựa chọn chưa hỗ trợ.
4. **Luồng bán hàng:** FIX-015/FIX-016 → FIX-006/FIX-017; FIX-018 có thể làm trước và ghép checkout. FIX-019 hoàn thiện kết quả. Kiểm tra COD xuyên suốt trước khi chốt release.
5. **Thanh toán/đơn/đổi trả:** FIX-002 → FIX-003/FIX-004 → FIX-039 → FIX-014. Không coi trả tiền thành công chỉ từ URL trình duyệt.
6. **Tài khoản và vận hành:** FIX-026/FIX-028/FIX-041 → FIX-027; FIX-032/FIX-033/FIX-036/FIX-037/FIX-038/FIX-052; các task RECOMMENDED được chọn theo nhu cầu. FIX-030 trước avatar upload FIX-029.
7. **Hoàn thiện UX và kiểm chứng phát hành:** FIX-010/FIX-035/FIX-047/FIX-048; FIX-043/FIX-044/FIX-056; FIX-046 kiểm thử xuyên suốt mỗi nhóm và kiểm tra tổng hợp cuối. Không chờ cuối mới kiểm thử.
8. **Sau bản ổn định:** wishlist, voucher nâng cao, mua lại, phân tách giỏ tài khoản; FIX-049 chỉ backlog OPTIONAL, không tự mở rộng scope.

Mỗi nhóm phải có bản thay đổi nhỏ, đối chiếu contract và test trước khi chuyển nhóm. Các phụ thuộc bên dưới là phụ thuộc công việc; khi BOTH dùng cùng FIX-ID, backend của chính ID phải sẵn sàng trước khi nghiệm thu tích hợp frontend. Không suy diễn thành vòng phụ thuộc task vào chính nó.

# Implementation Entry Point

Mọi thay đổi trạng thái chỉ thực hiện ở dòng FIX tương ứng trong `docs/fix/FIX_TRACKER.csv`; không đổi READY/IN_PROGRESS/DONE trong plan. Roadmap là ưu tiên tham khảo, không thay dependency graph và không phải yêu cầu triển khai.

1. Đọc FIX_TRACKER.csv cùng specification của FIX. Chọn đúng FIX user yêu cầu; chỉ đặt REQUESTED=YES cho các FIX được giao, không tự chọn FIX-001 hoặc FIX READY khác.
2. Xác minh phía agent phụ trách đang READY, dependency bắt buộc đã DONE/PASSED theo phạm vi, BLOCKED_BY/BLOCK_REASON không chặn phần sắp làm, contract đủ điều kiện. REQUESTED=YES không bỏ qua readiness.
3. Trước code, cập nhật BACKEND_STATUS hoặc FRONTEND_STATUS từ READY → IN_PROGRESS trong CSV; VERIFY tương ứng NOT_RUN khi chưa kiểm tra phần thay đổi. Cập nhật CURRENT_AGENT, LAST_ACTION và LAST_UPDATED.
4. Sau đó mới sửa đúng phần việc được giao. Mặc định một FIX; nhóm nhỏ chỉ khi prompt nêu rõ, không tự làm task liên quan hoặc phía còn lại.
5. Sau khi viết code, cập nhật STATUS=NEEDS_REVIEW và VERIFY=NEEDS_REVIEW của phía tương ứng; KHÔNG DONE ngay.
6. Tự review git diff/phạm vi, chạy test và build/lint phù hợp nếu có, đối chiếu acceptance criteria, security/validation/compatibility liên quan và regression.
7. Nếu toàn bộ kiểm tra đạt: VERIFY=PASSED, rồi STATUS=DONE; cập nhật EVIDENCE thực tế và commit hash nếu đã có. Chưa commit để trống.
8. Nếu fail: VERIFY=FAILED, STATUS=FAILED hoặc IN_PROGRESS khi tiếp tục sửa; ghi lỗi/test/file vào EVIDENCE. Không DONE nếu còn test chưa chạy hoặc giới hạn chưa đáp ứng tiêu chí bắt buộc.
9. Backend thay contract: APPROVED → IMPLEMENTING khi code; chỉ IMPLEMENTED khi API thực sự có và BACKEND_VERIFY=PASSED. Frontend BOTH chỉ xét BLOCKED → READY khi backend/dependency đạt và contract mới IMPLEMENTED/VERIFIED.
10. Frontend hoàn thành không tự làm cross-stack PASSED. Codex reviewer kiểm tra luồng thực tế rồi cập nhật CSV theo protocol dưới đây.

READY không có nghĩa user đã yêu cầu. RECOMMENDED/OPTIONAL không tự chọn release. Thao tác môi trường nhạy cảm/migration/DB thật/secret/deploy vẫn cần đúng phạm vi và quyền riêng. Nhiệm vụ chuẩn hóa này dừng tại năm file tài liệu/tracker.

# FIX Tracker Update Protocol

## Rule 1

Sửa code xong KHÔNG đồng nghĩa DONE.

## Rule 2

Sau implementation: STATUS=NEEDS_REVIEW và VERIFY=NEEDS_REVIEW của phía đang thực hiện trong CSV.

## Rule 3

Trước DONE phải kiểm tra git diff, file changed, scope, Acceptance Criteria, tests, build, lint nếu có, security/validation/regression/backward compatibility/API contract nếu liên quan; không mock/fake success ngoài test và không sửa task khác ngoài scope. Test DB chạy trong môi trường test được phép, không production. Không ghi PASS cho kiểm tra chưa chạy; điều kiện bắt buộc chưa kiểm tra thì chưa DONE.

## Rule 4

Chỉ khi toàn bộ kiểm tra thuộc trách nhiệm đạt: VERIFY=PASSED rồi STATUS=DONE. EVIDENCE phải chứng minh kết quả.

## Rule 5

Test fail: VERIFY=FAILED; STATUS=FAILED hoặc IN_PROGRESS nếu tiếp tục sửa. Không DONE.

## Rule 6 — Backend-only

OVERALL_STATUS chỉ DONE khi BACKEND_STATUS=DONE và BACKEND_VERIFY=PASSED; dependency bắt buộc và blocker phải được giải quyết.

## Rule 7 — Frontend-only

OVERALL_STATUS chỉ DONE khi FRONTEND_STATUS=DONE và FRONTEND_VERIFY=PASSED; dependency/blocker phải được giải quyết. Nếu task yêu cầu tích hợp backend mới và CROSS_STACK_VERIFY không phải N/A, vẫn phải thực hiện kiểm tra tích hợp tương ứng trước nghiệm thu toàn task.

## Rule 8 — BOTH

OVERALL_STATUS chỉ DONE khi BACKEND_STATUS=DONE, BACKEND_VERIFY=PASSED, FRONTEND_STATUS=DONE, FRONTEND_VERIFY=PASSED, CROSS_STACK_VERIFY=PASSED và CONTRACT_STATUS=VERIFIED nếu thay contract; NO_CHANGE giữ nguyên. Không DONE khi dependency hoặc BLOCK_REASON bắt buộc chưa giải quyết.

Trước kiểm tra xuyên stack: CROSS_STACK_VERIFY=NEEDS_REVIEW, OVERALL_STATUS=NEEDS_REVIEW, CURRENT_AGENT=CODEX_REVIEWER. Kiểm tra thực tế Frontend → API request → Controller → Service → Database nếu áp dụng → Response → Frontend state/rendering; gồm method/endpoint/auth/payload/query/path/response/error/status, loading/error UI, validation, DB effect, retry/idempotency khi liên quan. PASS mới ghi CROSS_STACK_VERIFY=PASSED và CONTRACT_STATUS=VERIFIED nếu thay contract; FAIL ghi CROSS_STACK_VERIFY=FAILED và OVERALL_STATUS=FAILED cùng bằng chứng.

## Rule 9

Backend DONE không đồng nghĩa Frontend DONE. Frontend DONE không đồng nghĩa Cross-stack PASS. Hai phía DONE không đồng nghĩa Overall DONE.

## Rule 10

Mọi cập nhật trạng thái chỉ ghi tại `docs/fix/FIX_TRACKER.csv`. Không cập nhật các status snapshot trong bốn specification sau mỗi FIX.

## REQUESTED, blocker và phạm vi cập nhật

- REQUESTED chỉ YES/NO; ban đầu tất cả NO. User giao FIX nào chỉ đổi YES cho FIX đó; READY không tự thành YES. Khi hỏi “các FIX tôi yêu cầu đã xong chưa”, lọc REQUESTED=YES và đối chiếu OVERALL_STATUS. Chỉ xác nhận hoàn thành khi có ít nhất một FIX được yêu cầu và tất cả đều DONE; nếu không có dòng YES, báo chưa có FIX được yêu cầu, không tuyên bố tất cả hoàn thành.
- BLOCKED_BY chỉ FIX-ID phân tách bằng | hoặc rỗng. Không thêm self-dependency để mô tả frontend chờ backend cùng FIX; điều kiện đó nằm trong các cột trạng thái hai phía. BLOCK_REASON ghi quyết định nghiệp vụ/external chưa chốt, hoặc giải thích chờ dependency; không tự chọn provider/chính sách hoặc sửa graph.
- OVERALL_STATUS=READY cho BOTH có thể nghĩa backend sẵn sàng bắt đầu, không mở khóa frontend. Task RECOMMENDED chưa chọn release giữ TODO tổng thể; OPTIONAL giữ OPTIONAL.
- Chỉ cập nhật dòng FIX đang được giao. Sau DONE/PASSED kiểm tra các task phụ thuộc trực tiếp: có thể cập nhật BLOCKED_BY khi xác định rõ; chỉ xét READY khi toàn bộ dependency/contract/blocker đáp ứng. Không tự chuyển task khác DONE hoặc REQUESTED=YES.
- CURRENT_AGENT chỉ NONE/CODEX_BACKEND/ANTIGRAVITY_FRONTEND/CODEX_REVIEWER/HUMAN_REVIEW; bắt đầu ghi đúng agent, hoàn thành toàn FIX trả NONE.
- LAST_ACTION là thao tác gần nhất, không dùng “Done/OK/Fixed”. EVIDENCE ghi file, test/build, kết quả acceptance/regression và giới hạn thực tế; không dùng “Everything works”. BACKEND_COMMIT/FRONTEND_COMMIT chỉ ghi hash có thật; chưa commit để trống. Cập nhật LAST_UPDATED có múi giờ; không tự commit.
- Sau mỗi lần ghi CSV phải parse lại: đúng 21 cột, 56 FIX duy nhất, đủ FIX-001…FIX-056; TITLE/SCOPE/REQUIREMENT/SEVERITY khớp MASTER, enum hợp lệ, REQUESTED YES/NO, BLOCKED_BY đúng ID và graph. Kiểm tra DONE/PASSED theo Rule 6–8; VERIFIED chỉ khi CROSS_STACK_VERIFY=PASSED, IMPLEMENTED chỉ khi backend đã cung cấp contract và BACKEND_VERIFY=PASSED; frontend BOTH không DONE trước backend. Không DONE nếu dependency chưa DONE hoặc BLOCK_REASON bắt buộc còn mở.
- Trước làm xem git status; sau làm xem git diff và giữ nguyên thay đổi có sẵn của user. Không reset/clean phá hủy dữ liệu; không sửa source trong nhiệm vụ chuẩn hóa này.

# Concurrent Tracker Update Protocol

Protocol này bổ sung FIX Tracker Update Protocol, không đổi schema, readiness, dependency hoặc current state. Tracker canonical duy nhất là `docs/fix/FIX_TRACKER.csv`; CSV vẫn là nguồn duy nhất về trạng thái thực thi. Không tạo FIX_TRACKER(1).csv, FIX_TRACKER_NEW.csv, FIX_TRACKER_FINAL.csv hay bản sao cạnh tranh. Tên (1) do tải lên/tải xuống ngoài repository không cần xử lý.

## Rule 1 — Luôn reload tracker trước khi ghi

Trước MỌI lần cập nhật, agent phải đọc lại tracker mới nhất trực tiếp từ filesystem/repository. Không dùng CSV cũ trong chat context, agent memory, cache, previous tool result hoặc previous turn làm đầu vào ghi. Bản đọc trước chỉ dùng đối chiếu phát hiện thay đổi, không làm bản trạng thái để ghi đè. Mỗi lần chuyển trạng thái, bổ sung evidence hoặc commit đều là một lần cập nhật riêng và phải reload.

## Rule 2 — Chỉ patch FIX đang được giao

Định vị row bằng FIX_ID, không theo số dòng cố định. Chỉ patch field được phép của FIX được user giao. Làm FIX-001 không được viết lại trạng thái FIX-005/FIX-009 hoặc FIX khác. Metadata TITLE/SCOPE/REQUIREMENT/SEVERITY không thay trong cập nhật tiến độ. Ngoại lệ dependency được protocol trước cho phép phải xác định rõ từng row/field và xử lý bằng lượt reload/patch/validation riêng; không trở thành quyền ghi hàng loạt.

## Rule 3 — Không rewrite từ snapshot cũ; chống lost update

Nếu A đọc tracker, sau đó B cập nhật, A không được ghi snapshot cũ đè thay đổi của B. Quy trình bắt buộc:

```text
Read latest tracker
→ Locate FIX row
→ Apply intended patch trên bản mới nhất, chỉ trong bộ nhớ
→ Re-read / validate latest state ngay trước khi ghi
→ Write bằng cập nhật có điều kiện hoặc lượt ghi đã được phối hợp
→ Parse + compare
```

Không dùng luồng “Old cached tracker → change one field → rewrite entire file”. Giữ nguyên các row khác từ bản vừa reload; không dựng lại toàn bộ trạng thái từ context. Ưu tiên patch hẹp có kiểm tra nội dung cũ khớp chính xác. Nếu công cụ cần serialize file, dữ liệu phải lấy từ bản đọc mới nhất trong lượt ghi an toàn; không thay định dạng hoặc dữ liệu ngoài patch được duyệt.

## Rule 4 — Preserve unrelated data

Giữ nguyên header và thứ tự 21 cột, thứ tự FIX, 56 rows, dữ liệu/metadata/status/evidence/commit/timestamps của mọi row ngoài phạm vi. Không đổi delimiter, quote style hàng loạt, sort rows, line ending hoặc normalize toàn file chỉ để sửa một status. Diff phải nhỏ và review được.

## Stale read protection và giới hạn đồng thời

Ngay trước write, kiểm tra file có thay đổi từ lần đọc dùng cho patch không khi công cụ cho phép: hash toàn file, mtime, reread + compare row; git diff/status là bằng chứng bổ sung. Nếu có thay đổi, reload rồi đánh giá lại row và field ownership trước khi ghi.

Hash/mtime/reload là phát hiện stale read, không tự tạo atomic lock: vẫn có khoảng đua giữa kiểm tra và ghi. CURRENT_AGENT cũng không phải khóa kỹ thuật. Nếu nền tảng hỗ trợ, dùng cập nhật có điều kiện/compare-and-swap hoặc cơ chế ghi tuần tự sẵn có; không tự thêm hệ thống lock, cột hay file mới trong nhiệm vụ này. Nếu không thể bảo đảm lượt ghi an toàn khi có writer khác, dừng ghi và phối hợp lượt xử lý tuần tự; không coi “đã reload” là bằng chứng chắc chắn không lost update.

## Same FIX conflict

Nếu row FIX đang xử lý đã bị agent khác thay đổi kể từ baseline của lượt cập nhật, dừng update tracker và báo `TRACKER_CONFLICT`. Không merge mù quáng, overwrite hoặc tự chọn bên thắng, kể cả khi chỉ EVIDENCE/CURRENT_AGENT thay đổi.

Báo FIX_ID và từng field thay đổi: giá trị trước, giá trị hiện tại, giá trị dự định ghi (hoặc ghi rõ field không định sửa). Chờ lượt xử lý tiếp theo; không rollback toàn file về snapshot cũ để “giải quyết” conflict. Takeover cần user yêu cầu rõ và vẫn phải reload/đối chiếu.

## Different FIX concurrent update

Nếu B chỉ sửa FIX-005 còn A được giao FIX-001, đây không phải same-FIX conflict. A reload bản mới nhất, giữ nguyên toàn bộ row FIX-005 mới nhất, chỉ patch FIX-001 rồi validate. Không đưa FIX-005 về trạng thái cũ. Nếu file tiếp tục đổi trong lúc chuẩn bị ghi, kiểm tra stale read lại và phối hợp lượt ghi an toàn.

## Agent field ownership

Chỉ áp dụng cho row đang được giao, không cho phép đổi metadata hoặc task khác.

| Agent | Field được cập nhật | Giới hạn |
|---|---|---|
| CODEX_BACKEND | REQUESTED khi user vừa giao FIX; BACKEND_STATUS; BACKEND_VERIFY; CONTRACT_STATUS khi backend sở hữu thay đổi contract; OVERALL_STATUS nếu đủ điều kiện; BLOCKED_BY; BLOCK_REASON; CURRENT_AGENT; LAST_ACTION; EVIDENCE; BACKEND_COMMIT; LAST_UPDATED | Không sửa FRONTEND_STATUS/FRONTEND_VERIFY/FRONTEND_COMMIT. Ngoại lệ duy nhất: FRONTEND_STATUS BLOCKED → READY nếu backend/dependency/contract đều đạt theo protocol. Ưu tiên chỉ ghi evidence frontend eligible và để Antigravity mở khóa; không thay verification/commit frontend. |
| ANTIGRAVITY_FRONTEND | REQUESTED khi user giao trực tiếp frontend FIX; FRONTEND_STATUS; FRONTEND_VERIFY; OVERALL_STATUS nếu đủ điều kiện; CURRENT_AGENT; LAST_ACTION; EVIDENCE; FRONTEND_COMMIT; LAST_UPDATED | Không sửa BACKEND_STATUS/BACKEND_VERIFY/BACKEND_COMMIT hoặc backend readiness. Không tự sửa CONTRACT_STATUS, đặc biệt không hạ IMPLEMENTED/VERIFIED xuống trạng thái khác. |
| CODEX_REVIEWER | CROSS_STACK_VERIFY; CONTRACT_STATUS từ IMPLEMENTED → VERIFIED khi cross-stack pass; OVERALL_STATUS; CURRENT_AGENT; LAST_ACTION; EVIDENCE; LAST_UPDATED | Không âm thầm sửa implementation status hai phía. Khi verification phát hiện lỗi, ghi CROSS_STACK_VERIFY=FAILED, OVERALL_STATUS=FAILED và evidence, bàn giao phía phụ trách xử lý; không tự sửa code trong review-only task. |

REQUESTED=YES không tự mở khóa dependency hoặc cấp quyền vượt phạm vi. Mọi chuyển DONE/PASSED/IMPLEMENTED/VERIFIED vẫn phải đạt verification protocol; field ownership không thay các điều kiện đó.

## Evidence merge safety

EVIDENCE là field dùng chung. Khi BOTH, bổ sung bằng prefix ngắn `BE: ... | FE: ... | XSTACK: ...`, giữ bằng chứng còn giá trị của agent khác. Ví dụ minh họa, không phải kết quả hiện tại: `BE: 18 tests pass; API response verified | FE: build pass; 360/768/1440 checked | XSTACK: POST /api/orders verified end-to-end`.

Không overwrite toàn evidence bằng ghi chú mới. Chỉ thay bằng chứng cũ nếu xác định sai và nêu rõ lý do/nguồn thay thế. Merge evidence phải dựa trên row mới nhất; nếu row vừa bị agent khác đổi, áp dụng TRACKER_CONFLICT trước, không dùng append để bỏ qua conflict.

## CURRENT_AGENT, LAST_ACTION và soft lock

CURRENT_AGENT phản ánh agent giữ lượt xử lý chính; LAST_ACTION ghi thao tác gần nhất, không phải lịch sử đầy đủ. Dùng CURRENT_AGENT + STATUS + LAST_UPDATED như soft lock, không thêm cột và không coi soft lock là lock tuyệt đối.

Nếu CURRENT_AGENT khác NONE, agent khác phải kiểm tra trước khi làm cùng FIX. Nếu cùng FIX đang IN_PROGRESS bởi agent khác, không bắt đầu; báo `FIX_ALREADY_IN_PROGRESS`, trừ khi user yêu cầu takeover rõ ràng. Timestamp cũ không tự cho phép chiếm lượt. Ví dụ FIX-001 BACKEND_STATUS=IN_PROGRESS và CURRENT_AGENT=CODEX_BACKEND không phải task available để frontend/reviewer tự sửa implementation. Soft lock không thay reload trước mọi write.

## Post-write validation

Sau MỌI lần write, đọc và parse lại toàn bộ CSV, đối chiếu với bản mới nhất ngay trước write và intended patch:

- Đúng 21 columns, 56 FIX rows, unique và đủ FIX-001…FIX-056; metadata immutable khớp MASTER.
- REQUESTED chỉ YES/NO; mọi status theo enum được quy định; BLOCKED_BY chỉ FIX-ID hợp lệ phân tách | hoặc rỗng; không sửa dependency graph.
- Không có DONE/PASSED sai; contract VERIFIED chỉ khi CROSS_STACK_VERIFY=PASSED; IMPLEMENTED cần backend verification PASSED; BOTH Overall DONE đúng Rule 8 của FIX Tracker Update Protocol.
- Không frontend BOTH DONE trước backend, không DONE khi dependency/blocker bắt buộc chưa giải quyết.
- Patch dự định đã được ghi đúng; row khác không mất evidence/commit/status/timestamp hoặc bị đổi metadata/thứ tự/format.

Validation lỗi thì dừng và báo; không ghi đè lại snapshot cũ để phục hồi vì có thể mất cập nhật mới của agent khác.

## Diff validation và no full-file reformat

Kiểm tra git diff hoặc diff đọc trực tiếp trước/sau nếu tracker chưa được Git theo dõi. Một update đơn FIX phải chỉ thay row/field dự kiến. Ngoại lệ hợp lệ là row dependency được mở khóa rõ ràng theo protocol, hoặc reviewer cập nhật đúng row đang review, vẫn phải theo ownership và reload.

Nếu có row unrelated thay đổi ngoài patch của lượt ghi, dừng và báo `UNEXPECTED_TRACKER_DIFF` cùng FIX_ID bị ảnh hưởng. Phân biệt cập nhật đã biết của agent khác bằng reread/compare; không hoàn nguyên chúng. Không sort, đổi delimiter/quote/line ending, reorder columns hoặc reformat toàn CSV.

## Flow triển khai và bàn giao

Khi user thực sự giao FIX-001: reload → kiểm tra REQUESTED/BACKEND_STATUS/BLOCKED_BY/BLOCK_REASON/CURRENT_AGENT → nếu hợp lệ, patch REQUESTED=YES, BACKEND_STATUS READY → IN_PROGRESS, CURRENT_AGENT=CODEX_BACKEND cùng LAST_ACTION/LAST_UPDATED → validate CSV/diff → mới sửa code.

Sau code: reload lại → kiểm tra conflict → patch BACKEND_STATUS=NEEDS_REVIEW, BACKEND_VERIFY=NEEDS_REVIEW → validate → review/test. Sau khi đạt toàn bộ điều kiện: reload lần nữa → kiểm tra conflict → patch BACKEND_VERIFY=PASSED, BACKEND_STATUS=DONE; FIX backend-only đủ điều kiện mới OVERALL_STATUS=DONE, CURRENT_AGENT=NONE → validate CSV/diff. Không giữ bản tracker từ bước đầu đến cuối rồi ghi lại toàn file.

Với BOTH: Backend reload → patch backend fields → validate; Frontend reload → đọc backend/dependency/contract mới nhất → patch frontend fields → validate; Reviewer reload → kiểm tra thực tế cả hai → patch cross-stack/overall/contract theo quyền → validate. Mỗi lượt dùng bản mới nhất và giữ evidence các phía.

Nhiệm vụ bổ sung protocol hiện tại không ghi tracker, không đổi REQUESTED/readiness/current state, không sửa API contract và không triển khai FIX-001.


## Những phần cần giữ

- React JSX/Vite/Tailwind và Spring Boot Controller → Service → Repository; không đổi framework.
- BCrypt12; JWT kiểm tra expiry và tải quyền/trạng thái user từ database; authorization backend và owner-check order/address/return.
- Transaction tạo đơn; khóa user/product/order/voucher; sort khóa theo product ID; refresh product khi khóa; tính giá/phí/voucher từ DB.
- Reserve/release/settle tách biệt; hủy lặp không hoàn kho hai lần; scheduler xử lý từng đơn với transaction riêng; callback lặp không settle hai lần.
- Guard trạng thái đơn hiện có; mock webhook phải ADMIN+dev+flag; verify HMAC constant-time.
- Product expectedStock, CartContext ref hạn chế stale state, normalize line key (cần mở rộng đúng contract), Axios Bearer/401 handler, /auth/me khi reload.
- Bộ JUnit/Mockito/Jazzer hiện tại. Fuzz test mới gọi OrderService/PaymentController/PayOSService thật với repository mock, có signer kiểm thử độc lập; vẫn chưa thay fixture gateway hoặc kiểm thử MySQL.


## Độ phủ chức năng

| Module | Kết luận từ source | FIX-ID liên quan (tiền tố FIX-) |
|---|---|---|
| Authentication | Có login/register/me; reset thiếu, remember/logout server chưa hoàn thiện | 026–028 |
| User / Address | Profile cơ bản và CRUD địa chỉ có backend; form địa chỉ/default cần sửa | 015–016,025,029 |
| Product / Category / Brand | CRUD product/category có; mapping thiếu; brand chuỗi | 021–022,032–037 |
| Variant / Inventory | Stock Product và reservation có; variant và ledger thiếu | 006–008,038,055 |
| Search / Filter | Có client filter/page và backend filter; chưa thống nhất | 032–034 |
| Cart | LocalStorage, quantity/selection có; mất options và false success | 006,009–010,050 |
| Wishlist | UI heart; chưa có persistence/API | 031 |
| Checkout / Voucher | COD/createOrder thật; quote/idempotency/địa chỉ và validation thiếu | 015–018,023–024,054 |
| Payment | HMAC/webhook có; tạo link chưa có; ledger/đối soát thiếu | 002–004 |
| Order | Owner/list/detail/cancel/status có; snapshot/history/thu COD thiếu | 019–020,039–040 |
| Review / Return | Có CRUD một phần; review fake lỗi, eligibility và enum mismatch | 011–014,051 |
| Admin / Dashboard | CRUD một phần; chart/controls/nhãn demo và pagination thiếu | 025,036–038,048,052 |
| Notification / Upload | Chưa có triển khai server hoàn chỉnh | 030,041 |
| Security / Config | Có nền bảo vệ; JWT fallback, rate-limit/log/config cần xử lý | 001,028,042–045,053–056 |
| Testing | 4 file test;56 @Test,8 @FuzzTest,12 @ParameterizedTest; chưa chạy lần này | 046 |
| UX / mở rộng | Boundary/404/compare recovery thiếu; nhiều tiện ích OPTIONAL | 035,047–050 |

## Chi tiết vấn đề

### FIX-001 — Loại bỏ khóa JWT mặc định trong cấu hình

- **ID:** FIX-001
- **Mức độ:** Critical
- **Loại:** Security
- **Phạm vi:** BACKEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** application.yml có fallback khóa ký cố định; rủi ro giả mạo JWT nếu môi trường không ghi đè.
- **Nguyên nhân:** validateSigningKey kiểm tra định dạng/độ dài, không ngăn dùng khóa đã nằm trong source.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [application.yml](backend/src/main/resources/application.yml); [JwtTokenProvider.java](backend/src/main/java/com/sports/security/JwtTokenProvider.java).
- **Điểm xử lý:** JwtTokenProvider.validateSigningKey/getSigningKey; app.jwt.secret.
- **Hành vi mong muốn:** Không khởi động bằng khóa fallback; JWT ký bằng khóa cũ không dùng được sau xoay khóa có kiểm soát.
- **Cách sửa đề xuất — Backend:** Bắt buộc cung cấp JWT_SECRET từ môi trường; thiếu khóa phải dừng khởi động; lập phương án xoay khóa và vô hiệu token cũ khi triển khai.
- **Cách sửa đề xuất — Frontend:** Không có thay đổi frontend thuộc task này.
- **Database:** Không đổi schema.
- **Security / Validation:** Không log khóa; từ chối khóa rỗng/sai định dạng; quyền vẫn lấy từ DB.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Không khởi động bằng khóa fallback; JWT ký bằng khóa cũ không dùng được sau xoay khóa có kiểm soát.
- **Cách kiểm thử sau sửa:** Kiểm tra thiếu/sai/đúng biến môi trường và token cũ trên môi trường test.

### FIX-002 — Hoàn thiện tạo link thanh toán PayOS

- **ID:** FIX-002
- **Mức độ:** Critical
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Đơn PayOS chỉ được gán payosOrderCode; không gọi gateway và không điền checkoutUrl/qrCode.
- **Nguyên nhân:** PayOSService mới có hàm chữ ký, không có tạo/truy vấn link.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [PayOSService.java](backend/src/main/java/com/sports/service/PayOSService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [PaymentController.java](backend/src/main/java/com/sports/controller/PaymentController.java); [OrderResponse.java](backend/src/main/java/com/sports/dto/OrderResponse.java); [QRPaymentPage.jsx](frontend/src/pages/QRPaymentPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [orderApi.js](frontend/src/api/orderApi.js).
- **Điểm xử lý:** OrderService.createOrder; PayOSService.createSignatureForPaymentLink; PaymentController; phương thức tạo/truy vấn link mới (đề xuất).
- **Hành vi mong muốn:** Đơn hợp lệ nhận link thực; timeout không tạo đơn mới hoặc trừ kho lần hai.
- **Cách sửa đề xuất — Backend:** Tạo/truy vấn link cho đơn đã được lưu và giữ kho; timeout phải tra cứu theo mã trước khi thử lại; không giữ transaction DB qua cuộc gọi HTTP.
- **Cách sửa đề xuất — Frontend:** Gọi tạo link sau khi có orderId; hiển thị chờ, retry trên cùng đơn; dùng checkoutUrl đã xác minh.
- **Database:** PaymentAttempt liên kết Order, unique mã gateway/paymentLinkId, trạng thái và thời điểm.
- **Security / Validation:** Chủ đơn; chỉ PAYOS_VIETQR/PENDING/chưa hết hạn; số tiền từ DB, VND nguyên và trong giới hạn gateway.
- **Dependency:** FIX-001, FIX-018, FIX-054
- **API:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Đơn hợp lệ nhận link thực; timeout không tạo đơn mới hoặc trừ kho lần hai.
- **Cách kiểm thử sau sửa:** Mock HTTP lỗi/timeout và fixture gateway; thử môi trường thanh toán được cấp riêng.

### FIX-003 — Lưu giao dịch và đối soát thanh toán muộn

- **ID:** FIX-003
- **Mức độ:** High
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Callback muộn/đơn đã hủy chỉ bị từ chối và ghi log; admin payments dựng từ đơn, thiếu transaction reference thật.
- **Nguyên nhân:** Không có payment ledger, hàng đợi đối soát hoặc dấu vết kết quả xử lý.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [PaymentController.java](backend/src/main/java/com/sports/controller/PaymentController.java); [AdminPaymentController.java](backend/src/main/java/com/sports/controller/AdminPaymentController.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java); [AdminPaymentsPage.jsx](frontend/src/pages/AdminPaymentsPage.jsx); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx); [adminApi.js](frontend/src/api/adminApi.js).
- **Điểm xử lý:** PaymentController.handlePayOSWebhook; OrderService.handlePaymentSuccess; AdminPaymentController.getAllPayments.
- **Hành vi mong muốn:** Webhook lặp không trừ kho hai lần; tiền nhận muộn có hồ sơ đối soát; lỗi commit không mất khả năng xử lý lại.
- **Cách sửa đề xuất — Backend:** Lưu sự kiện đã xác minh và reference; áp dụng idempotency, đối soát số tiền; giao dịch muộn chuyển NEEDS_REVIEW, không hồi sinh đơn đã hủy.
- **Cách sửa đề xuất — Frontend:** Hiển thị giao dịch thật và trường hợp cần xử lý; phân biệt tiền đã nhận với trạng thái giao hàng.
- **Database:** PaymentAttempt/PaymentEvent với unique reference theo gateway, paidAt, amount, reviewReason; khóa cập nhật.
- **Security / Validation:** Giữ HMAC, so sánh amount, khóa order; không tin return query hay client; admin không tự đánh PAID.
- **Dependency:** FIX-002
- **API:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Webhook lặp không trừ kho hai lần; tiền nhận muộn có hồ sơ đối soát; lỗi commit không mất khả năng xử lý lại.
- **Cách kiểm thử sau sửa:** Callback lặp/đồng thời/sai tiền/đơn hủy; giả lập lỗi DB sau gateway thành công và thử lại.

### FIX-004 — Sửa trang QR và đường dẫn trả về thanh toán

- **ID:** FIX-004
- **Mức độ:** High
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Return URL /orders/success không có orderId; /orders/cancel có thể khớp route order detail; qrCode được dùng như URL ảnh.
- **Nguyên nhân:** Chưa thống nhất route, mã đơn nội bộ và payload QR.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [PayOSService.java](backend/src/main/java/com/sports/service/PayOSService.java); [application.yml](backend/src/main/resources/application.yml); [App.jsx](frontend/src/App.jsx); [QRPaymentPage.jsx](frontend/src/pages/QRPaymentPage.jsx); [OrderSuccessPage.jsx](frontend/src/pages/OrderSuccessPage.jsx); [orderApi.js](frontend/src/api/orderApi.js).
- **Điểm xử lý:** PayOSService.returnUrl/cancelUrl; đường dẫn frontend return/cancel.
- **Hành vi mong muốn:** Reload/mở trực tiếp/back/đóng cửa sổ vẫn xem đúng đơn; cancel redirect không tự hủy đơn.
- **Cách sửa đề xuất — Backend:** Dùng return/cancel URL có orderId nội bộ; lưu mapping mã gateway; URL không phải bằng chứng thanh toán.
- **Cách sửa đề xuất — Frontend:** Dùng /order-success/:orderId và /payment/qr/:orderId?cancelled=1; fetch lại order; render qrPayload thành QR, không gán payload thô vào img.src.
- **Database:** Đọc mapping FIX-002, không thêm bảng riêng.
- **Security / Validation:** Kiểm tra owner khi fetch; callback/query giả không thay đổi payment status.
- **Dependency:** FIX-002, FIX-003
- **API:** Nhóm PAYMENT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Reload/mở trực tiếp/back/đóng cửa sổ vẫn xem đúng đơn; cancel redirect không tự hủy đơn.
- **Cách kiểm thử sau sửa:** Thử return trước/sau webhook, query status giả, QR payload không phải URL.

### FIX-005 — Sửa lỗi render trang băng chặn mồ hôi

- **ID:** FIX-005
- **Mức độ:** High
- **Loại:** Bug
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** JSX dùng Award nhưng không import/khai báo; tab mặc định có thể gây ReferenceError.
- **Nguyên nhân:** Thiếu import icon trong component.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Trang và tab mô tả render được khi API trả sản phẩm.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Bổ sung đúng icon hoặc dùng icon có sẵn; giữ giao diện và luồng hiện có.
- **Database:** Không đổi.
- **Security / Validation:** Không áp dụng backend.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Trang và tab mô tả render được khi API trả sản phẩm.
- **Cách kiểm thử sau sửa:** Mở trực tiếp sản phẩm sweatband, đổi tab, kiểm tra console.

### FIX-006 — Giữ đầy đủ tùy chọn từ chi tiết đến đơn hàng

- **ID:** FIX-006
- **Mức độ:** High
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** normalizeOptions loại gauge/stringing/texture/feather/speed/pack/variant/addon/customPrint; lựa chọn bị mất hoặc gộp dòng sai.
- **Nguyên nhân:** Tên option không thống nhất; checkout chỉ gửi vài chuỗi và ghép phần khác vào note.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [OrderItemRequest.java](backend/src/main/java/com/sports/dto/OrderItemRequest.java); [OrderItemResponse.java](backend/src/main/java/com/sports/dto/OrderItemResponse.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderItem.java](backend/src/main/java/com/sports/entity/OrderItem.java); [CartContext.jsx](frontend/src/context/CartContext.jsx); [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [ShuttlecockDetailPage.jsx](frontend/src/pages/ShuttlecockDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx).
- **Điểm xử lý:** OrderService.reserveItem/toDto; OrderItemRequest/Response.
- **Hành vi mong muốn:** Mỗi lựa chọn có ảnh hưởng giao hàng được giữ qua reload và tạo đơn; không gộp sai dòng.
- **Cách sửa đề xuất — Backend:** Nhận variantId và serviceSelection theo schema chuẩn; snapshot lựa chọn đã xác minh; không nhận option tự do làm căn cứ giá.
- **Cách sửa đề xuất — Frontend:** Chuẩn hóa mọi trang dùng cùng variantId/serviceSelection và line key; chuyển cart cũ an toàn, yêu cầu chọn lại khi thiếu.
- **Database:** OrderItem lưu variantId nullable cho dữ liệu cũ và optionsSnapshot.
- **Security / Validation:** Variant thuộc product, active, tổ hợp hợp lệ; note không thay cho định danh biến thể.
- **Dependency:** FIX-007, FIX-008
- **API:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Mỗi lựa chọn có ảnh hưởng giao hàng được giữ qua reload và tạo đơn; không gộp sai dòng.
- **Cách kiểm thử sau sửa:** Chạy bảng test 5 loại sản phẩm với lựa chọn khác nhau và cart cũ.

### FIX-007 — Biến thể, giá và tồn kho theo SKU bán được

- **ID:** FIX-007
- **Mức độ:** High
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Chỉ có stock/price cấp Product; size/màu/3U-G5 hardcode; sweatband tự cộng giá trên client nhưng backend tính giá Product.
- **Nguyên nhân:** Chưa có ProductVariant và nguồn dữ liệu lựa chọn chuẩn.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [Product.java](backend/src/main/java/com/sports/entity/Product.java); [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [ProductRepository.java](backend/src/main/java/com/sports/repository/ProductRepository.java); [ProductDto.java](backend/src/main/java/com/sports/dto/ProductDto.java); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx); [ProductCard.jsx](frontend/src/components/ProductCard.jsx); [CartContext.jsx](frontend/src/context/CartContext.jsx).
- **Điểm xử lý:** ProductService.createProduct/updateProduct; OrderService.lockProduct/reserveItem/settleReservedStock.
- **Hành vi mong muốn:** Không mua biến thể không tồn tại/ngừng bán; hai người mua chiếc cuối chỉ một đơn thành công.
- **Cách sửa đề xuất — Backend:** Bổ sung variant có SKU, attributes, price, stock, reservedStock, active; giữ khóa/transaction; kế hoạch chuyển mỗi SKU cũ sang một variant mặc định.
- **Cách sửa đề xuất — Frontend:** Admin quản lý tổ hợp thực; khách chọn đúng biến thể; giá và hết hàng lấy từ API, không cộng giá giả.
- **Database:** ProductVariant FK Product, SKU unique, unique tổ hợp chuẩn hóa; backfill có đối chiếu kho cũ; không tự chia stock cho các màu/size.
- **Security / Validation:** Giá dương, stock nguyên không âm; variant thuộc Product; tổng stock khả dụng+reserved có giới hạn.
- **Dependency:** FIX-021, FIX-045, FIX-055
- **API:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Không mua biến thể không tồn tại/ngừng bán; hai người mua chiếc cuối chỉ một đơn thành công.
- **Cách kiểm thử sau sửa:** Integration MySQL tranh mua, admin sửa kho đồng thời; E2E size/màu/weight/grip.

### FIX-008 — Dịch vụ căng cước và phụ phí có dữ liệu thật

Phần frontend bao gồm cả cấu hình dịch vụ trong [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx) qua [adminApi.js](frontend/src/api/adminApi.js), không chỉ các selector phía khách.

- **ID:** FIX-008
- **Mức độ:** High
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** UI chọn loại cước/mức căng và thông báo miễn phí, backend chỉ lưu chuỗi; không định giá dịch vụ hoặc kiểm tra sức căng.
- **Nguyên nhân:** Cấu hình dịch vụ nằm trong JSX, chưa có bảng giá và giới hạn kỹ thuật có đơn vị.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderItemRequest.java](backend/src/main/java/com/sports/dto/OrderItemRequest.java); [OrderItem.java](backend/src/main/java/com/sports/entity/OrderItem.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java); [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx).
- **Điểm xử lý:** OrderService.reserveItem/calculateOrderTotal; DTO serviceSelection đề xuất.
- **Hành vi mong muốn:** Tổng tiền bao gồm đúng phí đã xác nhận; yêu cầu kỹ thuật xuất hiện trong đơn admin.
- **Cách sửa đề xuất — Backend:** Định nghĩa danh mục dịch vụ tối thiểu với stringVariantId, tensionLbs, laborFee; tính giá tại server; quản lý vật tư nếu bán kèm.
- **Cách sửa đề xuất — Frontend:** Chỉ hiện dịch vụ thật; hiển thị giá cước/công riêng và yêu cầu kỹ thuật trên đơn; nếu chưa cung cấp thì không cho chọn.
- **Database:** ServiceOption và snapshot phí/thông số trong OrderItem; vật tư liên kết variant khi cần trừ kho.
- **Security / Validation:** Căng không vượt maxTensionLbs; đơn vị thống nhất; cước tương thích/active/còn kho.
- **Dependency:** FIX-007
- **API:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Tổng tiền bao gồm đúng phí đã xác nhận; yêu cầu kỹ thuật xuất hiện trong đơn admin.
- **Cách kiểm thử sau sửa:** Chọn không căng/có căng, vượt sức căng, cước hết hàng, sửa phí client.

### FIX-009 — Không báo thêm giỏ thành công hoặc mua nhầm giỏ khi thêm thất bại

- **ID:** FIX-009
- **Mức độ:** High
- **Loại:** Bug
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Handler bỏ qua null từ addToCart; buyNow gửi selectedItemIds undefined khiến checkout chọn toàn giỏ.
- **Nguyên nhân:** Không kiểm tra kết quả thao tác và mặc định selection quá rộng.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [ShuttlecockDetailPage.jsx](frontend/src/pages/ShuttlecockDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx); [CartPage.jsx](frontend/src/pages/CartPage.jsx); [ComparePage.jsx](frontend/src/pages/ComparePage.jsx); [AiChatbotWidget.jsx](frontend/src/components/AiChatbotWidget.jsx); [CartContext.jsx](frontend/src/context/CartContext.jsx).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Thêm thất bại không có toast thành công; mua ngay không thanh toán những dòng cũ ngoài ý muốn.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Kiểm tra kết quả ở mọi điểm thêm; chỉ điều hướng khi có lineId; lỗi phải giữ nguyên selection và cho biết thiếu kho/chưa chọn variant.
- **Database:** Không đổi.
- **Security / Validation:** Số lượng nguyên 1..100, yêu cầu chọn biến thể trước khi thêm.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Thêm thất bại không có toast thành công; mua ngay không thanh toán những dòng cũ ngoài ý muốn.
- **Cách kiểm thử sau sửa:** Giỏ đã có sản phẩm A, mua ngay B hết hàng; double click; thêm từ chat/compare/related.

### FIX-010 — Combo quấn cán không dùng sản phẩm giả

- **ID:** FIX-010
- **Mức độ:** Medium
- **Loại:** Bug
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** handleAddCombo dựng product id 99901 không có stock thật, rồi báo thành công.
- **Nguyên nhân:** Combo minh họa chưa nối catalog.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Không phát sinh cart item giả hoặc toast sai.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Thay bằng các SKU thật lấy từ catalog khi cấu hình có sẵn; trước mắt hiển thị chưa hỗ trợ và không thêm dummy vào giỏ.
- **Database:** Không đổi trong phương án tối thiểu.
- **Security / Validation:** Mọi ID mua được phải tồn tại và đủ kho.
- **Dependency:** FIX-009
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Không phát sinh cart item giả hoặc toast sai.
- **Cách kiểm thử sau sửa:** Nhấn combo, reload giỏ, đối chiếu ID với API.

### FIX-011 — Không tạo review giả khi API lỗi

- **ID:** FIX-011
- **Mức độ:** High
- **Loại:** Bug
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** catch tạo fallbackRev bằng Date.now và báo thành công dù server từ chối.
- **Nguyên nhân:** Nhánh lỗi dùng dữ liệu giả thay cho error state.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** API thất bại không làm tăng số review hoặc xóa nội dung đang viết.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Giữ comment/rating để thử lại, hiển thị lỗi; chỉ thêm response server vào danh sách khi thành công.
- **Database:** Không đổi.
- **Security / Validation:** 401 yêu cầu đăng nhập; 400/403/409 hiển thị lý do.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** API thất bại không làm tăng số review hoặc xóa nội dung đang viết.
- **Cách kiểm thử sau sửa:** Mock 401/403/500/timeout; gửi thành công rồi reload.

### FIX-012 — Review gắn với lần mua và chống trùng

- **ID:** FIX-012
- **Mức độ:** Medium
- **Loại:** Validation
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Người đăng nhập có thể review sản phẩm chưa mua và gửi nhiều lần.
- **Nguyên nhân:** Chỉ kiểm tra user/product tồn tại, không liên kết OrderItem.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ReviewService.java](backend/src/main/java/com/sports/service/ReviewService.java); [ReviewRequest.java](backend/src/main/java/com/sports/dto/ReviewRequest.java); [ReviewResponse.java](backend/src/main/java/com/sports/dto/ReviewResponse.java); [Review.java](backend/src/main/java/com/sports/entity/Review.java); [ReviewRepository.java](backend/src/main/java/com/sports/repository/ReviewRepository.java); [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx); [ReviewedProductsPage.jsx](frontend/src/pages/ReviewedProductsPage.jsx); [reviewApi.js](frontend/src/api/reviewApi.js).
- **Điểm xử lý:** ReviewService.addReview/toDto; ReviewController.addReview và endpoint sửa/xóa/eligible đề xuất.
- **Hành vi mong muốn:** Mua chưa hoàn tất bị chặn; gửi trùng đồng thời chỉ một review; sửa/xóa đúng owner.
- **Cách sửa đề xuất — Backend:** Yêu cầu orderItemId thuộc đơn COMPLETED của user; unique mỗi orderItem; bổ sung sửa/xóa review của chính chủ.
- **Cách sửa đề xuất — Frontend:** Hiển thị lựa chọn dòng hàng đủ điều kiện và trạng thái đã review; không tin userFullName gửi client.
- **Database:** Review FK order_item, unique(order_item_id); review cũ đánh dấu chưa xác minh, không tự gán đơn.
- **Security / Validation:** Rating 1..5, comment sau sanitize không rỗng và <=2000 ký tự, ownership.
- **Dependency:** FIX-011, FIX-020
- **API:** Nhóm REVIEW trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Mua chưa hoàn tất bị chặn; gửi trùng đồng thời chỉ một review; sửa/xóa đúng owner.
- **Cách kiểm thử sau sửa:** API test chưa mua/khác user/rating biên/trùng và E2E review sau mua.

### FIX-013 — Đồng bộ trạng thái và dữ liệu đổi trả trên UI

- **ID:** FIX-013
- **Mức độ:** High
- **Loại:** Integration
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Frontend gửi IN_REVIEW/lọc RECEIVED nhưng enum backend là PENDING/APPROVED/REJECTED/COMPLETED; đọc customerName thay userFullName.
- **Nguyên nhân:** UI dựa mô hình demo khác backend.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [ReturnRequestPage.jsx](frontend/src/pages/ReturnRequestPage.jsx); [adminApi.js](frontend/src/api/adminApi.js); [returnApi.js](frontend/src/api/returnApi.js).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Admin cập nhật được trạng thái hợp lệ; tab của khách hiển thị đúng tất cả yêu cầu.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Dùng enum backend hiện có, userFullName và dữ liệu đơn thật; trạng thái lỗi giữ nguyên, không tự chuyển timeline.
- **Database:** Không đổi.
- **Security / Validation:** Không gửi enum lạ; chỉ hiện hành động phù hợp.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Admin cập nhật được trạng thái hợp lệ; tab của khách hiển thị đúng tất cả yêu cầu.
- **Cách kiểm thử sau sửa:** Mỗi trạng thái và response field; 400/409 không đổi UI.

### FIX-014 — Quy tắc đổi trả và hoàn tiền có kiểm soát

- **ID:** FIX-014
- **Mức độ:** High
- **Loại:** Validation
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Tạo đổi trả chỉ kiểm tra ownership; updateStatus chấp nhận chuyển bất kỳ; chưa có hoàn tiền hay hoàn kho hàng trả.
- **Nguyên nhân:** Thiếu điều kiện đủ hạn, chống trùng và quy trình xử lý sau duyệt.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ReturnService.java](backend/src/main/java/com/sports/service/ReturnService.java); [ReturnController.java](backend/src/main/java/com/sports/controller/ReturnController.java); [ReturnRequest.java](backend/src/main/java/com/sports/entity/ReturnRequest.java); [ReturnCreateRequest.java](backend/src/main/java/com/sports/dto/ReturnCreateRequest.java); [ReturnRequestPage.jsx](frontend/src/pages/ReturnRequestPage.jsx); [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [AdminPaymentsPage.jsx](frontend/src/pages/AdminPaymentsPage.jsx).
- **Điểm xử lý:** ReturnService.createReturnRequest/updateStatus/toDto; ReturnController.updateStatus.
- **Hành vi mong muốn:** Đơn chưa giao/ngoài hạn/trùng bị chặn; không chuyển lùi; hoàn tiền và nhập lại kho có dấu vết riêng.
- **Cách sửa đề xuất — Backend:** Chốt chính sách returnWindowDays; chỉ cho đơn COMPLETED; PENDING→APPROVED/REJECTED, APPROVED→COMPLETED; hoàn tiền thủ công có bằng chứng giao dịch, hoàn kho chỉ sau kiểm nhận.
- **Cách sửa đề xuất — Frontend:** Form chỉ chọn đơn đủ điều kiện, theo dõi trạng thái và lý do; admin nhập bằng chứng hoàn tiền, không gọi duyệt là đã hoàn tiền.
- **Database:** Return thêm processedAt; RefundRecord với amount/reference/status; unique yêu cầu đang hoạt động theo order; lịch sử nhập lại kho.
- **Security / Validation:** Không vượt số tiền đã nhận/trừ refund trước; không hoàn tiền/kho hai lần; quyền admin.
- **Dependency:** FIX-003, FIX-013, FIX-039
- **API:** Nhóm RETURN trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Đơn chưa giao/ngoài hạn/trùng bị chặn; không chuyển lùi; hoàn tiền và nhập lại kho có dấu vết riêng.
- **Cách kiểm thử sau sửa:** Test các cặp trạng thái, duplicate concurrent, refund lặp, hàng không đủ điều kiện nhập lại.

### FIX-015 — Địa chỉ có cấu trúc và checkout chọn đúng địa chỉ

- **ID:** FIX-015
- **Mức độ:** High
- **Loại:** Bug
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Sửa địa chỉ ghép chuỗi lần nữa và giữ địa phương mặc định; checkout tải danh sách nhưng không có selector/saveInfo thật.
- **Nguyên nhân:** DB chỉ có address/province; form detail lại nhận địa chỉ đầy đủ.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ShippingAddressDto.java](backend/src/main/java/com/sports/dto/ShippingAddressDto.java); [ShippingAddress.java](backend/src/main/java/com/sports/entity/ShippingAddress.java); [ShippingAddressService.java](backend/src/main/java/com/sports/service/ShippingAddressService.java); [ShippingAddressPage.jsx](frontend/src/pages/ShippingAddressPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [shippingAddressApi.js](frontend/src/api/shippingAddressApi.js).
- **Điểm xử lý:** ShippingAddressService.createAddress/updateAddress/toDto; ShippingAddressDto.
- **Hành vi mong muốn:** Sửa/lưu nhiều lần không nhân đôi địa chỉ; checkout dùng đúng địa chỉ được chọn.
- **Cách sửa đề xuất — Backend:** Lưu addressLine/provinceCode/wardCode và districtCode tùy hệ địa chỉ; giữ legacy address cho dữ liệu cũ, không đoán tách chuỗi.
- **Cách sửa đề xuất — Frontend:** Nạp lại đúng các trường; thêm selector; saveInfo thực sự gọi API; không ép quận/huyện nếu hệ địa chỉ không cần.
- **Database:** Bổ sung trường cấu trúc, nhãn tùy chọn; bảo toàn address cũ.
- **Security / Validation:** Phone đúng regex không có ký tự |; kiểm tra địa bàn theo bộ dữ liệu được shop chọn; owner từ JWT.
- **Dependency:** Không.
- **API:** Nhóm ADDRESS trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Sửa/lưu nhiều lần không nhân đôi địa chỉ; checkout dùng đúng địa chỉ được chọn.
- **Cách kiểm thử sau sửa:** Tạo/sửa địa chỉ ngoài TP.HCM, legacy, ký tự |, thiếu phường và đổi default.

### FIX-016 — Bảo đảm một địa chỉ mặc định khi thao tác đồng thời

- **ID:** FIX-016
- **Mức độ:** Medium
- **Loại:** Bug
- **Phạm vi:** BACKEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Bulk resetDefault và entity đang managed có nguy cơ stale state; thao tác đồng thời chưa khóa theo user. Đây là rủi ro cần tái hiện MySQL.
- **Nguyên nhân:** Bulk JPQL không đồng bộ persistence context, không ràng buộc duy nhất mặc định.
- **Bằng chứng và giới hạn:** Rủi ro từ phân tích tĩnh; cần xác minh bằng kiểm thử/schema/log được cấp quyền.
- **File liên quan:** [ShippingAddressService.java](backend/src/main/java/com/sports/service/ShippingAddressService.java); [ShippingAddressRepository.java](backend/src/main/java/com/sports/repository/ShippingAddressRepository.java); [UserRepository.java](backend/src/main/java/com/sports/repository/UserRepository.java).
- **Điểm xử lý:** ShippingAddressService.setDefaultAddress/createAddress/deleteAddress; resetDefaultAddressForUser.
- **Hành vi mong muốn:** User có địa chỉ thì đúng một mặc định; user không có địa chỉ thì không có mặc định.
- **Cách sửa đề xuất — Backend:** Khóa user trong thao tác default; cập nhật entity/context nhất quán; định nghĩa khi xóa địa chỉ cuối hoặc chọn lại địa chỉ hiện tại.
- **Cách sửa đề xuất — Frontend:** Không có thay đổi frontend thuộc task này.
- **Database:** Cân nhắc default_address_id trên user hoặc invariant trong transaction; kiểm tra dữ liệu cũ trước migration.
- **Security / Validation:** Owner; addressId thuộc user; idempotent khi chọn lại.
- **Dependency:** FIX-015
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** User có địa chỉ thì đúng một mặc định; user không có địa chỉ thì không có mặc định.
- **Cách kiểm thử sau sửa:** Integration chọn lại default hiện tại, hai request khác nhau đồng thời, xóa default.

### FIX-017 — Checkout dùng báo giá server và validation đầy đủ

- **ID:** FIX-017
- **Mức độ:** High
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** UI tính tổng trên giá snapshot; email/địa phương chưa được xử lý đầy đủ; không có quote thống nhất.
- **Nguyên nhân:** Tính shipping/voucher lặp ở client và server; dữ liệu cart có thể cũ.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderCreateRequest.java](backend/src/main/java/com/sports/dto/OrderCreateRequest.java); [OrderController.java](backend/src/main/java/com/sports/controller/OrderController.java); [VoucherService.java](backend/src/main/java/com/sports/service/VoucherService.java); [CartPage.jsx](frontend/src/pages/CartPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [orderApi.js](frontend/src/api/orderApi.js); [voucherApi.js](frontend/src/api/voucherApi.js).
- **Điểm xử lý:** OrderService.calculateOrderTotal/createOrder; endpoint quote đề xuất, dùng cùng hàm tính tiền.
- **Hành vi mong muốn:** Tổng tiền trên xác nhận khớp server; giá đổi giữa quote/create không âm thầm thu khác.
- **Cách sửa đề xuất — Backend:** Thêm POST /orders/quote dùng chung tính tiền với createOrder; quote không giữ kho/voucher; create kiểm tra lại và so expectedTotal, trả conflict nếu giá đổi.
- **Cách sửa đề xuất — Frontend:** Làm mới báo giá khi items/address/voucher thay đổi; báo sản phẩm ngừng bán/hết hàng; khách xác nhận giá mới; không gửi discount tự tính.
- **Database:** Không cần bảng quote; email nhận đơn snapshot nếu cung cấp.
- **Security / Validation:** Giới hạn số dòng, note, tên, số điện thoại; shippingMethod=STANDARD giai đoạn đầu; dữ liệu client không quyết định giá.
- **Dependency:** FIX-006, FIX-015, FIX-023, FIX-054
- **API:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Tổng tiền trên xác nhận khớp server; giá đổi giữa quote/create không âm thầm thu khác.
- **Cách kiểm thử sau sửa:** Sửa giá/discount/fee DevTools; voucher hết hạn; stock đổi; network mất khi quote.

### FIX-018 — Chống tạo đơn trùng bằng idempotency

- **ID:** FIX-018
- **Mức độ:** High
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Khóa user và giới hạn 3 đơn pending không ngăn cùng yêu cầu tạo ra nhiều đơn.
- **Nguyên nhân:** Không có khóa idempotency lưu phía server.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [OrderController.java](backend/src/main/java/com/sports/controller/OrderController.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java); [SecurityConfig.java](backend/src/main/java/com/sports/security/SecurityConfig.java); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [orderApi.js](frontend/src/api/orderApi.js).
- **Điểm xử lý:** OrderController.createOrder; OrderService.createOrder/lockOrderingUser; SecurityConfig.corsConfigurationSource.
- **Hành vi mong muốn:** Hai request cùng key chỉ một order và một lần giữ kho/voucher.
- **Cách sửa đề xuất — Backend:** Unique(userId,idempotencyKey), hash payload và orderId trong cùng transaction; replay cùng body trả đơn cũ; key khác body trả 409; cho phép header trong CORS.
- **Cách sửa đề xuất — Frontend:** Tạo UUID cho một lần xác nhận giỏ; giữ key khi retry/timeout/reload; khi thay đổi nội dung cần key mới, disable submit trong lúc gửi.
- **Database:** Order bổ sung idempotencyKey/requestHash với unique composite.
- **Security / Validation:** Key UUID; xác thực user; lookup replay trước kiểm tra pending limit.
- **Dependency:** Không.
- **API:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Hai request cùng key chỉ một order và một lần giữ kho/voucher.
- **Cách kiểm thử sau sửa:** Concurrent cùng key, khác body, timeout sau commit, retry khi đã đủ 3 đơn pending.

### FIX-019 — Trang kết quả và đơn hàng dùng đúng response

- **ID:** FIX-019
- **Mức độ:** Medium
- **Loại:** Bug
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** OrderSuccess đọc item.name/imageUrl thay productName/productImageUrl; link /user/orders sai; thời gian/phí/mô tả mẫu và danh sách chỉ dòng đầu gây hiểu nhầm.
- **Nguyên nhân:** Màn hình còn mapper theo demo và fallback giả.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [OrderSuccessPage.jsx](frontend/src/pages/OrderSuccessPage.jsx); [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx); [formatters.js](frontend/src/utils/formatters.js).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Reload vẫn hiện cùng thông tin và tổng tiền; đơn nhiều dòng không mất hàng.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Sửa mapper và route /my-orders; hiện đủ item, shippingFee/discountAmount/voucherCode/createdAt thật; COD chưa thu tiền không ghi đã thanh toán.
- **Database:** Không đổi.
- **Security / Validation:** Đơn không tồn tại/khác owner không dùng state cũ giả thành công.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Reload vẫn hiện cùng thông tin và tổng tiền; đơn nhiều dòng không mất hàng.
- **Cách kiểm thử sau sửa:** COD/PayOS, đơn 3 dòng, có/không voucher, 403/404.

### FIX-020 — Snapshot lịch sử sản phẩm trong OrderItem

- **ID:** FIX-020
- **Mức độ:** Medium
- **Loại:** Bug
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Giá đã snapshot nhưng tên/ảnh/brand/weightGrip lấy Product hiện tại; sửa catalog làm lịch sử đơn đổi.
- **Nguyên nhân:** DTO đọc quan hệ Product khi hiển thị lịch sử.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [OrderItem.java](backend/src/main/java/com/sports/entity/OrderItem.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderItemResponse.java](backend/src/main/java/com/sports/dto/OrderItemResponse.java); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx); [OrderSuccessPage.jsx](frontend/src/pages/OrderSuccessPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx).
- **Điểm xử lý:** OrderService.reserveItem/toDto; OrderItem.
- **Hành vi mong muốn:** Sửa tên/ảnh hoặc ngừng bán sản phẩm không thay đổi đơn mới đã tạo.
- **Cách sửa đề xuất — Backend:** Snapshot tên/SKU/brand/ảnh/options lúc tạo; backfill dữ liệu cũ có nhãn không bảo đảm khôi phục lịch sử nguyên bản.
- **Cách sửa đề xuất — Frontend:** Tiếp tục dùng productName/productImageUrl từ order; không fetch catalog để thay thông tin lịch sử.
- **Database:** Thêm trường snapshot trong order_items, giữ FK và không cascade xóa đơn.
- **Security / Validation:** Không nhận snapshot giá/tên từ client.
- **Dependency:** Không.
- **API:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Sửa tên/ảnh hoặc ngừng bán sản phẩm không thay đổi đơn mới đã tạo.
- **Cách kiểm thử sau sửa:** Tạo đơn rồi đổi catalog; đọc chi tiết khách/admin.

### FIX-021 — Lưu đầy đủ thuộc tính và bộ ảnh sản phẩm

- **ID:** FIX-021
- **Mức độ:** High
- **Loại:** Bug
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** DTO/entity có nhiều thuộc tính nhưng create/update chỉ map core và vài trường vợt; imageUrls không được lưu.
- **Nguyên nhân:** Mapping viết chưa đầy đủ; form admin chỉ hỗ trợ phần nhỏ.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [ProductDto.java](backend/src/main/java/com/sports/dto/ProductDto.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java); [ProductImage.java](backend/src/main/java/com/sports/entity/ProductImage.java); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [ShuttlecockDetailPage.jsx](frontend/src/pages/ShuttlecockDetailPage.jsx); [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx).
- **Điểm xử lý:** ProductService.createProduct/updateProduct/toDto/getProductImages.
- **Hành vi mong muốn:** Lưu rồi GET lại không mất thông số/ảnh; dữ liệu nhóm sản phẩm khác không bị xóa ngoài ý muốn.
- **Cách sửa đề xuất — Backend:** Map các trường được hỗ trợ; update ảnh có thứ tự trong transaction; phân biệt null bỏ qua và [] xóa gallery; tài liệu rõ.
- **Cách sửa đề xuất — Frontend:** Form theo nhóm sản phẩm; gửi đúng trường; gallery đọc imageUrls từ API và fallback ảnh chính.
- **Database:** Giữ Product/ProductImage; thêm createdAt/updatedAt theo FIX-045.
- **Security / Validation:** Độ dài tương ứng column, JSON sizes hợp lệ, URL ảnh được cho phép, giá gốc>=giá bán.
- **Dependency:** Không.
- **API:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Lưu rồi GET lại không mất thông số/ảnh; dữ liệu nhóm sản phẩm khác không bị xóa ngoài ý muốn.
- **Cách kiểm thử sau sửa:** Round-trip toàn bộ trường vợt/giày/áo/túi/phụ kiện; gallery nhiều ảnh/[]/null.

### FIX-022 — Ngừng bán và xóa catalog an toàn

- **ID:** FIX-022
- **Mức độ:** Medium
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Product/category delete thẳng có thể lỗi FK; chưa có active/inactive dù có nút trạng thái.
- **Nguyên nhân:** Thiếu vòng đời catalog; lịch sử đơn phụ thuộc Product.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [Product.java](backend/src/main/java/com/sports/entity/Product.java); [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [CategoryService.java](backend/src/main/java/com/sports/service/CategoryService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ProductCard.jsx](frontend/src/components/ProductCard.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx).
- **Điểm xử lý:** ProductService.deleteProduct; CategoryService.deleteCategory; OrderService.reserveItem.
- **Hành vi mong muốn:** Không mất lịch sử; delete bị ràng buộc trả lỗi rõ; ngừng bán loại khỏi catalog public.
- **Cách sửa đề xuất — Backend:** Thêm active; xóa sản phẩm có lịch sử trả 409, ưu tiên ngừng bán; category còn product trả 409; createOrder kiểm tra active.
- **Cách sửa đề xuất — Frontend:** Nút ngừng bán gọi API thật; xác nhận delete; hiển thị conflict thay thông báo chung; cart đánh dấu không mua được.
- **Database:** Product.active default true; không cascade sang order/review.
- **Security / Validation:** Admin write; user không mua active=false; preserve historical FK.
- **Dependency:** FIX-020
- **API:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Không mất lịch sử; delete bị ràng buộc trả lỗi rõ; ngừng bán loại khỏi catalog public.
- **Cách kiểm thử sau sửa:** Xóa product có order/images/review; category còn product; checkout khi admin disable.

### FIX-023 — Voucher không làm tăng tiền và sửa/tắt được thật

- **ID:** FIX-023
- **Mức độ:** High
- **Loại:** Validation
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** VoucherDto không constraints; maxDiscountAmount âm có thể tạo discount âm; update bỏ qua code/null; toggle UI chưa gọi API.
- **Nguyên nhân:** @Valid không hiệu lực nếu DTO không có rule; update semantics chưa rõ.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [VoucherDto.java](backend/src/main/java/com/sports/dto/VoucherDto.java); [VoucherService.java](backend/src/main/java/com/sports/service/VoucherService.java); [AdminVoucherController.java](backend/src/main/java/com/sports/controller/AdminVoucherController.java); [AdminVouchersPage.jsx](frontend/src/pages/AdminVouchersPage.jsx); [CartPage.jsx](frontend/src/pages/CartPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx).
- **Điểm xử lý:** VoucherService.createVoucher/updateVoucher/validateVoucher/reserveVoucher/releaseVoucher.
- **Hành vi mong muốn:** Voucher bất hợp lệ không được lưu/áp dụng; tắt và bỏ giới hạn phản ánh sau reload.
- **Cách sửa đề xuất — Backend:** Validate type FIXED/PERCENT, range và thời gian; discount trong [0,subtotal]; code bất biến sau tạo; update hỗ trợ xóa trường nullable bằng null và khóa cùng hàng voucher.
- **Cách sửa đề xuất — Frontend:** Không cho sửa code đã tạo; toggle isActive thật; form thể hiện lỗi trường và null để bỏ giới hạn.
- **Database:** Giữ unique code; không tin usedCount từ client; dùng lock cùng reserve/update.
- **Security / Validation:** PERCENT 0..100; tiền/limit không âm; maxUses>=usedCount; normalize code.
- **Dependency:** Không.
- **API:** Nhóm VOUCHER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Voucher bất hợp lệ không được lưu/áp dụng; tắt và bỏ giới hạn phản ánh sau reload.
- **Cách kiểm thử sau sửa:** maxDiscount=-1, type lạ, code trùng, update cùng reserve, toggle và null.

### FIX-024 — Điều kiện voucher theo thời gian, người dùng, sản phẩm

- **ID:** FIX-024
- **Mức độ:** Medium
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Chưa có startsAt, limit/user hay phạm vi category/product; tên mô tả voucher không tự áp điều kiện.
- **Nguyên nhân:** Mô hình chỉ tổng đơn/expiry/global count.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [Voucher.java](backend/src/main/java/com/sports/entity/Voucher.java); [VoucherService.java](backend/src/main/java/com/sports/service/VoucherService.java); [VoucherDto.java](backend/src/main/java/com/sports/dto/VoucherDto.java); [AdminVouchersPage.jsx](frontend/src/pages/AdminVouchersPage.jsx); [CartPage.jsx](frontend/src/pages/CartPage.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx).
- **Điểm xử lý:** VoucherService.validateVoucher/reserveVoucher/releaseVoucher; VoucherValidateRequest.
- **Hành vi mong muốn:** Hai tab không vượt hạn mức cá nhân; voucher giới hạn vợt không dùng cho giày.
- **Cách sửa đề xuất — Backend:** Bổ sung điều kiện khi shop dùng; validate dựa items DB và user JWT; reserve/release usage trong transaction.
- **Cách sửa đề xuất — Frontend:** Admin khai báo điều kiện; khách thấy lý do không áp dụng; chuyển preview từ orderTotal tự khai sang items.
- **Database:** VoucherUsage liên kết order/user và quan hệ phạm vi product/category; unique usage/order.
- **Security / Validation:** Không vượt global/per-user dưới concurrency; release idempotent; startsAt<=expiresAt.
- **Dependency:** FIX-023, FIX-017
- **API:** Nhóm VOUCHER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Hai tab không vượt hạn mức cá nhân; voucher giới hạn vợt không dùng cho giày.
- **Cách kiểm thử sau sửa:** Biên thời gian, category hỗn hợp, hai request đồng thời và hủy đơn.

### FIX-025 — Ngăn admin tự khóa hoặc khóa admin cuối

- **ID:** FIX-025
- **Mức độ:** High
- **Loại:** Security
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** updateUserStatus không biết người thao tác và không chặn self-lock.
- **Nguyên nhân:** Chỉ setIsActive theo id request.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [AdminUserController.java](backend/src/main/java/com/sports/controller/AdminUserController.java); [UserService.java](backend/src/main/java/com/sports/service/UserService.java); [AdminCustomersPage.jsx](frontend/src/pages/AdminCustomersPage.jsx); [adminApi.js](frontend/src/api/adminApi.js).
- **Điểm xử lý:** AdminUserController.updateUserStatus; UserService.updateUserStatus.
- **Hành vi mong muốn:** Không mất toàn bộ tài khoản quản trị do thao tác UI/API.
- **Cách sửa đề xuất — Backend:** Lấy currentUserId từ principal; chặn tự khóa và admin hoạt động cuối; khóa transaction để chống hai admin đồng thời.
- **Cách sửa đề xuất — Frontend:** Hiển thị role thật; disable thao tác tự khóa; xử lý lỗi 409; không dùng role làm hạng hội viên.
- **Database:** Không bắt buộc schema mới; truy vấn/khóa tập admin hoạt động.
- **Security / Validation:** Admin-only; userId từ principal, không từ body.
- **Dependency:** Không.
- **API:** Nhóm ADMINUSER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Không mất toàn bộ tài khoản quản trị do thao tác UI/API.
- **Cách kiểm thử sau sửa:** Admin tự khóa, khóa user, hai admin khóa nhau đồng thời.

### FIX-026 — Đăng ký/đăng nhập không tự tạo email giả

- **ID:** FIX-026
- **Mức độ:** Medium
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Frontend nhận email/phone, sinh username ngẫu nhiên và email phone@hgbadminton.vn; backend chỉ lookup username/email.
- **Nguyên nhân:** UI hứa đăng nhập phone rộng hơn implementation.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [AuthService.java](backend/src/main/java/com/sports/service/AuthService.java); [RegisterRequest.java](backend/src/main/java/com/sports/dto/RegisterRequest.java); [UserDetailsServiceImpl.java](backend/src/main/java/com/sports/security/UserDetailsServiceImpl.java); [LoginPage.jsx](frontend/src/pages/LoginPage.jsx); [RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx); [AuthContext.jsx](frontend/src/context/AuthContext.jsx).
- **Điểm xử lý:** AuthService.register/login; UserDetailsServiceImpl.loadUserByUsername.
- **Hành vi mong muốn:** Đăng ký cung cấp thông tin thật; thông báo trùng rõ; tài khoản cũ vẫn login username.
- **Cách sửa đề xuất — Backend:** Phương án tối thiểu giữ login username/email và register yêu cầu username/email thật; chuẩn hóa email; xử lý trùng đồng thời.
- **Cách sửa đề xuất — Frontend:** Form yêu cầu email thật và username; label đăng nhập đúng; không tự sinh thông tin liên hệ.
- **Database:** Giữ unique username/email; đối chiếu tài khoản email giả cũ bằng quy trình hỗ trợ, không tự sửa dữ liệu.
- **Security / Validation:** Email/password/fullName/phone validate độc lập; role luôn ROLE_USER.
- **Dependency:** Không.
- **API:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Đăng ký cung cấp thông tin thật; thông báo trùng rõ; tài khoản cũ vẫn login username.
- **Cách kiểm thử sau sửa:** Email hoa/thường, whitespace, trùng đồng thời, password độ dài UTF-8.

### FIX-027 — Quên và đặt lại mật khẩu

- **ID:** FIX-027
- **Mức độ:** High
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Không có endpoint và luồng reset mật khẩu.
- **Nguyên nhân:** Auth chỉ login/register/me.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [AuthController.java](backend/src/main/java/com/sports/controller/AuthController.java); [AuthService.java](backend/src/main/java/com/sports/service/AuthService.java); [User.java](backend/src/main/java/com/sports/entity/User.java); [LoginPage.jsx](frontend/src/pages/LoginPage.jsx); [App.jsx](frontend/src/App.jsx); [authApi.js](frontend/src/api/authApi.js).
- **Điểm xử lý:** AuthController/AuthService: forgotPassword/resetPassword (đề xuất).
- **Hành vi mong muốn:** Khách reset được bằng email thật; token cũ không tái sử dụng.
- **Cách sửa đề xuất — Backend:** Reset token ngẫu nhiên một lần, lưu hash/expiry, gửi email; trả thông báo chung để tránh lộ tài khoản; vô hiệu token đăng nhập cũ khi reset.
- **Cách sửa đề xuất — Frontend:** Thêm form yêu cầu/reset bằng token; xử lý expired/used; không báo email tồn tại hay không.
- **Database:** PasswordResetToken FK user, hash unique, expiresAt/usedAt.
- **Security / Validation:** Rate limit, không log token, password hợp lệ; dùng lại token bị chặn.
- **Dependency:** FIX-026, FIX-028, FIX-041
- **API:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Khách reset được bằng email thật; token cũ không tái sử dụng.
- **Cách kiểm thử sau sửa:** Email không tồn tại, token hết hạn/dùng lại, resend, hai reset đồng thời.

### FIX-028 — Vòng đời phiên và Remember login

- **ID:** FIX-028
- **Mức độ:** High
- **Loại:** Security
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Logout chỉ xóa local; đổi mật khẩu không thu hồi JWT; rememberMe không ảnh hưởng lưu token.
- **Nguyên nhân:** JWT 24 giờ không có cơ chế thu hồi; checkbox không nối context.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [JwtTokenProvider.java](backend/src/main/java/com/sports/security/JwtTokenProvider.java); [JwtAuthenticationFilter.java](backend/src/main/java/com/sports/security/JwtAuthenticationFilter.java); [UserService.java](backend/src/main/java/com/sports/service/UserService.java); [AuthController.java](backend/src/main/java/com/sports/controller/AuthController.java); [User.java](backend/src/main/java/com/sports/entity/User.java); [AuthContext.jsx](frontend/src/context/AuthContext.jsx); [axiosClient.js](frontend/src/api/axiosClient.js); [LoginPage.jsx](frontend/src/pages/LoginPage.jsx); [RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx); [ProfilePage.jsx](frontend/src/pages/ProfilePage.jsx).
- **Điểm xử lý:** JwtTokenProvider.generateToken; JwtAuthenticationFilter.doFilterInternal; UserService.changePassword; AuthController.logout (đề xuất).
- **Hành vi mong muốn:** JWT cũ bị chặn sau đổi/reset/logout thành công; checkbox có tác dụng thật.
- **Cách sửa đề xuất — Backend:** Phương án đơn giản tokenVersion trên user, check JWT, tăng khi đổi/reset/logout toàn bộ phiên; chưa thêm refresh token nếu không cần.
- **Cách sửa đề xuất — Frontend:** Nhớ đăng nhập dùng localStorage, không nhớ dùng sessionStorage; interceptor/context dùng cùng nơi; logout gọi backend và vẫn xóa local khi network lỗi kèm trạng thái rõ.
- **Database:** User.tokenVersion default0; token cũ thiếu version coi không hợp lệ khi rollout có kế hoạch.
- **Security / Validation:** JWT expiry, locked user, tokenVersion; logout all-session được mô tả rõ.
- **Dependency:** FIX-001
- **API:** Nhóm AUTH trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** JWT cũ bị chặn sau đổi/reset/logout thành công; checkbox có tác dụng thật.
- **Cách kiểm thử sau sửa:** Token bị sao chép, hai tab, reload, đóng/mở trình duyệt, logout offline.

### FIX-029 — Đồng bộ hồ sơ và trạng thái người dùng

- **ID:** FIX-029
- **Mức độ:** Medium
- **Loại:** UX
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Họ tên/phone lưu thật; dob/gender/avatar chưa lưu; AuthContext không cập nhật sau sửa tên.
- **Nguyên nhân:** UI nhiều trường hơn DTO và thiếu cập nhật user context.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [UserService.java](backend/src/main/java/com/sports/service/UserService.java); [UserProfileUpdateRequest.java](backend/src/main/java/com/sports/dto/UserProfileUpdateRequest.java); [UserProfileResponse.java](backend/src/main/java/com/sports/dto/UserProfileResponse.java); [User.java](backend/src/main/java/com/sports/entity/User.java); [ProfilePage.jsx](frontend/src/pages/ProfilePage.jsx); [AuthContext.jsx](frontend/src/context/AuthContext.jsx); [Navbar.jsx](frontend/src/components/Navbar.jsx); [UserLayout.jsx](frontend/src/components/UserLayout.jsx).
- **Điểm xử lý:** UserService.updateUserProfile/toProfileResponse; UserProfileUpdateRequest/Response.
- **Hành vi mong muốn:** Reload giữ giá trị đã lưu, Navbar và hồ sơ đồng nhất.
- **Cách sửa đề xuất — Backend:** Bổ sung dob/gender/avatarUrl nếu giữ các trường này; không cho cập nhật role/email qua profile.
- **Cách sửa đề xuất — Frontend:** Cập nhật context từ response; trường chưa hỗ trợ phải disable rõ; avatar chỉ lưu sau upload thành công.
- **Database:** User bổ sung trường tùy chọn; không suy diễn dữ liệu người dùng cũ.
- **Security / Validation:** Tên trim không rỗng, phone, DOB không tương lai; avatar chỉ URL tài sản được cấp.
- **Dependency:** FIX-030
- **API:** Nhóm PROFILE trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Reload giữ giá trị đã lưu, Navbar và hồ sơ đồng nhất.
- **Cách kiểm thử sau sửa:** Update từng trường/null, lỗi API, reload, tài khoản khác.

### FIX-030 — Upload ảnh có xác thực và kiểm soát tài sản

- **ID:** FIX-030
- **Mức độ:** Medium
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Chưa có upload endpoint/storage; giao diện ảnh profile/đổi trả không có luồng lưu file thật.
- **Nguyên nhân:** Hiện lưu URL ảnh trong DB; nút chọn ảnh không đủ để upload.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [ProductDto.java](backend/src/main/java/com/sports/dto/ProductDto.java); [ReturnCreateRequest.java](backend/src/main/java/com/sports/dto/ReturnCreateRequest.java); [SecurityConfig.java](backend/src/main/java/com/sports/security/SecurityConfig.java); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ProfilePage.jsx](frontend/src/pages/ProfilePage.jsx); [ReturnRequestPage.jsx](frontend/src/pages/ReturnRequestPage.jsx); [axiosClient.js](frontend/src/api/axiosClient.js).
- **Điểm xử lý:** Upload controller/service (đề xuất, chưa tồn tại); validate URL tài sản khi lưu product/profile/return.
- **Hành vi mong muốn:** File giả MIME/quá lớn/path lạ bị từ chối; reload ảnh hợp lệ; không xóa ảnh còn dùng.
- **Cách sửa đề xuất — Backend:** Thiết kế upload tối thiểu, chọn một storage sau khi chốt vận hành; sinh tên server, kiểm tra nội dung file; ghi owner/purpose; xóa tài sản chỉ khi hết tham chiếu.
- **Cách sửa đề xuất — Frontend:** Upload multipart riêng; preview, tiến độ/lỗi và URL response; không gửi path máy khách làm URL.
- **Database:** Asset metadata ownerId/purpose/mime/size/key; FK hoặc tham chiếu kiểm tra quyền.
- **Security / Validation:** JPEG/PNG/WebP tối đa5MiB đề xuất; sniff/decode, giới hạn pixel; cấm SVG/HTML; path traversal; owner và admin theo purpose.
- **Dependency:** Không.
- **API:** Nhóm UPLOAD trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** File giả MIME/quá lớn/path lạ bị từ chối; reload ảnh hợp lệ; không xóa ảnh còn dùng.
- **Cách kiểm thử sau sửa:** Upload hợp lệ/đổi đuôi/quá lớn/ảnh lỗi/cross-owner; network fail.

### FIX-031 — Wishlist thực sự lưu và dùng lại

- **ID:** FIX-031
- **Mức độ:** Medium
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Heart chỉ state cục bộ; chưa có danh sách/API/model wishlist.
- **Nguyên nhân:** Chưa triển khai persistence.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [User.java](backend/src/main/java/com/sports/entity/User.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java); [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [Navbar.jsx](frontend/src/components/Navbar.jsx); [App.jsx](frontend/src/App.jsx); [ProductCard.jsx](frontend/src/components/ProductCard.jsx).
- **Điểm xử lý:** Wishlist controller/service/repository/entity (đề xuất, chưa tồn tại).
- **Hành vi mong muốn:** Reload/đăng nhập lại còn danh sách, không duplicate; sản phẩm ngừng bán được báo rõ.
- **Cách sửa đề xuất — Backend:** Thêm API wishlist owner-scoped và unique(user,product); thêm/xóa idempotent.
- **Cách sửa đề xuất — Frontend:** Nối heart, trang danh sách; sang cart vẫn phải chọn variant và kiểm tra kho.
- **Database:** WishlistItem FK user/product, unique cặp; không ảnh hưởng order.
- **Security / Validation:** User lấy JWT; product tồn tại; không nhận userId client.
- **Dependency:** FIX-007, FIX-022
- **API:** Nhóm WISHLIST trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Reload/đăng nhập lại còn danh sách, không duplicate; sản phẩm ngừng bán được báo rõ.
- **Cách kiểm thử sau sửa:** Thêm lặp, hai user, xóa lặp, chuyển variant vào giỏ.

### FIX-032 — Search/filter/sort/pagination thống nhất server

- **ID:** FIX-032
- **Mức độ:** Medium
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** ProductsPage lấy toàn bộ rồi lọc/phân trang client; backend có paged mode nhưng size không trần, sortBy tự do; sale/inStock chưa hỗ trợ.
- **Nguyên nhân:** Hai cách lọc khác nhau; danh mục/brand hardcode.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ProductController.java](backend/src/main/java/com/sports/controller/ProductController.java); [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [ProductSpecification.java](backend/src/main/java/com/sports/repository/ProductSpecification.java); [ProductsPage.jsx](frontend/src/pages/ProductsPage.jsx); [HomePage.jsx](frontend/src/pages/HomePage.jsx); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ComparePage.jsx](frontend/src/pages/ComparePage.jsx); [productApi.js](frontend/src/api/productApi.js).
- **Điểm xử lý:** ProductController.getProducts; ProductService.getProductsPaged; ProductSpecification.filterProducts.
- **Hành vi mong muốn:** Filter đúng trên toàn catalog; số lượng/trang khớp; sale=true có hiệu lực; không fetch toàn DB.
- **Cách sửa đề xuất — Backend:** Chọn page response cố định; page>=0,size1..100, sort allowlist; thêm sale/inStock/variant filters; không âm thầm cắt danh sách ở client cũ.
- **Cách sửa đề xuất — Frontend:** Cập nhật tất cả getProducts callers, URL sync, debounce và hủy kết quả cũ; phân trang không lọc lại riêng trang.
- **Database:** Index theo query thực tế; filter attributes từ variant.
- **Security / Validation:** min<=max, query length, enum/filter allowlist; ID category thật.
- **Dependency:** FIX-007, FIX-042
- **API:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Filter đúng trên toàn catalog; số lượng/trang khớp; sale=true có hiệu lực; không fetch toàn DB.
- **Cách kiểm thử sau sửa:** Dataset lớn, size100/101, sort lạ, back/forward, tìm tiếng Việt, response race.

### FIX-033 — Giảm N+1 ở catalog và đọc đơn

- **ID:** FIX-033
- **Mức độ:** Medium
- **Loại:** Performance
- **Phạm vi:** BACKEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Mỗi ProductDto gọi query ảnh và hai lần đọc reviews để tính avg/count; catalog không giới hạn khuếch đại chi phí.
- **Nguyên nhân:** Tổng hợp theo từng item thay batch/aggregate.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [ReviewService.java](backend/src/main/java/com/sports/service/ReviewService.java); [ReviewRepository.java](backend/src/main/java/com/sports/repository/ReviewRepository.java); [ProductImageRepository.java](backend/src/main/java/com/sports/repository/ProductImageRepository.java); [AdminDashboardService.java](backend/src/main/java/com/sports/service/AdminDashboardService.java).
- **Điểm xử lý:** ProductService.toDto; ReviewService.getAverageRating/getReviewCount; AdminDashboardService.getDashboardStats.
- **Hành vi mong muốn:** Số query không tăng tuyến tính với số sản phẩm trong trang; dữ liệu không đổi.
- **Cách sửa đề xuất — Backend:** Batch ảnh và aggregate review theo các productId trong trang; fetch đúng relations khi đọc order, không tải toàn bộ reviews.
- **Cách sửa đề xuất — Frontend:** Không có thay đổi frontend thuộc task này.
- **Database:** Index product_id/created_at và aggregate phù hợp sau EXPLAIN.
- **Security / Validation:** Giữ đúng avg=0 khi chưa review; không làm lộ review ẩn khi moderation có hiệu lực.
- **Dependency:** FIX-032
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Số query không tăng tuyến tính với số sản phẩm trong trang; dữ liệu không đổi.
- **Cách kiểm thử sau sửa:** Đếm query cho trang12/100 sản phẩm; so aggregate với mẫu, không dùng benchmark máy thật đang bán.

### FIX-034 — Trang chủ và liên kết khuyến mãi phản ánh catalog thật

- **ID:** FIX-034
- **Mức độ:** Medium
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Bestseller/new dùng slice; link cước dùng slug không phải Long; sale=true không được xử lý.
- **Nguyên nhân:** Banner/link/static ordering chưa nối dữ liệu kinh doanh.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [OrderItemRepository.java](backend/src/main/java/com/sports/repository/OrderItemRepository.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java); [HomePage.jsx](frontend/src/pages/HomePage.jsx); [Navbar.jsx](frontend/src/components/Navbar.jsx); [ProductsPage.jsx](frontend/src/pages/ProductsPage.jsx).
- **Điểm xử lý:** ProductService.getProductsPaged; aggregate OrderItem cho sort soldQuantity.
- **Hành vi mong muốn:** Banner không dẫn lỗi ID; bestseller đúng dữ liệu; newest không dựa phần tử đầu tùy ý.
- **Cách sửa đề xuất — Backend:** Thêm sort bestseller theo lượng đơn COMPLETED và createdAt cho newest; category lookup ID thật.
- **Cách sửa đề xuất — Frontend:** Dùng query server, link id thực; nếu chưa có dữ liệu không gắn nhãn bán chạy giả.
- **Database:** Product.createdAt; query OrderItem để tính soldQuantity, không đếm đơn hủy.
- **Security / Validation:** Chỉ sản phẩm active; soldQuantity tính theo chính sách return được nêu rõ.
- **Dependency:** FIX-032, FIX-045
- **API:** Nhóm PRODUCT trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Banner không dẫn lỗi ID; bestseller đúng dữ liệu; newest không dựa phần tử đầu tùy ý.
- **Cách kiểm thử sau sửa:** Đơn hoàn thành/hủy, sản phẩm mới, banner từng danh mục/sale.

### FIX-035 — Thông số/rating/ảnh không lấy số liệu minh họa làm thật

- **ID:** FIX-035
- **Mức độ:** Medium
- **Loại:** UX
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Rating0 có fallback4.9; số bán/review, badge còn hàng, ảnh và nhiều thông số cố định cho mọi sản phẩm.
- **Nguyên nhân:** Thiết kế demo còn nằm trong JSX live.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [ProductDetailPage.jsx](frontend/src/pages/ProductDetailPage.jsx); [RacketGripDetailPage.jsx](frontend/src/pages/RacketGripDetailPage.jsx); [StringDetailPage.jsx](frontend/src/pages/StringDetailPage.jsx); [ShuttlecockDetailPage.jsx](frontend/src/pages/ShuttlecockDetailPage.jsx); [SweatbandDetailPage.jsx](frontend/src/pages/SweatbandDetailPage.jsx).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Sản phẩm chưa có đánh giá hiển thị đúng 0; ảnh và thông số không mượn từ sản phẩm khác.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Hiện giá trị API; chưa có thì ghi chưa cập nhật/ẩn claim; giữ size guide chung với nhãn tham khảo; tồn kho theo variant.
- **Database:** Không đổi riêng task này.
- **Security / Validation:** Không biến 0 thành fallback; tránh khẳng định chứng nhận/bảo hành khi thiếu dữ liệu.
- **Dependency:** FIX-021, FIX-007
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Sản phẩm chưa có đánh giá hiển thị đúng 0; ảnh và thông số không mượn từ sản phẩm khác.
- **Cách kiểm thử sau sửa:** Mẫu rỗng/0/hết hàng, nhiều category; kiểm tra mọi tab.

### FIX-036 — Dashboard lấy thống kê thật theo khoảng thời gian

- **ID:** FIX-036
- **Mức độ:** Medium
- **Loại:** Integration
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Backend có totals/dailyRevenue; FE chart/topProducts mảng rỗng, timeRange không gửi; ngày/thời gian hiển thị cố định.
- **Nguyên nhân:** Chưa nối chart với response; doanh thu ngày đang dùng order.createdAt.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [AdminDashboardService.java](backend/src/main/java/com/sports/service/AdminDashboardService.java); [DashboardStatsResponse.java](backend/src/main/java/com/sports/dto/DashboardStatsResponse.java); [OrderRepository.java](backend/src/main/java/com/sports/repository/OrderRepository.java); [AdminDashboardPage.jsx](frontend/src/pages/AdminDashboardPage.jsx); [adminApi.js](frontend/src/api/adminApi.js).
- **Điểm xử lý:** AdminDashboardService.getDashboardStats; OrderRepository.findRecognizedPaymentOrders.
- **Hành vi mong muốn:** Số KPI/chart cùng kỳ khớp giao dịch; không giả inventory alert từ pendingOrders.
- **Cách sửa đề xuất — Backend:** Định nghĩa revenue theo paidAt/thu COD, tách gross/refund/net; nhận from/to/groupBy và tổng hợp DB.
- **Cách sửa đề xuất — Frontend:** Kết nối dailyRevenue/topProducts/totalProducts; bỏ timestamp demo; hiển thị empty khác error.
- **Database:** paidAt và lịch sử refund từ payment; không tự suy paidAt của dữ liệu cũ.
- **Security / Validation:** Admin; range hữu hạn và timezone Asia/Ho_Chi_Minh; không tính COD pending vào doanh thu.
- **Dependency:** FIX-003, FIX-039
- **API:** Nhóm DASHBOARD trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Số KPI/chart cùng kỳ khớp giao dịch; không giả inventory alert từ pendingOrders.
- **Cách kiểm thử sau sửa:** Đơn tạo hôm trước trả hôm sau, COD chưa thu, refund, đổi ngày/tháng.

### FIX-037 — Quản trị danh mục và thương hiệu tối thiểu

- **ID:** FIX-037
- **Mức độ:** Medium
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Category CRUD backend có nhưng không có admin UI; brand là chuỗi với bộ lọc hardcode, chưa có quản trị riêng.
- **Nguyên nhân:** Chưa nối endpoint có sẵn; thiếu nguồn danh sách brand thống nhất.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [CategoryService.java](backend/src/main/java/com/sports/service/CategoryService.java); [CategoryController.java](backend/src/main/java/com/sports/controller/CategoryController.java); [Category.java](backend/src/main/java/com/sports/entity/Category.java); [ProductRepository.java](backend/src/main/java/com/sports/repository/ProductRepository.java); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [AdminLayout.jsx](frontend/src/components/AdminLayout.jsx); [productApi.js](frontend/src/api/productApi.js).
- **Điểm xử lý:** CategoryController CRUD; CategoryService CRUD; distinct brand query đề xuất.
- **Hành vi mong muốn:** Admin tạo/sửa category rồi dùng ngay; brand mới xuất hiện trong filter.
- **Cách sửa đề xuất — Backend:** Giữ category CRUD, normalize tên; cung cấp distinct brand từ DB; chưa buộc tạo Brand entity nếu chỉ cần tên.
- **Cách sửa đề xuất — Frontend:** Thêm quản lý category trong khu vực admin; dropdown brand từ API và nhập chuẩn khi tạo product.
- **Database:** Category.name unique sau dọn duplicate có kiểm soát; Brand riêng để OPTIONAL.
- **Security / Validation:** Admin write; không xóa category đang dùng; trim tên, chặn trùng.
- **Dependency:** FIX-022
- **API:** Nhóm CATEGORY trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Admin tạo/sửa category rồi dùng ngay; brand mới xuất hiện trong filter.
- **Cách kiểm thử sau sửa:** Category trùng/đang dùng/không tồn tại; brand khác hoa/thường.

### FIX-038 — Lịch sử nhập/điều chỉnh tồn kho

- **ID:** FIX-038
- **Mức độ:** Medium
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Admin ghi đè stock có expectedStock nhưng chưa có inventory ledger/phiếu nhập/lý do điều chỉnh.
- **Nguyên nhân:** Chưa có lịch sử truy vết thay đổi kho.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [adminApi.js](frontend/src/api/adminApi.js).
- **Điểm xử lý:** ProductService.updateProduct; OrderService.reserveItem/settleReservedStock; inventory endpoints đề xuất.
- **Hành vi mong muốn:** Mọi thay đổi kho có nguồn; replay không nhập hai lần; stock tổng cân đối.
- **Cách sửa đề xuất — Backend:** Giữ expectedStock guard; thêm điều chỉnh delta có lý do và actor; ghi movement cho reserve/release/settle/return theo variant.
- **Cách sửa đề xuất — Frontend:** Form nhập/điều chỉnh, kho khả dụng và đang giữ; conflict yêu cầu tải lại.
- **Database:** InventoryMovement variantId/orderId, type, delta, before/after, actor, createdAt; unique operationKey.
- **Security / Validation:** Admin; không âm/tràn số; không giảm reserved bằng form sửa sản phẩm.
- **Dependency:** FIX-007, FIX-055
- **API:** Nhóm INVENTORY trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Mọi thay đổi kho có nguồn; replay không nhập hai lần; stock tổng cân đối.
- **Cách kiểm thử sau sửa:** Nhập kho, điều chỉnh âm, conflict, hủy/hoàn tiền và reserved không bị ghi đè.

### FIX-039 — Phân biệt thanh toán, giao hàng và lịch sử trạng thái

- **ID:** FIX-039
- **Mức độ:** High
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Một enum OrderStatus gộp paid và shipping; chưa lưu thu COD riêng hoặc shipment/tracking/timestamp chuyển trạng thái.
- **Nguyên nhân:** Chưa có paymentStatus và history dù UI có timeline.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [Order.java](backend/src/main/java/com/sports/entity/Order.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderResponse.java](backend/src/main/java/com/sports/dto/OrderResponse.java); [OrderController.java](backend/src/main/java/com/sports/controller/OrderController.java); [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx); [formatters.js](frontend/src/utils/formatters.js).
- **Điểm xử lý:** OrderService.updateOrderStatus/canShip/handlePaymentSuccess/toDto; cod-payment endpoint đề xuất.
- **Hành vi mong muốn:** Trạng thái rõ cả COD/PayOS, không chuyển lùi; mỗi lần chuyển có timestamp/actor.
- **Cách sửa đề xuất — Backend:** Giữ transition hợp lệ hiện có; thêm paymentStatus độc lập, shippedAt/completedAt, history; COD hoàn tất không tự suy đã thu nếu chưa xác nhận.
- **Cách sửa đề xuất — Frontend:** Hiện payment và delivery riêng; timeline chỉ event thật; admin nhập tracking tùy chọn và xác nhận thu COD có kiểm soát.
- **Database:** OrderStatusHistory; paymentStatus UNPAID/PAID/REFUND_PENDING/PARTIALLY_REFUNDED/REFUNDED; carrier/tracking tùy chọn.
- **Security / Validation:** Admin-only chuyển trạng thái, owner đọc; không cho COMPLETED→PENDING hoặc dùng status API để ép PayOS PAID.
- **Dependency:** FIX-003, FIX-020
- **API:** Nhóm ORDER trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Trạng thái rõ cả COD/PayOS, không chuyển lùi; mỗi lần chuyển có timestamp/actor.
- **Cách kiểm thử sau sửa:** Ma trận trạng thái, gọi lặp, concurrent cancel/webhook, COD giao nhưng chưa thu.

### FIX-040 — Mua lại đơn có kiểm tra catalog hiện tại

- **ID:** FIX-040
- **Mức độ:** Low
- **Loại:** Missing Feature
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Nút mua lại chủ yếu dẫn catalog, chưa khôi phục các dòng mua được.
- **Nguyên nhân:** Chưa có handler kiểm tra từng sản phẩm/variant.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [OrderDetailPage.jsx](frontend/src/pages/OrderDetailPage.jsx); [CartContext.jsx](frontend/src/context/CartContext.jsx); [productApi.js](frontend/src/api/productApi.js).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Mua lại giữ lựa chọn hợp lệ, báo rõ các dòng không mua được.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Đọc items của đơn, fetch sản phẩm hiện tại, thêm dòng còn bán; báo dòng hết hàng/đổi giá và yêu cầu chọn lại biến thể cũ thiếu mapping.
- **Database:** Không đổi.
- **Security / Validation:** Dùng giá/kho mới, không dùng snapshot đơn cũ để định giá.
- **Dependency:** FIX-006, FIX-007, FIX-009, FIX-020
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Mua lại giữ lựa chọn hợp lệ, báo rõ các dòng không mua được.
- **Cách kiểm thử sau sửa:** Đơn nhiều dòng, product ngừng bán, thiếu stock, variant xóa.

### FIX-041 — Email xác nhận đơn và hạ tầng gửi thông báo

- **ID:** FIX-041
- **Mức độ:** Medium
- **Loại:** Missing Feature
- **Phạm vi:** BACKEND
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Chưa có gửi email đơn/reset, low-stock alert hay lưu lần gửi.
- **Nguyên nhân:** Không có mail integration hoặc cơ chế retry sau commit.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [AuthService.java](backend/src/main/java/com/sports/service/AuthService.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java).
- **Điểm xử lý:** Sự kiện sau commit createOrder/reset; mail/outbox service (đề xuất, chưa tồn tại).
- **Hành vi mong muốn:** Một sự kiện gửi một email logic; lỗi nhà cung cấp có retry và dấu vết.
- **Cách sửa đề xuất — Backend:** Gửi email sau commit qua outbox tối thiểu; retry có dedup; ưu tiên reset và xác nhận đơn, cảnh báo kho tùy giai đoạn.
- **Cách sửa đề xuất — Frontend:** Không có thay đổi frontend thuộc task này.
- **Database:** NotificationOutbox unique(eventType,aggregateId,eventVersion), attempts,nextAttemptAt,sentAt; địa chỉ email hợp lệ.
- **Security / Validation:** Không gửi secret, không log token reset; email lỗi không rollback đơn đã tạo; không tự gửi trong đợt lập kế hoạch.
- **Dependency:** FIX-026
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Một sự kiện gửi một email logic; lỗi nhà cung cấp có retry và dấu vết.
- **Cách kiểm thử sau sửa:** Commit/rollback, gửi timeout/lặp, địa chỉ lỗi, nội dung tiền và options đúng.

### FIX-042 — Lỗi API và validation có contract nhất quán

- **ID:** FIX-042
- **Mức độ:** Medium
- **Loại:** Validation
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Error response khác nhau; enum/query/JSON sai và FK duplicate có thể rơi generic500; validation phone/length chưa thống nhất.
- **Nguyên nhân:** Handler tổng quát, DTO thiếu ràng buộc tương ứng column.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [GlobalExceptionHandler.java](backend/src/main/java/com/sports/exception/GlobalExceptionHandler.java); [SecurityConfig.java](backend/src/main/java/com/sports/security/SecurityConfig.java); [OrderCreateRequest.java](backend/src/main/java/com/sports/dto/OrderCreateRequest.java); [ShippingAddressDto.java](backend/src/main/java/com/sports/dto/ShippingAddressDto.java); [UserProfileUpdateRequest.java](backend/src/main/java/com/sports/dto/UserProfileUpdateRequest.java); [axiosClient.js](frontend/src/api/axiosClient.js); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [AdminProductsPage.jsx](frontend/src/pages/AdminProductsPage.jsx); [ShippingAddressPage.jsx](frontend/src/pages/ShippingAddressPage.jsx).
- **Điểm xử lý:** GlobalExceptionHandler; SecurityConfig.writeSecurityError; các Request DTO.
- **Hành vi mong muốn:** Đầu vào lỗi nhận status/mã đúng; UI giữ dữ liệu form và không báo thành công.
- **Cách sửa đề xuất — Backend:** Chuẩn hóa ApiError giữ message/errors; thêm code/path; mapping malformed400, auth401/403, notfound404, conflict409, rate429.
- **Cách sửa đề xuất — Frontend:** Hiện errors theo field, message fallback; phân biệt 401/403/404/409/429/500; không swallow thành empty/success.
- **Database:** Không bắt buộc đổi DB; bổ sung constraint riêng FIX-045.
- **Security / Validation:** Validation độc lập backend, trim/sanitize xong kiểm tra lại; không trả SQL/stacktrace.
- **Dependency:** Không.
- **API:** Nhóm ERROR trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Đầu vào lỗi nhận status/mã đúng; UI giữ dữ liệu form và không báo thành công.
- **Cách kiểm thử sau sửa:** JSON lỗi, enum lạ, số âm/quá dài, duplicate, FK, network và quyền.

### FIX-043 — Giới hạn lạm dụng auth, AI và API tốn tài nguyên

- **ID:** FIX-043
- **Mức độ:** High
- **Loại:** Security
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Không thấy rate limit auth/AI; AI public có thể tạo chi phí và chat log không giới hạn.
- **Nguyên nhân:** Chưa có quota/message bound/timeouts.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [SecurityConfig.java](backend/src/main/java/com/sports/security/SecurityConfig.java); [AiChatController.java](backend/src/main/java/com/sports/controller/AiChatController.java); [AiChatRequest.java](backend/src/main/java/com/sports/dto/AiChatRequest.java); [GeminiService.java](backend/src/main/java/com/sports/service/GeminiService.java); [AuthController.java](backend/src/main/java/com/sports/controller/AuthController.java); [AiChatbotWidget.jsx](frontend/src/components/AiChatbotWidget.jsx); [LoginPage.jsx](frontend/src/pages/LoginPage.jsx); [RegisterPage.jsx](frontend/src/pages/RegisterPage.jsx); [axiosClient.js](frontend/src/api/axiosClient.js).
- **Điểm xử lý:** SecurityFilterChain; AiChatController.chatWithAi; GeminiService.callGeminiApi; DTO AiChatRequest.
- **Hành vi mong muốn:** Spam bị hạn chế có kiểm soát, request thường vẫn hoạt động.
- **Cách sửa đề xuất — Backend:** Giới hạn IP+tài khoản theo endpoint, message<=2000, timeout và số kết quả; không khóa toàn hệ thống vì một IP chung.
- **Cách sửa đề xuất — Frontend:** Hiển thị cooldown Retry-After, giữ nội dung khi lỗi; disable gửi trùng.
- **Database:** Chính sách lưu/xóa chat log cần chủ dự án duyệt riêng; không tự xóa.
- **Security / Validation:** 429 chuẩn, không log password/token; xác minh proxy IP từ cấu hình đáng tin.
- **Dependency:** FIX-042
- **API:** Nhóm ERROR trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Spam bị hạn chế có kiểm soát, request thường vẫn hoạt động.
- **Cách kiểm thử sau sửa:** Burst login/register/AI, timeout Gemini, response quá lớn.

### FIX-044 — Cấu hình môi trường và quy trình triển khai an toàn

- **ID:** FIX-044
- **Mức độ:** High
- **Loại:** Security
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** DB root/local và ddl-auto:update/sql init always; API localhost hardcode; .env.example thiếu JWT_SECRET; không thấy loader .env.
- **Nguyên nhân:** Cấu hình local chưa tách rõ vận hành; file .env không tự được Spring đọc.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [application.yml](backend/src/main/resources/application.yml); [axiosClient.js](frontend/src/api/axiosClient.js); [.env.example](backend/.env.example); [run-backend.bat](run-backend.bat); [run-frontend.bat](run-frontend.bat).
- **Điểm xử lý:** application.yml; backend/.env.example; axiosClient baseURL; run-backend.bat/run-frontend.bat (chỉ đề xuất cấu hình, cần duyệt khi thực hiện).
- **Hành vi mong muốn:** Môi trường test và production tách; không tự update schema thật khi khởi động.
- **Cách sửa đề xuất — Backend:** Lập kế hoạch env/profile, DB user tối thiểu, backup/restore/migration đã duyệt; kiểm tra PayOS/Gemini credentials không in giá trị.
- **Cách sửa đề xuất — Frontend:** Giữ localhost cho dev; đưa base URL theo môi trường build khi triển khai được duyệt, không đưa secret vào VITE_*.
- **Database:** Không chạy migration trong task này; staging riêng và rollback trước schema change.
- **Security / Validation:** Secret không fallback, mock/dev seed tắt production, CORS domain thật/HTTPS; kiểm tra CI secret exposure.
- **Dependency:** FIX-001
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Môi trường test và production tách; không tự update schema thật khi khởi động.
- **Cách kiểm thử sau sửa:** Kiểm tra cấu hình thiếu biến, build URL, CORS allowed/disallowed, backup restore staging.

### FIX-045 — Schema constraint/index/timestamp và migration có kiểm soát

- **ID:** FIX-045
- **Mức độ:** Medium
- **Loại:** Missing Feature
- **Phạm vi:** BACKEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Không thấy migration versioned/explicit composite index/check; timestamp thiếu; SQL phụ kiện dùng ID cố định và bảng chưa có JPA mapping.
- **Nguyên nhân:** Schema phụ thuộc ddl-auto; quy tắc chủ yếu trong service.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [Product.java](backend/src/main/java/com/sports/entity/Product.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java); [Review.java](backend/src/main/java/com/sports/entity/Review.java); [ReturnRequest.java](backend/src/main/java/com/sports/entity/ReturnRequest.java); [ShippingAddress.java](backend/src/main/java/com/sports/entity/ShippingAddress.java); [update_accessories.sql](backend/src/main/resources/update_accessories.sql).
- **Điểm xử lý:** @Table/@Column/@JoinColumn ở entity; SQL update_accessories; migration versioned chỉ đề xuất.
- **Hành vi mong muốn:** Migration có backfill/rollback và không mất order history; EXPLAIN chứng minh index cần.
- **Cách sửa đề xuất — Backend:** Đọc schema thật ở bước triển khai được duyệt; đề xuất index theo query; thêm constraint cần thiết sau rà dữ liệu; không chạy update_accessories.sql mù.
- **Cách sửa đề xuất — Frontend:** Không có thay đổi frontend thuộc task này.
- **Database:** Ứng viên: orders(user_id,created_at), orders(status,payment_method,expires_at), reviews(product_id,created_at), images(product_id,display_order), addresses(user_id); check stock/price/qty; createdAt/updatedAt.
- **Security / Validation:** Không khẳng định DB live thiếu index khi chưa kiểm tra; MySQL có thể tự tạo index FK.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Migration có backfill/rollback và không mất order history; EXPLAIN chứng minh index cần.
- **Cách kiểm thử sau sửa:** Schema diff staging, dữ liệu duplicate/orphan/negative, restore backup và đo query.

### FIX-046 — Bổ sung kiểm thử tích hợp và E2E còn thiếu

- **ID:** FIX-046
- **Mức độ:** High
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Hiện có4 test files:56 @Test,8 @FuzzTest,12 @ParameterizedTest; chưa thấy MySQL integration/FE/E2E. Các con số là annotation, không phải số test đã chạy.
- **Nguyên nhân:** Mock repository không chứng minh lock/rollback thật; chưa có kiểm thử trình duyệt.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [PayOSService.java](backend/src/main/java/com/sports/service/PayOSService.java); [PaymentController.java](backend/src/main/java/com/sports/controller/PaymentController.java); [CartContext.jsx](frontend/src/context/CartContext.jsx); [CheckoutPage.jsx](frontend/src/pages/CheckoutPage.jsx); [QRPaymentPage.jsx](frontend/src/pages/QRPaymentPage.jsx); [App.jsx](frontend/src/App.jsx); [OrderServiceTest.java](backend/src/test/java/com/sports/service/OrderServiceTest.java); [PayOSSecurityTest.java](backend/src/test/java/com/sports/service/PayOSSecurityTest.java); [CartFuzzTest.java](backend/src/test/java/com/sports/fuzz/CartFuzzTest.java); [PayOSWebhookFuzzTest.java](backend/src/test/java/com/sports/fuzz/PayOSWebhookFuzzTest.java); [pom.xml](backend/pom.xml); [package.json](frontend/package.json).
- **Điểm xử lý:** OrderServiceTest, PayOSSecurityTest, CartFuzzTest, PayOSWebhookFuzzTest; integration/HTTP test bổ sung sau duyệt.
- **Hành vi mong muốn:** Các flow tiền/kho/quyền chạy qua; không tuyên bố pass nếu chưa chạy.
- **Cách sửa đề xuất — Backend:** Giữ tests hiện có, bổ sung MySQL isolated transaction/concurrency và MockMvc authorization/validation; fixture webhook từ gateway độc lập.
- **Cách sửa đề xuất — Frontend:** Kiểm tra route smoke, cart options, COD, thanh toán retry/return, address, review, admin và responsive; chỉ thêm test stack khi được duyệt.
- **Database:** Chỉ DB test; không dùng database bán hàng.
- **Security / Validation:** AAA JUnit5; Jazzer kiểm tra invariant thật; không suy coverage từ tên file.
- **Dependency:** FIX-018, FIX-017, FIX-002
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Các flow tiền/kho/quyền chạy qua; không tuyên bố pass nếu chưa chạy.
- **Cách kiểm thử sau sửa:** Hai người mua cuối, callback lặp, rollback nửa chừng, idempotency, IDOR, lỗi mạng và viewport360/768/1440.

### FIX-047 — Khả năng phục hồi UI và dữ liệu so sánh

- **ID:** FIX-047
- **Mức độ:** Medium
- **Loại:** UX
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Không có ErrorBoundary; fallback route về home che link hỏng; compare dùng snapshot local và readCart/storage có tình huống lỗi; API comparison có nhưng chưa dùng.
- **Nguyên nhân:** Thiếu kiểm tra kiểu LocalStorage và trạng thái lỗi rõ.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [App.jsx](frontend/src/App.jsx); [CompareContext.jsx](frontend/src/context/CompareContext.jsx); [ComparePage.jsx](frontend/src/pages/ComparePage.jsx); [RacketComparisonBar.jsx](frontend/src/components/RacketComparisonBar.jsx); [ProductCard.jsx](frontend/src/components/ProductCard.jsx).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Storage JSON hợp lệ nhưng sai kiểu không crash; comparison hiện giá/thông số mới; lỗi có retry.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Thêm boundary và trang404 trong cấu trúc được duyệt; validate array localStorage; compare gọi API hiện có, tối đa3; storage lỗi không làm crash app.
- **Database:** Không đổi.
- **Security / Validation:** Không dùng snapshot compare để bỏ qua chọn variant; xử lý clipboard promise lỗi.
- **Dependency:** FIX-009
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Storage JSON hợp lệ nhưng sai kiểu không crash; comparison hiện giá/thông số mới; lỗi có retry.
- **Cách kiểm thử sau sửa:** LocalStorage={} hoặc quota exceeded, route lạ, API404/500, keyboard/modal/mobile.

### FIX-048 — Nút chưa tích hợp và nội dung chính sách minh bạch

- **ID:** FIX-048
- **Mức độ:** Low
- **Loại:** UX
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Settings/newsletter/social login/export/reply/ẩn review/toolbar và hội viên chưa tích hợp; một số có thông báo rõ, một số chỉ alert hoặc không handler.
- **Nguyên nhân:** Thiết kế có chức năng vượt backend; tier từ role và dữ liệu minh họa.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [AdminSettingsPage.jsx](frontend/src/pages/AdminSettingsPage.jsx); [AdminCustomersPage.jsx](frontend/src/pages/AdminCustomersPage.jsx); [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [AdminPaymentsPage.jsx](frontend/src/pages/AdminPaymentsPage.jsx); [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [AdminLayout.jsx](frontend/src/components/AdminLayout.jsx); [Footer.jsx](frontend/src/components/Footer.jsx); [UserLayout.jsx](frontend/src/components/UserLayout.jsx).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Mọi nút hoặc hoạt động thật hoặc nêu rõ chưa hỗ trợ; không báo đã xuất/gửi khi không có.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Lập danh sách nút; giữ thông báo chưa hỗ trợ đúng sự thật; disable hành động chưa có; hoàn thiện link chính sách, bảo hành/size guide bằng nội dung shop duyệt. Không mở rộng CMS.
- **Database:** Không đổi.
- **Security / Validation:** Không cho nhập secret vào settings chưa lưu; không giả hóa đơn/role thành VIP.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Mọi nút hoặc hoạt động thật hoặc nêu rõ chưa hỗ trợ; không báo đã xuất/gửi khi không có.
- **Cách kiểm thử sau sửa:** Click toàn bộ toolbar/footer/settings/export/loyalty; kiểm tra keyboard và mobile.

### FIX-049 — Backlog tùy chọn không chặn bán hàng

- **ID:** FIX-049
- **Mức độ:** Low
- **Loại:** Missing Feature
- **Phạm vi:** BOTH
- **Mức cần thiết:** OPTIONAL
- **Mô tả vấn đề / Hành vi hiện tại:** Chưa có recently viewed, flash sale theo thời gian, banner CMS, loyalty, STAFF, cart đa thiết bị, combo engine và tích hợp hãng vận chuyển.
- **Nguyên nhân:** Chưa nằm trong phạm vi bán hàng tối thiểu.
- **Bằng chứng và giới hạn:** Không tìm thấy triển khai đầy đủ trong source ứng dụng; không suy luận từ tên file/nút UI.
- **File liên quan:** [Product.java](backend/src/main/java/com/sports/entity/Product.java); [User.java](backend/src/main/java/com/sports/entity/User.java); [HomePage.jsx](frontend/src/pages/HomePage.jsx); [UserLayout.jsx](frontend/src/components/UserLayout.jsx).
- **Điểm xử lý:** Chưa tạo class/endpoint mới; chỉ backlog và quyết định phạm vi.
- **Hành vi mong muốn:** Backlog được ghi OPTIONAL và không bị hiểu là task bắt buộc hay đã triển khai.
- **Cách sửa đề xuất — Backend:** Chưa triển khai; tách yêu cầu nhỏ và chốt nghiệp vụ/contract riêng nếu Phong chọn; không cài framework trước.
- **Cách sửa đề xuất — Frontend:** Recently viewed có thể dùng local; còn lại không giả dữ liệu. Không cần tạo UI mới trong đợt sửa thiết yếu.
- **Database:** Chưa đề xuất bảng mới trước khi chốt tính năng.
- **Security / Validation:** STAFF phải có ma trận quyền nếu chọn; flash sale/combo phải tính giá server.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Backlog được ghi OPTIONAL và không bị hiểu là task bắt buộc hay đã triển khai.
- **Cách kiểm thử sau sửa:** Khi chọn từng tính năng phải bổ sung acceptance/contract riêng trước code.

### FIX-050 — Phân tách giỏ khách và giỏ theo tài khoản trên thiết bị

- **ID:** FIX-050
- **Mức độ:** Medium
- **Loại:** UX
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** badminton_cart dùng chung mọi tài khoản trên trình duyệt; nút đồng bộ chỉ alert; không có giỏ server.
- **Nguyên nhân:** Không namespace user hoặc chính sách merge guest.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [CartContext.jsx](frontend/src/context/CartContext.jsx); [AuthContext.jsx](frontend/src/context/AuthContext.jsx); [CartPage.jsx](frontend/src/pages/CartPage.jsx).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Đăng xuất/đổi tài khoản không lẫn giỏ; reload và merge không duplicate.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Giữ LocalStorage giai đoạn đầu: namespace theo user, merge guest có xác nhận và kiểm tra lại variant; nút làm mới fetch catalog/quote thật.
- **Database:** Không thêm cart DB ở giai đoạn tối thiểu.
- **Security / Validation:** Không mất guest cart khi login lỗi; không lẫn selection của tài khoản khác.
- **Dependency:** FIX-006, FIX-009, FIX-017
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Đăng xuất/đổi tài khoản không lẫn giỏ; reload và merge không duplicate.
- **Cách kiểm thử sau sửa:** Guest→login A→logout→login B, cart cũ, thiếu kho khi merge.

### FIX-051 — Nối API quản trị xóa review đã có

- **ID:** FIX-051
- **Mức độ:** Medium
- **Loại:** Integration
- **Phạm vi:** FRONTEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Backend DELETE /admin/reviews/{id} và wrapper có nhưng UI chưa sử dụng; hide/reply chưa có API.
- **Nguyên nhân:** Giao diện moderation chưa nối tác vụ thật.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [adminApi.js](frontend/src/api/adminApi.js).
- **Điểm xử lý:** Page/component và handler được mô tả trong FRONTEND_FIX_PLAN cùng FIX-ID.
- **Hành vi mong muốn:** Xóa review thực sự biến mất sau reload; lỗi giữ dữ liệu.
- **Cách sửa đề xuất — Backend:** Không có thay đổi backend thuộc task này.
- **Cách sửa đề xuất — Frontend:** Thêm thao tác xóa có xác nhận dùng API có sẵn; cập nhật danh sách từ kết quả; giữ hide/reply chưa hỗ trợ rõ, không giả lưu.
- **Database:** Không đổi.
- **Security / Validation:** Chỉ admin; xử lý 403/404; không dùng API admin cho khách tự xóa.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Xóa review thực sự biến mất sau reload; lỗi giữ dữ liệu.
- **Cách kiểm thử sau sửa:** Admin/customer token, cancel confirmation, DELETE204/403/404/500.

### FIX-052 — Phân trang các danh sách quản trị và tài khoản

- **ID:** FIX-052
- **Mức độ:** Medium
- **Loại:** Performance
- **Phạm vi:** BOTH
- **Mức cần thiết:** RECOMMENDED
- **Mô tả vấn đề / Hành vi hiện tại:** Phần lớn list trả findAll rồi sort/filter in-memory; bảng FE tải toàn bộ.
- **Nguyên nhân:** Chưa có bounded pageable/search server; payment controller query repository trực tiếp.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [AdminPaymentController.java](backend/src/main/java/com/sports/controller/AdminPaymentController.java); [UserService.java](backend/src/main/java/com/sports/service/UserService.java); [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [ReviewService.java](backend/src/main/java/com/sports/service/ReviewService.java); [ReturnService.java](backend/src/main/java/com/sports/service/ReturnService.java); [VoucherService.java](backend/src/main/java/com/sports/service/VoucherService.java); [AdminCustomersPage.jsx](frontend/src/pages/AdminCustomersPage.jsx); [AdminOrdersPage.jsx](frontend/src/pages/AdminOrdersPage.jsx); [AdminPaymentsPage.jsx](frontend/src/pages/AdminPaymentsPage.jsx); [AdminReviewsPage.jsx](frontend/src/pages/AdminReviewsPage.jsx); [AdminVouchersPage.jsx](frontend/src/pages/AdminVouchersPage.jsx); [MyOrdersPage.jsx](frontend/src/pages/MyOrdersPage.jsx); [ReturnRequestPage.jsx](frontend/src/pages/ReturnRequestPage.jsx); [ReviewedProductsPage.jsx](frontend/src/pages/ReviewedProductsPage.jsx); [adminApi.js](frontend/src/api/adminApi.js).
- **Điểm xử lý:** Các getAll/getUser list của User/Order/Review/Return/Voucher; AdminPaymentController.getAllPayments.
- **Hành vi mong muốn:** Mỗi bảng dùng đúng total; không tải toàn bộ để lọc; auth không đổi.
- **Cách sửa đề xuất — Backend:** Thêm paged mode opt-in cho list, query DB có giới hạn; đưa logic payment listing vào service khi sửa payment; không refactor hàng loạt.
- **Cách sửa đề xuất — Frontend:** Các bảng gửi page/size/query/status, đọc PageResponse, reset page khi filter, không lọc cục bộ toàn cục giả.
- **Database:** Index theo user/status/createdAt và query; giữ đường legacy trong chuyển tiếp.
- **Security / Validation:** Page0,size1..100; auth/owner, sort allowlist; không trả PII cho public.
- **Dependency:** FIX-042
- **API:** Nhóm PAGING trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Mỗi bảng dùng đúng total; không tải toàn bộ để lọc; auth không đổi.
- **Cách kiểm thử sau sửa:** Dataset nhiều trang, empty cuối trang sau xóa, filter status, 403, race response.

### FIX-053 — AI chỉ đề xuất sản phẩm phù hợp đang bán

- **ID:** FIX-053
- **Mức độ:** Medium
- **Loại:** Bug
- **Phạm vi:** BOTH
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Khi hết hàng service fallback findAll nhưng prompt vẫn nói stock>0; IDs từ model không giới hạn tập dữ liệu; không giới hạn số truy vấn enrichment.
- **Nguyên nhân:** Prompt được dùng như lớp kiểm soát chính.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [GeminiService.java](backend/src/main/java/com/sports/service/GeminiService.java); [ProductRepository.java](backend/src/main/java/com/sports/repository/ProductRepository.java); [AiChatbotWidget.jsx](frontend/src/components/AiChatbotWidget.jsx).
- **Điểm xử lý:** GeminiService.chatWithAi/callGeminiApi/getRuleBasedAdvisorResponse.
- **Hành vi mong muốn:** Hết kho không được mô tả là có sẵn; ID ngoài catalog không hiện; timeout có fallback.
- **Cách sửa đề xuất — Backend:** Lọc category vợt/active/stock theo mục tiêu; giới hạn query tại DB; intersect IDs model với tập được phép; kiểm tra schema/length; không tin prompt để chống injection.
- **Cách sửa đề xuất — Frontend:** Hiển thị tình trạng thật và fallback không có hàng; thêm giỏ phải đi chọn variant; báo lỗi tư vấn riêng.
- **Database:** Giữ AiChatLog; retention là quyết định vận hành riêng.
- **Security / Validation:** Model output không quyết định giá/kho; không thực thi tool từ output; reply render text an toàn.
- **Dependency:** FIX-007, FIX-043
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Hết kho không được mô tả là có sẵn; ID ngoài catalog không hiện; timeout có fallback.
- **Cách kiểm thử sau sửa:** Model trả ID lạ/1000 ID/JSON lỗi, prompt injection, kho0.

### FIX-054 — Giới hạn tiền, kích thước đơn và dữ liệu đầu vào

- **ID:** FIX-054
- **Mức độ:** High
- **Loại:** Validation
- **Phạm vi:** BACKEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Giá mỗi product có giới hạn precision nhưng tổng nhiều dòng có thể vượt decimal(12,2); items và một số chuỗi chưa giới hạn; gateway signature dùng longValue.
- **Nguyên nhân:** Valid từng field chưa đảm bảo tổng và đơn vị tiền.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [OrderCreateRequest.java](backend/src/main/java/com/sports/dto/OrderCreateRequest.java); [OrderItemRequest.java](backend/src/main/java/com/sports/dto/OrderItemRequest.java); [ProductDto.java](backend/src/main/java/com/sports/dto/ProductDto.java); [Order.java](backend/src/main/java/com/sports/entity/Order.java).
- **Điểm xử lý:** OrderService.validateRequestedItems/reserveItem/calculateOrderTotal; OrderCreateRequest/OrderItemRequest.
- **Hành vi mong muốn:** Request quá giới hạn trả400/409 và rollback; không500 hoặc số tiền ký bị cắt.
- **Cách sửa đề xuất — Backend:** Kiểm tra subtotal/discount/shipping/total trong giới hạn schema và gateway trước save/call; VND nguyên; đề xuất tối đa100 dòng, tổng qty/product<=100 giữ nguyên.
- **Cách sửa đề xuất — Frontend:** Không có thay đổi frontend thuộc task này.
- **Database:** Không cần tăng precision nếu chặn giới hạn đúng; không âm thầm round/truncate.
- **Security / Validation:** Tên100, phone20 và format, note2000; options theo schema; tiền <=9,999,999,999 VND nguyên hoặc giới hạn gateway thấp hơn.
- **Dependency:** Không.
- **API:** Nhóm ERROR trong [API_CHANGES.md](docs/fix/API_CHANGES.md).
- **Acceptance Criteria:** Request quá giới hạn trả400/409 và rollback; không500 hoặc số tiền ký bị cắt.
- **Cách kiểm thử sau sửa:** Max price×qty, nhiều product, số lẻ, cực lớn, null item và chuỗi dài.

### FIX-055 — Chặn tràn số khi hoàn kho và sửa kho đang giữ chỗ

- **ID:** FIX-055
- **Mức độ:** High
- **Loại:** Bug
- **Phạm vi:** BACKEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** reserveItem hiện đã kiểm tra overflow reservedStock; settleReservedStock vẫn cộng int trực tiếp. Admin có thể tăng available rất lớn khi còn reserved.
- **Nguyên nhân:** Không giữ invariant available+reserved<=Integer.MAX_VALUE.
- **Bằng chứng và giới hạn:** Xác nhận bằng đọc source; chưa chạy tái hiện.
- **File liên quan:** [OrderService.java](backend/src/main/java/com/sports/service/OrderService.java); [ProductService.java](backend/src/main/java/com/sports/service/ProductService.java); [Product.java](backend/src/main/java/com/sports/entity/Product.java).
- **Điểm xử lý:** OrderService.settleReservedStock; ProductService.validateStockAndPrice/validateStockSnapshot.
- **Hành vi mong muốn:** Stock không wrap âm khi hủy đơn sau nhập kho sát giới hạn.
- **Cách sửa đề xuất — Backend:** Validate tổng vật lý trước admin update/reserve/release; dùng phép cộng có kiểm tra hoặc long trung gian và lỗi nghiệp vụ; giữ transaction/lock.
- **Cách sửa đề xuất — Frontend:** Không có thay đổi frontend thuộc task này.
- **Database:** Có thể giữ INT với giới hạn; bổ sung CHECK/invariant phù hợp sau kiểm tra dữ liệu.
- **Security / Validation:** Không cho stock âm hoặc tràn; không clamp che bất nhất; không sửa reserved từ request.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Stock không wrap âm khi hủy đơn sau nhập kho sát giới hạn.
- **Cách kiểm thử sau sửa:** Đặt1, admin đặt available=Integer.MAX_VALUE khi reserved1 phải bị chặn; cancel/expiry không overflow.

### FIX-056 — Giảm nguy cơ lộ credential trong log và script vận hành

- **ID:** FIX-056
- **Mức độ:** Medium
- **Loại:** Security
- **Phạm vi:** BACKEND
- **Mức cần thiết:** ESSENTIAL
- **Mô tả vấn đề / Hành vi hiện tại:** Gemini key nằm trong URL và log e.getMessage có thể chứa URL; script push nhận token và đưa vào lệnh. Đây là nguy cơ, chưa xác nhận đã lộ secret thật.
- **Nguyên nhân:** Log exception thô và truyền credential qua command arguments.
- **Bằng chứng và giới hạn:** Rủi ro từ phân tích tĩnh; cần xác minh bằng kiểm thử/schema/log được cấp quyền.
- **File liên quan:** [GeminiService.java](backend/src/main/java/com/sports/service/GeminiService.java); [JwtTokenProvider.java](backend/src/main/java/com/sports/security/JwtTokenProvider.java); [JwtAuthenticationFilter.java](backend/src/main/java/com/sports/security/JwtAuthenticationFilter.java); [push-to-github.bat](push-to-github.bat).
- **Điểm xử lý:** GeminiService.callGeminiApi catch; JWT filter/provider logging; push-to-github.bat (tách duyệt vận hành).
- **Hành vi mong muốn:** Log lỗi outbound không chứa key; quy trình vận hành không để token trong command URL.
- **Cách sửa đề xuất — Backend:** Redact URL/query/token khỏi log; log mã lỗi/traceId; xem lại cơ chế credential của script riêng khi được phép, không in hoặc thay secret hiện tại.
- **Cách sửa đề xuất — Frontend:** Không có thay đổi frontend thuộc task này.
- **Database:** Không đổi DB.
- **Security / Validation:** Không ghi JWT/reset token/payment key vào log; fixture test không coi là production secret.
- **Dependency:** Không.
- **API:** NO API CONTRACT CHANGE.
- **Acceptance Criteria:** Log lỗi outbound không chứa key; quy trình vận hành không để token trong command URL.
- **Cách kiểm thử sau sửa:** Mô phỏng exception URL với key giả và quét log; review script read-only trước thay đổi.


## Kiểm tra tính đầy đủ của kế hoạch

Tổng cộng **56 FIX-ID**, **44 task có backend**, **48 task có frontend**, trong đó **36 BOTH**, **8 BACKEND**, **12 FRONTEND**. Mỗi BOTH có đúng một mục cùng ID ở mỗi kế hoạch chuyên trách; không tạo ID phụ mâu thuẫn.

- FIX-001: Backend có; Frontend không thuộc phạm vi; contract NO API CONTRACT CHANGE.
- FIX-002: Backend có; Frontend có; contract PAYMENT.
- FIX-003: Backend có; Frontend có; contract PAYMENT.
- FIX-004: Backend có; Frontend có; contract PAYMENT.
- FIX-005: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-006: Backend có; Frontend có; contract ORDER.
- FIX-007: Backend có; Frontend có; contract PRODUCT.
- FIX-008: Backend có; Frontend có; contract ORDER.
- FIX-009: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-010: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-011: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-012: Backend có; Frontend có; contract REVIEW.
- FIX-013: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-014: Backend có; Frontend có; contract RETURN.
- FIX-015: Backend có; Frontend có; contract ADDRESS.
- FIX-016: Backend có; Frontend không thuộc phạm vi; contract NO API CONTRACT CHANGE.
- FIX-017: Backend có; Frontend có; contract ORDER.
- FIX-018: Backend có; Frontend có; contract ORDER.
- FIX-019: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-020: Backend có; Frontend có; contract ORDER.
- FIX-021: Backend có; Frontend có; contract PRODUCT.
- FIX-022: Backend có; Frontend có; contract PRODUCT.
- FIX-023: Backend có; Frontend có; contract VOUCHER.
- FIX-024: Backend có; Frontend có; contract VOUCHER.
- FIX-025: Backend có; Frontend có; contract ADMINUSER.
- FIX-026: Backend có; Frontend có; contract AUTH.
- FIX-027: Backend có; Frontend có; contract AUTH.
- FIX-028: Backend có; Frontend có; contract AUTH.
- FIX-029: Backend có; Frontend có; contract PROFILE.
- FIX-030: Backend có; Frontend có; contract UPLOAD.
- FIX-031: Backend có; Frontend có; contract WISHLIST.
- FIX-032: Backend có; Frontend có; contract PRODUCT.
- FIX-033: Backend có; Frontend không thuộc phạm vi; contract NO API CONTRACT CHANGE.
- FIX-034: Backend có; Frontend có; contract PRODUCT.
- FIX-035: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-036: Backend có; Frontend có; contract DASHBOARD.
- FIX-037: Backend có; Frontend có; contract CATEGORY.
- FIX-038: Backend có; Frontend có; contract INVENTORY.
- FIX-039: Backend có; Frontend có; contract ORDER.
- FIX-040: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-041: Backend có; Frontend không thuộc phạm vi; contract NO API CONTRACT CHANGE.
- FIX-042: Backend có; Frontend có; contract ERROR.
- FIX-043: Backend có; Frontend có; contract ERROR.
- FIX-044: Backend có; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-045: Backend có; Frontend không thuộc phạm vi; contract NO API CONTRACT CHANGE.
- FIX-046: Backend có; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-047: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-048: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-049: Backend có; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-050: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-051: Backend không thuộc phạm vi; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-052: Backend có; Frontend có; contract PAGING.
- FIX-053: Backend có; Frontend có; contract NO API CONTRACT CHANGE.
- FIX-054: Backend có; Frontend không thuộc phạm vi; contract ERROR.
- FIX-055: Backend có; Frontend không thuộc phạm vi; contract NO API CONTRACT CHANGE.
- FIX-056: Backend có; Frontend không thuộc phạm vi; contract NO API CONTRACT CHANGE.

Các quyết định cần chốt khi bắt đầu thực hiện: bán COD trước hay kèm PayOS; có cung cấp căng cước ngay không; chính sách đổi trả; bộ địa chỉ; provider mail/storage. Các task vẫn có acceptance và phương án tối thiểu; không tự kích hoạt tính năng OPTIONAL.

Kết luận: project có nền bán hàng và phân quyền thực tế nhưng **chưa sẵn sàng coi là cửa hàng hoàn chỉnh**. Ưu tiên JWT, lỗi UI trực tiếp, bảo toàn lựa chọn/giá/kho, địa chỉ, idempotency và PayOS trước các tính năng tăng trải nghiệm.

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


