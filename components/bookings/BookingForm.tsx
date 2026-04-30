"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn, formatVND, formatInputNumber, parseInputNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

// ─── Schema ───────────────────────────────────────────────────────────────────

const bookingFormSchema = z.object({
  roomId: z.string().min(1, "Vui lòng chọn phòng"),
  guestId: z.string().optional(),
  guestFullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  guestPhone: z.string().optional(),
  guestIdNumber: z.string().optional(),
  guestIdType: z.enum(["CCCD", "PASSPORT", "OTHER"]),
  guestNationality: z.string(),
  checkInDate: z.instanceof(Date, { message: "Vui lòng chọn ngày nhận phòng" }),
  checkOutDate: z.instanceof(Date, { message: "Vui lòng chọn ngày trả phòng" }),
  roomRate: z.number().min(0, "Giá phòng không hợp lệ"),
  depositAmount: z.number().min(0),
  source: z.enum(["WALKIN", "FACEBOOK_ZALO", "BOOKING_COM", "AGODA", "AIRBNB", "OTHER"]),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
  bookingCode: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

// ─── Sub-types ────────────────────────────────────────────────────────────────

type RoomOption = {
  id: string;
  roomNumber: string;
  status: string;
  roomType: { name: string; roomPrices: { pricePerNight: number; isDefault: boolean }[] };
};

// ─── RoomGrid ─────────────────────────────────────────────────────────────────

function RoomGrid({
  rooms,
  selectedId,
  onSelect,
}: {
  rooms: RoomOption[];
  selectedId: string;
  onSelect: (r: RoomOption) => void;
}) {
  const [filterType, setFilterType] = useState<string>("all");
  const types = Array.from(new Set(rooms.map((r) => r.roomType.name)));

  const filtered = filterType === "all" ? rooms : rooms.filter((r) => r.roomType.name === filterType);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
            filterType === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-muted"
          )}
        >
          Tất cả
        </button>
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilterType(t)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
              filterType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:bg-muted"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {filtered.map((room) => {
          const defaultPrice = room.roomType.roomPrices?.find((p) => p.isDefault)
            ?? room.roomType.roomPrices?.[0];
          const isSelected = room.id === selectedId;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room)}
              className={cn(
                "flex flex-col items-center rounded-lg border p-2 text-center text-xs transition-all",
                "hover:border-primary/60 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border"
              )}
            >
              <span className="text-base font-bold leading-tight">{room.roomNumber}</span>
              <span className="text-[10px] text-muted-foreground leading-tight truncate w-full">
                {room.roomType.name}
              </span>
              {defaultPrice && (
                <span className="mt-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  {(defaultPrice.pricePerNight / 1000).toFixed(0)}k
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const initializedFromQuery = useRef(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      guestId: "",
      guestFullName: "",
      guestPhone: "",
      guestIdType: "CCCD" as const,
      guestNationality: "Việt Nam",
      roomId: "",
      checkInDate: new Date(),
      checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      roomRate: 0,
      depositAmount: 0,
      source: "WALKIN" as const,
      specialRequests: "",
      internalNotes: "",
      bookingCode: "",
    },
  });

  const watchCheckIn = form.watch("checkInDate");
  const watchCheckOut = form.watch("checkOutDate");
  const watchRoomId = form.watch("roomId");
  const watchRoomRate = form.watch("roomRate");
  const watchDeposit = form.watch("depositAmount");

  const numNights =
    watchCheckIn && watchCheckOut && watchCheckOut > watchCheckIn
      ? differenceInDays(watchCheckOut, watchCheckIn)
      : 0;

  const totalAmount = numNights * watchRoomRate;
  const remaining = Math.max(0, totalAmount - (watchDeposit ?? 0));

  useEffect(() => {
    async function fetchRooms() {
      const res = await fetch("/api/rooms?status=AVAILABLE");
      const json = await res.json();
      setRooms(json.data || []);
    }
    fetchRooms();
  }, []);

  useEffect(() => {
    if (initializedFromQuery.current) return;
    const roomId = searchParams.get("roomId");
    const checkIn = searchParams.get("checkIn") || searchParams.get("date");
    const checkOut = searchParams.get("checkOut");

    if (roomId) form.setValue("roomId", roomId);
    
    const parseDateParam = (value: string | null) => {
      if (!value) return null;
      const parsed = new Date(`${value}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const checkInDate = parseDateParam(checkIn);
    const checkOutDate = parseDateParam(checkOut);

    if (checkInDate) form.setValue("checkInDate", checkInDate);
    if (checkOutDate && checkInDate && checkOutDate > checkInDate) {
      form.setValue("checkOutDate", checkOutDate);
    } else if (checkInDate) {
      form.setValue("checkOutDate", new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000));
    }
    initializedFromQuery.current = true;
  }, [form, searchParams]);

  useEffect(() => {
    if (watchRoomId) {
      const selectedRoom = rooms.find((r) => r.id === watchRoomId);
      if (selectedRoom && (selectedRoom.roomType.roomPrices?.length ?? 0) > 0) {
        const prices = selectedRoom.roomType.roomPrices;
        const defaultPrice = prices.find((p) => p.isDefault) ?? prices[0];
        if (defaultPrice) form.setValue("roomRate", Number(defaultPrice.pricePerNight));
      }
    }
  }, [watchRoomId, rooms, form]);

  async function onSubmit(data: BookingFormValues) {
    if (numNights <= 0) {
      toast.error("Ngày trả phòng phải sau ngày nhận phòng");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...data,
        guestId: data.guestId || undefined,
        checkInDate: data.checkInDate.toISOString(),
        checkOutDate: data.checkOutDate.toISOString(),
        numNights,
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Không thể tạo booking");
      }

      toast.success("Tạo booking thành công");
      router.push("/bookings");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
          <div className="space-y-8">
            <div className="rounded-lg border p-5 space-y-4">
              <h3 className="text-base font-semibold">Thông tin khách hàng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guestFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ và tên (*)</FormLabel>
                      <FormControl><Input placeholder="Nguyễn Văn A" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số điện thoại</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="090..." 
                          {...field} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestIdType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại giấy tờ</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="CCCD">CCCD</SelectItem>
                          <SelectItem value="PASSPORT">Passport</SelectItem>
                          <SelectItem value="OTHER">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestIdNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số giấy tờ</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          onChange={(e) => {
                            const type = form.getValues("guestIdType");
                            let val = e.target.value;
                            if (type === "CCCD") {
                              val = val.replace(/\D/g, "");
                            } else if (type === "PASSPORT") {
                              val = val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                            }
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestNationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quốc tịch</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="rounded-lg border p-5 space-y-4">
              <h3 className="text-base font-semibold">Thông tin đặt phòng</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Ngày nhận phòng</FormLabel>
                      <Popover>
                        <PopoverTrigger className="inline-flex h-8 w-full items-center justify-start gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-normal">
                          {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkOutDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Ngày trả phòng</FormLabel>
                      <Popover>
                        <PopoverTrigger className="inline-flex h-8 w-full items-center justify-start gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-normal">
                          {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date <= (watchCheckIn || new Date())}
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chọn phòng (*)</FormLabel>
                    <FormControl>
                      <RoomGrid rooms={rooms} selectedId={field.value} onSelect={(r) => field.onChange(r.id)} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bookingCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã Booking</FormLabel>
                      <FormControl><Input placeholder="VD: BCOM-123456" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="roomRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá mỗi đêm (VND)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="0" 
                          {...field} 
                          value={formatInputNumber(field.value)}
                          onChange={(e) => {
                            const numericValue = parseInputNumber(e.target.value);
                            field.onChange(numericValue);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nguồn booking</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="WALKIN">Trực tiếp</SelectItem>
                          <SelectItem value="FACEBOOK_ZALO">FACEBOOK/ZALO</SelectItem>
                          <SelectItem value="BOOKING_COM">Booking.com</SelectItem>
                          <SelectItem value="AGODA">Agoda</SelectItem>
                          <SelectItem value="AIRBNB">Airbnb</SelectItem>
                          <SelectItem value="OTHER">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="rounded-lg border p-5 space-y-4">
              <h3 className="text-base font-semibold">Ghi chú</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yêu cầu đặc biệt</FormLabel>
                      <FormControl><Textarea className="resize-none" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="internalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghi chú nội bộ</FormLabel>
                      <FormControl><Textarea className="resize-none" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="sticky top-20 rounded-lg border bg-card p-5 space-y-4 shadow-sm">
              <h3 className="text-base font-semibold">Tóm tắt giá</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Số đêm</span><span>{numNights} đêm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Giá / đêm</span><span>{formatVND(watchRoomRate)}</span></div>
                <div className="border-t pt-2 flex justify-between text-base font-semibold"><span>Tổng tiền phòng</span><span>{formatVND(totalAmount)}</span></div>
              </div>

              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiền đặt cọc (VND)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0" 
                        {...field} 
                        value={formatInputNumber(field.value)}
                        onChange={(e) => {
                          const numericValue = parseInputNumber(e.target.value);
                          field.onChange(numericValue);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="rounded-md bg-muted/50 px-3 py-2.5 space-y-1 text-sm font-bold border-t">
                <div className="flex justify-between"><span>Còn lại</span><span className={remaining > 0 ? "text-orange-600" : "text-emerald-600"}>{formatVND(remaining)}</span></div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={loading} className="w-full">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Xác nhận đặt phòng</Button>
                <Button variant="outline" type="button" onClick={() => router.back()} className="w-full">Hủy</Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}