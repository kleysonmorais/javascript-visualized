// ── Execution Start ────────────────────────────────────────────────────────────

const startingExecution = (isModule: boolean) => {
  return isModule
    ? "Starting module execution"
    : "The JavaScript engine begins executing the script. A new **Global Execution Context** is created and pushed onto the Call Stack. Global memory (the Variable Environment) is initialized.";
};

// ── Variable Declarations ──────────────────────────────────────────────────────

const declaringVariable = ({
  kind,
  name,
  displayValue,
  isExported = false,
}: {
  kind: string;
  name: string;
  displayValue: string;
  isExported?: boolean;
}) => {
  const exportPrefix = isExported ? "export " : "";
  return `Declaring ${exportPrefix}${kind} **${name}** = ${displayValue}. The identifier is added to the current scope's Variable Environment and the value is stored in memory.`;
};

const destructuringVariable = ({
  varName,
  displayValue,
  sourceName,
}: {
  varName: string;
  displayValue: string;
  sourceName?: string;
}) => {
  if (sourceName) {
    return `Destructuring **${varName}** = ${displayValue} from **${sourceName}**. The value is extracted from the source object/array and bound to the new identifier in the current scope.`;
  }
  return `Destructuring **${varName}** = ${displayValue}. The value is extracted and bound to the new identifier in the current scope.`;
};

const destructuringRest = ({
  restName,
  kind,
}: {
  restName: string;
  kind: "object" | "array";
}) => {
  if (kind === "object") {
    return `Destructuring **...${restName}** — collecting remaining properties into a new object and binding it to **${restName}** in the current scope.`;
  }
  return `Destructuring **...${restName}** — collecting remaining elements into a new array and binding it to **${restName}** in the current scope.`;
};

// ── Assignments ────────────────────────────────────────────────────────────────

const assigningVariable = ({
  name,
  displayValue,
}: {
  name: string;
  displayValue: string;
}) => {
  return `Assigning **${name}** = ${displayValue}. The existing binding in the Variable Environment is updated with the new value.`;
};

const assigningProperty = ({
  objLabel,
  propName,
  displayValue,
}: {
  objLabel: string;
  propName: string;
  displayValue: string;
}) => {
  return `Assigning **${objLabel}.${propName}** = ${displayValue}. The property on the object in the Heap is updated with the new value.`;
};

const assigningThisProperty = ({
  propName,
  displayValue,
}: {
  propName: string;
  displayValue: string;
}) => {
  return `Setting **this.${propName}** = ${displayValue}. The property is written onto the current instance object in the Heap via the **this** binding.`;
};

const incrementDecrement = ({
  name,
  operator,
}: {
  name: string;
  operator: "++" | "--";
}) => {
  const operatorDesc = operator === "++" ? "+ 1" : "- 1";
  return `Assigning **${name}** = ${name} ${operatorDesc}. The variable is updated in-place in the Variable Environment.`;
};

// ── Function Declarations & Calls ──────────────────────────────────────────────

const declaringFunction = ({
  name,
  isAsync = false,
  isGenerator = false,
}: {
  name: string;
  isAsync?: boolean;
  isGenerator?: boolean;
}) => {
  const asyncPrefix = isAsync ? "async " : "";
  const generatorPrefix = isGenerator ? "generator function* " : "function ";
  return `Declaring ${asyncPrefix}${generatorPrefix}**${name}**. A new function object is created and stored in memory. The function's name, parameters, and body are recorded. The function is added to the current scope (Global or Function) so it can be called later.`;
};

