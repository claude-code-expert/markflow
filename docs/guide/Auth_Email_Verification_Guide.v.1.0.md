# 이메일 인증 기반 회원가입/로그인 구현 가이드 (Spring Boot 4.x + Next.js + Resend)

> 본 문서는 Run-AI 프로젝트의 실제 구현을 기반으로, 다른 프로젝트에서 그대로 차용 가능하도록 정리한 **회원가입 → 이메일 인증 → 로그인** 전체 프로세스 설계서이다.
>
> - Backend: Spring Boot 4.x / Java 21 / Spring Security / JWT (jjwt) / PostgreSQL / Flyway
> - Frontend: Next.js 16 / React 19 / Zustand
> - Email Provider: **Resend** (REST API 기반, SMTP 불필요)

---

## 0. 핵심 설계 원칙

| 원칙 | 설명 |
|---|---|
| 비밀번호는 즉시 발급, 인증은 별도 단계 | 회원가입 시 `email_verified=false`로 저장 후 인증 코드 발송 |
| 인증 메일은 트랜잭션 외부에서 발송 | `@TransactionalEventListener(AFTER_COMMIT) + @Async`로 DB 커넥션 점유 회피 |
| 6자리 숫자 코드 + 5분 만료 | DB에 평문 저장(짧은 TTL이라 허용), 검증 후 즉시 NULL 처리 |
| 30초 재발송 쿨다운 + 5회 실패 시 15분 잠금 | 인메모리 `ConcurrentHashMap` (다중 인스턴스 시 Redis로 교체) |
| Email Enumeration 방지 | 미가입 이메일에 대한 코드 요청도 silent success |
| Refresh Token: HttpOnly Cookie + DB 저장 | XSS 방어 + 서버 측 무효화 가능 (단일 디바이스 정책) |
| Access Token: Bearer 헤더, 24시간 | 만료 시 `/auth/refresh`로 재발급 |
| 인증 완료 즉시 자동 로그인 | 코드 검증 성공 시 토큰 발급까지 한 번에 처리 (UX 개선) |

---

## 1. 사전 준비 — Resend 계정 및 도메인 설정

### 1.1 Resend 가입 및 API 키 발급
1. https://resend.com 가입 (월 3,000건 무료)
2. **API Keys** 메뉴에서 새 키 생성 → `re_xxxxxxxx...` 형태 복사 (Full Access 권장)
3. 키는 한 번만 노출되므로 즉시 안전한 비밀 저장소에 보관 (`.env`, AWS Secrets Manager 등)

### 1.2 발신 도메인 등록 (운영 환경 필수)
1. **Domains** → **Add Domain**에서 발신용 도메인 입력 (예: `run-ai.kr`)
2. Resend가 제공하는 DNS 레코드를 도메인 DNS에 추가:
   - **SPF**: `TXT @ "v=spf1 include:amazonses.com ~all"`
   - **DKIM**: `TXT resend._domainkey "<공개키>"`
   - **DMARC** (권장): `TXT _dmarc "v=DMARC1; p=none;"`
3. Resend 대시보드에서 **Verify DNS Records** 클릭 → 모두 ✅ 확인
4. 발신 주소는 `noreply@run-ai.kr` 같이 인증된 도메인 사용
5. **로컬 개발용 임시 발신**: 도메인 검증 없이 `onboarding@resend.dev`로도 송신 가능 (Resend 계정 본인 이메일로만 발송)

### 1.3 환경 변수
```bash
# .env (또는 application-prod.yml에서 매핑)
APP_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
APP_EMAIL_FROM_ADDRESS=noreply@run-ai.kr
JWT_SECRET=<256bit이상-랜덤문자열>
DB_URL=jdbc:postgresql://localhost:5432/runai
DB_USERNAME=runai
DB_PASSWORD=<비밀번호>
```

---

## 2. 데이터베이스 스키마

### 2.1 `users` 테이블 (Flyway 마이그레이션)

```sql
-- V1__create_users_table.sql (핵심 컬럼만 발췌)
CREATE TABLE users (
  id              BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email           VARCHAR(255)  NOT NULL UNIQUE,
  password_hash   VARCHAR(255),
  email_verified  BOOLEAN       NOT NULL DEFAULT FALSE,
  name            VARCHAR(100),
  role            VARCHAR(20)   NOT NULL DEFAULT 'MEMBER',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

```sql
-- V18__add_refresh_token_and_verification_columns.sql
ALTER TABLE users ADD COLUMN refresh_token             VARCHAR(500);
ALTER TABLE users ADD COLUMN refresh_token_expires_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN verification_code         VARCHAR(6);
ALTER TABLE users ADD COLUMN verification_code_expires_at TIMESTAMPTZ;
```

> **주의**: 운영 DB에 `spring.jpa.hibernate.ddl-auto=update` 사용 금지. Flyway 마이그레이션으로만 스키마 관리.

---

## 3. Backend 구현

### 3.1 의존성 (`build.gradle`)

```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-security'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'
    runtimeOnly    'org.postgresql:postgresql'

    // JWT
    implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
    runtimeOnly    'io.jsonwebtoken:jjwt-impl:0.12.6'
    runtimeOnly    'io.jsonwebtoken:jjwt-jackson:0.12.6'

    // Lombok
    compileOnly        'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
}
```

### 3.2 `application.yml`

```yaml
server:
  port: 9999

spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration

app:
  jwt:
    secret: ${JWT_SECRET}
    access-expiration:  86400000     # 24h
    refresh-expiration: 604800000    # 7d
  auth:
    dev-bypass: false                # true 시 코드 "000000"으로 인증 통과 (로컬 전용)
  email:
    resend-api-key: ${APP_RESEND_API_KEY}
    from-address:   noreply@run-ai.kr
```

### 3.3 RestClient Bean (Resend HTTP 클라이언트)

```java
// kr/runai/api/config/RestClientConfig.java
@Configuration
public class RestClientConfig {

    @Bean
    public RestClient resendRestClient(@Value("${app.email.resend-api-key}") String apiKey) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(10).toMillis());

        return RestClient.builder()
                .baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", "application/json")
                .requestFactory(factory)
                .build();
    }
}
```

### 3.4 비동기/스케줄링 활성화

```java
// kr/runai/api/config/AsyncConfig.java
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig implements AsyncConfigurer {

    @Bean
    public Clock clock() { return Clock.systemDefaultZone(); }

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        return executor;
    }
}
```

### 3.5 User Entity

```java
@Entity
@Table(name = "users")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private Boolean emailVerified = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserRole role = UserRole.MEMBER;

    @Column(name = "refresh_token", length = 500)
    private String refreshToken;

    @Column(name = "refresh_token_expires_at")
    private Instant refreshTokenExpiresAt;

    @Column(name = "verification_code", length = 6)
    private String verificationCode;

    @Column(name = "verification_code_expires_at")
    private Instant verificationCodeExpiresAt;
    // ... name, nickname 등
}
```

### 3.6 DTO (Java `record`)

```java
public record SignupRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8, max = 100) @StrongPassword String password,
    @NotBlank @Size(max = 100) String name) {}

public record LoginRequest(
    @NotBlank @Email String email,
    @NotBlank String password) {}

public record SendVerificationRequest(
    @NotBlank @Email String email) {}

public record VerifyEmailRequest(
    @NotBlank @Email String email,
    @NotBlank @Pattern(regexp = "\\d{6}") String code) {}

public record AuthResponse(String accessToken, UserResponse user) {}
public record TokenResponse(String accessToken) {}
public record LoginResult(String accessToken, String refreshToken, AuthResponse authResponse) {}
```

### 3.7 비밀번호 강도 검증 어노테이션

```java
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = PasswordStrengthValidator.class)
public @interface StrongPassword {
    String message() default "비밀번호는 8자 이상이며 숫자와 특수문자를 각 1개 이상 포함해야 합니다.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class PasswordStrengthValidator implements ConstraintValidator<StrongPassword, String> {
    private static final Pattern HAS_DIGIT   = Pattern.compile(".*\\d.*");
    private static final Pattern HAS_SPECIAL = Pattern.compile(".*[^a-zA-Z0-9].*");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        if (value == null || value.length() < 8) return false;
        return HAS_DIGIT.matcher(value).matches() && HAS_SPECIAL.matcher(value).matches();
    }
}
```

### 3.8 ResendEmailClient — Resend REST API 호출

```java
@Service
public class ResendEmailClient {
    private static final Logger log = LoggerFactory.getLogger(ResendEmailClient.class);

    private final RestClient resendRestClient;
    private final String fromAddress;
    private final boolean devBypass;

    public ResendEmailClient(
            @Qualifier("resendRestClient") RestClient resendRestClient,
            @Value("${app.email.from-address}") String fromAddress,
            @Value("${app.auth.dev-bypass:false}") boolean devBypass) {
        this.resendRestClient = resendRestClient;
        this.fromAddress = fromAddress;
        this.devBypass = devBypass;
    }

    public void sendVerificationEmail(String to, String code, long expiryMinutes) {
        if (devBypass) {
            log.info("[DEV] Email skipped for {} — code: {}", to, code);
            return;
        }

        ResendEmailRequest req = new ResendEmailRequest(
            fromAddress,
            List.of(to),
            "[Run-AI] 이메일 인증 코드",
            buildHtml(code, expiryMinutes));

        try {
            resendRestClient.post()
                .uri("/emails")
                .body(req)
                .retrieve()
                .body(ResendEmailResponse.class);
            log.info("Verification email sent to {}", to);
        } catch (Exception e) {
            // 메일 실패는 log만 — 사용자가 재발송할 수 있도록 throw 하지 않음
            log.error("Failed to send email to {}: {}", to, e.getMessage(), e);
        }
    }

