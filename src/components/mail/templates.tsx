"use client";
import type { Template } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface TemplateProps {
    templates: Template[];
    onTemplateSelect?: (template: Template | null) => void;
    value?: string; // 
}

export default function TemplateList({ templates, onTemplateSelect, value }: TemplateProps) {
    if (!templates || templates.length === 0) {
        return (
            <Select onValueChange={() => {}} value="none">
                <SelectTrigger>
                    <SelectValue placeholder="No template found..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                </SelectContent>
            </Select>
        );
    }

    const handleValueChange = (value: string) => {
        if (value === "none") {
            if (onTemplateSelect) {
                onTemplateSelect(null);
            }
        } else {
            const selectedTemplate = templates.find(t => t.id === value);
            if (selectedTemplate && onTemplateSelect) {
                onTemplateSelect(selectedTemplate);
            }
        }
    };

    return (
        <Select onValueChange={handleValueChange} value={value || "none"}>
            <SelectTrigger>
                <SelectValue placeholder="Choisir une template" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">No template</SelectItem>
                {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.subject}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}