"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn, formatVND } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const bookingFormSchema = z.object({
  roomId: z.string().min(1, "Vui lòng chọn phòng"),
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

export function BookingForm() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
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

  useEffect(() => {
    async function fetchRooms() {
      const res = await fetch("/api/rooms?status=AVAILABLE");
      const json = await res.json();
      setRooms(json.data || []);
    }
    fetchRooms();
  }, []);

  useEffect(() => {
    if (watchRoomId) {
      const selectedRoom = rooms.find(r => r.id === watchRoomId);
      if (selectedRoom && selectedRoom.roomType.roomPrices?.length > 0) {
        // Find default price
        const defaultPrice = selectedRoom.roomType.roomPrices.find((p: any) => p.isDefault) || selectedRoom.roomType.roomPrices[0];
        form.setValue("roomRate", defaultPrice.pricePerNight);
      }
    }
  }, [watchRoomId, rooms, form]);

  const numNights = (watchCheckIn && watchCheckOut && watchCheckOut > watchCheckIn) 
    ? differenceInDays(watchCheckOut, watchCheckIn) 
    : 0;

  async function onSubmit(data: BookingFormValues) {
    if (numNights <= 0) {
      toast.error("Ngày trả phòng phải sau ngày nhận phòng");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          checkInDate: data.checkInDate.toISOString(),
          checkOutDate: data.checkOutDate.toISOString(),
          numNights,
        }),
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Cột trái: Thông tin khách hàng */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Thông tin khách hàng</h3>
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guestIdType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại giấy tờ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>
            <FormField
              control={form.control}
              name="guestIsVip"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Khách hàng VIP</FormLabel>
                    <FormDescription>
                      Đánh dấu nếu đây là khách hàng quan trọng.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Cột phải: Thông tin đặt phòng */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Thông tin đặt phòng</h3>
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chọn phòng (*)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn phòng trống" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Phòng {room.roomNumber} ({room.roomType.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="checkInDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Ngày nhận phòng</FormLabel>
                    <Popover>
                      <PopoverTrigger render={
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        />
                      }>
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Chọn ngày</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0,0,0,0))
                          }
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
                      <PopoverTrigger render={
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        />
                      }>
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Chọn ngày</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date <= (watchCheckIn || new Date())
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg flex justify-between items-center text-sm">
              <span className="font-medium">Số đêm:</span>
              <span className="font-bold text-lg">{numNights} đêm</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roomRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá mỗi đêm</FormLabel>
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
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tiền đặt cọc</FormLabel>
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="specialRequests"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Yêu cầu đặc biệt</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="VD: Không hút thuốc, tầng cao, thêm gối..." 
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

        <div className="flex justify-end space-x-4">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Hủy
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận đặt phòng
          </Button>
        </div>
      </form>
    </Form>
  );
}
