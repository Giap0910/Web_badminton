-- Database phục vụ chấm đồ án, tạo ngày 28/10/2026.
-- Chỉ lấy cấu trúc bảng; dữ liệu bên dưới được tạo mới hoàn toàn.
-- Không có dữ liệu khách hàng, đơn hàng, thanh toán hay thông tin cá nhân thật.
-- Chỉ nhập vào môi trường học tập; CREATE báo lỗi nếu database đã tồn tại.
CREATE DATABASE web_badminton_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE web_badminton_demo;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE `ai_chat_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `ai_response` text NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `user_message` text NOT NULL,
  `user_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKq94u4ijwsemyfefauem0ba9rk` (`user_id`),
  CONSTRAINT `FKq94u4ijwsemyfefauem0ba9rk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `categories` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `description` varchar(255) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `orders` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `customer_name` varchar(100) DEFAULT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payos_order_code` bigint(20) DEFAULT NULL,
  `shipping_address` text DEFAULT NULL,
  `shipping_phone` varchar(20) DEFAULT NULL,
  `status` enum('PENDING','PAID','SHIPPING','COMPLETED','CANCELLED') NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `discount_amount` decimal(12,2) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `voucher_code` varchar(50) DEFAULT NULL,
  `shipping_fee` decimal(12,2) DEFAULT NULL,
  `idempotency_key` varchar(36) DEFAULT NULL,
  `request_hash` varchar(64) DEFAULT NULL,
  `checkout_revision` bigint(20) NOT NULL,
  `cash_collected_at` datetime DEFAULT NULL,
  `cash_collected_by` bigint(20) DEFAULT NULL,
  `points_used` int(11) NOT NULL DEFAULT 0,
  `points_discount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_6slqynjqi7bfcy77345ye7u0f` (`payos_order_code`),
  UNIQUE KEY `uk_orders_user_idempotency` (`user_id`,`idempotency_key`),
  CONSTRAINT `FK32ql8ubntj5uh44ph9659tiih` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `order_items` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `price` decimal(12,2) NOT NULL,
  `quantity` int(11) NOT NULL,
  `order_id` bigint(20) NOT NULL,
  `product_id` bigint(20) DEFAULT NULL,
  `selected_color` varchar(200) DEFAULT NULL,
  `selected_size` varchar(50) DEFAULT NULL,
  `selected_weight` varchar(50) DEFAULT NULL,
  `string_tension` varchar(50) DEFAULT NULL,
  `stringing_service` varchar(100) DEFAULT NULL,
  `variant_id` bigint(20) DEFAULT NULL,
  `product_id_snapshot` bigint(20) DEFAULT NULL,
  `product_name_snapshot` varchar(200) DEFAULT NULL,
  `product_sku_snapshot` varchar(50) DEFAULT NULL,
  `product_brand_snapshot` varchar(50) DEFAULT NULL,
  `product_image_snapshot` varchar(500) DEFAULT NULL,
  `category_id_snapshot` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKbioxgbv59vetrxe0ejfubep1w` (`order_id`),
  KEY `FKocimc7dtr037rh4ls4l95nlfi` (`product_id`),
  KEY `fk_order_variant` (`variant_id`),
  CONSTRAINT `FKbioxgbv59vetrxe0ejfubep1w` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `FKocimc7dtr037rh4ls4l95nlfi` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_order_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payment_attempts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `amount` decimal(12,0) NOT NULL,
  `checkout_url` varchar(2048) DEFAULT NULL,
  `currency` varchar(255) NOT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `idempotency_key` varchar(36) NOT NULL,
  `order_code` bigint(20) NOT NULL,
  `paid_at` datetime(6) DEFAULT NULL,
  `payment_link_id` varchar(255) DEFAULT NULL,
  `provider` varchar(255) NOT NULL,
  `qr_payload` text DEFAULT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `review_reason` varchar(255) DEFAULT NULL,
  `status` enum('CREATING','PENDING','PAID','FAILED','EXPIRED','CANCELLED','NEEDS_REVIEW') NOT NULL,
  `order_id` bigint(20) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_qjypbj83mi4l55fsvih9trqyq` (`order_code`),
  UNIQUE KEY `UK_76q9ls16svjnm3od0w00acwrv` (`payment_link_id`),
  KEY `ix_fix059_attempt_order` (`order_id`,`id`),
  CONSTRAINT `FKkgs2arrxop1qax0kjc0a7gx7n` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payment_events` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `amount` decimal(20,0) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `currency` varchar(255) NOT NULL,
  `fingerprint` varchar(64) NOT NULL,
  `order_code` bigint(20) NOT NULL,
  `payment_link_id` varbinary(1020) NOT NULL,
  `processing_result` varchar(64) NOT NULL,
  `provider` varbinary(32) NOT NULL,
  `received_at` datetime(6) NOT NULL,
  `received_payment` bit(1) NOT NULL,
  `reference` varbinary(1020) NOT NULL,
  `review_history` text DEFAULT NULL,
  `review_reason` varchar(64) DEFAULT NULL,
  `source` varchar(32) NOT NULL,
  `transaction_date_time` varchar(255) NOT NULL,
  `verified_at` datetime(6) NOT NULL,
  `order_id` bigint(20) DEFAULT NULL,
  `payment_attempt_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_event_identity` (`provider`,`payment_link_id`,`reference`),
  KEY `FKl1rx43bqqhgcwydgdepv4vtr5` (`order_id`),
  KEY `FK1jft7bx87yh2aqw2jnntjwpio` (`payment_attempt_id`),
  CONSTRAINT `FK1jft7bx87yh2aqw2jnntjwpio` FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts` (`id`),
  CONSTRAINT `FKl1rx43bqqhgcwydgdepv4vtr5` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payment_event_conflicts` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `fingerprint` varchar(64) NOT NULL,
  `incoming_facts` text NOT NULL,
  `received_at` datetime(6) NOT NULL,
  `review_reason` varchar(64) NOT NULL,
  `source` varchar(32) NOT NULL,
  `payment_event_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_conflict_facts` (`payment_event_id`,`fingerprint`),
  CONSTRAINT `FK7ubcs59fem489g3ekj5yfut2k` FOREIGN KEY (`payment_event_id`) REFERENCES `payment_events` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payment_method_transitions` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `amount` decimal(12,0) NOT NULL,
  `applied_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `currency` varchar(8) NOT NULL,
  `evidence_history` longtext NOT NULL,
  `expected_state_version` bigint(20) NOT NULL,
  `finished_at` datetime(6) DEFAULT NULL,
  `idempotency_key` char(36) NOT NULL,
  `last_evidence_hash` char(64) DEFAULT NULL,
  `lease_until` datetime(6) DEFAULT NULL,
  `operation_id` char(36) NOT NULL,
  `original_expires_at` datetime(6) NOT NULL,
  `provider_link_id` varbinary(1020) DEFAULT NULL,
  `provider_order_code` bigint(20) DEFAULT NULL,
  `reason` varchar(64) DEFAULT NULL,
  `request_hash` char(64) NOT NULL,
  `result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`result`)),
  `runner_epoch` bigint(20) NOT NULL,
  `source_method` varchar(32) NOT NULL,
  `status` varchar(32) NOT NULL,
  `target_method` varchar(32) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `actor_id` bigint(20) NOT NULL,
  `order_id` bigint(20) NOT NULL,
  `payment_attempt_id` bigint(20) DEFAULT NULL,
  `reverse_order_id` bigint(20) GENERATED ALWAYS AS (case when `target_method` = 'PAYOS_VIETQR' then `order_id` else NULL end) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_8q9lqng8cn2khgfmgi9iqdome` (`operation_id`),
  UNIQUE KEY `uk_fix059_order_key` (`order_id`,`idempotency_key`),
  UNIQUE KEY `uk_fix059_reverse_once` (`reverse_order_id`),
  KEY `FKr2ipevebj83o6pfaiphwlkhmy` (`actor_id`),
  KEY `FK55jmjxdy14aca767s4g3wwtk` (`payment_attempt_id`),
  CONSTRAINT `FK55jmjxdy14aca767s4g3wwtk` FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts` (`id`),
  CONSTRAINT `FKgvcqwvs8u6twnco1tpoal3foa` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `FKr2ipevebj83o6pfaiphwlkhmy` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `ck_fix059_methods` CHECK (`source_method` = 'COD' and `target_method` = 'PAYOS_VIETQR' or `source_method` = 'PAYOS_VIETQR' and `target_method` = 'COD' and `payment_attempt_id` is not null and `provider_order_code` is not null and `provider_link_id` is not null)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `payment_reconciliations` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `actor_id` bigint(20) NOT NULL,
  `completed` bit(1) NOT NULL,
  `completed_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `evidence_history` longtext DEFAULT NULL,
  `http_status` int(11) DEFAULT NULL,
  `idempotency_key` varchar(36) NOT NULL,
  `last_evidence_hash` varchar(64) DEFAULT NULL,
  `reason` text NOT NULL,
  `payment_attempt_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_reconciliation_key` (`payment_attempt_id`,`idempotency_key`),
  CONSTRAINT `FK2aya1j08lb7w830ukfr684nnc` FOREIGN KEY (`payment_attempt_id`) REFERENCES `payment_attempts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `products` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `sku` varchar(50) DEFAULT NULL,
  `balance_point` varchar(50) DEFAULT NULL,
  `brand` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `max_tension` varchar(50) DEFAULT NULL,
  `name` varchar(200) NOT NULL,
  `original_price` decimal(12,2) DEFAULT NULL,
  `play_style` varchar(100) DEFAULT NULL,
  `price` decimal(12,2) NOT NULL,
  `reserved_stock` int(11) NOT NULL,
  `stiffness` varchar(50) DEFAULT NULL,
  `stock` int(11) NOT NULL,
  `weight_grip` varchar(50) DEFAULT NULL,
  `category_id` bigint(20) DEFAULT NULL,
  `weight_class` varchar(50) DEFAULT NULL,
  `frame_material` varchar(150) DEFAULT NULL,
  `shaft_material` varchar(150) DEFAULT NULL,
  `available_sizes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`available_sizes`)),
  `sole_type` varchar(100) DEFAULT NULL,
  `cushion_technology` varchar(150) DEFAULT NULL,
  `upper_material` varchar(150) DEFAULT NULL,
  `gender` varchar(30) DEFAULT NULL,
  `fabric_type` varchar(150) DEFAULT NULL,
  `bag_type` varchar(50) DEFAULT NULL,
  `capacity` varchar(50) DEFAULT NULL,
  `racket_capacity` int(11) DEFAULT NULL,
  `waterproof` varchar(50) DEFAULT NULL,
  `accessory_type` varchar(50) DEFAULT NULL,
  `quantity_per_pack` varchar(50) DEFAULT NULL,
  `origin` varchar(100) DEFAULT NULL,
  `catalog_visible` tinyint(1) NOT NULL DEFAULT 1,
  `manufacturer_code` varchar(100) DEFAULT NULL,
  `color_name` varchar(200) DEFAULT NULL,
  `edition` varchar(100) DEFAULT NULL,
  `arrived_at` datetime(6) DEFAULT NULL,
  `specification_source` varchar(1000) DEFAULT NULL,
  `legacy_sku` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  UNIQUE KEY `uk_products_legacy_sku` (`legacy_sku`),
  KEY `FKog2rp4qthbtt2lfyhfo32lsw9` (`category_id`),
  CONSTRAINT `FKog2rp4qthbtt2lfyhfo32lsw9` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `product_images` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `display_order` int(11) NOT NULL,
  `image_url` varchar(500) NOT NULL,
  `product_id` bigint(20) NOT NULL,
  `rights_approved` bit(1) NOT NULL DEFAULT b'0',
  `model_verified` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  KEY `FKqnq71xsohugpqwf3c9gxmsuy` (`product_id`),
  CONSTRAINT `FKqnq71xsohugpqwf3c9gxmsuy` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `product_variants` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `product_id` bigint(20) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `color` varchar(200) DEFAULT NULL,
  `size` varchar(50) DEFAULT NULL,
  `weight_grip` varchar(50) DEFAULT NULL,
  `packaging` varchar(100) DEFAULT NULL,
  `stock` int(11) NOT NULL,
  `reserved_stock` int(11) NOT NULL DEFAULT 0,
  `active` bit(1) NOT NULL DEFAULT b'1',
  `legacy` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `fk_variants_product` (`product_id`),
  CONSTRAINT `fk_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `ck_variants_stock` CHECK (`stock` >= 0 and `reserved_stock` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `return_requests` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `admin_note` text DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `reason` text NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED','COMPLETED') NOT NULL,
  `order_id` bigint(20) NOT NULL,
  `user_id` bigint(20) NOT NULL,
  `order_item_id` bigint(20) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `serial_number` varchar(100) DEFAULT NULL,
  `evidence_key` varchar(100) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `replacement_variant_id` bigint(20) DEFAULT NULL,
  `replacement_product_id` bigint(20) DEFAULT NULL,
  `replacement_sku` varchar(100) DEFAULT NULL,
  `replacement_product_name` varchar(200) DEFAULT NULL,
  `replacement_color` varchar(200) DEFAULT NULL,
  `replacement_size` varchar(50) DEFAULT NULL,
  `replacement_weight_grip` varchar(50) DEFAULT NULL,
  `replacement_packaging` varchar(100) DEFAULT NULL,
  `original_variant_id` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKbski88d6kewx0cbj5pk7nes01` (`order_id`),
  KEY `FK6pd9hi2rbbct43io2pgcma1sh` (`user_id`),
  KEY `idx_returns_line_status` (`order_item_id`,`status`),
  CONSTRAINT `FK6pd9hi2rbbct43io2pgcma1sh` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKbski88d6kewx0cbj5pk7nes01` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_returns_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `reviews` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `comment` text NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `rating` int(11) NOT NULL,
  `product_id` bigint(20) DEFAULT NULL,
  `user_id` bigint(20) NOT NULL,
  `product_id_snapshot` bigint(20) DEFAULT NULL,
  `product_name_snapshot` varchar(200) DEFAULT NULL,
  `product_brand_snapshot` varchar(50) DEFAULT NULL,
  `product_image_snapshot` varchar(500) DEFAULT NULL,
  `is_visible` bit(1) NOT NULL DEFAULT b'1',
  `verified_purchase` bit(1) NOT NULL DEFAULT b'0',
  `official_reply` varchar(2000) DEFAULT NULL,
  `reply_updated_at` datetime DEFAULT NULL,
  `order_id_snapshot` bigint(20) DEFAULT NULL,
  `order_item_id_snapshot` bigint(20) DEFAULT NULL,
  `product_sku_snapshot` varchar(50) DEFAULT NULL,
  `selected_size_snapshot` varchar(50) DEFAULT NULL,
  `selected_color_snapshot` varchar(200) DEFAULT NULL,
  `selected_weight_snapshot` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reviews_user_product_snapshot` (`user_id`,`product_id_snapshot`),
  KEY `FKpl51cejpw4gy5swfar8br9ngi` (`product_id`),
  CONSTRAINT `FKcgy7qjc1r99dp117y9en6lxye` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKpl51cejpw4gy5swfar8br9ngi` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `shipping_addresses` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `address` text NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `is_default` bit(1) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `province` varchar(100) DEFAULT NULL,
  `user_id` bigint(20) NOT NULL,
  `province_code` varchar(2) DEFAULT NULL,
  `ward_code` varchar(5) DEFAULT NULL,
  `ward` varchar(100) DEFAULT NULL,
  `address_detail` text DEFAULT NULL,
  `note` text DEFAULT NULL,
  `tag` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK6bp1apvusb3gj4170h4pesd3h` (`user_id`),
  CONSTRAINT `FK6bp1apvusb3gj4170h4pesd3h` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `address` text DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('ROLE_USER','ROLE_ADMIN') NOT NULL,
  `username` varchar(50) NOT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `avatar_key` varchar(40) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `token_version` bigint(20) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_6dotkott2kjsp8vw4d0m25fb7` (`email`),
  UNIQUE KEY `UK_r43af9ap4edm43mmtq01oddj6` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `vouchers` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `discount_type` varchar(20) NOT NULL,
  `discount_value` decimal(12,2) NOT NULL,
  `expires_at` datetime(6) DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `max_discount_amount` decimal(12,2) DEFAULT NULL,
  `max_uses` int(11) DEFAULT NULL,
  `min_order_value` decimal(12,2) DEFAULT NULL,
  `used_count` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_30ftp2biebbvpik8e49wlmady` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS=1;
