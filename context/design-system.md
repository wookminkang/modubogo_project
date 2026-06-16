# 디자인 시스템 가이드 (Seed Design)

> 이 프로젝트는 당근(Karrot)의 **Seed Design** 시스템을 사용합니다.
> UI를 만들 때는 아래 우선순위와 규칙을 **반드시** 따릅니다.

## 설치 현황

| 항목 | 패키지 / 위치 | 비고 |
|------|--------------|------|
| Seed React 컴포넌트 | `@seed-design/react` | 원본 컴포넌트 라이브러리 |
| Seed CSS | `@seed-design/css` | `layout.tsx`에서 `@seed-design/css/all.css` import |
| Seed Tailwind 테마 | `@seed-design/tailwind4-theme` | `globals.css`에서 import, 토큰 제공 |
| **로컬 래퍼 컴포넌트** | `src/seed-design/ui/*` | `seed-design/ui/*` 별칭으로 import |
| 아이콘 | `lucide-react` | **프로젝트 기본 아이콘** |

---

## 핵심 원칙 (우선순위)

UI 요소가 필요할 때 아래 순서대로 검토합니다. **위 단계로 해결되면 아래 단계로 내려가지 않습니다.**

### 1순위 — 로컬 Seed 래퍼 컴포넌트 (`seed-design/ui/*`)

가장 먼저 `src/seed-design/ui/`에 있는 컴포넌트를 사용합니다. 프로젝트에 맞게 한 번 감싼 버전이라 **이게 1순위**입니다.

```tsx
import { ActionButton } from "seed-design/ui/action-button";
import { Badge } from "seed-design/ui/badge";
import { Text } from "seed-design/ui/text";
```

현재 사용 가능한 로컬 컴포넌트:

| 컴포넌트 | import 경로 |
|----------|------------|
| ActionButton | `seed-design/ui/action-button` |
| Badge | `seed-design/ui/badge` |
| BottomSheet | `seed-design/ui/bottom-sheet` |
| ContentPlaceholder | `seed-design/ui/content-placeholder` |
| List / ListLinkItem / ListDivider | `seed-design/ui/list` |
| ListHeader | `seed-design/ui/list-header` |
| LoadingIndicator | `seed-design/ui/loading-indicator` |
| ProgressCircle | `seed-design/ui/progress-circle` |
| Tabs (TabsRoot/List/Trigger/Content) | `seed-design/ui/tabs` |
| TextField / TextFieldInput | `seed-design/ui/text-field` |
| Text | `seed-design/ui/text` |

### 2순위 — Seed React 원본 컴포넌트 (`@seed-design/react`)

로컬 래퍼에는 없지만 Seed가 제공하는 컴포넌트(예: Avatar, Checkbox, Dialog, Switch, Slider, Radio, SegmentedControl, Snackbar, Popover 등)는 `@seed-design/react`에서 직접 가져옵니다.

```tsx
import { Switch, Checkbox } from "@seed-design/react";
```

> 가능하면 자주 쓰는 컴포넌트는 `src/seed-design/ui/`에 래퍼를 추가해 1순위로 승격하는 것을 권장합니다.

### 3순위 — Tailwind 직접 작성 (마지막 수단)

**Seed에 해당 컴포넌트가 존재하지 않을 때만** Tailwind 유틸리티로 직접 작성합니다. Seed 컴포넌트로 표현 가능한 것을 임의로 Tailwind로 다시 만들지 않습니다.

직접 작성하더라도 **색상·간격은 Seed 디자인 토큰을 사용**합니다 (하드코딩 색상 지양):

```tsx
// 색상은 Seed 토큰 사용
<div className="bg-[var(--seed-color-bg-layer-default)] text-[var(--seed-color-fg-neutral)]">
```

---

## 아이콘 규칙

- 아이콘은 **`lucide-react`**를 사용합니다.

```tsx
import { Search, ArrowRight } from "lucide-react";
```

- 이미 프로젝트 전반(`holiday`, `admin` 등)에서 lucide-react를 사용 중이므로 일관성을 유지합니다.
- 새 아이콘 라이브러리(react-icons 등)를 임의로 추가하지 않습니다.

---

## 체크리스트 (UI 작업 전 확인)

- [ ] `seed-design/ui/*`에 쓸 수 있는 컴포넌트가 있는가? → 있으면 그걸 사용
- [ ] 없다면 `@seed-design/react`에 있는가? → 있으면 그걸 사용 (가능하면 래퍼 추가)
- [ ] 둘 다 없을 때만 Tailwind로 직접 작성
- [ ] Tailwind로 만들 때 색상은 `--seed-color-*` 토큰 사용
- [ ] 아이콘은 `lucide-react`에서 import
