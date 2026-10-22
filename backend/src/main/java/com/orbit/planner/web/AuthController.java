package com.orbit.planner.web;

import com.orbit.planner.api.ApiTypes.AuthRequest;
import com.orbit.planner.model.PlannerUser;
import com.orbit.planner.repo.UserRepository;
import com.orbit.planner.service.AccountService;
import com.orbit.planner.service.PlannerService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
public class AuthController {
    private final AccountService accounts;
    private final PlannerService planner;
    private final UserRepository users;
    private final StaySigned stay;
    private final Object gate = new Object();

    public AuthController(AccountService accounts, PlannerService planner, UserRepository users, StaySigned stay) {
        this.accounts = accounts;
        this.planner = planner;
        this.users = users;
        this.stay = stay;
    }

    @GetMapping("/api/me")
    public Map<String, String> me(HttpServletRequest request) {
        return Map.of("username", signedIn(request).getUsername());
    }

    @PostMapping("/api/register")
    public Map<String, String> register(@RequestBody AuthRequest body, HttpServletRequest request, HttpServletResponse response) {
        synchronized (gate) {
            PlannerUser user = accounts.register(body == null ? null : body.username(), body == null ? null : body.password());
            planner.ensureDiary(user);
            stay.remember(request, response, user.getId());
            return Map.of("username", user.getUsername());
        }
    }

    @PostMapping("/api/login")
    public Map<String, String> login(@RequestBody AuthRequest body, HttpServletRequest request, HttpServletResponse response) {
        synchronized (gate) {
            PlannerUser user = accounts.login(body == null ? null : body.username(), body == null ? null : body.password());
            planner.ensureDiary(user);
            stay.remember(request, response, user.getId());
            return Map.of("username", user.getUsername());
        }
    }

    @PostMapping("/api/logout")
    public Map<String, String> logout(HttpServletRequest request, HttpServletResponse response) {
        stay.clear(request, response);
        return Map.of("status", "signed-out");
    }

    private PlannerUser signedIn(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute("userId") instanceof Long id)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to open your diary.");
        }
        return users.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to open your diary."));
    }
}
