import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Navbar } from '@/components/layout/Navbar';
import { Analytics } from '@vercel/analytics/react';
import ChallengesListPage from '@/pages/ChallengesListPage';
import ChallengeDetailPage from '@/pages/ChallengeDetailPage';

function ChallengeDetailPageWithKey() {
  const { id } = useParams<{ id: string }>();
  return <ChallengeDetailPage key={id} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar />
        </div>
        <div className="pt-12 flex flex-col flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<AppShell />} />
            <Route path="/:exampleId" element={<AppShell />} />
            <Route path="/challenges" element={<ChallengesListPage />} />
            <Route path="/challenges/:id" element={<ChallengeDetailPageWithKey />} />
          </Routes>
        </div>
      </div>
      <Analytics />
    </BrowserRouter>
  );
}
