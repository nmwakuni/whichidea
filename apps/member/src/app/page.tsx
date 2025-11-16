'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import Link from 'next/link';
import { Trophy, Target, TrendingUp, Award } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const { data: challenges } = useQuery({
    queryKey: ['challenges', 'active'],
    queryFn: async () => {
      const response = await apiClient.get('/challenges?status=active');
      return response.data.data;
    },
    enabled: !!user,
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-6">
        <h1 className="text-2xl font-bold">Hi, {user.firstName}!</h1>
        <p className="text-blue-100 mt-1">Ready to save and compete?</p>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Saved</p>
              <p className="text-xl font-bold text-gray-900">
                KSh {Number(user.stats?.totalSaved || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Points</p>
              <p className="text-xl font-bold text-primary">
                {user.stats?.totalPoints || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Streak</p>
              <p className="text-xl font-bold text-secondary">
                {user.stats?.currentStreak || 0} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-xl font-bold text-accent">
                {user.stats?.challengesCompleted || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Challenges */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Challenges</h2>
          <Link href="/challenges" className="text-sm text-primary font-medium">
            See all
          </Link>
        </div>

        {challenges && challenges.length > 0 ? (
          <div className="space-y-3">
            {challenges.slice(0, 3).map((challenge: any) => (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}`}
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{challenge.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {challenge.participantsCount} participants
                    </p>
                  </div>
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Ends {new Date(challenge.endDate).toLocaleDateString()}
                  </span>
                  <span className="text-primary font-medium">View →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active challenges yet</p>
            <p className="text-sm text-gray-500 mt-1">Check back soon!</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-around">
          <Link href="/" className="flex flex-col items-center text-primary">
            <Target className="h-6 w-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link href="/challenges" className="flex flex-col items-center text-gray-600">
            <Trophy className="h-6 w-6" />
            <span className="text-xs mt-1">Challenges</span>
          </Link>
          <Link href="/leaderboard" className="flex flex-col items-center text-gray-600">
            <TrendingUp className="h-6 w-6" />
            <span className="text-xs mt-1">Leaderboard</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center text-gray-600">
            <Award className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
