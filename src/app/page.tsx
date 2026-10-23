"use client";

import React, { useState, useEffect, Suspense, useSyncExternalStore } from "react";
import { format } from "date-fns";
import { AlmanacHeader } from "@/components/AlmanacHeader";
import { TideCurveChart } from "@/components/TideCurveChart";
import { JournalEditor } from "@/components/JournalEditor";
import { GoalTrackerMatrix } from "@/components/GoalTrackerMatrix";
import {
  fetchEnvironmentalData,
  AlmanacEnvironmentalData,
  TideStationId,
  TIDE_STATIONS,
  DEFAULT_TIDE_STATION,
} from "@/lib/environmental";
import { Anchor, Compass, Waves, Loader2 } from "lucide-react";

function subscribe() {
  return () => {};
}

function getClientToday() {
  return format(new Date(), "yyyy-MM-dd");
}

function getServerToday() {
  return "2026-10-21";
}

function TidelogApp() {
  const clientToday = useSyncExternalStore(subscribe, getClientToday, getServerToday);
  const [userSelectedDate, setUserSelectedDate] = useState<string | null>(null);
  const selectedDate = userSelectedDate ?? clientToday;

  const [selectedStation, setSelectedStation] = useState<TideStationId>(DEFAULT_TIDE_STATION);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tidelog_station");
      if (saved === "aquatic-park" || saved === "crane-cove") {
        setSelectedStation(saved);
      }
    } catch {
      // Local storage unavailable
    }
  }, []);

  const handleStationChange = (station: TideStationId) => {
    setSelectedStation(station);
    try {
      localStorage.setItem("tidelog_station", station);
    } catch {
      // Local storage unavailable
    }
  };

  const [envState, setEnvState] = useState<{
    date: string;
    station: TideStationId;
    data: AlmanacEnvironmentalData | null;
    loading: boolean;
  }>({
    date: "",
    station: DEFAULT_TIDE_STATION,
    data: null,
    loading: true,
  });

  useEffect(() => {
    let isCancelled = false;
    setEnvState((prev) => ({ ...prev, loading: true }));

    fetchEnvironmentalData(selectedDate, selectedStation)
      .then((data) => {
        if (!isCancelled) {
          setEnvState({
            date: selectedDate,
            station: selectedStation,
            data,
            loading: false,
          });
        }
      })
      .catch((err) => {
        console.error("Error loading environmental data:", err);
        if (!isCancelled) {
          setEnvState((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, selectedStation]);

  const loadingEnv =
    envState.loading ||
    envState.date !== selectedDate ||
    envState.station !== selectedStation;
  const envData = envState.data;
  const stationConfig = TIDE_STATIONS[selectedStation] ?? TIDE_STATIONS[DEFAULT_TIDE_STATION];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#142334]">
      {/* Top Almanac & Astronomical Masthead */}
      <AlmanacHeader
        selectedDate={selectedDate}
        todayStr={clientToday}
        onDateChange={setUserSelectedDate}
        selectedStation={selectedStation}
        onStationChange={handleStationChange}
        envData={envData}
        loading={loadingEnv}
      />

      {/* Main Observatory & Journal Canvas */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:px-8 space-y-8">
        {/* Loading Banner if environmental data is updating */}
        {loadingEnv && !envData && (
          <div className="flex items-center justify-center p-8 bg-[#FAF7F0] border border-[#E3DAC9] rounded-lg text-xs font-mono text-[#7A6B53] gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#B38F4D]" />
            <span>Calculating tidal curves and astronomical cycles for {stationConfig.shortName} ({selectedDate})...</span>
          </div>
        )}

        {/* Section 1: Tide Curve Chart */}
        {envData && (
          <TideCurveChart
            tideCurve={envData.tideCurve}
            tideEvents={envData.tideEvents}
            selectedDate={selectedDate}
            todayStr={clientToday}
            selectedStation={selectedStation}
            onStationChange={handleStationChange}
          />
        )}

        {/* Section 2: Captain's Log & Goals Editor */}
        <JournalEditor selectedDate={selectedDate} />

        {/* Section 3: 14-Day Trajectory Habit Matrix */}
        <GoalTrackerMatrix
          selectedDate={selectedDate}
          todayStr={clientToday}
          onSelectDate={setUserSelectedDate}
        />
      </main>

      {/* Maritime Footer */}
      <footer className="border-t border-[#D8CFBF] bg-[#F2EDE2] py-8 px-4 text-center text-xs font-mono text-[#5B6B7A] mt-12">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex items-center justify-center gap-2 text-[#B38F4D]">
            <Anchor className="w-4 h-4" />
            <Compass className="w-4 h-4" />
            <Waves className="w-4 h-4" />
          </div>
          <p className="font-serif text-[#0A192F] font-semibold">
            San Francisco Bay Tidelog & Reflective Journal
          </p>
          <p className="text-[11px] leading-relaxed text-[#7A6B53]">
            Tidal Predictions referenced from NOAA CO-OPS Station #{stationConfig.noaaStationId} ({stationConfig.name}).
            <br />
            Meteorological data provided by Open-Meteo API. Relational schema powered by Convex.
          </p>
          <div className="nautical-rule max-w-xs mx-auto my-3" />
          <p className="text-[10px] text-[#9A8F7D]">
            Designed for alignment between environmental rhythms and creative living.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F7F4EE]">
          <div className="text-center space-y-3 font-mono text-xs text-[#7A6B53]">
            <Loader2 className="w-6 h-6 animate-spin text-[#B38F4D] mx-auto" />
            <p>Initializing San Francisco Bay Almanac...</p>
          </div>
        </div>
      }
    >
      <TidelogApp />
    </Suspense>
  );
}
