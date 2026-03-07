import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';

export default function App() {
  return (
    <div
      className="min-h-screen p-6 flex flex-col gap-4"
      style={{ backgroundColor: THEME.colors.bg.primary }}
    >
      <h1
        className="text-2xl font-semibold tracking-tight text-center mb-2"
        style={{ color: THEME.colors.text.primary, fontFamily: THEME.fonts.ui }}
      >
        JS Execution Context Visualizer
      </h1>

      {/* Main grid: left (editor) | right (visualizer) */}
      <div className="flex gap-4 flex-1">
        {/* Left: Code Editor + Console */}
        <div className="flex flex-col gap-4 w-1/2">
          <Panel
            title="Code"
            borderColor={THEME.colors.border.editor}
            className="flex-1"
          >
            <p style={{ color: THEME.colors.text.muted, fontFamily: THEME.fonts.code, fontSize: 13 }}>
              // editor goes here
            </p>
          </Panel>

          <Panel
            title="Console"
            borderColor={THEME.colors.border.console}
            className="h-40"
          >
            <p style={{ color: THEME.colors.text.muted, fontFamily: THEME.fonts.code, fontSize: 13 }}>
              {'>'} output goes here
            </p>
          </Panel>
        </div>

        {/* Right: Visualizer panels */}
        <div className="flex flex-col gap-4 w-1/2">
          {/* Top row: Call Stack + Web APIs */}
          <div className="flex gap-4 flex-1">
            <Panel
              title="Call Stack"
              borderColor={THEME.colors.border.callStack}
              glowEffect={THEME.glow.callStack}
              className="flex-1"
            >
              <p style={{ color: THEME.colors.text.muted, fontSize: 13 }}>empty</p>
            </Panel>

            <Panel
              title="Web APIs"
              borderColor={THEME.colors.border.webAPIs}
              glowEffect={THEME.glow.webAPIs}
              className="flex-1"
            >
              <p style={{ color: THEME.colors.text.muted, fontSize: 13 }}>empty</p>
            </Panel>
          </div>

          {/* Bottom row: Event Loop + queues */}
          <div className="flex gap-4">
            <Panel
              title="Event Loop"
              borderColor={THEME.colors.border.eventLoop}
              glowEffect={THEME.glow.eventLoop}
              className="w-28"
            >
              <p style={{ color: THEME.colors.text.muted, fontSize: 13 }}>idle</p>
            </Panel>

            <div className="flex flex-col gap-4 flex-1">
              <Panel
                title="Task Queue"
                borderColor={THEME.colors.border.taskQueue}
                glowEffect={THEME.glow.taskQueue}
              >
                <p style={{ color: THEME.colors.text.muted, fontSize: 13 }}>empty</p>
              </Panel>

              <Panel
                title="Microtask Queue"
                borderColor={THEME.colors.border.microtaskQueue}
                glowEffect={THEME.glow.microtaskQueue}
              >
                <p style={{ color: THEME.colors.text.muted, fontSize: 13 }}>empty</p>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
