import { Sidebar } from './Sidebar';
import { Outlet } from 'react-router-dom';
import { DBStatusToast } from '../DBStatusToast';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <Sidebar />
      <DBStatusToast />
      <main className="lg:pl-64 min-h-screen">
        <div className="p-6 pt-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      
      {/* Mobile Nav Placeholder or functionality can be added here */}
    </div>
  );
}
