/**
 * Mock MPC (Multi-Party Computation) signing function
 * Simulates the process of obtaining partial signatures from multiple devices
 */
export async function signWithMPC(txId: string): Promise<boolean> {
  console.log('Requesting partial signature from Child Device...');
  
  // Simulate delay for child device signature
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  console.log('Requesting partial signature from Parent Device...');
  
  // Simulate delay for parent device signature
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Total delay: 2000ms
  return true;
}