const callingFunction = ({
  name,
  receiver = null,
  argsDisplay,
}: {
  name: string;
  receiver: Record<string, unknown> | null;
  argsDisplay: string;
}) => {
  if (receiver) {
    let receiverDisplay: string;
    try {
      receiverDisplay = JSON.stringify(receiver);
    } catch {
      receiverDisplay = "[Object]";
    }
    return `Calling ${argsDisplay ? `**${name}** with arguments (${argsDisplay})` : `**${name}()**`} on receiver ${receiverDisplay}. A new Execution Context is created for this function call and pushed onto the Call Stack. The function's parameters are evaluated and stored in the new Execution Context's Variable Environment. The function body begins executing.`;
  }
  return `Calling ${argsDisplay ? `**${name}** with arguments (${argsDisplay})` : `**${name}()**`}. A new **Execution Context** is created for this function call and pushed onto the Call Stack. The function's parameters are evaluated and stored in the new Execution Context's Variable Environment. The function body begins executing.`;
};

const callingMethod = ({
  className,
  methodName,
  argsDisplay,
}: {
  className: string;
  methodName: string;
  argsDisplay: string;
}) => {
  return `Calling **${className}.${methodName}(${argsDisplay})**. A new Execution Context is created for this method call and pushed onto the Call Stack. The **this** binding is set to the receiver instance.`;
};

const callingConsole = ({ methodName }: { methodName: string }) => {
  return `Calling **console.${methodName}**. A temporary Execution Context is pushed onto the Call Stack to handle the built-in console output operation.`;
};

const consoleOutput = ({
  methodName,
  args,
}: {
  methodName: string;
  args: string[];
}) => {
  return `**console.${methodName}(${args.map((arg) => `"${arg}"`).join(", ")})** — output written to the console. The console frame is popped from the Call Stack.`;
};

const returningValue = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return `Returning **${displayValue}** from **${funcName}**. The Execution Context is popped off the Call Stack and the return value is passed back to the caller. Local variables are discarded.`;
};

const returningWithClosure = ({ funcName }: { funcName: string }) => {
  return `**${funcName}** returned — local memory removed, but the inner function's **[[Scope]]** retains captured variables. The closure keeps those bindings alive on the Heap even after the outer frame is gone.`;
};

// ── Class Declarations & Instantiation ────────────────────────────────────────

const declaringClass = ({
  name,
  superClassName,
}: {
  name: string;
  superClassName?: string | null;
}) => {
  const extendsStr = superClassName ? ` extends **${superClassName}**` : "";
  return `Declaring class **${name}**${extendsStr}. The class is registered in memory with its constructor, instance methods, and static members. The class object is stored in the current scope.`;
};

const instantiatingClass = ({
  className,
  argsDisplay,
}: {
  className: string;
  argsDisplay: string;
}) => {
  return `**new ${className}(${argsDisplay})** — creating a new instance. A fresh object is allocated on the Heap. Its **[[Prototype]]** is linked to **${className}.prototype** so it can inherit instance methods.`;
};

const executingConstructor = ({ className }: { className: string }) => {
  return `Executing **${className}.constructor**. A new Execution Context is pushed onto the Call Stack for the constructor body. The **this** binding points to the newly created instance on the Heap.`;
};

const executingParentConstructor = ({
  parentClassName,
}: {
  parentClassName: string;
}) => {
  return `Executing **${parentClassName}.constructor**. The parent constructor runs with the same instance as **this**, allowing it to initialize inherited properties on the Heap object.`;
};

const callingSuperConstructor = ({
  parentClassName,
  argsDisplay,
}: {
  parentClassName: string;
  argsDisplay: string;
}) => {
  return `**super(${argsDisplay})** — calling parent constructor **${parentClassName}**. The parent's initialization logic runs before the child class can access **this**.`;
};

const constructorCompleted = ({ className }: { className: string }) => {
  return `**${className}** constructor completed — instance fully initialized on the Heap. The constructor frame is popped from the Call Stack and the new instance reference is returned.`;
};

const methodReturned = ({
  className,
  methodName,
  displayValue,
}: {
  className: string;
  methodName: string;
  displayValue: string;
}) => {
  return `**${className}.${methodName}** returned **${displayValue}**. The method's Execution Context is popped off the Call Stack and the return value is passed back to the caller.`;
};

// ── Conditionals ───────────────────────────────────────────────────────────────

