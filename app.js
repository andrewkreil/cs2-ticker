/* MIT. Dated public metadata and market quotes; all arithmetic stays local. */
(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const all = selector => document.querySelectorAll(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const known = value => typeof value === 'number' && Number.isFinite(value);
  const money = value => known(value) ? '$' + value.toFixed(2) : 'UNKNOWN';
  const input = id => { const raw = $('#' + id).value.trim(); if (!raw) throw new Error('Enter ' + id.replaceAll('-', ' ') + '.'); return Number(raw); };
  const optional = id => $('#' + id).value.trim() === '' ? null : Number($('#' + id).value);
  const bands = {'Factory New':[0,.07], 'Minimal Wear':[.07,.15], 'Field-Tested':[.15,.38], 'Well-Worn':[.38,.45], 'Battle-Scarred':[.45,1]};
  let dictionary = {skins:[],prices:{},skinport:{}}, benchmarks = [], samples = [], observedAt = 'UNKNOWN';
  const selected = () => benchmarks.find(row => row.id === $('#skin-select').value);
  const quoteFor = row => dictionary.skinport[row.market_hash_name];
  const label = row => row.name + (row.phase ? ' · ' + row.phase : '') + (row.paint_index !== null ? ' · #' + row.paint_index : '');
  const names = rows => (rows || []).map(row => typeof row === 'string' ? row : row.name).join(', ') || 'Not listed';
  const currentQuote = item => GrowthMath.resolveMarketQuote(dictionary, item, $('#wear-select').value, $('#variant-select').value);
  function light(id, state, title, detail) {
    $('#' + id).dataset.state = state;
    $('#' + id + '-status').textContent = title;
    $('#' + id + '-detail').textContent = detail;
  }
  function resetDoctor() {
    ['market','band','pattern','filler'].forEach(id => light('doctor-' + id, 'unknown', 'UNKNOWN', 'Select a skin and enter the listing details.'));
    $('#market-prices').innerHTML = '';
    ['truth-gap','truth-grade','truth-safe','truth-speed'].forEach(id => { $('#' + id).textContent = 'UNKNOWN'; });
    $('#truth-metrics').textContent = '';
  }
  function renderChecker() {
    resetDoctor();
    const item = selected();
    if (!item) { $('#truth-provenance').textContent = 'No matching metadata.'; return; }
    const resolved = currentQuote(item), quote = resolved.quote || {};
    const sp = resolved.skinport_mixed ? resolved.skinport.value : resolved.skinport;
    const price = optional('doctor-price'), f = optional('doctor-float');
    const values = [
      ['Skinport listed floor' + (resolved.skinport_mixed ? ' · mixed phases' : ''), sp?.active_floor_usd],
      ['Skinport suggested' + (resolved.skinport_mixed ? ' · mixed phases' : ''), sp?.official_suggested_price_usd],
      ['Buff163 same-phase ask', quote.buff163_starting_at_usd],
      ['CSFloat same-phase ask', quote.csfloat_reference_usd],
      ['Buff163 instant buy-order bid', quote.buff163_highest_order_usd]
    ];
    $('#market-prices').innerHTML = values.map(([key,value]) => '<div><span>' + esc(key) + '</span><b>' + money(value) + '</b></div>').join('');
    let identityConflict = false;
    try {
      const p = GrowthMath.phaseDiagnosis(item, optional('doctor-seed'), optional('doctor-paint'));
      identityConflict = p.conflict;
      const labels = {
        paint_index_conflict:['red','🔴 Paint Index / Selected Skin Mismatch'],
        gem_metadata_verified:['green','🟢 Verified Gem Metadata'],
        popular_phase:['yellow','🟡 Popular Phase (P2/P4)'],
        floor_phase:['red','🔴 Floor Phase · 0% Assumed Seed Premium'],
        phase_metadata_unverified:['unknown','Phase identity UNKNOWN'],
        unknown:['yellow','🟡 Seed Tier Unverified · 0% Assumed Premium']
      };
      const [state,title] = labels[p.status];
      light('doctor-pattern', state, title,
        'Metadata paint #' + (p.paintIndex ?? 'UNKNOWN') + ' / ' + (p.phase || item.finish || 'no phase') +
        '. Seed ' + (p.paintSeed ?? 'not entered') + ': premium tier UNKNOWN. No verified per-weapon seed map is loaded; Fade percentage and surface condition cannot be inferred from a seed number alone. Metadata identity does not authenticate a listing.');
    } catch(error) { identityConflict = true; light('doctor-pattern','unknown','Check paint / seed',error.message); }
    try {
      if (identityConflict) throw new Error('Match the listing paint index to the selected metadata before comparing phase prices.');
      if (price === null) throw new Error('Enter a listing price to compare it with the dated cash asks.');
      const r = GrowthMath.crossMarket(price, sp?.official_suggested_price_usd ?? null, quote.buff163_starting_at_usd, quote.csfloat_reference_usd, quote.buff163_highest_order_usd);
      const labels = {
        true_cross_market_undercut:['green','🟢 True Cross-Market Undercut'],
        fair_personal_use:['yellow','🟡 Fair Personal-Use Price (No Flip Margin)'],
        fake_discount_phase_blended_trap:['red','🔴 Fake Discount / Phase-Blended Trap'],
        above_cross_market_floor:['yellow','🟡 Outside the Undercut / Fair-Price Bands'],
        unknown:['unknown','Cross-market price UNKNOWN']
      };
      const [state,title] = labels[r.status];
      light('doctor-market',state,title,'Matched ask floor: ' + money(r.askFloor) + '. Green <94%; fair 97–103%; red >104% while below the suggested anchor. Buy-order bids stay separate. These are dated gross quotes, before resale/payout fees, not executable offers or guaranteed margin.');
    } catch(error) { light('doctor-market','unknown','Cross-market check pending',error.message); }
    try {
      if (f === null || !known(item.min_float) || !known(item.max_float)) throw new Error('Enter an actual float within a known skin range.');
      const band = GrowthMath.wearBand(f);
      if (band.name !== $('#wear-select').value) throw new Error('Float does not match the selected exterior.');
      const r = GrowthMath.bandDiagnosis(f,item.min_float,item.max_float,band.min,band.max,item.name);
      const [state,title] = r.cornerRisk ? ['red','🔴 High-Risk Corner / Knuckle Zone — Inspect Screenshot'] : r.percentile <= .10 ? ['green','🟢 Top-10% of This Wear Band'] : r.cleanName ? ['green','🟢 Liquid-Finish Shortlist · Inspect Surface'] : ['yellow','🟡 Standard · 0% Assumed Float Premium'];
      light('doctor-band',state,title,'Band position ' + (r.percentile*100).toFixed(2) + '% in [' + Math.max(item.min_float,band.min) + ', ' + Math.min(item.max_float,band.max) + ']. This is a range position, not a population percentile or proof of clean corners. Finish shortlist does not make an item pattern-immune.');
    } catch(error) { light('doctor-band','unknown','Wear-band position UNKNOWN',error.message); }
    try {
      const r = GrowthMath.fillerPerspective(item,f);
      light('doctor-filler',known(r.normalizedFloat) ? 'green' : 'unknown',known(r.normalizedFloat) ? 'Normalized Float: ' + r.normalizedFloat.toPrecision(8) : 'Normalized Float UNKNOWN',
        'Skin range [' + (r.minFloat ?? 'UNKNOWN') + ', ' + (r.maxFloat ?? 'UNKNOWN') + ']. Collections: ' + names(r.collections) + '. Containers: ' + names(r.crates) + '. Range and collection membership alone do not establish five-Covert recipe eligibility or output odds.');
    } catch(error) { light('doctor-filler','unknown','Check skin float',error.message); }
    let timing = [];
    if (sp && !resolved.skinport_mixed) {
      const median = sp.median_7d_usd, suggested = sp.official_suggested_price_usd;
      if (known(median) && median > 0 && known(suggested)) $('#truth-gap').textContent = ((suggested/median-1)*100).toFixed(1) + '% anchor premium';
      if (known(sp.sales_7d)) $('#truth-grade').textContent = (sp.sales_7d >= 5 ? '🟢 Liquid sample · ' : '🔴 Thin sample · ') + sp.sales_7d + '/7d';
      if (known(median) && median > 0) {
        const fee = median >= 1000 ? input('skinport-tier') : 8;
        const safe = GrowthMath.calculateSafeBuy(median,fee).maxSafePrice;
        $('#truth-safe').textContent = money(safe) + ' · ' + fee + '% fee';
        timing = samples.filter(row => row.market_hash_name === resolved.market_hash_name && known(row.listed_price_usd) && row.listed_price_usd < safe && known(row.observed_sold_seconds));
        if(timing.length) $('#truth-speed').textContent = 'Clears in ~' + (timing.reduce((sum,row)=>sum+row.observed_sold_seconds,0)/timing.length).toFixed(1) + 's · n=' + timing.length;
      }
    }
    $('#truth-metrics').textContent = resolved.market_hash_name + (item.phase ? ' / ' + item.phase : '') + ' · Skinport 7d: ' + money(sp?.median_7d_usd) + ' / 30d: ' + money(sp?.median_30d_usd) + (resolved.skinport_mixed ? ' · mixed-phase medians, excluded from safe-price / timing calculations' : '');
    const source = dictionary.sources || {};
    $('#truth-provenance').textContent = 'Metadata captured: ' + (source.bymykel?.captured_at || 'UNKNOWN') + '. Market files captured: ' + (source.cross_market?.captured_at || 'UNKNOWN') + '. Skinport quote: ' + (sp?.observed_at || source.skinport?.captured_at || 'UNKNOWN') + '. Historical timing dates: ' + ([...new Set(timing.map(row=>row.observed_at || row.published_at || 'UNKNOWN'))].join(', ') || 'no matching observations') + '. Fetch time is not the provider’s individual quote timestamp.';
  }
  function syncSelection() {
    const item = selected();
    if(!item) { renderChecker(); return; }
    const wears = item.wears?.length ? item.wears : [''];
    $('#wear-select').innerHTML = wears.map(wear=>'<option value="'+esc(wear)+'">'+esc(wear || 'No exterior / Vanilla')+'</option>').join('');
    $('#wear-select').value = wears[0];
    const variants = [['normal','Normal'], ...(item.stattrak ? [['stattrak','StatTrak™']] : []), ...(item.souvenir ? [['souvenir','Souvenir']] : [])];
    $('#variant-select').innerHTML = variants.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('');
    $('#variant-select').value = 'normal';
    $('#doctor-paint').value = item.paint_index ?? '';
    $('#doctor-seed').value = '';
    syncWear();
  }
  function syncWear() {
    const item=selected(); if(!item) return;
    const band=bands[$('#wear-select').value];
    $('#doctor-float').value=band && known(item.min_float) && known(item.max_float) ? (Math.max(item.min_float,band[0])+Math.min(item.max_float,band[1]))/2 : '';
    const q=currentQuote(item), sp=q.skinport_mixed ? null : q.skinport;
    $('#doctor-price').value=known(sp?.active_floor_usd) ? sp.active_floor_usd : '';
    renderChecker();
  }
  const searchTokens = value => String(value ?? '').toLowerCase().split(/[\s\p{P}\p{S}]+/u).filter(Boolean);
  const wearAliases = {'Factory New':'fn','Minimal Wear':'mw','Field-Tested':'ft','Well-Worn':'ww','Battle-Scarred':'bs'};
  const skinSearchText = row => searchTokens([
    row.name, row.phase, String(row.phase ?? '').replace(/\bphase\s*([1-4])\b/gi, 'p$1'),
    row.paint_index, row.weapon, row.finish, row.aliases,
    ...(row.wears || []).map(wear => wear + ' ' + (wearAliases[wear] || '')),
    ...(row.collections || []), ...(row.crates || [])
  ].flat().map(value => typeof value === 'object' && value !== null ? value.name : value).join(' ')).join(' ');
  const skinMatchesQuery = (row, tokens) => {
    const text = skinSearchText(row);
    return tokens.every(token => text.includes(token));
  };
  function populateSkins() {
    const tokens=searchTokens($('#skin-search').value), previous=$('#skin-select').value;
    const rows=benchmarks.filter(row=>skinMatchesQuery(row, tokens));
    $('#skin-select').innerHTML=rows.map(row=>'<option value="'+esc(row.id)+'">'+esc(label(row))+'</option>').join('') || '<option value="">No matching skin</option>';
    $('#skin-select').value=rows.some(row=>row.id===previous) ? previous : (rows[0]?.id || '');
    syncSelection();
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
      
      $('#load-note').textContent = known(median) ? 'Loaded the dated median and listed acquisition price. This is a retrospective calculation, not a live executable quote.' : 'Loaded acquisition price; no official 7d median is available. Enter your own sale assumption.';
      renderCashout(); renderChecker(); location.hash = 'cashout';
    }; });
  }


  async function load() {
    try {
      const responses=await Promise.all([fetch('data/skin_benchmarks.json'),fetch('data/latest_telemetry.json')]);
      if(responses.some(r=>r.ok===false)) throw new Error('A dated evidence file could not be loaded.');
      const [data,telemetry]=await Promise.all(responses.map(r=>r.json()));
      dictionary=data; benchmarks=data.skins; samples=data.samples;
      observedAt=data.sources?.skinport?.captured_at || data.observed_at || 'UNKNOWN';
      populateSkins();
      const ranges=benchmarks.filter(row=>known(row.min_float)&&known(row.max_float)&&row.max_float>row.min_float);
      $('#float-skin-select').innerHTML='<option value="">Manual range</option>'+ranges.map(row=>'<option value="'+esc(row.id)+'">'+esc(label(row))+'</option>').join('');
      $('#sample-source').textContent=samples.length+' dated observations. Skinport quote capture: '+observedAt+'. Latest public-feed observation: '+(telemetry.telegram_feed?.observed_at || 'UNKNOWN')+'.';
      $('#dataset-summary').textContent=benchmarks.length.toLocaleString()+' skin / phase identities · '+Object.keys(dictionary.prices).length.toLocaleString()+' exact market keys · '+Object.keys(dictionary.skinport).length+' local Skinport quote objects';
      renderSamples();
    } catch(error) { $('#truth-provenance').textContent=error.message; $('#telemetry-body').innerHTML='<tr><td colspan="5">Evidence could not be loaded.</td></tr>'; }
  }
  function loadRange(output) {
    const item=selected(); if(!item || !known(item.min_float) || !known(item.max_float)) return;
    if(output) { $('#output-min').value=item.min_float; $('#output-max').value=item.max_float; $('#float-skin-select').value=item.id; }
    else { $('#filler-min').value=item.min_float; $('#filler-max').value=item.max_float; $('#candidate-float').value=$('#doctor-float').value; }
    $('#float-source').textContent=label(item)+' · ByMykel range. Recipe eligibility remains separate.';
    renderFloat(); location.hash='float';
  }
  document.addEventListener('DOMContentLoaded', () => {
    load(); renderCashout(); renderFloat();
    $('#skin-search').oninput=populateSkins;
    $('#skin-select').onchange=syncSelection;
    $('#wear-select').onchange=syncWear;
    $('#variant-select').onchange=syncWear;
    ['doctor-price','doctor-paint','doctor-seed'].forEach(id=>{$('#'+id).oninput=renderChecker;});
    $('#doctor-float').oninput=()=>{
      const f=optional('doctor-float'),item=selected();
      if(known(f)&&f>=0&&f<=1&&item?.wears?.includes(GrowthMath.wearBand(f).name)) $('#wear-select').value=GrowthMath.wearBand(f).name;
      renderChecker();
    };
    $('#load-input-range').onclick=()=>loadRange(false);
    $('#load-output-range').onclick=()=>loadRange(true);
    ['fair','listed','skinport-tier','csfloat-payout','csfloat-fx'].forEach(id=>{$('#'+id).oninput=renderCashout;});
    all('[data-amount]').forEach(button=>{button.onclick=()=>{$('#fair').value=button.dataset.amount;renderCashout();};});
    $('#float-skin-select').onchange=()=>{
      const item=benchmarks.find(row=>row.id===$('#float-skin-select').value);
      if(item){$('#output-min').value=item.min_float;$('#output-max').value=item.max_float;$('#float-source').textContent=label(item)+' · ByMykel metadata; recipe eligibility is separate.';}
      renderFloat();
    };
    ['output-min','output-max','target-float','filler-min','filler-max','candidate-float','owned-floats'].forEach(id=>{$('#'+id).oninput=renderFloat;});
    all('[data-example]').forEach(button=>{button.onclick=()=>{
      $('#float-skin-select').value='';$('#output-min').value='0';$('#output-max').value='1';$('#target-float').value='0.07';
      $('#filler-min').value='0';$('#filler-max').value='1';$('#owned-floats').value='';
      $('#candidate-float').value={safe:'0.06',trap:'0.069999999',over:'0.071'}[button.dataset.example];
      $('#float-source').textContent='Illustrative 0–1 ranges isolate storage rounding; not an item recipe.';renderFloat();
    };});
    $('#budget-select').onchange=renderSamples;
  });
})();
