import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProfileSectionProps {
  user: { fullName: string; username: string }
}

export function ProfileSection({ user }: ProfileSectionProps) {
  // Extract initials (e.g. "Captain Nemo" -> "CN")
  const initials = (user.fullName || user.username || 'RJ')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 p-4 bg-ocean/8 border-b border-border">
      <Avatar className="h-10 w-10 border border-ocean/20">
        <AvatarImage src="" alt="Profile" />
        <AvatarFallback className="bg-ocean/15 text-ocean-dark font-semibold text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-foreground truncate">
          {user.fullName || user.username || 'Captain'}
        </span>
        <span className="text-xs text-muted-foreground truncate">
          @{user.username || 'captain'}
        </span>
      </div>
    </div>
  )
}
