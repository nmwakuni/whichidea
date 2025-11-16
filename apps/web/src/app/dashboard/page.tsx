'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { TrendingUp, Users, Target, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/overview');
      return response.data.data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const stats = [
    {
      name: 'Total Members',
      value: analytics?.totalMembers || 0,
      change: '+12%',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Challenges',
      value: analytics?.activeChallenges || 0,
      change: `${analytics?.totalChallenges || 0} total`,
      icon: Target,
      color: 'bg-green-500',
    },
    {
      name: 'Total Savings',
      value: `KSh ${(analytics?.totalSavings || 0).toLocaleString()}`,
      change: '+25%',
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      name: 'This Month',
      value: `KSh ${(analytics?.savingsThisMonth || 0).toLocaleString()}`,
      change: `${analytics?.growthRate >= 0 ? '+' : ''}${analytics?.growthRate?.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening with your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-sm text-green-600 mt-1">{stat.change}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-gray-500 text-sm">No recent activity to display</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a
              href="/dashboard/challenges/new"
              className="block px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 text-sm font-medium"
            >
              Create New Challenge
            </a>
            <a
              href="/dashboard/members/new"
              className="block px-4 py-2 bg-green-50 text-green-600 rounded-md hover:bg-green-100 text-sm font-medium"
            >
              Add New Member
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
