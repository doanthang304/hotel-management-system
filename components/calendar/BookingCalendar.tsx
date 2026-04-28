"use client";

import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function BookingCalendar() {
  const router = useRouter();
  const [events, setEvents] = useState([]);

  const fetchEvents = async (info: any) => {
    try {
      const res = await fetch(`/api/calendar?start=${info.startStr}&end=${info.endStr}`);
      const json = await res.json();
      if (res.ok) {
        setEvents(json.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleEventClick = (info: any) => {
    router.push(`/bookings/${info.event.id}`);
  };

  const handleDateClick = (info: any) => {
    router.push(`/bookings/new?date=${info.dateStr}`);
  };

  return (
    <div className="calendar-container bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        locale="vi"
        events={events}
        datesSet={fetchEvents}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="70vh"
        eventClassNames={(arg) => {
          const status = arg.event.extendedProps.status;
          if (status === "CHECKED_IN") return "bg-green-500 border-green-600";
          if (status === "CONFIRMED") return "bg-blue-500 border-blue-600";
          if (status === "PENDING") return "bg-yellow-500 border-yellow-600 text-black";
          return "bg-slate-500 border-slate-600";
        }}
      />
      <style jsx global>{`
        .fc {
          --fc-border-color: rgba(226, 232, 240, 0.2);
          --fc-today-bg-color: rgba(99, 102, 241, 0.05);
        }
        .fc-event {
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 4px;
        }
        .dark .fc {
          --fc-border-color: rgba(51, 65, 85, 0.5);
          --fc-page-bg-color: transparent;
        }
      `}</style>
    </div>
  );
}
