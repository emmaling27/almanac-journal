"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Waves, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import {
  TidePoint,
  TideEvent,
  TideStationId,
  TIDE_STATIONS,
  SolarLunarData,
} from "@/lib/environmental";
import { MllwTooltip } from "./MllwTooltip";
import {
  formatCurrentTime,
  isDateToday,
  snapToTideInterval,
} from "@/lib/tideChartUtils";

interface TideCurveChartProps {
  tideCurve: TidePoint[];
  tideEvents: TideEvent[];
  solarLunar?: SolarLunarData;
  selectedDate: string;
  todayStr: string;
  selectedStation?: TideStationId;
  onStationChange?: (station: TideStationId) => void;
  currentTime?: Date;
}

export function TideCurveChart({
  tideCurve,
  tideEvents,
  solarLunar,
  selectedDate,
  todayStr,
  selectedStation = "aquatic-park",
  onStationChange,
  currentTime,
}: TideCurveChartProps) {
  const stationConfig = TIDE_STATIONS[selectedStation] ?? TIDE_STATIONS["aquatic-park"];

  const [liveClock, setLiveClock] = useState(() => {
    const initial = currentTime ?? new Date();
    return {
      time: formatCurrentTime(initial),
      date: format(initial, "yyyy-MM-dd"),
    };
  });

  useEffect(() => {
    if (currentTime) {
      setLiveClock({
        time: formatCurrentTime(currentTime),
        date: format(currentTime, "yyyy-MM-dd"),
      });
      return;
    }

    const checkClock = () => {
      const now = new Date();
      const time = formatCurrentTime(now);
      const date = format(now, "yyyy-MM-dd");
      setLiveClock((prev) => {
        if (prev.time === time && prev.date === date) {
          return prev;
        }
        return { time, date };
      });
    };

    checkClock();
    const timer = setInterval(checkClock, 1000);
    return () => clearInterval(timer);
  }, [currentTime]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isToday = useMemo(() => {
    return isDateToday(selectedDate, todayStr, currentTime ?? new Date());
  }, [selectedDate, todayStr, currentTime, liveClock.date]);

  const currentHourFormatted = useMemo(() => {
    if (!isToday) return null;
    return snapToTideInterval(liveClock.time);
  }, [isToday, liveClock.time]);

  const chartData = useMemo(() => {
    if (!tideCurve || tideCurve.length === 0) return [];

    const timeToMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const interpolateHeight = (timeStr: string) => {
      const targetMin = timeToMin(timeStr);
      const exact = tideCurve.find((p) => p.time === timeStr);
      if (exact) return exact.height;

      let prev = tideCurve[0];
      let next = tideCurve[tideCurve.length - 1];
      for (let i = 0; i < tideCurve.length; i++) {
        const m = timeToMin(tideCurve[i].time);
        if (m <= targetMin) prev = tideCurve[i];
        if (m >= targetMin) {
          next = tideCurve[i];
          break;
        }
      }

      const prevMin = timeToMin(prev.time);
      const nextMin = timeToMin(next.time);
      if (nextMin === prevMin) return prev.height;

      const ratio = (targetMin - prevMin) / (nextMin - prevMin);
      const val = prev.height + ratio * (next.height - prev.height);
      return Math.round(val * 100) / 100;
    };

    const pointMap = new Map<
      string,
      {
        time: string;
        height: number;
        celestialEvents: string[];
      }
    >();

    // Add all base curve points
    tideCurve.forEach((p) => {
      pointMap.set(p.time, {
        time: p.time,
        height: p.height,
        celestialEvents: [],
      });
    });

    // Add celestial events (sunrise, sunset, moonrise, moonset)
    const addCelestial = (timeStr: string | null | undefined, label: string) => {
      if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return;
      const existing = pointMap.get(timeStr);
      if (existing) {
        if (!existing.celestialEvents.includes(label)) {
          existing.celestialEvents.push(label);
        }
      } else {
        pointMap.set(timeStr, {
          time: timeStr,
          height: interpolateHeight(timeStr),
          celestialEvents: [label],
        });
      }
    };

    if (solarLunar?.sunrise) addCelestial(solarLunar.sunrise, `Sunrise (${solarLunar.sunrise})`);
    if (solarLunar?.sunset) addCelestial(solarLunar.sunset, `Sunset (${solarLunar.sunset})`);
    if (solarLunar?.moonrise) addCelestial(solarLunar.moonrise, `Moonrise (${solarLunar.moonrise})`);
    if (solarLunar?.moonset) addCelestial(solarLunar.moonset, `Moonset (${solarLunar.moonset})`);

    // If today, also insert the current time point
    if (currentHourFormatted) {
      if (!pointMap.has(currentHourFormatted)) {
        pointMap.set(currentHourFormatted, {
          time: currentHourFormatted,
          height: interpolateHeight(currentHourFormatted),
          celestialEvents: [],
        });
      }
    }

    return Array.from(pointMap.values()).sort(
      (a, b) => timeToMin(a.time) - timeToMin(b.time)
    );
  }, [tideCurve, solarLunar, currentHourFormatted]);

  const xTicks = useMemo(() => {
    const availableTimes = new Set(chartData.map((d) => d.time));
    const targetTicks = isMobile
      ? ["00:00", "06:00", "12:00", "18:00"]
      : ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];

    const filtered = targetTicks.filter((t) => availableTimes.has(t));
    return filtered.length > 0 ? filtered : undefined;
  }, [isMobile, chartData]);

  return (
    <div className="tidelog-card rounded-lg p-4 sm:p-6 shadow-sm border border-[#D8CFBF]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E3DAC9] gap-3">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-[#0A192F]" />
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold tracking-tight text-[#0A192F]">
              Tidal Curve & Soundings
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#EAE2D2] text-[#0A192F] font-bold border border-[#D8CFBF]">
              {stationConfig.shortName}
            </span>
          </div>
        </div>

        {/* Tide Event Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {tideEvents.map((evt, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-1.5 sm:py-1 rounded text-xs font-mono font-semibold whitespace-nowrap border ${
                evt.type === "High"
                  ? "bg-[#EBF3FC] text-[#0E3D75] border-[#B7D4F5]"
                  : "bg-[#FBF2E3] text-[#7A4B0C] border-[#EECD9D]"
              }`}
            >
              {evt.type === "High" ? (
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-[#0E3D75]" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 shrink-0 text-[#7A4B0C]" />
              )}
              <span>
                {evt.type === "High" ? "H" : "L"} {evt.time}
              </span>
              <span className="opacity-70 font-normal">({evt.height.toFixed(1)}&apos;)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-60 sm:h-76 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 22,
              right: 10,
              left: isMobile ? -20 : -15,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1E3A5F" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#1E3A5F" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="time"
              stroke="#7A6B53"
              fontSize={isMobile ? 10 : 11}
              fontFamily="monospace"
              tickLine={false}
              ticks={xTicks}
              interval={0}
            />

            <YAxis
              stroke="#7A6B53"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              domain={[-0.5, 7.0]}
              unit="′"
            />

            {/* Daylight span warm tint */}
            {solarLunar?.sunrise && solarLunar?.sunset && (
              <ReferenceArea
                x1={solarLunar.sunrise}
                x2={solarLunar.sunset}
                fill="#F59E0B"
                fillOpacity={0.07}
                ifOverflow="visible"
              />
            )}

            {/* Mean Sea Level Reference Line */}
            <ReferenceLine
              y={3.0}
              stroke="#B38F4D"
              strokeDasharray="4 4"
              label={{
                value: "MSL 3.0′",
                fill: "#B38F4D",
                fontSize: 10,
                position: "right",
                fontFamily: "monospace",
              }}
            />

            {/* Sunrise Reference Line */}
            {solarLunar?.sunrise && (
              <ReferenceLine
                x={solarLunar.sunrise}
                stroke="#D97706"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{
                  value: isMobile ? `RISE ${solarLunar.sunrise}` : `SUNRISE ${solarLunar.sunrise}`,
                  fill: "#92400E",
                  stroke: "#FAF7F0",
                  strokeWidth: 3,
                  paintOrder: "stroke",
                  fontSize: isMobile ? 9 : 10,
                  position: "top",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                }}
              />
            )}

            {/* Sunset Reference Line */}
            {solarLunar?.sunset && (
              <ReferenceLine
                x={solarLunar.sunset}
                stroke="#EA580C"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{
                  value: isMobile ? `SET ${solarLunar.sunset}` : `SUNSET ${solarLunar.sunset}`,
                  fill: "#9A3412",
                  stroke: "#FAF7F0",
                  strokeWidth: 3,
                  paintOrder: "stroke",
                  fontSize: isMobile ? 9 : 10,
                  position: "top",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                }}
              />
            )}

            {/* Moonrise Reference Line */}
            {solarLunar?.moonrise && (
              <ReferenceLine
                x={solarLunar.moonrise}
                stroke="#4F46E5"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: isMobile ? `MOONRISE ${solarLunar.moonrise}` : `MOONRISE ${solarLunar.moonrise}`,
                  fill: "#3730A3",
                  stroke: "#FAF7F0",
                  strokeWidth: 3,
                  paintOrder: "stroke",
                  fontSize: isMobile ? 9 : 10,
                  position: "insideBottom",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  offset: 14,
                }}
              />
            )}

            {/* Moonset Reference Line */}
            {solarLunar?.moonset && (
              <ReferenceLine
                x={solarLunar.moonset}
                stroke="#6D28D9"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: isMobile ? `MOONSET ${solarLunar.moonset}` : `MOONSET ${solarLunar.moonset}`,
                  fill: "#5B21B6",
                  stroke: "#FAF7F0",
                  strokeWidth: 3,
                  paintOrder: "stroke",
                  fontSize: isMobile ? 9 : 10,
                  position: "insideBottom",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  offset: 14,
                }}
              />
            )}

            {/* Current Time Reference Line */}
            {currentHourFormatted && (
              <ReferenceLine
                x={currentHourFormatted}
                stroke="#D9534F"
                strokeWidth={2}
                label={{
                  value: "NOW",
                  fill: "#B91C1C",
                  stroke: "#FAF7F0",
                  strokeWidth: 3,
                  paintOrder: "stroke",
                  fontSize: 10,
                  position: "top",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                }}
              />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  const isCurrentTime = isToday && data.time === currentHourFormatted;
                  return (
                    <div className="bg-[#0A192F] text-[#FAF7F0] p-2.5 rounded shadow-lg border border-[#B38F4D] text-xs font-mono space-y-1">
                      <div className="text-[#DFC898] font-bold flex items-center justify-between gap-3">
                        <span>Time: {data.time} LST</span>
                        {isCurrentTime && (
                          <span className="text-[10px] bg-[#D9534F] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            NOW
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold">
                        Height: {data.height.toFixed(2)} ft MLLW
                      </div>
                      {data.celestialEvents && data.celestialEvents.length > 0 && (
                        <div className="pt-1.5 mt-1 border-t border-[#B38F4D]/40 space-y-0.5">
                          {data.celestialEvents.map((evt: string, idx: number) => (
                            <div
                              key={idx}
                              className="text-[11px] text-[#FDE68A] flex items-center gap-1.5 font-semibold"
                            >
                              <span>✦</span>
                              <span>{evt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="height"
              stroke="#0A192F"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#tideGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-[#5B6B7A] font-mono mt-3 pt-3 border-t border-[#EAE2D2] gap-3">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5" title="Mean Sea Level (3.0 ft)">
            <span className="inline-block w-3.5 h-0.5 border-t-2 border-dashed border-[#B38F4D]" />
            <span>MSL 3.0′</span>
          </div>
          <div className="flex items-center gap-1.5" title="Daylight Hours (between Sunrise and Sunset)">
            <span className="inline-block w-3 h-2 rounded-xs bg-[#F59E0B]/25 border border-[#F59E0B]/60" />
            <span>Daylight</span>
          </div>
          <div className="flex items-center gap-1.5" title="Sunrise & Sunset Markings">
            <span className="inline-block w-3.5 h-0.5 border-t-2 border-dashed border-[#D97706]" />
            <span>Sun (Rise/Set)</span>
          </div>
          <div className="flex items-center gap-1.5" title="Moonrise & Moonset Markings">
            <span className="inline-block w-3.5 h-0.5 border-t-2 border-dashed border-[#4F46E5]" />
            <span>Moon (Rise/Set)</span>
          </div>
        </div>

        <MllwTooltip variant="light" align="center">
          <span>MLLW (Mean Lower Low Water) 0.0′ Datum</span>
        </MllwTooltip>
      </div>
    </div>
  );
}
