"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { CampaignSendLog, SMTP, Template } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { retrySendCampaign, clearCampaignLogs } from "@/lib/campaigns";

interface SendLogsProps {
  logs: CampaignSendLog[];
  campaignId: string;
  smtps: SMTP[];
  templates: Template[];
  onLogsCleared?: () => void; // Nouvelle prop pour gérer le rafraîchissement
}

export default function SendLogs({ logs, campaignId, smtps, templates, onLogsCleared }: SendLogsProps) {
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  if (!logs || logs.length === 0) {
    return null;
  }

  const successCount = logs.filter(log => log.success).length;
  const failureCount = logs.filter(log => !log.success).length;
  const successRate = logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(1) : "0";
  const hasFailedLogs = failureCount > 0;

  // Grouper les logs par date
  const groupedLogs = logs.reduce((acc, log) => {
    const date = new Date(log.sentAt).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, CampaignSendLog[]>);

  const handleRetry = async () => {
    if (!selectedSmtpId || !selectedTemplateId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select both SMTP and template",
      });
      return;
    }

    const smtp = smtps.find(s => s.id === selectedSmtpId);
    const template = templates.find(t => t.id === selectedTemplateId);

    if (!smtp || !template) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selected SMTP or template not found",
      });
      return;
    }

    setIsRetrying(true);
    try {
      const result = await retrySendCampaign(
        campaignId,
        {
          host: smtp.host,
          port: smtp.port,
          username: smtp.username,
          password: smtp.password,
          secure: smtp.secure
        },
        {
          subject: template.subject,
          html: template.html
        },
        true // Only retry failed emails
      );

      if (result.success) {
        toast({
          title: "Success",
          description: `Retry completed. Check the logs for details.`,
        });
        setShowRetryDialog(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to retry sends",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleClearLogs = async () => {
    const confirmMessage = `Are you sure you want to clear all ${logs.length} logs?\n\n` +
      `This includes:\n` +
      `- ${successCount} successful sends\n` +
      `- ${failureCount} failed sends\n\n` +
      `This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      setIsClearing(true);
      try {
        const result = await clearCampaignLogs(campaignId);
        if (result.success) {
          toast({
            title: "Success",
            description: `Successfully cleared ${logs.length} logs`,
          });
          if (onLogsCleared) {
            onLogsCleared();
          }
          setDialogOpen(false); // Fermer le dialogue après l'effacement
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to clear logs",
        });
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            History ({successCount}/{logs.length})
            {hasFailedLogs && " ⚠️"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Campaign Send History</DialogTitle>
            <DialogDescription>
              <div className="flex justify-between items-center">
                <span>
                  Success Rate: {successRate}%
                  ({successCount} succeeded, {failureCount} failed)
                  {hasFailedLogs && (
                    <Button
                      variant="link"
                      className="ml-2 text-sm text-blue-600"
                      onClick={() => setShowRetryDialog(true)}
                      disabled={isClearing}
                    >
                      Retry Failed Sends
                    </Button>
                  )}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className={`text-red-600 hover:text-red-700 transition-opacity duration-200 ${
                    isClearing ? "opacity-50" : "opacity-100"
                  }`}
                  onClick={handleClearLogs}
                  disabled={isClearing}
                >
                  {isClearing ? "Clearing..." : "Clear Logs"}
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className={`max-h-[60vh] overflow-y-auto space-y-4 transition-opacity duration-200 ${
            isClearing ? "opacity-50" : "opacity-100"
          }`}>
            {Object.entries(groupedLogs)
              .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
              .map(([date, dateLogs]) => (
                <div key={date} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 sticky top-0 bg-white py-2">
                    {date} ({dateLogs.length} emails)
                  </h3>
                  {dateLogs
                    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                    .map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 rounded-lg ${
                          log.success 
                            ? "bg-green-50 border border-green-200" 
                            : "bg-red-50 border border-red-200"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-medium">{log.leadEmail}</p>
                            {log.messageId && (
                              <p className="text-xs text-gray-500">
                                ID: {log.messageId}
                              </p>
                            )}
                            {log.error && (
                              <p className="text-sm text-red-600">{log.error}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(log.sentAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              Les logs sont conservés pour référence future. Vous pouvez les utiliser pour vérifier le statut des envois et résoudre les problèmes éventuels.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retry Failed Sends</DialogTitle>
            <DialogDescription>
              Configure settings to retry {failureCount} failed sends
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select SMTP Server</Label>
              <Select
                value={selectedSmtpId}
                onValueChange={setSelectedSmtpId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select SMTP server" />
                </SelectTrigger>
                <SelectContent>
                  {smtps.map((smtp) => (
                    <SelectItem key={smtp.id} value={smtp.id}>
                      {smtp.host} ({smtp.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select email template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRetryDialog(false)}
              disabled={isRetrying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRetry}
              disabled={isRetrying || !selectedSmtpId || !selectedTemplateId}
            >
              {isRetrying ? "Retrying..." : "Retry Failed Sends"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}