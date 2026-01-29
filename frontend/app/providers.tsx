"use client";

import * as React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
