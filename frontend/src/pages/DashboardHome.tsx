import React from 'react';
import { Camera, Users, Package, BarChart3 } from 'lucide-react';

interface DashboardHomeProps {
  activeMenu: string;
}

interface MenuLabels {
  [key: string]: string;
}

interface Activity {
  type: string;
  msg: string;
  time: string;
  color: string;
}

export default function DashboardHome({ activeMenu }: DashboardHomeProps) {
  const menuLabels: MenuLabels = {
    dashboard: 'Dashboard',
    surveillance: 'Surveillance',
    analytics: 'Analytics',
    inventory: 'Inventory',
    people: 'People Tracking',
    chatbot: 'AI Assistant',
    settings: 'Settings'
  };

  const activities: Activity[] = [
    { type: 'person', msg: 'New person detected in Zone A', time: '2 min ago', color: 'blue' },
    { type: 'alert', msg: 'Restricted area access', time: '15 min ago', color: 'red' },
    { type: 'inventory', msg: 'Low stock alert: Item #4521', time: '1 hour ago', color: 'orange' },
    { type: 'system', msg: 'System health check completed', time: '2 hours ago', color: 'green' },
  ];

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-max mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {menuLabels[activeMenu]}
          </h2>
          <p className="text-gray-600">
            Monitor and manage your warehouse operations in real-time
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">+12%</span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Active Cameras</p>
            <p className="text-3xl font-bold text-gray-900">24</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Live</span>
            </div>
            <p className="text-gray-600 text-sm mb-1">People Detected</p>
            <p className="text-3xl font-bold text-gray-900">127</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded">98%</span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Inventory Items</p>
            <p className="text-3xl font-bold text-gray-900">8,432</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">-3%</span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Alerts Today</p>
            <p className="text-3xl font-bold text-gray-900">7</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed Grid */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Camera Feeds</h3>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((cam) => (
                <div key={cam} className="aspect-video bg-gray-900 rounded-lg relative overflow-hidden group cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-white text-xs font-medium">Camera {cam}</span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Zone {cam} - Aisle {cam}A
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {activities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`w-2 h-2 rounded-full bg-${activity.color}-500 mt-2`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.msg}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}