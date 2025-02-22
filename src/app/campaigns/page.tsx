import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';
import CampaignList from "@/components/campaign/campaign-list";

export default async function CampaignsPage() {
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

    return (
        <div className="container mx-auto py-6">
            <CampaignList user={user} />
        </div>
    );
}