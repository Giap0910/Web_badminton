package com.sports.mockpayos;

import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import java.sql.*;
import java.util.*;

public final class MockPayOSSchema {
    private MockPayOSSchema() {}

    public static void initialize(Connection connection) throws SQLException {
        for (String table:List.of("orders","users","payment_attempts")) requireParent(connection,table);
        validateExisting(connection);
        ScriptUtils.executeSqlScript(connection,new ClassPathResource("mock_payos_test_schema.sql"));
        validateExisting(connection);
    }

    private static void requireParent(Connection connection,String table) throws SQLException {
        try (var rows=connection.getMetaData().getColumns(connection.getCatalog(),null,table,"id")) {
            if (!rows.next() || rows.getInt("DATA_TYPE")!=Types.BIGINT || rows.getInt("NULLABLE")!=0) throw incompatible();
        }
    }

    private static void validateExisting(Connection connection) throws SQLException {
        for (String table:List.of("mock_payos_state","mock_payos_actions")) {
            if (!exists(connection,table)) continue;
            validateColumns(connection,table);
            validateKeys(connection,table);
        }
    }

    private static boolean exists(Connection connection,String table) throws SQLException {
        try (var rows=connection.getMetaData().getTables(connection.getCatalog(),null,table,new String[]{"TABLE"})) { return rows.next(); }
    }

    private static void validateColumns(Connection connection,String table) throws SQLException {
        Map<String,Integer> expected=new LinkedHashMap<>();
        String numbers=table.endsWith("state")?"id order_id payment_attempt_id order_code version":"id order_id actor_id provider_state_id runner_epoch";
        for (String field:numbers.split(" ")) expected.put(field,Types.BIGINT);
        String dates=table.endsWith("state")?"expires_at created_at updated_at":"lease_until created_at updated_at completed_at";
        for (String field:dates.split(" ")) expected.put(field,Types.TIMESTAMP);
        if (table.endsWith("state")) for (String field:List.of("amount","amount_paid","amount_remaining")) expected.put(field,Types.DECIMAL);
        for (var field:expected.entrySet()) {
            try (var rows=connection.getMetaData().getColumns(connection.getCatalog(),null,table,field.getKey())) {
                if (!rows.next() || rows.getInt("DATA_TYPE")!=field.getValue()) throw incompatible();
            }
        }
    }

    private static void validateKeys(Connection connection,String table) throws SQLException {
        validateUnique(connection,table);
        validateForeign(connection,table);
    }

    private static void validateUnique(Connection connection,String table) throws SQLException {
        Set<String> unique=new HashSet<>(); Map<String,List<String>> indexes=new HashMap<>();
        try (var rows=connection.getMetaData().getIndexInfo(connection.getCatalog(),null,table,true,false)) {
            while (rows.next()) if (rows.getString("COLUMN_NAME")!=null) {
                indexes.computeIfAbsent(rows.getString("INDEX_NAME"),key->new ArrayList<>()).add(rows.getString("COLUMN_NAME"));
            }
        }
        indexes.values().forEach(fields->unique.add(String.join(",",fields)));
        var required=table.endsWith("state")?List.of("id","order_id","payment_attempt_id","order_code","payment_link_id")
                :List.of("id","action_id","actor_id,order_id,idempotency_key");
        if (!unique.containsAll(required)) throw incompatible();
    }

    private static void validateForeign(Connection connection,String table) throws SQLException {
        Set<String> foreign=new HashSet<>();
        try (var rows=connection.getMetaData().getImportedKeys(connection.getCatalog(),null,table)) {
            while (rows.next()) {
                int rule=rows.getInt("DELETE_RULE");
                if (rule!=DatabaseMetaData.importedKeyRestrict && rule!=DatabaseMetaData.importedKeyNoAction) throw incompatible();
                foreign.add(rows.getString("FKCOLUMN_NAME")+":"+rows.getString("PKTABLE_NAME"));
            }
        }
        if (!foreign.containsAll(table.endsWith("state")?List.of("order_id:orders","payment_attempt_id:payment_attempts")
                :List.of("order_id:orders","actor_id:users","provider_state_id:mock_payos_state"))) throw incompatible();
    }

    private static IllegalStateException incompatible() {
        return new IllegalStateException("FIX-058: schema MOCK không tương thích; không drop/recreate hoặc sửa dữ liệu");
    }
}
