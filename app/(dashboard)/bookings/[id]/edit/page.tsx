"use client";

import { use } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
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
  const { data, isLoading: loading } = useSWR(`/api/bookings/${id}`, fetcher);
  const booking = data?.data || null;

  if (data?.error && !booking) {
    toast.error(data.error);
    router.push(`/bookings/${id}`);
  }

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
