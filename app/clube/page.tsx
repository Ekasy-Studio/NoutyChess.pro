import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
import { ClubExperience } from '@/app/clube/club-experience';
import { getOrCreateProfile } from '@/lib/competitive';

export const dynamic = 'force-dynamic';

export default async function ClubPage() {
  const user = await getChatGPTUser();
  let membership: { active: boolean; until: number | null; name: string } | null = null;
  try {
    if (user) {
      const profile = await getOrCreateProfile(user);
      const active = profile.membershipTier === 'legend' && Boolean(profile.memberUntil && profile.memberUntil > Date.now());
      membership = { active, until: profile.memberUntil, name: profile.displayName };
    }
  } catch {
    // The public Club presentation remains available while persistence recovers.
  }
  return <ClubExperience membership={membership} signInPath={chatGPTSignInPath('/clube')} />;
}