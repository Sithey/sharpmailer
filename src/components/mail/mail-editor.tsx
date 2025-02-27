'use client';

import { useState } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import Papa from 'papaparse';

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Campaign, User, Template, SMTP, Lead } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TemplateList from "./templates";
import { saveTemplate, deleteTemplate } from "@/lib/templates";
import { fetchTemplates as fetchTemplatesAPI, getCampaignProgress as getCampaignProgressAPI } from "@/lib/client-api";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import SMTPList from "./smtp";
import { MailResult } from "@/interface/mail";
import { sendCampaignEmails, sendDirectEmails } from "@/lib/campaigns";
import { Loader2, Upload } from "lucide-react";
import SendProgress from "@/components/mail/send-progress";
import TemplatePreview from "./template-preview";
import ReactQuill, { Quill } from "react-quill-new";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import dynamique de react-quill-new avec typage minimal
const QuillEditor = dynamic(async () => {
  const { default: RQ } = await import("react-quill-new");
  type QuillComponentProps = {
    forwardedRef?: React.Ref<ReactQuill>;
    [key: string]: unknown;
  };
  const QuillComponent = ({ forwardedRef, ...props }: QuillComponentProps) => {
    return <RQ ref={forwardedRef} {...props} />;
  };
  return QuillComponent;
}, {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

// Définition d'un contexte typé pour les handlers de Quill
interface QuillHandlerContext {
  quill: Quill;
}

// Configuration avancée des modules Quill
const modules = {
  toolbar: {
    container: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: [] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike"],
      [{ script: "sub" }, { script: "super" }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["blockquote", "code-block"],
      ["link", "image", "video"],
      [{ direction: "rtl" }],
      ["clean"],
    ],
    handlers: {
      image: function (this: QuillHandlerContext): void {
        const range = this.quill.getSelection();
        if (!range) return;
        const url = prompt("Entrez l'URL de l'image:");
        if (url) {
          const img = new Image();
          img.onload = () => {
            this.quill.insertEmbed(range.index, "image", url, "user");
          };
          img.onerror = () => {
            alert("L'URL de l'image n'est pas valide");
          };
          img.src = url;
        }
      },
      video: function (this: QuillHandlerContext): void {
        const range = this.quill.getSelection();
        if (!range) return;
        const url = prompt("Entrez l'URL de la vidéo (YouTube, Vimeo, etc.):");
        if (url) {
          const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
          const match = url.match(youtubeRegex);
          if (match) {
            const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
            this.quill.insertEmbed(range.index, "video", embedUrl, "user");
          } else {
            this.quill.insertEmbed(range.index, "video", url, "user");
          }
        }
      },
      link: function (this: QuillHandlerContext): void {
        const range = this.quill.getSelection();
        if (range) {
          let url = prompt("Entrez l'URL du lien:", "https://");
          if (url) {
            if (!/^https?:\/\//i.test(url)) {
              url = "https://" + url;
            }
            if (range.length > 0) {
              this.quill.format("link", url);
            } else {
              this.quill.insertText(range.index, url, "link", url);
              this.quill.setSelection(range.index + url.length);
            }
          }
        }
      },
    },
  },
  clipboard: {
    matchVisual: false,
    matchText: true,
    allowRTL: true,
    stripTags: false,
    handlers: {
      paste: function (this: QuillHandlerContext, e: ClipboardEvent): void {
        if (e.clipboardData && e.clipboardData.items) {
          const items = e.clipboardData.items;
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
              e.preventDefault();
              const file = items[i].getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const range = this.quill.getSelection(true);
                  this.quill.insertEmbed(range.index, "image", event.target?.result, "user");
                };
                reader.readAsDataURL(file);
                return;
              }
            }
          }
        }
      },
    },
  },
  history: {
    delay: 1000,
    maxStack: 500,
    userOnly: true,
  },
  syntax: false,
  formula: false,
};

const formats = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "script",
  "color",
  "background",
  "align",
  "direction",
  "list",
  "indent",
  "blockquote",
  "code-block",
  "link",
  "image",
  "video",
];

