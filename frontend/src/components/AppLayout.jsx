import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-neutral-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto w-full">
        <main className="flex-1 h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