const evaluatingIfCondition = ({ result }: { result: string }) => {
  return `Evaluating **if** condition: ${result}. The condition expression is fully evaluated — the engine will ${result === "true" ? "enter the **if** block" : "skip the **if** block and check for an **else** branch"}.`;
};

// ── Loops ──────────────────────────────────────────────────────────────────────

const forLoopIteration = ({ iteration }: { iteration: number }) => {
  return `**for** loop iteration **${iteration}**. The loop condition is re-evaluated and the loop body executes for this iteration. The update expression will run at the end of this iteration.`;
};

const whileLoopIteration = ({ iteration }: { iteration: number }) => {
  return `**while** loop iteration **${iteration}**. The loop condition evaluated to true — the loop body executes again.`;
};

const forOfIteration = ({
  iteration,
  varName,
  displayValue,
}: {
  iteration: number;
  varName: string;
  displayValue: string;
}) => {
  return `**for...of** iteration **${iteration}** — **${varName}** = ${displayValue}. The next value is pulled from the iterable and bound to the loop variable in the current scope.`;
};

const forOfStart = ({ isGenerator }: { isGenerator: boolean }) => {
  return `**for...of** — iterating over ${isGenerator ? "**generator**" : "**iterable**"}. The iterator protocol is invoked and the engine will call \`.next()\` on each iteration to advance through the values.`;
};

const forOfGeneratorValue = ({ displayValue }: { displayValue: string }) => {
  return `**for...of** — received **${displayValue}** from generator. The generator yielded this value and is now suspended, waiting for the next \`.next()\` call.`;
};

const breakStatement = () => {
  return `**break** — exiting the current loop. Control jumps to the first statement after the loop body.`;
};

const continueStatement = () => {
  return `**continue** — skipping the rest of the current loop body. Control jumps to the loop's update expression (or condition check for **while**).`;
};

// ── Exception Handling ─────────────────────────────────────────────────────────

const throwStatement = ({ displayValue }: { displayValue: string }) => {
  return `**throw** ${displayValue} — an exception is thrown. The engine unwinds the Call Stack looking for the nearest enclosing **try...catch** block to handle it.`;
};

const errorCaught = ({ displayValue }: { displayValue: string }) => {
  return `Error caught: ${displayValue} — entering **catch** block. The thrown value is bound to the catch parameter and the catch body begins executing.`;
};

const enteringFinally = () => {
  return `Entering **finally** block. This code always executes regardless of whether an exception was thrown or caught — it is used to perform cleanup actions.`;
};

// ── Module Import / Export ────────────────────────────────────────────────────

const importDeclaration = ({
  specifierNames,
  source,
}: {
  specifierNames: string;
  source: string;
}) => {
  return `**import { ${specifierNames} } from '${source}'** — module import (simulated). Named bindings are resolved from the module's export map and added to the current scope as **const** bindings.`;
};

const exportNamedDeclaration = ({
  exportedNames,
}: {
  exportedNames: string;
}) => {
  return `**export { ${exportedNames} }** — the listed identifiers are added to this module's export map and made available for other modules to import.`;
};

const exportDefaultFunction = ({ name }: { name: string }) => {
  return `**export default function ${name}** — the function is declared and simultaneously set as this module's default export.`;
};

const exportDefaultClass = ({ name }: { name: string }) => {
  return `**export default class ${name}** — the class is declared and simultaneously set as this module's default export.`;
};

const exportDefaultValue = ({ displayValue }: { displayValue: string }) => {
  return `**export default** ${displayValue} — the value is set as this module's default export and is accessible when the module is imported with a default import.`;
};

// ── Timers ─────────────────────────────────────────────────────────────────────

const timerRegistered = ({
  timerName,
  delay,
}: {
  timerName: string;
  delay: string;
}) => {
  return `**${timerName}(callback, ${delay})** — timer registered in **Web APIs**. The callback will be moved to the Task Queue once the delay elapses and the Call Stack is empty.`;
};

