# CS2 Cross-Market Spread & Liquidity Telemetry (`cs2-ticker`)

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
