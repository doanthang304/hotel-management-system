"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  BedDouble, 
  Users, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    toast.success("Thiết lập hoàn tất!");
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Chào mừng bạn đến với Tiny HMS</CardTitle>
          <CardDescription>Hãy hoàn thành các bước thiết lập cơ bản để bắt đầu quản lý khách sạn.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
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

          {step === 1 && (
            <div className="space-y-4 py-4 text-center">
              <Building2 className="h-16 w-16 mx-auto text-primary opacity-20" />
              <h3 className="text-xl font-semibold">Thông tin khách sạn</h3>
              <p className="text-muted-foreground">Chúng tôi đã lấy thông tin cơ bản từ lúc bạn đăng ký. Bạn có muốn cập nhật thêm logo hay địa chỉ chính xác không?</p>
              <Button onClick={() => setStep(2)}>Tiếp theo <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-4 text-center">
              <BedDouble className="h-16 w-16 mx-auto text-primary opacity-20" />
              <h3 className="text-xl font-semibold">Cài đặt phòng</h3>
              <p className="text-muted-foreground">Tiny HMS cần ít nhất một hạng phòng và một số phòng để bạn có thể tạo booking.</p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={() => setStep(1)}>Quay lại</Button>
                <Button onClick={() => setStep(3)}>Tiếp theo <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-4 text-center">
              <Users className="h-16 w-16 mx-auto text-primary opacity-20" />
              <h3 className="text-xl font-semibold">Sẵn sàng!</h3>
              <p className="text-muted-foreground">Mọi thứ đã sẵn sàng. Bạn có thể bắt đầu nhận khách ngay bây giờ.</p>
              <div className="flex justify-center space-x-4">
                <Button variant="outline" onClick={() => setStep(2)}>Quay lại</Button>
                <Button onClick={handleComplete}>Khám phá Dashboard</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
