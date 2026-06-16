/**
 * @file ui:content-placeholder
 * @requires @seed-design/react@~1.2.8
 * @requires @seed-design/css@~1.2.6
 **/

"use client";

import { ContentPlaceholder as SeedContentPlaceholder } from "@seed-design/react";
import * as React from "react";

export interface ContentPlaceholderProps extends SeedContentPlaceholder.RootProps {}

/**
 * @see https://seed-design.io/react/components/content-placeholder
 */
export const ContentPlaceholder = React.forwardRef<HTMLDivElement, ContentPlaceholderProps>(
  ({ children, ...props }, ref) => {
    return (
      <SeedContentPlaceholder.Root {...props} ref={ref}>
        <SeedContentPlaceholder.Asset>{children}</SeedContentPlaceholder.Asset>
      </SeedContentPlaceholder.Root>
    );
  },
);
ContentPlaceholder.displayName = "ContentPlaceholder";

/**
 * This file is a snippet from SEED Design, helping you get started quickly with @seed-design/* packages.
 * You can extend this snippet however you want.
 */
