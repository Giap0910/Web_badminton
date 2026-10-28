ALTER TABLE products ADD COLUMN legacy_sku VARCHAR(50) NULL;
ALTER TABLE products ADD CONSTRAINT uk_products_legacy_sku UNIQUE(legacy_sku);
