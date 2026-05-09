"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BedDouble, DoorOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type RoomType = {
  id: string;
  name: string;
  maxOccupancy: number;
  roomPrices: { pricePerNight: number }[];
  _count?: { rooms: number };
};

type Room = {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  roomType: { name: string };
};

function parseRoomNumbers(input: string) {
  return input
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function HotelSetupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("room-types");
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [rtName, setRtName] = useState("");
  const [rtOccupancy, setRtOccupancy] = useState("2");
  const [loadingRt, setLoadingRt] = useState(false);
  const [roomNumbersInput, setRoomNumbersInput] = useState("");
  const [rTypeId, setRTypeId] = useState("");
  const [loadingR, setLoadingR] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [deletingRTypeId, setDeletingRTypeId] = useState<string | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState("");
  const [editRoomTypeId, setEditRoomTypeId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const parsedRoomNumbers = useMemo(() => parseRoomNumbers(roomNumbersInput), [roomNumbersInput]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [rtRes, rRes] = await Promise.all([fetch("/api/room-types"), fetch("/api/rooms")]);

      if (rtRes.ok) {
        const rtJson = await rtRes.json();
        setRoomTypes(rtJson.data || []);
      }

      if (rRes.ok) {
        const rJson = await rRes.json();
        setRooms(rJson.data || []);
      }
    } catch (error) {
      console.error("Error fetching setup data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRoomType = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rtName) return toast.error("Vui lòng điền tên loại phòng");

    setLoadingRt(true);
    try {
      const res = await fetch("/api/room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rtName,
          maxOccupancy: Number(rtOccupancy),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Tạo loại phòng thành công");
      setRtName("");
      setRoomTypes((prev) => [...prev, data.data]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setLoadingRt(false);
    }
  };

  const handleDeleteRoomType = async (roomType: RoomType) => {
    // Kiểm tra nhanh ở frontend (Backend cũng đã chặn việc này)
    if (roomType._count?.rooms && roomType._count.rooms > 0) {
      return toast.error("Không thể xóa loại phòng đang có phòng sử dụng");
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa hạng phòng ${roomType.name}?`)) return;

    setDeletingRTypeId(roomType.id);
    try {
      const res = await fetch(`/api/room-types/${roomType.id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || `Đã xóa hạng phòng ${roomType.name}`);
      // Xóa khỏi danh sách hiển thị
      setRoomTypes((prev) => prev.filter((item) => item.id !== roomType.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa loại phòng");
    } finally {
      setDeletingRTypeId(null);
    }
  };

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rTypeId || parsedRoomNumbers.length === 0) {
      return toast.error("Vui lòng nhập danh sách phòng và chọn loại phòng");
    }

    setLoadingR(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomTypeId: rTypeId,
          roomNumbers: parsedRoomNumbers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || "Tạo phòng thành công");
      setRoomNumbersInput("");
      setRooms((prev) => [...prev, ...(data.data || [])]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setLoadingR(false);
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!confirm(`Xóa phòng ${room.roomNumber}?`)) return;

    setDeletingRoomId(room.id);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || `Đã xóa phòng ${room.roomNumber}`);
      setRooms((prev) => prev.filter((item) => item.id !== room.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa phòng");
    } finally {
      setDeletingRoomId(null);
    }
  };

  const openEditDialog = (room: Room) => {
    setEditingRoom(room);
    setEditRoomNumber(room.roomNumber);
    setEditRoomTypeId(room.roomTypeId);
  };

  const handleEditRoom = async () => {
    if (!editingRoom) return;
    if (!editRoomNumber.trim()) return toast.error("Số phòng không được để trống");
    if (!editRoomTypeId) return toast.error("Vui lòng chọn loại phòng");

    // No changes made
    if (editRoomNumber.trim() === editingRoom.roomNumber && editRoomTypeId === editingRoom.roomTypeId) {
      setEditingRoom(null);
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: editRoomNumber.trim(),
          roomTypeId: editRoomTypeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || "Cập nhật phòng thành công");
      // Update local state
      setRooms((prev) =>
        prev.map((r) => (r.id === editingRoom.id ? { ...r, ...data.data } : r))
      );
      setEditingRoom(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật phòng");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Thiết lập khách sạn</h2>
            <p className="text-sm text-muted-foreground">Quản lý cấu trúc phòng và loại phòng của bạn.</p>
          </div>
        </div>
        <Button onClick={() => router.push("/dashboard")} className="min-h-[44px] shrink-0">
          Về Dashboard
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid max-w-md w-full grid-cols-2">
          <TabsTrigger value="room-types" className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            Loại phòng
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            Phòng
          </TabsTrigger>
        </TabsList>

        <TabsContent value="room-types" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Thêm loại phòng</CardTitle>
                <CardDescription>Tạo các hạng phòng như Standard, Deluxe...</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRoomType} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tên loại phòng (*)</Label>
                    <Input placeholder="VD: Phòng Standard" value={rtName} onChange={(event) => setRtName(event.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Số khách tối đa</Label>
                    <Input type="number" value={rtOccupancy} onChange={(event) => setRtOccupancy(event.target.value)} min="1" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loadingRt}>
                    {loadingRt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Tạo loại phòng
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Danh sách loại phòng ({roomTypes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : roomTypes.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed py-8 text-center text-muted-foreground">
                    Chưa có loại phòng nào.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Tên loại phòng</th>
                        <th className="px-4 py-3 text-center font-medium">Sức chứa</th>
                        <th className="px-4 py-3 text-center font-medium">Số phòng</th>
                        {/* Thêm cột Thao tác */}
                        <th className="px-4 py-3 text-right font-medium w-16">Thao tác</th> 
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {roomTypes.map((roomType) => (
                        <tr key={roomType.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium">{roomType.name}</td>
                          <td className="px-4 py-3 text-center">{roomType.maxOccupancy} khách</td>
                          <td className="px-4 py-3 text-center">{roomType._count?.rooms || 0}</td>
                          {/* Thêm nút Xóa */}
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                              disabled={deletingRTypeId === roomType.id}
                              onClick={() => handleDeleteRoomType(roomType)}
                            >
                              {deletingRTypeId === roomType.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Thêm phòng mới</CardTitle>
                <CardDescription>Nhập nhiều phòng mùng loại bằng cách xuống dòng hoặc ngăn bằng dấu phẩy.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Số phòng (*)</Label>
                    <Textarea
                      rows={6}
                      placeholder={"VD: 101, 102, 103"}
                      value={roomNumbersInput}
                      onChange={(event) => setRoomNumbersInput(event.target.value)}
                      className="resize-none"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Sẽ tạo {parsedRoomNumbers.length} phòng.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Loại phòng (*)</Label>
                    <Select value={rTypeId} onValueChange={(value) => setRTypeId(value || "")} required>
                      <SelectTrigger>
                        {/* Bypass lỗi của thư viện bằng cách tự render tên nếu đã có rTypeId */}
                        {rTypeId ? (
                          <span className="flex-1 text-left">
                            {roomTypes.find((rt) => rt.id === rTypeId)?.name}
                          </span>
                        ) : (
                          <SelectValue placeholder="Chọn loại phòng..." />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((roomType) => (
                          <SelectItem key={roomType.id} value={roomType.id}>
                            {roomType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {parsedRoomNumbers.length > 0 && (
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">Xem nhanh</p>
                      <div className="flex flex-wrap gap-2">
                        {parsedRoomNumbers.map((roomNumber) => (
                          <span key={roomNumber} className="rounded-md border bg-background px-2 py-1 text-xs font-medium">
                            {roomNumber}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loadingR || roomTypes.length === 0 || parsedRoomNumbers.length === 0}>
                    {loadingR ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Tạo phòng
                  </Button>
                  {roomTypes.length === 0 && (
                    <p className="mt-2 text-center text-[10px] text-destructive">
                      Bạn cần tạo Loại phòng trước khi tạo Phòng.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>Danh sách phòng ({rooms.length})</CardTitle>
                  <Link href="/rooms" className={buttonVariants({ variant: "outline" })}>
                    Xem trang phòng
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : rooms.length === 0 ? (
                  <div className="rounded-lg border-2 border-dashed py-8 text-center text-muted-foreground">
                    Chưa có phòng nào.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rooms.map((room) => (
                      <div key={room.id} className="rounded-lg border bg-white p-3 transition-colors hover:border-primary dark:bg-slate-950">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="block text-xl font-bold">{room.roomNumber}</span>
                            <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] text-muted-foreground">
                              {room.roomType.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                              onClick={() => openEditDialog(room)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:bg-red-50 hover:text-red-600"
                              disabled={deletingRoomId === room.id}
                              onClick={() => handleDeleteRoom(room)}
                            >
                              {deletingRoomId === room.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Edit Room Dialog ── */}
      <Dialog open={!!editingRoom} onOpenChange={(open) => { if (!open) setEditingRoom(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa thông tin phòng</DialogTitle>
            <DialogDescription>
              Thay đổi số phòng hoặc loại phòng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-room-number">Số phòng</Label>
              <Input
                id="edit-room-number"
                value={editRoomNumber}
                onChange={(e) => setEditRoomNumber(e.target.value)}
                placeholder="VD: 303"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-room-type">Loại phòng</Label>
              <Select value={editRoomTypeId} onValueChange={(val) => setEditRoomTypeId(val || "")}>
                <SelectTrigger id="edit-room-type">
                  {editRoomTypeId ? (
                    <span className="flex-1 text-left">
                      {roomTypes.find((rt) => rt.id === editRoomTypeId)?.name}
                    </span>
                  ) : (
                    <SelectValue placeholder="Chọn loại phòng..." />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoom(null)} disabled={savingEdit}>
              Hủy
            </Button>
            <Button onClick={handleEditRoom} disabled={savingEdit}>
              {savingEdit ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
