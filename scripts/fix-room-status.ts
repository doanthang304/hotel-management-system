import { prisma } from "../lib/prisma";

async function main() {
  try {
    // Attempt to raw update all CLEANING rooms to AVAILABLE
    // Since Prisma Client is not yet regenerated and might not have CLEANING in TS if we generated, 
    // it's safer to use raw query.
    await prisma.$executeRawUnsafe(`UPDATE rooms SET status = 'AVAILABLE' WHERE status = 'CLEANING'`);
    console.log("Successfully updated rooms with CLEANING status to AVAILABLE");
    
    // Also drop Housekeeping tasks if they exist to be safe, but Prisma will drop the table.
  } catch (error) {
    console.error("Error updating rooms:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
