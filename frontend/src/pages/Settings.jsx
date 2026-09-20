import React from 'react';
import { User, Shield, Building2, Mail, Phone, Hash } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/index.jsx';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Account Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your hospital service desk account and profile details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">User Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
              {user?.name?.[0] || 'U'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{user?.name}</h3>
              <p className="text-slate-400">{user?.email}</p>
              <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Role: {user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-slate-400 block mb-0.5">Employee ID</span>
              <span className="font-semibold text-slate-800">{user?.employeeId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Department</span>
              <span className="font-semibold text-slate-800">{user?.department || 'General'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Mobile Contact</span>
              <span className="font-semibold text-slate-800">{user?.mobile || 'Not set'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Assigned Support Groups</span>
              <span className="font-semibold text-slate-800">
                {user?.groups && user.groups.length > 0
                  ? user.groups.map((g) => g.name).join(', ')
                  : 'None'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
