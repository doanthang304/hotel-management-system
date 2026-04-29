import { NextRequest } from "next/server";

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cookie": "next-auth.session-token=..." // I can't easily mock this without knowing the DB
      },
      body: JSON.stringify({
        roomId: "00000000-0000-0000-0000-000000000000",
        guestFullName: "Test",
        checkInDate: new Date().toISOString(),
        checkOutDate: new Date(Date.now() + 86400000).toISOString(),
        numNights: 1,
        roomRate: 500000,
      })
    });
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
run();
