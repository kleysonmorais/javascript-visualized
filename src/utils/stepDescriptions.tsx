const startingExecution = (isModule: boolean) => {
  return isModule
    ? "Starting module execution"
    : "The JavaScript engine begins executing the script. A new **Global Execution Context** is created and pushed onto the Call Stack. Global memory (the Variable Environment) is initialized.";
};

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
    return `Calling ${argsDisplay ? `**${name}** with arguments (${argsDisplay})` : `**${name}()**`} on receiver ${JSON.stringify(receiver)}. A new Execution Context is created for this function call and pushed onto the Call Stack. The function's parameters are evaluated and stored in the new Execution Context's Variable Environment. The function body begins executing.`;
  }

  return `Calling ${argsDisplay ? `**${name}** with arguments (${argsDisplay})` : `**${name}()**`}. A new **Execution Context** is created for this function call and pushed onto the Call Stack. The function's parameters are evaluated and stored in the new Execution Context's Variable Environment. The function body begins executing.`;
};

const description = { startingExecution, declaringFunction, callingFunction };

export default description;
