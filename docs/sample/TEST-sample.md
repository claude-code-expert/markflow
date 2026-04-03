# MarkFlow 에디터 기능 테스트

이 문서는 22개 툴바 액션과 중첩 구조를 종합 테스트합니다.

## 1. 헤딩 (H1~H6)

# 헤딩 1
## 헤딩 2
### 헤딩 3
#### 헤딩 4
##### 헤딩 5
###### 헤딩 6

---

## 2. 인라인 서식

**볼드 텍스트입니다.**

*이텔릭 텍스트입니다.*

~~취소선 텍스트입니다.~~

`인라인 코드입니다.`

**볼드 안에 *이텔릭* 중첩**

***볼드+이텔릭 동시 적용***

**볼드 안에 `코드` 포함**

*이텔릭 안에 ~~취소선~~ 포함*

~~취소선 안에 **볼드** 포함~~

이것은 일반 텍스트 중간에 **볼드**, *이텔릭*, ~~취소선~~, `코드`가 섞인 문장입니다.

---

## 3. 리스트

### 3.1 순서 없는 리스트 (Bullet)

- 첫 번째 항목
- 두 번째 항목
- 세 번째 항목

### 3.2 중첩 리스트

- 과일
  - 사과
  - 바나나
    - 바나나 우유
    - 바나나 칩
  - 포도
- 채소
  - 당근
  - 브로콜리

### 3.3 순서 있는 리스트 (Number)

1. 첫 번째
2. 두 번째
3. 세 번째

### 3.4 중첩 순서 리스트

1. 프로젝트 설정
   1. 의존성 설치
   2. 환경 변수 설정
   3. DB 마이그레이션
2. 개발
   1. 백엔드 API
   2. 프론트엔드 UI
3. 배포

### 3.5 혼합 리스트

1. 첫 번째 단계
   - 세부 사항 A
   - 세부 사항 B
2. 두 번째 단계
   - 세부 사항 C
     1. 하위 순서 1
     2. 하위 순서 2
   - 세부 사항 D

### 3.6 체크리스트

- [ ] 미완료 항목
- [x] 완료된 항목
- [ ] **볼드 체크리스트**
- [x] ~~완료 후 취소선~~
- [ ] `코드 포함` 체크리스트

---

## 4. 인용문

> 단일 인용문입니다.

> 여러 줄 인용문입니다.
> 두 번째 줄입니다.
> 세 번째 줄입니다.

> 중첩 인용문:
> > 안쪽 인용문입니다.
> > > 더 안쪽 인용문입니다.

> **볼드 인용문**과 *이텔릭 인용문*이 섞인 경우입니다.
>
> `코드`도 인용문 안에 들어갑니다.
>
> - 인용문 안의 리스트
> - 두 번째 항목

---

## 5. 코드

### 5.1 인라인 코드

변수 `count`의 값은 `42`입니다. `npm install` 명령어를 실행하세요.

### 5.2 코드 블록 (언어 없음)

```
plain text code block
no syntax highlighting
```

### 5.3 JavaScript

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(`Result: ${result}`);
```

### 5.4 TypeScript

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('User not found');
  return response.json();
}
```

### 5.5 SQL

```sql
SELECT u.name, COUNT(d.id) AS doc_count
FROM users u
LEFT JOIN documents d ON d.author_id = u.id
WHERE u.email_verified = true
GROUP BY u.name
ORDER BY doc_count DESC
LIMIT 10;
```

### 5.6 CSS

```css
.mf-preview {
  font-family: var(--mf-font-body);
  line-height: var(--mf-line-height);
  max-width: var(--mf-max-width);
  color: var(--mf-text);
}
```

### 5.7 Bash

```bash
#!/bin/bash
pnpm install
pnpm --filter @markflow/editor build
pnpm dev
```

---

## 6. 수평선

위 텍스트

---

아래 텍스트

***

다른 스타일의 수평선

___

세 번째 스타일

---

## 7. 링크

