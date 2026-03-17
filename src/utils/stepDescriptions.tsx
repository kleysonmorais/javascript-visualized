import i18n from "@/i18n";

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key, options);

// ── Execution Start ────────────────────────────────────────────────────────────

const startingExecution = (isModule: boolean) => {
  return isModule
    ? t("stepDescriptions.startingExecutionModule")
    : t("stepDescriptions.startingExecution");
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
  return t("stepDescriptions.declaringVariable", {
    exportPrefix,
    kind,
    name,
    displayValue,
  });
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
    return t("stepDescriptions.destructuringVariableFrom", {
      varName,
      displayValue,
      sourceName,
    });
  }
  return t("stepDescriptions.destructuringVariable", { varName, displayValue });
};

const destructuringRest = ({
  restName,
  kind,
}: {
  restName: string;
  kind: "object" | "array";
}) => {
  if (kind === "object") {
    return t("stepDescriptions.destructuringRestObject", { restName });
  }
  return t("stepDescriptions.destructuringRestArray", { restName });
};

// ── Assignments ────────────────────────────────────────────────────────────────

const assigningVariable = ({
  name,
  displayValue,
}: {
  name: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.assigningVariable", { name, displayValue });
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
  return t("stepDescriptions.assigningProperty", {
    objLabel,
    propName,
    displayValue,
  });
};

const assigningThisProperty = ({
  propName,
  displayValue,
}: {
  propName: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.assigningThisProperty", {
    propName,
    displayValue,
  });
};

const incrementDecrement = ({
  name,
  operator,
}: {
  name: string;
  operator: "++" | "--";
}) => {
  const operatorDesc = operator === "++" ? "+ 1" : "- 1";
  return t("stepDescriptions.incrementDecrement", { name, operatorDesc });
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
  return t("stepDescriptions.declaringFunction", {
    asyncPrefix,
    generatorPrefix,
    name,
  });
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
    const receiverDisplay: string = "[Object]";
    return argsDisplay
      ? t("stepDescriptions.callingFunctionWithArgs", {
          name,
          argsDisplay,
          receiverDisplay,
        })
      : t("stepDescriptions.callingFunctionNoArgs", {
          name,
          receiverDisplay,
        });
  }
  return argsDisplay
    ? t("stepDescriptions.callingFunctionWithArgsNoReceiver", {
        name,
        argsDisplay,
      })
    : t("stepDescriptions.callingFunctionNoArgsNoReceiver", { name });
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
  return t("stepDescriptions.callingMethod", {
    className,
    methodName,
    argsDisplay,
  });
};

const callingConsole = ({ methodName }: { methodName: string }) => {
  return t("stepDescriptions.callingConsole", { methodName });
};

const consoleOutput = ({
  methodName,
  args,
}: {
  methodName: string;
  args: string[];
}) => {
  return t("stepDescriptions.consoleOutput", {
    methodName,
    args: args.map((arg) => `"${arg}"`).join(", "),
  });
};

const returningValue = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.returningValue", { funcName, displayValue });
};

const returningWithClosure = ({ funcName }: { funcName: string }) => {
  return t("stepDescriptions.returningWithClosure", { funcName });
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
  return t("stepDescriptions.declaringClass", { name, extendsStr });
};

const instantiatingClass = ({
  className,
  argsDisplay,
}: {
  className: string;
  argsDisplay: string;
}) => {
  return t("stepDescriptions.instantiatingClass", { className, argsDisplay });
};

const executingConstructor = ({ className }: { className: string }) => {
  return t("stepDescriptions.executingConstructor", { className });
};

const executingParentConstructor = ({
  parentClassName,
}: {
  parentClassName: string;
}) => {
  return t("stepDescriptions.executingParentConstructor", { parentClassName });
};

const callingSuperConstructor = ({
  parentClassName,
  argsDisplay,
}: {
  parentClassName: string;
  argsDisplay: string;
}) => {
  return t("stepDescriptions.callingSuperConstructor", {
    parentClassName,
    argsDisplay,
  });
};

const constructorCompleted = ({ className }: { className: string }) => {
  return t("stepDescriptions.constructorCompleted", { className });
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
  return t("stepDescriptions.methodReturned", {
    className,
    methodName,
    displayValue,
  });
};

// ── Conditionals ───────────────────────────────────────────────────────────────

const evaluatingIfCondition = ({ result }: { result: string }) => {
  return result === "true"
    ? t("stepDescriptions.evaluatingIfConditionTrue", { result })
    : t("stepDescriptions.evaluatingIfConditionFalse", { result });
};

// ── Loops ──────────────────────────────────────────────────────────────────────

const forLoopIteration = ({ iteration }: { iteration: number }) => {
  return t("stepDescriptions.forLoopIteration", { iteration });
};

const whileLoopIteration = ({ iteration }: { iteration: number }) => {
  return t("stepDescriptions.whileLoopIteration", { iteration });
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
  return t("stepDescriptions.forOfIteration", {
    iteration,
    varName,
    displayValue,
  });
};

