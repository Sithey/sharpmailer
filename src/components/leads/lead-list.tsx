"use client";

import React, { useState } from "react";
import { Campaign, Lead, User } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";
import { addLead, deleteLead, importLeadsFromCSV, updateLeadCampaigns, updateLeadVariables } from "@/lib/leads";
import { fetchLeads as fetchLeadsAPI } from "@/lib/client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Papa from 'papaparse';

export default function LeadList({ user }: { user: User & { leads: (Lead & { campaigns: Campaign[] })[], campaigns: Campaign[] } }) {
  const { id, leads: initialLeads, campaigns } = user;
  const [leads, setLeads] = useState<(Lead & { campaigns: Campaign[] })[]>(initialLeads);
  const [isAdding, setIsAdding] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [newLead, setNewLead] = useState({
    email: "",
    variables: {}
  });
  const [newVariableKey, setNewVariableKey] = useState("");
  const { toast } = useToast();

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editingVariables, setEditingVariables] = useState<Record<string, string>>({});
  const [newVariableKeyForEdit, setNewVariableKeyForEdit] = useState("");
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const refreshLeads = async () => {
    const result = await fetchLeadsAPI(id);
    if (result.success && result.leads) {
      setLeads(result.leads as (Lead & { campaigns: Campaign[] })[]);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot fetch Leads",
      });
    }
  };

  const handleAddVariable = () => {
    if (newVariableKey && !variables[newVariableKey]) {
      setVariables({
        ...variables,
        [newVariableKey]: ""
      });
      setNewVariableKey("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await addLead(id, {
      email: newLead.email,
      variables: variables
    });
    if (result.success) {
      toast({
        title: "Success",
        description: "Lead added successfully",
      });
      setIsAdding(false);
      setNewLead({ email: "", variables: {} });
      setVariables({});
      await refreshLeads();
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add Lead",
      });
    }
  };

  const handleDelete = async (leadId: string) => {
    const result = await deleteLead(leadId);
    if (result.success) {
      setLeads(leads.filter(lead => lead.id !== leadId));
      toast({
        title: "Success",
        description: "Lead deleted",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot delete Lead",
      });
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<{ email: string }>(file, {
      header: true, // This will automatically use the first row as headers
      skipEmptyLines: 'greedy', // Skip empty lines and trim whitespace
      complete: async (results) => {
        const leads = (results.data as { email: string }[])
          .filter((row) => row.email) // Ensure we have an email
          .map((row) => {
            // Convert the row to our lead format
            const { email, ...variables } = row;
            return {
              email,
              variables: variables // All other columns become variables
            };
          });

        if (leads.length === 0) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "No valid leads found in CSV. Make sure there's an 'email' column.",
          });
          return;
        }

        const result = await importLeadsFromCSV(id, leads);
        if (result.success) {
          toast({
            title: "Success",
            description: `Imported ${leads.length} leads successfully`,
          });
          await refreshLeads();
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to import leads",
          });
        }
      },
      error: (error: Error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Error parsing CSV: ${error.message}`,
        });
      }
    });
  };

  const handleCampaignToggle = async (leadId: string, campaignId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const currentCampaigns = lead.campaigns;
    const newCampaignIds = currentCampaigns.some((campaign: Campaign) => campaign.id === campaignId)
      ? currentCampaigns.filter((campaign: Campaign) => campaign.id !== campaignId).map(c => c.id)
      : [...currentCampaigns.map(c => c.id), campaignId];

    const result = await updateLeadCampaigns(leadId, newCampaignIds);
    if (result.success) {
      await refreshLeads();
      toast({
        title: "Success",
        description: "Campaigns updated successfully",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update campaigns",
      });
    }
  };

  const handleStartEditingVariables = (lead: Lead) => {
    setIsEditing(true);
    setEditingLeadId(lead.id);
    setEditingVariables(
      typeof lead.variables === 'string' 
        ? JSON.parse(lead.variables) 
        : lead.variables || {}
    );
  };

  const handleCancelEditingVariables = () => {
    setIsEditing(false);
    setEditingLeadId(null);
    setEditingVariables({});
    setNewVariableKeyForEdit("");
  };

  const handleAddVariableToExisting = () => {
    if (newVariableKeyForEdit && !editingVariables[newVariableKeyForEdit]) {
      setEditingVariables({
        ...editingVariables,
        [newVariableKeyForEdit]: ""
      });
      setNewVariableKeyForEdit("");
    }
  };

  const handleRemoveVariable = (key: string) => {
    const newVariables = { ...editingVariables };
    delete newVariables[key];
    setEditingVariables(newVariables);
  };

  const handleSaveVariables = async () => {
    if (!editingLeadId) return;

    const result = await updateLeadVariables(editingLeadId, editingVariables);
    if (result.success) {
      toast({
        title: "Success",
        description: "Variables updated successfully",
      });
      setIsEditing(false);
      handleCancelEditingVariables();
      await refreshLeads();
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update variables",
      });
    }
  };

  // Prevent editing variables while importing or adding new lead
  const isEditingDisabled = isAdding || isEditing;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Lead List</h1>
        <div className="space-x-2">
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            disabled={isEditing}
          >
            {isAdding ? "Cancel" : "Add Lead"}
          </Button>
          <Button 
            asChild
            disabled={isEditing}
          >
            <label className="cursor-pointer">
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVImport}
                disabled={isEditing}
              />
            </label>
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add new Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="Email"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Custom Variables</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={newVariableKey}
                      onChange={(e) => setNewVariableKey(e.target.value)}
                      placeholder="Variable name"
                    />
                    <Button type="button" onClick={handleAddVariable}>
                      Add Variable
                    </Button>
                  </div>
                  
                  {Object.keys(variables).map((key) => (
                    <div key={key} className="flex space-x-2">
                      <Input
                        value={key}
                        disabled
                        className="w-1/3"
                      />
                      <Input
                        value={variables[key]}
                        onChange={(e) => setVariables({
                          ...variables,
                          [key]: e.target.value
                        })}
                        placeholder="Value"
                        className="w-2/3"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full">
                Add Lead
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {leads.map((lead) => (
          <Card key={lead.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-full">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{lead.email}</p>
                    <div className="space-x-2">
                      {!isEditingDisabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEditingVariables(lead)}
                          disabled={isEditingDisabled || editingLeadId === lead.id}
                        >
                          Edit Variables
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(lead.id)}
                        disabled={isEditingDisabled}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {lead.variables && editingLeadId !== lead.id && (
                    <div className="mt-2 text-sm text-gray-500">
                      {Object.entries(typeof lead.variables === 'string' 
                        ? JSON.parse(lead.variables) 
                        : lead.variables
                      ).map(([key, value]) => (
                        <p key={key}>
                          <span className="font-medium">{key}:</span> {value as string}
                        </p>
                      ))}
                    </div>
                  )}

                  {editingLeadId === lead.id && (
                    <div className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <Input
                            value={newVariableKeyForEdit}
                            onChange={(e) => setNewVariableKeyForEdit(e.target.value)}
                            placeholder="New variable name"
                          />
                          <Button 
                            type="button" 
                            onClick={handleAddVariableToExisting}
                            disabled={!newVariableKeyForEdit}
                          >
                            Add
                          </Button>
                        </div>
                        
                        {Object.entries(editingVariables).map(([key, value]) => (
                          <div key={key} className="flex space-x-2">
                            <Input
                              value={key}
                              disabled
                              className="w-1/3"
                            />
                            <Input
                              value={value}
                              onChange={(e) => setEditingVariables({
                                ...editingVariables,
                                [key]: e.target.value
                              })}
                              placeholder="Value"
                              className="w-1/2"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveVariable(key)}
                              className="w-1/6"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          onClick={handleSaveVariables}
                        >
                          Save Variables
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCancelEditingVariables}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <Label className="mb-2 block">Campaigns</Label>
                <div className="flex flex-wrap gap-2">
                  {campaigns.map((campaign) => {
                    const isSelected = lead.campaigns?.some((c: Campaign) => c.id === campaign.id);
                    return (
                      <Button
                        key={campaign.id}
                        variant={isSelected ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleCampaignToggle(lead.id, campaign.id)}
                      >
                        {campaign.name}
                        {isSelected && "✓"}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}