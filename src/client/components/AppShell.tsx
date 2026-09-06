import { NavLink, Outlet } from 'react-router';

const tabs = [
  { to: '/', label: 'Status', end: true },
  { to: '/register', label: 'Registrer', end: false },
  { to: '/exercises', label: 'Øvelser', end: false },
];

export default function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 flex border-t bg-white pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex min-h-11 flex-1 items-center justify-center ${isActive ? 'font-bold' : ''}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