const forOfStart = ({ isGenerator }: { isGenerator: boolean }) => {
  return isGenerator
    ? t("stepDescriptions.forOfStartGenerator")
    : t("stepDescriptions.forOfStartIterable");
};

const forOfGeneratorValue = ({ displayValue }: { displayValue: string }) => {
  return t("stepDescriptions.forOfGeneratorValue", { displayValue });
};

const breakStatement = () => {
  return t("stepDescriptions.breakStatement");
};

const continueStatement = () => {
  return t("stepDescriptions.continueStatement");
};

// ── Exception Handling ─────────────────────────────────────────────────────────

const throwStatement = ({ displayValue }: { displayValue: string }) => {
  return t("stepDescriptions.throwStatement", { displayValue });
};

const errorCaught = ({ displayValue }: { displayValue: string }) => {
  return t("stepDescriptions.errorCaught", { displayValue });
};

const enteringFinally = () => {
  return t("stepDescriptions.enteringFinally");
};

// ── Module Import / Export ────────────────────────────────────────────────────

const importDeclaration = ({
  specifierNames,
  source,
}: {
  specifierNames: string;
  source: string;
}) => {
  return t("stepDescriptions.importDeclaration", { specifierNames, source });
};

const exportNamedDeclaration = ({
  exportedNames,
}: {
  exportedNames: string;
}) => {
  return t("stepDescriptions.exportNamedDeclaration", { exportedNames });
};

const exportDefaultFunction = ({ name }: { name: string }) => {
  return t("stepDescriptions.exportDefaultFunction", { name });
};

const exportDefaultClass = ({ name }: { name: string }) => {
  return t("stepDescriptions.exportDefaultClass", { name });
};

const exportDefaultValue = ({ displayValue }: { displayValue: string }) => {
  return t("stepDescriptions.exportDefaultValue", { displayValue });
};

// ── Timers ─────────────────────────────────────────────────────────────────────

const timerRegistered = ({
  timerName,
  delay,
}: {
  timerName: string;
  delay: string;
}) => {
  return t("stepDescriptions.timerRegistered", { timerName, delay });
};

const timerInvalidCallback = ({ timerName }: { timerName: string }) => {
  return t("stepDescriptions.timerInvalidCallback", { timerName });
};

const timerFired = ({ delay }: { delay: number }) => {
  return t("stepDescriptions.timerFired", { delay });
};

const intervalRegistered = ({ delay }: { delay: number }) => {
  return t("stepDescriptions.intervalRegistered", { delay });
};

const timerCancelled = ({ calleeName }: { calleeName: string }) => {
  return t("stepDescriptions.timerCancelled", { calleeName });
};

// ── Fetch ─────────────────────────────────────────────────────────────────────

const fetchRegistered = ({ url }: { url: string }) => {
  return t("stepDescriptions.fetchRegistered", { url });
};

const fetchCompleted = () => {
  return t("stepDescriptions.fetchCompleted");
};

const responseJson = () => {
  return t("stepDescriptions.responseJson");
};

// ── Event Loop ────────────────────────────────────────────────────────────────

const checkingMicrotaskQueue = () => {
  return t("stepDescriptions.checkingMicrotaskQueue");
};

const microtasksPending = () => {
  return t("stepDescriptions.microtasksPending");
};

const eventLoopPickingTask = () => {
  return t("stepDescriptions.eventLoopPickingTask");
};

const callbackMovedToTaskQueue = () => {
  return t("stepDescriptions.callbackMovedToTaskQueue");
};

const callbackExecutionCompleted = () => {
  return t("stepDescriptions.callbackExecutionCompleted");
};

const executionComplete = () => {
  return t("stepDescriptions.executionComplete");
};

const fetchCheckingMicrotasks = () => {
  return t("stepDescriptions.fetchCheckingMicrotasks");
};

const callbackCheckingMicrotasks = () => {
  return t("stepDescriptions.callbackCheckingMicrotasks");
};

const setIntervalLimitReached = () => {
  return t("stepDescriptions.setIntervalLimitReached");
};

// ── Promises ──────────────────────────────────────────────────────────────────

const newPromise = () => {
  return t("stepDescriptions.newPromise");
};

const executingPromiseExecutor = () => {
  return t("stepDescriptions.executingPromiseExecutor");
};

const promiseResolveStatic = ({ displayValue }: { displayValue: string }) => {
  const value =
    displayValue && displayValue !== "undefined" ? displayValue : "";
  return t("stepDescriptions.promiseResolveStatic", { value });
};

const promiseRejectStatic = ({ displayValue }: { displayValue: string }) => {
  const value =
    displayValue && displayValue !== "undefined" ? displayValue : "";
  return t("stepDescriptions.promiseRejectStatic", { value });
};

const promiseResolveCallback = ({ displayValue }: { displayValue: string }) => {
  const value =
    displayValue && displayValue !== "undefined" ? displayValue : "";
  return t("stepDescriptions.promiseResolveCallback", { value });
};

