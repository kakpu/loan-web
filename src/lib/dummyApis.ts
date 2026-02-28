export const dummyPreCredit = async (): Promise<{
  approved: boolean;
  creditLimit: number;
}> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const random = Math.random();
  if (random < 0.2) {
    return { approved: false, creditLimit: 0 };
  }

  const creditLimit = Math.floor(Math.random() * 50) * 10000 + 100000;
  return { approved: true, creditLimit };
};

export const dummyEkyc = async (): Promise<{
  success: boolean;
}> => {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const random = Math.random();
  return { success: random > 0.1 };
};

export const dummyAntisocialCheck = async (): Promise<{
  passed: boolean;
}> => {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const random = Math.random();
  return { passed: random > 0.05 };
};

export const dummyPayPayPayment = async (_amount: number): Promise<{
  success: boolean;
  transactionId: string;
}> => {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    success: true,
    transactionId: `PAYPAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
};
