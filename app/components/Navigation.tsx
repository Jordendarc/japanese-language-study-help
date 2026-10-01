'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';

export default function Navigation() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();

  // Don't show navigation on auth pages
  if (pathname?.startsWith('/auth/')) {
    return null;
  }

  return (
    <nav className="bg-app border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-fg font-medium text-lg sm:text-xl hover:text-accent transition-colors">
            Jojos Study Buddy
          </Link>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loading ? (
              <div className="w-8 h-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-fg-muted border-t-transparent"></div>
              </div>
            ) : user ? (
              <UserMenu email={user.email} onSignOut={signOut} />
            ) : (
              <Link
                href="/auth/login"
                className="flex items-center gap-2 bg-accent hover:opacity-90 text-on-accent px-3 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                </svg>
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
