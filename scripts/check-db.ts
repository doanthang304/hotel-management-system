import { prisma } from "../lib/prisma";

async function main() {
  const rooms = await prisma.room.count();
  const bookings = await prisma.booking.count();
  const roomTypes = await prisma.roomType.count();
  const hotels = await prisma.hotel.findMany();
  
  console.log("Hotels:", hotels.length);
  console.log("Room Types:", roomTypes);
  console.log("Rooms:", rooms);
  console.log("Bookings:", bookings);
  
  if (hotels.length > 0) {
    const firstHotel = hotels[0];
    const hotelRooms = await prisma.room.findMany({ where: { hotelId: firstHotel.id } });
    console.log(`Rooms for hotel ${firstHotel.name}:`, hotelRooms.length);
  }
}

main().catch(console.error);
