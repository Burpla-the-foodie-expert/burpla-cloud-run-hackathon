"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Hash } from "lucide-react";
import { getRandomFoodTopic } from "@/lib/food-topics";

interface CreateSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (sessionName: string) => Promise<void>;
}

export function CreateSessionDialog({
  isOpen,
  onClose,
  onCreate,
}: CreateSessionDialogProps) {
  const [sessionName, setSessionName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a random food topic as default when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSessionName(getRandomFoodTopic());
      setError(null);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!sessionName.trim()) {
      setError("Please enter a session name");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Call the onCreate callback and wait for it to complete
      await onCreate(sessionName.trim());

      // Close dialog only after successful creation
      setIsCreating(false);
      onClose();
    } catch (err: any) {
      console.error("Failed to create session:", err);
      setError(err.message || "Failed to create session. Please try again.");
      setIsCreating(false);
    }
  };

  const handleUseRandomName = () => {
    setSessionName(getRandomFoodTopic());
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const dialogContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      style={{ position: 'fixed' }}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-[#2a2a2a] rounded-lg border border-[#333333] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#9c27b0] flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg md:text-xl font-bold text-[#e0e0e0]">Create New Session</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#9e9e9e] hover:text-[#e0e0e0] hover:bg-[#333333] rounded transition-colors touch-manipulation"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4">
          <p className="text-sm text-[#9e9e9e]">
            Create a new session to start chatting. Give it a name to help you identify it later.
          </p>

          {/* Session Name Input */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[#9e9e9e] mb-2">
              <Hash className="w-4 h-4" />
              Session Name
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => {
                setSessionName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter session name"
              className="w-full px-4 py-3 bg-[#1e1e1e] border border-[#333333] rounded-lg text-[#e0e0e0] placeholder-[#9e9e9e] focus:outline-none focus:ring-2 focus:ring-[#9c27b0] focus:border-transparent transition-all"
              maxLength={100}
              autoFocus
              disabled={isCreating}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-[#9e9e9e]">
                {sessionName.length}/100 characters
              </p>
              <button
                onClick={handleUseRandomName}
                className="text-xs text-[#9c27b0] hover:text-[#7b1fa2] transition-colors"
                disabled={isCreating}
              >
                Use random name
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-[#ed4245]">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-[#333333]">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="px-4 py-2 text-[#9e9e9e] hover:text-[#e0e0e0] hover:bg-[#333333] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !sessionName.trim()}
            className="px-4 py-2 bg-[#9c27b0] hover:bg-[#7b1fa2] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 touch-manipulation"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create Session
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Render to document.body using portal to ensure it's above everything
  if (typeof window !== "undefined" && document.body) {
    return createPortal(dialogContent, document.body);
  }

  return null;
}

