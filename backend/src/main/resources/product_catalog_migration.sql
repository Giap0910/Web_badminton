-- Chạy sau khi backup đã kiểm tra phục hồi; không xóa dữ liệu hoặc đổi mã hàng.
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_visible TINYINT(1) NOT NULL DEFAULT 1;
START TRANSACTION;
UPDATE products SET catalog_visible = 0
WHERE (id IN (31,32,33,34,78,87,98,106,112,113,114,120)
       AND LOWER(TRIM(brand)) NOT IN ('yonex','victor','li-ning','lining','mizuno','kawasaki','fleet'))
   OR (id IN (236,237) AND sku IN ('fs_cod_mv2pdevn-0','fs_cod_mv2pdevn-1'));
COMMIT;
