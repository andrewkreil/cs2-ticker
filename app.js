/* Local, client-side calculations over dated evidence. */
(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const all = selector => document.querySelectorAll(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const known = value => typeof value === 'number' && Number.isFinite(value);
  const money = value => known(value) ? '$' + value.toFixed(2) : 'UNKNOWN';
  const input = id => { const raw = $('#' + id).value.trim(); if (!raw) throw new Error('Enter ' + id.replaceAll('-', ' ') + '.'); return Number(raw); };
  let benchmarks = [], samples = [], observedAt = 'UNKNOWN';
  const selected = () => benchmarks.find(row => row.market_hash_name === $('#skin-select').value);
  const quoteFor = row => benchmarks.find(item => item.market_hash_name === row.market_hash_name);

  function renderChecker() {
    const item = selected();
    ['truth-gap', 'truth-grade', 'truth-safe', 'truth-speed'].forEach(id => { $('#' + id).textContent = 'UNKNOWN'; });
    $('#truth-metrics').textContent = '';
    $('#truth-provenance').textContent = item ? '' : 'No matching benchmark in this local library.';
    if (!item) return;
    const median = item.median_7d_usd, suggested = item.official_suggested_price_usd;
    if (known(suggested) && known(median) && median > 0) $('#truth-gap').textContent = ((suggested / median - 1) * 100).toFixed(1) + '% anchor premium';
    const volume = item.sales_7d;
    if (known(volume)) $('#truth-grade').textContent = volume >= 5 ? '🟢 Liquid sample · ' + volume + '/7d' : '🔴 Thin / illiquid · ' + volume + '/7d';
    $('#truth-metrics').textContent = 'Suggested: ' + money(suggested) + ' / 7d median: ' + money(median) + ' / 30d median: ' + money(item.median_30d_usd);
    let timing = [];
    if (known(median) && median > 0) {
      const tier = median >= 1000 ? input('skinport-tier') : 8;
      const safe = GrowthMath.calculateSafeBuy(median, tier).maxSafePrice;
      $('#truth-safe').textContent = money(safe) + ' · ' + tier + '% fee';
      timing = samples.filter(row => row.market_hash_name === item.market_hash_name && known(row.listed_price_usd) && row.listed_price_usd < safe && known(row.observed_sold_seconds));
      if (timing.length) $('#truth-speed').textContent = 'Clears in ~' + (timing.reduce((sum, row) => sum + row.observed_sold_seconds, 0) / timing.length).toFixed(1) + 's · n=' + timing.length;
    }
    const dates = [...new Set(timing.map(row => row.observed_at || row.published_at || 'UNKNOWN'))];
    $('#truth-provenance').textContent = 'Quote observed: ' + (item.observed_at || observedAt) + '. ' + (item.source_note || 'Official pricing projection; see JSON provenance.') + ' Mean uses only this skin’s recorded listings below today’s displayed model ceiling. Timing dates: ' + (dates.join(', ') || 'no qualifying observed SOLD sample') + '.';
  }

  function renderCashout() {
    try {
      const amount = input('fair'), listed = input('listed');
      if (!known(listed) || listed < 0) throw new Error('Acquisition price must be zero or above.');
      const requested = input('skinport-tier'), tier = amount >= 1000 ? requested : 8;
      const rows = GrowthMath.compareArena(amount, tier, input('csfloat-payout'), input('csfloat-fx'));
      const cash = rows.filter(row => row.withdrawable), best = Math.max(...cash.map(row => row.net)), worst = Math.min(...cash.map(row => row.net));
      $('#cashout-results').innerHTML = rows.map(row => '<div class="cashout-row"><div><b>' + esc(row.name) + '</b><small>' + esc(row.fee) + '</small></div><div class="cashout-value"><strong>' + money(row.net) + '</strong><small>' + (row.withdrawable ? 'Cash recovery' : 'Locked wallet balance') + '</small></div><meter min="0" max="' + amount + '" value="' + row.net + '" aria-label="' + esc(row.name) + ' recovery"></meter><span class="note">' + (row.withdrawable ? 'Modeled net difference ' + money(row.net - listed) + ' · additional fee drag vs best cash ' + money(best - row.net) : 'Not included in cash savings') + '</span></div>').join('');
      $('#fee-drag').textContent = 'Fee Drag Saved: ' + money(best - worst) + ' / lowest vs highest cash fee scenario';
      $('#cashout-error').textContent = requested === 6 && amount < 1000 ? 'USD sale below $1,000: public 8% applies.' : '';
      renderChecker();
    } catch (error) {
      $('#cashout-error').textContent = error.message;
      $('#cashout-results').innerHTML = '';
      $('#fee-drag').textContent = '';
    }
  }

  function renderFloat() {
    try {
      const owned = $('#owned-floats').value.split(',').map(value => value.trim()).filter(Boolean).map(Number);
      const min = input('output-min'), max = input('output-max'), target = input('target-float'), fmin = input('filler-min'), fmax = input('filler-max');
      const result = GrowthMath.calculateFillers(min, max, target, owned, fmin, fmax);
      const output = GrowthMath.projectFloat(min, max, owned, input('candidate-float'), fmin, fmax);
      const light = GrowthMath.classifyFloat32(output, target);
      $('#float-status').textContent = {safe:'🟢 Safe Below Cap', trap:'🟡 Float32 Binary Rounding Trap', over:'🔴 Over Budget'}[light.status];
      $('#float-status').dataset.state = light.status;
      $('#float-average').textContent = result.feasible ? 'Remaining ' + result.remaining + ' inputs: normalized average ' + (result.allFillersAllowed ? '≤ ' : '< ') + result.maxFillerNormalized.toPrecision(12) + ' / actual average ' + (result.allFillersAllowed ? '≤ ' : '< ') + result.maxFillerFloat.toPrecision(12) : 'No feasible remaining wear budget.';
      $('#float-absolute').textContent = 'Projected output ' + output.toPrecision(17) + ' → float32 stored ' + light.stored.toPrecision(17) + ' / strict target ' + target;
      $('#float-error').textContent = '';
    } catch (error) {
      $('#float-error').textContent = error.message;
      $('#float-status').textContent = 'Check inputs';
      $('#float-status').dataset.state = '';
      $('#float-average').textContent = '';
      $('#float-absolute').textContent = '';
    }
  }

  function renderSamples() {
    const mode = $('#budget-select').value;
    const rows = samples.filter(row => known(row.listed_price_usd) && (mode === 'all' || (mode === 'under100' && row.listed_price_usd < 100) || (mode === '100to300' && row.listed_price_usd >= 100 && row.listed_price_usd < 300) || (mode === 'over300' && row.listed_price_usd >= 300)));
    $('#telemetry-body').innerHTML = rows.map(row => {
      const quote = quoteFor(row), median = row.median_7d_usd ?? quote?.median_7d_usd;
      return '<tr><th>' + esc(row.market_hash_name) + '<small>' + esc(row.observed_at || row.published_at || 'UNKNOWN') + ' / #' + esc(row.sale_id) + '</small></th><td>' + money(row.listed_price_usd) + '</td><td>' + money(median) + '<small>' + esc(row.median_observed_at || quote?.observed_at || (known(median) ? observedAt : '')) + '</small></td><td>' + (known(row.observed_sold_seconds) ? row.observed_sold_seconds.toFixed(1) + 's' : 'UNKNOWN') + '</td><td><button class="load-math" data-id="' + esc(String(row.sale_id)) + '">⚡ Load Math</button></td></tr>';
    }).join('') || '<tr><td colspan="5">No dated samples in this budget.</td></tr>';
    all('.load-math').forEach(button => { button.onclick = () => {
      const row = samples.find(item => String(item.sale_id) === button.dataset.id);
      const quote = quoteFor(row), median = row.median_7d_usd ?? quote?.median_7d_usd;
      $('#listed').value = row.listed_price_usd;
      if (known(median)) $('#fair').value = median;
      else $('#fair').value = '';
      if (quote) { $('#skin-search').value = ''; populateSkins(); $('#skin-select').value = quote.market_hash_name; }
      $('#load-note').textContent = known(median) ? 'Loaded the dated median and listed acquisition price. This is a retrospective calculation, not a live executable quote.' : 'Loaded acquisition price; no official 7d median is available. Enter your own sale assumption.';
      renderCashout(); renderChecker(); location.hash = 'cashout';
    }; });
  }

  function populateSkins() {
    const query = $('#skin-search').value.toLowerCase(), previous = $('#skin-select').value;
    const rows = benchmarks.filter(row => row.market_hash_name.toLowerCase().includes(query));
    $('#skin-select').innerHTML = rows.map(row => '<option value="' + esc(row.market_hash_name) + '">' + esc(row.market_hash_name) + '</option>').join('') || '<option value="">No matching local skin</option>';
    $('#skin-select').value = rows.some(row => row.market_hash_name === previous) ? previous : (rows[0]?.market_hash_name || '');
    renderChecker();
  }

  async function load() {
    try {
      const responses = await Promise.all([fetch('data/skin_benchmarks.json'), fetch('data/latest_telemetry.json')]);
      if (responses.some(response => response.ok === false)) throw new Error('A local evidence file could not be loaded.');
      const [dictionary, telemetry] = await Promise.all(responses.map(response => response.json()));
      benchmarks = dictionary.items;
      observedAt = dictionary.observed_at || dictionary.source_observed_at || 'UNKNOWN';
      const feed = telemetry.telegram_feed?.messages || [];
      samples = dictionary.samples || feed.filter(row => row.kind === 'alert').map(row => ({...row, sale_id:row.sale_id ?? row.id, observed_sold_seconds:row.status === 'SOLD' ? row.lifetime_seconds : null, observed_at:row.published_at}));
      populateSkins();
      const ranges = benchmarks.filter(row => known(row.float_min) && known(row.float_max));
      $('#float-skin-select').innerHTML = '<option value="">Manual range</option>' + ranges.map(row => '<option value="' + esc(row.market_hash_name) + '">' + esc(row.market_hash_name) + '</option>').join('');
      $('#sample-source').textContent = samples.length + ' dated observations. Quote collection: ' + observedAt + '. Latest public-feed observation: ' + (telemetry.telegram_feed?.observed_at || 'UNKNOWN') + '.';
      renderSamples();
    } catch (error) {
      $('#truth-provenance').textContent = error.message;
      $('#telemetry-body').innerHTML = '<tr><td colspan="5">Local evidence could not be loaded.</td></tr>';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    load(); renderCashout(); renderFloat();
    $('#skin-search').oninput = populateSkins;
    $('#skin-select').onchange = () => { const item = selected(); $('#fair').value = known(item?.median_7d_usd) ? item.median_7d_usd : ''; renderCashout(); renderChecker(); };
    ['fair','listed','skinport-tier','csfloat-payout','csfloat-fx'].forEach(id => { $('#' + id).oninput = renderCashout; });
    all('[data-amount]').forEach(button => { button.onclick = () => { $('#fair').value = button.dataset.amount; renderCashout(); }; });
    $('#float-skin-select').onchange = () => {
      const item = benchmarks.find(row => row.market_hash_name === $('#float-skin-select').value);
      if (item) { $('#output-min').value = item.float_min; $('#output-max').value = item.float_max; $('#float-source').textContent = item.float_source || item.source_note || 'Recorded skin wear range; recipe eligibility is separate.'; }
      renderFloat();
    };
    ['output-min','output-max','target-float','filler-min','filler-max','candidate-float','owned-floats'].forEach(id => { $('#' + id).oninput = renderFloat; });
    all('[data-example]').forEach(button => { button.onclick = () => {
      $('#float-skin-select').value = ''; $('#output-min').value = '0'; $('#output-max').value = '1'; $('#target-float').value = '0.07';
      $('#filler-min').value = '0'; $('#filler-max').value = '1'; $('#owned-floats').value = '';
      $('#candidate-float').value = {safe:'0.06', trap:'0.069999999', over:'0.071'}[button.dataset.example];
      $('#float-source').textContent = 'Illustrative 0–1 ranges isolate the storage-rounding boundary; not an item recipe.';
      renderFloat();
    }; });
    $('#budget-select').onchange = renderSamples;
  });
})();
