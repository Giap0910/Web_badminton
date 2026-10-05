# API CHANGES — HỢP ĐỒNG GIAO TIẾP ĐỀ XUẤT

> **Source of truth:** `docs/fix/FIX_TRACKER.csv` là SOURCE OF TRUTH DUY NHẤT cho trạng thái thực thi hiện tại: backend/frontend status và verification, contract, cross-stack, overall, blocker, requested, agent, evidence, commit, last action và last updated. Trạng thái implementation, verification và contract hiện tại chỉ được đọc và ghi tại CSV. Các status/Readiness Assessment trong `.md` chỉ là **PLANNING / READINESS SNAPSHOT**, không dùng để quyết định quyền triển khai hoặc báo tiến độ. Không cập nhật status trong `.md` sau mỗi FIX; chỉ sửa specification khi thay đổi requirement, dependency, acceptance criteria, scope, API contract hoặc quyết định kiến trúc.

API_CHANGES.md chỉ là specification của target API contract: METHOD, ENDPOINT, AUTH, REQUEST, RESPONSE, ERROR RESPONSE, STATUS CODE, compatibility và rollout requirement. Không theo dõi current status trong tài liệu này.

Ngày audit ban đầu:02/10/2026. **Contract mới/thay đổi chưa được triển khai tại thời điểm audit.** Source hiện tại có52 endpoint ở17 controller. Phần “Hiện tại” là inventory source; phần contract phía dưới là thiết kế đích để hai bên thống nhất, không phải cam kết server đang cung cấp.

# Trạng thái contract

`API_CHANGES.md` là target contract chung. Tại audit ban đầu, các contract mới/thay đổi chưa được implement; sau khi bắt đầu triển khai không suy ra trạng thái toàn bộ file từ một nhãn “CHƯA IMPLEMENT”.

Trạng thái contract thực tế của từng FIX nằm duy nhất trong `docs/fix/FIX_TRACKER.csv`, cột CONTRACT_STATUS: `NO_CHANGE`, `PROPOSED`, `APPROVED`, `IMPLEMENTING`, `IMPLEMENTED`, `VERIFIED`. Với cùng FIX BOTH, dùng chung một dòng CSV; FRONTEND_STATUS vẫn BLOCKED nếu BACKEND_STATUS chưa DONE, BACKEND_VERIFY chưa PASSED hoặc contract mới chưa IMPLEMENTED/VERIFIED. Contract Status trong các plan chỉ là readiness snapshot.

Tài liệu này vẫn là nguồn sự thật về METHOD, ENDPOINT, AUTH, REQUEST, RESPONSE, ERROR RESPONSE, STATUS CODE và compatibility/rollout. APPROVED chỉ nghĩa target đã đủ rõ để backend bắt đầu trong phạm vi FIX, không nghĩa endpoint tồn tại. Không có contract nào được coi đã IMPLEMENTED/VERIFIED từ lần chỉnh tài liệu này.

## Phạm vi phê duyệt và rollout theo FIX

Một API group có thể chứa nhiều FIX ở trạng thái khác nhau. APPROVED/IMPLEMENTED của một FIX không phê duyệt/hoàn thành toàn group; không kích hoạt endpoint hoặc field thuộc FIX chưa READY. Backend bàn giao chính xác phần contract thực sự hỗ trợ; frontend chỉ tích hợp phần đó sau khi backend DONE và contract IMPLEMENTED/VERIFIED. Error contract dùng schema ERROR; triển khai validation cục bộ không đồng nghĩa đã hoàn tất FIX-042 trên toàn API.

| FIX | Nhóm | Phạm vi target đủ rõ để bắt đầu; phần chưa được kích hoạt |
|---|---|---|
| FIX-018 | ORDER | Idempotency-Key, request hash, replay 200/201 và conflict 409 trên createOrder hiện hữu; không ép CheckoutInput/variant/quote trước FIX-006/FIX-017. Payload hiện hữu được canonicalize; thay payload cần key mới như quy tắc ORDER. |
| FIX-020 | ORDER | Snapshot productName/productBrand/productImageUrl và dữ liệu lịch sử hiện có; giữ tên trường response. Field variant/service/statusHistory chỉ triển khai khi FIX sở hữu sẵn sàng. |
| FIX-021 | PRODUCT | Round-trip thuộc tính ProductDto/bộ ảnh theo ProductWrite và semantics imageUrls; giữ caller hiện hữu. Variant, lọc/paging/vòng đời theo các FIX tương ứng. |
| FIX-023 | VOUCHER | Validation giá/giới hạn cơ bản, PUT đầy đủ trường editable hiện hành, tắt voucher; preview legacy được giữ theo rollout đã nêu. startsAt/per-user/phạm vi/items thuộc giai đoạn FIX-024 và dependency, không áp đặt ngay. |
| FIX-025 | ADMINUSER | Toàn bộ chặn self-lock/last-admin với query active hiện hữu. |
| FIX-026 | AUTH | Register/login dùng username/email thật và validation liên quan; giữ trường AuthResponse hiện hữu. expiresAt/vòng đời phiên thuộc FIX-028, reset thuộc FIX-027; không tự triển khai cả nhóm AUTH. |
| FIX-042 | ERROR | Schema lỗi/validation ứng dụng, giữ thành công và ngoại lệ webhook; không đồng nghĩa đã thực hiện rate limit FIX-043. |
| FIX-054 | ERROR | Giới hạn tiền VND, số dòng và field trên input hiện hữu theo quy ước chung; không bật CheckoutInput của FIX khác. Chặn trước lưu/gateway; không tự đoán giới hạn nhà cung cấp. |

Các dòng trên làm rõ rollout theo trách nhiệm đã có; không thay METHOD/AUTH/schema đích hoặc dependency graph. Những nhóm/FIX khác vẫn PROPOSED tới readiness riêng. NO API CONTRACT CHANGE giữ NO_CHANGE, không tạo API giả.

## Quy ước chung

- Base dev: http://localhost:8080/api. Endpoint ghi đầy đủ /api; frontend wrapper bỏ tiền tố /api vì baseURL đã có.
- JSON request/response application/json UTF-8, riêng upload multipart và webhook envelope riêng.
- Auth “Login” là JWT hợp lệ của ROLE_USER hoặc ROLE_ADMIN; ADMIN là ROLE_ADMIN. Owner lấy principal, không nhận userId để thay chủ dữ liệu.
- ID positive integer trong miền JavaScript safe integer; nếu dữ liệu tiến gần2^53 phải có kế hoạch đổi ID string đồng bộ, không đổi một phía.
- Tiền đích là số nguyên VND không vượt9,999,999,999 (hoặc giới hạn gateway thấp hơn đã xác minh); tính BigDecimal backend. Không dùng số thập phân bị cắt bởi longValue.
- Date-time mới ISO8601 có offset; server chuẩn hóa Asia/Ho_Chi_Minh/UTC nhất quán. LocalDateTime hiện có chưa offset phải chuyển có chủ đích, không tự coi là UTC; đồng bộ FE trong các nhóm ORDER/PAYMENT/DASHBOARD/VOUCHER.
- PageResponse dùng content,pageNo,pageSize,totalElements,totalPages,last; pageNo bắt đầu0. Khi API trả array legacy, frontend adapter tạm hỗ trợ đúng shape, không vừa lọc toàn cục vừa nhận một trang.
- Chỉ server quyết định giá/discount/stock/payment status/role. Client expectedTotal dùng kiểm tra chênh lệch, không đặt giá.
- Request field không nêu trong write schema không được dùng để mass-assign entity. Null/omitted được mô tả riêng từng resource.
- ID task BOTH giữ nguyên; Related Backend Task và Related Frontend Task trỏ trách nhiệm khác nhau trong cùng FIX-ID.
- NO API CONTRACT CHANGE nghĩa task đó không tự thêm/sửa contract; có thể sử dụng API hiện tại hoặc API do task dependency cung cấp.
- API đề xuất cần rollout theo backend hỗ trợ → FE chuyển caller → bỏ legacy sau kiểm tra; không thay response shape trước khi tất cả caller sẵn sàng.
- Task OPTIONAL FIX-049 chưa có API mới được chốt. Tính năng được chọn sau phải có contract riêng được duyệt trước code.

## Inventory hiện tại —52 endpoint (chưa thay đổi)

Tất cả “Backend có” trong bảng là có mapping source, không có nghĩa đã nghiệm thu runtime. Quyền đã đối chiếu SecurityConfig, @PreAuthorize và service ownership.

