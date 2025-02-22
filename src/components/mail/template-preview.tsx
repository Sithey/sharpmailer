"use client";

import React from "react";
import { Lead, Template } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface TemplatePreviewProps {
  template: Template;
  lead: Lead;
}

function replaceTemplateVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, value);
  });
  result = result.replace(/{[^}]+}/g, '');
  return result;
}

function safeParseVariables(variables: string | null): Record<string, string> {
  if (!variables) return {};
  try {
    const parsed = JSON.parse(variables);
    return typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    console.error("Error parsing lead variables:", e);
    return {};
  }
}

export default function TemplatePreview({ template, lead }: TemplatePreviewProps) {
  const variables = safeParseVariables(lead.variables);
  const personalizedSubject = replaceTemplateVariables(template.subject, variables);
  const personalizedHtml = replaceTemplateVariables(template.html, variables);

  const hasVariables = Object.keys(variables).length > 0;

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-gray-50/50">
        <div className="space-y-2">
          <div>
            <span className="text-sm font-medium text-gray-500">To:</span>
            <span className="ml-2">{lead.email}</span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-500">Subject:</span>
            <span className="ml-2">{personalizedSubject}</span>
          </div>
          {!hasVariables && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              <span>This lead does not have any variable.</span>
            </div>
          )}
        </div>
      </div>
      <Card className="p-4">
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: personalizedHtml }} 
        />
      </Card>
    </div>
  );
}