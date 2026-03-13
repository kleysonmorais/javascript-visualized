import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Code2 } from "lucide-react";
import { THEME } from "@/constants/theme";
import { CODE_EXAMPLES } from "@/constants/examples";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import type { CodeExample } from "@/types";

interface ExampleGroup {
  id: string;
  label: string;
  description: string;
  color: string;
  categories: CodeExample["category"][];
}

const EXAMPLE_GROUPS: ExampleGroup[] = [
  {
    id: "basics",
    label: "Basics",
    description: "Variables, scope, and fundamental concepts",
    color: "#3b82f6", // blue
    categories: ["sync"],
  },
  {
    id: "closures",
    label: "Closures",
    description: "Lexical scope and closure patterns",
    color: "#22c55e", // green
    categories: ["closures"],
  },
  {
    id: "promises",
    label: "Promises",
    description: "Promise chains and async patterns",
    color: "#a855f7", // purple
    categories: ["promise"],
  },
  {
    id: "async",
    label: "Async/Await",
    description: "Timers, event loop, and async operations",
    color: "#f59e0b", // amber
    categories: ["async"],
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Complex patterns and edge cases",
    color: "#ef4444", // red
    categories: ["advanced"],
  },
];

interface ExamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ExamplesModal({ isOpen, onClose }: ExamplesModalProps) {
  const setSourceCode = useVisualizerStore((s) => s.setSourceCode);
  const reset = useVisualizerStore((s) => s.reset);

  // Group examples by their group
  const groupedExamples = useMemo(() => {
    const groups: Record<string, CodeExample[]> = {};

    EXAMPLE_GROUPS.forEach((group) => {
      groups[group.id] = CODE_EXAMPLES.filter((example) =>
        group.categories.includes(example.category),
      );
    });

    return groups;
  }, []);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  const handleSelectExample = (example: CodeExample) => {
    setSourceCode(example.code);
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
          animate={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
          exit={{ backgroundColor: "rgba(0, 0, 0, 0)" }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Modal Content */}
          <motion.div
            className="relative flex flex-col"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              width: "80%",
              height: "80%",
              maxWidth: "1400px",
              maxHeight: "900px",
              backgroundColor: THEME.colors.bg.secondary,
              border: `1px solid ${THEME.colors.border.editor}`,
              borderRadius: THEME.radius.xl,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{
                borderBottom: `1px solid ${THEME.colors.border.editor}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-lg"
                  style={{
                    backgroundColor: `${THEME.colors.text.accent}15`,
                    border: `1px solid ${THEME.colors.text.accent}30`,
                  }}
                >
                  <Code2
                    size={20}
                    style={{ color: THEME.colors.text.accent }}
                  />
                </div>
                <div>
                  <h2
                    style={{
                      color: THEME.colors.text.primary,
                      fontFamily: THEME.fonts.ui,
                      fontSize: 20,
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    Code Examples
                  </h2>
                  <p
                    style={{
                      color: THEME.colors.text.muted,
                      fontFamily: THEME.fonts.ui,
                      fontSize: 13,
                      margin: 0,
                    }}
                  >
                    Select an example to visualize JavaScript execution
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer"
                style={{
                  backgroundColor: "transparent",
                  border: `1px solid ${THEME.colors.border.editor}`,
                  color: THEME.colors.text.secondary,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    THEME.colors.bg.tertiary;
                  e.currentTarget.style.color = THEME.colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = THEME.colors.text.secondary;
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col gap-8">
                {EXAMPLE_GROUPS.map((group) => {
                  const examples = groupedExamples[group.id];
                  if (!examples || examples.length === 0) return null;

                  return (
                    <section key={group.id}>
                      {/* Group Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-1 h-6 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <div>
                          <h3
                            style={{
                              color: THEME.colors.text.primary,
                              fontFamily: THEME.fonts.ui,
                              fontSize: 16,
                              fontWeight: 600,
                              margin: 0,
                            }}
                          >
                            {group.label}
                          </h3>
                          <p
                            style={{
                              color: THEME.colors.text.muted,
                              fontFamily: THEME.fonts.ui,
                              fontSize: 12,
                              margin: 0,
                            }}
                          >
                            {group.description}
                          </p>
                        </div>
                      </div>

                      {/* Example Cards Grid */}
                      <div
                        className="grid gap-4"
                        style={{
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(280px, 1fr))",
                        }}
                      >
                        {examples.map((example) => (
                          <button
                            key={example.id}
                            onClick={() => handleSelectExample(example)}
                            className="text-left p-4 rounded-lg transition-all cursor-pointer group"
                            style={{
                              backgroundColor: THEME.colors.bg.tertiary,
                              border: `1px solid ${THEME.colors.border.editor}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                THEME.colors.bg.elevated;
                              e.currentTarget.style.borderColor = group.color;
                              e.currentTarget.style.boxShadow = `0 0 20px ${group.color}20`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                THEME.colors.bg.tertiary;
                              e.currentTarget.style.borderColor =
                                THEME.colors.border.editor;
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4
                                style={{
                                  color: THEME.colors.text.primary,
                                  fontFamily: THEME.fonts.ui,
                                  fontSize: 14,
                                  fontWeight: 500,
                                  margin: 0,
                                }}
                              >
                                {example.title}
                              </h4>
                              <div
                                className="w-2 h-2 rounded-full shrink-0 mt-1.5 opacity-60 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: group.color }}
                              />
                            </div>
                            <p
                              className="line-clamp-2"
                              style={{
                                color: THEME.colors.text.muted,
                                fontFamily: THEME.fonts.ui,
                                fontSize: 12,
                                lineHeight: 1.5,
                                margin: 0,
                              }}
                            >
                              {example.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ExamplesButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors min-h-9 lg:min-h-0"
        style={{
          backgroundColor: THEME.colors.bg.elevated,
          border: `1px solid ${THEME.colors.border.editor}`,
          color: THEME.colors.text.secondary,
          fontFamily: THEME.fonts.ui,
          fontSize: 12,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = THEME.colors.text.accent;
          e.currentTarget.style.color = THEME.colors.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = THEME.colors.border.editor;
          e.currentTarget.style.color = THEME.colors.text.secondary;
        }}
      >
        <Code2 size={14} />
        <span>Examples</span>
      </button>

      <ExamplesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
