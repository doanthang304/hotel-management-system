"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type HousekeepingTask = {
  id: string;
  room: { roomNumber: string; status: string };
  taskType: string;
  status: string;
  priority: string;
  assignedTo?: string;
  assignee?: { fullName: string };
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  PENDING: "Đang chờ",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
};

const priorityVariants: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  HIGH: "bg-red-100 text-red-800",
};

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/housekeeping");
      const json = await res.json();
      setTasks(json.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách công việc");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Quản lý Buồng phòng</h2>
        <Button onClick={fetchTasks} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phòng</TableHead>
              <TableHead>Công việc</TableHead>
              <TableHead>Độ ưu tiên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Người thực hiện</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Hiện chưa có công việc buồng phòng nào.
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-bold">P{task.room.roomNumber}</TableCell>
                  <TableCell>{task.taskType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={priorityVariants[task.priority]}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {statusLabels[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{task.assignee?.fullName || "Chưa phân công"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled={task.status === "COMPLETED"}>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
