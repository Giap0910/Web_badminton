-- Bổ sung luồng đổi hàng 90 ngày; không gán ngày hoàn tất cho đơn cũ.
-- Chạy thủ công sau backup; DDL MySQL/MariaDB tự commit. Có thể chạy lại an toàn.

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'orders' AND column_name = 'completed_at'), 'SELECT 1', 'ALTER TABLE orders ADD COLUMN completed_at DATETIME NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'order_items' AND column_name = 'category_id_snapshot'), 'SELECT 1', 'ALTER TABLE order_items ADD COLUMN category_id_snapshot BIGINT NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'order_item_id'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN order_item_id BIGINT NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'quantity'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN quantity INT NOT NULL DEFAULT 1');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'serial_number'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN serial_number VARCHAR(100) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'evidence_key'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN evidence_key VARCHAR(100) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'completed_at'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN completed_at DATETIME NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'replacement_variant_id'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN replacement_variant_id BIGINT NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'replacement_product_id'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN replacement_product_id BIGINT NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'replacement_sku'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN replacement_sku VARCHAR(100) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'replacement_product_name'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN replacement_product_name VARCHAR(200) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'replacement_color'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN replacement_color VARCHAR(200) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'replacement_size'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN replacement_size VARCHAR(50) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'replacement_weight_grip'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN replacement_weight_grip VARCHAR(50) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'replacement_packaging'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN replacement_packaging VARCHAR(100) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND column_name = 'original_variant_id'), 'SELECT 1', 'ALTER TABLE return_requests ADD COLUMN original_variant_id BIGINT NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'return_requests' AND index_name = 'idx_returns_line_status'), 'SELECT 1', 'CREATE INDEX idx_returns_line_status ON return_requests (order_item_id, status)');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'return_requests' AND constraint_name = 'fk_returns_order_item'), 'SELECT 1', 'ALTER TABLE return_requests ADD CONSTRAINT fk_returns_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id)');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

UPDATE order_items item JOIN products product ON product.id = item.product_id
SET item.category_id_snapshot = product.category_id
WHERE item.category_id_snapshot IS NULL;

UPDATE return_requests request JOIN order_items item ON item.id = request.order_item_id
SET request.original_variant_id = item.variant_id
WHERE request.original_variant_id IS NULL AND item.variant_id IS NOT NULL;

