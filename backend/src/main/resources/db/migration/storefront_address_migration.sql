ALTER TABLE shipping_addresses
 ADD COLUMN province_code VARCHAR(2) NULL,
 ADD COLUMN ward_code VARCHAR(5) NULL,
 ADD COLUMN ward VARCHAR(100) NULL,
 ADD COLUMN address_detail TEXT NULL;
