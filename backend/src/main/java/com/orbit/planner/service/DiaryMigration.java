package com.orbit.planner.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DiaryMigration {
    private static final Logger log = LoggerFactory.getLogger(DiaryMigration.class);

    private final JdbcTemplate jdbc;

    public DiaryMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void copyLegacyIfNeeded() {
        if (!tableExists("ORBIT_MEMBER_WEEK") || count("ORBIT_MEMBER_WEEK") > 0 || !tableExists("ORBIT_WEEK")) {
            return;
        }
        jdbc.update("""
                insert into orbit_member_week (user_id, week_number, start_date, end_date, program)
                select null, week_number, start_date, end_date, program from orbit_week
                """);
        if (tableExists("ORBIT_DAY")) {
            jdbc.update("""
                    insert into orbit_member_day
                        (user_id, week_number, day_index, theme, notes, elapsed_seconds, running, running_since, completed)
                    select null, week_number, day_index, theme, notes, elapsed_seconds, running, running_since, completed
                    from orbit_day
                    """);
        }
        if (tableExists("ORBIT_DETAIL")) {
            String textColumn = columnExists("ORBIT_DETAIL", "DETAIL_TEXT") ? "detail_text" : "\"TEXT\"";
            jdbc.update("""
                    insert into orbit_member_detail (user_id, week_number, day_index, detail_text, done, sort_order)
                    select null, week_number, day_index, %s, done, sort_order from orbit_detail
                    """.formatted(textColumn));
        }
        log.info("Kept the existing diary beside the new accounts. The original tables were left as they were.");
    }

    private boolean tableExists(String name) {
        Integer count = jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_name = ?",
                Integer.class,
                name);
        return count != null && count > 0;
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbc.queryForObject(
                "select count(*) from information_schema.columns where table_name = ? and column_name = ?",
                Integer.class,
                table,
                column);
        return count != null && count > 0;
    }

    private int count(String table) {
        Integer count = jdbc.queryForObject("select count(*) from " + table, Integer.class);
        return count == null ? 0 : count;
    }
}
