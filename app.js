/* Public calculators and dated, read-only telemetry. No cookies or analytics. */
(function () {
  'use strict';
  const M = typeof window !== 'undefined' ? window.GrowthMath : null;
  const $ = id => document.getElementById(id);
  const money = value => value === null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value);
  const signedMoney = value => value === null || !Number.isFinite(value) ? '—' : (value >= 0 ? '+' : '−') + money(Math.abs(value));
  const percent = value => value === null || !Number.isFinite(value) ? '—' : value.toFixed(2) + '%';
  const number = id => $(id).value === '' ? NaN : Number($(id).value);
  const set = (id, value) => { $(id).textContent = value; };
  const error = (id, text) => { set(id, text || ''); $(id).hidden = !text; };
  const positiveStyle = (element, value) => { element.classList.toggle('negative', value < 0); element.classList.toggle('positive', value >= 0); };
  const BASELINE = {
    schema_version: 1,
    window: {start:'2026-10-21T10:46:00+08:00',end:'2026-10-22T10:46:00+08:00',timezone:'Asia/Shanghai'},
    source: {kind:'user_supplied_audit',label:'Model 4 fixed 24h PIT audit — user-supplied baseline',url:null,verified_at:null},
    model: {recovery_factor:0.962,min_net_profit_usd:2.5,min_roi_pct:6},
    funnel: {scanned:13649,rejected:13635,accepted:14,rejected_pct:99.897,accepted_pct:0.103},
    survival: {sold_count:12,observed_count:14,sold_pct:85.71,median_seconds:55.11,fastest_seconds:9.96,timing_sample_count:null,night_sold_count:6,night_observed_count:6},
    top_hits: [
      {sale_id:'61317316',market_hash_name:'★ Butterfly Knife | Tiger Tooth (Factory New)',listed_price_usd:891.43,fair_benchmark_usd:1025.23,estimated_net_profit_usd:94.84,roi_pct:10.64,survival_seconds:44.8,status:'SOLD',price_history_usd:[988.26,939.72,891.43]},
      {sale_id:'61372664',market_hash_name:'★ Driver Gloves | Imperial Plaid (Minimal Wear)',listed_price_usd:247.37,fair_benchmark_usd:281.03,estimated_net_profit_usd:22.98,roi_pct:9.29,survival_seconds:150.9,status:'SOLD',price_history_usd:[]},
      {sale_id:'61365742',market_hash_name:'StatTrak™ AWP | Printstream (Minimal Wear)',listed_price_usd:95.96,fair_benchmark_usd:112.79,estimated_net_profit_usd:12.58,roi_pct:13.11,survival_seconds:56.3,status:'SOLD',price_history_usd:[]}
    ],
    notes: [
      'Historical baseline supplied by the project owner; raw audit has not been independently revalidated here. Window timezone is inferred as UTC+08:00 from the supplied Beijing-time context.',
      'Funnel percentages are calculated from the supplied counts: 13,635 / 13,649 = 99.897% filtered and 14 / 13,649 = 0.103% accepted. These differ from the original reported 99.898% / 0.102%.',
      'Printstream preserves the reported $12.58 / 13.11%. Applying 0.962 to the displayed benchmark gives $12.54 / 13.07%; the calculator always uses the formula.',
      'The source reports median/fastest timing but does not disclose the valid timing sample count; that count remains unknown.',
      'SOLD is a market observation. Estimated spreads are not proof of a completed profitable resale. Filtered events are not necessarily fraudulent listings.'
    ]
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = {validTelemetry,telemetryMetrics,money};
    return;
  }

  function showTab(name, updateHash) {
    const selected = name === 'float' ? 'float' : 'cashout';
    document.querySelectorAll('[data-tab]').forEach(button => {
      const active = button.dataset.tab === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      $(button.dataset.tab).hidden = !active;
    });
    if (updateHash && location.hash !== '#' + selected) history.replaceState(null, '', '#' + selected);
  }
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => showTab(button.dataset.tab, true));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'cashout' : event.key === 'End' ? 'float' : button.dataset.tab === 'cashout' ? 'float' : 'cashout';
      showTab(next, true); $('tab-' + next).focus();
    });
  });
  window.addEventListener('hashchange', () => { if (['#float','#cashout'].includes(location.hash)) showTab(location.hash.slice(1), false); });
  showTab(location.hash.slice(1), false);

  function updateFees() {
    try {
      const fair = number('fair'), listed = number('listed');
      for (const platform of ['skinport','csfloat']) {
        const sellerFee = number(platform === 'skinport' ? 'skinport-tier' : 'csfloat-seller');
        const result = M.compareCashout(fair, listed, sellerFee, number(platform + '-payout'));
        set(platform + '-recovery', money(result.afterFee));
        set(platform + '-net', signedMoney(result.netProfit));
        set(platform + '-roi', percent(result.roiPct));
        positiveStyle($(platform + '-net'), result.netProfit);
      }
      error('fee-error', '');
    } catch (e) {
      error('fee-error', e.message);
      for (const platform of ['skinport','csfloat']) for (const field of ['recovery','net','roi']) set(platform + '-' + field, '—');
    }
  }
  function updateCashout() {
    try {
      const result = M.calculateSnipe(number('fair'), number('listed'));
      set('net-profit', signedMoney(result.netProfit));
      set('net-roi', (result.roiPct >= 0 ? '+' : '') + percent(result.roiPct));
      positiveStyle($('net-profit'), result.netProfit);
      positiveStyle($('net-roi'), result.roiPct);
      set('safe-price', result.feasible ? money(result.maxSafePrice) : 'No valid buy price');
      set('after-fee', money(result.afterFee));
      set('threshold-status', result.passes ? 'WITHIN MODEL LIMIT' : 'OUTSIDE MODEL LIMIT');
      $('threshold-status').classList.toggle('fail', !result.passes);
      const gap = result.maxSafePrice - number('listed');
      set('headroom', !result.feasible ? 'Benchmark too low to meet both thresholds' : money(Math.abs(gap)) + (gap >= 0 ? ' below buy limit' : ' above buy limit'));
      error('cashout-error', '');
      $('cashout-results').classList.remove('invalid-results');
    } catch (e) {
      error('cashout-error', e.message);
      ['net-profit','net-roi','safe-price','after-fee','headroom'].forEach(id => set(id, '—'));
      set('threshold-status', 'CHECK INPUTS');
      $('threshold-status').classList.add('fail');
      $('cashout-results').classList.add('invalid-results');
    }
    updateFees();
  }
  ['fair','listed'].forEach(id => {
    $(id).addEventListener('input', () => { $(id + '-range').value = $(id).value; updateCashout(); });
    $(id + '-range').addEventListener('input', () => { $(id).value = $(id + '-range').value; updateCashout(); });
  });
  ['skinport-tier','skinport-payout','csfloat-seller','csfloat-payout'].forEach(id => $(id).addEventListener('input', updateFees));
  $('cashout-form').addEventListener('submit', event => event.preventDefault());

  const ownedValues = Array.from({length:4}, () => ({normalized:'0.005',actual:'0.005',min:'0',max:'1'}));
  function renderOwned() {
    const count = number('owned-count'), absolute = $('input-mode').value === 'absolute';
    const container = $('owned-materials'); container.replaceChildren();
    for (let i = 0; i < count; i++) {
      const row = document.createElement('div'); row.className = 'owned-row';
      const heading = document.createElement('span'); heading.className = 'owned-row-title'; heading.textContent = 'OWNED INPUT ' + (i + 1); row.append(heading);
      const grid = document.createElement('div'); grid.className = 'input-grid' + (absolute ? ' float-three' : '');
      for (const [key,label] of absolute ? [['actual','Actual float'],['min','Skin minimum'],['max','Skin maximum']] : [['normalized','Normalized float (0–1)']]) {
        const field = document.createElement('div'); field.className = 'field';
        const input = document.createElement('input'); input.id = 'owned-' + i + '-' + key; input.type = 'number'; input.min = '0'; input.max = '1'; input.step = '0.000001'; input.inputMode = 'decimal'; input.value = ownedValues[i][key];
        const labelElement = document.createElement('label'); labelElement.htmlFor = input.id; labelElement.textContent = label;
        input.addEventListener('input', () => { ownedValues[i][key] = input.value; updateFloat(); });
        field.append(labelElement, input); grid.append(field);
      }
      row.append(grid);
      const normalized = document.createElement('span'); normalized.className = 'owned-normalized'; normalized.id = 'normalized-' + i; row.append(normalized);
      container.append(row);
    }
  }
  function conservative(value, digits = 5) {
    if (value === 0) return '0.00000';
    if (value > 0 && value < Math.pow(10, -digits)) {
      const exponent = Math.floor(Math.log10(value));
      const factor = Math.pow(10, exponent);
      return (Math.floor((value / factor) * 10000) / 10000).toFixed(4) + 'e' + exponent;
    }
    return (Math.floor(value * Math.pow(10,digits)) / Math.pow(10,digits)).toFixed(digits);
  }
  function updateFloat() {
    try {
      const count = number('owned-count'), absolute = $('input-mode').value === 'absolute';
      const owned = ownedValues.slice(0,count).map((entry,index) => {
        const read = key => entry[key] === '' ? NaN : Number(entry[key]);
        const normalized = absolute ? M.normalizeFloat(read('actual'),read('min'),read('max')) : read('normalized');
        set('normalized-' + index, absolute ? 'Normalized: ' + (Number.isFinite(normalized) ? normalized.toFixed(8) : '—') : 'Relative position within this input skin’s own range');
        return absolute ? {actual:read('actual'),min:read('min'),max:read('max')} : normalized;
      });
      const result = M.calculateFillers(number('output-min'),number('output-max'),number('target-float'),owned,number('filler-min'),number('filler-max'));
      set('required-average', '< ' + conservative(result.requiredAverage));
      $('required-average').title = 'Exact computed upper bound: ' + result.requiredAverage.toPrecision(16);
      set('required-average-pct', 'Normalized float · below ' + conservative(result.requiredAverage * 100,4) + '%');
      set('remaining-count', 'Across ' + result.remaining + ' remaining input' + (result.remaining === 1 ? '' : 's'));
      set('filler-range-note', 'For fillers with range ' + number('filler-min').toFixed(2) + '–' + number('filler-max').toFixed(2));
      if (result.feasible) {
        const operator = result.allFillersAllowed ? '≤ ' : '< ';
        set('filler-normalized', operator + conservative(result.maxFillerNormalized));
        set('filler-absolute', operator + conservative(result.maxFillerFloat));
        $('filler-normalized').title = 'Computed upper bound: ' + result.maxFillerNormalized.toPrecision(16);
        $('filler-absolute').title = 'Computed upper bound: ' + result.maxFillerFloat.toPrecision(16);
        set('float-status', result.allFillersAllowed ? 'FULL RANGE AVAILABLE' : 'BUDGET AVAILABLE');
        set('float-budget-note', result.allFillersAllowed ? 'Every remaining normalized float from 0 to 1 fits this target with the entered owned materials.' : 'Individual fillers may vary; their average must remain strictly below the limit. Displayed bounds are conservatively truncated.');
      } else {
        set('filler-normalized','Not reachable'); set('filler-absolute','No valid fillers');
        set('float-status','TARGET UNREACHABLE');
        set('float-budget-note', result.reason === 'target_at_or_below_output_minimum' ? 'The strict target must be above the output’s minimum possible float.' : 'Your owned materials already exhaust the float budget, even if every remaining filler has normalized float 0.');
      }
      $('float-status').classList.toggle('fail', !result.feasible);
      error('float-error',''); $('float-results').classList.remove('invalid-results');
    } catch (e) {
      error('float-error',e.message);
      ['required-average','required-average-pct','filler-normalized','remaining-count','filler-absolute','filler-range-note','float-budget-note'].forEach(id => set(id,'—'));
      set('float-status','CHECK INPUTS'); $('float-status').classList.add('fail'); $('float-results').classList.add('invalid-results');
    }
  }
  ['output-min','output-max'].forEach(id => $(id).addEventListener('input', () => { $('float-preset').value = 'custom'; updateFloat(); }));
  ['target-float','filler-min','filler-max'].forEach(id => $(id).addEventListener('input', updateFloat));
  ['owned-count','input-mode'].forEach(id => $(id).addEventListener('change', () => { renderOwned(); updateFloat(); }));
  $('float-preset').addEventListener('change', () => { if ($('float-preset').value === 'glove') { $('output-min').value = '0.06'; $('output-max').value = '0.80'; } updateFloat(); });
  $('float-form').addEventListener('submit', event => event.preventDefault());

  function validTelemetry(data) {
    const numeric = (x, min = 0, max = 1e12, nullable = false) => (nullable && x === null) || (typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max);
    const count = x => x === null || (numeric(x) && Number.isSafeInteger(x));
    const stamp = x => typeof x === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(x) && Number.isFinite(Date.parse(x));
    const text = (x,max) => typeof x === 'string' && x.trim().length > 0 && x.length <= max && !/[\u0000-\u001f]/.test(x);
    if (!data || data.schema_version !== 1 || !data.window || !data.source || !data.model || !data.funnel || !data.survival || !Array.isArray(data.top_hits) || data.top_hits.length > 50) return false;
    if (!stamp(data.window.start) || !stamp(data.window.end) || Date.parse(data.window.end)-Date.parse(data.window.start) !== 86400000 || !text(data.window.timezone,80)) return false;
    if (!['user_supplied_audit','audited_json','ledger_snapshot','legacy_summary'].includes(data.source.kind) || !text(data.source.label,250) || (data.source.verified_at !== null && !stamp(data.source.verified_at))) return false;
    if (data.model.recovery_factor !== 0.962 || data.model.min_net_profit_usd !== 2.5 || data.model.min_roi_pct !== 6) return false;
    const f = data.funnel, s = data.survival;
    if (!['scanned','accepted','rejected'].every(key => count(f[key]))) return false;
    if (f.scanned !== null ? (f.rejected === null || f.accepted === null || f.accepted + f.rejected !== f.scanned) : f.rejected !== null) return false;
    if (!['sold_count','observed_count','timing_sample_count','night_sold_count','night_observed_count'].every(key => count(s[key]))) return false;
    if (!['median_seconds','fastest_seconds'].every(key => numeric(s[key],0,86400,true))) return false;
    if (s.sold_count !== null && (s.observed_count === null || s.sold_count > s.observed_count)) return false;
    if (s.timing_sample_count !== null && (s.sold_count === null || s.timing_sample_count > s.sold_count)) return false;
    if (((s.timing_sample_count === null && data.source.kind !== 'user_supplied_audit') || s.timing_sample_count === 0) && (s.median_seconds !== null || s.fastest_seconds !== null)) return false;
    if (f.accepted !== null && s.observed_count !== null && f.accepted !== s.observed_count) return false;
    if (s.night_sold_count !== null && (s.night_observed_count === null || s.sold_count === null || s.night_sold_count > s.night_observed_count || s.night_sold_count > s.sold_count)) return false;
    if (s.night_observed_count !== null && (s.observed_count === null || s.night_observed_count > s.observed_count)) return false;
    if (s.fastest_seconds !== null && s.median_seconds !== null && s.fastest_seconds > s.median_seconds) return false;
    const ids = new Set();
    const validHits = data.top_hits.every(hit => {
      if (!hit || !text(hit.market_hash_name,180) || typeof hit.sale_id !== 'string' || !/^\d{1,40}$/.test(hit.sale_id) || ids.has(hit.sale_id)) return false;
      ids.add(hit.sale_id);
      if (!numeric(hit.listed_price_usd,0.000001) || !numeric(hit.fair_benchmark_usd,0.000001,1e12,true) || !numeric(hit.estimated_net_profit_usd,-1e12) || !numeric(hit.roi_pct,-100)) return false;
      if (!['SOLD','OBSERVED'].includes(hit.status) || !numeric(hit.survival_seconds,0,86400,true) || (hit.status !== 'SOLD' && hit.survival_seconds !== null)) return false;
      return Array.isArray(hit.price_history_usd) && hit.price_history_usd.length <= 20 && hit.price_history_usd.every(value => numeric(value,0.000001));
    });
    if (!validHits || (s.observed_count !== null && data.top_hits.length > s.observed_count) || (s.sold_count !== null && data.top_hits.filter(hit => hit.status === 'SOLD').length > s.sold_count)) return false;
    return Array.isArray(data.notes) && data.notes.length <= 25 && data.notes.every(note => text(note,1200));
  }
  function telemetryMetrics(data) {
    const f = data.funnel, s = data.survival;
    const countText = value => value === null ? '—' : value.toLocaleString('en-US');
    return {
      scanned: countText(f.scanned), rejected: countText(f.rejected), accepted: countText(f.accepted),
      acceptedPct: f.scanned !== null && f.scanned > 0 && f.accepted !== null ? (f.accepted/f.scanned*100).toFixed(3) + '%' : '—',
      soldRatio: s.sold_count === null && s.observed_count === null ? '—' : countText(s.sold_count) + '/' + countText(s.observed_count),
      median: s.median_seconds === null ? '—' : s.median_seconds.toFixed(2) + 's'
    };
  }
  function renderTelemetry(data, fallback) {
    const f = data.funnel, s = data.survival;
    const timezone = data.window.timezone || 'UTC';
    let dateFormat;
    try { dateFormat = new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:timezone,timeZoneName:'shortOffset',hourCycle:'h23'}); } catch (_) { dateFormat = new Intl.DateTimeFormat('en-GB',{year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'UTC',timeZoneName:'shortOffset',hourCycle:'h23'}); }
    set('telemetry-window',dateFormat.format(new Date(data.window.start)) + ' → ' + dateFormat.format(new Date(data.window.end)));
    const userSupplied = data.source.kind === 'user_supplied_audit';
    set('source-badge',fallback ? 'HISTORICAL REFERENCE / FALLBACK' : userSupplied ? 'HISTORICAL REFERENCE / PROVIDED AUDIT' : 'DATED AUDIT SNAPSHOT');
    const metrics = telemetryMetrics(data);
    for (const key of ['scanned','rejected','accepted']) set(key,metrics[key]);
    set('accepted-pct',metrics.acceptedPct);
    set('sold-ratio',metrics.soldRatio);
    set('median',metrics.median);
    document.querySelector('.funnel-bar span').style.width = f.scanned === null ? '0%' : '100%';
    set('provenance','Source: ' + data.source.label + '. ' + (data.source.verified_at ? 'Source verification recorded: ' + data.source.verified_at + '. ' : 'Raw audit not independently revalidated here. ') + (fallback ? 'Static reference shown because a valid telemetry update is unavailable. ' : '') + 'This is a dated snapshot, not a live feed.');
    set('cashout-hook',s.median_seconds === null ? 'Your buy limit is ready. Explore the delayed feed to understand the signal format; this snapshot does not provide a verified median sold lifespan.' : 'Your buy limit is ready. In this dated sample, sold signals had a median observed lifespan of ' + s.median_seconds.toFixed(2) + ' seconds.');
    const table = $('top-hits'); table.replaceChildren();
    data.top_hits.forEach(hit => {
      const row = document.createElement('tr');
      const name = document.createElement('th'); name.scope = 'row'; name.textContent = hit.market_hash_name;
      const id = document.createElement('small'); id.textContent = '#' + hit.sale_id; name.append(id); row.append(name);
      const values = [money(hit.listed_price_usd),money(hit.fair_benchmark_usd),signedMoney(hit.estimated_net_profit_usd),percent(hit.roi_pct),hit.status === 'SOLD' && hit.survival_seconds !== null ? hit.survival_seconds.toFixed(1) + 's' : hit.status];
      values.forEach((value,index) => { const cell = document.createElement('td'); cell.textContent = value; if(index===2) positiveStyle(cell,hit.estimated_net_profit_usd); if(index===4) cell.className = 'table-sold-cell'; row.append(cell); });
      table.append(row);
    });
    if (!data.top_hits.length) { const row = document.createElement('tr'),cell = document.createElement('td'); cell.colSpan = 6; cell.textContent = 'No selected signals are available for this window.'; row.append(cell); table.append(row); }
    const featured = data.top_hits[0];
    document.querySelector('.featured-hit').hidden = !featured;
    if (featured) {
      set('featured-id',featured.sale_id); set('featured-name',featured.market_hash_name.replace(/^★\s*/,''));
      set('featured-history',featured.price_history_usd.length ? featured.price_history_usd.map(money).join(' → ') : money(featured.listed_price_usd) + ' listed');
      set('featured-profit',signedMoney(featured.estimated_net_profit_usd));
      positiveStyle($('featured-profit'),featured.estimated_net_profit_usd);
      set('featured-sold',featured.status + (featured.status === 'SOLD' && featured.survival_seconds !== null ? ' / ' + featured.survival_seconds.toFixed(1) + 's' : ''));
    }
    const notes = $('data-notes'); notes.replaceChildren();
    (Array.isArray(data.notes) ? data.notes.slice(0,25) : []).forEach(note => { if(typeof note === 'string') {const p=document.createElement('p');p.textContent=note.slice(0,1200);notes.append(p);} });
  }
  async function loadTelemetry() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(),4000);
    try {
      const response = await fetch('data/latest_telemetry.json',{cache:'no-cache',signal:controller.signal});
      if(!response.ok) return;
      const body = await response.text();
      if(body.length > 500000) return;
      const data = JSON.parse(body);
      if(validTelemetry(data)) renderTelemetry(data,false);
    } catch (_) { /* Explicit historical fallback remains visible. */ }
    finally {clearTimeout(timeout);}
  }
  renderOwned(); updateCashout(); updateFloat(); renderTelemetry(BASELINE,true); loadTelemetry();
})();
