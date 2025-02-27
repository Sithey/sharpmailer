"use client";

import React, { useState } from "react";
import { Campaign, SMTP, Template, User, CampaignSendLog, Lead } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import { addCampaign, deleteCampaign, sendCampaignEmails } from "@/lib/campaigns";
import { listCampaigns as listCampaignsAPI, getCampaignProgress as getCampaignProgressAPI } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SendLogs from "./send-logs";
import { MailResult } from "@/interface/mail";
import { Loader2 } from "lucide-react";
import SendProgress from "@/components/mail/send-progress";
import TemplatePreview from "@/components/mail/template-preview";

type CampaignWithLogs = Campaign & {
  sendLogs: CampaignSendLog[];
  leads: Lead[];
};

interface SendProgressDetails {
  inProgress: boolean;
  totalEmails: number;
  currentEmail: number;
  successCount: number;
  failureCount: number;
}

interface CampaignListProps {
  user: User & { 
    campaigns: CampaignWithLogs[],
    smtps?: SMTP[],
    templates?: Template[]
  }
}

export default function CampaignList({ user }: CampaignListProps) {
  const { id } = user;
  const [campaigns, setCampaigns] = useState<CampaignWithLogs[]>(user.campaigns || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "" });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendResults, setSendResults] = useState<MailResult[]>([]);
  const [sendProgress, setSendProgress] = useState<SendProgressDetails>({
    inProgress: false,
    totalEmails: 0,
    currentEmail: 0,
    successCount: 0,
    failureCount: 0
  });
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { toast } = useToast();
  const smtps = user.smtps || [];
  const templates = user.templates || [];

  const resetSendState = () => {
    setSelectedSmtpId("");
    setSelectedTemplateId("");
    setSendResults([]);
    setSendProgress({
      inProgress: false,
      totalEmails: 0,
      currentEmail: 0,
      successCount: 0,
      failureCount: 0
    });
  };

  const handleSendCampaign = async (campaignId: string) => {
    if (!selectedSmtpId || !selectedTemplateId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select both SMTP and template",
      });
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Campaign not found",
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

    try {
      setSendProgress({
        inProgress: true,
        totalEmails: campaign.leads?.length || 0,
        currentEmail: 0,
        successCount: 0,
        failureCount: 0
      });

      // Créer une intervalle pour vérifier la progression
      const progressInterval = setInterval(async () => {
        const progress = await getCampaignProgressAPI(campaignId);
        if (progress.success) {
          setSendProgress(prev => ({
            ...prev,
            currentEmail: progress.stats?.current || prev.currentEmail,
            successCount: progress.stats?.success || prev.successCount,
            failureCount: progress.stats?.failure || prev.failureCount
          }));
        }
      }, 500);

      const result = await sendCampaignEmails(
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
        }
      );

      clearInterval(progressInterval);

      if (result.success && result.results) {
        setSendResults(result.results);
        const successCount = result.results.filter(r => r.success).length;
        const failureCount = result.results.filter(r => !r.success).length;
        
        toast({
          title: "Campaign Sent",
          description: `Successfully sent ${successCount} emails, ${failureCount} failed.`,
        });
        
        await refreshCampaigns();
      } else {
        throw new Error(result.error || "Failed to send campaign emails");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setSendProgress(prev => ({
        ...prev,
        inProgress: false
      }));
    }
  };

  const refreshCampaigns = async () => {
    setIsRefreshing(true);
    try {
      const result = await listCampaignsAPI(id);
      if (result.success) {
        setCampaigns(result.campaigns || []);
      } else {
        console.error("Error refreshing campaigns:", result.error);
        setCampaigns(prevCampaigns => prevCampaigns);
      }
    } catch (error) {
      console.error("Error refreshing campaigns:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCloseSendDialog = () => {
    setShowSendDialog(false);
    resetSendState();
    setSelectedCampaignId(null);
  };

  const canSendCampaign = (campaign: CampaignWithLogs) => {
    return campaign.leads && campaign.leads.length > 0;
  };


  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <div className="flex gap-2 items-center">
          {isRefreshing && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Refreshing...</span>
            </div>
          )}
          <Button onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? "Cancel" : "Add Campaign"}
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add new Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              const result = await addCampaign(id, newCampaign);
              if (result.success) {
                toast({
                  title: "Success",
                  description: "Campaign added successfully",
                });
                setIsAdding(false);
                setNewCampaign({ name: "", description: "" });
                await refreshCampaigns();
              } else {
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: result.error || "Failed to add campaign",
                });
              }
            }}>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                />
              </div>
              <Button type="submit">Add Campaign</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="font-semibold">{campaign.name}</p>
                <p className="text-sm text-gray-500">{campaign.description}</p>
                {!canSendCampaign(campaign) && (
                  <p className="text-sm text-amber-600 mt-1">
                    Add leads to this campaign before sending
                  </p>
                )}
              </div>
              <div className="space-x-2">
                {campaign.sendLogs?.length > 0 && (
                  <SendLogs 
                    logs={campaign.sendLogs}
                    campaignId={campaign.id}
                    smtps={smtps}
                    templates={templates}
                    onLogsCleared={() => {
                      // Mettre à jour l'état localement
                      setCampaigns(prevCampaigns => 
                        prevCampaigns.map(c => 
                          c.id === campaign.id 
                            ? { ...c, sendLogs: [], description: "Logs cleared" }
                            : c
                        )
                      );
                    }}
                  />
                )}
                <Dialog 
                  open={showSendDialog && selectedCampaignId === campaign.id}
                  onOpenChange={(open) => {
                    if (!open) handleCloseSendDialog();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCampaignId(campaign.id);
                        setShowSendDialog(true);
                      }}
                      disabled={!canSendCampaign(campaign)}
                    >
                      Send Campaign
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Send Campaign: {campaign.name}</DialogTitle>
                      <DialogDescription>
                        Configure the email settings for this campaign
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

                      {selectedTemplateId && campaign.leads?.length > 0 && (
                        <div className="space-y-2">
                          <Label>Preview with Lead</Label>
                          <Select
                            onValueChange={(leadId) => {
                              const lead = campaign.leads.find(l => l.id === leadId);
                              setPreviewLead(lead || null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a lead for preview" />
                            </SelectTrigger>
                            <SelectContent>
                              {campaign.leads.map((lead) => (
                                <SelectItem key={lead.id} value={lead.id}>
                                  {lead.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {previewLead && selectedTemplateId && (
                            <div className="mt-4">
                              <h3 className="text-sm font-medium mb-2">Preview</h3>
                              <TemplatePreview
                                template={templates.find(t => t.id === selectedTemplateId)!}
                                lead={previewLead}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <SendProgress 
                        progress={sendProgress}
                        results={sendResults}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={handleCloseSendDialog}
                        >
                          {sendResults.length > 0 ? "Close" : "Cancel"}
                        </Button>
                        {!sendProgress.inProgress && sendResults.length === 0 && (
                          <Button
                            onClick={() => handleSendCampaign(campaign.id)}
                            disabled={!selectedSmtpId || !selectedTemplateId}
                          >
                            Send
                          </Button>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="destructive" 
                  onClick={async () => {
                    if (campaign.sendLogs?.length > 0) {
                      const confirm = window.confirm(
                        "This campaign has send history. Are you sure you want to delete it?"
                      );
                      if (!confirm) return;
                    }
                    const result = await deleteCampaign(campaign.id);
                    if (result.success) {
                      toast({
                        title: "Success",
                        description: "Campaign deleted successfully",
                      });
                      await refreshCampaigns();
                    } else {
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: result.error || "Failed to delete campaign",
                      });
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}