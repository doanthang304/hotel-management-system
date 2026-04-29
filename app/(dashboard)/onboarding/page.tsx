"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  BedDouble, 
  Users, 
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import { formatVND } from "@/lib/utils";

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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Data
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Forms
  const [rtName, setRtName] = useState("");
  const [rtPrice, setRtPrice] = useState("");
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
      console.error("Error fetching onboarding data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rtName || !rtPrice) return toast.error("Vui lòng điền đủ thông tin");
    setLoadingRt(true);
    try {
      const res = await fetch("/api/room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rtName,
          pricePerNight: Number(rtPrice),
          maxOccupancy: Number(rtOccupancy),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success("Tạo loại phòng thành công");
      setRtName("");
      setRtPrice("");
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
      setRNumber(""); // Reset cho phòng tiếp theo
      setRooms([...rooms, data.data]);
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setLoadingR(false);
    }
  };

  const handleComplete = () => {
    toast.success("Thiết lập hoàn tất!");
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Thiết lập Tiny HMS</CardTitle>
          <CardDescription>Hoàn thành các bước cơ bản để bắt đầu sử dụng.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Progress bar */}
          <div className="flex justify-between relative px-8">
            <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 bg-white ${
                  step >= s ? "border-primary text-primary" : "border-slate-300 text-slate-300"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-6 w-6" /> : s}
              </div>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6 py-4 text-center">
              <Building2 className="h-16 w-16 mx-auto text-primary opacity-20" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Thông tin khách sạn</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Chào mừng bạn đến với Tiny HMS. Để phần mềm hoạt động đúng chức năng cốt lõi (Lịch phòng), bạn cần thiết lập ít nhất 1 loại phòng và 1 phòng.
                </p>
              </div>
              <Button size="lg" onClick={() => setStep(2)}>
                Bắt đầu thiết lập <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <BedDouble className="h-12 w-12 mx-auto text-primary opacity-20" />
                <h3 className="text-xl font-semibold">Tạo Loại Phòng</h3>
                <p className="text-sm text-muted-foreground">
                  Ví dụ: Standard, Deluxe, Ban Công, Giường đôi...
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Form */}
                <form onSubmit={handleCreateRoomType} className="space-y-4 rounded-lg border p-4 bg-slate-50/50">
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
                    <Label>Giá mặc định (VNĐ) (*)</Label>
                    <Input 
                      type="number" 
                      placeholder="VD: 500000" 
                      value={rtPrice} 
                      onChange={(e) => setRtPrice(e.target.value)} 
                      required 
                      min="0"
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
                    Thêm loại phòng
                  </Button>
                </form>

                {/* List */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Danh sách đã tạo ({roomTypes.length})</h4>
                  <div className="border rounded-lg bg-white overflow-y-auto max-h-[300px]">
                    {roomTypes.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Chưa có loại phòng nào
                      </div>
                    ) : (
                      <div className="divide-y">
                        {roomTypes.map((rt) => (
                          <div key={rt.id} className="p-3 text-sm flex justify-between items-center hover:bg-slate-50">
                            <div>
                              <p className="font-medium">{rt.name}</p>
                              <p className="text-xs text-muted-foreground">Tối đa: {rt.maxOccupancy} khách</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-emerald-600">
                                {rt.roomPrices?.[0] ? formatVND(rt.roomPrices[0].pricePerNight) : 'Chưa có giá'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>Quay lại</Button>
                <Button 
                  onClick={() => setStep(3)} 
                  disabled={roomTypes.length === 0}
                >
                  Tiếp theo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-2">
                <Users className="h-12 w-12 mx-auto text-primary opacity-20" />
                <h3 className="text-xl font-semibold">Tạo Phòng</h3>
                <p className="text-sm text-muted-foreground">
                  Thêm từng phòng và gắn vào loại phòng tương ứng.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Form */}
                <form onSubmit={handleCreateRoom} className="space-y-4 rounded-lg border p-4 bg-slate-50/50">
                  <div className="space-y-2">
                    <Label>Số phòng/Tên phòng (*)</Label>
                    <Input 
                      placeholder="VD: 101, P101, R101..." 
                      value={rNumber} 
                      onChange={(e) => setRNumber(e.target.value)} 
                      required 
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thuộc loại phòng (*)</Label>
                    <Select value={rTypeId} onValueChange={(val) => setRTypeId(val || "")} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại phòng..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map(rt => (
                          <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={loadingR || roomTypes.length === 0}>
                    {loadingR ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Thêm phòng này
                  </Button>
                </form>

                {/* List */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Phòng đã tạo ({rooms.length})</h4>
                  <div className="border rounded-lg bg-white overflow-y-auto max-h-[300px]">
                    {rooms.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Chưa có phòng nào
                      </div>
                    ) : (
                      <div className="divide-y">
                        {rooms.map((r) => (
                          <div key={r.id} className="p-3 text-sm flex justify-between items-center hover:bg-slate-50">
                            <span className="font-bold text-base">{r.roomNumber}</span>
                            <span className="text-muted-foreground bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {r.roomType.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(2)}>Quay lại</Button>
                <Button 
                  onClick={handleComplete}
                  disabled={rooms.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Hoàn tất thiết lập
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
