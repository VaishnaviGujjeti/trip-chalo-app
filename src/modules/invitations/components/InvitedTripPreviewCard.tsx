import type { ReactNode } from "react";
import type { InvitedTripPreview } from "@/modules/invitations/queries";
import { formatTripDateRange } from "@/modules/trips/format";

type InvitedTripPreviewCardProps = {
  preview: InvitedTripPreview;
  /** Slot for accept/decline buttons — not implemented here. */
  actions?: ReactNode;
};

/**
 * Shows the narrow four-column preview a pending invitee is allowed to see
 * (get_invited_trip_preview, 0010) — deliberately only name and dates, no
 * description or owner, matching what the query layer actually returns.
 */
export function InvitedTripPreviewCard({ preview, actions }: InvitedTripPreviewCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900">{preview.name}</h2>
      <p className="mt-1 text-sm text-gray-500">
        {formatTripDateRange(preview.start_date, preview.end_date)}
      </p>
      {actions ? <div className="mt-4 flex gap-2">{actions}</div> : null}
    </div>
  );
}