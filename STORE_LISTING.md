# Unfold AI — Chrome Web Store Submission Guide

> Follow these steps in the Chrome Web Store Developer Console.
> All text fields below are ready to copy-paste.

---

## Step 1: Add New Item

1. Click **"Items"** in the left sidebar
2. Click the **"+ New item"** button (top right)
3. Upload the zip file: `dist/layered-ai-reader-v1.0.0.zip`
   - Located at: `/Users/equinox/Documents/GitHub New/AI Layered Reader Extension/dist/layered-ai-reader-v1.0.0.zip`

---

## Step 2: Store Listing Tab

### Language
English

### Extension Name
```
Unfold AI — Layered Reading for AI Responses
```

### Short Description (132 chars max)
```
Read AI answers at your pace. Get a summary first, then reveal content section by section. Works on ChatGPT, Claude, Gemini & more.
```

### Detailed Description
```
Stop drowning in walls of AI text. Unfold AI gives you control over how much you read at a time.

HOW IT WORKS
When an AI assistant generates a long response, Unfold AI automatically:
  1. Shows you the bottom line — a one-sentence summary of the full answer
  2. Highlights key points — the most important takeaways at a glance
  3. Lets you reveal more — click "Show next" to unfold content section by section

You stay in control. Read the summary, skim the key points, and dive deeper only when you need to.

WORKS EVERYWHERE YOU USE AI
  • ChatGPT (chatgpt.com)
  • Claude (claude.ai)
  • Google Gemini (gemini.google.com)
  • Grok (grok.com & x.com/i/grok)
  • Perplexity (perplexity.ai)
  • DeepSeek (chat.deepseek.com)
  • Manus (manus.im)

WHY YOU'LL LOVE IT
  • Instant activation — works mid-stream while the AI is still typing
  • Progress tracking — see "Section 2 of 5" so you know how much is left
  • Step back — go back a section if you want to re-read something
  • Keyboard shortcuts — navigate with Cmd/Ctrl + arrow keys
  • Customizable — adjust words per section, activation threshold, and reading preset
  • Beautiful UI — clean, premium design that matches dark and light modes
  • 100% private — zero data collection, everything stays in your browser

READING PRESETS
  • Quick Scan — compact chunks for skimming
  • Standard — balanced sections for everyday reading
  • Deep Dive — larger chunks for thorough reading

DESIGNED FOR POWER USERS
Unfold AI is for anyone who uses AI assistants daily and is tired of scrolling through massive responses to find the one paragraph they need. It works like a smart table of contents — showing you the structure of the answer so you can jump to what matters.

COMPLETELY FREE & OPEN SOURCE
No accounts. No tracking. No premium tiers. Your data never leaves your browser.
```

### Category
```
Productivity
```

### Additional Category (optional)
```
Developer Tools
```

---

## Step 3: Graphic Assets

### Extension Icon
Already included in the zip — the store will read it from the manifest.

### Screenshots (1280x800 or 640x400)
You need **at least 1 screenshot**, recommended **3-5**.

**Screenshot ideas to capture:**
1. **ChatGPT with Unfold AI active** — show the summary header + "Show next" button over a long ChatGPT response
2. **Claude with sections revealed** — show progress indicator "2 of 5" with a partially unfolded response
3. **The popup settings panel** — show the clean settings UI with provider toggles
4. **Before/After comparison** — show a wall of text vs. the clean layered view
5. **Dark mode** — show it working beautifully in dark mode

> Tip: Load the extension locally (chrome://extensions → Load unpacked → select `dist/` folder), ask ChatGPT or Claude a long question, then capture screenshots at 1280x800.

### Small Promo Tile (440x280) — Optional but recommended
Create a simple graphic with:
- "Unfold AI" text
- Tagline: "Read AI output at your pace"
- Blue gradient background matching the extension's design language

### Large Promo Tile (1400x560) — Optional
Same branding, wider format.

---

## Step 4: Privacy Tab

### Single Purpose Description
```
This extension enhances the reading experience on AI assistant websites by automatically summarizing long responses and providing progressive reveal controls, allowing users to read AI output at their own pace.
```

### Permission Justifications

**storage**
```
Stores user preferences (reading preset, activation threshold, enabled providers) locally in the browser. No data is transmitted externally.
```

**Host permissions (chatgpt.com, claude.ai, gemini.google.com, etc.)**
```
Required to inject the reading enhancement interface (summary header and reveal controls) into AI assistant response pages. The extension reads page content solely to generate local summaries and section breaks. No page content is collected or transmitted.
```

### Data Usage Disclosures
- **Does not collect personally identifiable information**: YES (check this)
- **Does not collect health information**: YES
- **Does not collect financial information**: YES
- **Does not collect authentication information**: YES
- **Does not collect personal communications**: YES
- **Does not collect location data**: YES
- **Does not collect web history**: YES
- **Does not collect user activity**: YES

Select: **"I do not collect or use any user data"**

### Privacy Policy URL
```
chrome-extension://[YOUR_EXTENSION_ID]/privacy.html
```
> Note: After the extension is published, you can use the extension's own privacy page, or host the privacy policy on a GitHub Pages URL if the store requires an external URL.

---

## Step 5: Distribution Tab

### Visibility
- Select: **Public**

### Distribution
- Select: **All regions**

### Pricing
- Select: **Free**

---

## Step 6: Review & Submit

1. Review all tabs for completeness (green checkmarks)
2. Click **"Submit for review"**
3. Google typically reviews within 1-3 business days

---

## After Approval — Firefox AMO Submission

The Firefox package is ready at:
`/Users/equinox/Documents/GitHub New/AI Layered Reader Extension/unfold-ai-firefox-v1.0.0.zip`

Submit at: https://addons.mozilla.org/developers/addon/submit/

Use the same description and screenshots adapted for Firefox.
