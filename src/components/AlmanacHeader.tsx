"use client";

import React from "react";
import { format, parseISO, addDays, subDays } from "date-fns";
import {
  Compass,
  Sun,
  Moon,
  Wind,
  Waves,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Anchor,
  Clock,
} from "lucide-react";
import {
  AlmanacEnvironmentalData,
  TideStationId,
  TIDE_STATIONS,
} from "@/lib/environmental";

interface AlmanacHeaderProps {
  selectedDate: string; // "YYYY-MM-DD"
  todayStr: string;
  onDateChange: (date: string) => void;
  selectedStation: TideStationId;
  onStationChange: (station: TideStationId) => void;
  envData: AlmanacEnvironmentalData | null;
  loading: boolean;
}

export function AlmanacHeader({
  selectedDate,
  todayStr,
  onDateChange,
  selectedStation,
  onStationChange,
  envData,
  loading,
}: AlmanacHeaderProps) {
  const currentDateObj = selectedDate ? parseISO(selectedDate) : new Date(2026, 9, 21);
  const isToday = todayStr ? todayStr === selectedDate : false;
  const stationConfig = TIDE_STATIONS[selectedStation] ?? TIDE_STATIONS["aquatic-park"];

  const handlePrevDay = () => {
    const prev = subDays(currentDateObj, 1);
    onDateChange(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const next = addDays(currentDateObj, 1);
    onDateChange(format(next, "yyyy-MM-dd"));
  };

  const handleToday = () => {
    if (todayStr) {
      onDateChange(todayStr);
    }
  };

  return (
    <header className="border-b border-[#D8CFBF] bg-[#F4EFE6] px-4 py-6 md:px-8 shadow-sm">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Masthead */}
        <div className="text-center space-y-2 border-b border-[#D8CFBF] pb-5 relative">
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.25em] text-[#7A6B53] font-mono">
            <Anchor className="w-3.5 h-3.5 text-[#B38F4D]" />
            <span>Maritime Journal & Observatory • San Francisco Bay</span>
            <Anchor className="w-3.5 h-3.5 text-[#B38F4D]" />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0A192F] font-serif uppercase">
            SF Bay Tidelog & Personal Journal
          </h1>

          <p className="text-xs sm:text-sm text-[#5B6B7A] tracking-wider font-mono uppercase">
            {stationConfig.name} • {stationConfig.coordinates} • NOAA STATION #{stationConfig.noaaStationId}
          </p>

          <div className="nautical-rule mt-3" />
        </div>

        {/* Date Selector Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#FAF7F0] p-3 rounded-lg border border-[#E3DAC9]">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded hover:bg-[#EAE2D2] text-[#0A192F] transition-colors border border-transparent hover:border-[#D1C5B0]"
              title="Previous Day"
              aria-label="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              disabled={isToday || !todayStr}
              className={`px-3 py-1.5 text-xs font-semibold rounded uppercase tracking-wider transition-colors ${
                isToday
                  ? "bg-[#0A192F] text-[#F4EFE6]"
                  : "bg-[#EAE2D2] hover:bg-[#DED4C0] text-[#0A192F]"
              }`}
            >
              Today
            </button>

            <button
              onClick={handleNextDay}
              className="p-2 rounded hover:bg-[#EAE2D2] text-[#0A192F] transition-colors border border-transparent hover:border-[#D1C5B0]"
              title="Next Day"
              aria-label="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Tidal Location Toggle (Aquatic Park default vs Crane Cove) */}
          <div className="flex items-center gap-1.5 bg-[#EAE2D2] p-1 rounded-lg border border-[#D8CFBF]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A6B53] px-2 font-semibold hidden md:inline">
              Location:
            </span>
            <button
              type="button"
              onClick={() => onStationChange("aquatic-park")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
                selectedStation === "aquatic-park"
                  ? "bg-[#0A192F] text-[#F4EFE6] shadow-sm"
                  : "text-[#5B6B7A] hover:text-[#0A192F] hover:bg-[#F2EDE2]"
              }`}
              title="Aquatic Park / Pier 41 (NOAA #9414305)"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Aquatic Park</span>
            </button>
            <button
              type="button"
              onClick={() => onStationChange("crane-cove")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
                selectedStation === "crane-cove"
                  ? "bg-[#0A192F] text-[#F4EFE6] shadow-sm"
                  : "text-[#5B6B7A] hover:text-[#0A192F] hover:bg-[#F2EDE2]"
              }`}
              title="Crane Cove / Potrero Point (NOAA #9414334)"
            >
              <Anchor className="w-3.5 h-3.5" />
              <span>Crane Cove</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <CalendarIcon className="w-4 h-4 text-[#B38F4D]" />
            <span className="text-base sm:text-lg font-serif font-bold text-[#0A192F]">
              {selectedDate ? format(currentDateObj, "EEEE, MMMM d, yyyy") : "Loading date..."}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="ml-2 px-2 py-1 text-xs font-mono bg-white border border-[#D8CFBF] rounded text-[#0A192F] focus:outline-none focus:ring-1 focus:ring-[#B38F4D]"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#5B6B7A]">
            <Clock className={`w-3.5 h-3.5 text-[#B38F4D] ${loading ? "animate-spin" : ""}`} />
            <span>PST / LST Tidal Meridian</span>
          </div>
        </div>

        {/* Environmental Highlights Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Sun Card */}
          <div className="tidelog-card p-4 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B38F4D]">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold">
                Solar Cycle
              </span>
              <Sun className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#5B6B7A]">Sunrise:</span>
                <span className="font-mono text-sm font-bold text-[#0A192F]">
                  {envData?.solarLunar.sunrise ?? "07:15"}
                </span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-xs text-[#5B6B7A]">Sunset:</span>
                <span className="font-mono text-sm font-bold text-[#0A192F]">
                  {envData?.solarLunar.sunset ?? "18:25"}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[#7A6B53] font-mono border-t border-[#EAE2D2] pt-1.5 flex justify-between">
              <span>Daylight:</span>
              <span className="font-medium text-[#0A192F]">
                {envData?.solarLunar.daylightHours ?? "11h 10m"}
              </span>
            </div>
          </div>

          {/* Moon Card */}
          <div className="tidelog-card p-4 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B38F4D]">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold">
                Lunar Phase
              </span>
              <Moon className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl" role="img" aria-label="Moon phase">
                {envData?.solarLunar.moonIcon ?? "🌖"}
              </span>
              <div>
                <p className="text-sm font-serif font-bold text-[#0A192F]">
                  {envData?.solarLunar.moonPhaseName ?? "Waxing Gibbous"}
                </p>
                <p className="text-xs font-mono text-[#5B6B7A]">
                  {envData?.solarLunar.moonIllumination ?? 80}% Illuminated
                </p>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[#7A6B53] font-mono border-t border-[#EAE2D2] pt-1.5">
              <span>Synodic Cycle: 29.53d</span>
            </div>
          </div>

          {/* Wind Card */}
          <div className="tidelog-card p-4 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#B38F4D]">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold">
                Wind & Temp
              </span>
              <Wind className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="text-xl font-bold font-mono text-[#0A192F]">
                  {envData?.wind.speedKnots ?? 12}{" "}
                  <span className="text-xs font-normal text-[#5B6B7A]">kts</span>
                </div>
                <div className="text-xs font-serif font-medium text-[#5B6B7A]">
                  Direction: {envData?.wind.directionCompass ?? "WNW"} ({envData?.wind.directionDeg ?? 280}°)
                </div>
              </div>
              <div
                className="w-8 h-8 rounded-full border border-[#B38F4D] flex items-center justify-center text-[#B38F4D]"
                style={{
                  transform: `rotate(${envData?.wind.directionDeg ?? 0}deg)`,
                }}
                title={`Wind direction: ${envData?.wind.directionDeg ?? 0}°`}
              >
                <Compass className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[#7A6B53] font-mono border-t border-[#EAE2D2] pt-1.5 flex justify-between">
              <span>Air Temp:</span>
              <span className="font-medium text-[#0A192F]">
                {envData?.wind.temperatureF ?? 62}°F
              </span>
            </div>
          </div>

          {/* Current Tide Status Card */}
          <div className="tidelog-card-dark p-4 rounded-lg flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#DFC898]">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold">
                Tide Sounding
              </span>
              <Waves className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-[#FAF8F5]">
                  {envData?.currentTideHeight !== undefined
                    ? `${envData.currentTideHeight.toFixed(1)}`
                    : "--"}
                </span>
                <span className="text-xs font-mono text-[#A0B0C0]">ft MLLW</span>
              </div>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] uppercase font-mono font-bold tracking-widest rounded ${
                    envData?.tideTendency === "Flooding"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      : envData?.tideTendency === "Ebbing"
                      ? "bg-amber-950 text-amber-300 border border-amber-700"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {envData?.tideTendency ?? "Flooding"}
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-[#A0B0C0] font-mono border-t border-[#1E3A5F] pt-1.5 flex justify-between">
              <span>Station:</span>
              <span className="text-[#DFC898]">{stationConfig.shortName}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
