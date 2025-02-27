"use client";

import { Lead, Template } from "@prisma/client";
import React from "react";

interface TemplatePreviewProps {
  template: Pick<Template, "subject" | "html">;
  lead: Pick<Lead, "email" | "variables">;
}

export default function TemplatePreview({ template, lead }: TemplatePreviewProps) {
  let previewHtml = template.html;
  let previewSubject = template.subject;
  
  // Traitement des variables avec le bon typage
  let leadVariables: Record<string, string> = {};
  
  // Si les variables sont une chaîne JSON, on les parse
  if (typeof lead.variables === 'string') {
    try {
      const parsed = JSON.parse(lead.variables);
      if (typeof parsed === 'object' && parsed !== null) {
        leadVariables = parsed;
      }
    } catch (e) {
      console.error('Error parsing variables:', e);
    }
  } else if (typeof lead.variables === 'object' && lead.variables !== null) {
    leadVariables = lead.variables as Record<string, string>;
  }
  
  // Remplacer les variables dans le sujet et le corps du mail
  Object.entries(leadVariables).forEach(([key, value]) => {
    // Gérer les deux formats de variables
    const regexDouble = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    const regexSingle = new RegExp(`{\\s*${key}\\s*}`, 'gi');
    
    previewHtml = previewHtml
      .replace(regexDouble, String(value))
      .replace(regexSingle, String(value));
    
    previewSubject = previewSubject
      .replace(regexDouble, String(value))
      .replace(regexSingle, String(value));
  });
  
  // Remplacer la variable email dans les deux formats
  previewHtml = previewHtml
    .replace(/{{(\s*)email(\s*)}}/gi, lead.email)
    .replace(/{(\s*)email(\s*)}/gi, lead.email);
  previewSubject = previewSubject
    .replace(/{{(\s*)email(\s*)}}/gi, lead.email)
    .replace(/{(\s*)email(\s*)}/gi, lead.email);

  return (
    <div className="rounded-md border bg-card text-card-foreground shadow space-y-2">
      <div className="p-4 space-y-2 border-b">
        <h4 className="text-sm font-medium text-gray-500">Subject:</h4>
        <p className="text-base">{previewSubject}</p>
      </div>
      <div className="p-4 space-y-2">
        <h4 className="text-sm font-medium text-gray-500">Content:</h4>
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: previewHtml }} 
        />
      </div>
    </div>
  );
}