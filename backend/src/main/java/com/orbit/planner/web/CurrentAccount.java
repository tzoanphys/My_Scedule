package com.orbit.planner.web;

import com.orbit.planner.model.PlannerUser;
import com.orbit.planner.repo.UserRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

@Component
public class CurrentAccount {
    private final UserRepository users;

    public CurrentAccount(UserRepository users) {
        this.users = users;
    }

    public PlannerUser require() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpSession session = attributes == null ? null : attributes.getRequest().getSession(false);
        if (session == null || !(session.getAttribute("userId") instanceof Long id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to open your diary.");
        }
        return users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to open your diary."));
    }
}
