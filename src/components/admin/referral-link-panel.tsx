import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { LinkIcon, RotateIcon } from "@/components/ui/icons";

/**
 * Shows the referral link without dumping the signed token on screen. The URL
 * carries a ~250-character JWT; rendering it in full made the panel unreadable
 * and told the organizer nothing useful.
 */
function shortenReferralUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname.slice(0, 12)}…`;
  } catch {
    return url.slice(0, 32) + "…";
  }
}

export function ReferralLinkPanel({
  pollId,
  referralUrl,
  rotateAction,
}: {
  pollId: string;
  referralUrl: string;
  rotateAction: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <section className="p-5">
      <h2 className="card-title">Invite the team</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        One link handles joining, nominations, voting, and results as the poll
        moves through each phase.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p
          className="link-display min-w-0 flex-1"
          data-referral-url={referralUrl}
          title={referralUrl}
        >
          <LinkIcon size={15} />
          <span aria-hidden="true">{shortenReferralUrl(referralUrl)}</span>
          <span className="sr-only">Referral link: {referralUrl}</span>
        </p>
        <CopyLinkButton value={referralUrl} />
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <ConfirmActionForm
          action={rotateAction}
          confirmMessage="Every earlier referral link and existing poll-access grant will stop working."
          confirmTitle="Rotate the referral link?"
        >
          <input type="hidden" name="pollId" value={pollId} />
          <SubmitButton
            className="button button-secondary button-compact"
            pendingLabel="Rotating link…"
          >
            <RotateIcon size={15} />
            Rotate referral link
          </SubmitButton>
        </ConfirmActionForm>
        <p className="mt-2 text-sm text-muted">
          Use this if the link was shared outside the team.
        </p>
      </div>
    </section>
  );
}
