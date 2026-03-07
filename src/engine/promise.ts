// Internal Promise representation for the interpreter's simulation.
// This is NOT the JavaScript Promise — it's the interpreter's state model.

export type PromiseState = "pending" | "fulfilled" | "rejected";

export interface PromiseReaction {
  id: string;
  type: "fulfill" | "reject";
  callbackNode: unknown; // AST node of the callback
  callbackSource: string; // source code for display
  resultPromiseId: string; // the promise returned by .then()
  preserveValue?: boolean; // for .finally(): preserve original value after callback
}

export interface InternalPromise {
  id: string; // unique ID, e.g. "promise-1"
  heapObjectId: string; // links to the HeapObject in the heap
  state: PromiseState;
  result: unknown; // resolved value or rejection reason
  fulfillReactions: PromiseReaction[];
  rejectReactions: PromiseReaction[];
}

export interface PendingMicrotask {
  id: string;
  callbackNode: unknown; // AST node to execute
  callbackSource: string; // display label
  sourcePromiseId: string; // which promise triggered this
  resolveValue: unknown; // value passed to the callback
  resultPromiseId?: string; // promise to resolve with callback's return value
  capturedEnvStack: Record<string, unknown>[]; // environment snapshot for closures
  preserveValue?: boolean; // for .finally(): resolve resultPromise with resolveValue, not return value
}
