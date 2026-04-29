"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  differenceInDays,
  startOfDay,
  parseISO,
} from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE" | "BLOCKED";
type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "NO_SHOW";

type GanttRoom = {
  id: string;
  roomNumber: string;
  floor: number | null;
  status: RoomStatus;
  roomTypeName: string;
};

type GanttEvent = {
  id: string;
  roomId: string;
  title: string;       // guest name
  start: string;       // ISO date string
  end: string;         // ISO date string
  status: BookingStatus;
  bookingCode: string;
  roomNumber: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ROOM_COL_WIDTH = 120;   // px — fixed left column
const DAY_WIDTH_DEFAULT = 56; // px per day cell
const DAY_WIDTH_ZOOMED = 40;  // px per day cell when zoomed out to 14 days
const ROW_HEIGHT = 52;        // px per room row
const HEADER_HEIGHT = 48;     // px

const STATUS_COLORS: Record<BookingStatus, { bar: string; text: string; border: string }> = {
  PENDING:    { bar: "bg-amber-400/90",   text: "text-amber-950",  border: "border-amber-500"  },
  CONFIRMED:  { bar: "bg-blue-500/90",    text: "text-white",      border: "border-blue-600"   },
  CHECKED_IN: { bar: "bg-emerald-500/90", text: "text-white",      border: "border-emerald-600"},
  CHECKED_OUT:{ bar: "bg-slate-400/80",   text: "text-slate-900",  border: "border-slate-500"  },
  NO_SHOW:    { bar: "bg-red-400/80",     text: "text-red-950",    border: "border-red-500"    },
};

const ROOM_STATUS_BADGE: Record<RoomStatus, { label: string; cls: string }> = {
  AVAILABLE:   { label: "Trống",   cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  OCCUPIED:    { label: "Có khách", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  CLEANING:    { label: "Dọn",     cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  MAINTENANCE: { label: "Bảo trì", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  BLOCKED:     { label: "Khóa",   cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function BookingCalendar() {
  const router = useRouter();

  // View state
  const [startDate, setStartDate] = useState<Date>(() => startOfDay(new Date()));
  const [numDays, setNumDays] = useState(7);

  // Data state
  const [rooms, setRooms] = useState<GanttRoom[]>([]);
  const [events, setEvents] = useState<GanttEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragSelection, setDragSelection] = useState<{
    roomId: string;
    roomNumber: string;
    start: Date;
    end: Date;
    dragging: boolean;
  } | null>(null);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ event: GanttEvent; x: number; y: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll ref for touch/mobile
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const days = Array.from({ length: numDays }, (_, i) => addDays(startDate, i));
  const endDate = addDays(startDate, numDays - 1);
  const dayWidth = numDays <= 7 ? DAY_WIDTH_DEFAULT : DAY_WIDTH_ZOOMED;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (from: Date, to: Date) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar?start=${from.toISOString()}&end=${to.toISOString()}`
      );
      const json = await res.json();
      if (res.ok && json.data) {
        setRooms(json.data.rooms ?? []);
        setEvents(json.data.events ?? []);
      }
    } catch (err) {
      console.error("Calendar fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, numDays]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goToToday = () => setStartDate(startOfDay(new Date()));
  const goPrev = () => setStartDate((d) => addDays(d, -7));
  const goNext = () => setStartDate((d) => addDays(d, 7));
  const toggleZoom = () => setNumDays((n) => (n === 7 ? 14 : 7));

  // ── Event helpers ──────────────────────────────────────────────────────────
  /**
   * Returns the pixel left offset and width for a booking bar within the grid.
   * Clamps to the visible range [startDate, endDate].
   */
  function getBarGeometry(event: GanttEvent) {
    const evStart = startOfDay(parseISO(event.start as string));
    const evEnd = startOfDay(parseISO(event.end as string));

    // Visual semantics:
    // - booking bar bắt đầu tại nửa sau ngày nhận phòng
    // - và kết thúc tại hết sáng của ngày trả phòng
    // So with x-axis = days, we use half-day offsets.
    const leftEdgeDays = differenceInDays(evStart, startDate) + 0.5;
    const rightEdgeDays = differenceInDays(evEnd, startDate) + 0.5;

    // Clamp by the visible range in half-day units:
    // The grid spans `numDays` full days => time window [0, numDays].
    const clampedLeft = Math.max(leftEdgeDays, 0);
    const clampedRight = Math.min(rightEdgeDays, numDays);
    const widthDays = clampedRight - clampedLeft;

    if (widthDays <= 0) {
      return { left: 0, width: dayWidth / 2 };
    }

    return {
      left: clampedLeft * dayWidth + 2,
      width: Math.max(widthDays * dayWidth - 4, dayWidth / 4),
    };
  }

  function getEventsForRoom(roomId: string) {
    return events.filter((e) => e.roomId === roomId);
  }

  function isToday(d: Date) {
    return isSameDay(d, new Date());
  }

  function normalizeRange(start: Date, end: Date) {
    return start.getTime() <= end.getTime()
      ? { start, end }
      : { start: end, end: start };
  }

  function openNewBooking(roomId: string, checkIn: Date, selectedEnd: Date) {
    // CheckOutDate in system is exclusive (numNights = differenceInDays(checkOut, checkIn)).
    // However we render bookings in the calendar as spanning into the checkOut day for clarity,
    // so we keep checkOut = selectedEnd here (e.g. drag 29 -> 30 => check-in 29, check-out 30).
    const checkOut =
      selectedEnd.getTime() <= checkIn.getTime() ? addDays(checkIn, 1) : selectedEnd;
    router.push(
      `/bookings/new?roomId=${roomId}&checkIn=${format(checkIn, "yyyy-MM-dd")}&checkOut=${format(checkOut, "yyyy-MM-dd")}`
    );
  }

  function handleCellMouseDown(room: GanttRoom, day: Date) {
    setDragSelection({
      roomId: room.id,
      roomNumber: room.roomNumber,
      start: day,
      end: day,
      dragging: true,
    });
  }

  function handleCellMouseEnter(roomId: string, day: Date) {
    setDragSelection((prev) => {
      if (!prev || !prev.dragging || prev.roomId !== roomId) return prev;
      return { ...prev, end: day };
    });
  }

  function finalizeSelection(selection: NonNullable<typeof dragSelection>) {
    const { start, end } = normalizeRange(selection.start, selection.end);
    openNewBooking(selection.roomId, start, end);
  }

  function handleCellMouseUp(roomId: string, endDay: Date) {
    setDragSelection((prev) => {
      if (!prev || !prev.dragging || prev.roomId !== roomId) return prev;
      // Use the cell you released on, not the last mouseenter,
      // so drag-select feels predictable even when the cursor jumps quickly.
      finalizeSelection({ ...prev, end: endDay });
      return null;
    });
  }

  function getSelectionGeometry(start: Date, end: Date) {
    const { start: s, end: e } = normalizeRange(start, end);

    const evStart = startOfDay(s);
    const evEnd = startOfDay(e);

    // - start at nửa sau của check-in ngày
    // - end at hết sáng của check-out ngày
    const leftEdgeDays = differenceInDays(evStart, startDate) + 0.5;
    const rightEdgeDays = differenceInDays(evEnd, startDate) + 0.5;

    const clampedLeft = Math.max(leftEdgeDays, 0);
    const clampedRight = Math.min(rightEdgeDays, numDays);
    const widthDays = clampedRight - clampedLeft;

    if (widthDays <= 0) {
      return { left: 0, width: dayWidth / 2 };
    }

    return {
      left: clampedLeft * dayWidth + 2,
      width: Math.max(widthDays * dayWidth - 4, dayWidth / 4),
    };
  }

  useEffect(() => {
    if (!dragSelection?.dragging) return;
    const onMouseUp = () => {
      setDragSelection((prev) => {
        if (!prev || !prev.dragging) return prev;
        finalizeSelection(prev);
        return null;
      });
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [dragSelection, router]);

  // ── Tooltip ────────────────────────────────────────────────────────────────
  function handleBarMouseEnter(e: React.MouseEvent, event: GanttEvent) {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ event, x: rect.left, y: rect.top });
  }

  function handleBarMouseLeave() {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 200);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon-sm" onClick={goPrev} title="Tuần trước">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Hôm nay
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goNext} title="Tuần sau">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {format(startDate, "dd/MM", { locale: vi })}
            {" – "}
            {format(endDate, "dd/MM/yyyy", { locale: vi })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
            {(Object.entries(STATUS_COLORS) as [BookingStatus, typeof STATUS_COLORS[BookingStatus]][]).map(([status, { bar }]) => (
              <span key={status} className="flex items-center gap-1">
                <span className={cn("inline-block h-2.5 w-2.5 rounded-sm border", bar, STATUS_COLORS[status].border)} />
                {status === "PENDING" ? "Chờ xác nhận" :
                 status === "CONFIRMED" ? "Đã xác nhận" :
                 status === "CHECKED_IN" ? "Đang ở" :
                 status === "CHECKED_OUT" ? "Đã trả phòng" : "No-show"}
              </span>
            ))}
          </div>
          {/* Zoom toggle (desktop only) */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleZoom}
            className="hidden md:inline-flex gap-1.5"
            title={numDays === 7 ? "Xem 14 ngày" : "Xem 7 ngày"}
          >
            {numDays === 7 ? (
              <><ZoomOut className="h-3.5 w-3.5" /> 14 ngày</>
            ) : (
              <><ZoomIn className="h-3.5 w-3.5" /> 7 ngày</>
            )}
          </Button>
        </div>
      </div>

      {/* Gantt Grid */}
      <div className="relative rounded-lg border bg-card shadow-sm overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <div className="flex">
          {/* ── Fixed left column (room names) ── */}
          <div
            className="flex-none border-r bg-muted/30 z-10"
            style={{ width: ROOM_COL_WIDTH }}
          >
            {/* Corner header */}
            <div
              className="flex items-center border-b px-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide"
              style={{ height: HEADER_HEIGHT }}
            >
              Phòng
            </div>
            {/* Room rows */}
            {rooms.map((room) => {
              const badge = ROOM_STATUS_BADGE[room.status];
              return (
                <div
                  key={room.id}
                  className="flex flex-col justify-center border-b px-3 py-1 gap-0.5"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span className="font-semibold text-sm leading-tight">
                    P. {room.roomNumber}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight truncate">
                    {room.roomTypeName}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 inline-flex w-fit items-center rounded px-1 py-px text-[9px] font-medium leading-none",
                      badge.cls
                    )}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Scrollable grid ── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div style={{ width: numDays * dayWidth, minWidth: "100%" }}>
              {/* Day header row */}
              <div
                className="flex border-b sticky top-0 bg-card z-10"
                style={{ height: HEADER_HEIGHT }}
              >
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative flex flex-col items-center justify-center border-r text-xs font-medium flex-none",
                      isToday(day) && "bg-primary/5"
                    )}
                    style={{ width: dayWidth }}
                  >
                    {/* Divider: sáng / chiều (không ghi chữ) */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/30 pointer-events-none" />
                    <span className={cn(
                      "text-[10px] uppercase text-muted-foreground",
                      isToday(day) && "text-primary"
                    )}>
                      {format(day, "EEE", { locale: vi })}
                    </span>
                    <span className={cn(
                      "text-sm font-bold",
                      isToday(day) && "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    )}>
                      {format(day, "d")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Room rows */}
              {rooms.map((room, rowIdx) => {
                const roomEvents = getEventsForRoom(room.id);
                const normalizedDrag =
                  dragSelection && dragSelection.roomId === room.id
                    ? normalizeRange(dragSelection.start, dragSelection.end)
                    : null;
                return (
                  <div
                    key={room.id}
                    className={cn(
                      "relative flex border-b",
                      rowIdx % 2 === 1 && "bg-muted/20"
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Day cell backgrounds + click zones */}
                    {days.map((day) => (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "relative flex-none border-r cursor-pointer transition-colors hover:bg-primary/5",
                          isToday(day) && "bg-primary/5",
                      normalizedDrag && isWithinInterval(day, normalizedDrag) && "bg-primary/10"
                        )}
                        style={{ width: dayWidth, height: ROW_HEIGHT }}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          handleCellMouseDown(room, day);
                        }}
                        onMouseEnter={() => handleCellMouseEnter(room.id, day)}
                    onMouseUp={() => handleCellMouseUp(room.id, day)}
                        title={
                          dragSelection?.dragging && dragSelection.roomId === room.id
                            ? `Kéo để chọn khoảng ngày cho phòng ${room.roomNumber}`
                            : `Tạo booking: Phòng ${room.roomNumber}, ${format(day, "dd/MM/yyyy")}`
                        }
                      >
                        {/* Divider: sáng / chiều (không ghi chữ) */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/20 pointer-events-none" />
                      </div>
                    ))}

                    {/* Booking bars — absolutely positioned over the day cells */}
                {dragSelection?.dragging && dragSelection.roomId === room.id && (
                  (() => {
                    const { left, width } = getSelectionGeometry(dragSelection.start, dragSelection.end);
                    return (
                      <div
                        className={cn(
                          "absolute top-2 bottom-2 rounded-md border cursor-grab select-none",
                          "flex items-center px-2 gap-1 overflow-hidden",
                          "bg-primary/20 border-primary/30",
                          "pointer-events-none"
                        )}
                        style={{ left, width }}
                      >
                        <span className="text-[11px] font-semibold truncate leading-none text-primary">
                          Kéo để chọn
                        </span>
                      </div>
                    );
                  })()
                )}
                    {roomEvents.map((event) => {
                      const { left, width } = getBarGeometry(event);
                      const colors = STATUS_COLORS[event.status];

                      // Check if event is within visible range
                      const evStart = startOfDay(parseISO(event.start as string));
                      const evEnd = startOfDay(parseISO(event.end as string));
                      const inRange =
                        evStart <= addDays(endDate, 1) && evEnd >= startDate;
                      if (!inRange) return null;

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "absolute top-2 bottom-2 rounded-md border cursor-pointer select-none",
                            "flex items-center px-2 gap-1 overflow-hidden",
                            "transition-all duration-150 hover:brightness-110 hover:shadow-md hover:z-20",
                            dragSelection?.dragging && "pointer-events-none",
                            colors.bar,
                            colors.border
                          )}
                          style={{ left, width }}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/bookings/${event.id}`);
                          }}
                          onMouseEnter={(e) => handleBarMouseEnter(e, event)}
                          onMouseLeave={handleBarMouseLeave}
                        >
                          <span className={cn("text-[11px] font-semibold truncate leading-none", colors.text)}>
                            {event.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Empty state */}
              {!loading && rooms.length === 0 && (
                <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
                  Không có phòng nào trong hệ thống.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: "translate(-50%, -100%)" }}
          onMouseEnter={() => {
            if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          <div className="rounded-lg border bg-popover px-3 py-2 shadow-lg text-xs space-y-1 min-w-[160px]">
            <p className="font-semibold text-sm">{tooltip.event.title}</p>
            <p className="text-muted-foreground">
              Phòng {tooltip.event.roomNumber}
            </p>
            <p className="text-muted-foreground">
              {format(parseISO(tooltip.event.start as string), "dd/MM")}
              {" → "}
              {format(parseISO(tooltip.event.end as string), "dd/MM/yyyy")}
            </p>
            <p className="text-muted-foreground font-mono text-[10px]">
              #{tooltip.event.bookingCode}
            </p>
            <span className={cn(
              "inline-block rounded px-1.5 py-0.5 text-[10px] font-medium",
              STATUS_COLORS[tooltip.event.status].bar,
              STATUS_COLORS[tooltip.event.status].text
            )}>
              {tooltip.event.status === "PENDING" ? "Chờ xác nhận" :
               tooltip.event.status === "CONFIRMED" ? "Đã xác nhận" :
               tooltip.event.status === "CHECKED_IN" ? "Đang ở" :
               tooltip.event.status === "CHECKED_OUT" ? "Đã trả phòng" : "No-show"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