| METHOD | ENDPOINT | AUTH / ROLE | Frontend sử dụng | Validation / Nhận xét |
|---|---|---|---|---|
| GET | /api/admin/dashboard | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | Xem FIX liên quan; chưa chạy HTTP test |
| GET | /api/admin/payments | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | Xem FIX liên quan; chưa chạy HTTP test |
| GET | /api/admin/reviews | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | rating/comment có; purchase/duplicate thiếu |
| DELETE | /api/admin/reviews/{id} | ROLE_ADMIN | Wrapper có, UI chưa gọi DELETE | rating/comment có; purchase/duplicate thiếu |
| GET | /api/admin/users | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | profile/change password có; self-lock/phone thiếu |
| PUT | /api/admin/users/{id}/status | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | profile/change password có; self-lock/phone thiếu |
| GET | /api/admin/vouchers | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | create/update thiếu DTO constraints; validate có business checks |
| POST | /api/admin/vouchers | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | create/update thiếu DTO constraints; validate có business checks |
| PUT | /api/admin/vouchers/{id} | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | create/update thiếu DTO constraints; validate có business checks |
| DELETE | /api/admin/vouchers/{id} | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | create/update thiếu DTO constraints; validate có business checks |
| POST | /api/ai-chat | Public | Có gọi trong page/context/api wrapper liên quan | Xem FIX liên quan; chưa chạy HTTP test |
| POST | /api/auth/login | Public | Có gọi trong page/context/api wrapper liên quan | required/email/password cơ bản; rate-limit/reset thiếu |
| POST | /api/auth/register | Public | Có gọi trong page/context/api wrapper liên quan | required/email/password cơ bản; rate-limit/reset thiếu |
| GET | /api/auth/me | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | required/email/password cơ bản; rate-limit/reset thiếu |
| GET | /api/categories | Public | Có gọi trong page/context/api wrapper liên quan | required cơ bản; FK/duplicate cần xử lý |
| GET | /api/categories/{id} | Public | Chưa có UI quản lý category | required cơ bản; FK/duplicate cần xử lý |
| POST | /api/categories | ROLE_ADMIN | Chưa có UI quản lý category | required cơ bản; FK/duplicate cần xử lý |
| PUT | /api/categories/{id} | ROLE_ADMIN | Chưa có UI quản lý category | required cơ bản; FK/duplicate cần xử lý |
| DELETE | /api/categories/{id} | ROLE_ADMIN | Chưa có UI quản lý category | required cơ bản; FK/duplicate cần xử lý |
| GET | /api/comparison | Public | Wrapper có, ComparePage chưa gọi | Xem FIX liên quan; chưa chạy HTTP test |
| POST | /api/orders | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | qty/DB price/stock/owner/state có; length/idempotency/variant thiếu |
| GET | /api/orders/{id} | Login + owner (order cho ADMIN) | Có gọi trong page/context/api wrapper liên quan | qty/DB price/stock/owner/state có; length/idempotency/variant thiếu |
| POST | /api/orders/{id}/cancel | Login + owner (order cho ADMIN) | Có gọi trong page/context/api wrapper liên quan | qty/DB price/stock/owner/state có; length/idempotency/variant thiếu |
| GET | /api/orders/my-orders | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | qty/DB price/stock/owner/state có; length/idempotency/variant thiếu |
| GET | /api/orders/all | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | qty/DB price/stock/owner/state có; length/idempotency/variant thiếu |
| PUT | /api/orders/{id}/status | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | qty/DB price/stock/owner/state có; length/idempotency/variant thiếu |
| POST | /api/payment/payos-webhook | Public + HMAC | Gateway gọi, không phải frontend | HMAC/amount/state; mock guard |
| POST | /api/payment/mock-webhook-trigger | ADMIN + dev + flag | Wrapper mock có; không dùng làm checkout khách | HMAC/amount/state; mock guard |
| GET | /api/products | Public | Có gọi trong page/context/api wrapper liên quan | giá/stock có; mapping/size/sort thiếu |
| GET | /api/products/{id} | Public | Có gọi trong page/context/api wrapper liên quan | giá/stock có; mapping/size/sort thiếu |
| GET | /api/products/{id}/images | Public | Wrapper có, gallery chưa nối | giá/stock có; mapping/size/sort thiếu |
| POST | /api/products | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | giá/stock có; mapping/size/sort thiếu |
| PUT | /api/products/{id} | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | giá/stock có; mapping/size/sort thiếu |
| DELETE | /api/products/{id} | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | giá/stock có; mapping/size/sort thiếu |
| POST | /api/returns | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | owner/reason có; eligibility/transition thiếu |
| GET | /api/returns/my-returns | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | owner/reason có; eligibility/transition thiếu |
| GET | /api/returns/all | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | owner/reason có; eligibility/transition thiếu |
| PUT | /api/returns/{id}/status | ROLE_ADMIN | Có gọi trong page/context/api wrapper liên quan | owner/reason có; eligibility/transition thiếu |
| GET | /api/reviews/product/{productId} | Public | Có gọi trong page/context/api wrapper liên quan | rating/comment có; purchase/duplicate thiếu |
| GET | /api/reviews/my-reviews | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | rating/comment có; purchase/duplicate thiếu |
| POST | /api/reviews | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | rating/comment có; purchase/duplicate thiếu |
| GET | /api/shipping-addresses | Login + owner (order cho ADMIN) | Có gọi trong page/context/api wrapper liên quan | owner có; phone regex/default/address cần sửa |
| GET | /api/shipping-addresses/{id} | Login + owner (order cho ADMIN) | Wrapper có; page chủ yếu dùng list | owner có; phone regex/default/address cần sửa |
| POST | /api/shipping-addresses | Login + owner (order cho ADMIN) | Có gọi trong page/context/api wrapper liên quan | owner có; phone regex/default/address cần sửa |
| PUT | /api/shipping-addresses/{id} | Login + owner (order cho ADMIN) | Có gọi trong page/context/api wrapper liên quan | owner có; phone regex/default/address cần sửa |
| PATCH | /api/shipping-addresses/{id}/default | Login + owner (order cho ADMIN) | Có gọi trong page/context/api wrapper liên quan | owner có; phone regex/default/address cần sửa |
| DELETE | /api/shipping-addresses/{id} | Login + owner (order cho ADMIN) | Có gọi trong page/context/api wrapper liên quan | owner có; phone regex/default/address cần sửa |
| GET | /api/users/profile | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | profile/change password có; self-lock/phone thiếu |
| PUT | /api/users/profile | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | profile/change password có; self-lock/phone thiếu |
| PUT | /api/users/change-password | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | profile/change password có; self-lock/phone thiếu |
| POST | /api/vouchers/validate | Login / user từ JWT | Có gọi trong page/context/api wrapper liên quan | create/update thiếu DTO constraints; validate có business checks |
| GET | /api/vouchers/active | Login / user từ JWT | Wrapper có, chưa thấy page gọi | create/update thiếu DTO constraints; validate có business checks |

## Contract đích theo nhóm

### ERROR — Lỗi và validation dùng chung

- Related Backend Task: FIX-042, FIX-043, FIX-054
- Related Frontend Task: FIX-042, FIX-043
- METHOD / ENDPOINT: áp dụng các API ứng dụng dưới /api; webhook PayOS giữ envelope riêng ở PAYMENT.
- AUTH: giữ nguyên quyền từng endpoint.
- REQUEST: application/json; giới hạn body/danh sách/chuỗi tại DTO; header Authorization: Bearer <token> khi cần.
- RESPONSE: giữ DTO thành công; axiosClient đã unwrap response.data, không bọc thêm data lần nữa.
- ERROR RESPONSE: ApiError = {"timestamp":"2026-10-02T10:00:00+07:00","status":400,"code":"VALIDATION_ERROR","message":"Dữ liệu không hợp lệ","path":"/api/orders","errors":{"shippingPhone":"Số điện thoại không hợp lệ"}}.
- STATUS CODE: 400 JSON/query/enum/validation sai; 401 thiếu/hết hạn/token bị thu hồi; 403 sai quyền; 404 không tồn tại hoặc tài nguyên riêng tư không thuộc user theo policy endpoint; 409 STOCK_CONFLICT/PRICE_CHANGED/INVALID_TRANSITION/DUPLICATE/IDEMPOTENCY_CONFLICT; 413 body/file quá lớn; 415 media sai; 429 RATE_LIMITED kèm Retry-After (giây); 500 lỗi nội bộ không lộ stack; 502/503/504 lỗi dịch vụ ngoài.
- errors là object field→message, rỗng nếu không có lỗi field; code ổn định cho máy, message tiếng Việt.
- POST /api/ai-chat giữ request {message:string}, response {reply:string,recommendedProductIds:number[],recommendedProducts:Product[]}; bổ sung validation message 1..2000, 429/503. Không đổi reply thành HTML.
- CORS: cho phép Idempotency-Key; expose Retry-After; giữ whitelist origin. Không tự bật cookie credentials ngoài cơ chế đã chọn.

### PRODUCT — Catalog, biến thể, bộ lọc và vòng đời

- Related Backend Task: FIX-007, FIX-021, FIX-022, FIX-032, FIX-034
- Related Frontend Task: FIX-007, FIX-021, FIX-022, FIX-032, FIX-034
- Product giữ trường hiện có (id,name,brand,sku,price,originalPrice,stock,reservedStock,imageUrl,imageUrls,description,categoryId/categoryName và thông số trong ProductDto). Bổ sung active:boolean, createdAt/updatedAt, variants:Variant[], soldQuantity:number. Trường read-only không nhận từ client.
- Variant = {id,sku,attributes:{color?,size?,weightClass?,grip?,gaugeMm?,texture?,feather?,speed?,packaging?,capacity?,gender?},price,originalPrice,stock,reservedStock,active}. Giá VND integer; attributes là danh sách key theo loại sản phẩm, không map tùy ý. Attribute làm thay đổi SKU khác serviceSelection.
- Giai đoạn chuyển tiếp: Product.price là giá tối thiểu variant active, stock là tổng stock active để hiển thị; checkout luôn dùng variant cụ thể. Không duy trì hai bộ stock có thể ghi độc lập.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| GET | /api/products | Public; includeInactive chỉ ADMIN | query page=0,size=12,keyword,brand,categoryId,minPrice,maxPrice,weightGrip,balancePoint,stiffness,playStyle,inStock,sale,sizeValue,color,gender,bagType,accessoryType,sortBy,sortDir,includeInactive=false | PageResponse<Product> | 200;400/403 ApiError |
| GET | /api/products/{id} | Public (chỉ active); admin đọc cả inactive | path id>0 | Product | 200;404 ApiError |
| GET | /api/products/{id}/images | Như GET product | path id | string[] URL có thứ tự | 200;404 ApiError |
| POST | /api/products | ADMIN | ProductWrite | Product | 201;400/401/403/409 ApiError |
| PUT | /api/products/{id} | ADMIN | ProductWrite; giữ required name,brand,price giai đoạn trước variant; expectedStock khi sửa stock legacy | Product | 200;400/401/403/404/409 ApiError |
| PATCH | /api/products/{id}/status | ADMIN | {active:boolean} | Product | 200;400/401/403/404 ApiError |
| DELETE | /api/products/{id} | ADMIN | không body | không body | 204;401/403/404/409 PRODUCT_IN_USE |
| POST | /api/products/{id}/variants | ADMIN | {sku,attributes,price,originalPrice?,stock,active} | Variant | 201;400/401/403/404/409 |
| PUT | /api/products/{id}/variants/{variantId} | ADMIN | {sku,attributes,price,originalPrice?,stock?,expectedStock?,active} | Variant | 200;400/401/403/404/409 |

