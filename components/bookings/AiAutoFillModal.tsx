"use client";

import { useState } from "react";
import { Loader2, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RoomCatalogItem = {
  id: string;
  roomNumber: string;
  roomType?: { name?: string | null } | null;
  status?: string | null;
};

type AiParsedBooking = {
  source: "WALKIN" | "FACEBOOK_ZALO" | "BOOKING_COM" | "AGODA" | "AIRBNB" | "INTERNAL_OTA" | "OTHER";
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

interface AiAutoFillModalProps {
  rooms: RoomCatalogItem[];
  onSuccess: (data: AiParsedBooking) => void;
}

export function AiAutoFillModal({ rooms, onSuccess }: AiAutoFillModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [emailContent, setEmailContent] = useState("");

  async function handleAutoFillFromEmail() {
    if (emailContent.trim().length < 20) {
      toast.error("Nội dung email quá ngắn để phân tích");
      return;
    }

    setAiLoading(true);
    try {
      const roomCatalog = rooms.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        roomTypeName: room.roomType?.name || "",
        status: room.status,
      }));

      const res = await fetch("/api/ai/parse-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailContent, roomCatalog }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Không thể phân tích email booking");

      const data = json.data as AiParsedBooking;
      onSuccess(data);

      if (data.warnings?.length) {
        toast.warning(data.warnings[0]);
      } else {
        toast.success("Đã tự động điền thông tin từ email");
      }

      setIsOpen(false);
      setEmailContent("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể phân tích email booking");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-tight text-primary">Tự động điền AI</h3>
        <p className="mt-0.5 text-xs text-muted-foreground sm:max-w-md">
          Paste email rồi bấm một nút, không cần đọc lại nội dung trong modal.
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="w-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
      >
        <WandSparkles className="mr-2 h-4 w-4" />
        Mở AI
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex max-h-[calc(100vh-1rem)] w-[min(28rem,calc(100vw-1rem))] flex-col overflow-y-auto overflow-x-hidden p-3 text-xs sm:p-4 sm:text-sm">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-semibold leading-tight sm:text-base">
              Trích xuất email
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
              Dán mail vào đây, AI sẽ tự điền phần cần thiết.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 py-1">
            <Textarea
              value={emailContent}
              onChange={(event) => setEmailContent(event.target.value)}
              placeholder="Paste nội dung email..."
              className="h-48={true} resize-none overflow-y-auto text-sm sm:h-[250px] [field-sizing:fixed]"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleAutoFillFromEmail}
              disabled={aiLoading || emailContent.trim().length < 20}
              className="w-full sm:w-auto"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý
                </>
              ) : (
                <>
                  <WandSparkles className="mr-2 h-4 w-4" />
                  Điền form
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
