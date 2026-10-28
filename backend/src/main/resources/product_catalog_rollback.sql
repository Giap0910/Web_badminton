-- Chỉ hoàn tác batch ngày 11/10/2026 sau khi Phong duyệt.
-- Khôi phục code từ backup trước khi cần trở về hành vi catalog cũ.
-- Giữ cột bổ sung để không mất trạng thái mới hoặc gây DDL phá dữ liệu.
START TRANSACTION;
UPDATE products SET catalog_visible = 1
WHERE catalog_visible = 0 AND
      ((id IN (31,32,33,34,78,87,98,106,112,113,114,120)
        AND LOWER(TRIM(brand)) NOT IN ('yonex','victor','li-ning','lining','mizuno','kawasaki','fleet'))
       OR (id IN (236,237) AND sku IN ('fs_cod_mv2pdevn-0','fs_cod_mv2pdevn-1')));
COMMIT;
