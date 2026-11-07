/* Standalone arithmetic for the public CS2 tools. No network or storage access. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.GrowthMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function finite(value, name) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new RangeError(name + " must be a finite number.");
    }
    return value;
  }
  function positive(value, name) {
    finite(value, name);
    if (value <= 0) throw new RangeError(name + " must be greater than zero.");
    return value;
  }
  function unit(value, name) {
    finite(value, name);
    if (value < 0 || value > 1) throw new RangeError(name + " must be between 0 and 1.");
    return value;
  }
  function range(min, max, name) {
    unit(min, name + " minimum");
    unit(max, name + " maximum");
    if (min >= max) throw new RangeError(name + " minimum must be less than maximum.");
  }

  // Decimal fractions preserve input boundaries such as exactly 6% and exactly
  // one cent. Math.floor(Number(...)*100) can lose a valid cent to binary error.
  function decimal(value) {
    const parts = value.toString().toLowerCase().split("e");
    const mantissa = parts[0];
    const exponent = parts.length === 2 ? Number(parts[1]) : 0;
    const digits = (mantissa.split(".")[1] || "").length;
    const numerator = BigInt(mantissa.replace(".", ""));
    const power = digits - exponent;
    return power >= 0
      ? [numerator, 10n ** BigInt(power)]
      : [numerator * 10n ** BigInt(-power), 1n];
  }
  function add(a, b) { return [a[0] * b[1] + b[0] * a[1], a[1] * b[1]]; }
  function subtract(a, b) { return [a[0] * b[1] - b[0] * a[1], a[1] * b[1]]; }
  function multiply(a, b) { return [a[0] * b[0], a[1] * b[1]]; }
  function divide(a, b) { return [a[0] * b[1], a[1] * b[0]]; }
  function compare(a, b) {
    const difference = a[0] * b[1] - b[0] * a[1];
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
  }
  function number(fraction) {
    // Normal inputs are small. Reject extreme numeric magnitudes instead of
    // allowing Infinity/NaN to masquerade as a valid financial result.
    const result = Number(fraction[0]) / Number(fraction[1]);
    if (!Number.isFinite(result)) throw new RangeError("Input magnitude is too large or too small.");
    return result;
  }
  function centsToNumber(cents) {
    const s = cents.toString().padStart(3, "0");
    return Number(s.slice(0, -2) + "." + s.slice(-2));
  }

  function calculateSnipe(fair, listed) {
    positive(fair, "Fair benchmark");
    positive(listed, "Listed price");
    const recovery = multiply(decimal(fair), [962n, 1000n]);
    const listedFraction = decimal(listed);
    const profit = subtract(recovery, listedFraction);
    const absoluteCap = subtract(recovery, [5n, 2n]);
    const roiCap = divide(recovery, [106n, 100n]);
    const cap = compare(absoluteCap, roiCap) < 0 ? absoluteCap : roiCap;
    const rawCents = cap[0] * 100n / cap[1];
    const safeCents = rawCents > 0n ? rawCents : 0n;
    return {
      afterFee: number(recovery),
      netProfit: number(profit),
      roiPct: number(multiply(divide(profit, listedFraction), [100n, 1n])),
      maxSafePrice: centsToNumber(safeCents),
      passes: compare(profit, [5n, 2n]) >= 0 &&
        compare(recovery, multiply(listedFraction, [106n, 100n])) >= 0,
      feasible: safeCents > 0n
    };
  }

  function compareCashout(fair, listed, sellerFeePct, withdrawalFxPct) {
    positive(fair, "Fair benchmark");
    positive(listed, "Listed price");
    finite(sellerFeePct, "Seller fee");
    finite(withdrawalFxPct, "Withdrawal and FX fee");
    if (sellerFeePct < 0 || sellerFeePct > 100 || withdrawalFxPct < 0 || withdrawalFxPct > 100) {
      throw new RangeError("Fees must be between 0% and 100%.");
    }
    const sellerFactor = subtract([1n, 1n], divide(decimal(sellerFeePct), [100n, 1n]));
    const withdrawalFactor = subtract([1n, 1n], divide(decimal(withdrawalFxPct), [100n, 1n]));
    const recovery = multiply(multiply(decimal(fair), sellerFactor), withdrawalFactor);
    const profit = subtract(recovery, decimal(listed));
    return {
      afterFee: number(recovery),
      netProfit: number(profit),
      roiPct: number(multiply(divide(profit, decimal(listed)), [100n, 1n])),
      sellerFeePct,
      withdrawalFxPct
    };
  }

  function normalizedFraction(value, min, max) {
    range(min, max, "Input float range");
    finite(value, "Input float");
    if (value < min || value > max) throw new RangeError("Input float must be within its skin's range.");
    return divide(subtract(decimal(value), decimal(min)), subtract(decimal(max), decimal(min)));
  }

  function normalizeFloat(value, min, max) {
    return number(normalizedFraction(value, min, max));
  }

  function calculateFillers(outputMin, outputMax, target, ownedNormalized, fillerMin, fillerMax) {
    range(outputMin, outputMax, "Output float range");
    range(fillerMin, fillerMax, "Filler float range");
    unit(target, "Target float");
    if (!Array.isArray(ownedNormalized) || ownedNormalized.length > 4) {
      throw new RangeError("Provide zero to four owned normalized floats.");
    }
    // Keep actual floats as exact decimal ratios until the strict comparison.
    // A rounded Number can falsely leave a tiny positive budget at equality.
    const ownedFractions = ownedNormalized.map((value, index) => {
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return normalizedFraction(value.actual, value.min, value.max);
      }
      unit(value, "Owned normalized float " + (index + 1));
      return decimal(value);
    });
    const remaining = 5 - ownedNormalized.length;
    const required = divide(subtract(decimal(target), decimal(outputMin)), subtract(decimal(outputMax), decimal(outputMin)));
    const requiredAverage = number(required);
    const infeasible = (reason) => ({
      feasible: false, requiredAverage, maxFillerNormalized: null,
      maxFillerFloat: null, remaining, allFillersAllowed: false, reason
    });
    if (target <= outputMin) return infeasible("target_at_or_below_output_minimum");
    let owned = [0n, 1n];
    for (const value of ownedFractions) owned = add(owned, value);
    const budget = divide(subtract(multiply(required, [5n, 1n]), owned), [BigInt(remaining), 1n]);
    if (compare(budget, [0n, 1n]) <= 0) return infeasible("owned_materials_exhaust_float_budget");
    const allFillersAllowed = compare(budget, [1n, 1n]) > 0;
    const usableBudget = allFillersAllowed ? [1n, 1n] : budget;
    const maxAbsolute = add(decimal(fillerMin), multiply(usableBudget, subtract(decimal(fillerMax), decimal(fillerMin))));
    return {
      feasible: true,
      requiredAverage,
      maxFillerNormalized: number(usableBudget),
      maxFillerFloat: number(maxAbsolute),
      remaining,
      allFillersAllowed,
      reason: allFillersAllowed ? "all_remaining_float_values_allowed" : "strict_average_limit"
    };
  }

  function feeFactor(fee) {
    finite(fee, "Fee");
    if (fee < 0 || fee > 100) throw new RangeError("Fees must be between 0% and 100%.");
    return subtract([1n, 1n], divide(decimal(fee), [100n, 1n]));
  }
  function recoveryFraction(amount, fees) {
    positive(amount, "Sale amount");
    return fees.reduce((value, fee) => multiply(value, feeFactor(fee)), decimal(amount));
  }
  function cashout(amount, fee) { return number(recoveryFraction(amount, [fee])); }
  function calculateSafeBuy(median, sellerFee = 8, withdrawal = 0, fx = 0) {
    const recovery = recoveryFraction(median, [sellerFee, withdrawal, fx]);
    const profitCap = subtract(recovery, [5n, 2n]);
    const roiCap = divide(recovery, [106n, 100n]);
    const cap = compare(profitCap, roiCap) < 0 ? profitCap : roiCap;
    const cents = cap[0] > 0n ? cap[0] * 100n / cap[1] : 0n;
    return {afterFee: number(recovery), maxSafePrice: centsToNumber(cents)};
  }
  function compareArena(amount, publicFee = 8, withdrawalPct = 2.5, fxPct = 0) {
    return [
      {name: "Skinport Public", net: cashout(amount, publicFee), fee: publicFee + "%", withdrawable: true},
      {name: "Skinport Private", net: cashout(amount, 2), fee: "2% · private buyer required", withdrawable: true},
      {name: "CSFloat", net: number(recoveryFraction(amount, [2, withdrawalPct, fxPct])),
        fee: "2% sale, then " + withdrawalPct + "% withdrawal, then " + fxPct + "% FX", withdrawable: true},
      {name: "Steam", net: number(divide(decimal(amount), [115n, 100n])),
        fee: "P ÷ 1.15 · wallet balance", withdrawable: false}
    ];
  }
  function float32(value) { return Math.fround(finite(value, "Float32 value")); }
  function classifyFloat32(projected, target) {
    unit(projected, "Projected output");
    unit(target, "Target");
    const stored = float32(projected);
    return {projected, stored, status: projected >= target ? "over" : stored >= target ? "trap" : "safe"};
  }
  function projectFloat(outputMin, outputMax, ownedNormalized, candidate, fillerMin, fillerMax) {
    range(outputMin, outputMax, "Output range");
    if (!Array.isArray(ownedNormalized) || ownedNormalized.length > 4) throw new RangeError("Provide zero to four owned normalized floats.");
    let sum = [0n, 1n];
    for (const value of ownedNormalized) { unit(value, "Owned normalized float"); sum = add(sum, decimal(value)); }
    const normalized = normalizedFraction(candidate, fillerMin, fillerMax);
    sum = add(sum, multiply(normalized, [BigInt(5 - ownedNormalized.length), 1n]));
    return number(add(decimal(outputMin), multiply(divide(sum, [5n, 1n]), subtract(decimal(outputMax), decimal(outputMin)))));
  }
  function optionalNumber(value, name) {
    return value === null || value === undefined || value === "" ? null : finite(Number(value), name);
  }
  // Floors must already be matched to the same phase/exterior/currency by the
  // caller. A blended phase is deliberately represented as UNKNOWN upstream.
  function crossMarket(listed, suggested, buffFloor, csfloatFloor, highestBid) {
    listed = positive(Number(listed), "Listed price");
    const askValues = [buffFloor, csfloatFloor]
      .map((v, i) => optionalNumber(v, ["Buff floor", "CSFloat floor"][i]))
      .filter(v => v !== null && v > 0);
    const trueFloor = askValues.length ? Math.min(...askValues) : null;
    const bidFloor = optionalNumber(highestBid, "Buy-order floor");
    const reference = trueFloor;
    let status = "unknown";
    if (reference !== null) {
      const listedF = decimal(listed), refF = decimal(reference);
      const below94 = compare(listedF, multiply(refF, [94n, 100n])) < 0;
      const atLeast97 = compare(listedF, multiply(refF, [97n, 100n])) >= 0;
      const atMost103 = compare(listedF, multiply(refF, [103n, 100n])) <= 0;
      const above104 = compare(listedF, multiply(refF, [104n, 100n])) > 0;
      if (below94) status = "true_cross_market_undercut";
      else if (atLeast97 && atMost103) status = "fair_personal_use";
      else if (suggested !== null && Number.isFinite(Number(suggested)) && listed < Number(suggested) && above104) status = "fake_discount_phase_blended_trap";
      else status = "above_cross_market_floor";
    }
    return {listed, suggested: optionalNumber(suggested, "Suggested price"), buffFloor: optionalNumber(buffFloor, "Buff floor"), csfloatFloor: optionalNumber(csfloatFloor, "CSFloat floor"), highestBid: bidFloor, trueFloor: reference, askFloor: reference, bidFloor, status};
  }
  function bandPercentile(floatValue, minFloat, maxFloat, exteriorMin = 0, exteriorMax = 1) {
    if (floatValue === null || floatValue === undefined || floatValue === "") throw new RangeError("Float value is required.");
    if ([minFloat, maxFloat, exteriorMin, exteriorMax].some(v => v === null || v === undefined || v === "")) throw new RangeError("Known skin and exterior ranges are required.");
    const f = finite(Number(floatValue), "Float value");
    const lo = Math.max(finite(Number(minFloat), "Skin minimum"), finite(Number(exteriorMin), "Exterior minimum"));
    const hi = Math.min(finite(Number(maxFloat), "Skin maximum"), finite(Number(exteriorMax), "Exterior maximum"));
    if (hi <= lo || f < lo || f > hi || (Number(exteriorMax) < 1 && f >= Number(exteriorMax))) throw new RangeError("Float is outside the intersected wear band.");
    return (f - lo) / (hi - lo);
  }
  function bandDiagnosis(floatValue, minFloat, maxFloat, exteriorMin, exteriorMax, itemName = "") {
    const percentile = bandPercentile(floatValue, minFloat, maxFloat, exteriorMin, exteriorMax);
    const name = String(itemName).toLowerCase();
    const cornerRisk = /(karambit|sport gloves|driver gloves)/i.test(name) && percentile > 0.55;
    const cleanName = /(vanilla|tiger tooth|autotronic|lore|black laminate|printstream)/i.test(name);
    let status = percentile <= 0.10 || cleanName ? "top_10_clean_pattern_immune_liquid" : "standard_no_float_overpay";
    if (cornerRisk) status = "high_risk_scuffed_corner_knuckle";
    return {percentile, status, cornerRisk, cleanName, boundary: percentile <= 0.10 ? "top_10" : percentile <= 0.55 ? "mid_band" : "upper_band"};
  }
  function phaseDiagnosis(metadata = {}, paintSeed = null, observedPaintIndex = null) {
    const phase = metadata.phase || metadata.doppler_phase || null;
    const paintIndex = metadata.paint_index === null || metadata.paint_index === undefined ? null : Number(metadata.paint_index);
    const observedIndex = observedPaintIndex === null || observedPaintIndex === undefined || observedPaintIndex === "" ? null : Number(observedPaintIndex);
    const seed = paintSeed === null || paintSeed === undefined || paintSeed === "" ? null : Number(paintSeed);
    const supportedSeed = Number.isInteger(seed) && seed >= 0 && seed <= 1000;
    if (seed !== null && !supportedSeed) throw new RangeError("Paint seed must be an integer from 0 to 1000.");
    if (observedIndex !== null && !Number.isFinite(observedIndex)) throw new RangeError("Observed paint index must be numeric.");
    const conflict = paintIndex !== null && observedIndex !== null && paintIndex !== observedIndex;
    const gem = /ruby|sapphire|black pearl|emerald/i.test(String(phase));
    const popular = /^(p2|p4|phase 2|phase 4)$/i.test(String(phase));
    const status = conflict ? "paint_index_conflict" : gem && metadata.phase_verified === true ? "gem_metadata_verified" : popular && metadata.phase_verified === true ? "popular_phase" : phase && metadata.phase_verified === true ? "floor_phase" : phase ? "phase_metadata_unverified" : "unknown";
    return {phase, paintIndex: Number.isFinite(paintIndex) ? paintIndex : null, observedPaintIndex: Number.isFinite(observedIndex) ? observedIndex : null, paintSeed: supportedSeed ? seed : null, seedVerified: false, conflict, status, seedMapping: "UNKNOWN unless a source-specific seed map is provided"};
  }
  function fillerPerspective(metadata, floatValue = null) {
    const minFloat = optionalNumber(metadata?.min_float, "Metadata minimum float");
    const maxFloat = optionalNumber(metadata?.max_float, "Metadata maximum float");
    let normalized = null;
    if (floatValue !== null && minFloat !== null && maxFloat !== null) normalized = normalizeFloat(Number(floatValue), minFloat, maxFloat);
    return {minFloat, maxFloat, paintIndex: metadata?.paint_index ?? null, phase: metadata?.phase ?? null, collections: metadata?.collections ?? [], crates: metadata?.crates ?? [], normalizedFloat: normalized};
  }
  function marketHashName(skin, wear, variant = "normal") {
    const base = typeof skin === "string" ? skin : skin?.name;
    if (!base || typeof base !== "string") throw new RangeError("Skin name is required.");
    if (wear !== "" && typeof wear !== "string") throw new RangeError("Wear must be text.");
    const clean = base.replace(/^★\s*/, "").replace(/^StatTrak™\s+/, "");
    const isKnife = typeof skin === "object" ? /knives|knife/i.test(String(skin.category || "")) || skin.is_knife === true || /^★/.test(base) : /\b(knife|karambit|bayonet|daggers|gloves)\b/i.test(clean) || /^★/.test(base);
    const prefix = variant === "souvenir" ? "Souvenir " : variant === "statTrak" || variant === "stattrak" ? "StatTrak™ " : "";
    const suffix = wear === "" ? "" : " (" + wear + ")";
    return (isKnife && variant !== "souvenir" ? "★ " : "") + prefix + clean + suffix;
  }
  function resolveMarketQuote(dictionary, skin, wear, variant = "normal") {
    const key = marketHashName(skin, wear, variant);
    const phase = typeof skin === "object" ? skin.phase : null;
    const prices = dictionary?.prices || dictionary || {};
    const entry = prices[key];
    let quote = null, phaseMatched = false;
    if (entry) {
      if (phase) {
        if (entry.phases && Object.prototype.hasOwnProperty.call(entry.phases, phase)) {
          quote = entry.phases[phase]; phaseMatched = true;
        }
      } else if (!entry.phases || Object.keys(entry.phases).length === 0) {
        quote = entry; phaseMatched = true;
      }
    }
    const skinportEntry = dictionary?.skinport?.[key] ?? null;
    return {market_hash_name:key, quote, phase_matched:phaseMatched,
      skinport_mixed: Boolean(phase && skinportEntry), skinport: phase && skinportEntry ? {value:skinportEntry, phase_status:"mixed", usable_for_safe_green:false} : skinportEntry};
  }
  function wearBand(floatValue) {
    if (floatValue === null || floatValue === undefined || floatValue === "") throw new RangeError("Float value is required.");
    const f = unit(Number(floatValue), "Float value");
    if (f < 0.07) return {name:"Factory New", min:0, max:0.07};
    if (f < 0.15) return {name:"Minimal Wear", min:0.07, max:0.15};
    if (f < 0.38) return {name:"Field-Tested", min:0.15, max:0.38};
    if (f < 0.45) return {name:"Well-Worn", min:0.38, max:0.45};
    return {name:"Battle-Scarred", min:0.45, max:1};
  }
  const BASE_SP_MATRIX={L1:{S:.102,A:.082,B:.052,C:.005},L2:{S:.062,A:.050,B:.030,C:0},L3:{S:.036,A:.028,B:.016,C:0},L4:{S:.018,A:.013,B:.005,C:0},L5:{S:.010,A:.006,B:.001,C:0}};
  const weaponSlotWeights={'AK-47':[1,.85,.75,.90,.65],AWP:[1,.80,.55,.20,.45],'M4A1-S':[.60,1,.85,.70,.45],M4A4:[1,.75,.85,.30,.60],'Desert Eagle':[.85,.90,1,.20,.75],'Glock-18':[.90,.88,1,.15,.65],'USP-S':[.85,.90,1,.18,.55]};
  function stickerAudit(o) {
    const base=Number(o.floor), listing=Number(o.listing), fv=Number(o.floatValue), st=o.stickers;
    if (!(base>0) || !(listing>=0) || !(fv>=0&&fv<=1) || !Array.isArray(st) || st.length<1 || st.length>5) throw new RangeError('Enter a positive base, listing, float and 1–5 stickers.');
    const matrix=BASE_SP_MATRIX[o.liquidity], slots=weaponSlotWeights[o.weapon];
    if (!matrix || !slots) throw new RangeError('Choose a weapon and liquidity tier.');
    let tier=o.liquidity;if(o.exterior==='Battle-Scarred'&&tier==='L1')tier='L4';else if(o.exterior==='Well-Worn'&&tier==='L1')tier='L2';
    let fp=0;
    if(o.exterior==='Factory New')fp=fv<.001?.899:fv<.005?.296:fv<.01?.076:fv<.02?.017:fv<.04?0:-.012;
    if(o.exterior==='Minimal Wear')fp=fv<.08?.087:fv>.14?-.012:0;
    if(o.exterior==='Field-Tested')fp=fv<.175?.077:fv>.35?-.018:0;
    fp=Math.max(-.02,fp*(base<20?1.35:base>500?.65:1));
    const baseAdjusted=base*(1+fp), pool=st.reduce((sum,x)=>sum+Number(x.price),0);
    if (!(pool>0) || st.some(x=>!(Number(x.price)>0)||!BASE_SP_MATRIX[tier].hasOwnProperty(x.tier)||!Number.isInteger(Number(x.slot))||Number(x.slot)<0||Number(x.slot)>4||!(Number(x.scrape)>=0&&Number(x.scrape)<=1))) throw new RangeError('Enter a positive sticker price and scrape between 0 and 100%.');
    const matching=o.theme==='matching';
    if(matching&&st.some(x=>!String(x.name||'').trim()||String(x.name).trim().toLowerCase()!==String(st[0].name||'').trim().toLowerCase()||x.tier!==st[0].tier||x.material!==st[0].material||Number(x.price)!==Number(st[0].price)))throw new RangeError('Matching craft requires the same sticker name, price, tier and material in each row.');
    const prices=[...st].sort((a,b)=>b.price-a.price), rank={matching:[1,1,1,1,1],themed_kato:[1,.92,.85,.78,.72],themed_team:[1,.85,.75,.65,.60],themed_color:[1,.80,.65,.55,.50],random_mixed:[1,.5,.3,.15,.10]}[o.theme];
    if(!rank)throw new RangeError('Choose a craft type.');
    const mat={Holo:1,Lenticular:.90,Foil:.85,Gold:.65,Glitter:.45,Paper:.45};
    const place={preset_standard:1,custom_across_body:1.10,best_position:1,grip_obscured:1,custom_sloppy:.52}[o.placement];
    const color={apex_match:1.35,canvas_harmonious:1.18,neutral:1,clash:.72}[o.color];
    if(place===undefined||color===undefined)throw new RangeError('Choose placement and color.');
    const matching4=matching&&st.length>=4;
    const noOverpay=(!matching4&&Math.max(...st.map(x=>Number(x.price)))<2)||(matching4&&pool<2)||(pool/base<.015&&pool<10);
    if(noOverpay)return {baseAdjusted,floatAdjustment:base*fp,pool,platformSP:(listing-base)/pool*100,realSP:(listing-baseAdjusted)/pool*100,fairSP:{low:0,mid:0,high:.5},fairValue:{low:baseAdjusted,mid:baseAdjusted,high:baseAdjusted},buySP:0,buyLimit:baseAdjusted*.94,tts:tier==='L1'?{low:.5,high:2}:{low:2,high:7},tier,noOverpay:true};
    let raw=0;prices.forEach((x,i)=>{const w=Number(x.scrape),win=x.easterEggWindow,egg=Array.isArray(win)&&win.length===2&&w>=win[0]&&w<=win[1],ret=w<=0||egg?1:w>(x.tier==='S'?.75:.45)?0:.75*Math.exp(-(x.tier==='S'?2.8:3.8)*w);raw+=Number(x.price)*BASE_SP_MATRIX[tier][x.tier]*slots[Number(x.slot)]*ret*rank[i]*(mat[x.material]??.45);});
    const n=st.length, curve=['Holo','Lenticular'].includes(prices[0].material)?[0,1,1.35,1.85,4.10,4.50]:[0,1,1.20,1.55,3.20,3.55];
    const synergy=matching?curve[n]:({themed_kato:1.85,themed_team:1.35,themed_color:1.20,random_mixed:.85}[o.theme]);
    const supply=Number(o.supply),scarcity=o.modern&&supply>=1&&n>=4?1+.65*Math.exp(-.35*(supply-1)):1;
    let mid=Math.min(.82,raw*synergy*place*color*scarcity/pool),lo=mid*.82,hi=Math.min(.88,mid*1.20);
    const discount={L1:.62,L2:.52,L3:.42,L4:.30,L5:.22}[tier], buy=mid*discount, fair=baseAdjusted+mid*pool;
    const ttsBase={L1:2,L2:5.5,L3:12,L4:35,L5:65}[tier];const t=Math.round(ttsBase*(1+1.15*Math.log(1+mid*pool/Math.max(10,baseAdjusted))+.008*(mid*pool/10))/(color*Math.min(1,place)));
    return {baseAdjusted,floatAdjustment:base*fp,pool,platformSP:(listing-base)/pool*100,realSP:(listing-baseAdjusted)/pool*100,fairSP:{low:lo*100,mid:mid*100,high:hi*100},fairValue:{low:baseAdjusted+lo*pool,mid:fair,high:baseAdjusted+hi*pool},buySP:buy*100,buyLimit:baseAdjusted*.98+buy*pool,tts:{low:Math.max(1,Math.floor(t*.7)),high:Math.ceil(t*1.4)},tier,noOverpay};
  }
  return Object.freeze({calculateSnipe, compareCashout, compareArena, calculateSafeBuy, normalizeFloat, stickerAudit, BASE_SP_MATRIX, weaponSlotWeights,
    calculateFillers, cashout, float32, classifyFloat32, projectFloat, crossMarket,
    bandPercentile, bandDiagnosis, phaseDiagnosis, fillerPerspective, marketHashName,
    resolveMarketQuote, wearBand});
});
