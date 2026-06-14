import { NextResponse } from "next/server";

const registrationClosedMessage =
  "Public registration is temporarily closed while Travel Xchange prepares private beta access.";

export async function POST() {
  return NextResponse.json(
    {
      error: registrationClosedMessage,
    },
    { status: 403 },
  );
}
