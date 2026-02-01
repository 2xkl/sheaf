import { Sun, Moon, Eye, BookOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const themes = [
  { id: 'light' as const, label: 'Jasny', icon: Sun },
  { id: 'dark' as const, label: 'Ciemny', icon: Moon },
  { id: 'high-contrast' as const, label: 'Kontrast', icon: Eye },
  { id: 'sepia' as const, label: 'Sepia', icon: BookOpen },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-1">
      {themes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          title={label}
          className={`p-2 rounded-lg transition-colors cursor-pointer ${
            theme === id
              ? 'bg-(--color-primary-light) text-(--color-primary)'
              : 'text-(--color-text-muted) hover:bg-(--color-bg-sidebar)'
          }`}
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}
