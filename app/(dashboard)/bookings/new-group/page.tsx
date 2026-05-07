import { BookingForm } from "@/components/bookings/BookingForm";

export default function NewGroupBookingPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tạo đặt phòng đoàn</h2>
      </div>
      <div className="max-w-4xl border p-6 rounded-lg bg-white dark:bg-slate-900 shadow-sm">
        <BookingForm mode="group" />
      </div>
    </div>
  );
}