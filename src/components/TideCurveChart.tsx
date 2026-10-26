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
} from "recharts";
import { Waves, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import {
  TidePoint,
  TideEvent,
  TideStationId,
  TIDE_STATIONS,
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
  selectedDate: string;
  todayStr: string;
  selectedStation?: TideStationId;
  onStationChange?: (station: TideStationId) => void;
  currentTime?: Date;
}

export function TideCurveChart({
  tideCurve,
  tideEvents,
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
    return tideCurve.map((point) => ({
      time: point.time,
      height: point.height,
    }));
  }, [tideCurve]);

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
      <div className="h-56 sm:h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 15,
              right: 10,
              left: isMobile ? -20 : -15,
              bottom: 0,
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

            {/* Current Time Reference Line */}
            {currentHourFormatted && (
              <ReferenceLine
                x={currentHourFormatted}
                stroke="#D9534F"
                strokeWidth={2}
                label={{
                  value: "NOW",
                  fill: "#D9534F",
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

      <div className="flex items-center justify-center text-[11px] sm:text-xs text-[#5B6B7A] font-mono mt-3 pt-3 border-t border-[#EAE2D2]">
        <MllwTooltip variant="light" align="center">
          <span>MLLW (Mean Lower Low Water) 0.0′ Datum</span>
        </MllwTooltip>
      </div>
    </div>
  );
}
