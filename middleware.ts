import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role as string;

    // Chỉ OWNER và MANAGER mới vào được reports
    if (
      pathname.startsWith("/reports") &&
      role !== "OWNER" &&
      role !== "MANAGER"
    ) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/bookings/:path*",
    "/calendar/:path*",
    "/rooms/:path*",
    "/guests/:path*",
    "/services/:path*",
    "/bills/:path*",
    "/housekeeping/:path*",
    "/reports/:path*",
    "/onboarding/:path*",
  ],
};
