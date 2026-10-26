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

  it("renders tidal curve and live badge when selectedDate is today", () => {
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
    expect(html).toContain("14:25");
    expect(html).toContain("LIVE •");
    expect(html).toContain("MLLW (Mean Lower Low Water) 0.0′ Datum");
  });

  it("does not render live badge when viewing a past or future date", () => {
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
    expect(html).not.toContain("LIVE •");
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

  it("updates live badge and time correctly when clock changes", () => {
    const initialTime = new Date(2026, 9, 25, 10, 0);
    const html1 = renderToString(
      React.createElement(TideCurveChart, {
        tideCurve: mockCurve,
        tideEvents: mockEvents,
        selectedDate: "2026-10-25",
        todayStr: "2026-10-25",
        currentTime: initialTime,
      })
    );
    expect(html1).toContain("10:00");

    const updatedTime = new Date(2026, 9, 25, 10, 1);
    const html2 = renderToString(
      React.createElement(TideCurveChart, {
        tideCurve: mockCurve,
        tideEvents: mockEvents,
        selectedDate: "2026-10-25",
        todayStr: "2026-10-25",
        currentTime: updatedTime,
      })
    );
    expect(html2).toContain("10:01");
  });
});
