'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBadge, IconScan } from './icons';

export function TopBar() {
  const pathname = usePathname();

  return (
    <div className="topbar">
      <div className="brand">
        <IconBadge width={18} height={18} />
        <span>
          Decyfotech <strong>Checkpoint</strong>
        </span>
      </div>
      <nav className="nav">
        <Link href="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
          <IconBadge width={15} height={15} />
          Issue pass
        </Link>
        <Link href="/verify" className={`nav-link ${pathname === '/verify' ? 'active' : ''}`}>
          <IconScan width={15} height={15} />
          Verify pass
        </Link>
      </nav>
    </div>
  );
}
