import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export default function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs">
      <Link href="/prospeccao">{APP_NAME}</Link>
      {items.map((it, i) => (
        <span key={i}>
          <span className="sep">›</span>
          {it.href && i < items.length - 1 ? <Link href={it.href}>{it.label}</Link> : <span>{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
