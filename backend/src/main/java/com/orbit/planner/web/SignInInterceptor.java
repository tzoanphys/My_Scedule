package com.orbit.planner.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class SignInInterceptor implements HandlerInterceptor {
    private final StaySigned stay;

    public SignInInterceptor(StaySigned stay) {
        this.stay = stay;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        stay.restore(request);
        String path = request.getRequestURI();
        if ("/api/health".equals(path) || "/api/login".equals(path) || "/api/register".equals(path)
                || "/api/me".equals(path) || "/api/logout".equals(path)) {
            return true;
        }
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("userId") instanceof Long) {
            return true;
        }
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"Sign in to open your diary.\"}");
        return false;
    }
}
