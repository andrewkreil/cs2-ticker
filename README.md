# CS2 Skinport Telemetry & Free Calculators

[Open the free calculators and dated feed](https://andrewkreil.github.io/cs2-ticker/) · [Join the free 15-minute Discord feed](https://discord.gg/XVgpjRRxK6) · [VIP alerts — $19.99/month](https://whop.com/snipe-radar/vip-0-second-real-time-alerts)

Snipe Radar monitors Skinport listing discounts for knives, gloves and mainstream weapon skins, using official seven-day sale medians as one valuation input. It also estimates wear premiums for 30 selected finishes. The public website provides a cross-platform fee calculator and a reverse float-budget calculator. These are separate capabilities: the website's float calculator is not evidence of a production trade-up combination or low-price filler scanner.

## Free tools and feed

- **Cashout and buy-limit calculator:** edit sale fees, payout/FX assumptions and trade-lock scenarios to estimate spread, ROI and a maximum buy price. A default is an assumption, not your account's confirmed payout fee.
- **Normalized float-budget calculator:** calculate the remaining average input float under the declared model and output range. Item eligibility, output probabilities and the game's internal rounding need separate verification.
- **Free Discord feed:** Skinport alerts with a 15-minute intentional publishing delay, observed SOLD updates and a daily recap. [Join here](https://discord.gg/XVgpjRRxK6).
- **VIP:** $19.99/month direct subscription, with no intentional publishing delay and direct Skinport listing links. Processing and network time still apply. The current offer does not include a $0 or $1.99 VIP trial; the separate delayed feed remains free. Capacity is 40 seats per pod; current availability and subscription terms are shown on Whop.

The free calculators require no Steam login. Subscription purchase and Discord access have their own account requirements.

## Public evidence

- [Latest official channel recap](latest_24h_recap.md): includes its publication time and observation window.
- [Dated telemetry JSON](data/latest_telemetry.json): a sanitized public snapshot, not an authenticated trading account.
- [Fixed historical sample CSV](verified_snipes_sample.csv): retains its original 21–22 October 2026 audit window; it is not today's complete signal inventory.

SOLD means a marketplace sale was observed. It does not identify the buyer or prove a subscriber's purchase, resale or profit. Survival time is an observed interval, not a guaranteed execution latency. Estimated spreads and ROI are after the stated fee assumptions and before tax; the Model 4 recovery factor is a modeling assumption, not a universal marketplace cashout rate.

The website's approximately $240/month per-seat figure is a dated, hypothetical allocation of modeled spread at the sampled weekly pace. It is not an observed member return, a payout pool or a profit guarantee. The method and lower comparison sample are disclosed on the [website](https://andrewkreil.github.io/cs2-ticker/#sources). Shared alerts do not assign listings to members, and additional pods do not create new market opportunities.

## Repository scope

This repository publishes the static website, calculator source, public telemetry and selected audit samples. The production monitoring engine is not published here. Live market monitoring currently uses Skinport; a comparison calculator does not imply a live CSFloat or all-market scanning backend.

Independent of Valve, Skinport and CSFloat. Marketplace rules, fees, availability and execution conditions can change.
