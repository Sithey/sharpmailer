import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Quill from '@/components/mail/quill';
import { prisma } from '@/lib/prisma';

export default async function Home() {
  const session = await auth();

  if (!session || !session.user?.email) {
    redirect('/api/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email
    },
    include: {
      templates: true,
      smtps: true,
      campaigns: {
        include: {
          leads: true
        }
      }
    }
  });

  if (!user) {
    redirect('/api/auth/signin');
  }

  return (
    <div>
      <Quill user={user} />
    </div>
  );
}
