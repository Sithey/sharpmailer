"use client";

import React from "react";
import { MailResult } from "@/interface/mail";
import { Loader2 } from "lucide-react";

interface SendProgressDetails {
  inProgress: boolean;
  totalEmails: number;
  currentEmail: number;
  successCount: number;
  failureCount: number;
}

interface SendProgressProps {
  progress: SendProgressDetails;
  results: MailResult[];
}

export default function SendProgress({ progress, results }: SendProgressProps) {
  const percentComplete = progress.totalEmails ? (progress.currentEmail / progress.totalEmails) * 100 : 0;

  return (
    <div className="space-y-4">
      {progress.inProgress && (
        <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between text-sm mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending... {progress.currentEmail} / {progress.totalEmails}</span>
            </div>
            <span>
              <span className="text-green-600">✓ {progress.successCount}</span>
              {" | "}
              <span className="text-red-600">✕ {progress.failureCount}</span>
            </span>
          </div>
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full flex transition-all duration-300 ease-in-out">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{
                  width: `${(progress.successCount / progress.totalEmails) * 100}%`
                }}
              />
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{
                  width: `${(progress.failureCount / progress.totalEmails) * 100}%`
                }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{percentComplete.toFixed(1)}% Complete</span>
            <span>
              {progress.successCount > 0 && (
                <span className="text-green-600">
                  {((progress.successCount / progress.totalEmails) * 100).toFixed(1)}% Success
                </span>
              )}
              {progress.successCount > 0 && progress.failureCount > 0 && " | "}
              {progress.failureCount > 0 && (
                <span className="text-red-600">
                  {((progress.failureCount / progress.totalEmails) * 100).toFixed(1)}% Failed
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="font-medium flex items-center justify-between">
            Send Results
            <span className="text-sm text-gray-500">
              Success: {results.filter(r => r.success).length} |
              Failed: {results.filter(r => !r.success).length}
            </span>
          </h3>
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border divide-y">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 ${
                  result.success
                    ? "bg-green-50/50"
                    : "bg-red-50/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <span className="text-green-600 font-medium">✓</span>
                      ) : (
                        <span className="text-red-600 font-medium">✕</span>
                      )}
                      <span className="font-medium">{result.email}</span>
                    </div>
                    {!result.success && (
                      <p className="text-xs text-red-600 mt-1 ml-5">{result.error}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {result.sentAt && new Date(result.sentAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}