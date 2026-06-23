# TabForge — Launch Plan

**Product:** TabForge — a fast, private tab session manager for Chrome
**Model:** Freemium — free (5 sessions), Pro $4.99 one-time
**Checkout:** https://buy.stripe.com/8x2eVe9Da7AZbxY21ObAs0g (live)
**Goal of launch:** First 100 installs and first 10 paying customers within 30 days.

---

## 0. Pre-launch checklist (do before posting anywhere)

- [x] All 77 automated checks passing (`node scratchpad/run-tests.mjs`)
- [x] `TabForge.zip` built and verified (10 files, MV3-clean)
- [x] Stripe payment link live (HTTP 200) and wired into both the popup and landing page
- [ ] Load `TabForge.zip` unpacked in Chrome and run the manual checklist in `test-results.md`
- [ ] Submit to Chrome Web Store (Productivity category) — allow 1–3 business days for review
- [ ] Host `landing.html` (Netlify/Vercel/GitHub Pages) at a real domain (e.g. tabforge.app)
- [ ] Host the privacy policy page (text in `store-listing.md`) and link it in the dashboard
- [ ] Configure the Stripe success page → instructions to unlock Pro
- [ ] Capture the 5 screenshots described in `store-listing.md`

> **Pro unlock note:** the current build flips Pro via a local `settings.pro` flag. For launch,
> the simplest honest flow is a Stripe **success-page** that delivers a short unlock code /
> instructions. A licensing API is the v1.1 follow-up — don't block launch on it.

---

## 1. Positioning & message

**One-liner:** "Save and restore your tabs in one click — private, fast, no account."

**Who it's for:** developers, researchers, students, and tab-hoarders who keep 30+ tabs and
lose their place when a window closes.

**The wedge vs. competitors:**
- *OneTab* dumps tabs into a list and feels dated → TabForge keeps **named sessions** with
  favicons and restores into a clean window.
- *Toby* is a heavy, account-required workspace → TabForge is **local-first, no sign-in, instant.**
- *Session Buddy* is powerful but cluttered → TabForge is **keyboard-first and minimal.**

**Proof points to lead with:** no account, no tracking, Manifest V3, one-time $4.99 (no subscription).

---

## 2. Launch channels — where to post, in what order

### Week 1 — soft launch (gather feedback, fix fast)
1. **Personal networks first.** Share with 5–10 developer friends; ask them to install the
   free tier and report one thing that confused them. Fix before the public push.
2. **r/chrome_extensions** and **r/chrome** — show-and-tell post (mods are lenient here).
3. **Indie Hackers** — "I built a tab manager" milestone post; engage in comments.

### Week 2 — public launch day
4. **Product Hunt** — the main event. Launch Tue–Thu, 12:01am PT. Prepare:
   - Tagline: "TabForge — save & restore your tabs in one click"
   - First comment: the maker story + the privacy angle + free tier link
   - 5 gallery images = the store screenshots
   - Line up 10–15 people to genuinely try it and comment on launch morning
5. **Hacker News** — "Show HN: TabForge – a private, local-first tab session manager".
   Post the landing page, not the store link. Be present in comments; HN rewards honesty
   about limitations (e.g. "Pro unlock is manual today; licensing API is next").
6. **X / Twitter + Mastodon + Bluesky** — use the threads already drafted in `social-posts.md`.
   Pin the launch tweet. Tag #buildinpublic #chromeextension.

### Week 3–4 — sustained / niche
7. **Subreddits by use-case:** r/webdev, r/productivity, r/datascience, r/programming
   (only where self-promo is allowed; otherwise answer "how do you manage tabs?" threads).
8. **Dev communities:** relevant Discord/Slack groups, Lobsters, dev.to article
   ("How I built a Manifest V3 tab manager — and what MV3's ephemeral workers taught me").
9. **Direct outreach:** email 5–10 productivity newsletters / YouTubers who cover extensions.

---

## 3. What to say (channel-tuned hooks)

**Product Hunt tagline**
> Save & restore your browser tabs in one click. Private, local-first, no account.

**Hacker News (Show HN) opener**
> I kept losing 30-tab research windows to accidental closes, so I built TabForge: save the
> current window as a named session, restore it into a fresh window later. It's Manifest V3,
> stores everything locally (no account, no tracking), and is keyboard-first
> (Ctrl+Shift+S / Ctrl+Shift+R). Free for 5 sessions; Pro is a one-time $4.99. Happy to talk
> about the MV3 service-worker quirks — auto-save had to move from setInterval to chrome.alarms
> because workers get killed.

**Reddit show-and-tell**
> Made a clean, fast tab session manager — no login, no cloud, your tabs never leave your
> machine. Free tier is genuinely useful (5 sessions + auto-save). Would love feedback on what
> to build next.

**X launch tweet**
> Tab chaos → solved. ⚒
> TabForge saves your open tabs as named sessions and restores them in one click.
> • No account
> • No tracking
> • Keyboard shortcuts
> • $4.99 one-time for unlimited
> Free on the Chrome Web Store 👇

(More copy and full threads in `social-posts.md`.)

---

## 4. Pricing & monetization mechanics

- **Free:** 5 sessions, 15-min auto-save floor — generous enough to build a habit.
- **Pro:** **$4.99 one-time** via Stripe payment link (no subscription = lower friction,
  higher conversion for a utility). Live link verified returning HTTP 200.
- **Conversion triggers already built in:** the upgrade prompt fires when a free user hits the
  6th manual save, and when they try to set an auto-save interval below 15 min.
- **Funnel:** landing page CTA → Stripe → success page (unlock instructions). The extension's
  in-popup "Upgrade · $4.99" button opens the same Stripe link.

**Targets:** ~3–5% free→Pro is realistic for a useful utility. 100 installs → ~3–5 sales in
month one; the flywheel is store ranking + word of mouth, not paid ads.

---

## 5. Metrics to watch

| Metric | Where | Target (30d) |
|--------|-------|--------------|
| Installs | Chrome Web Store dashboard | 100 |
| Weekly active | Store dashboard | 40% of installs |
| Pro sales | Stripe dashboard | 10 |
| Store rating | Store listing | ≥ 4.5 ⭐ |
| Refund rate | Stripe | < 5% |

Review the store listing weekly; reply to **every** review (especially negative ones — it's
the strongest ranking and trust signal for a new extension).

---

## 6. Risks & mitigations

- **Store review rejection** → permission justifications are pre-written in `store-listing.md`;
  single-purpose and no-remote-code keep risk low.
- **"Pro unlock is manual"** → be upfront; ship the licensing API as v1.1 within 2 weeks.
- **Low launch-day traffic** → don't rely on one channel; the PH + HN + Reddit + social stack
  above is intentionally diversified.
- **Copycats** → moat is speed of iteration: ship cloud sync and tab grouping (already
  scaffolded in the code) within the first month.

---

## 7. First two weeks after launch — roadmap signal

Telling users what's next converts skeptics. Publicly commit to:
1. **License-key Pro unlock** (replace manual flow) — week 1–2.
2. **Tab grouping with colors** (helper already in `utils.js`) — week 3.
3. **Duplicate-tab detection** (`dedupeTabs` already shipped, surface it in UI) — week 3–4.
4. **Cloud sync** — the headline Pro feature, month 2.
