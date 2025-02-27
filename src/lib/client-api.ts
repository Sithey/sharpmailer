// Client-side API functions for interacting with the backend

// Templates API
export async function fetchTemplates(userId: string) {
  try {
    const response = await fetch(`/api/templates?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { success: false, error: 'Failed to fetch templates', templates: [] };
  }
}

// SMTPs API
export async function fetchSMTPs(userId: string) {
  try {
    const response = await fetch(`/api/smtps?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching SMTPs:', error);
    return { success: false, error: 'Failed to fetch SMTPs', smtps: [] };
  }
}

// Leads API
export async function fetchLeads(userId: string) {
  try {
    const response = await fetch(`/api/leads?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching leads:', error);
    return { success: false, error: 'Failed to fetch leads', leads: [] };
  }
}

// Campaigns API
export async function listCampaigns(userId: string) {
  try {
    const response = await fetch(`/api/campaigns?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return { success: false, error: 'Failed to fetch campaigns' };
  }
}

// Campaign Progress API
export async function getCampaignProgress(campaignId: string) {
  try {
    const response = await fetch(`/api/campaigns/progress?campaignId=${campaignId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error getting campaign progress:', error);
    return { success: false, error: 'Failed to get campaign progress' };
  }
}