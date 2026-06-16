/**
 * @file ui:badge
 * @requires @seed-design/react@~1.0.0
 * @requires @seed-design/css@~1.0.0
 **/

"use client";

import { Badge as SeedBadge, type BadgeProps as SeedBadgeProps } from "@seed-design/react";

export interface BadgeProps extends SeedBadgeProps {}

/**
 * @see https://seed-design.io/react/components/badge
 */
export const Badge = SeedBadge;
