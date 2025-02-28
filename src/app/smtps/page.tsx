import { Suspense } from 'react';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';
import SMTPList from "@/components/smtp/smtp-list";
import SMTPListSkeleton from "@/components/smtp/smtp-list-skeleton";

// Composant de contenu qui fait le fetch des données
async function SMTPsContent() {
    const session = await auth();

    if (!session?.user?.email) {
        redirect('/');
    }

    const user = await prisma.user.findUnique({
        where: {
            email: session.user.email,
        },
        include: {
            smtps: true,
        },
    });

    if (!user) {
        redirect('/');
    }

    return <SMTPList user={user} />;
}

export default async function SMTPsPage() {
    // Vérification simple d'authentification
    const session = await auth();
    
    if (!session?.user?.email) {
        redirect('/');
    }

    return (
        <div>
            <Suspense fallback={<SMTPListSkeleton />}>
                <SMTPsContent />
            </Suspense>
        </div>
    );
}