    private String buildHtml(String code, long expiryMinutes) {
        return """
            <div style="max-width:480px;margin:0 auto;font-family:-apple-system,sans-serif;padding:32px;">
              <h1 style="font-size:24px;color:#111827;">서비스명</h1>
              <div style="background:#f9fafb;border-radius:12px;padding:24px;text-align:center;">
                <p>이메일 인증 코드</p>
                <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2563eb;">
                  %s
                </div>
                <p style="font-size:13px;color:#9ca3af;">이 코드는 %d분 후 만료됩니다.</p>
              </div>
            </div>
            """.formatted(code, expiryMinutes);
    }

    record ResendEmailRequest(String from, List<String> to, String subject, String html) {}
    record ResendEmailResponse(String id) {}
}
```

> **Resend API 스펙**: `POST https://api.resend.com/emails`
> Body: `{ "from": "...", "to": ["..."], "subject": "...", "html": "..." }`
> 응답: `{ "id": "<message_id>" }`

### 3.9 Verification Code 이벤트 (트랜잭션 외부 발송)

```java
public record VerificationCodeGeneratedEvent(String email, String code, long expiryMinutes) {}

@Component
public class VerificationCodeEventListener {
    private final ResendEmailClient resendEmailClient;

    public VerificationCodeEventListener(ResendEmailClient client) {
        this.resendEmailClient = client;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onVerificationCodeGenerated(VerificationCodeGeneratedEvent event) {
        resendEmailClient.sendVerificationEmail(event.email(), event.code(), event.expiryMinutes());
    }
}
```

> **왜 이벤트 + AFTER_COMMIT인가?**
> - 메일 발송(네트워크 I/O)이 트랜잭션 안에서 일어나면 DB 커넥션을 수 초간 점유 → 풀 고갈 위험
> - `AFTER_COMMIT` 시점에 비로소 비동기 워커로 디스패치하므로 커밋된 데이터만 발송됨

### 3.10 Email Verification Guard (재발송/실패 잠금)

```java
@Service
public class EmailVerificationGuardService {
    private static final Duration RESEND_RATE_LIMIT = Duration.ofSeconds(30);
    private static final Duration LOCK_DURATION     = Duration.ofMinutes(15);
    private static final int      MAX_FAILURES      = 5;

    private final Clock clock;
    final ConcurrentHashMap<String, Instant> resendTimestamps = new ConcurrentHashMap<>();
    final ConcurrentHashMap<String, FailureRecord> failureRecords = new ConcurrentHashMap<>();

    record FailureRecord(int count, Instant lockedUntil, Instant lastAttemptAt) {}

    public EmailVerificationGuardService(Clock clock) { this.clock = clock; }

    public void checkResendRateLimit(String email) {
        Instant now = clock.instant();
        resendTimestamps.compute(email, (k, prev) -> {
            if (prev != null && now.isBefore(prev.plus(RESEND_RATE_LIMIT))) {
                throw new ApiException(ErrorCode.VERIFICATION_RATE_LIMITED);
            }
            return now;
        });
    }

    public void checkLocked(String email) {
        FailureRecord r = failureRecords.get(email);
        if (r != null && r.lockedUntil() != null && clock.instant().isBefore(r.lockedUntil())) {
            throw new ApiException(ErrorCode.VERIFICATION_LOCKED);
        }
    }

    public void recordFailure(String email) {
        Instant now = clock.instant();
        failureRecords.compute(email, (k, ex) -> {
            int newCount = (ex == null) ? 1 : ex.count() + 1;
            Instant lockedUntil = newCount >= MAX_FAILURES ? now.plus(LOCK_DURATION) : null;
            return new FailureRecord(newCount, lockedUntil, now);
        });
    }

    public void resetFailures(String email) { failureRecords.remove(email); }

    @Scheduled(fixedRate = 300_000)
    public void purgeExpired() { /* 만료 항목 정리 */ }
}
```

> **다중 인스턴스 운영 시**: `ConcurrentHashMap` → Redis (`SETEX`, `INCR`)로 교체.

### 3.11 JWT Provider

