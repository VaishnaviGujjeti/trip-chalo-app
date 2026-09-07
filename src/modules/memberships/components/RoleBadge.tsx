import type { TripMemberRole } from "@/modules/memberships/queries";

const ROLE_STYLES: Record<TripMemberRole, string> = {
  owner: "bg-gray-900 text-white",
  member: "bg-gray-100 text-gray-700",
};

const ROLE_LABELS: Record<TripMemberRole, string> = {
  owner: "Owner",
  member: "Member",
};

export function RoleBadge({ role }: { role: TripMemberRole }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_STYLES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
