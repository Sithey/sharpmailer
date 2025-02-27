"use server";

import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import nodemailer, { SendMailOptions } from "nodemailer";
import { MailResult } from "@/interface/mail";
import type { Lead } from "@prisma/client";

interface SendMailConfig {
  campaignId?: string; // Rendre le campaignId optionnel
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
  leads?: Lead[]; // Nouveau paramètre pour permettre l'envoi à des leads en mémoire
}

// Fonction pour envoyer un email en masse (utilisant campaignId ou leads directement)
export async function sendMassMail(config: SendMailConfig): Promise<MailResult[]> {
  const { campaignId, from, template, leads: providedLeads } = config;
  
  try {
    let leads: Lead[] = [];
    let campaign = null;

    // Si un campaignId est fourni, on récupère la campagne et ses leads depuis la base de données
    if (campaignId) {
      campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { leads: true },
      });

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      leads = campaign.leads;

      // Marquer la campagne comme en cours d'envoi
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          locked: true,
          description: `Sending: 0/${leads.length}` 
        },
      });
    } 
    // Si des leads sont fournis directement, on les utilise
    else if (providedLeads && providedLeads.length > 0) {
      leads = providedLeads;
    }
    else {
      throw new Error("Either campaignId or leads must be provided");
    }

    // Créer un transporteur SMTP
    const transporter = nodemailer.createTransport({
      host: from.host,
      port: from.port,
      secure: from.port === 587 || from.port === 25 ? false : from.secure,
      auth: {
        user: from.user,
        pass: decrypt(from.pass),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Vérification du transporteur
    await transporter.verify();

    // Résultats d'envoi
    const results: MailResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Envoyer les emails un par un
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];

      if (campaignId) {
        // Mise à jour de la progression pour la campagne (seulement si campaignId est fourni)
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { description: `Sending: ${i+1}/${leads.length}` },
        });
      }

      try {
        // Préparation du contenu de l'email avec variables personnalisées
        let personalizedHtml = template.html;
        let personalizedSubject = template.subject;
        
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
          // Remplacer le format {{variable}}
          const regexDouble = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
          personalizedHtml = personalizedHtml.replace(regexDouble, String(value));
          personalizedSubject = personalizedSubject.replace(regexDouble, String(value));
          
          // Remplacer le format {variable}
          const regexSingle = new RegExp(`{\\s*${key}\\s*}`, 'gi');
          personalizedHtml = personalizedHtml.replace(regexSingle, String(value));
          personalizedSubject = personalizedSubject.replace(regexSingle, String(value));
        });
        
        // Remplacer la variable email dans les deux formats
        personalizedHtml = personalizedHtml
          .replace(/{{(\s*)email(\s*)}}/gi, lead.email)
          .replace(/{(\s*)email(\s*)}/gi, lead.email);
        personalizedSubject = personalizedSubject
          .replace(/{{(\s*)email(\s*)}}/gi, lead.email)
          .replace(/{(\s*)email(\s*)}/gi, lead.email);

        // Options pour l'envoi d'email
        const mailOptions: SendMailOptions = {
          from: from.user,
          to: lead.email,
          subject: personalizedSubject,
          html: personalizedHtml,
        };
        
        // Envoyer l'email
        const info = await transporter.sendMail(mailOptions);
        
        const result: MailResult = {
          email: lead.email,
          success: true,
          messageId: info.messageId || "",
        };
        
        results.push(result);
        successCount++;
      } catch (error) {
        console.error(`Failed to send email to ${lead.email}:`, error);
        
        const result: MailResult = {
          email: lead.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
        
        results.push(result);
        errorCount++;
      }
    }

    // Si une campagne était utilisée, on la déverrouille une fois terminée
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          locked: false,
          description: `Sent: ${successCount} success, ${errorCount} errors` 
        },
      });
    }

    return results;
  } catch (error) {
    console.error("Error in sendMassMail:", error);
    
    // Déverrouiller la campagne en cas d'erreur si une campaignId était fournie
    if (campaignId) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { locked: false, description: "Failed to send" },
      });
    }
    
    throw error;
  }
}