```java
@Component
public class JwtProvider {
    private final SecretKey key;
    private final long accessExpiration;
    private final long refreshExpiration;

    public JwtProvider(@Value("${app.jwt.secret}") String secret,
                       @Value("${app.jwt.access-expiration}")  long accessExp,
                       @Value("${app.jwt.refresh-expiration}") long refreshExp) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessExpiration  = accessExp;
        this.refreshExpiration = refreshExp;
    }

    public String generateAccessToken(Long userId, String email, UserRole role) {
        Date now = new Date();
        return Jwts.builder()
            .subject(email)
            .claim("userId", userId)
            .claim("role", role.name())
            .claim("type", "access")
            .issuedAt(now)
            .expiration(new Date(now.getTime() + accessExpiration))
            .signWith(key).compact();
    }

    public String generateRefreshToken(Long userId) {
        Date now = new Date();
        return Jwts.builder()
            .subject(String.valueOf(userId))
            .claim("type", "refresh")
            .issuedAt(now)
            .expiration(new Date(now.getTime() + refreshExpiration))
            .signWith(key).compact();
    }

    public Claims validateAndParse(String token, String expectedType) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
            if (!expectedType.equals(claims.get("type", String.class))) {
                throw new ApiException(ErrorCode.INVALID_TOKEN);
            }
            return claims;
        } catch (ExpiredJwtException e) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED);
        } catch (JwtException | IllegalArgumentException e) {
            throw new ApiException(ErrorCode.INVALID_TOKEN);
        }
    }

    public long getRefreshExpirationMs() { return refreshExpiration; }
}
```

### 3.12 AuthService — 핵심 비즈니스 로직

```java
@Service
public class AuthService {
    private static final long EMAIL_VERIFY_TTL_MINUTES = 5;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final EmailVerificationGuardService guard;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;
    private final boolean devBypass;

    // 생성자 주입 (생략)

    /** 1. 회원가입 — email_verified=false로 저장 */
    @Transactional
    public UserResponse signup(SignupRequest request) {
        String email = normalize(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new ApiException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }
        User user = User.builder()
            .email(email)
            .name(request.name())
            .passwordHash(passwordEncoder.encode(request.password()))
            .role(UserRole.MEMBER)
            .emailVerified(false)
            .build();
        userRepository.save(user);
        return UserResponse.from(user);
    }

    /** 2. 인증 코드 발송 */
    @Transactional
    public void sendVerificationCode(SendVerificationRequest request) {
        String email = normalize(request.email());
        guard.checkResendRateLimit(email);                  // 30초 쿨다운

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return;                           // Email enumeration 방지

        String code = generateCode();
        user.setVerificationCode(code);
        user.setVerificationCodeExpiresAt(
            clock.instant().plusSeconds(EMAIL_VERIFY_TTL_MINUTES * 60));
        userRepository.save(user);

        // 트랜잭션 커밋 후 비동기 발송
        eventPublisher.publishEvent(
            new VerificationCodeGeneratedEvent(email, code, EMAIL_VERIFY_TTL_MINUTES));
    }

    /** 3. 코드 검증 + 자동 로그인 */
    @Transactional
    public LoginResult verifyEmail(VerifyEmailRequest request) {
        String email = normalize(request.email());
        guard.checkLocked(email);                           // 잠금 확인

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException(ErrorCode.INVALID_VERIFICATION_CODE));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            guard.resetFailures(email);
            return issueTokens(user);                       // 이미 인증됨 → 토큰 재발급
        }

        boolean codeValid;
        if (devBypass && "000000".equals(request.code())) {
            codeValid = true;                               // 로컬 개발 우회
        } else {
            codeValid = request.code().equals(user.getVerificationCode())
                    && user.getVerificationCodeExpiresAt() != null
                    && clock.instant().isBefore(user.getVerificationCodeExpiresAt());
        }

        if (!codeValid) {
            guard.recordFailure(email);                     // 실패 카운트
            throw new ApiException(ErrorCode.INVALID_VERIFICATION_CODE);
        }

        guard.resetFailures(email);
        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiresAt(null);
        return issueTokens(user);
    }

    /** 4. 로그인 (이메일 미인증 시 차단) */
    @Transactional
    public LoginResult login(LoginRequest request) {
        String email = normalize(request.email());
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException(ErrorCode.ACCOUNT_NOT_FOUND));

        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
        }
        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
        }
        return issueTokens(user);
    }

    /** 5. Refresh Token으로 Access Token 재발급 */
    @Transactional(readOnly = true)
    public TokenResponse refreshAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ApiException(ErrorCode.NO_SESSION, "로그인 세션이 없습니다.");
        }
        var claims = jwtProvider.validateAndParse(refreshToken, "refresh");
        Long userId = Long.parseLong(claims.getSubject());
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(ErrorCode.USER_NOT_FOUND));

        if (user.getRefreshToken() == null) {
            throw new ApiException(ErrorCode.NO_SESSION, "로그인 세션이 없습니다.");
        }
        if (clock.instant().isAfter(user.getRefreshTokenExpiresAt())) {
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "세션이 만료되었습니다.");
        }
        if (!refreshToken.equals(user.getRefreshToken())) {
            // 다른 디바이스 로그인 등으로 서버 측 토큰이 갱신됨
            throw new ApiException(ErrorCode.TOKEN_EXPIRED, "다른 기기에서 로그인되어 세션이 갱신되었습니다.");
        }
        return new TokenResponse(
            jwtProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole()));
    }

    /** 6. 로그아웃 — 서버 측 refresh token 제거 */
    @Transactional
    public void logout(Long userId, String refreshToken) {
        userRepository.findById(userId).ifPresent(u -> {
            u.setRefreshToken(null);
            u.setRefreshTokenExpiresAt(null);
        });
    }

    private LoginResult issueTokens(User user) {
        String accessToken  = jwtProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole());
        String refreshToken = jwtProvider.generateRefreshToken(user.getId());
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiresAt(clock.instant().plusMillis(jwtProvider.getRefreshExpirationMs()));
        return new LoginResult(accessToken, refreshToken, new AuthResponse(accessToken, UserResponse.from(user)));
    }

    private String generateCode() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
    }

    private String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
```

