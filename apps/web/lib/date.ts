/**
 * 공통 날짜 포맷터 — 항상 Asia/Seoul(KST) 기준으로 렌더링.
 *
 * 배경:
 * - DB 는 TIMESTAMPTZ (UTC) 로 저장 → API 는 ISO 문자열 (예: "2026-04-16T08:00:00.000Z") 반환.
 * - `new Date(...).toLocaleDateString('ko-KR', ...)` 는 브라우저/서버 로컬 타임존을 사용하므로
 *   배포 환경(서버 TZ=UTC) 이나 해외 사용자 브라우저에서는 KST 가 아닌 시간이 찍힌다.
 * - 이 모듈의 포맷터는 모두 `timeZone: 'Asia/Seoul'` 를 강제해, 어떤 환경이든 일관되게 KST 를 표시한다.
 */

const SEOUL_TZ = 'Asia/Seoul';
const LOCALE = 'ko-KR';

function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * YYYY. M. D. 형식 (예: "2026. 4. 16.") — 기본 날짜만.
 */
export function formatKstDate(value: string | number | Date): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: SEOUL_TZ,
  });
}

/**
 * YYYY. M. D. HH:MM 형식 — 날짜 + 시분.
 */
export function formatKstDateTime(value: string | number | Date): string {
  return toDate(value).toLocaleString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SEOUL_TZ,
  });
}

/**
 * 호출처에서 옵션 커스터마이징이 필요한 경우용.
 * timeZone 은 항상 'Asia/Seoul' 로 덮어쓴다.
 */
export function formatKstDateWithOptions(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return toDate(value).toLocaleDateString(LOCALE, {
    ...options,
    timeZone: SEOUL_TZ,
  });
}

/**
 * 상대 시간 ("방금 전", "N분 전", "N시간 전", "N일 전")
 * fallbackAfterDays 이상 지난 경우 formatKstDate 로 폴백.
 * @param fallbackAfterDays 기본 7일
 */
export function formatKstRelative(
  value: string | number | Date,
  fallbackAfterDays = 7,
): string {
  const date = toDate(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < fallbackAfterDays) return `${diffDay}일 전`;
  return formatKstDate(date);
}

/**
 * 30일 폴백 버전 (워크스페이스/댓글 등에서 사용).
 */
export function formatKstRelativeLong(value: string | number | Date): string {
  return formatKstRelative(value, 30);
}
