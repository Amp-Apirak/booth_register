'use client';

import { usePathname } from 'next/navigation';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // If it is the signage display screen, remove all container padding/margins
  // so it can take up the full screen real estate.
  if (pathname === '/signage') {
    return <main className="w-full min-h-screen overflow-hidden">{children}</main>;
  }

  // Standard container layout for other pages; the dashboard (attendee table + analytics)
  // uses the same width as the top bar so the table fits without a horizontal scroll
  const wide = pathname === '/dashboard';
  return (
    <main className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 ${wide ? 'max-w-[1600px]' : 'container max-w-7xl'}`}>
      {children}
    </main>
  );
}