### 3.13 AuthController — REST 엔드포인트

```java
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private static final String REFRESH_COOKIE = "refreshToken";
    private final AuthService authService;

    @Value("${app.oauth2.cookie-secure:true}")
    private boolean cookieSecure;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@Valid @RequestBody SignupRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(authService.signup(req)));
    }

    @PostMapping("/verify-email/send")
    public ResponseEntity<ApiResponse<Void>> sendVerificationCode(
            @Valid @RequestBody SendVerificationRequest req) {
        authService.sendVerificationCode(req);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest req, HttpServletResponse res) {
        LoginResult r = authService.verifyEmail(req);
        setRefreshCookie(res, r.refreshToken());
        return ResponseEntity.ok(ApiResponse.ok(r.authResponse()));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest req, HttpServletResponse res) {
        LoginResult r = authService.login(req);
        setRefreshCookie(res, r.refreshToken());
        return ResponseEntity.ok(ApiResponse.ok(r.authResponse()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(HttpServletRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(
            authService.refreshAccessToken(extractCookie(req))));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal AuthenticatedUser user,
            HttpServletRequest req, HttpServletResponse res) {
        if (user != null) authService.logout(user.userId(), extractCookie(req));
        clearRefreshCookie(res);
        return ResponseEntity.ok(ApiResponse.ok());
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(
            @AuthenticationPrincipal AuthenticatedUser user) {
        if (user == null) throw new ApiException(ErrorCode.UNAUTHORIZED);
        return ResponseEntity.ok(ApiResponse.ok(authService.getCurrentUser(user.userId())));
    }

    private void setRefreshCookie(HttpServletResponse res, String token) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, token)
            .httpOnly(true).secure(cookieSecure)
            .path("/api/v1/auth")
            .maxAge(Duration.ofDays(7))
            .sameSite("Strict").build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse res) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, "")
            .httpOnly(true).secure(cookieSecure)
            .path("/api/v1/auth").maxAge(0).sameSite("Strict").build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractCookie(HttpServletRequest req) {
        if (req.getCookies() == null) return null;
        return Arrays.stream(req.getCookies())
            .filter(c -> REFRESH_COOKIE.equals(c.getName()))
            .map(Cookie::getValue).findFirst().orElse(null);
    }
}
```

### 3.14 ErrorCode (Enum)

```java
public enum ErrorCode {
    EMAIL_ALREADY_EXISTS    (HttpStatus.CONFLICT,         "이미 사용 중인 이메일입니다."),
    INVALID_CREDENTIALS     (HttpStatus.UNAUTHORIZED,     "이메일 또는 비밀번호가 올바르지 않습니다."),
    ACCOUNT_NOT_FOUND       (HttpStatus.UNAUTHORIZED,     "회원 정보가 존재하지 않습니다."),
    EMAIL_NOT_VERIFIED      (HttpStatus.FORBIDDEN,        "이메일 인증이 완료되지 않았습니다."),
    INVALID_VERIFICATION_CODE(HttpStatus.BAD_REQUEST,     "인증 코드가 유효하지 않습니다."),
    TOKEN_EXPIRED           (HttpStatus.UNAUTHORIZED,     "토큰이 만료되었습니다."),
    NO_SESSION              (HttpStatus.UNAUTHORIZED,     "로그인 세션이 없습니다."),
    VERIFICATION_RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "인증 코드 요청이 너무 빠릅니다. 30초 후 다시 시도해주세요."),
    VERIFICATION_LOCKED     (HttpStatus.TOO_MANY_REQUESTS, "인증 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.");
    // ...
}
```

---

## 4. Frontend 구현 (Next.js + Zustand)

### 4.1 API Client (refresh 자동 재시도 포함)

