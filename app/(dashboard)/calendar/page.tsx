import { BookingCalendar } from "@/components/calendar/BookingCalendar";

export default function CalendarPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Lịch phòng</h2>
      </div>
      <BookingCalendar />
    </div>
  );
}
