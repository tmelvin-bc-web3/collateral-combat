'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface ProfilePickerTwitterProps {
  selectedHandle: string | null;
  onSelect: (handle: string) => void;
}

function isValidHandle(handle: string): boolean {
  return /^[a-zA-Z0-9_]{1,15}$/.test(handle);
}

export function ProfilePickerTwitter({
  selectedHandle,
  onSelect,
}: ProfilePickerTwitterProps) {
  const [input, setInput] = useState(selectedHandle || '');
  const [previewHandle, setPreviewHandle] = useState<string | null>(selectedHandle);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce preview updates
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const sanitized = input.replace(/^@/, '');
    if (!sanitized) {
      setPreviewHandle(null);
      setValidationError(null);
      setImgLoaded(false);
      setImgError(false);
      return;
    }

    if (!isValidHandle(sanitized)) {
      setValidationError('1-15 characters: letters, numbers, underscores only');
      setPreviewHandle(null);
      return;
    }

    setValidationError(null);
    debounceRef.current = setTimeout(() => {
      setImgLoaded(false);
      setImgError(false);
      setPreviewHandle(sanitized);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input]);

  const handleConfirm = () => {
    if (previewHandle && imgLoaded && !imgError) {
      onSelect(previewHandle);
    }
  };

  const isConfirmed = selectedHandle === previewHandle && selectedHandle !== null;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Input */}
      <div className="w-full">
        <label className="block text-xs text-text-tertiary mb-1">Twitter / X Handle</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">@</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/^@/, ''))}
            placeholder="handle"
            maxLength={15}
            className={`w-full pl-7 pr-3 py-2 bg-bg-tertiary border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors ${
              validationError
                ? 'border-danger focus:ring-danger/50'
                : 'border-border-primary focus:ring-accent/50'
            }`}
          />
        </div>
        {validationError && (
          <p className="text-xs text-danger mt-1">{validationError}</p>
        )}
      </div>

      {/* Preview */}
      {previewHandle && !validationError && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-tertiary relative">
            {!imgLoaded && !imgError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {imgError ? (
              <div className="absolute inset-0 flex items-center justify-center text-center px-2">
                <p className="text-xs text-danger">Could not load avatar</p>
              </div>
            ) : (
              <Image
                key={previewHandle}
                src={`https://unavatar.io/twitter/${previewHandle}`}
                alt={`@${previewHandle}`}
                width={80}
                height={80}
                className={`object-cover w-full h-full transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                unoptimized
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgError(true); setImgLoaded(false); }}
              />
            )}
          </div>
          <p className="text-sm text-text-secondary">@{previewHandle}</p>

          {imgLoaded && !imgError && (
            <button
              onClick={handleConfirm}
              disabled={isConfirmed}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isConfirmed
                  ? 'bg-success/20 text-success border border-success/30 cursor-default'
                  : 'bg-accent text-white hover:bg-accent/90'
              }`}
            >
              {isConfirmed ? 'Selected' : 'Use this photo'}
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!previewHandle && !validationError && (
        <div className="text-center py-8 text-text-tertiary">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <p className="text-sm">Enter your Twitter handle to use your profile picture</p>
        </div>
      )}
    </div>
  );
}
