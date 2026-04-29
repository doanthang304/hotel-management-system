import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    include: { hotel: true }
  });
  console.log("Users and their hotels:");
  users.forEach(u => {
    console.log(`- ${u.fullName} (${u.email}): Hotel ID ${u.hotelId} (${u.hotel.name})`);
  });
}

main().catch(console.error);