interface MailEditorProps {
  user: User & {
    templates: Template[];
    smtps: SMTP[];
    campaigns: (Campaign & { leads: Lead[] })[];
  };
  initialTemplates: Template[];
  initialSmtps: SMTP[];
  initialCampaigns: (Campaign & { leads: Lead[] })[];
}

interface SendProgressDetails {
  inProgress: boolean;
  totalEmails: number;
  currentEmail: number;
  successCount: number;
  failureCount: number;
}

// Interface pour les leads temporaires importés depuis un CSV
interface TempLead {
  email: string;
  variables: Record<string, string>;
}

export default function MailEditor({
  user,
  initialTemplates,
  initialSmtps,
  initialCampaigns,
}: MailEditorProps) {
  const [subject, setSubject] = useState("");
  const [text, setText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedSMTP, setSelectedSMTP] = useState<SMTP | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<(Campaign & { leads: Lead[] }) | null>(null);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [campaigns] = useState<(Campaign & { leads: Lead[] })[]>(initialCampaigns || []);
  const { toast } = useToast();
  const [sendProgress, setSendProgress] = useState<SendProgressDetails>({
    inProgress: false,
    totalEmails: 0,
    currentEmail: 0,
    successCount: 0,
    failureCount: 0,
  });
  const [sendResults, setSendResults] = useState<MailResult[]>([]);
  const [selectedPreviewLead, setSelectedPreviewLead] = useState<Lead | null>(null);
  
  // Nouvelles variables d'état pour la gestion des leads temporaires
  const [tempLeads, setTempLeads] = useState<TempLead[]>([]);
  const [previewTempLead, setPreviewTempLead] = useState<TempLead | null>(null);
  const [isCsvImported, setIsCsvImported] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("campaign");

  const handleTemplateSelect = (template: Template | null): void => {
    if (template) {
      setSubject(template.subject);
      setText(template.html);
      setSelectedTemplate(template);
    } else {
      setSubject("");
      setText("");
      setSelectedTemplate(null);
    }
  };

  const handleSMTPSelect = (smtp: SMTP | null): void => {
    setSelectedSMTP(smtp);
  };

  const handleCampaignSelect = (campaignId: string): void => {
    const chosen = campaigns.find((c) => c.id === campaignId) || null;
    setSelectedCampaign(chosen);
    
    // Reset temp leads when selecting a campaign
    if (chosen) {
      setTempLeads([]);
      setIsCsvImported(false);
    }
  };

  const refreshTemplates = async (): Promise<void> => {
    const result = await fetchTemplatesAPI(user.id);
    if (result.success) {
      setTemplates(result.templates);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot fetch templates",
      });
    }
  };

  const handleSave = async (): Promise<void> => {
    const formattedText = text.replace(/<[^>]*>?/gm, "");
    if (subject === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Subject cannot be empty",
      });
      return;
    }
    if (formattedText === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Content cannot be empty",
      });
      return;
    }
    const result = await saveTemplate(user.id, subject, text);
    if (result.success) {
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
      await refreshTemplates();
      if (result.template) {
        setSelectedTemplate(result.template);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save template",
      });
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedTemplate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No template selected",
      });
      return;
    }
    const result = await deleteTemplate(user.id, selectedTemplate.id);
    if (result.success) {
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      setSubject("");
      setText("");
      setSelectedTemplate(null);
      await refreshTemplates();
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error during deleting template",
      });
    }
  };
  
  // Nouvelle fonction pour gérer l'importation de fichier CSV
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const leads: TempLead[] = results.data
          .filter(row => row.email)
          .map(row => {
            const { email, ...variables } = row;
            const cleanedVariables = Object.entries(variables).reduce((acc, [key, value]) => {
              if (value !== undefined && value !== null && value !== '') {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, string>);

            return {
              email,
              variables: cleanedVariables
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
        
        setTempLeads(leads);
        setIsCsvImported(true);
        setActiveTab("csv");
        toast({
          title: "Success",
          description: `Imported ${leads.length} leads from CSV. These leads are only stored temporarily.`,
        });
      },
      error: (error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Error parsing CSV: ${error.message}`,
        });
      }
    });
    
    // Reset the input to allow selecting the same file again
    e.target.value = '';
  };

  // Fonction modifiée pour gérer l'envoi soit via campagne soit via CSV temporaire
  const handleSend = async (): Promise<void> => {
    const formattedText = text.replace(/<[^>]*>?/gm, "");
    if (subject === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Subject cannot be empty",
      });
      return;
    }
    if (formattedText === "") {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Content cannot be empty",
      });
      return;
    }
    if (!selectedSMTP) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an SMTP server",
      });
      return;
    }

    // Vérifier si on utilise une campagne ou des leads temporaires
    if (activeTab === "campaign" && !selectedCampaign) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a Campaign",
      });
      return;
    }
    
    if (activeTab === "csv" && (!tempLeads || tempLeads.length === 0)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please import leads from CSV",
      });
      return;
    }
    
    try {
      // Préparer les détails de progression
      const totalEmails = activeTab === "campaign" 
        ? selectedCampaign?.leads.length || 0 
        : tempLeads.length;
        
      setSendProgress({
        inProgress: true,
        totalEmails: totalEmails,
        currentEmail: 0,
        successCount: 0,
        failureCount: 0,
      });

      let result;
      
      if (activeTab === "campaign" && selectedCampaign) {
        // Créer une intervalle pour vérifier la progression
        const progressInterval = setInterval(async () => {
          const progress = await getCampaignProgressAPI(selectedCampaign.id);
          if (progress.success && progress.stats) {
            setSendProgress(prev => ({
              ...prev,
              currentEmail: progress.stats.current,
              successCount: progress.stats.success,
              failureCount: progress.stats.failure
            }));
          }
        }, 500);

        // Envoyer via la campagne existante
        result = await sendCampaignEmails(
          selectedCampaign.id,
          {
            host: selectedSMTP.host,
            port: selectedSMTP.port,
            username: selectedSMTP.username,
            password: selectedSMTP.password,
            secure: selectedSMTP.secure,
          },
          {
            subject: subject,
            html: text,
          }
        );
        
        clearInterval(progressInterval);
      } else {
        // Envoyer via des leads temporaires importés du CSV
        result = await sendDirectEmails(
          {
            host: selectedSMTP.host,
            port: selectedSMTP.port,
            username: selectedSMTP.username,
            password: selectedSMTP.password,
            secure: selectedSMTP.secure,
          },
          {
            subject: subject,
            html: text,
          },
          tempLeads
        );
        
        // Mettre à jour la progression manuellement sans intervalle
        // puisque nous n'avons pas de processus de base de données pour mettre à jour
        if (result.success && result.results) {
          const successCount = result.results.filter((r) => r.success).length;
          const failureCount = result.results.filter((r) => !r.success).length;
          
          setSendProgress(prev => ({
            ...prev,
            currentEmail: totalEmails,
            successCount: successCount,
            failureCount: failureCount
          }));
        }
      }

      if (result.success && result.results) {
        setSendResults(result.results);
        const successCount = result.results.filter((r) => r.success).length;
        const failureCount = result.results.filter((r) => !r.success).length;
        toast({
          title: activeTab === "campaign" ? "Campaign Sent" : "Emails Sent",
          description: `Successfully sent ${successCount} emails, ${failureCount} failed.`,
        });
      } else {
        throw new Error(result.error || "Failed to send emails");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    } finally {
      setSendProgress((prev) => ({
        ...prev,
        inProgress: false,
      }));
    }
  };

  // Fonction pour afficher le nombre de leads selon la méthode choisie
  const getLeadsCount = (): number => {
    if (activeTab === "campaign") {
      return selectedCampaign?.leads?.length || 0;
    } else {
      return tempLeads.length;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Éditeur de Mail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-lg border p-4">
          <Label className="text-base font-semibold">Templates</Label>
          <TemplateList
            templates={templates}
            onTemplateSelect={handleTemplateSelect}
            value={selectedTemplate?.id}
          />
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <Label className="text-base font-semibold">SMTP</Label>
          <SMTPList
            smtps={initialSmtps}
            onSMTPSelect={handleSMTPSelect}
            value={selectedSMTP?.id}
          />
        </div>

        <Tabs defaultValue="campaign" value={activeTab} onValueChange={setActiveTab} className="space-y-4 rounded-lg border p-4">
          <Label className="text-base font-semibold block mb-2">Destinataires</Label>
          <TabsList className="mb-4">
            <TabsTrigger value="campaign">Utiliser une campagne</TabsTrigger>
            <TabsTrigger value="csv">Importer un CSV</TabsTrigger>
          </TabsList>
          
          <TabsContent value="campaign" className="space-y-4">
            <select
              className="w-full border p-2 rounded"
              value={selectedCampaign?.id || ""}
              onChange={(e) => handleCampaignSelect(e.target.value)}
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.leads.length} leads)
                </option>
              ))}
            </select>
            
            {selectedCampaign && selectedCampaign.leads.length > 0 && (
              <div className="space-y-2">
                <Label>Preview with Lead</Label>
                <Select
                  onValueChange={(leadId: string) => {
                    const lead = selectedCampaign.leads.find((l: Lead) => l.id === leadId);
                    setSelectedPreviewLead(lead || null);
                    setPreviewTempLead(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead for preview" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCampaign.leads.map((lead: Lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPreviewLead && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Preview</h3>
                    <TemplatePreview template={{ subject, html: text } as Template} lead={selectedPreviewLead} />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="csv" className="space-y-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm mb-4">Import a CSV with at least an &apos;email&apos; column. <br /> Additional columns will be treated as variables.</p>
              <Button asChild variant="outline" className="mb-2">
                <label className="cursor-pointer">
                  Choose file
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv"
                    onChange={handleCSVImport}
                  />
                </label>
              </Button>
              
              {isCsvImported && (
                <div className="mt-2 text-sm text-green-600">
                  Imported {tempLeads.length} leads from CSV
                </div>
              )}
            </div>
            
            {tempLeads.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Preview with Imported Lead</Label>
                <Select
                  onValueChange={(index: string) => {
                    const lead = tempLeads[parseInt(index)];
                    setPreviewTempLead(lead || null);
                    setSelectedPreviewLead(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead for preview" />
                  </SelectTrigger>
                  <SelectContent>
                    {tempLeads.map((lead, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {lead.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {previewTempLead && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Preview</h3>
                    <TemplatePreview 
                      template={{ subject, html: text } as Template} 
                      lead={{ 
                        email: previewTempLead.email, 
                        variables: JSON.stringify(previewTempLead.variables)
                      }} 
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label htmlFor="subject" className="text-base">
            Titre du mail
          </Label>
          <Input
            id="subject"
            type="text"
            placeholder="Entrez le titre du mail..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-base">Mail content</Label>
          <div className="overflow-hidden rounded-lg border bg-background">
            <QuillEditor
              theme="snow"
              value={text}
              onChange={setText}
              modules={modules}
              formats={formats}
              className="[&_.ql-toolbar]:border-b [&_.ql-toolbar]:bg-muted/50 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:px-3"
            />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="bg-gray-50 p-4 rounded-md">
          <div className="text-sm mb-2">
            <span className="font-medium">Destinataires: </span> 
            {getLeadsCount()} {getLeadsCount() === 1 ? 'lead' : 'leads'} 
            {activeTab === 'csv' ? ' (temporaire)' : ' (via campagne)'}
          </div>
        </div>

        <SendProgress progress={sendProgress} results={sendResults} />

        <div className="flex justify-start gap-3">
          <Button variant="outline" onClick={handleSave}>
            Save Template
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={sendProgress.inProgress || getLeadsCount() === 0}
          >
            {sendProgress.inProgress ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </div>
            ) : (
              "Send"
            )}
          </Button>
          {selectedTemplate && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete template
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
