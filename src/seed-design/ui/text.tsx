/**
 * @file ui:text
 * @requires @seed-design/react@~1.0.0
 * @requires @seed-design/css@~1.0.0
 **/

"use client";

import { Text as SeedText, type TextProps as SeedTextProps } from "@seed-design/react";

export interface TextProps extends SeedTextProps {}

/**
 * SEED 타이포그래피. color 기본값은 테마 적응형 `neutral` 토큰이라
 * 라이트/다크 어디서나 대비가 보장된다.
 * @see https://seed-design.io/react/components/text
 */
export const Text = SeedText;
