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

  function normalizeFloat(value, min, max) {
    range(min, max, "Input float range");
    finite(value, "Input float");
    if (value < min || value > max) throw new RangeError("Input float must be within its skin's range.");
    return number(divide(subtract(decimal(value), decimal(min)), subtract(decimal(max), decimal(min))));
  }

  function calculateFillers(outputMin, outputMax, target, ownedNormalized, fillerMin, fillerMax) {
    range(outputMin, outputMax, "Output float range");
    range(fillerMin, fillerMax, "Filler float range");
    unit(target, "Target float");
    if (!Array.isArray(ownedNormalized) || ownedNormalized.length > 4) {
      throw new RangeError("Provide zero to four owned normalized floats.");
    }
    ownedNormalized.forEach((value, index) => unit(value, "Owned normalized float " + (index + 1)));
    const remaining = 5 - ownedNormalized.length;
    const required = divide(subtract(decimal(target), decimal(outputMin)), subtract(decimal(outputMax), decimal(outputMin)));
    const requiredAverage = number(required);
    const infeasible = (reason) => ({
      feasible: false, requiredAverage, maxFillerNormalized: null,
      maxFillerFloat: null, remaining, allFillersAllowed: false, reason
    });
    if (target <= outputMin) return infeasible("target_at_or_below_output_minimum");
    let owned = [0n, 1n];
    for (const value of ownedNormalized) owned = add(owned, decimal(value));
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

  return Object.freeze({calculateSnipe, compareCashout, normalizeFloat, calculateFillers});
});