```typescript
// src/lib/api/client.ts (개념 발췌)
export class ApiError extends Error {
  constructor(public status: number, public code: string, msg: string) { super(msg); }
}

let getAccessToken: () => string | null = () => null;
let setAuthState: (s: any) => void = () => {};

export function configureAuth(getter: () => string | null, setter: (s: any) => void) {
  getAccessToken = getter;
  setAuthState   = setter;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1${path}`;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res = await fetch(url, { ...init, headers, credentials: "include" });

  // Access Token 만료 → refresh 1회 시도 후 재요청
  if (res.status === 401 && path !== "/auth/refresh" && path !== "/auth/login") {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
      method: "POST", credentials: "include",
    });
    if (r.ok) {
      const { data } = await r.json();
      setAuthState({ accessToken: data.accessToken });
      headers.set("Authorization", `Bearer ${data.accessToken}`);
      res = await fetch(url, { ...init, headers, credentials: "include" });
    }
  }

  const json = await res.json();
  if (!res.ok) throw new ApiError(res.status, json.code, json.message);
  return json.data as T;
}
```

### 4.2 Zustand Auth Store

```typescript
// src/stores/auth-store.ts (핵심 발췌)
interface AuthState {
  user: User | null;
  accessToken: string | null;
  signup: (email: string, password: string, name: string) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verify: (email: string, code: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  user: null,
  accessToken: null,

  signup: async (email, password, name) => {
    const user = await api<User>("/auth/signup", {
      method: "POST", body: JSON.stringify({ email, password, name }),
    });
    set({ user, accessToken: null });
  },

  sendVerificationCode: async (email) => {
    await api<void>("/auth/verify-email/send", {
      method: "POST", body: JSON.stringify({ email }),
    });
  },

  verify: async (email, code) => {
    const data = await api<{ accessToken: string; user: User }>("/auth/verify-email", {
      method: "POST", body: JSON.stringify({ email, code }),
    });
    set({ user: data.user, accessToken: data.accessToken });
  },

  login: async (email, password) => {
    const data = await api<{ accessToken: string; user: User }>("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    });
    set({ user: data.user, accessToken: data.accessToken });
  },

  logout: async () => {
    await api<void>("/auth/logout", { method: "POST" });
    set({ user: null, accessToken: null });
  },

  fetchMe: async () => {
    if (!useAuthStore.getState().accessToken) {
      const { accessToken } = await api<{ accessToken: string }>("/auth/refresh", { method: "POST" });
      set({ accessToken });
    }
    const user = await api<User>("/auth/me");
    set({ user });
  },
}), {
  name: "auth-storage",
  partialize: (s) => ({ user: s.user }),     // 토큰은 메모리에만, refresh는 HttpOnly 쿠키
}));
```

### 4.3 Signup Page (요지)

```tsx
// src/app/(auth)/signup/page.tsx
"use client";
export default function SignupPage() {
  const router = useRouter();
  const { signup, sendVerificationCode } = useAuthStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!runValidations()) return;
    try {
      await signup(email, password, email.split("@")[0]);
      await sendVerificationCode(email);
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "EMAIL_ALREADY_EXISTS") {
        setError("이미 사용 중인 이메일입니다.");
      }
    }
  }
  // ... form JSX
}
```

### 4.4 Verify Page (요지)

```tsx
// src/app/(auth)/verify/page.tsx
"use client";
export default function VerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const { verify, sendVerificationCode } = useAuthStore();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0); // 30초 카운터

  async function handleVerify() {
    try {
      await verify(email, code);
      router.push("/");                          // 자동 로그인 후 홈으로
    } catch (e) {
      // INVALID_VERIFICATION_CODE / VERIFICATION_LOCKED 처리
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    await sendVerificationCode(email);
    setCooldown(30);
  }
  // ... 6자리 코드 입력 UI + 재발송 버튼 (쿨다운 표시)
}
```

---

## 5. 전체 시퀀스

```
[사용자]                  [Frontend]                 [Backend]                   [DB]                  [Resend]
   │                          │                          │                         │                      │
   │ 가입 폼 제출              │                          │                         │                      │
   ├─────────────────────────►│                          │                         │                      │
   │                          │ POST /auth/signup        │                         │                      │
   │                          ├─────────────────────────►│                         │                      │
   │                          │                          │ INSERT users            │                      │
   │                          │                          │ (email_verified=false)  │                      │
   │                          │                          ├────────────────────────►│                      │
   │                          │ 201 Created (user)       │                         │                      │
   │                          │◄─────────────────────────┤                         │                      │
   │                          │                          │                         │                      │
   │                          │ POST /verify-email/send  │                         │                      │
   │                          ├─────────────────────────►│                         │                      │
   │                          │                          │ checkResendRateLimit    │                      │
   │                          │                          │ generateCode()          │                      │
   │                          │                          │ UPDATE users            │                      │
   │                          │                          │ (verification_code)     │                      │
   │                          │                          ├────────────────────────►│                      │
   │                          │                          │ COMMIT                  │                      │
   │                          │                          │ ───┐                    │                      │
   │                          │                          │    │ AFTER_COMMIT       │                      │
   │                          │                          │    │ @Async             │                      │
   │                          │                          │    └─► POST /emails ────┼─────────────────────►│
   │                          │ 200 OK                   │                         │                      │
   │                          │◄─────────────────────────┤                         │                      │
   │                          │                          │                         │                      │
   │ /verify로 이동            │                          │                         │                      │
   │◄─────────────────────────┤                          │                         │                      │
   │                          │                          │                         │                      │
   │ 메일에서 6자리 코드 확인   │                          │                         │                      │
   │ ◄────────────────────────┼──────────────────────────┼─────────────────────────┼──────────────────────┤
   │ 코드 입력 후 제출          │                          │                         │                      │
   ├─────────────────────────►│                          │                         │                      │
   │                          │ POST /verify-email       │                         │                      │
   │                          ├─────────────────────────►│                         │                      │
   │                          │                          │ checkLocked             │                      │
   │                          │                          │ verify code             │                      │
   │                          │                          │ UPDATE users            │                      │
   │                          │                          │ (email_verified=true)   │                      │
   │                          │                          │ generate access+refresh │                      │
   │                          │ 200 OK                   │                         │                      │
   │                          │ Set-Cookie: refreshToken │                         │                      │
   │                          │ body: { accessToken, user}                         │                      │
   │                          │◄─────────────────────────┤                         │                      │
   │ 자동 로그인 → 홈으로       │                          │                         │                      │
   │◄─────────────────────────┤                          │                         │                      │
