import { Panel } from "@/components/ui/Panel";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import type { QueueItem } from "@/types";

interface MicrotaskCardProps {
  task: QueueItem;
  isHighlighted: boolean;
}

function MicrotaskCard({ task, isHighlighted }: MicrotaskCardProps) {
  const setHoveredPointerId = useVisualizerStore((s) => s.setHoveredPointerId);

  return (
    <div
      style={{
        backgroundColor: THEME.colors.bg.tertiary,
        border: `1px solid ${THEME.colors.border.microtaskQueue}`,
        borderRadius: THEME.radius.md,
        padding: "6px 10px",
        flexShrink: 0,
        minWidth: 100,
        maxWidth: 180,
        boxShadow: isHighlighted
          ? `0 0 12px ${THEME.colors.border.microtaskQueue}50`
          : "none",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        cursor: "pointer",
      }}
      onMouseEnter={() => task.sourceId && setHoveredPointerId(task.sourceId)}
      onMouseLeave={() => setHoveredPointerId(null)}
    >
      <div
        style={{
          fontFamily: THEME.fonts.code,
          fontSize: 12,
          color: THEME.colors.text.primary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={task.callbackLabel}
      >
        {task.callbackLabel.length > 35
          ? task.callbackLabel.slice(0, 35) + "…"
          : task.callbackLabel}
      </div>
      {/* Source badge - shows "Promise" for promise microtasks */}
      <div
        style={{
          fontFamily: THEME.fonts.ui,
          fontSize: 10,
          marginTop: 3,
          display: "inline-block",
          padding: "1px 6px",
          borderRadius: 4,
          backgroundColor: `${THEME.colors.border.microtaskQueue}22`,
          color: THEME.colors.border.microtaskQueue,
          textTransform: "capitalize",
        }}
      >
        {task.sourceType === "promise" ? "Promise" : task.sourceType}
      </div>
    </div>
  );
}

export function MicrotaskQueue() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const hoveredHeapId = useVisualizerStore((s) => s.hoveredHeapId);
  const microtasks = currentStep?.microtaskQueue ?? [];

  return (
    <Panel
      title="Microtask Queue"
      borderColor={THEME.colors.border.microtaskQueue}
      glowEffect={THEME.glow.microtaskQueue}
    >
      {microtasks.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span
            className="text-center text-xs"
            style={{
              color: THEME.colors.text.muted,
              fontFamily: THEME.fonts.ui,
            }}
          >
            No microtasks
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Dequeue direction indicator */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: 10,
              color: THEME.colors.text.muted,
              flexShrink: 0,
              userSelect: "none",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 12 }}>▶</span>
            <span style={{ fontSize: 8, opacity: 0.7 }}>OUT</span>
          </div>
          {microtasks.map((task) => (
            <MicrotaskCard
              key={task.id}
              task={task}
              isHighlighted={hoveredHeapId === task.sourceId}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