const timerInvalidCallback = ({ timerName }: { timerName: string }) => {
  return `**${timerName}**: callback is not a function — skipped. The first argument must be a function expression or reference for the timer to be registered.`;
};

const timerFired = ({ delay }: { delay: number }) => {
  return `**${delay}ms** timer completed — callback is ready. The Web API moves the callback to the **Task Queue** where it waits for the Call Stack to be empty.`;
};

const intervalRegistered = ({ delay }: { delay: number }) => {
  return `**setInterval(callback, ${delay}ms)** — interval registered in **Web APIs**. The callback will be repeatedly queued in the Task Queue at every ${delay}ms interval.`;
};

const timerCancelled = ({ calleeName }: { calleeName: string }) => {
  return `**${calleeName}(id)** — timer cancelled. The pending callback is removed from the Web APIs and will no longer be queued in the Task Queue.`;
};

// ── Fetch ─────────────────────────────────────────────────────────────────────

const fetchRegistered = ({ url }: { url: string }) => {
  return `**fetch("${url}")** — network request registered in **Web APIs**. The HTTP request runs off the main thread; a pending **Promise** is returned immediately so execution can continue.`;
};

const fetchCompleted = () => {
  return `**fetch** completed — Response received (status 200). The Web API resolves the fetch Promise and queues the \`.then()\` callbacks in the **Microtask Queue**.`;
};

const responseJson = () => {
  return `**response.json()** — parsing response body. The response stream is read and parsed as JSON, returning a new **Promise** that resolves with the parsed data.`;
};

// ── Event Loop ────────────────────────────────────────────────────────────────

const checkingMicrotaskQueue = () => {
  return `Checking **Microtask Queue** after synchronous code. Before the Event Loop picks the next Task, all pending microtasks (Promise callbacks) must be drained first.`;
};

const microtasksPending = () => {
  return `Microtasks pending — draining before next task. The **Microtask Queue** is flushed completely (including any microtasks added during this flush) before the Event Loop returns to the Task Queue.`;
};

const eventLoopPickingTask = () => {
  return `**Event Loop**: Call Stack is empty → picking task from **Task Queue**. The oldest callback in the Task Queue is dequeued and pushed onto the Call Stack for execution.`;
};

const callbackMovedToTaskQueue = () => {
  return `Callback moved from **Web APIs** to **Task Queue**. The timer or I/O callback is now queued and will run on the next Event Loop turn when the Call Stack is empty.`;
};

const callbackExecutionCompleted = () => {
  return `Callback execution completed — Call Stack empty. The engine will check the Microtask Queue again, then look for the next task.`;
};

const executionComplete = () => {
  return `Execution complete — all tasks processed. The Call Stack, Microtask Queue, and Task Queue are all empty. The program has finished running.`;
};

const fetchCheckingMicrotasks = () => {
  return `Fetch resolved — checking **Microtask Queue**. All Promise callbacks enqueued by the resolved fetch are about to be drained.`;
};

const callbackCheckingMicrotasks = () => {
  return `Callback done — checking **Microtask Queue**. Any microtasks queued during the callback execution will be drained before the Event Loop proceeds.`;
};

const setIntervalLimitReached = () => {
  return `**setInterval** iteration limit reached (3 max). The visualizer caps interval callbacks at 3 iterations to prevent infinite loops during visualization.`;
};

// ── Promises ──────────────────────────────────────────────────────────────────

const newPromise = () => {
  return `**new Promise()** — executor will run immediately. The Promise is created in a **pending** state and the executor function is called synchronously right now.`;
};

const executingPromiseExecutor = () => {
  return `Executing **Promise executor** — runs synchronously. The executor body executes on the Call Stack. Calling **resolve()** or **reject()** will settle the Promise.`;
};

const promiseResolveStatic = ({ displayValue }: { displayValue: string }) => {
  return `**Promise.resolve(${displayValue})** — creates a fulfilled **Promise**. If the value is itself a Promise or thenable, the new Promise adopts its state; otherwise it resolves immediately with the given value.`;
};

