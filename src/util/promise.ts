/*
A standard "sleep" method implemented via setTimeout/sleep.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
