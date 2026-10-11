-- PREPARE từ chối diagnostic khi preflight sai, trước mọi DDL; không cần routine phụ.
SET @fix057_sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
        AND ((table_name IN ('orders','payment_attempts','users') AND column_name = 'id')
        OR (table_name IN ('payment_events','payment_event_conflicts') AND column_name = 'source'))) = 5,
    'SELECT 1', 'FIX057_PREFLIGHT_MISSING_BASE_SCHEMA');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

SET @fix057_sql = IF(
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name IN ('payment_events','payment_event_conflicts') AND column_name = 'source'
        AND data_type IN ('enum','varchar') AND is_nullable = 'NO'
        AND (column_default IS NULL OR TRIM(BOTH '''' FROM column_default)
            IN ('WEBHOOK','RECONCILE_QUERY','PROVIDER_CANCEL'))) = 2,
    'SELECT 1', 'FIX057_PREFLIGHT_INCOMPATIBLE_SOURCE_METADATA');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

SET @fix057_sql = IF(
    NOT EXISTS(SELECT 1 FROM payment_events WHERE source IS NULL
        OR BINARY source NOT IN ('WEBHOOK','RECONCILE_QUERY','PROVIDER_CANCEL'))
    AND NOT EXISTS(SELECT 1 FROM payment_event_conflicts WHERE source IS NULL
        OR BINARY source NOT IN ('WEBHOOK','RECONCILE_QUERY','PROVIDER_CANCEL')),
    'SELECT 1', 'FIX057_PREFLIGHT_INVALID_SOURCE_DATA');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

SET @fix057_sql = IF(NOT EXISTS(
    SELECT 1 FROM information_schema.table_constraints t
    JOIN information_schema.check_constraints c
        ON c.constraint_schema = t.constraint_schema AND c.constraint_name = t.constraint_name
    JOIN information_schema.columns v
        ON v.table_schema = t.table_schema AND v.table_name = t.table_name AND v.column_name = 'source'
    WHERE t.constraint_schema = DATABASE() AND t.constraint_type = 'CHECK'
        AND t.table_name IN ('payment_events','payment_event_conflicts')
        AND LOWER(c.check_clause) REGEXP '(^|[^a-z0-9_])source([^a-z0-9_]|$)'
        AND REGEXP_REPLACE(REPLACE(REPLACE(LOWER(c.check_clause), '`', ''),
            CONCAT('_', v.character_set_name, ''''), ''''), '[[:space:]]', '')
            NOT REGEXP '^[()]*sourcein[(]''(webhook|reconcile_query|provider_cancel)''(,''(webhook|reconcile_query|provider_cancel)'')*[)][()]*$'),
    'SELECT 1', 'FIX057_PREFLIGHT_UNSUPPORTED_SOURCE_CONSTRAINT');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

SET @fix057_checks = (SELECT GROUP_CONCAT(CONCAT(
    IF(LOCATE('MariaDB', VERSION()) > 0, 'DROP CONSTRAINT ', 'DROP CHECK '),
    '`', REPLACE(t.constraint_name, '`', '``'), '`, ADD CONSTRAINT `',
    REPLACE(t.constraint_name, '`', '``'),
    '` CHECK(source IN (''WEBHOOK'',''RECONCILE_QUERY'',''PROVIDER_CANCEL''))')
    ORDER BY t.constraint_name SEPARATOR ', ')
    FROM information_schema.table_constraints t JOIN information_schema.check_constraints c
        ON c.constraint_schema = t.constraint_schema AND c.constraint_name = t.constraint_name
    WHERE t.constraint_schema = DATABASE() AND t.table_name = 'payment_events'
        AND t.constraint_type = 'CHECK'
        AND LOWER(c.check_clause) REGEXP '(^|[^a-z0-9_])source([^a-z0-9_]|$)'
        AND NOT (LOWER(c.check_clause) LIKE '%''webhook''%'
            AND LOWER(c.check_clause) LIKE '%''reconcile_query''%'
            AND LOWER(c.check_clause) LIKE '%''provider_cancel''%'));
SET @fix057_sql = IF(@fix057_checks IS NULL, 'SELECT 1',
    CONCAT('ALTER TABLE payment_events ', @fix057_checks));
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

SET @fix057_checks = (SELECT GROUP_CONCAT(CONCAT(
    IF(LOCATE('MariaDB', VERSION()) > 0, 'DROP CONSTRAINT ', 'DROP CHECK '),
    '`', REPLACE(t.constraint_name, '`', '``'), '`, ADD CONSTRAINT `',
    REPLACE(t.constraint_name, '`', '``'),
    '` CHECK(source IN (''WEBHOOK'',''RECONCILE_QUERY'',''PROVIDER_CANCEL''))')
    ORDER BY t.constraint_name SEPARATOR ', ')
    FROM information_schema.table_constraints t JOIN information_schema.check_constraints c
        ON c.constraint_schema = t.constraint_schema AND c.constraint_name = t.constraint_name
    WHERE t.constraint_schema = DATABASE() AND t.table_name = 'payment_event_conflicts'
        AND t.constraint_type = 'CHECK'
        AND LOWER(c.check_clause) REGEXP '(^|[^a-z0-9_])source([^a-z0-9_]|$)'
        AND NOT (LOWER(c.check_clause) LIKE '%''webhook''%'
            AND LOWER(c.check_clause) LIKE '%''reconcile_query''%'
            AND LOWER(c.check_clause) LIKE '%''provider_cancel''%'));
SET @fix057_sql = IF(@fix057_checks IS NULL, 'SELECT 1',
    CONCAT('ALTER TABLE payment_event_conflicts ', @fix057_checks));
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

SET @fix057_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'orders' AND column_name = 'checkout_revision'),
    'SELECT 1', 'ALTER TABLE orders ADD COLUMN checkout_revision BIGINT NOT NULL DEFAULT 0');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

SET @fix057_sql = (SELECT IF(data_type = 'varchar' AND character_maximum_length = 32
    AND is_nullable = 'NO', 'SELECT 1',
    CONCAT('ALTER TABLE payment_events MODIFY COLUMN source VARCHAR(32) CHARACTER SET ',
        character_set_name, ' COLLATE ', collation_name, ' NOT NULL',
        IF(column_default IS NULL, '', CONCAT(' DEFAULT ''', TRIM(BOTH '''' FROM column_default), '''')),
        ' COMMENT ''', REPLACE(column_comment, '''', ''''''), ''''))
    FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'payment_events' AND column_name = 'source');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

SET @fix057_sql = (SELECT IF(data_type = 'varchar' AND character_maximum_length = 32
    AND is_nullable = 'NO', 'SELECT 1',
    CONCAT('ALTER TABLE payment_event_conflicts MODIFY COLUMN source VARCHAR(32) CHARACTER SET ',
        character_set_name, ' COLLATE ', collation_name, ' NOT NULL',
        IF(column_default IS NULL, '', CONCAT(' DEFAULT ''', TRIM(BOTH '''' FROM column_default), '''')),
        ' COMMENT ''', REPLACE(column_comment, '''', ''''''), ''''))
    FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'payment_event_conflicts' AND column_name = 'source');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;


SET @fix057_sql = (SELECT IF(column_default = '0', 'SELECT 1',
    'ALTER TABLE orders MODIFY COLUMN checkout_revision BIGINT NOT NULL DEFAULT 0')
    FROM information_schema.columns WHERE table_schema = DATABASE()
        AND table_name = 'orders' AND column_name = 'checkout_revision');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

CREATE TABLE IF NOT EXISTS payment_method_transitions (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    operation_id CHAR(36) NOT NULL,
    order_id BIGINT NOT NULL,
    payment_attempt_id BIGINT NOT NULL,
    actor_id BIGINT NOT NULL,
    idempotency_key CHAR(36) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    source_method VARCHAR(32) NOT NULL,
    target_method VARCHAR(32) NOT NULL,
    expected_state_version BIGINT NOT NULL,
    original_expires_at DATETIME(6) NOT NULL,
    provider_order_code BIGINT NOT NULL,
    provider_link_id VARBINARY(1020) NOT NULL,
    amount DECIMAL(12,0) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    status VARCHAR(32) NOT NULL,
    reason VARCHAR(64) NULL,
    runner_epoch BIGINT NOT NULL DEFAULT 0,
    lease_until DATETIME(6) NULL,
    evidence_history LONGTEXT NOT NULL,
    last_evidence_hash CHAR(64) NULL,
    result JSON NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    applied_at DATETIME(6) NULL,
    finished_at DATETIME(6) NULL,
    CONSTRAINT uk_fix057_order UNIQUE(order_id),
    CONSTRAINT uk_fix057_operation UNIQUE(operation_id),
    INDEX ix_fix057_attempt(payment_attempt_id),
    INDEX ix_fix057_actor(actor_id),
    CONSTRAINT fk_fix057_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fix057_attempt FOREIGN KEY(payment_attempt_id) REFERENCES payment_attempts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_fix057_actor FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_fix057_methods CHECK(source_method = 'PAYOS_VIETQR' AND target_method = 'COD'),
    CONSTRAINT ck_fix057_status CHECK(status IN ('VERIFYING','APPLIED','REJECTED','NEEDS_REVIEW')),
    CONSTRAINT ck_fix057_version CHECK(expected_state_version BETWEEN 0 AND 9007199254740991),
    CONSTRAINT ck_fix057_epoch CHECK(runner_epoch >= 0),
    CONSTRAINT ck_fix057_money CHECK(amount BETWEEN 0 AND 9999999999 AND currency = 'VND'),
    CONSTRAINT ck_fix057_result CHECK(
        (status = 'VERIFYING' AND finished_at IS NULL AND applied_at IS NULL AND result IS NULL)
        OR (status = 'APPLIED' AND finished_at IS NOT NULL AND applied_at IS NOT NULL AND result IS NOT NULL)
        OR (status IN ('REJECTED','NEEDS_REVIEW') AND finished_at IS NOT NULL AND applied_at IS NULL AND result IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @fix057_sql = IF(
    EXISTS(SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = DATABASE()
        AND table_name = 'orders' AND constraint_name = 'ck_fix057_checkout_revision'),
    'SELECT 1', 'ALTER TABLE orders ADD CONSTRAINT ck_fix057_checkout_revision CHECK(checkout_revision BETWEEN 0 AND 9007199254740991)');
PREPARE fix057_statement FROM @fix057_sql;
EXECUTE fix057_statement;
DEALLOCATE PREPARE fix057_statement;