START TRANSACTION;
INSERT INTO `categories` (`id`,`name`,`description`) VALUES (1,'Vợt Cầu Lông','Danh mục mẫu phục vụ chấm đồ án');
INSERT INTO `categories` (`id`,`name`,`description`) VALUES (2,'Giày Cầu Lông','Danh mục mẫu phục vụ chấm đồ án');
INSERT INTO `categories` (`id`,`name`,`description`) VALUES (3,'Quần Áo Đấu','Danh mục mẫu phục vụ chấm đồ án');
INSERT INTO `categories` (`id`,`name`,`description`) VALUES (4,'Balo & Túi Vợt','Danh mục mẫu phục vụ chấm đồ án');
INSERT INTO `categories` (`id`,`name`,`description`) VALUES (5,'Phụ Kiện','Danh mục mẫu phục vụ chấm đồ án');
INSERT INTO `users` (`id`,`username`,`email`,`full_name`,`role`,`password`,`is_active`,`token_version`,`created_at`) VALUES (1,'demo_admin','admin@example.test','Tài khoản demo admin','ROLE_ADMIN','$2a$12$iDeImYPfaoCKTzYj7RmiGOAeOvIyzhS5bvCpbkpSpUe44jzcdi9Da',1,0,'2026-10-28 00:00:00');
INSERT INTO `users` (`id`,`username`,`email`,`full_name`,`role`,`password`,`is_active`,`token_version`,`created_at`) VALUES (2,'demo_user','user@example.test','Tài khoản demo user','ROLE_USER','$2a$12$xq2MpG3uhKcfdO3CqTcvQ.sYwqxFo4GxOJDkXyJZBNgytUC9R8yyS',1,0,'2026-10-28 00:00:00');
INSERT INTO `products` (`id`,`sku`,`name`,`brand`,`category_id`,`price`,`original_price`,`stock`,`reserved_stock`,`catalog_visible`,`description`,`color_name`,`arrived_at`,`weight_grip`,`weight_class`,`stiffness`,`balance_point`,`max_tension`,`play_style`) VALUES (1,'DEMO-001','Vợt Yonex Demo 01','Yonex',1,1200000,1200000,20,0,1,'Sản phẩm giả lập để kiểm tra giao diện và nghiệp vụ. Giá và thông số không phải thông tin thương mại.','Xanh','2026-10-28 00:00:00','4U-G5','4U','Medium','Even','28 lbs','Công thủ toàn diện');
INSERT INTO `product_variants` (`id`,`product_id`,`sku`,`color`,`stock`,`reserved_stock`,`active`,`legacy`,`weight_grip`) VALUES (1,1,'DEMO-001-01','Xanh',20,0,1,0,'4U-G5');
INSERT INTO `products` (`id`,`sku`,`name`,`brand`,`category_id`,`price`,`original_price`,`stock`,`reserved_stock`,`catalog_visible`,`description`,`color_name`,`arrived_at`,`weight_grip`,`weight_class`,`stiffness`,`balance_point`,`max_tension`,`play_style`) VALUES (2,'DEMO-002','Vợt Victor Demo 02','Victor',1,1500000,1500000,20,0,1,'Sản phẩm giả lập để kiểm tra giao diện và nghiệp vụ. Giá và thông số không phải thông tin thương mại.','Xanh','2026-10-28 00:00:00','4U-G5','4U','Medium','Even','28 lbs','Công thủ toàn diện');
INSERT INTO `product_variants` (`id`,`product_id`,`sku`,`color`,`stock`,`reserved_stock`,`active`,`legacy`,`weight_grip`) VALUES (2,2,'DEMO-002-01','Xanh',20,0,1,0,'4U-G5');
INSERT INTO `products` (`id`,`sku`,`name`,`brand`,`category_id`,`price`,`original_price`,`stock`,`reserved_stock`,`catalog_visible`,`description`,`color_name`,`arrived_at`,`available_sizes`,`gender`) VALUES (3,'DEMO-003','Giày Mizuno Demo 03','Mizuno',2,900000,900000,20,0,1,'Sản phẩm giả lập để kiểm tra giao diện và nghiệp vụ. Giá và thông số không phải thông tin thương mại.','Xanh','2026-10-28 00:00:00','["40"]','Unisex');
INSERT INTO `product_variants` (`id`,`product_id`,`sku`,`color`,`stock`,`reserved_stock`,`active`,`legacy`,`size`) VALUES (3,3,'DEMO-003-01','Xanh',20,0,1,0,'40');
INSERT INTO `products` (`id`,`sku`,`name`,`brand`,`category_id`,`price`,`original_price`,`stock`,`reserved_stock`,`catalog_visible`,`description`,`color_name`,`arrived_at`,`available_sizes`,`gender`) VALUES (4,'DEMO-004','Áo Li-Ning Demo 04','Li-Ning',3,250000,250000,20,0,1,'Sản phẩm giả lập để kiểm tra giao diện và nghiệp vụ. Giá và thông số không phải thông tin thương mại.','Xanh','2026-10-28 00:00:00','["M"]','Unisex');
INSERT INTO `product_variants` (`id`,`product_id`,`sku`,`color`,`stock`,`reserved_stock`,`active`,`legacy`,`size`) VALUES (4,4,'DEMO-004-01','Xanh',20,0,1,0,'M');
INSERT INTO `products` (`id`,`sku`,`name`,`brand`,`category_id`,`price`,`original_price`,`stock`,`reserved_stock`,`catalog_visible`,`description`,`color_name`,`arrived_at`,`bag_type`,`racket_capacity`) VALUES (5,'DEMO-005','Balo Kawasaki Demo 05','Kawasaki',4,450000,450000,20,0,1,'Sản phẩm giả lập để kiểm tra giao diện và nghiệp vụ. Giá và thông số không phải thông tin thương mại.','Xanh','2026-10-28 00:00:00','balo',2);
INSERT INTO `product_variants` (`id`,`product_id`,`sku`,`color`,`stock`,`reserved_stock`,`active`,`legacy`) VALUES (5,5,'DEMO-005-01','Xanh',20,0,1,0);
INSERT INTO `products` (`id`,`sku`,`name`,`brand`,`category_id`,`price`,`original_price`,`stock`,`reserved_stock`,`catalog_visible`,`description`,`color_name`,`arrived_at`,`accessory_type`,`quantity_per_pack`) VALUES (6,'DEMO-006','Quấn cán Fleet Demo 06','Fleet',5,30000,30000,20,0,1,'Sản phẩm giả lập để kiểm tra giao diện và nghiệp vụ. Giá và thông số không phải thông tin thương mại.','Xanh','2026-10-28 00:00:00','quan_can','1');
INSERT INTO `product_variants` (`id`,`product_id`,`sku`,`color`,`stock`,`reserved_stock`,`active`,`legacy`,`packaging`) VALUES (6,6,'DEMO-006-01','Xanh',20,0,1,0,'1 chiếc');
INSERT INTO `vouchers` (`id`,`code`,`description`,`discount_type`,`discount_value`,`min_order_value`,`max_uses`,`used_count`,`expires_at`,`is_active`,`created_at`) VALUES (1,'DEMO10K','Voucher giả lập, không có giá trị thương mại','FIXED',10000,100000,100,0,'2099-12-31 23:59:59',1,'2026-10-28 00:00:00');
COMMIT;
