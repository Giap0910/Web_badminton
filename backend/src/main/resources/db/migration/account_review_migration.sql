-- Bổ sung hồ sơ, thu hồi JWT và đánh giá có bằng chứng mua hàng.
-- Chạy thủ công sau backup. Không xóa dữ liệu, không gán xác minh cho đánh giá cũ.
-- Có thể chạy lại; DDL MySQL/MariaDB tự commit.

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'gender'), 'SELECT 1', 'ALTER TABLE users ADD COLUMN gender VARCHAR(10) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'token_version'), 'SELECT 1', 'ALTER TABLE users ADD COLUMN token_version BIGINT NOT NULL DEFAULT 0');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'shipping_addresses' AND column_name = 'note'), 'SELECT 1', 'ALTER TABLE shipping_addresses ADD COLUMN note TEXT NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'shipping_addresses' AND column_name = 'tag'), 'SELECT 1', 'ALTER TABLE shipping_addresses ADD COLUMN tag VARCHAR(30) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'is_visible'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN is_visible BIT NOT NULL DEFAULT 1');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'verified_purchase'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN verified_purchase BIT NOT NULL DEFAULT 0');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'official_reply'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN official_reply VARCHAR(2000) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'reply_updated_at'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN reply_updated_at DATETIME NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'order_id_snapshot'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN order_id_snapshot BIGINT NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'order_item_id_snapshot'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN order_item_id_snapshot BIGINT NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'product_sku_snapshot'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN product_sku_snapshot VARCHAR(50) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'selected_size_snapshot'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN selected_size_snapshot VARCHAR(50) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'selected_color_snapshot'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN selected_color_snapshot VARCHAR(200) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'selected_weight_snapshot'), 'SELECT 1', 'ALTER TABLE reviews ADD COLUMN selected_weight_snapshot VARCHAR(50) NULL');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

UPDATE reviews review JOIN products product ON product.id = review.product_id
SET review.product_id_snapshot = product.id
WHERE review.product_id_snapshot IS NULL;

-- Nếu dữ liệu cũ đã trùng, CREATE UNIQUE sẽ dừng; không tự xóa/gộp đánh giá.
SET @hg_ddl = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'reviews' AND index_name = 'uk_reviews_user_product_snapshot'), 'SELECT 1', 'CREATE UNIQUE INDEX uk_reviews_user_product_snapshot ON reviews (user_id, product_id_snapshot)');
PREPARE hg_statement FROM @hg_ddl;
EXECUTE hg_statement;
DEALLOCATE PREPARE hg_statement;

