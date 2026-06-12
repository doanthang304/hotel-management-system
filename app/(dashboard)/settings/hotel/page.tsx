"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, Building2, KeyRound, Mail, Sun, Moon, Palette } from "lucide-react";
import { toast } from "sonner";

export default function HotelSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: hotelData, isLoading: loading, mutate } = useSWR("/api/hotel", fetcher);
  const { theme, setTheme } = useTheme();

  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    currency: "VND",
    timezone: "Asia/Ho_Chi_Minh",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (hotelData?.data) {
      setFormData({
        name: hotelData.data.name || "",
        address: hotelData.data.address || "",
        phone: hotelData.data.phone || "",
        currency: hotelData.data.currency || "VND",
        timezone: hotelData.data.timezone || "Asia/Ho_Chi_Minh",
      });
    }
  }, [hotelData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/hotel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Cập nhật thông tin thành công");
        mutate();
      } else {
        toast.error(json.error || "Cập nhật thất bại");
      }
    } catch (error) {
      console.error("Error updating hotel info:", error);
      toast.error("Có lỗi xảy ra khi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Đổi mật khẩu thành công");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(json.error || "Đổi mật khẩu thất bại");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Có lỗi xảy ra");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Thông tin khách sạn</h2>
            <p className="text-sm text-muted-foreground">Quản lý thông tin hồ sơ và cấu hình chung của khách sạn.</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* ── Hotel Info Card ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5 text-primary" />
              Thông tin chung
            </CardTitle>
            <CardDescription>
              Thông tin này sẽ được hiển thị trên hóa đơn và các báo cáo của khách sạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên khách sạn (*)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="VD: Khách sạn Tiny"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Địa chỉ</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Số điện thoại</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="VD: 0901234567"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="userEmail" className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      Email tài khoản
                    </Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={session?.user?.email ?? ""}
                      readOnly
                      disabled
                      className="bg-muted/50 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">Email đăng nhập của tài khoản, không thể thay đổi.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Tiền tệ</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(val) => setFormData({ ...formData, currency: val ?? "VND" })}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Chọn tiền tệ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VND">VND - Việt Nam Đồng</SelectItem>
                        <SelectItem value="USD">USD - Đô la Mỹ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="timezone">Múi giờ</Label>
                    <Select
                      value={formData.timezone}
                      onValueChange={(val) => setFormData({ ...formData, timezone: val ?? "Asia/Ho_Chi_Minh" })}
                    >
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Chọn múi giờ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Ho_Chi_Minh">Hồ Chí Minh (GMT+7)</SelectItem>
                        <SelectItem value="UTC">UTC / GMT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={saving} className="min-w-[120px] min-h-[44px]">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── Theme Settings Card ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Palette className="h-5 w-5 text-primary" />
              Giao diện hệ thống
            </CardTitle>
            <CardDescription>
              Tùy chỉnh chế độ hiển thị sáng/tối phù hợp với môi trường làm việc của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Label htmlFor="theme-toggle" className="text-base font-semibold">Chế độ tối (Dark Mode)</Label>
                <p className="text-sm text-muted-foreground">
                  Chuyển đổi toàn bộ giao diện của ứng dụng sang tông màu tối để bảo vệ mắt.
                </p>
              </div>
              
              {mounted ? (
                <button
                  id="theme-toggle"
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={`
                    relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                    transition-colors duration-300 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                    ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}
                  `}
                >
                  <span className="sr-only">Toggle dark mode</span>
                  <span
                    className={`
                      pointer-events-none flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-lg ring-0 
                      transition-transform duration-300 ease-in-out
                      ${theme === "dark" ? "translate-x-7" : "translate-x-0"}
                    `}
                  >
                    {theme === "dark" ? (
                      <Moon className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </span>
                </button>
              ) : (
                <div className="h-7 w-14 rounded-full bg-muted animate-pulse" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Change Password Card ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <KeyRound className="h-5 w-5 text-primary" />
              Đổi mật khẩu
            </CardTitle>
            <CardDescription>
              Để bảo mật tài khoản, hãy sử dụng mật khẩu mạnh và không chia sẻ cho người khác.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">Mật khẩu mới</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={changingPassword} variant="outline" className="min-w-[140px] min-h-[44px]">
                  {changingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Đổi mật khẩu
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