```

이후 일반 로그인은 `POST /auth/login` 한 번으로 동일하게 토큰 발급. Access Token 만료 시 `POST /auth/refresh`가 HttpOnly 쿠키 기반으로 자동 재발급한다.

---

## 6. 다른 프로젝트에 적용하는 순서 (체크리스트)

### Step 1 — Resend 설정
- [ ] Resend 계정 가입 + API 키 발급
- [ ] 발신 도메인 등록 + SPF/DKIM/DMARC DNS 추가 → Verify ✅
- [ ] `APP_RESEND_API_KEY`, `APP_EMAIL_FROM_ADDRESS` 환경변수 설정

### Step 2 — Backend 베이스 설정
- [ ] `build.gradle`에 jjwt, validation, JPA, Flyway, PostgreSQL 의존성 추가
- [ ] `application.yml`에 jwt/email/datasource 섹션 작성
- [ ] `JWT_SECRET` 환경변수 설정 (256bit 이상 랜덤)
- [ ] `@EnableAsync`, `@EnableScheduling` 적용한 `AsyncConfig` 추가
- [ ] `Clock` Bean 등록 (테스트 용이성)

### Step 3 — DB 마이그레이션
- [ ] `V1__create_users_table.sql` 작성 (email, password_hash, email_verified, role)
- [ ] `V2__add_refresh_token_and_verification_columns.sql`로 verification/refresh 컬럼 추가
- [ ] `./gradlew flywayMigrate` 실행 → `flywayInfo`로 확인

### Step 4 — Backend 코드 이식
- [ ] `User` 엔티티 작성 (verification_code, refresh_token 필드 포함)
- [ ] `UserRepository extends JpaRepository<User, Long>` (`findByEmail`, `existsByEmail`)
- [ ] DTO records 6개: SignupRequest, LoginRequest, SendVerificationRequest, VerifyEmailRequest, AuthResponse, TokenResponse, LoginResult
- [ ] `StrongPassword` 어노테이션 + Validator
- [ ] `JwtProvider` 컴포넌트
- [ ] `JwtAuthenticationFilter` + `SecurityConfig`에 등록
- [ ] `RestClientConfig#resendRestClient` Bean
- [ ] `ResendEmailClient` 서비스
- [ ] `VerificationCodeGeneratedEvent` + `VerificationCodeEventListener` (`@TransactionalEventListener` AFTER_COMMIT)
- [ ] `EmailVerificationGuardService` (rate limit + lock)
- [ ] `AuthService` (signup / sendVerificationCode / verifyEmail / login / refresh / logout)
- [ ] `AuthController` 6 endpoints + 쿠키 헬퍼
- [ ] `ErrorCode` enum + `@RestControllerAdvice` 글로벌 핸들러

### Step 5 — Frontend 이식
- [ ] `src/lib/api/client.ts`에 401 → refresh 자동 재시도 로직
- [ ] `src/stores/auth-store.ts` Zustand 스토어 (signup/verify/login/logout/fetchMe)
- [ ] `(auth)/signup/page.tsx` — 이메일 + 강력 비밀번호 폼 → signup → sendVerificationCode → /verify로 라우팅
- [ ] `(auth)/verify/page.tsx` — 6자리 코드 입력 + 30초 재발송 쿨다운 + 자동 로그인
- [ ] `(auth)/login/page.tsx` — 일반 로그인. `EMAIL_NOT_VERIFIED` 에러 시 인증 페이지로 안내
- [ ] `app/layout.tsx` 또는 SessionProvider에서 `useAuthStore.getState().fetchMe()` 호출

