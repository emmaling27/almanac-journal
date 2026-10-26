"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info, ExternalLink, X } from "lucide-react";

interface MllwTooltipProps {
  children?: React.ReactNode;
  variant?: "dark" | "light";
  className?: string;
  showIcon?: boolean;
  align?: "left" | "right" | "center";
}

export function MllwTooltip({
  children,
  variant = "dark",
  className = "",
  showIcon = true,
  align = "right",
}: MllwTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    clearCloseTimer();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 350);
  };

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        clearCloseTimer();
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearCloseTimer();
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  const alignmentClass =
    align === "left"
      ? "left-0"
      : align === "center"
      ? "left-1/2 -translate-x-1/2"
      : "right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2";

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          clearCloseTimer();
          setIsOpen((prev) => !prev);
        }}
        aria-expanded={isOpen}
        aria-label="What is Mean Lower Low Water (MLLW)?"
        className={`inline-flex items-center gap-1 cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-[#B38F4D] rounded px-1 py-0.5 -mx-1 -my-0.5 ${
          variant === "dark"
            ? "text-[#A0B0C0] hover:text-[#DFC898] border-b border-dotted border-[#A0B0C0]/50 hover:border-[#DFC898]"
            : "text-[#5B6B7A] hover:text-[#0A192F] border-b border-dotted border-[#5B6B7A]/50 hover:border-[#0A192F]"
        }`}
      >
        {children ?? <span>MLLW</span>}
        {showIcon && <Info className="w-3 h-3 opacity-70 shrink-0" />}
      </button>

      {isOpen && (
        <div
          className={`absolute bottom-full pb-2 z-50 ${alignmentClass}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            role="dialog"
            aria-label="Mean Lower Low Water Explanation"
            className={`w-72 sm:w-80 p-3.5 rounded-lg shadow-xl text-left font-sans text-xs transition-opacity animate-in fade-in duration-150 ${
              variant === "dark"
                ? "bg-[#0A192F] text-[#FAF8F5] border border-[#B38F4D]/60 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)]"
                : "bg-[#FDFBF7] text-[#142334] border border-[#DFD7C7] shadow-[0_10px_25px_-5px_rgba(10,25,47,0.15)]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 pb-1.5 border-b border-current/15 mb-2">
              <div>
                <span className="font-serif font-bold text-sm block text-[#DFC898]">
                  Mean Lower Low Water (MLLW)
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider opacity-75">
                  Nautical Chart Datum (0.0′ Baseline)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearCloseTimer();
                  setIsOpen(false);
                }}
                className="p-1 rounded hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Close tooltip"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="leading-relaxed mb-2 opacity-90">
              The average height of the <strong>lower of the two daily low tides</strong> recorded over a 19-year National Tidal Datum Epoch.
            </p>

            <p className="leading-relaxed mb-3 opacity-80 text-[11px]">
              In the US, nautical chart soundings measure depth from MLLW. Water levels vary throughout the year (equinoxes, King Tides, seasonal storms, and water temperature expansion), so MLLW provides a safe, conservative baseline so vessels don&apos;t run aground.
            </p>

            <div className="pt-2 border-t border-current/15 flex items-center justify-between text-[11px]">
              <a
                href="https://tidesandcurrents.noaa.gov/datum_options.html"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 font-mono font-medium hover:underline ${
                  variant === "dark" ? "text-[#DFC898]" : "text-[#8C6D38]"
                }`}
              >
                <span>NOAA Tidal Datums Guide</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="font-mono text-[10px] opacity-60">NOAA CO-OPS</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
