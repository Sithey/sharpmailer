"use client";

import { useState } from "react";
import { User, SMTP } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import { addSMTP, deleteSMTP, fetchSMTPs } from "@/lib/smtp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SMTPListProps {
    user: User & {
        smtps: SMTP[]
    };
}

export default function SMTPList({ user }: SMTPListProps) {
    const [smtps, setSMTPs] = useState<SMTP[]>(user.smtps);
    const [isAdding, setIsAdding] = useState(false);
    const [newSMTP, setNewSMTP] = useState({
        host: "",
        port: "",
        username: "",
        password: "",
        secure: true,
        from: ""
    });
    const { toast } = useToast();

    const refreshSMTPs = async () => {
        const result = await fetchSMTPs(user.id);
        if (result.success && result.smtps) {
            setSMTPs(result.smtps);
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Cannot fetch SMTPs",
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await addSMTP(user.id, {
            ...newSMTP,
            port: parseInt(newSMTP.port)
        });
        
        if (result.success) {
            toast({
                title: "Success",
                description: "SMTP added successfully",
            });
            setIsAdding(false);
            setNewSMTP({
                host: "",
                port: "",
                username: "",
                password: "",
                secure: true,
                from: ""
            });
            await refreshSMTPs();
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to add SMTP",
            });
        }
    };

    const handleDelete = async (id: string) => {
        const result = await deleteSMTP(id);
        if (result.success) {
            setSMTPs(smtps.filter((smtp) => smtp.id !== id));
            toast({
                title: "Success",
                description: "SMTP deleted",
            });
        } else {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Cannot delete SMTP",
            });
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold">SMTP List</h1>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    {isAdding ? "Cancel" : "Add SMTP"}
                </Button>
            </div>

            {isAdding && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Add new SMTP</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="host">Host</Label>
                                    <Input
                                        id="host"
                                        value={newSMTP.host}
                                        onChange={(e) => setNewSMTP({ ...newSMTP, host: e.target.value })}
                                        placeholder="smtp.example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="port">Port</Label>
                                    <Input
                                        id="port"
                                        type="number"
                                        value={newSMTP.port}
                                        onChange={(e) => setNewSMTP({ ...newSMTP, port: e.target.value })}
                                        placeholder="587"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        value={newSMTP.username}
                                        onChange={(e) => setNewSMTP({ ...newSMTP, username: e.target.value })}
                                        placeholder="user@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="from">From</Label>
                                    <Input
                                        id="from"
                                        value={newSMTP.from}
                                        onChange={(e) => setNewSMTP({ ...newSMTP, from: e.target.value })}
                                        placeholder="Name <email@example.com>"
                                        required
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={newSMTP.password}
                                        onChange={(e) => setNewSMTP({ ...newSMTP, password: e.target.value })}
                                        placeholder="Your SMTP password"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="secure"
                                    checked={newSMTP.secure}
                                    onChange={(e) => setNewSMTP({ ...newSMTP, secure: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="secure">Use SSL/TLS</Label>
                            </div>

                            <Button type="submit" className="w-full">
                                Add SMTP
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                {smtps.map((smtp) => (
                    <Card key={smtp.id}>
                        <CardContent className="flex items-center justify-between p-6">
                            <div>
                                <p className="font-semibold">{smtp.username}</p>
                                <p className="text-sm text-gray-500">{smtp.host}:{smtp.port}</p>
                                <p className="text-sm text-gray-500">From: {smtp.from}</p>
                            </div>
                            <Button variant="destructive" onClick={() => handleDelete(smtp.id)}>
                                Delete
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}