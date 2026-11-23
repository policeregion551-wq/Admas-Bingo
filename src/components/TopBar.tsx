import { ActiveTab, Language } from '../types';
import { getDict } from '../i18n';

interface TopBarProps {
  lang: Language;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onSignOut: () => void;
}

export function TopBar({ lang, activeTab, onSelectTab, onSignOut }: TopBarProps) {
  const t = getDict(lang);

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'arena', label: t.navArena },
    { id: 'bonus', label: t.navBonus },
    { id: 'withdraw', label: t.navWithdraw },
    { id: 'ledger', label: t.navLedger },
  ];

  return (
    <header className="border-b border-white/10 bg-[#08241b]/95 backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('arena')}
          className="font-display text-xl font-bold tracking-tight text-[#f4f1ea] hover:text-[#facc15] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eab308] rounded"
        >
          {t.brand}
        </button>

        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`py-1.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eab308] ${
                  isActive
                    ? 'text-[#facc15] border-[#eab308]'
                    : 'text-[#cbd5d0] border-transparent hover:text-[#f4f1ea] hover:border-white/25'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onSignOut}
            className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-sm font-medium text-[#f4f1ea] hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eab308]"
          >
            {t.signOut}
          </button>
        </div>
      </div>

      <nav
        className="md:hidden border-t border-white/10 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'text-[#071f17] bg-[#eab308]'
                  : 'text-[#cbd5d0] hover:text-[#f4f1ea]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
