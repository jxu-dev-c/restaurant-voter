import { NextResponse } from "next/server";
import { getPollAccessRecord } from "@/lib/data/polls";
import { setPollAccessGrant } from "@/lib/security/poll-cookies";
import { verifyReferralToken } from "@/lib/security/referral";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const referral = verifyReferralToken(token);
  if (!referral) {
    return NextResponse.redirect(new URL("/link-unavailable", request.url));
  }

  const poll = await getPollAccessRecord(referral.pollPublicId);
  if (
    !poll ||
    poll.status === "draft" ||
    poll.accessVersion !== referral.accessVersion
  ) {
    return NextResponse.redirect(new URL("/link-unavailable", request.url));
  }

  await setPollAccessGrant({
    pollPublicId: poll.publicId,
    accessVersion: poll.accessVersion,
  });

  const response = NextResponse.redirect(
    new URL(`/poll/${encodeURIComponent(poll.publicId)}`, request.url),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
