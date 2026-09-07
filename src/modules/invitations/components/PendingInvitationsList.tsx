import type { ReactNode } from "react";
import type { Invitation } from "@/modules/invitations/queries";
import { InvitationCard } from "./InvitationCard";

type PendingInvitationsListProps = {
  invitations: Invitation[];
  title: string;
  emptyMessage: string;
  /** Optional per-trip-name lookup, for contexts spanning multiple trips
   * (e.g. a cross-trip inbox). Omit for a single-trip list. */
  tripNameFor?: (invitation: Invitation) => string | undefined;
  /** Optional per-invitation action slot (e.g. accept/decline/revoke
   * buttons), supplied by a caller that wires up Server Actions. */
  actionsFor?: (invitation: Invitation) => ReactNode;
};

/**
 * Reusable list shell for any Invitation[] — the trip owner's "invitations
 * sent for this trip" view and an invitee's "my pending invitations" inbox
 * are the same shape, differing only in title/empty copy and whether a
 * trip name needs to be shown per row. No fetching, no Server Actions.
 */
export function PendingInvitationsList({
  invitations,
  title,
  emptyMessage,
  tripNameFor,
  actionsFor,
}: PendingInvitationsListProps) {
  return (
    <div>
      <h2 className="text-sm font-medium text-gray-700">{title}</h2>
      {invitations.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200 rounded-lg border border-gray-200">
          {invitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              tripName={tripNameFor?.(invitation)}
              actions={actionsFor?.(invitation)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}