const promiseRejectStatic = ({ displayValue }: { displayValue: string }) => {
  return `**Promise.reject(${displayValue})** — creates a rejected **Promise** with the given reason. Any attached \`.catch()\` handlers will be queued in the Microtask Queue.`;
};

const promiseResolveCallback = ({ displayValue }: { displayValue: string }) => {
  return `**resolve(${displayValue})** — Promise fulfilled. The Promise transitions from **pending** to **fulfilled** and any registered \`.then()\` callbacks are queued in the **Microtask Queue**.`;
};

const promiseRejectCallback = ({ displayValue }: { displayValue: string }) => {
  return `**reject(${displayValue})** — Promise rejected. The Promise transitions from **pending** to **rejected** and any registered \`.catch()\` callbacks are queued in the **Microtask Queue**.`;
};

const thenRegistered = () => {
  return `**.then()** registered — callback queued when Promise settles. If the Promise is already fulfilled the callback is queued immediately in the **Microtask Queue**; otherwise it waits.`;
};

const thenSkipped = () => {
  return `**.then()** skipped — Promise is **rejected**. The fulfillment handler is bypassed and the rejection propagates down the chain to the next \`.catch()\`.`;
};

const catchQueued = () => {
  return `**.catch()** — Promise rejected, callback → **Microtask Queue**. The rejection handler is queued and will execute on the next microtask drain.`;
};

const catchSkipped = () => {
  return `**.catch()** skipped — Promise is **fulfilled**. The rejection handler is bypassed and the resolved value propagates down the chain.`;
};

const catchRegistered = () => {
  return `**.catch()** registered — will handle rejection. If the Promise is already rejected the handler is queued immediately in the **Microtask Queue**; otherwise it waits.`;
};

const finallyQueued = () => {
  return `**.finally()** — callback → **Microtask Queue** (will run on settle). The finally handler always runs regardless of fulfillment or rejection, without receiving the settled value.`;
};

const finallyRegistered = () => {
  return `**.finally()** registered — will run on settle. The callback is enqueued in the **Microtask Queue** once the Promise settles, running unconditionally.`;
};

const executingMicrotask = ({ displayValue }: { displayValue: string }) => {
  return `Executing **.then().catch().finally()** callback with value: **${displayValue}**. The microtask is dequeued, a new Execution Context is pushed, and the callback body runs.`;
};

const promiseAll = ({
  count,
  hasRejected,
  values,
}: {
  count: number;
  hasRejected: boolean;
  values?: number;
}) => {
  if (hasRejected) {
    return `**Promise.all([${count} promises])** — rejected. One or more Promises rejected; **Promise.all** short-circuits and the resulting Promise rejects immediately with the first rejection reason.`;
  }
  return `**Promise.all([${count} promises])** — resolved with [${values} values]. All Promises fulfilled; the resulting Promise resolves with an array of their values in the original order.`;
};

const promiseAllSettled = ({
  count,
  hasRejected,
  values,
}: {
  count: number;
  hasRejected: boolean;
  values?: number;
}) => {
  if (hasRejected) {
    return `**Promise.allSettled([${count} promises])** — some rejected. Unlike \`Promise.all\`, it waits for all Promises to settle and returns an array of **{ status, value/reason }** objects.`;
  }
  return `**Promise.allSettled([${count} promises])** — resolved with [${values} values]. All Promises settled (fulfilled or rejected); the resulting Promise resolves with the status array.`;
};

const promiseRace = ({
  count,
  state,
  displayValue,
}: {
  count: number;
  state: string;
  displayValue?: string;
}) => {
  if (state === "pending") {
    return `**Promise.race([${count} promises])** — all pending. The resulting Promise will adopt the state of whichever Promise settles first.`;
  }
  return `**Promise.race([${count} promises])** — ${state} with ${displayValue}. The first Promise to settle determined the outcome; the rest are ignored.`;
};

const promiseAllEmpty = () => {
  return `**Promise.all([])** — resolved with []. An empty input array means all zero Promises are immediately fulfilled, so the result resolves synchronously with an empty array.`;
};

