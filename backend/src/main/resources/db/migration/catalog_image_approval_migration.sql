ALTER TABLE product_images ADD COLUMN rights_approved BIT(1) NOT NULL DEFAULT 0;
ALTER TABLE product_images ADD COLUMN model_verified BIT(1) NOT NULL DEFAULT 0;