- ProductWrite: name 1..200,brand1..50,sku<=50,categoryId positive,description<=10000,imageUrl<=500,imageUrls<=20 URL và các thuộc tính ProductDto đã có (giới hạn theo column); weightClass,frameMaterial,shaftMaterial,availableSizes,soleType,cushionTechnology,upperMaterial,gender,fabricType,bagType,capacity,racketCapacity,waterproof,accessoryType,quantityPerPack,origin đều phải round-trip. availableSizes hiện là JSON string; duy trì kiểu này cho legacy, variant mới dùng attributes.size. Bổ sung maxTensionLbs:number|null cho kiểm tra dịch vụ; maxTension string giữ hiển thị cũ.
- imageUrls bỏ qua/null: giữ bộ ảnh; []: xóa gallery (ảnh chính vẫn fallback); mảng URL: thay bộ ảnh trong transaction.
- Không cho thay SKU/attributes của variant đã có giao dịch theo cách làm đổi ý nghĩa lịch sử; tạo variant mới/ngừng bán cũ nếu cần. stock cập nhật dùng expectedStock, không cập nhật reservedStock qua API admin.
- includeInactive=true chỉ ADMIN; public hoặc CUSTOMER yêu cầu trường này nhận403. AdminProducts phải gửi true để xem/ngừng bán/bật lại sản phẩm; không dùng endpoint public chỉ active để quản lý toàn catalog.
- size 1..100; page>=0; minPrice<=maxPrice; sortBy chỉ id,price,name,createdAt,soldQuantity; sortDir asc/desc. sale=true nghĩa originalPrice>price, inStock=true nghĩa có variant active đủ kho. Lọc size/màu/weight phải khớp cùng variant, không khớp chéo hai variant.
- Contract list hiện tại trả array nếu thiếu page/size. Đây là thay đổi có khả năng breaking: triển khai backend paged opt-in trước, chuyển toàn bộ callers (Home/Products/Detail/Compare/AdminProducts/Cart) rồi mới bỏ array legacy. Không âm thầm trả trang đầu cho caller còn tưởng toàn bộ dữ liệu.

### ORDER — Báo giá, đặt hàng, snapshot và trạng thái

- Related Backend Task: FIX-006, FIX-008, FIX-017, FIX-018, FIX-020, FIX-039
- Related Frontend Task: FIX-006, FIX-008, FIX-017, FIX-018, FIX-020, FIX-039
- LineInput = {productId:number,variantId:number,quantity:integer1..100,serviceSelection?:{serviceOptionId:number,stringVariantId:number,tensionLbs:number,note?:string}}.
- Không nhận selectedSize/selectedColor tự do làm lựa chọn mua mới sau khi chuyển variant; giữ fields hiển thị cũ trong OrderItemResponse. Legacy productId-only chỉ được map sang đúng một variant mặc định, không đoán nếu có nhiều variant.
- CheckoutInput = {items:LineInput[],addressId?:number,shipping?:{customerName,shippingPhone,addressLine,provinceCode,wardCode,districtCode?},shippingMethod:"STANDARD",email?:string,voucherCode?:string,note?:string,paymentMethod:"COD"|"PAYOS_VIETQR"}.
- addressId hoặc shipping (đúng một), địa chỉ phải đủ cấu trúc theo ADDRESS; server snapshot tên/phone/địa chỉ. email tùy chọn, nếu cung cấp phải hợp lệ. items1..100, tổng mỗi product<=100; note<=2000.
- Quote = {items:[{productId,variantId,quantity,unitPrice,serviceFee,lineTotal,availableStock,optionsSnapshot}],subtotal,discountAmount,shippingFee,totalAmount,voucherCode,shippingMethod,currency:"VND"}.
- Tiền VND nguyên và trong giới hạn FIX-054. unitPrice gồm giá SKU, serviceFee là phí/cước cho mỗi sản phẩm; lineTotal=(unitPrice+serviceFee)*quantity. subtotal=sum(lineTotal); totalAmount=subtotal-discountAmount+shippingFee.
- Quy tắc giai đoạn đầu: STANDARD30.000đ, miễn phí subtotal>=1.000.000đ trước discount; voucher không giảm shipping. Không có lựa chọn phương thức giả.
- Order = OrderResponse hiện tại, thêm subtotal,currency,email,paymentStatus,shippingMethod,paidAt,shippedAt,completedAt,carrier,trackingNumber,statusHistory:[{status,at,actorType}], items mở rộng variantId,sku,optionsSnapshot,serviceFee,lineTotal. price legacy là giá mua gồm serviceFee, subtotal legacy của item bằng lineTotal. productName/productBrand/productImageUrl từ snapshot, không đổi tên thành name/imageUrl.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| GET | /api/products/{id}/stringing-options | Public | path id | [{id,label,stringVariantId,laborFee,stringPrice,minTensionLbs,maxTensionLbs,active}] | 200;404 ApiError |
| PUT | /api/products/{id}/stringing-options | ADMIN | [{id?,label,stringVariantId,laborFee,minTensionLbs,maxTensionLbs,active}] | danh sách như GET | 200;400/401/403/404/409 |
| POST | /api/orders/quote | Login | CheckoutInput | Quote | 200;400/401/403/404/409 |
| POST | /api/orders | Login | CheckoutInput + expectedTotal:number; header Idempotency-Key:UUID | Order | 201 tạo mới;200 replay;400/401/403/404/409 |
| GET | /api/orders/{id} | Chủ đơn hoặc ADMIN | id | Order | 200;401/403/404 |
| POST | /api/orders/{id}/cancel | Chủ đơn hoặc ADMIN | không body | Order | 200 gồm replay;401/403/404/409 |
| PUT | /api/orders/{id}/status | ADMIN | query status enum hiện tại; carrier/trackingNumber tùy chọn khi SHIPPING | Order | 200;400/401/403/404/409 |
| POST | /api/orders/{id}/cod-payment | ADMIN | {reference:string,receivedAt:ISO date-time}; Idempotency-Key | Order | 200;400/401/403/404/409 |

- Quote là preview, không giữ kho/voucher. create luôn tính lại; expectedTotal chỉ để phát hiện giá đổi, không là nguồn định giá. Sai total trả409 PRICE_CHANGED kèm ApiError và details.quote; thiếu stock409 STOCK_CONFLICT kèm details.items.
- Idempotency lookup theo user+key trước pending limit; cùng key/body trả cùng order, không giữ kho lần2; key/body khác409 IDEMPOTENCY_CONFLICT. Key có hiệu lực suốt đời order; requestHash trên payload đã chuẩn hóa. Chưa commit thì retry an toàn, không xóa key khi client timeout.
- Status enum GIỮ: PENDING,PAID,SHIPPING,COMPLETED,CANCELLED. COD PENDING→SHIPPING→COMPLETED; PayOS PENDING→PAID qua webhook hợp lệ hoặc ADMIN reconcile có bằng chứng query PayOS đã xác minh theo PAYMENT→SHIPPING→COMPLETED; PENDING→CANCELLED. Lặp cùng trạng thái idempotent, chuyển lùi409.
- paymentStatus độc lập: UNPAID,PAID,REFUND_PENDING,PARTIALLY_REFUNDED,REFUNDED. Đối soát muộn thuộc PaymentAttempt.NEEDS_REVIEW, không biến đơn CANCELLED thành PAID.
- cod-payment chỉ COD ở SHIPPING/COMPLETED, ghi đúng total từ DB; lặp cùng reference/key không thu2 lần, reference khác khi đã thu trả409.
- Phiên bản này chưa làm carrier API/hoàn tiền tự động; không đổi status từ return query. Các endpoint list nằm trong PAGING.

### PAYMENT — Thanh toán và đối soát

- Related Backend Task: FIX-002, FIX-003, FIX-004
- Related Frontend Task: FIX-002, FIX-003, FIX-004
- PaymentAttempt = {id,orderId,provider:"PAYOS"|"COD",orderCode:null|number,paymentLinkId:null|string,amount,currency:"VND",status:"CREATING"|"PENDING"|"PAID"|"FAILED"|"EXPIRED"|"CANCELLED"|"NEEDS_REVIEW",checkoutUrl,qrPayload,expiresAt,reference,paidAt,reviewReason}. Các URL/reference có thể null trong CREATING.
- Với COD, orderCode/paymentLinkId/checkoutUrl/qrPayload/expiresAt là null; POST cod-payment ghi receipt provider=COD/status=PAID/reference thực. GET admin/payments bao gồm cả receipt COD và attempt PayOS, không tự dựng giao dịch từ orderId. payment-link chỉ chấp nhận provider PAYOS.
- qrPayload là chuỗi thanh toán, KHÔNG phải URL ảnh. FE render QR từ payload hoặc dùng checkoutUrl; nếu sau này thêm qrImageUrl thì phải ghi tên riêng. Không dùng qrCode nhập nhằng. Fields qrCode/qrCodeUrl/accountNo hiện chưa được populate; deprecate trong FE mới, không giả dữ liệu ngân hàng.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| POST | /api/orders/{id}/payment-link | Chủ đơn | không body; Idempotency-Key:UUID | PaymentAttempt | 201 link mới;200 link hiện có;202 CREATING;400/401/403/404/409/502/503/504 ApiError |
| GET | /api/orders/{id}/payment | Chủ đơn hoặc ADMIN | id | PaymentAttempt hoặc null | 200;401/403/404 ApiError |
| POST | /api/admin/payments/{id}/reconcile | ADMIN | {reason:string}; Idempotency-Key | PaymentAttempt | 200/202;400/401/403/404/409/502/503/504 |
| POST | /api/payment/payos-webhook | Không JWT; bắt buộc chữ ký HMAC hợp lệ | Payload PayOS nguyên bản: {code,desc,success:boolean,data,signature}; data gồm orderCode,amount,description,accountNumber,reference,transactionDateTime,currency,paymentLinkId,code,desc và các field gateway ký | {error:0,message:"Đã tiếp nhận",data:null} | 200 chỉ sau ghi nhận bền vững;401 chữ ký sai;400 payload không hợp lệ;500 lưu/xử lý lỗi cần retry |
| POST | /api/payment/mock-webhook-trigger | ADMIN + dev profile + mock-enabled=true | query orderCode,amount | envelope mock hiện có | Giữ hợp đồng hiện tại; production404, không mở cho CUSTOMER |

