"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";


import { SMTP } from "@prisma/client";

interface SMTPProps {
    smtps: SMTP[];
    onSMTPSelect?: (smtp: SMTP | null) => void;
    value?: string;
}

export default function SMTPList({ smtps, onSMTPSelect, value }: SMTPProps) {
    if (!smtps || smtps.length === 0) {
        return (
            <Select onValueChange={() => {}} value="none">
                <SelectTrigger>
                    <SelectValue placeholder="Aucun SMTP disponible" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No SMTP</SelectItem>
                </SelectContent>
            </Select>
        );
    }

    const handleValueChange = (value: string) => {
        if (value === "none") {
            if (onSMTPSelect) {
                onSMTPSelect(null);
            }
        } else {
            const selectedSMTP = smtps.find(t => t.id === value);
            if (selectedSMTP && onSMTPSelect) {
                onSMTPSelect(selectedSMTP);
            }
        }
    };

    return (
        <Select onValueChange={handleValueChange} value={value || "none"}>
            <SelectTrigger>
                <SelectValue placeholder="Choose an SMTP" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">No SMTP</SelectItem>
                {smtps.map((smtp) => (
                    <SelectItem key={smtp.id} value={smtp.id}>{smtp.username}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

}