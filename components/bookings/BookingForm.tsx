"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Search, Star, X } from "lucide-react";
import { cn, formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
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
import { Checkbox } from "@/components/ui/checkbox";

// ─── Schema ───────────────────────────────────────────────────────────────────

const bookingFormSchema = z.object({
  roomId: z.string().min(1, "Vui lòng chọn phòng"),
  guestId: z.string().optional(),
  guestFullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  guestPhone: z.string().optional(),
  guestIdNumber: z.string().optional(),
  guestIdType: z.enum(["CCCD", "PASSPORT", "DRIVER_LICENSE", "OTHER"]),
  guestNationality: z.string(),
  guestIsVip: z.boolean(),
  checkInDate: z.instanceof(Date, { message: "Vui lòng chọn ngày nhận phòng" }),
  checkOutDate: z.instanceof(Date, { message: "Vui lòng chọn ngày trả phòng" }),
  roomRate: z.number().min(0, "Giá phòng không hợp lệ"),
  depositAmount: z.number().min(0),
  source: z.enum(["DIRECT", "PHONE", "WALKIN", "BOOKING_COM", "AGODA", "AIRBNB", "OTHER"]),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

// ─── Sub-types ────────────────────────────────────────────────────────────────

type RoomOption = {
  id: string;
  roomNumber: string;
  status: string;
  roomType: { name: string; roomPrices: { pricePerNight: number; isDefault: boolean }[] };
};

type GuestOption = {
  id: string;
  fullName: string;
  phone: string | null;
  idType: string;
  idNumber: string | null;
  nationality: string | null;
  isVip: boolean;
  totalStays: number;
};

// ─── GuestSearch ─────────────────────────────────────────────────────────────

function GuestSearch({ onSelect }: { onSelect: (g: GuestOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GuestOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/guests?search=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data?.slice(0, 8) ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Tìm khách cũ theo tên / số điện thoại..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 pr-8"
        />
        {(query || loading) && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg overflow-hidden">
          {results.map((g) => (
            <button
              key={g.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors text-sm"
              onClick={() => {
                onSelect(g);
                setQuery("");
                setResults([]);
                setOpen(false);
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate flex items-center gap-1">
                  {g.fullName}
                  {g.isVip && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {g.phone ?? "–"} · {g.idType} {g.idNumber ?? "–"}
                </p>
              </div>
              <span className="flex-none text-xs text-muted-foreground whitespace-nowrap">
                {g.totalStays} lần ở
              </span>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover px-3 py-2.5 text-sm text-muted-foreground shadow-lg">
          Không tìm thấy khách — điền thông tin mới bên dưới
        </div>
      )}
    </div>
  );
}

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
      {/* Filter tabs */}
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
      {/* Grid */}
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
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Không có phòng trống cho loại này.
        </p>
      )}
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
      guestIsVip: false,
      roomId: "",
      checkInDate: new Date(),
      checkOutDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      roomRate: 0,
      depositAmount: 0,
      source: "DIRECT" as const,
      specialRequests: "",
      internalNotes: "",
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

    if (!roomId && !checkIn && !checkOut) {
      initializedFromQuery.current = true;
      return;
    }

    if (roomId) {
      form.setValue("roomId", roomId);
    }

    const parseDateParam = (value: string | null) => {
      if (!value) return null;
      const parsed = new Date(`${value}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const checkInDate = parseDateParam(checkIn);
    const checkOutDate = parseDateParam(checkOut);

    if (checkInDate) {
      form.setValue("checkInDate", checkInDate);
    }

    if (checkOutDate && checkInDate && checkOutDate > checkInDate) {
      form.setValue("checkOutDate", checkOutDate);
    } else if (checkInDate) {
      form.setValue("checkOutDate", new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000));
    }

    initializedFromQuery.current = true;
  }, [form, searchParams]);

  // Auto-fill price when room selected
  useEffect(() => {
    if (watchRoomId) {
      const selectedRoom = rooms.find((r) => r.id === watchRoomId);
      if (selectedRoom && (selectedRoom.roomType.roomPrices?.length ?? 0) > 0) {
        const prices = selectedRoom.roomType.roomPrices;
        const defaultPrice = prices.find((p) => p.isDefault) ?? prices[0];
        if (defaultPrice) {
          form.setValue("roomRate", Number(defaultPrice.pricePerNight));
        }
      }
    }
  }, [watchRoomId, rooms, form]);

  // Fill form from guest search
  function handleGuestSelect(g: GuestOption) {
    form.setValue("guestId", g.id);
    form.setValue("guestFullName", g.fullName);
    form.setValue("guestPhone", g.phone ?? "");
    form.setValue("guestIdType", (g.idType as BookingFormValues["guestIdType"]) ?? "CCCD");
    form.setValue("guestIdNumber", g.idNumber ?? "");
    form.setValue("guestNationality", g.nationality ?? "Việt Nam");
    form.setValue("guestIsVip", g.isVip);
    toast.success(`Đã điền thông tin: ${g.fullName}`);
  }

  async function onSubmit(data: BookingFormValues) {
    if (numNights <= 0) {
      toast.error("Ngày trả phòng phải sau ngày nhận phòng");
      return;
    }
    setLoading(true);
    try {
      // Clean up empty guestId so it becomes undefined
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
          {/* ── Left / Main ── */}
          <div className="space-y-8">
            {/* Guest Info */}
            <div className="rounded-lg border p-5 space-y-4">
              <h3 className="text-base font-semibold">Thông tin khách hàng</h3>

              {/* Guest search */}
              <div className="space-y-1">
                <p className="text-sm font-medium">Tìm khách cũ</p>
                <GuestSearch onSelect={handleGuestSelect} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guestFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ và tên (*)</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyễn Văn A" {...field} />
                      </FormControl>
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
                        <Input placeholder="090..." {...field} />
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
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CCCD">CCCD</SelectItem>
                          <SelectItem value="PASSPORT">Passport</SelectItem>
                          <SelectItem value="DRIVER_LICENSE">GPLX</SelectItem>
                          <SelectItem value="OTHER">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestNationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quốc tịch</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guestIsVip"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 h-fit self-end">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="leading-none">
                        <FormLabel className="flex items-center gap-1 cursor-pointer">
                          <Star className="h-3.5 w-3.5 text-amber-500" />
                          Khách VIP
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Booking Details */}
            <div className="rounded-lg border p-5 space-y-4">
              <h3 className="text-base font-semibold">Thông tin đặt phòng</h3>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="checkInDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Ngày nhận phòng</FormLabel>
                      <Popover>
                        <PopoverTrigger
                          className={cn(
                            "inline-flex h-8 w-full items-center justify-start gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-normal transition-all hover:bg-muted",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
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
                        <PopoverTrigger
                          className={cn(
                            "inline-flex h-8 w-full items-center justify-start gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-normal transition-all hover:bg-muted",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date <= (watchCheckIn || new Date())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Room picker */}
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chọn phòng (*)</FormLabel>
                    <FormControl>
                      <RoomGrid
                        rooms={rooms}
                        selectedId={field.value}
                        onSelect={(r) => field.onChange(r.id)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Room rate */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="roomRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Giá mỗi đêm (VND)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
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
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DIRECT">Trực tiếp</SelectItem>
                          <SelectItem value="PHONE">Điện thoại</SelectItem>
                          <SelectItem value="WALKIN">Walk-in</SelectItem>
                          <SelectItem value="BOOKING_COM">Booking.com</SelectItem>
                          <SelectItem value="AGODA">Agoda</SelectItem>
                          <SelectItem value="AIRBNB">Airbnb</SelectItem>
                          <SelectItem value="OTHER">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="rounded-lg border p-5 space-y-4">
              <h3 className="text-base font-semibold">Ghi chú</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialRequests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yêu cầu đặc biệt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="VD: Không hút thuốc, tầng cao..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="internalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghi chú nội bộ</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Thông tin chỉ nhân viên thấy..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* ── Right / Price Summary ── */}
          <div className="space-y-4">
            <div className="sticky top-20 rounded-lg border bg-card p-5 space-y-4 shadow-sm">
              <h3 className="text-base font-semibold">Tóm tắt giá</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số đêm</span>
                  <span className="font-medium">{numNights} đêm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giá / đêm</span>
                  <span className="font-medium">{formatVND(watchRoomRate)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-base font-semibold">
                  <span>Tổng tiền phòng</span>
                  <span>{formatVND(totalAmount)}</span>
                </div>
              </div>

              {/* Deposit */}
              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiền đặt cọc (VND)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md bg-muted/50 px-3 py-2.5 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Đặt cọc</span>
                  <span className="text-green-600 font-medium">− {formatVND(watchDeposit ?? 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1.5 mt-1.5">
                  <span>Còn lại</span>
                  <span className={remaining > 0 ? "text-orange-600" : "text-emerald-600"}>
                    {formatVND(remaining)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Xác nhận đặt phòng
                </Button>
                <Button variant="outline" type="button" onClick={() => router.back()} className="w-full">
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