- Webhook ERROR RESPONSE riêng = {error:1,message:"Không thể xử lý"}; chữ ký sai dùng {error:-1,message:"Chữ ký không hợp lệ"}. Không đưa ApiError vào webhook nếu gateway yêu cầu envelope cũ.
- Payload gateway giữ nguyên schema PayOS. Nguồn chính thức đã được đối chiếu cho quyết định contract FIX-003; chưa xác minh giao dịch sandbox/live. Implementation phải kiểm chứng canonicalization bằng fixture độc lập, không coi payload tự ký trong test là bằng chứng tương thích provider.
- Giữ verify constant-time và amount từ DB; không bỏ qua field ký vì DTO không khai báo. Gateway reference chỉ chấp nhận sau xác minh. Sự kiện đã xử lý trả200; sự kiện muộn lưu NEEDS_REVIEW rồi200, không release/settle kho lần nữa.
- Timeout tạo link: giữ paymentAttempt CREATING, truy vấn bằng orderCode, không tạo orderCode mới vô điều kiện. Một order chỉ một link active; không kéo dài expiry/re-reserve đơn hết hạn qua endpoint retry.
- Backend phát returnUrl=/order-success/{orderId}, cancelUrl=/payment/qr/{orderId}?cancelled=1. FE xác minh trạng thái qua GET; không tin code/status trên query.
- Webhook là nguồn settlement tự động chính. ADMIN reconcile có thể gọi cùng luồng settlement từ bằng chứng query PayOS đã xác minh theo các điều kiện bên dưới; thao tác ADMIN không phải bằng chứng nhận tiền, không nhận amount/status/reference từ client để ép PAID. Hoàn tiền thuộc RETURN, ngoài FIX-003.

#### Phạm vi và bằng chứng provider cho quyết định FIX-003

