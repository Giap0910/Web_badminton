-- Chỉ đổi cách áp dụng FREESHIP cho những đơn tạo sau migration.
-- Giữ nguyên lượt dùng và các khoản giảm đã chốt trong orders.
START TRANSACTION;
UPDATE vouchers
SET discount_type = 'SHIPPING'
WHERE UPPER(code) = 'FREESHIP'
  AND discount_type = 'FIXED'
  AND discount_value = 30000;
COMMIT;
