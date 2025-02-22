import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';
import LeadList from "@/components/leads/lead-list";

export default async function LeadsPage() {
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

    return (
        <div className="container mx-auto py-6">
            <LeadList user={user} />
        </div>
    );
}