- CONTRACT_RESOLUTION = SAFE_WITHOUT_API_SHAPE_CHANGE: làm rõ ngữ nghĩa nguồn bằng chứng và xử lý sự kiện nội bộ; giữ METHOD/ENDPOINT/AUTH, request/response PaymentAttempt và webhook envelope. Trạng thái phê duyệt/thực thi đọc duy nhất từ FIX_TRACKER.csv, không suy ra implementation từ đặc tả này.
- FIX-003 dùng tiếp nền FIX-002: một attempt cho order, orderCode ổn định, amount từ DB, CREATING/PENDING, query trước retry tạo link, HTTP gateway ngoài transaction. Không thay thế luồng recovery hoặc làm query tạo link tự settlement. Không triển khai FIX-004, COD receipt creation/POST cod-payment, paymentStatus/history của FIX-039, refund/return. Receipt COD đã persist thì được đọc; không tự tạo receipt từ đơn đã giao.
- Fact provider: webhook gồm code/desc/success/data/signature; chữ ký bảo vệ data, không bảo vệ riêng các cờ top-level. confirm-webhook gửi giao dịch ngân hàng mẫu đã ký để kiểm tra endpoint. Nguồn: [PayOS webhook](https://payos.vn/docs/du-lieu-tra-ve/webhook/), [PayOS API](https://payos.vn/docs/api/), [quy tắc signature](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/).
- Fact provider: query GET /v2/payment-requests/{id} nhận paymentLinkId hoặc orderCode; dữ liệu trả có id,orderCode,amount,amountPaid,amountRemaining,status,transactions. Mỗi transaction có reference,amount,transactionDateTime; không có cam kết chỉ một transaction. PaymentLink model hiện không có currency; không tự thêm field vào dữ liệu trước verify.
- Nguồn SDK chính thức: [PaymentLink](https://raw.githubusercontent.com/payOSHQ/payos-lib-java/main/src/main/java/vn/payos/model/v2/paymentRequests/PaymentLink.java), [Transaction](https://raw.githubusercontent.com/payOSHQ/payos-lib-java/main/src/main/java/vn/payos/model/v2/paymentRequests/Transaction.java), [WebhookData](https://raw.githubusercontent.com/payOSHQ/payos-lib-java/main/src/main/java/vn/payos/model/webhooks/WebhookData.java), [CryptoProviderImpl](https://raw.githubusercontent.com/payOSHQ/payos-lib-java/main/src/main/java/vn/payos/crypto/CryptoProviderImpl.java), [query verifier](https://raw.githubusercontent.com/payOSHQ/payos-lib-java/main/src/main/java/vn/payos/service/blocking/v2/paymentRequests/PaymentRequestsServiceImpl.java), [webhook verifier/confirm](https://raw.githubusercontent.com/payOSHQ/payos-lib-java/main/src/main/java/vn/payos/service/blocking/webhooks/WebhooksServiceImpl.java). Query get dùng response signing BODY; HTTP200 đơn lẻ không chứng minh nhận tiền.
- Không tìm thấy cam kết reference unique toàn gateway trong các nguồn chính thức trên. Khóa tổng hợp và chính sách dưới đây là quyết định của project, không phải cam kết uniqueness toàn cục của PayOS.

#### PaymentEvent — định danh, ledger và xung đột

- Bắt buộc có ledger PaymentEvent cho bằng chứng đã verify; một PaymentAttempt đơn lẻ không đủ lưu các giao dịch/đối soát. Dedupe key chính xác = (provider,paymentLinkId,reference), với PayOS = ("PAYOS",paymentLinkId,reference). DB unique key = UNIQUE(provider,payment_link_id,reference); không UNIQUE(reference) đơn độc. Identifiers giữ đúng giá trị provider, phân biệt hoa/thường khi so sánh/unique; không trim, đổi case hoặc cắt ngắn để tạo khóa khác.
- Immutable payment facts gồm orderCode,amount,currency,transactionDateTime. Lưu facts gốc và giá trị so sánh có chuẩn hóa xác định; không sửa amount nhận thực thành amount mong đợi. Tiền xử lý chính xác, không float hoặc longValue cắt phần lẻ; amount kỳ vọng của attempt vẫn lấy DB và giữ giới hạn FIX-054.
- Cùng key + cùng immutable facts: duplicate retry; ACK200 sau xác nhận bản ghi đã commit, không tạo PaymentEvent hoặc settlement/tác dụng kho/voucher lần hai. ACK duplicate không có nghĩa sự kiện UNMATCHED/NEEDS_REVIEW đã được settlement; reconcile có thể đánh giá lại khi có bằng chứng đầy đủ, giữ toàn bộ lịch sử.
- Cùng key + khác bất kỳ immutable fact: EVENT_IDENTITY_CONFLICT; không coi là retry thông thường. Giữ nguyên PaymentEvent gốc, append bản ghi audit xung đột liên kết event gốc, chứa facts mới đã verify, source, receivedAt, reviewReason; không ghi đè hoặc tạo event bình thường thứ hai với cùng key. Lần lặp cùng xung đột không nhân bản audit vô hạn; nhận diện observation trùng bằng facts/fingerprint xác định.
- Xung đột phải commit bền vững trước ACK200; attempt xác định an toàn chuyển/giữ NEEDS_REVIEW. Không gán event cho một order khác chỉ từ orderCode mâu thuẫn. Không tự settlement, hồi sinh order hoặc thay stock/voucher. Nếu order đã PAID/SHIPPING/COMPLETED từ bằng chứng trước, giữ lịch sử/trạng thái order và paidAt đã xác minh, bổ sung review, không thu tiền/settle lần nữa.
- eventFingerprint SHA-256 trên provider,paymentLinkId,reference,orderCode,amount,currency,transactionDateTime là dữ liệu audit nội bộ hữu ích; không thay business unique key, không là bằng chứng chữ ký. Cách serialize phải xác định và không nhập nhằng. Facts gốc/audit append-only giữ bằng chứng cả hai phía xung đột.
- Minimum fields: id,provider,paymentAttemptId nullable,orderId nullable,paymentLinkId,orderCode,reference,amount,currency,transactionDateTime gốc,receivedAt,verifiedAt,source WEBHOOK hoặc RECONCILE_QUERY,processingResult nội bộ,reviewReason,eventFingerprint/payloadHash nếu dùng,createdAt. FKs nullable cho sự kiện không khớp; khi có relation phải khớp đúng attempt/order. Không cascade xóa ledger theo order/attempt làm mất audit.
- Bản ghi không khớp có processingResult UNMATCHED/NEEDS_REVIEW và reviewReason xác định; không tạo PaymentAttempt giả hoặc Order tổng hợp. Không lưu checksum secret/API key/raw auth header; không lộ raw signature hoặc payload nhạy cảm trong public DTO. Không mặc định lưu raw payload; chỉ lưu facts/audit tối thiểu đã được kiểm soát.
- transactionDateTime giữ nguyên để audit; paidAt chỉ dùng thời gian provider khi parse đáng tin cậy, theo quy ước date-time chung, không mặc định giờ không offset là UTC hoặc thay bằng now() để giả thời gian nhận tiền. Thời gian không diễn giải an toàn thì lưu bằng chứng với INVALID_TRANSACTION_TIME/NEEDS_REVIEW, không tự settlement.

#### Webhook — thứ tự xử lý và HTTP

- Thứ tự bắt buộc: parse an toàn → kiểm tra cấu trúc top-level/required signed fields → verify HMAC trên data nguyên bản → phân loại thành công → map attempt bằng paymentLinkId và orderCode → đối chiếu relation order → kiểm tra amount/currency/thời gian → lưu event/outcome → settlement nếu đủ điều kiện. Event/outcome và thay đổi settlement cùng transaction, ACK chỉ sau commit.
- HMAC-SHA256 UTF-8 theo canonicalization PayOS cho payment requests/webhook: sắp key, key=value nối &, giữ toàn bộ field được ký kể cả field chưa có trong DTO; không tự bỏ null hoặc thêm field không gửi trước verify. Theo createSignatureFromObj của SDK Java: key có giá trị JSON null vẫn tham gia với giá trị chuỗi rỗng; key không gửi không được tự thêm. Danh sách giữ thứ tự phần tử, sắp key của từng object rồi serialize JSON compact; scalar giữ biểu diễn chính xác theo provider, không đổi số nguyên thành số thập phân. Kiểm chứng bằng fixture độc lập cho null/field mới/transactions; không dùng thuật toán payouts/URI encoding. Giữ so sánh constant-time của project.
- orderCode/amount đúng kiểu số nguyên theo provider; reference/paymentLinkId/currency/transactionDateTime phải có kiểu hợp lệ, identifiers bắt buộc không rỗng. Thiếu required field/sai kiểu là malformed400, không tin payload chưa verify. Currency hợp lệ về cấu trúc nhưng khác currency kỳ vọng là business mismatch, không malformed.
- Điều kiện thành công bắt buộc gồm signed data.code="00"; top-level code="00" và success=true phải phù hợp, không dùng riêng cờ top-level làm authority. Không giả định mọi webhook HMAC-valid đều là tiền đã nhận. Signed non-success/inconsistent success flags lưu outcome NON_SETTLING/NEEDS_REVIEW với lý do, ACK200 sau commit, không PAID; không tự hạ/ghi đè một payment đã settle.
- Chỉ settlement khi paymentLinkId và orderCode cùng khớp một PAYOS attempt đã persist, attempt thuộc đúng order, amount đúng amount DB, currency đúng VND kỳ vọng, thời gian đáng tin cậy, provider success và order còn eligible. Không tin frontend return query, client amount, admin status hoặc reference tự nhập.
- confirm-webhook sample áp dụng cùng các gates; không hardcode orderCode/amount/reference mẫu. Sample-like signed event không khớp attempt được ghi ledger UNMATCHED với FK nullable rồi ACK200; không settlement, không tạo merchant order tự động.
- Identity mismatch một phần: ví dụ paymentLinkId thuộc A nhưng orderCode khác A → ledger/audit IDENTITY_MISMATCH, attempt A NEEDS_REVIEW nếu xác định an toàn, order không đổi. Nếu không thể gán relation an toàn, giữ FK nullable; không chọn order B để settlement.
- Wrong amount/currency: lưu số tiền/currency thực đã verify, attempt NEEDS_REVIEW, reviewReason AMOUNT_MISMATCH/CURRENCY_MISMATCH, order/paymentStatus không thành PAID, không tác động kho/voucher. reference chỉ là bằng chứng provider đã verify; paidAt của settlement chưa xác nhận không được giả lập, transactionDateTime thực nằm trong ledger.

| Trường hợp webhook | HTTP / envelope | Lưu trữ và hành vi |
|---|---|---|
| HMAC sai | 401 {error:-1,message:"Chữ ký không hợp lệ"} | Không tạo trusted PaymentEvent; log metadata đã làm sạch nếu cần; không settlement. |
| Malformed/thiếu required signed field | 400 {error:1,message:"Không thể xử lý"} | Không PAID; dữ liệu không verify được không vào trusted ledger. |
| Signed hợp lệ, đủ gates và order eligible | 200 {error:0,message:"Đã tiếp nhận",data:null} | Event + attempt PAID + Order PENDING→PAID commit atomically. |
| Duplicate cùng key/cùng facts đã commit | 200 envelope thành công trên | Không event/settlement/tác dụng phụ lần hai; kết quả chưa settle vẫn giữ nguyên. |
| Signed unmatched/sample-like | 200 envelope thành công trên | Commit ledger UNMATCHED/NEEDS_REVIEW, FK nullable; không đổi order. |
| Signed wrong amount/currency | 200 envelope thành công trên | Commit ledger + attempt NEEDS_REVIEW với lý do; không đổi order/kho/voucher. |
| Signed identity mismatch/key collision | 200 envelope thành công trên | Commit ledger hoặc audit conflict + review; không tự settlement. |
| Signed non-success hoặc tiền đến muộn | 200 envelope thành công trên | Commit outcome non-settling/review; không revival. |
| DB/storage/transaction/commit lỗi | 500 {error:1,message:"Không thể xử lý"} | Không ACK giả; rollback thay đổi chưa commit, retry phải xử lý được. |

- HTTP retry dành cho lỗi xử lý/lưu trữ tạm thời; deterministic business mismatch không trả400/500 để yêu cầu gateway gửi lại vô hạn. Không dùng cờ processed trong memory thay DB durable state.

#### ADMIN reconcile — bằng chứng, settlement và idempotency

- POST /api/admin/payments/{id}/reconcile: id là PaymentAttempt.id, không phải Order.id/orderCode. JWT ROLE_ADMIN; body chỉ reason:string không blank; header Idempotency-Key:UUID bắt buộc. Field amount/status/reference/forcePaid từ client không được sử dụng để thay dữ kiện thanh toán. Giữ owner/JWT của GET payment; webhook vẫn không JWT và bắt buộc HMAC.
- Chỉ query PayOS server-to-server qua endpoint cấu hình tin cậy, authenticated x-client-id/x-api-key, response code thành công và verify BODY signature theo PayOS trên data gốc, gồm các transactions; không tin HTTP200, frontend query hay URL do client gửi. Không lộ credentials vào DTO/log.
- Query lấy định danh từ attempt DB: data.id phải bằng paymentLinkId kỳ vọng và orderCode phải đúng attempt/order; không tự gắn một link lạ. PAYOS attempt phải có currency=VND. Query model không trả currency: currency của event query lấy ngữ cảnh PAYOS/VND đã xác minh, không bịa field currency đã được provider ký; bằng chứng webhook currency mâu thuẫn chưa giải quyết vẫn chặn settlement.
- Query chỉ đủ authority khi status=PAID, amount=amount DB, amountPaid=amount DB, amountRemaining=0, transactions không rỗng; từng transaction có reference thực không rỗng, amount nguyên dương chính xác và transactionDateTime đáng tin cậy. Tổng các received transactions thuộc chính payment request này phải bằng amount DB. Không chọn một subset để che overpayment hoặc dữ kiện mâu thuẫn.
- Mỗi transaction có event riêng với key PAYOS+paymentLinkId+reference, giữ đầy đủ reference; không giả định một link chỉ một giao dịch. Query list có key lặp hoặc cùng key khác facts là bằng chứng mâu thuẫn → durable audit/NEEDS_REVIEW, không cộng lặp để làm đủ tiền.
- Partial payments chưa đủ tổng không settlement; nếu query sau chứng minh đầy đủ và mọi event/facts khớp, có thể giải quyết AMOUNT_MISMATCH do từng khoản chuyển nhỏ hơn tổng, giữ audit trước và đi qua cùng gates. Không tự xóa/bỏ qua IDENTITY_MISMATCH, CURRENCY_MISMATCH, EVENT_IDENTITY_CONFLICT hoặc late-payment blocker để ép PAID.
- Webhook và reconcile phải dùng một domain settlement path nhận trusted evidence source WEBHOOK/RECONCILE_QUERY. ADMIN không force PAID; query provider đã verify mới là authority thay webhook bị thiếu. Không duy trì hai bộ quy tắc settlement riêng.
- HTTP gateway ngoài DB transaction; khi có bằng chứng, transaction phải đọc lại và lock order/attempt cùng unique event ở DB, dùng thứ tự lock nhất quán với order/products hiện hữu. Eligibility kiểm tra lại sau lock; không dùng snapshot trước query để bỏ qua cancel/expiry/race. exists-check riêng không thay DB uniqueness.
- Normal settlement: event(s) + attempt PAID/reference/paidAt + Order PENDING→PAID atomic. Stock đã trừ/giữ chỗ khi tạo order; chỉ settle reservation hiện hữu một lần, không trừ stock hoặc reserve/consume voucher lần hai. Webhook/reconcile đồng thời chỉ một settlement và một event cho mỗi key; request còn lại trả trạng thái durable hiện tại.
- Đã PAID/SHIPPING/COMPLETED từ cùng bằng chứng: không lặp settlement, không đổi paidAt xác nhận cũ. Reference mới/extra money hoặc facts mâu thuẫn vẫn lưu audit/review, không bị bỏ qua chỉ vì order đã PAID.
- PaymentAttempt.reference là reference thật khi chỉ một transaction đóng góp vào kết quả đã xác minh; khi nhiều transaction đóng góp thì null, ledger là nguồn đầy đủ. Không tự chọn reference đầu/cuối hoặc dựng từ orderId. paidAt settlement là thời điểm provider nhận đủ tiền (thời gian transaction hoàn tất tổng, muộn nhất trong tập đóng góp đã xác minh); nếu không đáng tin thì NEEDS_REVIEW, không now(). Khi đã settle, duplicate không ghi lại paidAt.
- Order CANCELLED hoặc attempt/order hết hạn trước settlement: persist tiền đã verify, attempt NEEDS_REVIEW với LATE_PAYMENT_CANCELLED_ORDER/LATE_PAYMENT_EXPIRED, order giữ nguyên, không PAID/revival/re-reserve/restore/settle/release kho hoặc mutation voucher. Áp dụng cả webhook và reconcile; reconcile trả200 definitive review.
- Idempotency lưu theo attempt+key+intent chuẩn hóa reason, audit ADMIN actor. Cùng attempt/key/intent sau kết quả definitive không lặp tác dụng; trả200 PaymentAttempt durable hiện tại. Cùng key khác intent409 IDEMPOTENCY_CONFLICT ApiError. Kết quả202 hoặc lỗi upstream không đóng key thành thành công vĩnh viễn; retry cùng key được query lại an toàn. Key đối soát không thay key tạo link của FIX-002.
- 200 nghĩa đạt kết quả provider-backed definitive và đã commit: PAID nếu eligible; NEEDS_REVIEW nếu late/mismatch/conflict; hoặc replay cùng intent đã definitive. 200 không mặc định Order PAID. Query đã verify nhưng identity/amount/aggregate mâu thuẫn thì ghi review bền vững, không settlement, trả200 kết quả review.
- 202 nghĩa bằng chứng chưa đủ kết luận: provider còn PENDING/chưa có confirmed transactions hoặc outcome cần kiểm tra lại. Giữ pending/review phù hợp, lưu bằng chứng đáng tin đã có nếu cần, không forced PAID. Không dùng NEEDS_REVIEW chỉ để thay lỗi mạng.
- Timeout504; provider unavailable502/503; rate-limit ánh xạ503 an toàn; response query sai cấu trúc/chữ ký502, không trusted ledger/PAID; local state không phù hợp409; auth/validation/not-found giữ400/401/403/404 và ApiError. Upstream failure retry cùng key được. Lỗi DB/commit theo500 ApiError chung, không trả200/202 khi ghi outcome thất bại.
- GET /api/admin/payments đọc attempt/receipt đã persist và dữ kiện thực; shape PaymentAttempt + customerName/paymentMethod, status filter theo PaymentAttempt.status, PageResponse hoặc array legacy đúng PAGING. Không transId/bankRef giả từ orderId. UNMATCHED chưa có attempt nằm trong audit nội bộ, không tạo hàng PaymentAttempt giả hoặc endpoint công khai mới.
- Bàn giao FE dùng status/reference/paidAt/reviewReason thật, null cho nhiều references không bị diễn giải là chưa nhận tiền; không có paidAt giả hoặc success toast cho202. Giữ UI/theme hiện hữu, loading/error/empty và responsive theo FRONTEND_FIX_PLAN; frontend chỉ tích hợp sau backend DONE/PASSED và contract IMPLEMENTED/VERIFIED.

#### Kiểm thử bắt buộc khi triển khai sau — chưa chạy trong contract resolution

- Webhook: fixture provider độc lập/HMAC đúng-sai; success top-level và signed data.code; thiếu signed field/sai kiểu; null/unknown field canonicalization; signed sample-like unmatched; wrong amount/currency; sai cặp orderCode/paymentLinkId; normal payment; duplicate; concurrent same webhook; cùng key khác immutable facts; cùng reference khác link không bị global uniqueness chặn.
- Durability/late: CANCELLED/expired có ledger + NEEDS_REVIEW, không revival; DB/commit fail→500, rollback không để partial PAID/event processed, retry thành công một lần; conflict giữ facts gốc và audit mới; unmatched nullable FK; reference/paidAt thật, nhiều transactions giữ từng reference.
- Reconcile: ADMIN/JWT, id attempt và reason/UUID; query PENDING→202; PAID đủ amount/amountPaid/remaining/transactions→200 settlement; thiếu transaction→202; query identity/aggregate/currency-context mismatch→review không settle; nhiều transactions/partial→full; query signature sai không PAID; same key/intent replay; khác intent409; timeout/5xx/503 và retry cùng key.
- Backend DB integration riêng: webhook/reconcile race, webhook lặp đồng thời, cancel/expiry trong lúc query, unique key case-sensitive, atomic event/attempt/order và rollback; Order transition/reservation settle đúng một lần, không thêm stock/voucher mutation. Giữ JUnit5 và fuzz HMAC hiện có; không dùng production DB.
- Cross-stack sau khi hai phía hoàn thành: API trả PaymentAttempt thật/200 hoặc202/error → AdminPaymentsPage/OrderDetailPage render status/reference/reviewReason đúng, không giả PAID; request id/key/reason đúng; mounted FE loading/error/empty, stale response/double-click và responsive. Backend không tự sửa UI; frontend không kiểm thử DB concurrency thay backend.

### ADDRESS — Địa chỉ có cấu trúc

- Related Backend Task: FIX-015
- Related Frontend Task: FIX-015
- AddressWrite = {fullName:string1..100,phone:string,addressLine:string1..500,provinceCode:string,wardCode:string,districtCode?:string|null,isDefault:boolean,tag?:string|null,note?:string|null}.
- Address = {id,...AddressWrite,province:string,ward:string,district:string|null,address:string,createdAt}. address là chuỗi hiển thị được server ghép; không nạp address vào addressLine để ghép lần nữa.
- districtCode tùy phiên bản bộ địa chỉ shop sử dụng; không buộc cấu trúc hành chính cũ. Nguồn danh mục phải được chốt và kiểm tra khi triển khai; không tuyên bố danh sách hardcode hiện tại là cập nhật.
- Legacy address giữ nguyên, addressLine/code có thể null trong GET; FE yêu cầu người dùng xác nhận cấu trúc khi sửa, không đoán.
- Phone đề xuất ^(\+84|0)[35789][0-9]{8}$ và normalize về một chuẩn; tag<=30,note<=500.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| GET | /api/shipping-addresses | Login | không body | Address[] của user | 200;401 |
| GET | /api/shipping-addresses/{id} | Owner | id | Address | 200;401/404 |
| POST | /api/shipping-addresses | Login | AddressWrite | Address | 201;400/401 |
| PUT | /api/shipping-addresses/{id} | Owner | AddressWrite | Address | 200;400/401/404 |
| PATCH | /api/shipping-addresses/{id}/default | Owner | không body | Address | 200;401/404 |
| DELETE | /api/shipping-addresses/{id} | Owner | không body | không body | 204;401/404 |

- ERROR RESPONSE: ApiError. UserId không có trong request.
- PUT isDefault=false với địa chỉ đang mặc định giữ invariant: chỉ bỏ default bằng chọn địa chỉ khác hoặc xóa; trả400 DEFAULT_REQUIRED thay vì âm thầm bỏ qua.
- Danh mục địa chỉ giai đoạn đầu dùng cùng bộ dữ liệu đã xác nhận cho BE/FE; nếu cần endpoint geography thì chốt thêm trước implementation, không tự gọi dịch vụ ngoài.

### VOUCHER — Voucher và preview đủ điều kiện

- Related Backend Task: FIX-023, FIX-024
- Related Frontend Task: FIX-023, FIX-024
- VoucherWrite = {code (chỉ create),description,discountType:"FIXED"|"PERCENT",discountValue,minOrderValue,maxDiscountAmount:number|null,maxUses:integer|null,expiresAt:ISO|null,isActive:boolean,startsAt?:ISO|null,maxUsesPerUser?:integer|null,applicableProductIds?:number[],applicableCategoryIds?:number[]}.
- Voucher response thêm id,code,usedCount (read-only). Giới hạn mới thuộc FIX-024, không bắt buộc làm cùng bản sửa giá âm.
- POST required code/discountType/discountValue/isActive; PUT full editable fields required, nullable field=null có nghĩa bỏ giới hạn. code không đổi; usedCount gửi lên bị từ chối.
- Hai danh sách áp dụng cùng rỗng nghĩa toàn catalog; nếu có cả hai, sản phẩm thuộc một trong hai tập thì đủ điều kiện. Discount tính trên tổng các dòng đủ điều kiện; minOrderValue tính subtotal toàn giỏ. Phải hiển thị quy tắc này trên UI.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| POST | /api/admin/vouchers | ADMIN | VoucherWrite | Voucher | 201;400/401/403/409 |
| PUT | /api/admin/vouchers/{id} | ADMIN | VoucherWrite không code | Voucher | 200;400/401/403/404/409 |
| DELETE | /api/admin/vouchers/{id} | ADMIN | không body | không body | 204;401/403/404/409 VOUCHER_IN_USE |
| GET | /api/admin/vouchers | ADMIN | query page/size tùy PAGING | Voucher[] hoặc PageResponse<Voucher> trong giai đoạn chuyển | 200;400/401/403 |
| GET | /api/vouchers/active | Login | không body | Voucher[] công khai điều kiện, không dữ liệu usage người khác | 200;401 |
| POST | /api/vouchers/validate | Login | {code:string,items:LineInput[]} | {valid:true,code,description,discountType,discountValue,discountAmount,finalTotal,message} | 200;400 VOUCHER_INVALID;401;404 VOUCHER_NOT_FOUND;409 VOUCHER_EXHAUSTED |

- ERROR RESPONSE: ApiError. finalTotal ở validate là subtotal-discountAmount, KHÔNG bao gồm shipping; Quote.totalAmount mới là tiền thanh toán.
- Current validate {code,orderTotal} chỉ preview legacy. Chuyển FE sang items cùng backend trước khi bật phạm vi/per-user; createOrder luôn reserve lại bằng DB/user thật.
- Xóa voucher đã gắn usage/order bị409, tắt isActive thay thế; không xóa lịch sử sử dụng. maxUses không thấp hơn usedCount; null là không giới hạn; maxDiscount không âm; PERCENT<=100.

### REVIEW — Review đã mua và quyền sửa/xóa

- Related Backend Task: FIX-012
- Related Frontend Task: FIX-012
- Review response giữ fields hiện tại id/productId/productName/productImageUrl/productBrand/userId/username/userFullName/rating/comment/createdAt; thêm orderItemId,verifiedPurchase:boolean,updatedAt.
- Public review không trả email/phone/địa chỉ; userId/username legacy cần đánh giá giảm lộ định danh khi đổi DTO, không mở rộng PII.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| GET | /api/reviews/eligible-items | Login | query productId | [{orderItemId,orderId,productId,optionsSnapshot,reviewId:null hoặc id}] thuộc user | 200;400/401 |
| POST | /api/reviews | Login + đã mua | {productId,orderItemId,rating:1..5,comment:1..2000} | Review | 201;400/401/403/404/409 REVIEW_EXISTS |
| PUT | /api/reviews/{id} | Owner | {rating,comment} | Review | 200;400/401/403/404 |
| DELETE | /api/reviews/{id} | Owner | không body | không body | 204;401/403/404 |
| GET | /api/reviews/product/{productId} | Public | productId;page/size theo PAGING | Review[] hoặc PageResponse<Review> | 200;400/404 |
| GET | /api/reviews/my-reviews | Login | page/size theo PAGING | Review[] hoặc PageResponse<Review> | 200;400/401 |

- ERROR RESPONSE: ApiError. unique(orderItemId) được bảo vệ cả DB và service; purchase COMPLETED, orderItem phải đúng product và user.
- Sửa không thay product/orderItem/user. Xóa review sẽ cho gửi lại trên item đó theo chính sách tối thiểu; nếu shop muốn lưu moderation history thì chốt bổ sung.
- Admin DELETE /api/admin/reviews/{id} hiện đã có: NO API CONTRACT CHANGE cho FIX-051; hide/reply chưa triển khai, không tự tạo endpoint trong kế hoạch tối thiểu.

### RETURN — Đổi trả và bằng chứng hoàn tiền

- Related Backend Task: FIX-014
- Related Frontend Task: FIX-014
- Request đổi trả tối thiểu theo toàn đơn; trả từng item/số lượng là mở rộng sau, không ngầm coi đã hỗ trợ.
- Return giữ {id,orderId,userId,userFullName,reason,imageUrl,status,adminNote,createdAt}; thêm processedAt,refundStatus,refundAmount. Không đổi userFullName thành customerName.
- Refund = {id,orderId,returnId,amount,method:"MANUAL",reference,status:"RECORDED",refundedAt,recordedAt}; đây là bằng chứng tiền đã hoàn ngoài hệ thống, không phải gateway tự chuyển tiền.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| POST | /api/returns | Owner đơn COMPLETED trong hạn | {orderId,reason:string1..2000,imageUrl?:asset URL} | Return | 201;400/401/403/404/409 RETURN_NOT_ELIGIBLE hoặc RETURN_EXISTS |
| GET | /api/returns/my-returns | Login | page/size theo PAGING | Return[] hoặc PageResponse<Return> | 200;400/401 |
| GET | /api/returns/all | ADMIN | page/size/status theo PAGING | Return[] hoặc PageResponse<Return> | 200;400/401/403 |
| PUT | /api/returns/{id}/status | ADMIN | query status=PENDING/APPROVED/REJECTED/COMPLETED;adminNote tùy chọn <=2000 | Return | 200;400/401/403/404/409 |
| POST | /api/admin/returns/{id}/refunds | ADMIN | {amount,reference,refundedAt,reason};Idempotency-Key | Refund | 201;200 replay;400/401/403/404/409 |
| POST | /api/admin/returns/{id}/restock | ADMIN | {items:[{orderItemId,quantity}],inspectionNote};Idempotency-Key | {returnId,movementIds:[id]} | 201;200 replay;400/401/403/404/409 |

- ERROR RESPONSE: ApiError. PENDING→APPROVED/REJECTED; APPROVED→COMPLETED, cùng trạng thái idempotent; không chuyển lùi.
- returnWindowDays là giá trị chính sách shop phải duyệt; tính từ completedAt, không createdAt. Chưa xác định được completedAt đơn cũ thì xử lý thủ công.
- Refund amount<=tiền đã nhận-trả trước; reference unique theo phương thức; không cho ghi hoàn tiền cho COD chưa thu. Restock chỉ hàng đã kiểm nhận, số lượng không vượt đã mua-trả trước; không lấy total toàn đơn làm số lượng nhập kho.
- COMPLETED của return nghĩa nghiệp vụ đổi trả đã xử lý; không tự đánh REFUNDED nếu chưa có record hoàn tiền. Khi kết thúc xử lý có refund phải kiểm tra trạng thái/amount theo chính sách đã chọn.

### ADMINUSER — Khóa tài khoản quản trị an toàn

- Related Backend Task: FIX-025
- Related Frontend Task: FIX-025
- METHOD: PUT
- ENDPOINT: /api/admin/users/{id}/status
- AUTH: ROLE_ADMIN, current actor lấy JWT.
- REQUEST: query active:boolean; không body (giữ cách gọi hiện tại).
- RESPONSE: UserProfileResponse hiện có.
- ERROR RESPONSE: ApiError; code SELF_LOCK_FORBIDDEN hoặc LAST_ADMIN_REQUIRED.
- STATUS CODE: 200;400 query sai;401;403;404;409 thao tác tự khóa/admin cuối.
- Không thêm role management hoặc STAFF vào task này. UI hiển thị role đã có; tổng chi tiêu/orderCount không tự coi là0 khi backend chưa cung cấp.

### AUTH — Danh tính, reset và thu hồi phiên

- Related Backend Task: FIX-026, FIX-027, FIX-028
- Related Frontend Task: FIX-026, FIX-027, FIX-028
- AuthResponse giữ {token,type:"Bearer",id,username,email,fullName,role}; thêm expiresAt ISO. Không thêm refreshToken trong giai đoạn tối thiểu.
- Password đề xuất tối thiểu8 ký tự, không quá72 byte UTF-8 để phù hợp BCrypt; áp dụng đăng ký/đổi/reset mới, không từ chối login mật khẩu cũ chỉ vì ngắn hơn policy mới.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| POST | /api/auth/register | Public | {username:3..50,email<=100,password,fullName:1..100,phone?:string,address?:string} | AuthResponse | Giữ200;400/409/429 |
| POST | /api/auth/login | Public | {username:string,password:string}; username có thể là email thật | AuthResponse | 200;400/401/429 |
| GET | /api/auth/me | Login | không body | {id,username,email,fullName,role} | 200;401 |
| POST | /api/auth/logout | Login | không body | không body | 204;401 |
| PUT | /api/users/change-password | Login | {currentPassword,newPassword} | không body sau chuyển contract | 204;400/401/429 |
| POST | /api/auth/forgot-password | Public | {email:string} | {message:"Nếu tài khoản hợp lệ, hướng dẫn sẽ được gửi"} | 202 cả email tồn tại/không tồn tại;400 email sai định dạng;429 |
| POST | /api/auth/reset-password | Public token một lần | {token:string,newPassword:string} | không body | 204;400 RESET_TOKEN_INVALID;429 |

- ERROR RESPONSE: ApiError. email normalize trim/lowercase; username cần chính sách case nhất quán với DB collation.
- logout là logout TẤT CẢ phiên qua tokenVersion; phải ghi rõ trên UI. change/reset password tăng version và FE yêu cầu đăng nhập lại. Logout offline chỉ xóa local, không hứa đã thu hồi server.
- Remember login chỉ quyết định sessionStorage/localStorage ở FE; không đổi thời hạn JWT tùy ý. Không triển khai refresh tự động trong kế hoạch này; re-login khi hết24 giờ.
- Email verification/social/OTP chưa thuộc bản tối thiểu: không tạo route giả, không tuyên bố đã có; nếu yêu cầu xác minh email được chốt thì bổ sung task/contract trước code.

### PROFILE — Hồ sơ

- Related Backend Task: FIX-029
- Related Frontend Task: FIX-029
- METHOD: GET / PUT.
- ENDPOINT: /api/users/profile.
- AUTH: Login, chính chủ từ JWT.
- REQUEST GET: không body. PUT: {fullName:string1..100,phone?:string,address?:string,dob?:YYYY-MM-DD|null,gender?:"MALE"|"FEMALE"|"OTHER"|null,avatarUrl?:string|null}; chỉ field được gửi mới update, null xóa field nullable.
- RESPONSE: UserProfileResponse hiện có + dob,gender,avatarUrl; không password/tokenVersion.
- ERROR RESPONSE: ApiError.
- STATUS CODE: 200;400 validation;401;403 avatar không thuộc quyền.
- Email/role/isActive không nhận trong PUT. FE đồng bộ AuthContext từ response, không cần reload toàn trang.

### UPLOAD — Upload tài sản

- Related Backend Task: FIX-030
- Related Frontend Task: FIX-030
- METHOD: POST.
- ENDPOINT: /api/uploads.
- AUTH: Login; purpose PRODUCT cần ADMIN; AVATAR/RETURN_EVIDENCE theo owner.
- REQUEST: multipart/form-data có file và purpose="PRODUCT"|"AVATAR"|"RETURN_EVIDENCE"; không tự set boundary hoặc JSON Content-Type.
- RESPONSE: {assetId:number,url:string,mimeType:string,size:number,width:number,height:number}.
- ERROR RESPONSE: ApiError.
- STATUS CODE: 201;400 file lỗi;401/403;413 quá5MiB hoặc giới hạn pixel;415 format không hỗ trợ;503 storage lỗi.
- Server kiểm tra byte thực, tên ngẫu nhiên, chỉ JPEG/PNG/WebP. Metadata được kiểm tra lại khi URL được gắn vào product/profile/return.
- Chưa có DELETE upload public; dọn tài sản chỉ sau chính sách vòng đời được duyệt, không xóa asset có tham chiếu.

### WISHLIST — Wishlist

- Related Backend Task: FIX-031
- Related Frontend Task: FIX-031

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| GET | /api/wishlist | Login | page=0,size=12 | PageResponse<{productId,productName,imageUrl,price,active,inStock,createdAt}> | 200;400/401 |
| PUT | /api/wishlist/{productId} | Login | không body | {productId,saved:true} | 200 kể cả đã có;401/404 |
| DELETE | /api/wishlist/{productId} | Login | không body | không body | 204 kể cả đã xóa;401 |

- ERROR RESPONSE: ApiError. unique(userId,productId). Không trả wishlist user khác; không nhận userId client. Wishlist giữ product ngừng bán để khách thấy trạng thái, không tự chuyển thành cart item.

### CATEGORY — Danh mục và brand tối thiểu

- Related Backend Task: FIX-037
- Related Frontend Task: FIX-037
- Category = {id,name,description}; CategoryWrite={name:1..100,description?:string<=2000}.
- Brand giữ chuỗi ở Product; chưa thêm Brand CRUD/table.

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| GET | /api/categories | Public | không body | Category[] | 200 |
| GET | /api/categories/{id} | Public | id | Category | 200;404 |
| POST | /api/categories | ADMIN | CategoryWrite | Category | 201;400/401/403/409 |
| PUT | /api/categories/{id} | ADMIN | CategoryWrite | Category | 200;400/401/403/404/409 |
| DELETE | /api/categories/{id} | ADMIN | không body | không body | 204;401/403/404/409 CATEGORY_IN_USE |
| GET | /api/products/brands | Public | không body | string[] distinct đã normalize từ sản phẩm active | 200 |

- ERROR RESPONSE: ApiError. Category CRUD path/body cơ bản giữ nguyên; thêm xử lý duplicate/conflict. Route /brands tĩnh phải ưu tiên /{id}.

### DASHBOARD — Dashboard có kỳ báo cáo

- Related Backend Task: FIX-036
- Related Frontend Task: FIX-036
- METHOD: GET.
- ENDPOINT: /api/admin/dashboard.
- AUTH: ADMIN.
- REQUEST: query from=YYYY-MM-DD,to=YYYY-MM-DD,groupBy=DAY|MONTH|YEAR; nếu thiếu dùng7 ngày gần nhất; to bao gồm ngày đó, tối đa366 ngày một query.
- RESPONSE: {from,to,groupBy,timeZone:"Asia/Ho_Chi_Minh",generatedAt,totalRevenue,grossRevenue,refundTotal,netRevenue,totalOrders,totalCustomers,totalProducts,pendingOrders,paidOrders,recentOrders:Order[],dailyRevenue:{ISO_bucket:number},topProducts:[{productId,productName,quantity,revenue}]}.
- totalRevenue giữ nghĩa grossRevenue để tương thích, không âm thầm đổi thành net; UI ghi nhãn rõ. totalOrders và doanh thu theo kỳ; totalCustomers/totalProducts là tổng hiện tại và ghi nhãn rõ.
- ERROR RESPONSE: ApiError.
- STATUS CODE: 200;400 range/groupBy sai;401;403.
- Bucket đủ cả kỳ không có doanh thu =0. Bỏ key dd/MM không có năm, dùng YYYY-MM-DD / YYYY-MM / YYYY. Tiền thu theo paidAt, hoàn theo refundedAt; legacy thiếu paidAt được ghi nhận riêng, không bịa thời điểm.

### INVENTORY — Điều chỉnh tồn kho có dấu vết

- Related Backend Task: FIX-038
- Related Frontend Task: FIX-038

| METHOD | ENDPOINT | AUTH | REQUEST | RESPONSE | STATUS CODE / ERROR RESPONSE |
|---|---|---|---|---|---|
| GET | /api/admin/inventory/movements | ADMIN | variantId?,page=0,size=20 | PageResponse<Movement> | 200;400/401/403 |
| POST | /api/admin/inventory/adjustments | ADMIN | {variantId,delta:integer,expectedStock:integer,reason:string1..500};Idempotency-Key | Movement | 201;200 replay;400/401/403/404/409 |

- Movement = {id,variantId,type:"ADJUSTMENT"|"RESERVE"|"RELEASE"|"SETTLE"|"RETURN",availableDelta,reservedDelta,availableBefore,availableAfter,reservedBefore,reservedAfter,orderId:null|number,actorId:null|number,reason,createdAt}.
- ERROR RESPONSE: ApiError. Tổng available+reserved không overflow; delta không được chỉnh reserved trực tiếp. Chỉ delta available thay đổi ở endpoint adjustment. Ghi movement của order nằm trong transaction order.

### PAGING — Danh sách chuyển tiếp sang phân trang

- Related Backend Task: FIX-052
- Related Frontend Task: FIX-052
- METHOD: GET cho toàn bộ bảng dưới.
- REQUEST chung: page>=0,size1..100 (default20 khi bật paging),query<=200,status tùy enum từng module,sortBy allowlist id/createdAt,sortDir asc/desc. Không có status với user thì dùng active:boolean.
- RESPONSE: khi page/size có một hoặc cả hai → PageResponse<T>; thiếu cả hai giữ array legacy trong giai đoạn chuyển tiếp. FE mới luôn gửi cả hai. Sau khi toàn bộ caller chuyển, mới bỏ legacy bằng kế hoạch rollout rõ.
- PageResponse<T> = {content:T[],pageNo:number,pageSize:number,totalElements:number,totalPages:number,last:boolean}; pageNo0-based, không dùng page/items/data.
- ERROR RESPONSE: ApiError.
- STATUS CODE: 200;400;401;403 với admin. Public reviews không đòi JWT.

| ENDPOINT | AUTH | T / ghi chú |
|---|---|---|
| /api/orders/my-orders | Login, chỉ owner | Order |
| /api/orders/all | ADMIN | Order |
| /api/admin/users | ADMIN | UserProfileResponse; active filter |
| /api/admin/payments | ADMIN | PaymentAttempt + customerName,paymentMethod; giai đoạn ledger chuyển đồng thời FIX-003, không giả transId từ orderId |
| /api/admin/reviews | ADMIN | Review |
| /api/reviews/my-reviews | Login, chỉ owner | Review |
| /api/reviews/product/{productId} | Public | Review, không PII |
| /api/returns/my-returns | Login, chỉ owner | Return |
| /api/returns/all | ADMIN | Return |
| /api/admin/vouchers | ADMIN | Voucher |

- Không đổi GET /products theo quy tắc legacy này sau hoàn tất FIX-032: product list có kế hoạch riêng ở PRODUCT.
- Order filter status theo OrderStatus; payments theo PaymentAttempt.status; returns theo ReturnStatus; voucher active; review rating1..5. Không nhận enum chung cho mọi bảng.


## Ma trận task → contract

| FIX-ID | Phạm vi | Related Backend Task | Related Frontend Task | Contract |
|---|---|---|---|---|
| FIX-001 | BACKEND | FIX-001 | Không | NO API CONTRACT CHANGE |
| FIX-002 | BOTH | FIX-002 | FIX-002 | PAYMENT |
| FIX-003 | BOTH | FIX-003 | FIX-003 | PAYMENT |
| FIX-004 | BOTH | FIX-004 | FIX-004 | PAYMENT |
| FIX-005 | FRONTEND | Không | FIX-005 | NO API CONTRACT CHANGE |
| FIX-006 | BOTH | FIX-006 | FIX-006 | ORDER |
| FIX-007 | BOTH | FIX-007 | FIX-007 | PRODUCT |
| FIX-008 | BOTH | FIX-008 | FIX-008 | ORDER |
| FIX-009 | FRONTEND | Không | FIX-009 | NO API CONTRACT CHANGE |
| FIX-010 | FRONTEND | Không | FIX-010 | NO API CONTRACT CHANGE |
| FIX-011 | FRONTEND | Không | FIX-011 | NO API CONTRACT CHANGE |
| FIX-012 | BOTH | FIX-012 | FIX-012 | REVIEW |
| FIX-013 | FRONTEND | Không | FIX-013 | NO API CONTRACT CHANGE |
| FIX-014 | BOTH | FIX-014 | FIX-014 | RETURN |
| FIX-015 | BOTH | FIX-015 | FIX-015 | ADDRESS |
| FIX-016 | BACKEND | FIX-016 | Không | NO API CONTRACT CHANGE |
| FIX-017 | BOTH | FIX-017 | FIX-017 | ORDER |
| FIX-018 | BOTH | FIX-018 | FIX-018 | ORDER |
| FIX-019 | FRONTEND | Không | FIX-019 | NO API CONTRACT CHANGE |
| FIX-020 | BOTH | FIX-020 | FIX-020 | ORDER |
| FIX-021 | BOTH | FIX-021 | FIX-021 | PRODUCT |
| FIX-022 | BOTH | FIX-022 | FIX-022 | PRODUCT |
| FIX-023 | BOTH | FIX-023 | FIX-023 | VOUCHER |
| FIX-024 | BOTH | FIX-024 | FIX-024 | VOUCHER |
| FIX-025 | BOTH | FIX-025 | FIX-025 | ADMINUSER |
| FIX-026 | BOTH | FIX-026 | FIX-026 | AUTH |
| FIX-027 | BOTH | FIX-027 | FIX-027 | AUTH |
| FIX-028 | BOTH | FIX-028 | FIX-028 | AUTH |
| FIX-029 | BOTH | FIX-029 | FIX-029 | PROFILE |
| FIX-030 | BOTH | FIX-030 | FIX-030 | UPLOAD |
| FIX-031 | BOTH | FIX-031 | FIX-031 | WISHLIST |
| FIX-032 | BOTH | FIX-032 | FIX-032 | PRODUCT |
| FIX-033 | BACKEND | FIX-033 | Không | NO API CONTRACT CHANGE |
| FIX-034 | BOTH | FIX-034 | FIX-034 | PRODUCT |
| FIX-035 | FRONTEND | Không | FIX-035 | NO API CONTRACT CHANGE |
| FIX-036 | BOTH | FIX-036 | FIX-036 | DASHBOARD |
| FIX-037 | BOTH | FIX-037 | FIX-037 | CATEGORY |
| FIX-038 | BOTH | FIX-038 | FIX-038 | INVENTORY |
| FIX-039 | BOTH | FIX-039 | FIX-039 | ORDER |
| FIX-040 | FRONTEND | Không | FIX-040 | NO API CONTRACT CHANGE |
| FIX-041 | BACKEND | FIX-041 | Không | NO API CONTRACT CHANGE |
| FIX-042 | BOTH | FIX-042 | FIX-042 | ERROR |
| FIX-043 | BOTH | FIX-043 | FIX-043 | ERROR |
| FIX-044 | BOTH | FIX-044 | FIX-044 | NO API CONTRACT CHANGE |
| FIX-045 | BACKEND | FIX-045 | Không | NO API CONTRACT CHANGE |
| FIX-046 | BOTH | FIX-046 | FIX-046 | NO API CONTRACT CHANGE |
| FIX-047 | FRONTEND | Không | FIX-047 | NO API CONTRACT CHANGE |
| FIX-048 | FRONTEND | Không | FIX-048 | NO API CONTRACT CHANGE |
| FIX-049 | BOTH | FIX-049 | FIX-049 | NO API CONTRACT CHANGE |
| FIX-050 | FRONTEND | Không | FIX-050 | NO API CONTRACT CHANGE |
| FIX-051 | FRONTEND | Không | FIX-051 | NO API CONTRACT CHANGE |
| FIX-052 | BOTH | FIX-052 | FIX-052 | PAGING |
| FIX-053 | BOTH | FIX-053 | FIX-053 | NO API CONTRACT CHANGE |
| FIX-054 | BACKEND | FIX-054 | Không | ERROR |
| FIX-055 | BACKEND | FIX-055 | Không | NO API CONTRACT CHANGE |
| FIX-056 | BACKEND | FIX-056 | Không | NO API CONTRACT CHANGE |

## Checklist nghiệm thu hợp đồng sau khi triển khai

- [ ] Mọi route đang dùng có endpoint/method tương ứng; test thực từ axios tới controller.
- [ ] Không còn frontend dùng item.name/imageUrl thay productName/productImageUrl của order.
- [ ] Không còn IN_REVIEW/RECEIVED gửi vào ReturnStatus hiện tại.
- [ ] VariantId/options/service phí đi hết product→cart→quote→order→admin; không dùng note để thay định danh SKU.
- [ ] Quote và create dùng cùng công thức; giá thay đổi trả409; replay idempotency không giữ kho/voucher lần2.
- [ ] Mọi list chuyển paged đã cập nhật toàn bộ caller; kiểm tra page0 và empty page.
- [ ] QR payload là payload, link là URL; return/cancel không tự xác nhận paid; GET owner mới là nguồn hiển thị.
- [ ] Chữ ký webhook kiểm tra bằng fixture gateway độc lập; duplicate/muộn/lỗi commit có kết quả bền vững và retry đúng.
- [ ] 401/403/404/409/429/500 và errors field hiển thị đúng; lỗi không biến thành success.
- [ ] Upload dùng multipart đúng, MIME/size/path và owner kiểm tra server.
- [ ] CORS cho Idempotency-Key/Retry-After đã được kiểm thử từ browser.
- [ ] Không có endpoint customer dùng quyền admin hoặc admin tự khóa cuối cùng.

Checklist này là kiểm thử tương lai, không được đánh dấu đã pass chỉ vì tài liệu đã tạo.

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


