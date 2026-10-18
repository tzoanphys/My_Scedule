package com.orbit.planner.service;

import com.orbit.planner.model.PlannerUser;
import com.orbit.planner.repo.UserRepository;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountService {
    private final UserRepository users;
    private final PasswordEncoder passwords = new BCryptPasswordEncoder();

    public AccountService(UserRepository users) {
        this.users = users;
    }

    public PlannerUser register(String username, String password) {
        String shown = cleanUsername(username);
        String secret = cleanPassword(password);
        String key = shown.toLowerCase(Locale.ROOT);
        if (users.findByUsernameKey(key).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is already in use.");
        }
        PlannerUser user = new PlannerUser();
        user.setUsername(shown);
        user.setUsernameKey(key);
        user.setPasswordHash(passwords.encode(secret));
        return users.save(user);
    }

    public PlannerUser login(String username, String password) {
        String shown = cleanUsername(username);
        String secret = cleanPassword(password);
        PlannerUser user = users.findByUsernameKey(shown.toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "That username and password do not match."));
        if (!passwords.matches(secret, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "That username and password do not match.");
        }
        return user;
    }

    private String cleanUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required.");
        }
        String trimmed = username.trim();
        if (trimmed.length() > 40) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is too long.");
        }
        return trimmed;
    }

    private String cleanPassword(String password) {
        if (password == null || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username and password are required.");
        }
        if (password.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is too long.");
        }
        return password;
    }
}
