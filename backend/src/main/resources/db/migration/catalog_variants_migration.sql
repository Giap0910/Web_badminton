CREATE TABLE product_variants (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 product_id BIGINT NOT NULL,
 sku VARCHAR(100) NOT NULL UNIQUE,
 color VARCHAR(200) NULL, size VARCHAR(50) NULL, weight_grip VARCHAR(50) NULL, packaging VARCHAR(100) NULL,
 stock INT NOT NULL, reserved_stock INT NOT NULL DEFAULT 0,
 active BIT(1) NOT NULL DEFAULT 1, legacy BIT(1) NOT NULL DEFAULT 0,
 CONSTRAINT fk_variants_product FOREIGN KEY(product_id) REFERENCES products(id),
 CONSTRAINT ck_variants_stock CHECK(stock >= 0 AND reserved_stock >= 0)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE order_items ADD COLUMN variant_id BIGINT NULL;
ALTER TABLE order_items ADD CONSTRAINT fk_order_variant FOREIGN KEY(variant_id) REFERENCES product_variants(id);
ALTER TABLE order_items MODIFY COLUMN selected_color VARCHAR(200) NULL;
