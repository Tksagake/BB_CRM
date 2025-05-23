import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Fetch user role from Supabase
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.error("Error fetching user role:", error);
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const userRole = data.role;
    const pathname = req.nextUrl.pathname;

    // Redirect based on role and path
    if (userRole === "admin") {
      // Admin-specific restrictions
      if (pathname.startsWith("/agent")) {
        return NextResponse.redirect(new URL("/dashboard/admin", req.url));
      }
    } else if (userRole === "agent") {
      // Agent-specific restrictions
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/dashboard/agent", req.url));
      }
      if (pathname.startsWith("/dashboard/debtors/import")) {
        return NextResponse.redirect(new URL("/dashboard/agent", req.url));
      }
      if (pathname.startsWith("/dashboard/reports/performance")) {
        return NextResponse.redirect(new URL("/dashboard/agent", req.url));
      }
      if (pathname.startsWith("/dashboard/communication")) {
        return NextResponse.redirect(new URL("/dashboard/agent", req.url));
      }
      if (pathname.startsWith("/dashboard/users")) {
        return NextResponse.redirect(new URL("/dashboard/agent", req.url));
      }
    } else if (userRole === "client") {
      // Client-specific restrictions
      if (pathname.startsWith("/dashboard/debtors/follow-ups")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (pathname.startsWith("/dashboard/payments/upload")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (pathname.startsWith("/dashboard/reports/monthly")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (pathname.startsWith("/dashboard/reports/ptp")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (pathname.startsWith("/dashboard/reports/performance")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
     // if (pathname.startsWith("/dashboard/reports/collection-updates")) {
       // return NextResponse.redirect(new URL("/dashboard", req.url));
    //  }
      if (pathname.startsWith("/dashboard/communication")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      if (pathname.startsWith("/dashboard/users")) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return res;
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

// Define protected routes, excluding API routes
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/agent/:path*"],
};
