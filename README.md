# CS2 Cross-Market Spread & Liquidity Telemetry (`cs2-ticker`)
[![Live Web Feed](https://img.shields.io/badge/📡_Live_Web_Feed_(15m_Delay)-t.me%2Fs%2Fcs2__snipe__radar__free-2CA5E0?style=for-the-badge)](https://t.me/s/cs2_snipe_radar_free)
[![0-Second VIP Access](https://img.shields.io/badge/⚡_0s_Real--Time_VIP_Feed-Whop_Marketplace-FF5722?style=for-the-badge)](https://whop.com/snipe-radar/vip-0-second-real-time-alerts)
[![24h Verified Sold Rate](https://img.shields.io/badge/24h_Verified_Sold_Rate-85.7%25_(100%25_EU%2FUS_Night)-10B981?style=for-the-badge)](./latest_24h_recap.md)
[![Median Survival Time](https://img.shields.io/badge/Median_Time--to--Fill-55.11s-8B5CF6?style=for-the-badge)](./latest_24h_recap.md)
Lightweight Python `asyncio` ingestion engine tracking real-time CS2 skin undercuts, applied sticker/charm overpay, and exact survival times (`time-to-fill`) across **Skinport** and **CSFloat**.

---

## 📡 Live Alert Streams & Public Access

Because my own rotation capital is focused strictly on liquid $20–$200 playskins, ~95% of the anomalies this engine catches across other price tiers, knives/gloves, and sticker/charm crafts go unused by me.

### 1. Free 15-Minute Delayed Alert Feed (100% Free, Zero Ads)
Pipes out raw text alerts for >6% net fee-adjusted undercuts alongside exact `time-to-fill` survival seconds with a 15-minute delay. Choose whichever way is easiest for you:
* 🌐 **Instant Browser Preview (No Telegram login/app needed):** [https://t.me/s/cs2_snipe_radar_free](https://t.me/s/cs2_snipe_radar_free)
* 📱 **Open in Telegram App:** [https://t.me/cs2_snipe_radar_free](https://t.me/cs2_snipe_radar_free) *(or search `@cs2_snipe_radar_free` in Telegram)*
* 🎟️ **Claim via Whop Marketplace (Free Tier):** [https://whop.com/snipe-radar/free-15m-delayed-telegram-feed](https://whop.com/snipe-radar/free-15m-delayed-telegram-feed)

### 2. Unthrottled 0-Second Real-Time WebSocket Stream (VIP)
For active traders who need the raw **0-second latency** alerts (direct Skinport single-item checkout links before listings get sniped on the live feed). Capped at 40 seats per pod to prevent self-competition.
* ⚡ **0-Second Real-Time VIP Access (Whop):** [https://whop.com/snipe-radar/vip-0-second-real-time-alerts](https://whop.com/snipe-radar/vip-0-second-real-time-alerts)

---

## 🛠️ How the Filtering Engine Works (Zero "Paper Profit" Noise)

Raw discount percentages on cash marketplaces are 90% noise unless manipulation and illiquid traps are stripped out at the JSON level before alerting:

1. **Strict Liquidity & Manipulation Floor**: Automatically drops any item with `< 5` sales in the last 7 days (`sold_7d_vol < 5`), strips out manipulated StatTrak WW/BS knives, and enforces a monotonicity cap so thin WW/BS listings are never valued above `95%` of the FT floor.
2. **Falling Knife Circuit Breaker**: If an item's 7-day rolling median drops more than `15%` below its 30-day median (`median_7d / median_30d < 0.85`, common during new Armory or case releases), alerts are muted so you don't catch a falling knife into a 7-day trade lock.
3. **Phase-Specific Doppler & Accessory Valuation**:
   * Splits Doppler / Gamma Doppler pricing strictly by `version` and `paint_index` (Ruby/Sapphire/Emerald sales never skew Phase 1–4 baselines).
   * Evaluates applied stickers by weapon slot visibility and scrape wear.
   * Flags underpriced rifles carrying high-tier **Charms** (since CS2 charms can be detached with a $0.99 pack and sold separately for ~85% cash value after fees).
4. **System Footprint**: Single-process 3-coroutine architecture (`curl_cffi` Brotli stream decompression + SQLite WAL persistence + tuple-packed RAM cache running under 140 MiB RAM).
---

## 📊 Latest 24-Hour Production Telemetry Snapshot (Verified Sold Log)

Out of **13,649** live Skinport listings ingested over a fixed 24-hour audit window (`pricing_model=4`), **99.90%** were rejected as illiquid or fee-negative noise, leaving **14 verified liquid undercuts** (**85.71% sold overall; 100.00% sold during the EU/US night session** with a median survival time of **55.11s**).

* 📄 **Full 24h Funnel & Case Study Report:** [`latest_24h_recap.md`](./latest_24h_recap.md)
* 🗂️ **Raw Desensitized Hit Dataset (CSV):** [`verified_snipes_sample.csv`](./verified_snipes_sample.csv)

| Item Name | Listed (USD) | Benchmark (USD) | Net Profit (Post-Fees) | Net ROI | Survival Time (Time-to-Fill) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **★ Butterfly Knife \| Tiger Tooth (FN)** *(3x Price Cut)* | **$891.43** | $1,025.23 | **+$94.84** | **+10.64%** | **44.8s** | ✅ SOLD |
| **★ Driver Gloves \| Imperial Plaid (MW)** | **$247.37** | $281.03 | **+$22.98** | **+9.29%** | **150.9s** | ✅ SOLD |
| **StatTrak™ AWP \| Printstream (MW)** | **$95.96** | $112.79 | **+$12.58** | **+13.11%** | **56.3s** | ✅ SOLD |
| **★ Specialist Gloves \| Big Swell (FT)** | **$151.78** | $167.88 | **+$9.72** | **+6.40%** | **547.8s** | ✅ SOLD |
| **★ Nomad Knife \| Crimson Web (FT)** | **$125.56** | $138.88 | **+$8.04** | **+6.40%** | **46.8s** | ✅ SOLD |
| **★ Nomad Knife \| Forest DDPAT (FT)** | **$60.41** | $68.06 | **+$5.06** | **+8.38%** | **29.5s** | ✅ SOLD |
