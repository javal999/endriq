"use client";

/**
 * Client wrapper that owns the windowDays selection state and renders
 * the SVG <PmcChart>. The server page passes the full 365-day series.
 */

import { useState } from "react";
import { PmcChart } from "@/components/domain/pmc-chart";
import type { PmcDataPoint } from "@/lib/analytics/pmc";

export function PmcChartClient({ series }: { series: PmcDataPoint[] }) {
  const [windowDays, setWindowDays] = useState<90 | 180 | 365>(180);
  return (
    <PmcChart
      series={series}
      windowDays={windowDays}
      onWindowChange={setWindowDays}
    />
  );
}
