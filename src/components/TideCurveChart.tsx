"use client";

import React, { useMemo } from "react";
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
import { TidePoint, TideEvent } from "@/lib/environmental";

interface TideCurveChartProps {
  tideCurve: TidePoint[];
  tideEvents: TideEvent[];
  selectedDate: string;
  todayStr: string;
}

export function TideCurveChart({
  tideCurve,
  tideEvents,
  selectedDate,
  todayStr,
}: TideCurveChartProps) {
  const isToday = todayStr ? todayStr === selectedDate : false;

  const currentHourFormatted = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = now.getMinutes() < 30 ? "00" : "30";
    return `${h}:${m}`;
  }, [isToday]);

  const chartData = useMemo(() => {
    return tideCurve.map((point) => ({
      time: point.time,
      height: point.height,
    }));
  }, [tideCurve]);

  return (
    <div className="tidelog-card rounded-lg p-5 sm:p-6 shadow-sm border border-[#D8CFBF]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E3DAC9] gap-3">
        <div className="flex items-center gap-2">
          <Waves className="w-5 h-5 text-[#0A192F]" />
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-[#0A192F]">
              Tidal Curve & Soundings (MLLW)
            </h2>
            <p className="text-xs text-[#5B6B7A] font-mono">
              24-Hour Continuous Tidal Cycle • Golden Gate Reference
            </p>
          </div>
        </div>

        {/* Tide Event Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {tideEvents.map((evt, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                evt.type === "High"
                  ? "bg-[#EBF3FC] text-[#0E3D75] border-[#B7D4F5]"
                  : "bg-[#FBF2E3] text-[#7A4B0C] border-[#EECD9D]"
              }`}
            >
              {evt.type === "High" ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-[#0E3D75]" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-[#7A4B0C]" />
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
      <div className="h-64 sm:h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 15, left: -10, bottom: 0 }}
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
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              interval={4} // every 2-3 hours
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
                  return (
                    <div className="bg-[#0A192F] text-[#FAF7F0] p-2.5 rounded shadow-lg border border-[#B38F4D] text-xs font-mono space-y-1">
                      <div className="text-[#DFC898] font-bold">
                        Time: {data.time} LST
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

      <div className="flex items-center justify-between text-xs text-[#5B6B7A] font-mono mt-3 pt-3 border-t border-[#EAE2D2]">
        <span>00:00 Midnight</span>
        <span className="hidden sm:inline">MLLW (Mean Lower Low Water) 0.0′ Datum</span>
        <span>23:30 Nightfall</span>
      </div>
    </div>
  );
}
