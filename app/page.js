import DirectVisitRedirectGate from '@/app/components/DirectVisitRedirectGate';
import LocatorPageContent from '@/app/components/LocatorPageContent';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  return (
    <DirectVisitRedirectGate>
      <LocatorPageContent />
    </DirectVisitRedirectGate>
  );
}
