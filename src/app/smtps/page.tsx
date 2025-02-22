import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from '@/lib/auth';
import SMTPList from "@/components/smtp/smtp-list";

export default async function SMTPsPage() {
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

    return (
        <div>
            <SMTPList user={user} />
        </div>
    );
}