import { NextResponse } from "next/server";
import { requireUser } from "@/lib/authz/guard";
import { getCurrentUser } from "@/lib/current-user";
import { errorResponse } from "@/lib/http-errors";

// Equivalent of the legacy GET /api/user: the authenticated user with the
// linked professional, or 401.
export async function GET() {
  try {
    const user = requireUser(await getCurrentUser());
    return NextResponse.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}