const promiseAllSettledEmpty = () => {
  return `**Promise.allSettled([])** — resolved with []. An empty input array means the resulting Promise resolves synchronously with an empty status array.`;
};

const promiseRaceEmpty = () => {
  return `**Promise.race([])** — forever pending. An empty array means no Promise will ever settle, so the resulting Promise remains in the **pending** state indefinitely.`;
};

const promiseNotIterable = ({ method }: { method: string }) => {
  return `**Promise.${method}**: argument not iterable. The argument passed to \`Promise.${method}\` must be an iterable (e.g., an array); a TypeError would be thrown at runtime.`;
};

const promiseMethodNotSupported = ({ methodName }: { methodName: string }) => {
  return `**Promise.${methodName}** (not supported). This Promise static method is not implemented in the visualizer's execution engine.`;
};

// ── Async / Await ─────────────────────────────────────────────────────────────

const callingAsyncFunction = ({ funcName }: { funcName: string }) => {
  return `Calling **async ${funcName}()** — returns **Promise** (pending). An async function always returns a Promise. The function body starts executing synchronously up to the first **await**.`;
};

const asyncFunctionCompleted = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return `**async ${funcName}** completed — Promise resolved with **${displayValue}**. The returned Promise is fulfilled and any \`.then()\` callbacks are queued in the Microtask Queue.`;
};

const asyncFunctionThrew = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return `**async ${funcName}** threw — Promise rejected with **${displayValue}**. An unhandled exception inside an async function causes its returned Promise to reject.`;
};

const asyncFunctionSuspended = ({ funcName }: { funcName: string }) => {
  return `**async ${funcName}** suspended at **await** — yielding execution. The function is paused and its state is saved. Control returns to the caller while the awaited Promise settles.`;
};

const awaitCheckingPromise = () => {
  return `**await** — checking if Promise is settled. If the Promise is already resolved the function will be resumed immediately in the Microtask Queue; otherwise it waits.`;
};

const asyncFunctionResumed = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return `**async ${funcName}** resumed — await resolved with **${displayValue}**. The function's saved state is restored, the await expression evaluates to the resolved value, and execution continues.`;
};

const asyncContinuationCompleted = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return `**async ${funcName}** completed — Promise resolved with **${displayValue}**. All awaits have settled and the async function's returned Promise is now fulfilled.`;
};

const asyncContinuationThrew = ({ funcName }: { funcName: string }) => {
  return `**async ${funcName}** threw — Promise rejected. An exception occurred during the resumed execution and the function's returned Promise is rejected with that error.`;
};

const asyncContinuationRejected = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return `**async ${funcName}** — await rejected, Promise rejected with **${displayValue}**. The awaited Promise was rejected and there is no enclosing try/catch to handle it inside the async function.`;
};

// ── Generators ────────────────────────────────────────────────────────────────

const generatorCreated = ({
  funcName,
  argsDisplay,
}: {
  funcName: string;
  argsDisplay: string;
}) => {
  return `**${funcName}(${argsDisplay})** — generator object created (suspended). Calling a generator function does NOT execute its body; it returns a **Generator** object in the **suspended** state.`;
};

const generatorNext = ({ inputValue }: { inputValue?: string }) => {
  const inputStr = inputValue !== undefined ? `**${inputValue}**` : "undefined";
  return `**gen.next(${inputValue ?? ""})** — resuming generator with value ${inputStr}. Execution continues from the last **yield** point; the input value becomes the result of the yield expression inside the generator.`;
};

const generatorReturn = ({ displayValue }: { displayValue: string }) => {
  return `**gen.return(${displayValue})** — generator closed. The generator is forcefully terminated and returns **{ value: ${displayValue}, done: true }** regardless of remaining yield points.`;
};

const generatorThrow = ({ displayValue }: { displayValue: string }) => {
  return `**gen.throw(${displayValue})** — generator closed with error. The error is thrown at the last suspension point inside the generator; if unhandled, the generator terminates.`;
};

