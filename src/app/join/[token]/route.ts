import { NextResponse } from "next/server";
import { getPollAccessRecord } from "@/lib/data/polls";
import { getPublicEnvironment } from "@/lib/env";
import { setPollAccessGrant } from "@/lib/security/poll-cookies";
import { verifyReferralToken } from "@/lib/security/referral";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const referral = verifyReferralToken(token);
  if (!referral) {
    return NextResponse.redirect(new URL("/link-unavailable", getPublicEnvironment().appUrl));
  }

  const poll = await getPollAccessRecord(referral.pollPublicId);
  if (
    !poll ||
    poll.status === "draft" ||
    poll.accessVersion !== referral.accessVersion
  ) {
    return NextResponse.redirect(new URL("/link-unavailable", getPublicEnvironment().appUrl));
  }

  await setPollAccessGrant({
    pollPublicId: poll.publicId,
    accessVersion: poll.accessVersion,
  });

  const response = NextResponse.redirect(
    new URL(`/poll/${encodeURIComponent(poll.publicId)}`, getPublicEnvironment().appUrl),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
