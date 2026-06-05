import { Menu, Cloud, CloudOff, CloudRain } from 'lucide-react';
import { formatDate, todayISO } from '../../utils/formatters';
import { useTransactions } from '../../hooks/useTransactions';

export default function Topbar({ title, onMenuClick }) {
  const { syncStatus } = useTransactions();

  return (
    <header className="topbar h-16 bg-white border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-muted hover:text-text rounded-md hover:bg-bg transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-xl font-semibold text-text">{title}</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg border border-border">
          {syncStatus === 'synced' && (
            <div className="flex items-center gap-2 text-primary text-xs font-medium">
              <Cloud size={14} className="text-primary" />
              <span className="hidden sm:inline">Synced</span>
            </div>
          )}
          {syncStatus === 'syncing' && (
            <div className="flex items-center gap-2 text-blue-500 text-xs font-medium">
              <Cloud size={14} className="animate-pulse" />
              <span className="hidden sm:inline">Syncing...</span>
            </div>
          )}
          {syncStatus === 'error' && (
            <div className="flex items-center gap-2 text-danger text-xs font-medium">
              <CloudOff size={14} />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}
        </div>

        <div className="text-sm font-medium text-muted bg-bg px-3 py-1.5 rounded-md border border-border hidden xs:block">
          {formatDate(todayISO())}
        </div>
      </div>
    </header>
  );
}
