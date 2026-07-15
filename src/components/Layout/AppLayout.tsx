import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { Outlet } from 'react-router-dom';
import { DBStatusToast } from '../DBStatusToast';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[#f9f9ff]">
      <MobileHeader />
      <Sidebar />
      <DBStatusToast />
      <main className="lg:pl-64 min-h-screen">
        <div className="p-4 sm:p-6 pt-6 sm:pt-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
