"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/bookings/BookingForm";
import { toast } from "sonner";

type EditBookingPageProps = {
  params: Promise<{ id: string }>;
};

export default function EditBookingPage({ params }: EditBookingPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Không thể tải booking");
        setBooking(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể tải booking");
        router.push(`/bookings/${id}`);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push(`/bookings/${id}`)} className="min-h-[44px]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Sửa booking</h2>
        </div>
      </div>

      <div className="max-w-4xl rounded-lg border bg-white p-6 shadow-sm dark:bg-slate-900">
        <BookingForm mode="edit" bookingId={id} initialData={booking} />
      </div>
    </div>
  );
}
