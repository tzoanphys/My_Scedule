package com.orbit.planner.web;

import com.orbit.planner.repo.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class StaySigned {
    static final String NAME = "orbit_stay";
    private static final Duration LIFE = Duration.ofDays(30);

    private final byte[] secret;
    private final UserRepository users;

    public StaySigned(@Value("${orbit.stay-secret}") String secret, UserRepository users) {
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.users = users;
    }

    public void remember(HttpServletRequest request, HttpServletResponse response, long userId) {
        long expires = System.currentTimeMillis() / 1000 + LIFE.toSeconds();
        String body = userId + "." + expires;
        Cookie cookie = new Cookie(NAME, body + "." + sign(body));
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) LIFE.toSeconds());
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
        request.getSession(true).setAttribute("userId", userId);
    }

    public void clear(HttpServletRequest request, HttpServletResponse response) {
        Cookie cookie = new Cookie(NAME, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
    }

    public void restore(HttpServletRequest request) {
        if (request.getSession(false) != null && request.getSession(false).getAttribute("userId") instanceof Long) {
            return;
        }
        Long userId = read(request);
        if (userId == null || users.findById(userId).isEmpty()) {
            return;
        }
        request.getSession(true).setAttribute("userId", userId);
    }

    private Long read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (!NAME.equals(cookie.getName()) || cookie.getValue() == null) {
                continue;
            }
            String[] parts = cookie.getValue().split("\\.");
            if (parts.length != 3) {
                return null;
            }
            String body = parts[0] + "." + parts[1];
            if (!MessageDigest.isEqual(sign(body).getBytes(StandardCharsets.UTF_8), parts[2].getBytes(StandardCharsets.UTF_8))) {
                return null;
            }
            try {
                long expires = Long.parseLong(parts[1]);
                if (expires < System.currentTimeMillis() / 1000) {
                    return null;
                }
                return Long.parseLong(parts[0]);
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private String sign(String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Could not sign the stay-signed cookie", ex);
        }
    }
}
