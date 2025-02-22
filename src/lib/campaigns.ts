"use server";

import { Campaign } from "@prisma/client";
import { prisma } from "./prisma";
import { sendMassMail } from "./send-mail";
import type { MailResult } from "@/interface/mail";

interface CampaignResponse {
  success: boolean;
  error?: string;
  campaign?: Campaign;
}

interface CampaignsResponse {
  success: boolean;
  error?: string;
  campaigns?: Campaign[];
}

interface SendCampaignResponse {
  success: boolean;
  error?: string;
  results?: MailResult[];
}

export async function addCampaign(userId: string, campaign: { name: string; description?: string }): Promise<CampaignResponse> {
  try {
    const savedCampaign = await prisma.campaign.create({
      data: {
        name: campaign.name,
        description: campaign.description,
        userId: userId
      }
    });
    return { success: true, campaign: savedCampaign };
  } catch (error) {
    console.error("Error adding Campaign:", error);
    return { success: false, error: "Failed to add Campaign" };
  }
}

export async function fetchCampaigns(userId: string): Promise<CampaignsResponse> {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId }
    });
    return { success: true, campaigns };
  } catch (error) {
    console.error("Error fetching Campaigns:", error);
    return { success: false, error: "Failed to fetch Campaigns", campaigns: [] };
  }
}

export async function deleteCampaign(id: string): Promise<CampaignResponse> {
  try {
    await prisma.campaign.delete({
      where: { id }
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting Campaign:", error);
    return { success: false, error: "Failed to delete Campaign" };
  }
}

export async function sendCampaignEmails(
  campaignId: string, 
  smtpConfig: { 
    host: string; 
    port: number; 
    username: string; 
    password: string; 
    secure: boolean;
  },
  template: {
    subject: string;
    html: string;
  }
): Promise<SendCampaignResponse> {
  try {
    // Vérifier que la campagne n'est pas verrouillée
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.locked) {
      throw new Error("Campaign is currently being sent");
    }

    const results = await sendMassMail({
      campaignId,
      from: {
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: smtpConfig.username,
        pass: smtpConfig.password,
        secure: smtpConfig.secure
      },
      template: {
        subject: template.subject,
        html: template.html
      }
    });

    // Enregistrer les résultats dans la base de données
    await prisma.$transaction(
      results.map(result => 
        prisma.campaignSendLog.create({
          data: {
            campaignId,
            leadEmail: result.email,
            success: result.success,
            error: result.error,
          }
        })
      )
    );

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error("Error sending campaign emails:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send campaign emails"
    };
  }
}

export async function retrySendCampaign(
  campaignId: string,
  smtpConfig: { 
    host: string; 
    port: number; 
    username: string; 
    password: string; 
    secure: boolean;
  },
  template: {
    subject: string;
    html: string;
  },
  failedEmailsOnly: boolean = true
): Promise<{ success: boolean; error?: string; results?: MailResult[] }> {
  try {
    // Récupérer les leads échoués si nécessaire
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        leads: true,
        sendLogs: {
          where: failedEmailsOnly ? {
            success: false
          } : undefined,
          orderBy: {
            sentAt: 'desc'
          },
          distinct: ['leadEmail']
        }
      }
    });

    if (!campaign) {
      return { success: false, error: "Campaign not found" };
    }

    // Filtrer les leads qui ont échoué
    const failedEmails = new Set(campaign.sendLogs.map(log => log.leadEmail));
    const leadsToRetry = failedEmailsOnly 
      ? campaign.leads.filter(lead => failedEmails.has(lead.email))
      : campaign.leads;

    if (leadsToRetry.length === 0) {
      return { success: false, error: "No failed sends to retry" };
    }


    const results = await sendMassMail({
      campaignId,
      from: {
        host: smtpConfig.host,
        port: smtpConfig.port,
        user: smtpConfig.username,
        pass: smtpConfig.password,
        secure: smtpConfig.secure
      },
      template: {
        subject: template.subject,
        html: template.html
      }
    });

    return { 
      success: true,
      results
    };
  } catch (error) {
    console.error("Error retrying campaign sends:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retry campaign sends"
    };
  }
}

export async function clearCampaignLogs(campaignId: string): Promise<CampaignResponse> {
  try {
    // Supprimer tous les logs de la campagne
    await prisma.campaignSendLog.deleteMany({
      where: { campaignId }
    });

    // Mettre à jour la description de la campagne
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        description: "Logs cleared"
      }
    });

    return { success: true, campaign: updatedCampaign };
  } catch (error) {
    console.error("Error clearing campaign logs:", error);
    return { success: false, error: "Failed to clear campaign logs" };
  }
}
