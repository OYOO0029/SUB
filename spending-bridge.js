/* Only this adapter depends on the HTML app's internal functions. */
window.spendingCloudManaged = true;
const spendingOpenData = window.openData;
window.openData = function () {
  spendingOpenData();
  const info = document.getElementById('syncDataInfo');
  if (info) info.textContent = '동기화 상태: ' + document.getElementById('syncStatus').textContent;
  document.getElementById('storageDetail').textContent = storageIssue || '소비·예산·정산·선불 기록을 계정별 서버와 동기화합니다. 상단 저장 상태를 눌러 연결할 수 있습니다.';
};
window.spendingSyncBridge = Object.freeze({
  read: () => clone(state),
  validate: value => { validateState(value); return clone(value); },
  originalCache: null,
  busy: () => storageLocked || !!document.querySelector('.modalBack.show') || !!pointerReorder || draggedTxId !== null,
  apply(value) {
    const next = v824UpgradeState(validateState(value));
    localStorage.setItem(STORAGE, JSON.stringify(next));
    state = next;
    storageLocked = false;
    storageIssue = '';
    migrationNotice = '';
    deletionHistory = [];
    selectedTx.clear();
    v824ResetRecordTracker();
    renderAll();
  },
  export: () => exportBackup(),
  status: (kind, label) => v824SetSyncStatus(kind === 'online' ? 'synced' : kind, label)
});
