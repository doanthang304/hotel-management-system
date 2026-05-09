import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 text-primary">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm font-medium">Đang tải...</span>
      </div>
    </div>
  );
}
