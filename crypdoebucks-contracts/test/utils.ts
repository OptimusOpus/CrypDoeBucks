import { ethers } from "ethers";

export const getRevertMessage = (error: any) => {
  if (typeof error !== "string") error = error.message;
  const prefix = "VM Exception while processing transaction: revert ";
  const suffix = "\n";
  error = error.substring(error.indexOf(""));
  error = error.substring(
    error.indexOf(prefix) + prefix.length,
    error.indexOf(suffix) > -1 ? error.indexOf(suffix) : error.length
  );
  // Depending on the formatting of the message, it might wrap the
  // revert message in '' and mention "reverted" instead of revert.
  return error.startsWith("ed") && error.endsWith("'")
    ? error.substring(error.indexOf("'") + 1, error.length - 1)
    : error;
};

export const getEventData = (
  eventName: string,
  contract: ethers.Contract,
  txResult: ethers.ContractReceipt
): any => {
  if (!Array.isArray(txResult.logs)) return null;
  for (const log of txResult.logs) {
    try {
      const decoded = contract.interface.parseLog(log);
      if (decoded.name === eventName)
        return {
          ...decoded,
          ...decoded.args,
        };
    } catch (error) {}
  }
  return null;
};
