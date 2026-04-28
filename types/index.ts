import type {
  Hotel,
  User,
  RoomType,
  RoomPrice,
  Room,
  Guest,
  Booking,
  ServiceCatalog,
  BookingService,
  Bill,
  BillPayment,
  HousekeepingTask,
  AuditLog,
  UserRole,
  RoomStatus,
  BookingStatus,
  BookingSource,
  IdType,
  BillStatus,
  HousekeepingStatus,
} from "@prisma/client";

export type {
  Hotel,
  User,
  RoomType,
  RoomPrice,
  Room,
  Guest,
  Booking,
  ServiceCatalog,
  BookingService,
  Bill,
  BillPayment,
  HousekeepingTask,
  AuditLog,
  UserRole,
  RoomStatus,
  BookingStatus,
  BookingSource,
  IdType,
  BillStatus,
  HousekeepingStatus,
};

// Extended types with relations
export type RoomWithType = Room & {
  roomType: RoomType;
};

export type RoomTypeWithPrices = RoomType & {
  roomPrices: RoomPrice[];
  rooms: Room[];
};

export type BookingWithRelations = Booking & {
  room: RoomWithType;
  guest: Guest;
  creator: Pick<User, "id" | "fullName" | "email">;
  bookingServices: BookingService[];
  bill: Bill | null;
};

export type BillWithRelations = Bill & {
  booking: BookingWithRelations;
  payments: BillPayment[];
  finalizer: Pick<User, "id" | "fullName"> | null;
};

export type GuestWithHistory = Guest & {
  bookings: BookingWithRelations[];
};

export type HousekeepingTaskWithRelations = HousekeepingTask & {
  room: RoomWithType;
  assignee: Pick<User, "id" | "fullName"> | null;
  booking: Pick<Booking, "id" | "bookingCode"> | null;
};

// Session user type (returned by NextAuth)
export type SessionUser = {
  id: string;
  hotelId: string;
  email: string;
  fullName: string;
  role: UserRole;
};

// API response types
export type ApiResponse<T> = {
  data?: T;
  error?: string;
  message?: string;
};

// Dashboard stats
export type DashboardStats = {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  checkInsToday: number;
  checkOutsToday: number;
  cleaningRooms: number;
};

// Calendar event for FullCalendar
export type CalendarEvent = {
  id: string;
  resourceId: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    bookingCode: string;
    guestName: string;
    status: BookingStatus;
    roomNumber: string;
  };
};

// Report types
export type RevenueData = {
  date: string;
  revenue: number;
  count: number;
};

export type OccupancyData = {
  date: string;
  occupancyRate: number;
  occupiedRooms: number;
  totalRooms: number;
};

export type TopServiceData = {
  serviceName: string;
  totalRevenue: number;
  totalQuantity: number;
};
