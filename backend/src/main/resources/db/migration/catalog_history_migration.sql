ALTER TABLE order_items MODIFY COLUMN product_id BIGINT NULL;
ALTER TABLE order_items ADD COLUMN product_id_snapshot BIGINT NULL;
ALTER TABLE order_items ADD COLUMN product_name_snapshot VARCHAR(200) NULL;
ALTER TABLE order_items ADD COLUMN product_sku_snapshot VARCHAR(50) NULL;
ALTER TABLE order_items ADD COLUMN product_brand_snapshot VARCHAR(50) NULL;
ALTER TABLE order_items ADD COLUMN product_image_snapshot VARCHAR(500) NULL;
ALTER TABLE reviews MODIFY COLUMN product_id BIGINT NULL;
ALTER TABLE reviews ADD COLUMN product_id_snapshot BIGINT NULL;
ALTER TABLE reviews ADD COLUMN product_name_snapshot VARCHAR(200) NULL;
ALTER TABLE reviews ADD COLUMN product_brand_snapshot VARCHAR(50) NULL;
ALTER TABLE reviews ADD COLUMN product_image_snapshot VARCHAR(500) NULL;
UPDATE order_items i JOIN products p ON p.id=i.product_id SET i.product_id_snapshot=p.id,
 i.product_name_snapshot=p.name,i.product_sku_snapshot=p.sku,i.product_brand_snapshot=p.brand,i.product_image_snapshot=p.image_url;
UPDATE reviews r JOIN products p ON p.id=r.product_id SET r.product_id_snapshot=p.id,
 r.product_name_snapshot=p.name,r.product_brand_snapshot=p.brand,r.product_image_snapshot=p.image_url;
