import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { TideCurveChart } from "./TideCurveChart";

describe("TideCurveChart Component", () => {
  const mockCurve = [
    { time: "00:00", height: 3.0, timestamp: "2026-10-25 00:00" },
    { time: "06:00", height: 5.5, timestamp: "2026-10-25 06:00" },
    { time: "12:00", height: 1.0, timestamp: "2026-10-25 12:00" },
    { time: "18:00", height: 5.0, timestamp: "2026-10-25 18:00" },
    { time: "23:30", height: 2.8, timestamp: "2026-10-25 23:30" },
  ];

  const mockEvents = [
    { time: "06:00", height: 5.5, type: "High" as const },
    { time: "12:00", height: 1.0, type: "Low" as const },
  ];

  it("renders tidal curve and chart header when selectedDate is today", () => {
    const fixedTime = new Date(2026, 9, 25, 14, 25);
    const html = renderToString(
      React.createElement(TideCurveChart, {
        tideCurve: mockCurve,
        tideEvents: mockEvents,
        selectedDate: "2026-10-25",
        todayStr: "2026-10-25",
        selectedStation: "aquatic-park",
        currentTime: fixedTime,
      })
    );

    expect(html).toContain("Tidal Curve &amp; Soundings");
    expect(html).toContain("Aquatic Park");
    expect(html).toContain("MLLW (Mean Lower Low Water) 0.0′ Datum");
  });

  it("renders cleanly without errors when viewing a past or future date", () => {
    const fixedTime = new Date(2026, 9, 25, 14, 25);
    const html = renderToString(
      React.createElement(TideCurveChart, {
        tideCurve: mockCurve,
        tideEvents: mockEvents,
        selectedDate: "2026-10-20",
        todayStr: "2026-10-25",
        selectedStation: "aquatic-park",
        currentTime: fixedTime,
      })
    );

    expect(html).toContain("Tidal Curve &amp; Soundings");
    expect(html).toContain("Aquatic Park");
  });

  it("renders station name badge for selected station", () => {
    const html = renderToString(
      React.createElement(TideCurveChart, {
        tideCurve: mockCurve,
        tideEvents: mockEvents,
        selectedDate: "2026-10-25",
        todayStr: "2026-10-25",
        selectedStation: "crane-cove",
      })
    );

    expect(html).toContain("Crane Cove");
  });
});
