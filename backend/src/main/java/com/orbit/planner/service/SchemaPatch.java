package com.orbit.planner.service;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;

@Component
public class SchemaPatch implements HibernatePropertiesCustomizer {
    private final DataSource dataSource;

    public SchemaPatch(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(true);
            try (Statement statement = connection.createStatement()) {
                statement.execute("""
                        alter table orbit_member_day
                        add column if not exists kept_seconds double precision not null default 0
                        """);
                statement.execute("""
                        alter table orbit_theme_plan
                        add column if not exists logged_seconds double precision not null default 0
                        """);
            }
        } catch (SQLException ex) {
            if (missingTable(ex)) {
                return;
            }
            throw new IllegalStateException("Could not prepare the studied-minutes column", ex);
        }
    }

    private boolean missingTable(SQLException ex) {
        String state = ex.getSQLState();
        return "42P01".equals(state) || "3F000".equals(state);
    }
}
