# [Free & No-Login Web Calculator](https://andrewkreil.github.io/cs2-ticker/)

## CS2 Skinport Telemetry & Open-Source Calculators

An MIT-licensed collection of browser-based fee calculators, normalized wear-budget models, and dated, anonymized Skinport telemetry. The calculators run without a Steam login.

The fee calculator compares declared marketplace costs. The wear calculator works backward from an output-wear target to an input budget. The underlying market observations cover Skinport; these comparison tools do not imply live monitoring of every marketplace or verified low-price filler discovery.

## Marketplace fees and settlement math

Let `P` be the completed sale price, `C` the acquisition cost, `s` the selling-fee fraction, and `w` a withdrawal-fee fraction applied to the remaining balance:

```text
Modeled cash proceeds = P × (1 − s) × (1 − w)
Modeled spread = modeled cash proceeds − C
Modeled ROI = modeled spread / C     (C > 0)
```

| Marketplace / route | Fee basis | Calculation and funds |
|---|---|---|
| Skinport public sale | 8% standard; 6% for qualifying high-value listings under the applicable currency threshold | `P × 0.92` or `P × 0.94`, before separate bank, FX, tax, and time costs; bank-cash settlement |
| Skinport private sale | 2% for the private-listing route | `P × 0.98`; this rate does not apply to every public listing |
| CSFloat | 2% selling fee; the dated official fee note describes 0.5%–2.5% withdrawal fees | `P × 0.98 × (0.995 to 0.975)`; combined modeled deduction 2.49%–4.45%, before other method-specific costs |
| Steam Community Market | 5% Steam fee plus 10% CS2 fee, with minimums and per-fee rounding | If `P` is the buyer's total, seller credit is approximately `P / 1.15`; Steam Wallet credit is not withdrawable bank cash |

Selling fees, withdrawal costs, FX, and trade-protection waiting time are distinct. A default calculator input is a declared assumption, not an account-specific settlement quote.

Fee references checked on 2 November 2026: [Skinport's fee update](https://skinport.com/blog/lower-fees-for-everybody), [CSFloat's dated fee note](https://blog.csfloat.com/changes-to-fees-on-csgofloat-market/), and [Steam's Community Market FAQ](https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B).

## Five-Covert wear model: normalize, then map

For five compatible inputs, the declared mathematical model first normalizes each wear value within that finish's range, then maps the average onto the output range:

```text
Step 1:
n_i = (f_i − input_min_i) / (input_max_i − input_min_i)
n_avg = (n_1 + n_2 + n_3 + n_4 + n_5) / 5

Step 2:
output_float_model = output_min + n_avg × (output_max − output_min)

Reverse budget for a strict output target T:
sum(n_i) < 5 × (T − output_min) / (output_max − output_min)
```

Example: an output range of `0.00–0.40` with a target below `0.15` requires `n_avg < 0.375`, hence a five-input sum below `1.875`. Four normalized inputs of `0.20 + 0.30 + 0.40 + 0.50 = 1.40` leave the fifth input below `0.475`. For a fifth finish spanning `0.06–0.80`, the modeled actual-wear ceiling is:

```text
f_5 < 0.06 + 0.475 × (0.80 − 0.06) = 0.4115
```

Input/output compatibility is a separate condition. This is a reproducible calculator model, not Valve's unpublished implementation, an output-probability calculation, or a guarantee about game-side rounding.

## Dated anonymized telemetry: 2 November 2026

Both recap windows end at **07:00 UTC+8 on 2 November 2026**. The seven-day window begins on 26 October; the daily window begins on 1 November. Records #437 and #439 were published at 07:00:03 and 07:05:03 respectively.

| Record | Observed SOLD | Median observed lifetime | Listed-at minutes :00–:04 | Modeled post-fee spread |
|---|---:|---:|---:|---:|
| #439 — 7-day recap | 73/79 (92.4%) | 119.0 seconds | 50.6% | +$637.70 |
| #437 — 24-hour recap | 4/8 (50.0%) | 83.8 seconds | 87.5% | +$67.25 |

SOLD describes an observed marketplace listing status. It does not identify the buyer or establish a realized trading return. Modeled spreads are estimates under the stated assumptions. The :00–:04 column describes listing-time concentration, not a SOLD percentage or proof of an expiration mechanism. These aggregates do not establish an EU/US regional split.

## Repository contents

- [Calculator interface](index.html) and [application logic](app.js)
- [Mathematical functions](math.js)
- [Dated public telemetry](data/latest_telemetry.json)
- [Latest daily recap](latest_24h_recap.md)
- [Historical sample CSV](verified_snipes_sample.csv), retaining its original 21–22 October 2026 audit window

The production monitoring engine is outside this repository. This project is independent of Valve, Skinport, and CSFloat.

## MIT License

Copyright (c) 2026 Andrew

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
