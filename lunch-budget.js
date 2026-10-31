// Read-only dashboard: keep meal allowances independent of payment methods.
(() => {
  const allowance = 200000;
  const panel = document.createElement('section');
  panel.className = 'card section lunchBudget';
  panel.setAttribute('aria-labelledby', 'lunchBudgetTitle');
  panel.innerHTML = `<div class="panelHead"><h2 id="lunchBudgetTitle">식비 · 점심 식대</h2><span class="tiny muted" id="lunchBudgetMonth"></span></div>
    <table aria-label="점심 식대 사용 현황"><tbody>
      <tr><th scope="row">월 식대</th><td>200,000원</td></tr>
      <tr class="lunchTotal"><th scope="row">사용액 <span class="tiny muted">(잠정 포함)</span></th><td id="lunchUsed"></td></tr>
      <tr><th scope="row">확정된 점심</th><td id="lunchConfirmed"></td></tr>
      <tr><th scope="row">확인할 점심 <span class="tiny muted">(잠정)</span></th><td id="lunchPending"></td></tr>
      <tr class="lunchTotal"><th scope="row" id="lunchBalanceLabel">남은 식대</th><td id="lunchBalance"></td></tr>
    </tbody></table>
    <div class="progress" role="progressbar" aria-label="점심 식대 사용률" aria-valuemin="0" aria-valuemax="100" id="lunchProgress"><i></i></div>
    <p class="tiny muted" id="lunchBudgetNote"></p>`;
  document.querySelector('#page-spend .metricGrid').after(panel);
  const style = document.createElement('style');
  style.textContent = `.lunchBudget{margin:16px 0}.lunchBudget table{width:100%;border-collapse:collapse;table-layout:fixed}.lunchBudget th,.lunchBudget td{padding:10px 12px;border-bottom:1px solid var(--line);white-space:normal}.lunchBudget th{text-align:left;font-weight:400;width:62%}.lunchBudget td{text-align:right;font-variant-numeric:tabular-nums}.lunchBudget .lunchTotal th,.lunchBudget .lunchTotal td{font-weight:700}.lunchBudget .progress{margin-top:14px}.lunchBudget p{margin:8px 0 0;line-height:1.6}@media(max-width:480px){.lunchBudget th,.lunchBudget td{padding:10px 4px}.lunchBudget th .tiny{display:block}.lunchBudget .panelHead{flex-wrap:wrap;gap:6px}}`;
  document.head.append(style);
  function renderLunchBudget() {
    const rows = currentRows();
    const amount = purpose => rows.filter(t => t.purpose === purpose).reduce((n,t) => n + ownAmount(t), 0);
    const confirmed = amount('회사 점심'), pending = amount('회사 점심(잠정)');
    const used = confirmed + pending, balance = allowance - used, rate = used / allowance * 100;
    $('lunchBudgetMonth').textContent = `${selectedYear}년 ${selectedMonth}월`;
    $('lunchUsed').textContent = won(used);
    $('lunchConfirmed').textContent = won(confirmed);
    $('lunchPending').textContent = won(pending);
    $('lunchBalanceLabel').textContent = balance < 0 ? '초과 금액' : '남은 식대';
    $('lunchBalance').textContent = won(Math.abs(balance));
    $('lunchBalance').style.color = balance < 0 ? 'var(--danger)' : 'var(--text)';
    const progress = $('lunchProgress');
    progress.setAttribute('aria-valuenow', String(Math.min(100, rate)));
    progress.setAttribute('aria-valuetext', `${rate.toFixed(1)}% 사용`);
    progress.firstElementChild.style.width = `${Math.min(100, rate)}%`;
    progress.firstElementChild.style.background = balance < 0 ? 'var(--danger)' : 'var(--accent)';
    $('lunchBudgetNote').textContent = `${rate.toFixed(1)}% 사용 · 월 20만원 기준. ‘회사 점심’ 목적의 내 부담액을 결제수단과 관계없이 집계합니다. 잠정 내역 확정 시 금액이 달라질 수 있습니다.`;
  }
  const previousRenderSummary = renderSummary;
  renderSummary = function (...args) { previousRenderSummary(...args); renderLunchBudget(); };
  renderLunchBudget();
})();