### Step 6 — 동작 검증
- [ ] 회원가입 → 메일 수신 (스팸함 포함 확인)
- [ ] 코드 입력 → 자동 로그인 → 홈 진입
- [ ] 만료된 코드 입력 시 `INVALID_VERIFICATION_CODE` 메시지
- [ ] 5회 연속 실패 시 `VERIFICATION_LOCKED` (15분 잠금)
- [ ] 재발송 30초 이내 호출 시 `VERIFICATION_RATE_LIMITED`
- [ ] 미인증 상태 로그인 시도 시 `EMAIL_NOT_VERIFIED` (403)
- [ ] Access Token 만료 후 API 호출 → refresh 후 자동 재시도 성공
- [ ] 로그아웃 후 refresh API 호출 → `NO_SESSION`

### Step 7 — 운영 강화 (선택)
- [ ] `EmailVerificationGuardService`의 ConcurrentHashMap → Redis 교체 (다중 인스턴스 운영 시 필수)
- [ ] Resend Webhook으로 bounce/complaint 수신 → 사용자 차단 처리
- [ ] HTML 메일 템플릿을 Thymeleaf 등으로 외부화
- [ ] 인증 실패 알림 (Slack/Sentry)
- [ ] CSRF 토큰 도입 (refresh 엔드포인트가 쿠키 기반이라면 SameSite=Strict로 충분)
- [ ] HTTPS 강제 + `cookie-secure: true`로 변경

---

## 7. 자주 마주치는 함정

| 증상 | 원인 | 해결 |
|---|---|---|
| 메일이 스팸함으로 감 | SPF/DKIM 미설정 | DNS 레코드 검증 + DMARC `p=none → quarantine` 단계적 적용 |
| `403 Forbidden` (Resend 응답) | API 키 권한 부족 / 발신 도메인 미검증 | Full Access 키 + Verified 도메인으로만 발송 |
| DB 커넥션 풀 고갈 | 트랜잭션 안에서 메일 발송 | `@TransactionalEventListener(AFTER_COMMIT) + @Async` 패턴 적용 |
| 인증 코드가 매번 만료됨 | 서버 시간 불일치 | `Clock` Bean으로 통일 + NTP 동기화 |
| 다중 인스턴스에서 잠금 우회 | 메모리 기반 Guard | Redis로 교체 |
| Refresh 쿠키가 안 실림 | CORS `credentials: include` 누락, `SameSite=None` 미설정 | 동일 도메인이면 `Strict`, 크로스 도메인이면 `None + Secure` |
| `EMAIL_NOT_VERIFIED` 후 무한 루프 | 프론트가 401 → refresh → 401 반복 | 로그인 응답의 403도 별도 분기, 인증 페이지로 라우팅 |

---

## 8. 부록 — 참고 파일 매핑 (Run-AI 프로젝트)

| 역할 | 경로 |
|---|---|
| Resend HTTP 클라이언트 | `backend/src/main/java/kr/runai/api/auth/service/ResendEmailClient.java` |
| Resend RestClient Bean | `backend/src/main/java/kr/runai/api/config/RestClientConfig.java` |
| 비동기 메일 디스패처 | `backend/src/main/java/kr/runai/api/auth/event/VerificationCodeEventListener.java` |
| 인증 이벤트 | `backend/src/main/java/kr/runai/api/auth/event/VerificationCodeGeneratedEvent.java` |
| 재발송 쿨다운 / 실패 잠금 | `backend/src/main/java/kr/runai/api/auth/service/EmailVerificationGuardService.java` |
| 핵심 인증 서비스 | `backend/src/main/java/kr/runai/api/auth/service/AuthService.java` |
| REST 엔드포인트 | `backend/src/main/java/kr/runai/api/auth/controller/AuthController.java` |
| JWT 발급/검증 | `backend/src/main/java/kr/runai/api/auth/security/JwtProvider.java` |
| JWT 인증 필터 | `backend/src/main/java/kr/runai/api/auth/security/JwtAuthenticationFilter.java` |
| 비밀번호 검증 | `backend/src/main/java/kr/runai/api/auth/validation/PasswordStrengthValidator.java` |
| Users 엔티티 | `backend/src/main/java/kr/runai/api/user/domain/User.java` |
| Flyway: 사용자 | `backend/src/main/resources/db/migration/V1__create_users_table.sql` |
| Flyway: 토큰/코드 | `backend/src/main/resources/db/migration/V18__add_refresh_token_and_verification_columns.sql` |
| 프론트 인증 스토어 | `frontend/src/stores/auth-store.ts` |
| 회원가입 페이지 | `frontend/src/app/(auth)/signup/page.tsx` |
| 인증 코드 입력 페이지 | `frontend/src/app/(auth)/verify/page.tsx` |
| 로그인 페이지 | `frontend/src/app/(auth)/login/page.tsx` |

---

**문서 버전**: v1.0 (2026-04-25)
**기반 코드**: Run-AI feature/mobile 브랜치
