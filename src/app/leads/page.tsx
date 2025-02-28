import { Suspense } from 'react';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';
import LeadList from "@/components/leads/lead-list";
import LeadListSkeleton from "@/components/leads/lead-list-skeleton";

// Composant de contenu qui fait le fetch des données
async function LeadsContent() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect('/');
    }

    const user = await prisma.user.findUnique({
        where: {
            email: session.user.email,
        },
        include: {
            leads: {
                include: {
                    campaigns: true
                }
            },
            campaigns: true,
        },
    });

    if (!user) {
        redirect('/');
    }

    return <LeadList user={user} />;
}

export default async function LeadsPage() {
    // Vérification simple d'authentification
    const session = await auth();
    
    if (!session?.user?.email) {
        redirect('/');
    }

    return (
        <div className="container mx-auto py-6">
            <Suspense fallback={<LeadListSkeleton />}>
                <LeadsContent />
            </Suspense>
        </div>
    );
}