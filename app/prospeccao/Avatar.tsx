import { autoColor } from "@/lib/colors";
import { displayName, initials } from "@/lib/people";
import type { Profile } from "@/lib/types";

export default function Avatar({ p, size = 22 }: { p: Pick<Profile, "id" | "name" | "email"> | null | undefined; size?: number }) {
  return (
    <span
      className="avatar"
      title={displayName(p)}
      style={{ width: size, height: size, fontSize: size * 0.42, background: autoColor(p?.id || "x") }}
    >
      {initials(p)}
    </span>
  );
}
