"use client";

import "react-quill-new/dist/quill.snow.css";
import { User, Template, SMTP, Campaign, Lead } from "@prisma/client";
import MailEditor from "@/components/mail/mail-editor";

interface QuillProps {
  user: User & {
    templates: Template[];
    smtps: SMTP[];
    campaigns: (Campaign & { leads: Lead[] })[];
  };
}

export default function Quill({ user }: QuillProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      <MailEditor 
        user={user} 
        initialTemplates={user.templates} 
        initialSmtps={user.smtps}
        initialCampaigns={user.campaigns}
      />
    </div>
  );
}