'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * DevTools component for local testing
 * Only shows when connected to localhost validator
 */
export function DevTools() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const [balance, setBalance] = useState<number | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  // Only show on localhost
  const isLocalhost = typeof window !== 'undefined' &&
    (connection.rpcEndpoint.includes('127.0.0.1') || connection.rpcEndpoint.includes('localhost'));

  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(null);
    }
  }, [connected, publicKey, fetchBalance]);

  const handleAirdrop = async (amount: number) => {
    if (!publicKey) {
      setMessage('Connect wallet first');
      return;
    }

    setIsAirdropping(true);
    setMessage(null);

    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(signature);
      setMessage(`Airdropped ${amount} SOL!`);
      await fetchBalance();
    } catch (err) {
      console.error('Airdrop failed:', err);
      setMessage('Airdrop failed - is local validator running?');
    } finally {
      setIsAirdropping(false);
    }
  };

  if (!isLocalhost) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-900/95 border-2 border-yellow-500 rounded-lg p-4 text-sm z-50 max-w-sm shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-yellow-200 font-bold">LOCAL TEST MODE</span>
      </div>

      <p className="text-yellow-100/80 text-xs mb-3">
        Connected to local validator. All SOL is free test currency.
      </p>

      {connected && publicKey ? (
        <>
          <div className="mb-3">
            <div className="text-yellow-100/60 text-xs mb-1">Connected Wallet:</div>
            <div className="font-mono text-xs text-yellow-200 bg-yellow-950/50 p-1.5 rounded truncate">
              {publicKey.toBase58()}
            </div>
            <div className="text-yellow-100 mt-2">
              Balance: <span className="font-mono font-bold">{balance?.toFixed(4) ?? '...'} SOL</span>
            </div>
          </div>

          <div className="text-yellow-100/60 text-xs mb-2">Airdrop free test SOL:</div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => handleAirdrop(1)}
              disabled={isAirdropping}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-bold rounded transition-colors"
            >
              +1 SOL
            </button>
            <button
              onClick={() => handleAirdrop(5)}
              disabled={isAirdropping}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-bold rounded transition-colors"
            >
              +5 SOL
            </button>
            <button
              onClick={() => handleAirdrop(10)}
              disabled={isAirdropping}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-bold rounded transition-colors"
            >
              +10 SOL
            </button>
          </div>

          {message && (
            <p className={`text-xs ${message.includes('failed') ? 'text-red-300' : 'text-green-300'}`}>
              {message}
            </p>
          )}

          <button
            onClick={fetchBalance}
            className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 underline"
          >
            Refresh Balance
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-red-900/30 border border-red-500/30 rounded">
            <p className="text-red-200 text-xs font-bold mb-1">Wallet not connected to localhost</p>
            <p className="text-red-200/70 text-xs">
              Your wallet needs to be set to Localhost network to test.
            </p>
          </div>

          <button
            onClick={() => setShowSetup(!showSetup)}
            className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-bold rounded transition-colors"
          >
            {showSetup ? 'Hide Setup Guide' : 'Show Setup Guide'}
          </button>

          {showSetup && (
            <div className="p-3 bg-yellow-950/50 rounded border border-yellow-600/30 text-xs text-yellow-100 space-y-2">
              <p className="font-bold text-yellow-200">Phantom Setup:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li>Open Phantom wallet</li>
                <li>Click the gear icon (Settings)</li>
                <li>Scroll down to "Developer Settings"</li>
                <li>Enable "Testnet Mode"</li>
                <li>Go back, click network selector at top</li>
                <li>Select "Localhost" or add custom RPC:</li>
              </ol>
              <div className="font-mono bg-black/30 p-2 rounded text-yellow-300 break-all">
                http://127.0.0.1:8899
              </div>
              <p className="text-yellow-100/60 mt-2">
                After setting up, click "Select Wallet" and connect Phantom.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
