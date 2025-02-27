"use server";

import nodemailer from "nodemailer";
import type { Mail } from "@/interface/mail";
import { decrypt } from "./crypto";
import { prisma } from "./prisma";

export default async function sendMail({ from, to, template }: Mail) {

    const transporter = nodemailer.createTransport({
        host: from.host,
        port: from.port,
        secure: (from.port == 587 || from.port == 25) ? false : true, 
        auth: {
            user: from.user,
            pass: decrypt(from.pass)
        }
    });

    try {
        const result = await transporter.sendMail({
            from: process.env.EMAIL_FROM?.toLowerCase(),
            to: to.toLowerCase(),
            subject: template.subject,
            html: template.html
        });
        return result;
        
    } catch (error) {
        console.error("Error sending mail:", error);
        throw error;
    }
}

interface MassMailOptions {
  campaignId: string;
  from: {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure: boolean;
  };
  template: {
    subject: string;
    html: string;
  };
}

interface MailResult {
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
  sentAt?: Date;
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

export async function sendMassMail({ campaignId, from, template }: MassMailOptions): Promise<MailResult[]> {
  const transporter = nodemailer.createTransport({
    host: from.host,
    port: from.port,
    secure: from.port == 587 || from.port == 25 ? false : true,
    auth: {
      user: from.user,
      pass: decrypt(from.pass)
    },
    pool: true,
    maxConnections: 5,
    maxMessages: Infinity,
    logger: true,
    debug: true
  });

  try {
    // Vérifier et acquérir le verrou
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        leads: true
      }
    });

    if (!campaign || !campaign.leads) {
      throw new Error("Campaign not found or has no leads");
    }

    // Vérifier si la campagne est déjà verrouillée
    if (campaign.locked) {
      if (campaign.lockedAt && new Date().getTime() - campaign.lockedAt.getTime() > 30 * 60 * 1000) {
        // Si le verrou date de plus de 30 minutes, on le force
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { locked: false, lockedAt: null }
        });
      } else {
        throw new Error("Campaign is currently locked. Another send operation might be in progress.");
      }
    }

    // Acquérir le verrou
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { locked: true, lockedAt: new Date() }
    });

    const results: MailResult[] = [];
    const totalLeads = campaign.leads.length;
    let successCount = 0;
    let failureCount = 0;

    const updateProgress = async (current: number, success: number, failure: number) => {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          description: `Sending: ${current}/${totalLeads} (✓${success} ✕${failure})`
        }
      });
    };

    for (let i = 0; i < campaign.leads.length; i++) {
      const lead = campaign.leads[i];
      try {
        // Extraire et parser les variables du lead
        const variables = lead.variables ? JSON.parse(lead.variables as string) : {};
        
        // Personnaliser le sujet et le contenu
        const personalizedSubject = replaceTemplateVariables(template.subject, variables);
        const personalizedHtml = replaceTemplateVariables(template.html, variables);

        // Envoyer l'email avec un retour détaillé
        const info = await transporter.sendMail({
          from: from.user,
          to: lead.email.toLocaleLowerCase(),
          subject: personalizedSubject,
          html: personalizedHtml,
          headers: {
            'X-Campaign-ID': campaignId,
            'X-Lead-ID': lead.id
          }
        });

        successCount++;
        results.push({
          email: lead.email,
          success: true,
          messageId: info.messageId,
          sentAt: new Date()
        });

        // Enregistrer le log d'envoi réussi
        await prisma.campaignSendLog.create({
          data: {
            campaignId,
            leadEmail: lead.email,
            success: true,
            messageId: info.messageId
          }
        });

      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error sending mail to ${lead.email}:`, errorMessage);
        
        results.push({
          email: lead.email,
          success: false,
          error: errorMessage,
          sentAt: new Date()
        });

        // Enregistrer le log d'envoi échoué
        await prisma.campaignSendLog.create({
          data: {
            campaignId,
            leadEmail: lead.email,
            success: false,
            error: errorMessage
          }
        });
      }

      // Mettre à jour la progression avec les succès/échecs
      await updateProgress(i + 1, successCount, failureCount);

      // Pause entre les envois pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    return results;

  } catch (error) {
    console.error("Error in mass mailing:", error);
    throw error;
  } finally {
    // Libérer le verrou et mettre à jour la description
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        locked: false,
        lockedAt: null,
        description: `Last send completed at ${new Date().toLocaleString()}`
      }
    });
    transporter.close();
  }
}