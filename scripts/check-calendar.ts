import { prisma } from "../lib/prisma";

async function main() {
  const hotel = await prisma.hotel.findFirst({ where: { name: "Khách sạn Test" } });
  if (!hotel) return console.log("Hotel not found");
  
  const hotelId = hotel.id;
  const start = new Date("2026-03-30T00:00:00Z");
  const end = new Date("2026-06-27T00:00:00Z");
  
  const [rooms, bookings] = await Promise.all([
      prisma.room.findMany({
        where: { hotelId },
        include: { roomType: { select: { name: true } } },
        orderBy: { roomNumber: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          hotelId,
          checkInDate: { lte: end },
          checkOutDate: { gte: start },
          status: { not: "CANCELLED" },
        },
        include: {
          guest: { select: { fullName: true } },
          room: { select: { roomNumber: true } },
        },
      }),
    ]);
    
    console.log("Rooms found:", rooms.length);
    console.log("Bookings found:", bookings.length);
    rooms.forEach(r => console.log(`- Room ${r.roomNumber}`));
    bookings.forEach(b => console.log(`- Booking for ${b.guest.fullName} in room ${b.room.roomNumber}`));
}

main().catch(console.error);
