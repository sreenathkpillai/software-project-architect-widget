'use client';

import { useState, useEffect } from 'react';

interface SaveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessionName: string) => void;
  isLoading?: boolean;
  defaultName?: string;
}

export default function SaveSessionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  isLoading = false,
  defaultName = '' 
}: SaveSessionModalProps) {
  const [sessionName, setSessionName] = useState(defaultName);
  const [error, setError] = useState('');

  // Update session name when default changes
  useEffect(() => {
    if (isOpen) {
      setSessionName(defaultName);
      setError('');
    }
  }, [isOpen, defaultName]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = sessionName.trim();
    
    if (!trimmedName) {
      setError('Session name is required');
      return;
    }
    
    if (trimmedName.length < 3) {
      setError('Session name must be at least 3 characters');
      return;
    }

    setError('');
    onSave(trimmedName);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        style={{
          background: 'var(--widget-surface)',
          borderColor: 'var(--widget-border-color)',
          borderRadius: 'var(--widget-border-radius-large)',
          boxShadow: 'var(--widget-shadow-large)',
          color: 'var(--widget-text-primary)',
          fontFamily: 'var(--widget-font-family)'
        }}
        className="w-full max-w-md border animate-fade-in"
      >
        {/* Modal Header */}
        <div 
          style={{
            borderBottomColor: 'var(--widget-border-color)',
            padding: 'var(--widget-spacing-large)'
          }}
          className="border-b"
        >
          <h2 
            style={{
              fontSize: 'var(--widget-font-size-xlarge)',
              fontWeight: 'var(--widget-font-weight-bold)',
              color: 'var(--widget-text-primary)'
            }}
          >
            Save Session
          </h2>
          <p 
            style={{
              color: 'var(--widget-text-secondary)',
              fontSize: 'var(--widget-font-size-small)',
              marginTop: 'var(--widget-spacing-small)'
            }}
          >
            Give your session a memorable name to find it later
          </p>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: 'var(--widget-spacing-large)' }}>
            <label 
              style={{
                color: 'var(--widget-text-secondary)',
                fontSize: 'var(--widget-font-size-small)',
                fontWeight: 'var(--widget-font-weight-medium)',
                marginBottom: 'var(--widget-spacing-small)',
                display: 'block'
              }}
            >
              Session Name
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter a session name..."
              className="widget-input w-full p-3"
              style={{
                fontSize: 'var(--widget-font-size-base)',
                marginBottom: error ? 'var(--widget-spacing-small)' : 'var(--widget-spacing-medium)'
              }}
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p 
                style={{
                  color: 'var(--widget-error)',
                  fontSize: 'var(--widget-font-size-small)',
                  marginBottom: 'var(--widget-spacing-medium)'
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* Modal Footer */}
          <div 
            style={{
              borderTopColor: 'var(--widget-border-color)',
              padding: 'var(--widget-spacing-large)',
              display: 'flex',
              gap: 'var(--widget-spacing-medium)',
              justifyContent: 'flex-end'
            }}
            className="border-t"
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                background: 'transparent',
                border: '1px solid var(--widget-border-color)',
                color: 'var(--widget-text-secondary)',
                borderRadius: 'var(--widget-border-radius-medium)',
                padding: 'var(--widget-spacing-small) var(--widget-spacing-medium)',
                fontSize: 'var(--widget-font-size-small)',
                fontWeight: 'var(--widget-font-weight-medium)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? '0.5' : '1'
              }}
              className="hover:bg-white hover:bg-opacity-10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !sessionName.trim()}
              className="widget-button-send"
              style={{
                padding: 'var(--widget-spacing-small) var(--widget-spacing-medium)',
                fontSize: 'var(--widget-font-size-small)',
                fontWeight: 'var(--widget-font-weight-medium)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--widget-spacing-small)'
              }}
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isLoading ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}