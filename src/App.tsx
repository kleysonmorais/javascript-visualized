import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Analytics } from '@vercel/analytics/react';
import ChallengesListPage from '@/pages/ChallengesListPage';
import ChallengeDetailPage from '@/pages/ChallengeDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />} />
        <Route path="/:exampleId" element={<AppShell />} />
        <Route path="/challenges" element={<ChallengesListPage />} />
        <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
