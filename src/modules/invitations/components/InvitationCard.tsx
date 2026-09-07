import type { ReactNode } from "react";
import type { Invitation } from "@/modules/invitations/queries";
import { formatInvitationTimestamp } from "@/modules/invitations/format";
import { InvitationStatusBadge } from "./InvitationStatusBadge";

type InvitationCardProps = {
  invitation: Invitation;
  /** Optional trip name for contexts where an invitation is shown outside
   * its own trip page (e.g. a cross-trip "your invitations" inbox). The
   * Invitation type itself carries only trip_id, not the trip's name — a
   * caller with that name (e.g. from listInvitationsForTrip's page, which
   * already has the trip loaded) can pass it in; it's simply omitted where
   * unavailable rather than fetched here. */
  tripName?: string;
  /** Slot for action buttons (accept/decline/revoke) — deliberately not
   * implemented in this component, which stays presentation-only. */
  actions?: ReactNode;
};

export function InvitationCard({ invitation, tripName, actions }: InvitationCardProps) {
  return (
    <li className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-gray-900">
            {invitation.invitee_email}
          </span>
          <InvitationStatusBadge status={invitation.status} />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {tripName ? `${tripName} · ` : ""}
          Invited {formatInvitationTimestamp(invitation.created_at)}
          {invitation.responded_at
            ? ` · Responded ${formatInvitationTimestamp(invitation.responded_at)}`
            : ""}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </li>
  );
}