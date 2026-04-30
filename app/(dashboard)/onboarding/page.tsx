"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  BedDouble, 
  DoorOpen, 
  Loader2,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import Link from "next/link";

type RoomType = {
  id: string;
  name: string;
  maxOccupancy: number;
  roomPrices: { pricePerNight: number }[];
};

type Room = {
  id: string;
  roomNumber: string;
  roomType: { name: string };
};

export default function HotelSetupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("room-types");
  
  // Data
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Forms
  const [rtName, setRtName] = useState("");
  const [rtOccupancy, setRtOccupancy] = useState("2");
  const [loadingRt, setLoadingRt] = useState(false);

  const [rNumber, setRNumber] = useState("");
  const [rTypeId, setRTypeId] = useState("");
  const [loadingR, setLoadingR] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [rtRes, rRes] = await Promise.all([
        fetch("/api/room-types"),
        fetch("/api/rooms")
      ]);
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

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setRoomTypes([...roomTypes, data.data]);
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setLoadingRt(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rNumber || !rTypeId) return toast.error("Vui lòng nhập số phòng và chọn loại phòng");
    setLoadingR(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: rNumber,
          roomTypeId: rTypeId, 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(`Đã tạo phòng ${rNumber}`);
      setRNumber("");
      setRooms([...rooms, data.data]);
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setLoadingR(false);
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="room-types" className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" />
            Loại phòng
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4" />
            Phòng
          </TabsTrigger>
        </TabsList>

        {/* ROOM TYPES TAB */}
        <TabsContent value="room-types" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Thêm loại phòng</CardTitle>
                <CardDescription>Tạo các hạng phòng như Standard, Deluxe...</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRoomType} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tên loại phòng (*)</Label>
                    <Input 
                      placeholder="VD: Phòng Standard" 
                      value={rtName} 
                      onChange={(e) => setRtName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Số khách tối đa</Label>
                    <Input 
                      type="number" 
                      value={rtOccupancy} 
                      onChange={(e) => setRtOccupancy(e.target.value)} 
                      min="1"
                    />
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
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    Chưa có loại phòng nào.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Tên loại phòng</th>
                          <th className="px-4 py-3 text-center font-medium">Sức chứa</th>
                          <th className="px-4 py-3 text-center font-medium">Số phòng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {roomTypes.map((rt: any) => (
                          <tr key={rt.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium">{rt.name}</td>
                            <td className="px-4 py-3 text-center">{rt.maxOccupancy} khách</td>
                            <td className="px-4 py-3 text-center">{(rt as any)._count?.rooms || 0}</td>
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

        {/* ROOMS TAB */}
        <TabsContent value="rooms" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Thêm phòng mới</CardTitle>
                <CardDescription>Đánh số phòng và gán vào loại phòng.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Số phòng (*)</Label>
                    <Input 
                      placeholder="VD: 101, P101..." 
                      value={rNumber} 
                      onChange={(e) => setRNumber(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Loại phòng (*)</Label>
                    <Select value={rTypeId} onValueChange={(val) => setRTypeId(val || "")} required>
                       
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại phòng..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map(rt => (
                          <SelectItem key={rt.id} value={rt.id.toString()}>{rt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loadingR || roomTypes.length === 0}>
                    {loadingR ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Tạo phòng
                  </Button>
                  {roomTypes.length === 0 && (
                    <p className="text-[10px] text-destructive text-center mt-2">
                      Bạn cần tạo Loại phòng trước khi tạo Phòng.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Danh sách phòng ({rooms.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    Chưa có phòng nào.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {rooms.map((r) => (
                      <div key={r.id} className="p-3 border rounded-lg flex flex-col items-center justify-center gap-1 bg-white hover:border-primary transition-colors">
                        <span className="text-xl font-bold">{r.roomNumber}</span>
                        <span className="text-[10px] text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                          {r.roomType.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
