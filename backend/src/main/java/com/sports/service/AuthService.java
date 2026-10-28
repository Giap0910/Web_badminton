package com.sports.service;

import com.sports.dto.AuthRequest;
import com.sports.dto.AuthResponse;
import com.sports.dto.RegisterRequest;
import com.sports.entity.Role;
import com.sports.entity.User;
import com.sports.exception.BadRequestException;
import com.sports.repository.UserRepository;
import com.sports.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthResponse login(AuthRequest request) {
        Authentication authentication = authenticate(request);

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(request.getUsername())
                .or(() -> userRepository.findByEmail(request.getUsername()))
                .orElseThrow(() -> new BadRequestException("Tài khoản không tồn tại"));

        return AuthResponse.builder()
                .token(jwt)
                .type("Bearer")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validateNewPassword(request.getPassword());
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại trong hệ thống");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã được đăng ký trong hệ thống");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .address(request.getAddress())
                .role(Role.ROLE_USER)
                .build();

        userRepository.save(user);

        // Auto login after registration
        return login(new AuthRequest(request.getUsername(), request.getPassword()));
    }

    private Authentication authenticate(AuthRequest request) {
        try {
            return authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.getUsername(),request.getPassword()));
        } catch(IllegalArgumentException invalid) {
            throw new org.springframework.security.authentication.BadCredentialsException("Thông tin đăng nhập không hợp lệ");
        }
    }

    public static void validateNewPassword(String password) {
        if (password==null || password.isBlank() || password.length()<6)
            throw new BadRequestException("Mật khẩu mới phải có ít nhất 6 ký tự");
        if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)
            throw new BadRequestException("Mật khẩu mới không được vượt quá 72 byte UTF-8");
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void logout(Long userId) {
        User user=userRepository.findByIdForUpdate(userId).orElseThrow(()->new BadRequestException("Tài khoản không tồn tại"));
        user.setTokenVersion(Math.addExact(user.getTokenVersion()==null ? 0L : user.getTokenVersion(),1L));
        userRepository.saveAndFlush(user);
    }
}
