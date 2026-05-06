"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { differenceInDays, format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, WandSparkles } from "lucide-react";
import { cn, formatInputNumber, formatVND, parseInputNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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

type RoomOption = {
  id: string;
  roomNumber: string;
  status: string;
  roomType: { name: string; roomPrices?: { pricePerNight: number; isDefault: boolean }[] };
};

type BookingFormInitialData = {
  id: string;
  bookingCode: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  numNights: number;
  roomRate: number;
  depositAmount: number;
  source: BookingFormValues["source"];
  specialRequests?: string | null;
  internalNotes?: string | null;
  guest: {
    fullName: string;
    phone?: string | null;
    idNumber?: string | null;
    idType: "CCCD" | "PASSPORT" | "OTHER" | "DRIVER_LICENSE";
    nationality?: string | null;
  };
};

type ParsedBookingAutofill = {
  source: BookingFormValues["source"];
  bookingCode: string | null;
  guestFullName: string | null;
  guestPhone: string | null;
  guestIdNumber: string | null;
  guestIdType: "CCCD" | "PASSPORT" | "OTHER" | null;
  guestNationality: string | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  numNights: number | null;
  roomRate: number | null;
  depositAmount: number | null;
  specialRequests: string | null;
  internalNotes: string | null;
  roomId: string | null;
  roomNumber: string | null;
  roomTypeName: string | null;
  confidence: number;
  warnings: string[];
};

function RoomGrid({
  rooms,
  selectedId,
  onSelect,
}: {
  rooms: RoomOption[];
  selectedId: string;
  onSelect: (room: RoomOption) => void;
}) {
  const [filterType, setFilterType] = useState<string>("all");
  const types = Array.from(new Set(rooms.map((room) => room.roomType.name)));
  const filteredRooms = filterType === "all" ? rooms : rooms.filter((room) => room.roomType.name === filterType);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
            filterType === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
          )}
        >
          Tất cả
        </button>
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilterType(type)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              filterType === type ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
            )}
          >
            {type}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {filteredRooms.map((room) => {
          const isSelected = room.id === selectedId;

          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room)}
              className={cn(
                "flex flex-col items-center rounded-lg border p-2 text-center text-xs transition-all",
                "hover:border-primary/60 hover:bg-primary/5",
                isSelected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border"
              )}
            >
              <span className="text-base font-bold leading-tight">{room.roomNumber}</span>
              <span className="w-full truncate text-[10px] leading-tight text-muted-foreground">
                {room.roomType.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type BookingFormProps = {
  mode?: "create" | "edit";
  bookingId?: string;
  initialData?: BookingFormInitialData;
};

const defaultCheckInDate = new Date();
const defaultCheckOutDate = new Date(new Date().setDate(new Date().getDate() + 1));

export function BookingForm({ mode = "create", bookingId, initialData }: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const initializedFromQuery = useRef(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      guestId: "",
      guestFullName: "",
      guestPhone: "",
      guestIdNumber: "",
      guestIdType: "CCCD",
      guestNationality: "Việt Nam",
      roomId: "",
      checkInDate: defaultCheckInDate,
      checkOutDate: defaultCheckOutDate,
      roomRate: 0,
      depositAmount: 0,
      source: "WALKIN",
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
      const res = await fetch("/api/rooms");
      const json = await res.json();
      setRooms(json.data || []);
    }

    fetchRooms();
  }, []);

  useEffect(() => {
    if (!initialData) return;

    form.reset({
      guestId: "",
      guestFullName: initialData.guest.fullName,
      guestPhone: initialData.guest.phone || "",
      guestIdNumber: initialData.guest.idNumber || "",
      guestIdType: initialData.guest.idType === "DRIVER_LICENSE" ? "OTHER" : initialData.guest.idType,
      guestNationality: initialData.guest.nationality || "Việt Nam",
      roomId: initialData.roomId,
      checkInDate: new Date(initialData.checkInDate),
      checkOutDate: new Date(initialData.checkOutDate),
      roomRate: Number(initialData.roomRate),
      depositAmount: Number(initialData.depositAmount),
      source: initialData.source,
      specialRequests: initialData.specialRequests || "",
      internalNotes: initialData.internalNotes || "",
      bookingCode: initialData.bookingCode || "",
    });
  }, [form, initialData]);

  useEffect(() => {
    if (mode !== "create" || initializedFromQuery.current) return;

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
  }, [form, mode, searchParams]);

  const selectableRooms = useMemo(() => {
    return rooms.filter((room) => room.status === "AVAILABLE" || room.id === watchRoomId || room.id === initialData?.roomId);
  }, [initialData?.roomId, rooms, watchRoomId]);

  function parseDateInput(value: string | null) {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function applyParsedBooking(data: ParsedBookingAutofill) {
    const matchedRoom = data.roomId
      ? rooms.find((room) => room.id === data.roomId)
      : data.roomNumber
        ? rooms.find((room) => room.roomNumber.toLowerCase() === data.roomNumber?.toLowerCase())
        : undefined;

    if (data.guestFullName) form.setValue("guestFullName", data.guestFullName, { shouldDirty: true });
    if (data.guestPhone) form.setValue("guestPhone", data.guestPhone.replace(/\D/g, ""), { shouldDirty: true });
    if (data.guestIdNumber) form.setValue("guestIdNumber", data.guestIdNumber, { shouldDirty: true });
    if (data.guestIdType) form.setValue("guestIdType", data.guestIdType, { shouldDirty: true });
    if (data.guestNationality) form.setValue("guestNationality", data.guestNationality, { shouldDirty: true });
    if (data.bookingCode) form.setValue("bookingCode", data.bookingCode, { shouldDirty: true });
    if (typeof data.roomRate === "number") form.setValue("roomRate", data.roomRate, { shouldDirty: true });
    if (typeof data.depositAmount === "number") form.setValue("depositAmount", data.depositAmount, { shouldDirty: true });
    if (data.specialRequests) form.setValue("specialRequests", data.specialRequests, { shouldDirty: true });
    if (data.internalNotes) form.setValue("internalNotes", data.internalNotes, { shouldDirty: true });
    if (data.source) form.setValue("source", data.source, { shouldDirty: true });

    const parsedCheckIn = parseDateInput(data.checkInDate);
    const parsedCheckOut = parseDateInput(data.checkOutDate);
    if (parsedCheckIn) form.setValue("checkInDate", parsedCheckIn, { shouldDirty: true });
    if (parsedCheckOut) form.setValue("checkOutDate", parsedCheckOut, { shouldDirty: true });
    if (matchedRoom) form.setValue("roomId", matchedRoom.id, { shouldDirty: true });
  }

  async function handleAutoFillFromEmail() {
    if (mode !== "create") return;
    if (emailContent.trim().length < 20) {
      toast.error("Nội dung email quá ngắn để phân tích");
      return;
    }

    setAiLoading(true);
    try {
      const roomCatalog = rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        roomTypeName: room.roomType.name,
        status: room.status,
      }));

      const res = await fetch("/api/ai/parse-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailContent,
          roomCatalog,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Không thể phân tích email booking");
      }

      const data = json.data as ParsedBookingAutofill;
      applyParsedBooking(data);

      if (data.warnings.length > 0) {
        toast.warning(data.warnings[0]);
      } else {
        toast.success("Đã tự động điền thông tin từ email");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể phân tích email booking");
    } finally {
      setAiLoading(false);
    }
  }

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

      const isEdit = mode === "edit" && bookingId;
      const res = await fetch(isEdit ? `/api/bookings/${bookingId}` : "/api/bookings", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || (isEdit ? "Không thể cập nhật booking" : "Không thể tạo booking"));
      }

      toast.success(isEdit ? "Đã cập nhật booking" : "Tạo booking thành công");
      router.push(isEdit ? `/bookings/${bookingId}` : "/bookings");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            {mode === "create" && (
              <div className="space-y-4 rounded-lg border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">Tự động tạo booking từ email</h3>
                    <p className="text-sm text-muted-foreground">
                      Paste nội dung email từ Booking.com, Agoda hoặc Airbnb để AI tự điền form.
                    </p>
                  </div>
                  <Button type="button" onClick={handleAutoFillFromEmail} disabled={aiLoading} className="shrink-0">
                    {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                    Tự động điền
                  </Button>
                </div>
                <Textarea
                  value={emailContent}
                  onChange={(event) => setEmailContent(event.target.value)}
                  placeholder="Paste toàn bộ nội dung email xác nhận booking vào đây..."
                  className="min-h-40 resize-y"
                />
              </div>
            )}

            <div className="space-y-4 rounded-lg border p-5">
              <h3 className="text-base font-semibold">Thông tin khách hàng</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                          onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))}
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
                          onChange={(event) => {
                            const type = form.getValues("guestIdType");
                            let value = event.target.value;
                            if (type === "CCCD") value = value.replace(/\D/g, "");
                            if (type === "PASSPORT") value = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
                            field.onChange(value);
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

            <div className="space-y-4 rounded-lg border p-5">
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
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
                      <RoomGrid rooms={selectableRooms} selectedId={field.value} onSelect={(room) => field.onChange(room.id)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                          onChange={(event) => field.onChange(parseInputNumber(event.target.value))}
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

            <div className="space-y-4 rounded-lg border p-5">
              <h3 className="text-base font-semibold">Ghi chú</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <div className="sticky top-20 space-y-4 rounded-lg border bg-card p-5 shadow-sm">
              <h3 className="text-base font-semibold">Tóm tắt giá</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Số đêm</span><span>{numNights} đêm</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Giá / đêm</span><span>{formatVND(watchRoomRate)}</span></div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Tổng tiền phòng</span><span>{formatVND(totalAmount)}</span></div>
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
                        onChange={(event) => field.onChange(parseInputNumber(event.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="space-y-1 rounded-md border-t bg-muted/50 px-3 py-2.5 text-sm font-bold">
                <div className="flex justify-between">
                  <span>Còn lại</span>
                  <span className={remaining > 0 ? "text-orange-600" : "text-emerald-600"}>{formatVND(remaining)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "edit" ? "Lưu thay đổi" : "Xác nhận đặt phòng"}
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
