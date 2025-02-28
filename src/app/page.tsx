import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Quill from '@/components/mail/quill';
import QuillSkeleton from '@/components/mail/quill-skeleton';
import { prisma } from '@/lib/prisma';

// Composant de contenu qui fait le fetch des données
async function HomeContent() {
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

  return <Quill user={user} />;
}

export default async function Home() {
  // Vérification de l'authentification sans données complètes
  const session = await auth();
  
  if (!session || !session.user?.email) {
    redirect('/api/auth/signin');
  }

  return (
    <div>
      <Suspense fallback={<QuillSkeleton />}>
        <HomeContent />
      </Suspense>
    </div>
  );
}
