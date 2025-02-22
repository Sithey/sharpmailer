import { auth } from "@/lib/auth"
import Image from "next/image"
 
export default async function UserAvatar() {
  const session = await auth()
 
  if (!session?.user) return null
 
  return (
    <div className="relative h-8 w-8 rounded-full">
      <Image 
        src={session.user.image ?? "/default-avatar.png"}
        alt="User Avatar"
        fill
        className="rounded-full object-cover"
        sizes="(max-width: 32px) 100vw"
        priority
      />
    </div>
  )
}