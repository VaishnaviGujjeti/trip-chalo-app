import type { TripMember } from "@/modules/memberships/queries";
import { formatInvitationTimestamp } from "@/modules/invitations/format";
import { MemberAvatar } from "./MemberAvatar";
import { RoleBadge } from "./RoleBadge";

type MemberListProps = {
  members: TripMember[];
  /** Current viewer's id, used only to render a "You" tag — not an
   * authorization signal. */
  currentUserId?: string;
};

export function MemberList({ members, currentUserId }: MemberListProps) {
  if (members.length === 0) {
    // listTripMembers only returns [] for a malformed id or a caller who
    // isn't a member — a real member always sees at least the owner, so
    // this branch is mostly defensive.
    return <p className="text-sm text-gray-400">No members to show.</p>;
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
      {members.map((member) => (
        <li key={member.id} className="flex items-center gap-3 px-4 py-3">
          <MemberAvatar displayName={member.display_name} avatarUrl={member.avatar_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-gray-900">
                {member.display_name || "Unnamed member"}
              </span>
              {member.user_id === currentUserId ? (
                <span className="text-xs text-gray-400">(You)</span>
              ) : null}
            </div>
            <p className="text-xs text-gray-500">
              Joined {formatInvitationTimestamp(member.joined_at)}
            </p>
          </div>
          <RoleBadge role={member.role} />
        </li>
      ))}
    </ul>
  );
}