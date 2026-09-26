"use client";

import { useMemo, useState } from "react";
import type { VisitChartPoint } from "@/lib/admin/visits";

type Range = "24h" | "7d";

export function VisitTrendChart({
  last24Hours,
  last7Days,
}: {
  last24Hours: VisitChartPoint[];
  last7Days: VisitChartPoint[];
}) {
  const [range, setRange] = useState<Range>("24h");
  const [showVisitors, setShowVisitors] = useState(true);
  const [showViews, setShowViews] = useState(true);
  const [hover, setHover] = useState<number | null>(null);

  const points = range === "24h" ? last24Hours : last7Days;
  const width = 720;
  const height = 260;
  const pad = { top: 18, right: 36, bottom: 42, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxVisitors = Math.max(1, ...points.map((point) => point.visitors));
  const maxViews = Math.max(1, ...points.map((point) => point.views));

  const plotted = useMemo(() => {
    return points.map((point, index) => {
      const x =
        points.length === 1
          ? pad.left + innerW / 2
          : pad.left + (index / (points.length - 1)) * innerW;
      return {
        ...point,
        x,
        visitorY: pad.top + innerH - (point.visitors / maxVisitors) * innerH,
        viewY: pad.top + innerH - (point.views / maxViews) * innerH,
      };
    });
  }, [innerH, innerW, maxViews, maxVisitors, pad.left, pad.top, points]);

  const visitorLine = plotted.map((point) => `${point.x},${point.visitorY}`).join(" ");
  const viewLine = plotted.map((point) => `${point.x},${point.viewY}`).join(" ");
  const active = hover != null ? plotted[hover] : null;
  const tickEvery = range === "24h" ? 3 : 1;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2 text-blue-600">
            <input
              type="checkbox"
              checked={showVisitors}
              onChange={(event) => setShowVisitors(event.target.checked)}
            />
            총 방문자
          </label>
          <label className="inline-flex items-center gap-2 text-violet-600">
            <input
              type="checkbox"
              checked={showViews}
              onChange={(event) => setShowViews(event.target.checked)}
            />
            총 페이지뷰
          </label>
        </div>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRange("24h")}
            className={`rounded-md px-3 py-1.5 ${
              range === "24h" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            24시간
          </button>
          <button
            type="button"
            onClick={() => setRange("7d")}
            className={`rounded-md px-3 py-1.5 ${
              range === "7d" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            7일
          </button>
        </div>
      </div>

      <div className="relative px-2 pt-2 pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[260px] w-full"
          role="img"
          aria-label="접속 추이 차트"
          onMouseLeave={() => setHover(null)}
        >
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={height - pad.bottom}
            y2={height - pad.bottom}
            stroke="#e4e4e7"
          />
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={ratio}
              x1={pad.left}
              x2={width - pad.right}
              y1={pad.top + innerH * (1 - ratio)}
              y2={pad.top + innerH * (1 - ratio)}
              stroke="#f4f4f5"
            />
          ))}
          {showViews ? (
            <polyline
              fill="none"
              stroke="#7c3aed"
              strokeWidth="2"
              points={viewLine}
            />
          ) : null}
          {showVisitors ? (
            <polyline
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              points={visitorLine}
            />
          ) : null}
          {plotted.map((point, index) =>
            index % tickEvery === 0 || point.dateLabel ? (
              <g key={point.key}>
                <text
                  x={point.x}
                  y={height - 22}
                  textAnchor="middle"
                  className="fill-zinc-500"
                  fontSize="10"
                >
                  {point.label}
                </text>
                {point.dateLabel ? (
                  <text
                    x={point.x}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-zinc-400"
                    fontSize="10"
                  >
                    {point.dateLabel}
                  </text>
                ) : null}
              </g>
            ) : null,
          )}
          {plotted.map((point, index) => (
            <rect
              key={`${point.key}-hit`}
              x={point.x - innerW / Math.max(points.length, 1) / 2}
              y={pad.top}
              width={innerW / Math.max(points.length, 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(index)}
            />
          ))}
          {active ? (
            <line
              x1={active.x}
              x2={active.x}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#d4d4d8"
              strokeDasharray="3 3"
            />
          ) : null}
        </svg>
        {active ? (
          <div className="pointer-events-none absolute top-4 left-4 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm">
            <p className="font-semibold text-zinc-800">
              {active.label}
              {active.dateLabel ? ` · ${active.dateLabel}` : ""}
            </p>
            <p className="mt-1 text-blue-600">방문자 {active.visitors}</p>
            <p className="text-violet-600">페이지뷰 {active.views}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
