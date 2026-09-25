'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AnalyticsReport from '@/components/analytics/AnalyticsReport';
import { filtersFromQuery } from '@/lib/analytics';

// Printable A4 report for the filters chosen on the dashboard's "Reports & charts" tab
function ReportContent() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = useMemo(() => filtersFromQuery(new URLSearchParams(params.toString())), [params]);

  useEffect(() => {
    if (!localStorage.getItem('staff_token')) router.push('/login');
  }, [router]);

  return <AnalyticsReport filters={filters} />;
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportContent />
    </Suspense>
  );
}