[MarkFlow 홈페이지](https://markflow.dev)

[GitHub 저장소](https://github.com/markflow/editor "MarkFlow Editor")

자동 링크: https://example.com

이메일: user@example.com

문장 안의 [링크 텍스트](https://example.com)가 자연스럽게 들어갑니다.

---

## 8. 이미지

![MarkFlow 로고](https://via.placeholder.com/600x200/1A56DB/FFFFFF?text=MarkFlow+Editor)

![작은 아이콘](https://via.placeholder.com/32x32/16A34A/FFFFFF?text=OK)

텍스트 사이에 ![인라인 이미지](https://via.placeholder.com/80x20/D97706/FFFFFF?text=badge) 배지를 넣을 수 있습니다.

---

## 9. 테이블

### 9.1 기본 테이블

| 기능 | 상태 | 비고 |
| --- | --- | --- |
| 헤딩 | ✅ 완료 | H1~H6 |
| 볼드 | ✅ 완료 | **bold** |
| 이텔릭 | ✅ 완료 | *italic* |
| 취소선 | ✅ 완료 | ~~strike~~ |

### 9.2 정렬 테이블

| 왼쪽 정렬 | 가운데 정렬 | 오른쪽 정렬 |
| :--- | :---: | ---: |
| Left | Center | Right |
| 데이터 1 | 데이터 2 | 데이터 3 |
| 긴 텍스트 왼쪽 | 중앙 | 10,000 |

### 9.3 테이블 안 서식

| 서식 | 예시 |
| --- | --- |
| 볼드 | **강조** |
| 이텔릭 | *기울임* |
| 코드 | `console.log()` |
| 링크 | [링크](https://example.com) |
| 취소선 | ~~삭제~~ |

---

## 10. 수학 수식

### 10.1 인라인 수식

피타고라스 정리: $a^2 + b^2 = c^2$

오일러 공식: $e^{i\pi} + 1 = 0$

이차방정식의 근: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

### 10.2 블록 수식

$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix}
=
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}
$$

---

## 11. 복합 중첩 테스트

### 인용문 안 코드 블록

> 설정 파일을 확인하세요:
>
> ```json
> {
>   "name": "markflow",
>   "version": "0.1.0"
> }
> ```

### 리스트 안 코드와 서식

1. **설치 방법**
   ```bash
   pnpm install @markflow/editor
   ```
2. *사용법*
   ```typescript
   import { MarkdownEditor } from '@markflow/editor';
   ```
3. ~~이전 방식~~ (deprecated)

### 리스트 안 인용문

- 첫 번째 항목
  > 이것은 리스트 안의 인용문입니다.
- 두 번째 항목
  > 또 다른 인용문

### 테이블 + 수식

| 공식 | 수식 | 설명 |
| --- | --- | --- |
| 넓이 | $S = \pi r^2$ | 원의 넓이 |
| 둘레 | $C = 2\pi r$ | 원의 둘레 |
| 체적 | $V = \frac{4}{3}\pi r^3$ | 구의 체적 |

### 체크리스트 + 서식 복합

- [x] **Phase 1**: 에디터 패키지 ~~완료~~
- [x] **Phase 2**: KMS 백엔드 (`Fastify` + `Drizzle`)
- [ ] **Phase 3**: 프론트엔드 `Next.js` 16
- [ ] **Phase 4**: [배포](https://vercel.com) 및 *모니터링*

---

## 12. 특수 케이스

### 긴 텍스트 줄바꿈

이것은 매우 긴 문장입니다. 마크다운 에디터에서 긴 텍스트가 올바르게 줄바꿈되는지 확인합니다. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### 이스케이프 문자

\*별표 이스케이프\*

\`백틱 이스케이프\`

\~\~취소선 이스케이프\~\~

\[링크 이스케이프\](url)

### HTML 엔티티

&lt;script&gt;alert('XSS')&lt;/script&gt;

&amp; &lt; &gt; &quot; &#39;

### 빈 요소

-

>

```
```

---

*문서 끝 — 모든 22개 액션 + 중첩 구조 테스트 완료*
