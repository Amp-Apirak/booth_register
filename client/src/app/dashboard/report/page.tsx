'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import AnalyticsReport from '@/components/analytics/AnalyticsReport';
import StaffGate from '@/components/StaffGate';
import { filtersFromQuery } from '@/lib/analytics';

// Printable A4 report for the filters chosen on the dashboard's "Reports & charts" tab
function ReportContent() {
  const params = useSearchParams();
  const filters = useMemo(() => filtersFromQuery(new URLSearchParams(params.toString())), [params]);
  return <AnalyticsReport filters={filters} />;
}

export default function ReportPage() {
  return (
    <StaffGate>
      <Suspense>
        <ReportContent />
      </Suspense>
    </StaffGate>
  );
}
