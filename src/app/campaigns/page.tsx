import { Suspense } from 'react';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';
import CampaignList from "@/components/campaign/campaign-list";
import CampaignListSkeleton from "@/components/campaign/campaign-list-skeleton";

// Composant de contenu qui fait le fetch des données
async function CampaignsContent() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect('/');
    }

    const user = await prisma.user.findUnique({
        where: {
            email: session.user.email,
        },
        include: {
            campaigns: {
                include: {
                    sendLogs: true,
                    leads: true
                }
            },
            smtps: true,
            templates: true,
        },
    });

    if (!user) {
        redirect('/');
    }

    return <CampaignList user={user} />;
}

export default async function CampaignsPage() {
    // Vérification simple d'authentification
    const session = await auth();
    
    if (!session?.user?.email) {
        redirect('/');
    }

    return (
        <div className="container mx-auto py-6">
            <Suspense fallback={<CampaignListSkeleton />}>
                <CampaignsContent />
            </Suspense>
        </div>
    );
}