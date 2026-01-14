import bs58 from 'bs58';

/**
 * Signs an authentication message for API requests.
 * Message format: "DegenDome:auth:{timestamp}"
 *
 * @param signMessage - The wallet's signMessage function
 * @returns Headers object with x-signature and x-timestamp
 */
export async function signAuthMessage(
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<{ signature: string; timestamp: string }> {
  const timestamp = Date.now().toString();
  const message = `DegenDome:auth:${timestamp}`;
  const messageBytes = new TextEncoder().encode(message);

  const signatureBytes = await signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  return { signature, timestamp };
}

/**
 * Creates headers for authenticated API requests.
 *
 * @param walletAddress - The wallet's public key (base58)
 * @param signMessage - The wallet's signMessage function
 * @returns Headers object for fetch requests
 */
export async function createAuthHeaders(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<Record<string, string>> {
  const { signature, timestamp } = await signAuthMessage(signMessage);

  return {
    'x-wallet-address': walletAddress,
    'x-signature': signature,
    'x-timestamp': timestamp,
  };
}

/**
 * Makes an authenticated fetch request.
 *
 * @param url - The URL to fetch
 * @param walletAddress - The wallet's public key (base58)
 * @param signMessage - The wallet's signMessage function
 * @param options - Additional fetch options
 * @returns Fetch response
 */
export async function authenticatedFetch(
  url: string,
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  options: RequestInit = {}
): Promise<Response> {
  const authHeaders = await createAuthHeaders(walletAddress, signMessage);

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  });
}
