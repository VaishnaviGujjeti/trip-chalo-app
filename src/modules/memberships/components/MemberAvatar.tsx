type MemberAvatarProps = {
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Plain <img>, not next/image: next.config.ts has no remote image domains
 * configured, so next/image would reject or need config work out of scope
 * here. Falls back to an initials circle when there's no avatar or name.
 */
export function MemberAvatar({ displayName, avatarUrl }: MemberAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || "Member avatar"}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
      {initial}
    </span>
  );
}