# 📊 24-Hour Skinport Live Microstructure & Snipe Telemetry Report

* **Audit Window:** 2026-10-21 10:46:20 to 2026-10-22 10:46:20 UTC+8 (24.0 Hours + 15m SOLD Tail)
* **Pricing Engine:** `pricing_model=4` (Penetrating baseline + accessory/float overpay validation)
* **Raw Archive Integrity:** 4,985 WebSocket `saleFeed` frames (`errors=0`, `dropped=0`, SHA-256 verified)
* **📡 Free 15-Min Delayed Web Stream (No Login):** [https://t.me/s/cs2_snipe_radar_free](https://t.me/s/cs2_snipe_radar_free)
* **⚡ 0-Second Real-Time VIP Feed (40-Seat Cap):** [https://whop.com/snipe-radar/](https://whop.com/snipe-radar/)

---

## 1. 24-Hour Ingestion & Filtering Funnel

| Pipeline Stage | Count | Share of Listed | Microstructure Notes |
| :--- | :--- | :--- | :--- |
| **Total Live Listings Scanned** | **13,649** | 100.00% | 13,489 unique episodes + 160 repeat observations |
| **Rejected: `no_benchmark` (`7d_vol < 5` or ratio bounds)** | **7,848** | 57.50% | Filtered out illiquid / manipulated niche skins |
| **Skipped: `already_sold` prior to valuation** | **303** | 2.22% | Instant clearing events prior to frame evaluation |
| **Entered `matched` Real-Time Valuation** | **5,498** | 40.28% | Market-wide median ROI across matched asks: **-12.65%** |
| **Rejected: Failed Cash Gates (`Net < $2.50` or `ROI < 6.0%`)** | **5,484** | 40.18% | Eliminated negative-spread asks & penny-skin noise |
| **Accepted Hits (Verified Liquid Undercuts)** | **14** | **0.10%** | Passed all liquidity, sanity, and post-fee profit gates |

---

## 2. Clearing Velocity & Session Breakdown

* **Full 24h Verified Sold Rate:** **85.71% (12 / 14 Sold)** — 71.4% (10/14) cleared within 15 minutes; 50.0% (7/14) sniped in under 2 minutes.
* **EU/US Prime Night Session (22:00–07:30 UTC+8):** **100.00% Sold (6 / 6)** — 5/6 cleared within 15 minutes.
* **Median Time-to-Fill (Survival Time):** **55.11 seconds** from VIP alert dispatch (**56.93 seconds** from initial WebSocket `LISTED` frame).
* **Hourly Top-of-Hour Pulse:** **80.0%–89.7%** of qualified undercuts occurred within the first 5 minutes of each hour (`:00–:04`) due to trade-lock expiration batching.
* **Cumulative Verified Net Spread (Sold Hits, Audited):** **$179.87 USD** across verified sold hits (excluding 1 upstream payload anomaly where a sticker was nested inside the `charms` array).

---

## 3. Case Study: Seller Capitulation Trajectory (`★ Butterfly Knife | Tiger Tooth FN`)

Tracking multi-step repricing on high-tier liquid knives before the market clears the undercut:
1. **03:02 UTC+8:** Listed at `$978.61` -> Rejected by `pricing_model=4` (insufficient net margin after fees).
2. **04:06 UTC+8:** Seller cut price to `$941.51` -> Rejected by `pricing_model=4` (below 6.0% net ROI threshold).
3. **07:46:23 UTC+8:** Seller capitulated and slashed price a 3rd time to **`$891.43`** against a **`$1,025.23`** penetrating benchmark -> **Alert Fired (`+$94.84` Net Profit / `+10.64%` Net ROI)** -> **SOLD in 44.8 seconds**.

---

## 4. Complete 24-Hour Accepted Hits Log (Desensitized)

| Timestamp (UTC+8) | Item Name | Listed (USD) | Benchmark (USD) | Est. Net Profit (USD) | Net ROI | Time-to-Fill (VIP) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-10-21 11:02:48 | ★ Nomad Knife \| Forest DDPAT (Field-Tested) | $60.41 | $68.06 | +$5.06 | +8.38% | **29.5s** | ✅ SOLD |
| 2026-10-21 13:03:05 | StatTrak™ AWP \| Printstream (Minimal Wear) | $95.96 | $112.79 | +$12.58 | +13.11% | **56.3s** | ✅ SOLD |
| 2026-10-21 16:02:38 | Sir Bloody Miami Darryl \| The Professionals | $60.00 | $66.37 | +$3.84 | +6.41% | **33.1s** | ✅ SOLD |
| 2026-10-21 18:20:38 | ★ Gut Knife \| Autotronic (Field-Tested) | $79.12 | $87.58 | +$5.13 | +6.49% | — | ⏳ Unsold in window |
| 2026-10-21 20:51:25 | ★ Sport Gloves \| Vice (Minimal Wear) | $1,080.00 | $1,232.93 | +$106.08 | +9.82% | — | ⏳ Unsold in window |
| 2026-10-21 23:02:44 | Glock-18 \| Fully Tuned (Field-Tested) | $43.20 | $47.66 | +$2.65 | +6.13% | **2188.6s** | ✅ SOLD |
| 2026-10-22 03:04:22 | ★ Nomad Knife \| Crimson Web (Field-Tested) | $125.56 | $138.88 | +$8.04 | +6.40% | **46.8s** | ✅ SOLD |
| 2026-10-22 04:04:16 | ★ Specialist Gloves \| Big Swell (Field-Tested) | $151.78 | $167.88 | +$9.72 | +6.40% | **547.8s** | ✅ SOLD |
| 2026-10-22 05:03:26 | ★ Hand Wraps \| Duct Tape (Minimal Wear) | $48.81 | $53.98 | +$3.12 | +6.39% | **54.0s** | ✅ SOLD |
| 2026-10-22 07:06:14 | ★ Driver Gloves \| Imperial Plaid (Minimal Wear) | $247.37 | $281.03 | +$22.98 | +9.29% | **150.9s** | ✅ SOLD |
| 2026-10-22 07:46:23 | ★ Butterfly Knife \| Tiger Tooth (Factory New) | $891.43 | $1,025.23 | +$94.84 | +10.64% | **44.8s** | ✅ SOLD |
| 2026-10-22 08:03:03 | ★ Sport Gloves \| Vice (Battle-Scarred) | $220.15 | $243.51 | +$14.10 | +6.41% | **8201.7s** | ✅ SOLD |
| 2026-10-22 10:02:35 | ★ Ursus Knife \| Ultraviolet (Field-Tested) | $41.35 | $46.04 | +$2.94 | +7.10% | **158.7s** | ✅ SOLD |
| 2026-10-22 06:03:00 | Desert Eagle \| Printstream (Factory New) *[Audit Excluded]* | $66.02 | $60.13 | *Anomaly* | *Anomaly* | **53.6s** | ⚠️ Sticker-in-Charms Bug (Fixed) |
