import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { useState, useEffect, useCallback } from 'react';
import SyncStats from './SyncStats';
import { classNames } from '~/utils/classNames';
import { IconButton } from '~/components/ui/IconButton';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';

export default function SyncTab() {
  const syncFolder = useStore(workbenchStore.syncFolder);
  const syncSettings = useStore(workbenchStore.syncSettings);
  const currentSession = useStore(workbenchStore.currentSession);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  const handleSelectFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      await workbenchStore.setSyncFolder(handle);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('Failed to select sync folder:', error);
    }
  };

  const handleManualSync = async () => {
    if (!syncFolder) {
      return;
    }

    try {
      setIsManualSyncing(true);
      await workbenchStore.syncFiles();

      // Force immediate updates
      updateLastSyncTime();
      updateSyncStats();
    } catch (error) {
      console.error('Manual sync error:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleSaveSettings = (settings: Partial<typeof syncSettings>) => {
    workbenchStore.saveSyncSettings({
      ...syncSettings,
      ...settings,
    });
  };

  const updateLastSyncTime = useCallback(() => {
    const lastSync = currentSession?.lastSync;

    if (!lastSync) {
      setLastSyncTime('');
      return;
    }

    const now = Date.now();
    const diff = now - lastSync;
    const date = new Date(lastSync);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;

    if (diff < 60000) {
      // less than 1 minute
      setLastSyncTime(timeString);
    } else if (diff < 3600000) {
      // less than 1 hour
      const mins = Math.floor(diff / 60000);
      setLastSyncTime(`${timeString} (${mins}m ago)`);
    } else {
      // more than 1 hour
      const hours = Math.floor(diff / 3600000);
      setLastSyncTime(`${timeString} (${hours}h ago)`);
    }
  }, [currentSession?.lastSync]);

  const updateSyncStats = useCallback(() => {
    if (currentSession?.statistics?.length) {
      const latest = currentSession.statistics[currentSession.statistics.length - 1];
      setTotalFiles(latest.totalFiles);
      setTotalSize(latest.totalSize);
    }
  }, [currentSession?.statistics]);

  // Update stats whenever session changes
  useEffect(() => {
    updateSyncStats();
    updateLastSyncTime();
  }, [currentSession, updateSyncStats, updateLastSyncTime]);

  // Update last sync time periodically
  useEffect(() => {
    if (!currentSession?.lastSync) {
      setLastSyncTime('');
      return undefined;
    }

    const interval = setInterval(updateLastSyncTime, 10000);

    return () => clearInterval(interval);
  }, [currentSession?.lastSync, updateLastSyncTime]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <div className="bg-bolt-elements-background-depth-3 p-4 rounded-lg border border-bolt-elements-borderColor/10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-bolt-elements-textPrimary">Sync Controls</h3>
              {syncFolder && lastSyncTime && (
                <div className="text-sm text-bolt-elements-textSecondary mt-1">Last synced {lastSyncTime}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <SyncStatusIndicator status={isManualSyncing ? 'syncing' : 'idle'} />
              <PanelHeaderButton
                onClick={handleSelectFolder}
                className="text-sm px-3 py-1.5 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text transition-all rounded-md flex items-center gap-1.5"
              >
                <div className="i-ph:folder-simple-plus" />
                {syncFolder ? 'Change Folder' : 'Select Folder'}
              </PanelHeaderButton>
              {syncFolder && (
                <PanelHeaderButton
                  onClick={handleManualSync}
                  disabled={isManualSyncing}
                  className="text-sm px-3 py-1.5 bg-bolt-elements-button-primary-background hover:bg-bolt-elements-button-primary-backgroundHover text-bolt-elements-button-primary-text disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-md flex items-center gap-1.5"
                >
                  <div className={classNames('i-ph:arrows-clockwise', { 'animate-spin': isManualSyncing })} />
                  {isManualSyncing ? 'Syncing...' : 'Sync Now'}
                </PanelHeaderButton>
              )}
            </div>
          </div>

          {/* Folder Info */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-bolt-elements-background-depth-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="i-ph:folder text-bolt-elements-textTertiary" />
                {syncFolder ? (
                  <span className="truncate font-medium text-bolt-elements-textPrimary">{syncFolder.name}</span>
                ) : (
                  <span className="text-bolt-elements-textSecondary">No folder selected</span>
                )}
              </div>
            </div>
            {syncFolder && (
              <div className="flex items-center gap-4 text-sm text-bolt-elements-textSecondary">
                <div className="flex items-center gap-1">
                  <div className="i-ph:files" />
                  <span>{totalFiles} files</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="i-ph:database" />
                  <span>{formatFileSize(totalSize)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="bg-bolt-elements-background-depth-3 p-4 rounded-lg border border-bolt-elements-borderColor/10">
        <h3 className="text-lg font-medium text-bolt-elements-textPrimary mb-4">Sync Settings</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-bolt-elements-textPrimary">Auto-sync</div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={syncSettings.autoSync}
                  onChange={(e) => handleSaveSettings({ autoSync: e.target.checked })}
                  className="checkbox"
                />
                <div className="text-sm text-bolt-elements-textSecondary">Enable automatic sync</div>
              </div>
              {syncSettings.autoSync && (
                <div className="flex items-center gap-2 pl-6">
                  <div className="text-sm text-bolt-elements-textSecondary">Sync every</div>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={syncSettings.autoSyncInterval}
                    onChange={(e) =>
                      handleSaveSettings({ autoSyncInterval: Math.max(1, Math.min(60, parseInt(e.target.value) || 1)) })
                    }
                    className="w-16 px-2 py-1 text-sm rounded-md bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary border border-bolt-elements-borderColor/10"
                  />
                  <div className="text-sm text-bolt-elements-textSecondary">minutes</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-bolt-elements-textPrimary">Sync on save</div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-bolt-elements-background-depth-4">
              <div>
                <div className="text-sm font-medium text-bolt-elements-textPrimary">Sync on save</div>
                <div className="text-xs text-bolt-elements-textSecondary mt-0.5">
                  Automatically sync files when saved
                </div>
              </div>
              <IconButton
                onClick={() => handleSaveSettings({ syncOnSave: !syncSettings.syncOnSave })}
                className={classNames(
                  'text-xl transition-colors',
                  syncSettings.syncOnSave
                    ? 'text-green-400 hover:text-green-500'
                    : 'text-bolt-elements-textTertiary hover:text-bolt-elements-textSecondary',
                )}
              >
                <div className={syncSettings.syncOnSave ? 'i-ph:check-square-fill' : 'i-ph:square'} />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <SyncStats />
    </div>
  );
}
