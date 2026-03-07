import { useEffect } from 'react';
import { THEME } from '@/constants/theme';
import { CodeEditor } from '@/components/editor/CodeEditor';
import { CallStack } from '@/components/visualizer/CallStack';
import { WebAPIs } from '@/components/visualizer/WebAPIs';
import { TaskQueue } from '@/components/visualizer/TaskQueue';
import { MicrotaskQueue } from '@/components/visualizer/MicrotaskQueue';
import { EventLoopIndicator } from '@/components/visualizer/EventLoopIndicator';
import { ConsoleOutput } from '@/components/visualizer/ConsoleOutput';
import { Panel } from '@/components/ui/Panel';
import { TransportControls } from '@/components/controls/TransportControls';
import { useVisualizerStore } from '@/store/useVisualizerStore';
import { useAutoPlay } from '@/hooks/useAutoPlay';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export function AppShell() {
  const loadMockData = useVisualizerStore((s) => s.loadMockData);

  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  useAutoPlay();
  useKeyboardShortcuts();

  return (
    <div
      className="min-h-screen p-6 flex flex-col gap-4"
      style={{ backgroundColor: THEME.colors.bg.primary, fontFamily: THEME.fonts.ui }}
    >
      {/* Header */}
      <h1
        className="text-2xl font-semibold tracking-tight text-center"
        style={{ color: THEME.colors.text.primary }}
      >
        JS Execution Context Visualizer
      </h1>

      {/* Main layout: left (editor + console) | right (visualizer panels) */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: 'calc(100vh - 160px)' }}>
        {/* Left column: Code Editor + Console */}
        <div className="flex flex-col gap-4 w-1/2">
          {/* Code Editor */}
          <Panel
            title="Code"
            borderColor={THEME.colors.border.editor}
            className="flex-1"
          >
            {/* Override inner padding to let Monaco fill the panel */}
            <div className="-m-4 h-full" style={{ minHeight: 400 }}>
              <CodeEditor />
            </div>
          </Panel>

          {/* Console */}
          <ConsoleOutput />
        </div>

        {/* Right column: Visualizer panels */}
        <div className="flex flex-col gap-4 w-1/2">
          {/* Top row: Call Stack + Web APIs */}
          <div className="flex gap-4 flex-1">
            <CallStack />
            <WebAPIs />
          </div>

          {/* Bottom row: Event Loop + Task Queue + Microtask Queue */}
          <div className="flex gap-4">
            <EventLoopIndicator />
            <div className="flex flex-col gap-4 flex-1">
              <TaskQueue />
              <MicrotaskQueue />
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Transport Controls */}
      <TransportControls />
    </div>
  );
}
