# UI 패턴 메모

> 개발하면서 정착된 UI 패턴과 컴포넌트 사용 규칙을 기록합니다.

---

## 토스트 & 확인 다이얼로그 패턴

### 규칙
- `alert()` 절대 사용 금지 → 반드시 토스트 컴포넌트 사용
- 단순 안내 메시지 → `Toast`
- 예/아니요 확인이 필요한 경우 → `ConfirmToast` → 결과 → `Toast`

### 플로우 예시 (알림톡 버튼)
```
버튼 클릭
  └─ ConfirmToast (상호명 + "~하시겠어요?" + 예/아니요)
        ├─ 예 → Toast ("완료 메시지")
        └─ 아니요 → Toast ("취소 메시지")
```

### 컴포넌트 위치
| 컴포넌트 | 경로 | 용도 |
|---|---|---|
| `Toast` | `src/components/Toast.tsx` | 단순 안내, 자동 닫힘 (1.2초) |
| `ConfirmToast` | `src/components/ConfirmToast.tsx` | 예/아니요 확인 다이얼로그 |

### 상태 관리 패턴
```tsx
type Step = "idle" | "confirm" | "result";
const [step, setStep] = useState<Step>("idle");
const [resultMsg, setResultMsg] = useState("");
```

---

## 디자인 토큰

| 항목 | 값 |
|---|---|
| 포인트 컬러 | `#0e299c` |
| 기본 텍스트 | `#333333` |
| 배경 | `#F0F4FA` |
| 카카오 노란색 | `#FEE500` |
| 카카오 텍스트 | `#3C1E1E` |

---

## 컴포넌트 규칙

- 액션이 있는 버튼 → 반드시 `"use client"` 클라이언트 컴포넌트로 분리
- 서버 컴포넌트에서 데이터 fetch → props로 클라이언트 컴포넌트에 전달
- 검색/필터 → 디바운스 300ms 적용
