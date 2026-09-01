import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
import { NoutyChessGame } from '@/components/nouty-chess-game';
import { getOrCreateProfile, listLeaderboard, type CompetitiveProfile, type LeaderboardEntry } from '@/lib/competitive';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await getChatGPTUser();
  let profile: CompetitiveProfile | null = null;
  let leaderboard: LeaderboardEntry[] = [];
  try {
    [profile, leaderboard] = await Promise.all([
      user ? getOrCreateProfile(user) : null,
      listLeaderboard(10),
    ]);
  } catch {
    // The local game remains fully available if persistence is temporarily offline.
  }

  return (
    <NoutyChessGame
      authenticatedUser={user ? { displayName: user.displayName, email: user.email } : null}
      initialProfile={profile}
      initialLeaderboard={leaderboard}
      signInPath={chatGPTSignInPath('/')}
    />
  );
}
