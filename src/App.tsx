import { AppShell } from '@/components/layout/AppShell';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <>
      <AppShell />
      <Analytics />
    </>
  );
}
