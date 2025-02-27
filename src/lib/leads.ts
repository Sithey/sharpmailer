"use server";

import { Lead } from "@prisma/client";
import { prisma } from "./prisma";

interface LeadResponse {
  success: boolean;
  error?: string;
  lead?: Lead;
}

interface LeadsResponse {
  success: boolean;
  error?: string;
  leads?: Lead[];
}

export async function addLead(userId: string, lead: { email: string; variables?: Record<string, string> }): Promise<LeadResponse> {
  try {
    // Ensure variables is properly stringified when non-empty
    const variables = lead.variables && Object.keys(lead.variables).length > 0
      ? JSON.stringify(lead.variables)
      : null;

    const savedLead = await prisma.lead.create({
      data: {
        email: lead.email,
        variables,
        userId: userId
      },
      include: {
        campaigns: true
      }
    });

    // Parse variables back to object when returning
    return { 
      success: true, 
      lead: {
        ...savedLead,
        variables: savedLead.variables ? JSON.parse(savedLead.variables) : {}
      }
    };
  } catch (error) {
    console.error("Error adding Lead:", error);
    return { success: false, error: "Failed to add Lead" };
  }
}

export async function fetchLeads(userId: string): Promise<LeadsResponse> {
  try {
    const leads = await prisma.lead.findMany({
      where: { userId },
      include: {
        campaigns: true
      }
    });
    return { 
      success: true, 
      leads: leads.map(lead => ({
        ...lead,
        variables: lead.variables ? JSON.parse(lead.variables) : {}
      }))
    };
  } catch (error) {
    console.error("Error fetching Leads:", error);
    return { success: false, error: "Failed to fetch Leads", leads: [] };
  }
}

export async function deleteLead(id: string): Promise<LeadResponse> {
  try {
    await prisma.lead.delete({
      where: { id }
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting Lead:", error);
    return { success: false, error: "Failed to delete Lead" };
  }
}

export async function importLeadsFromCSV(userId: string, leads: { email: string; variables?: Record<string, string> }[]): Promise<LeadsResponse> {
  try {
    const existingLeads = await prisma.lead.findMany({
      where: { userId },
      select: { email: true }
    });
    
    const existingEmails = new Set(existingLeads.map(lead => lead.email.toLowerCase()));
    
    const newLeads = leads.filter(lead => !existingEmails.has(lead.email.toLowerCase()));
    
    if (newLeads.length === 0) {
      return { success: true, leads: [], error: "All leads already exist" };
    }

    const createdLeads = await prisma.$transaction(
      newLeads.map(lead => {
        const variables = lead.variables && Object.keys(lead.variables).length > 0
          ? JSON.stringify(lead.variables)
          : null;

        return prisma.lead.create({
          data: {
            email: lead.email,
            variables,
            userId: userId
          },
          include: {
            campaigns: true
          }
        });
      })
    );

    // Parse variables back to object when returning
    return { 
      success: true, 
      leads: createdLeads.map(lead => ({
        ...lead,
        variables: lead.variables ? JSON.parse(lead.variables) : {}
      }))
    };
  } catch (error) {
    console.error("Error importing Leads:", error);
    return { success: false, error: "Failed to import Leads" };
  }
}

export async function updateLeadCampaigns(leadId: string, campaignIds: string[]): Promise<LeadResponse> {
  try {
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        campaigns: {
          set: campaignIds.map(id => ({ id }))
        }
      },
      include: {
        campaigns: true
      }
    });
    return { success: true, lead: updatedLead };
  } catch (error) {
    console.error("Error updating Lead campaigns:", error);
    return { success: false, error: "Failed to update Lead campaigns" };
  }
}

export async function updateLeadVariables(leadId: string, variables: Record<string, string>): Promise<LeadResponse> {
  try {
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        variables: JSON.stringify(variables)
      },
      include: {
        campaigns: true
      }
    });
    return { 
      success: true, 
      lead: {
        ...updatedLead,
        variables: updatedLead.variables ? JSON.parse(updatedLead.variables) : {}
      }
    };
  } catch (error) {
    console.error("Error updating Lead variables:", error);
    return { success: false, error: "Failed to update Lead variables" };
  }
}