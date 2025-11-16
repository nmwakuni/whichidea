'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import Link from 'next/link';
import { Plus, Calendar, Users, TrendingUp, Target } from 'lucide-react';

export default function ChallengesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const response = await apiClient.get('/challenges?status=active');
      return response.data.data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const challenges = data || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Challenges</h1>
          <p className="text-gray-600 mt-2">Manage savings challenges and track participation</p>
        </div>
        <Link
          href="/dashboard/challenges/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Challenge
        </Link>
      </div>

      {challenges.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first savings challenge</p>
          <Link
            href="/dashboard/challenges/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Challenge
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge: any) => (
            <div
              key={challenge.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{challenge.name}</h3>
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 mt-2">
                    {challenge.status}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {challenge.description || 'No description'}
              </p>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(challenge.startDate).toLocaleDateString()} -{' '}
                  {new Date(challenge.endDate).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  {challenge.participantsCount} participants
                </div>
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  KSh {Number(challenge.totalSaved || 0).toLocaleString()} saved
                </div>
              </div>

              <Link
                href={`/dashboard/challenges/${challenge.id}`}
                className="block mt-4 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
