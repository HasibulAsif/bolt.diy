import type { ChatHistoryItem } from '~/lib/persistence';
import { formatDistanceToNow } from 'date-fns';

interface HistoryItemProps {
  item: ChatHistoryItem;
  onDelete: () => void;
}

export function HistoryItem({ item, onDelete }: HistoryItemProps) {
  const lastSavedTime = item.lastSaved ? formatDistanceToNow(new Date(item.lastSaved), { addSuffix: true }) : null;

  return (
    <div className="group relative">
      <a
        href={`/chat/${item.urlId}`}
        className="flex items-center gap-2 rounded-md p-2 hover:bg-bolt-elements-sidebar-buttonBackgroundHover transition-theme"
      >
        <span className="inline-block i-bolt:chat" />
        <span className="flex-1 truncate">{item.description}</span>
        {lastSavedTime && (
          <span className="text-xs text-bolt-elements-textTertiary" title={`Last saved ${lastSavedTime}`}>
            {lastSavedTime}
          </span>
        )}
      </a>
      <button
        onClick={onDelete}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-bolt-elements-sidebar-buttonBackgroundHover rounded"
      >
        <div className="i-ph:trash text-bolt-elements-textTertiary" />
      </button>
    </div>
  );
}
