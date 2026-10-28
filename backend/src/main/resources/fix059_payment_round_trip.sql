-- Chạy sau sao lưu, khi backend đã dừng. Không xóa/sửa payment facts.
SET @fix059_ok = DATABASE() REGEXP '^(web_badminton|fix[0-9]+_test_[0-9a-f]+)$'
    AND (SELECT COUNT(DISTINCT table_name) FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name IN ('orders','payment_attempts','payment_method_transitions')) = 3;
SET @fix059_sql = IF(@fix059_ok, 'SELECT 1', 'SELECT * FROM FIX059_PREFLIGHT_FAILED');
PREPARE fix059_statement FROM @fix059_sql;
EXECUTE fix059_statement;
DEALLOCATE PREPARE fix059_statement;

SET @fix059_sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
    AND table_name='payment_attempts' AND index_name='ix_fix059_attempt_order'), 'SELECT 1',
    'ALTER TABLE payment_attempts ADD INDEX ix_fix059_attempt_order(order_id,id)');
PREPARE fix059_statement FROM @fix059_sql;
EXECUTE fix059_statement;
DEALLOCATE PREPARE fix059_statement;

SELECT GROUP_CONCAT(CONCAT('DROP INDEX `', REPLACE(index_name,'`','``'), '`') SEPARATOR ', ')
INTO @fix059_drop FROM (SELECT index_name FROM information_schema.statistics
    WHERE table_schema=DATABASE() AND table_name='payment_attempts' AND non_unique=0 AND index_name<>'PRIMARY'
    GROUP BY index_name HAVING COUNT(*)=1 AND MAX(column_name)='order_id') AS old_unique;
SET @fix059_sql = IF(@fix059_drop IS NULL, 'SELECT 1', CONCAT('ALTER TABLE payment_attempts ', @fix059_drop));
PREPARE fix059_statement FROM @fix059_sql;
EXECUTE fix059_statement;
DEALLOCATE PREPARE fix059_statement;

SET @fix059_sql = IF(EXISTS(SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE()
    AND table_name='payment_method_transitions' AND index_name='uk_fix059_order_key'), 'SELECT 1',
    'ALTER TABLE payment_method_transitions ADD CONSTRAINT uk_fix059_order_key UNIQUE(order_id,idempotency_key)');
PREPARE fix059_statement FROM @fix059_sql;
EXECUTE fix059_statement;
DEALLOCATE PREPARE fix059_statement;

SELECT GROUP_CONCAT(CONCAT('DROP INDEX `', REPLACE(index_name,'`','``'), '`') SEPARATOR ', ')
INTO @fix059_drop FROM (SELECT index_name FROM information_schema.statistics
    WHERE table_schema=DATABASE() AND table_name='payment_method_transitions' AND non_unique=0 AND index_name<>'PRIMARY'
    GROUP BY index_name HAVING COUNT(*)=1 AND MAX(column_name)='order_id') AS old_unique;
SET @fix059_sql = IF(@fix059_drop IS NULL, 'SELECT 1', CONCAT('ALTER TABLE payment_method_transitions ', @fix059_drop));
PREPARE fix059_statement FROM @fix059_sql;
EXECUTE fix059_statement;
DEALLOCATE PREPARE fix059_statement;

SET @fix059_sql = IF(EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE()
    AND table_name='payment_method_transitions' AND constraint_name='ck_fix057_methods'),
    CONCAT('ALTER TABLE payment_method_transitions ', IF(LOCATE('MariaDB',VERSION())>0,'DROP CONSTRAINT ','DROP CHECK '),
    'ck_fix057_methods'), 'SELECT 1');
PREPARE fix059_statement FROM @fix059_sql;
EXECUTE fix059_statement;
DEALLOCATE PREPARE fix059_statement;

ALTER TABLE payment_method_transitions
    MODIFY payment_attempt_id BIGINT NULL,
    MODIFY provider_order_code BIGINT NULL,
    MODIFY provider_link_id VARBINARY(1020) NULL;

SET @fix059_sql = IF(EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema=DATABASE()
    AND table_name='payment_method_transitions' AND constraint_name='ck_fix059_methods'), 'SELECT 1',
    'ALTER TABLE payment_method_transitions ADD CONSTRAINT ck_fix059_methods CHECK((source_method=''COD'' AND target_method=''PAYOS_VIETQR'') OR (source_method=''PAYOS_VIETQR'' AND target_method=''COD'' AND payment_attempt_id IS NOT NULL AND provider_order_code IS NOT NULL AND provider_link_id IS NOT NULL))');
PREPARE fix059_statement FROM @fix059_sql;
EXECUTE fix059_statement;
DEALLOCATE PREPARE fix059_statement;

SET @fix059_sql = IF(EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE()
    AND table_name='payment_method_transitions' AND column_name='reverse_order_id'), 'SELECT 1',
    'ALTER TABLE payment_method_transitions ADD COLUMN reverse_order_id BIGINT GENERATED ALWAYS AS (CASE WHEN target_method=''PAYOS_VIETQR'' THEN order_id ELSE NULL END) STORED, ADD CONSTRAINT uk_fix059_reverse_once UNIQUE(reverse_order_id)');
PREPARE fix059_statement FROM @fix059_sql;
EXECUTE fix059_statement;
DEALLOCATE PREPARE fix059_statement;
