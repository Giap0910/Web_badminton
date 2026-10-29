-- Chỉ thêm bảng banner và khởi tạo 4 vị trí trống; không đổi dữ liệu cửa hàng.
-- Chạy trên database đích đã được chọn, sau khi kiểm tra và sao lưu.
CREATE TABLE IF NOT EXISTS banner_images (
    slot_position INT NOT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    PRIMARY KEY (slot_position),
    CONSTRAINT chk_banner_position CHECK (slot_position BETWEEN 1 AND 4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO banner_images (slot_position, image_url) VALUES (1, NULL), (2, NULL), (3, NULL), (4, NULL)
ON DUPLICATE KEY UPDATE slot_position = VALUES(slot_position);