const promiseRejectCallback = ({ displayValue }: { displayValue: string }) => {
  const value =
    displayValue && displayValue !== "undefined" ? displayValue : "";
  return t("stepDescriptions.promiseRejectCallback", { value });
};

const thenRegistered = () => {
  return t("stepDescriptions.thenRegistered");
};

const thenSkipped = () => {
  return t("stepDescriptions.thenSkipped");
};

const catchQueued = () => {
  return t("stepDescriptions.catchQueued");
};

const catchSkipped = () => {
  return t("stepDescriptions.catchSkipped");
};

const catchRegistered = () => {
  return t("stepDescriptions.catchRegistered");
};

const finallyQueued = () => {
  return t("stepDescriptions.finallyQueued");
};

const finallyRegistered = () => {
  return t("stepDescriptions.finallyRegistered");
};

const executingMicrotask = ({ displayValue }: { displayValue: string }) => {
  return t("stepDescriptions.executingMicrotask", { displayValue });
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
    return t("stepDescriptions.promiseAllRejected", { count });
  }
  return t("stepDescriptions.promiseAllResolved", { count, values });
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
    return t("stepDescriptions.promiseAllSettledRejected", { count });
  }
  return t("stepDescriptions.promiseAllSettledResolved", { count, values });
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
    return t("stepDescriptions.promiseRacePending", { count });
  }
  return t("stepDescriptions.promiseRaceSettled", {
    count,
    state,
    displayValue,
  });
};

const promiseAllEmpty = () => {
  return t("stepDescriptions.promiseAllEmpty");
};

const promiseAllSettledEmpty = () => {
  return t("stepDescriptions.promiseAllSettledEmpty");
};

const promiseRaceEmpty = () => {
  return t("stepDescriptions.promiseRaceEmpty");
};

const promiseNotIterable = ({ method }: { method: string }) => {
  return t("stepDescriptions.promiseNotIterable", { method });
};

const promiseMethodNotSupported = ({ methodName }: { methodName: string }) => {
  return t("stepDescriptions.promiseMethodNotSupported", { methodName });
};

// ── Async / Await ─────────────────────────────────────────────────────────────

const callingAsyncFunction = ({ funcName }: { funcName: string }) => {
  return t("stepDescriptions.callingAsyncFunction", { funcName });
};

const asyncFunctionCompleted = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.asyncFunctionCompleted", {
    funcName,
    displayValue,
  });
};

const asyncFunctionThrew = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.asyncFunctionThrew", { funcName, displayValue });
};

const asyncFunctionSuspended = ({ funcName }: { funcName: string }) => {
  return t("stepDescriptions.asyncFunctionSuspended", { funcName });
};

const awaitCheckingPromise = () => {
  return t("stepDescriptions.awaitCheckingPromise");
};

const asyncFunctionResumed = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.asyncFunctionResumed", { funcName, displayValue });
};

const asyncContinuationCompleted = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.asyncContinuationCompleted", {
    funcName,
    displayValue,
  });
};

const asyncContinuationThrew = ({ funcName }: { funcName: string }) => {
  return t("stepDescriptions.asyncContinuationThrew", { funcName });
};

const asyncContinuationRejected = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.asyncContinuationRejected", {
    funcName,
    displayValue,
  });
};

// ── Generators ────────────────────────────────────────────────────────────────

const generatorCreated = ({
  funcName,
  argsDisplay,
}: {
  funcName: string;
  argsDisplay: string;
}) => {
  return t("stepDescriptions.generatorCreated", { funcName, argsDisplay });
};

const generatorNext = ({ inputValue }: { inputValue?: string }) => {
  const inputStr = inputValue !== undefined ? `**${inputValue}**` : "undefined";
  return t("stepDescriptions.generatorNext", {
    inputValue: inputValue ?? "",
    inputStr,
  });
};

const generatorReturn = ({ displayValue }: { displayValue: string }) => {
  return t("stepDescriptions.generatorReturn", { displayValue });
};

const generatorThrow = ({ displayValue }: { displayValue: string }) => {
  return t("stepDescriptions.generatorThrow", { displayValue });
};

const generatorAlreadyClosed = ({ method }: { method: string }) => {
  return t("stepDescriptions.generatorAlreadyClosed", { method });
};

const yieldStatement = ({ displayValue }: { displayValue: string }) => {
  return t("stepDescriptions.yieldStatement", { displayValue });
};

const generatorCompleted = ({
  funcName,
  displayValue,
}: {
  funcName: string;
  displayValue: string;
}) => {
  return t("stepDescriptions.generatorCompleted", { funcName, displayValue });
};

const generatorMaxIterations = () => {
  return t("stepDescriptions.generatorMaxIterations");
};

// ── Unsupported ───────────────────────────────────────────────────────────────

const unsupportedNew = ({ name }: { name: string }) => {
  return t("stepDescriptions.unsupportedNew", { name });
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
