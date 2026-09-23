'use client';

import { usePathname } from 'next/navigation';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // If it is the signage display screen, remove all container padding/margins
  // so it can take up the full screen real estate.
  if (pathname === '/signage') {
    return <main className="w-full min-h-screen overflow-hidden">{children}</main>;
  }

  // Standard container layout for other pages
  return (
    <main className="flex-1 w-full container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl">
      {children}
    </main>
  );
}
