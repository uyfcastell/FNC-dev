import type { Deposit } from "./api";

export const getOperationalDeposits = (deposits: Deposit[]): Deposit[] => deposits.filter((deposit) => !deposit.is_store);