const generatorAlreadyClosed = ({ method }: { method: string }) => {
  return `**gen.${method}()** — generator already closed. The generator has already finished (done: true) or was terminated; calling methods on a closed generator has no effect.`;
};

const yieldStatement = ({ displayValue }: { displayValue: string }) => {
  return `**yield ${displayValue}** — generator suspended, returned **{ value: ${displayValue}, done: false }**. Execution is paused here and the yielded value is passed back to the caller's \`.next()\` call.`;
};

const generatorCompleted = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return `Generator **${funcName}** completed — returned **{ value: ${displayValue}, done: true }**. The generator function body ran to completion; the generator is now closed.`;
};

const generatorMaxIterations = () => {
  return `Generator closed — max iterations reached. The visualizer caps generator resumptions to prevent infinite loops during visualization.`;
};

// ── Unsupported ───────────────────────────────────────────────────────────────

const unsupportedNew = ({ name }: { name: string }) => {
  return `**new ${name}** (not supported). This constructor call is not implemented in the visualizer's execution engine and will be skipped.`;
};

// ── Export ────────────────────────────────────────────────────────────────────

const description = {
  // Execution start
  startingExecution,
  // Variables
  declaringVariable,
  destructuringVariable,
  destructuringRest,
  // Assignments
  assigningVariable,
  assigningProperty,
  assigningThisProperty,
  incrementDecrement,
  // Functions
  declaringFunction,
  callingFunction,
  callingMethod,
  callingConsole,
  consoleOutput,
  returningValue,
  returningWithClosure,
  // Classes
  declaringClass,
  instantiatingClass,
  executingConstructor,
  executingParentConstructor,
  callingSuperConstructor,
  constructorCompleted,
  methodReturned,
  // Control flow
  evaluatingIfCondition,
  forLoopIteration,
  whileLoopIteration,
  forOfIteration,
  forOfStart,
  forOfGeneratorValue,
  breakStatement,
  continueStatement,
  // Exceptions
  throwStatement,
  errorCaught,
  enteringFinally,
  // Modules
  importDeclaration,
  exportNamedDeclaration,
  exportDefaultFunction,
  exportDefaultClass,
  exportDefaultValue,
  // Timers
  timerRegistered,
  timerInvalidCallback,
  timerFired,
  intervalRegistered,
  timerCancelled,
  // Fetch
  fetchRegistered,
  fetchCompleted,
  responseJson,
  // Event loop
  checkingMicrotaskQueue,
  microtasksPending,
  eventLoopPickingTask,
  callbackMovedToTaskQueue,
  callbackExecutionCompleted,
  executionComplete,
  fetchCheckingMicrotasks,
  callbackCheckingMicrotasks,
  setIntervalLimitReached,
  // Promises
  newPromise,
  executingPromiseExecutor,
  promiseResolveStatic,
  promiseRejectStatic,
  promiseResolveCallback,
  promiseRejectCallback,
  thenRegistered,
  thenSkipped,
  catchQueued,
  catchSkipped,
  catchRegistered,
  finallyQueued,
  finallyRegistered,
  executingMicrotask,
  promiseAll,
  promiseAllSettled,
  promiseRace,
  promiseAllEmpty,
  promiseAllSettledEmpty,
  promiseRaceEmpty,
  promiseNotIterable,
  promiseMethodNotSupported,
  // Async/await
  callingAsyncFunction,
  asyncFunctionCompleted,
  asyncFunctionThrew,
  asyncFunctionSuspended,
  awaitCheckingPromise,
  asyncFunctionResumed,
  asyncContinuationCompleted,
  asyncContinuationThrew,
  asyncContinuationRejected,
  // Generators
  generatorCreated,
  generatorNext,
  generatorReturn,
  generatorThrow,
  generatorAlreadyClosed,
  yieldStatement,
  generatorCompleted,
  generatorMaxIterations,
  // Unsupported
  unsupportedNew,
};

export default description;
