# Tekton AI Assistant — setup guide

The chat button ("Ask Tekton AI") is already live on both pages. It is currently in
`off` mode, so it greets visitors politely and shows your phone and WhatsApp buttons
instead of answering. Follow the steps below to switch on Gemini.

**Files involved**

| File | What it is |
|---|---|
| `chat-config.js` | The only file you normally edit — mode, URL/key, greeting, persona |
| `chat.js` | The chat widget itself. No editing needed. |
| `apps-script-gemini-proxy.gs` | Code to paste into Google Apps Script (recommended route) |

---

## Step 1 — Get a Gemini API key

1. Go to https://aistudio.google.com/apikey and sign in with your Google account.
2. Click **Create API key**, choose a Google Cloud project (or let it create one).
3. Copy the key. Treat it like a password.

Free tier is enough for testing. For a live public website, enable billing on that
Cloud project so the assistant does not stop when the free quota is used up.

---

## Step 2 — Choose how the site reaches Gemini

### Option A — Apps Script proxy (recommended, key stays private)

Anything placed in a website's JavaScript can be read by any visitor. A proxy keeps
the key on Google's server. You already use Apps Script for the designer leads, so
this is the same pattern.

1. Open https://script.google.com and click **New project**.
2. Delete the sample code, then paste the whole of `apps-script-gemini-proxy.gs`.
3. Click the gear icon (**Project Settings**) → scroll to **Script Properties** →
   **Add script property**:
   - Property: `GEMINI_API_KEY`
   - Value: your key from Step 1
   - Save.
4. Click **Deploy → New deployment**. Choose type **Web app**, then set:
   - Description: `Tekton Gemini proxy`
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy**, authorise the script when Google asks, and copy the
   **Web app URL** (it ends with `/exec`).
6. Paste that URL into the browser. You should see
   `{"status":"Tekton Gemini proxy running","keyConfigured":true}`.
7. Open `chat-config.js` and set:

```js
mode: 'proxy',
proxyUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```

Whenever you edit the Apps Script afterwards, go to
**Deploy → Manage deployments → pencil icon → Version: New version → Deploy**,
otherwise the old code keeps running.

### Option B — Direct from the browser (testing only)

```js
mode: 'direct',
apiKey: 'AIza...your key...',
```

This works immediately with no Apps Script, but the key is visible to anyone who
views the page source, and they can spend your quota. Use it only while testing on
your own machine, then switch to Option A before going live.

---

## Step 3 — Adjust the wording (optional)

Everything the assistant says is in `chat-config.js`:

- `greeting` — the first message the visitor sees
- `suggestions` — the four starter buttons
- `systemPrompt` — the persona, the politeness rules, the honesty rules and all
  company facts. If you add a product or change a phone number, change it here.
- `offlineMessage` — shown if Gemini cannot be reached

If you use Option A, edit the same `SYSTEM_PROMPT` inside the Apps Script too —
the server copy is the one that actually reaches Gemini.

---

## What the assistant is instructed to do

- Stay courteous, calm and professional; apologise first if a visitor is upset
- Reply in the visitor's own language, including Tamil
- Never quote a price or a delivery date — it offers a free site survey and a
  written quotation instead
- Never invent specifications, certifications or client names
- Never give lift repair or door-opening instructions; it directs the visitor to
  your service team
- On any report of a person trapped in a lift, it tells them to call
  +91 89254 48131 immediately and not to force the doors
- Politely decline anything unrelated to Tekton and lifts

---

## Recommended safeguards before going public

1. **Restrict the key.** In Google Cloud Console → APIs & Services → Credentials →
   your key → restrict it to the **Generative Language API**. With the proxy you can
   also leave it unrestricted by referrer, since the browser never sees it.
2. **Set a budget alert** on the Cloud project so usage cannot surprise you.
3. **Keep the disclaimer** at the bottom of the chat window — it tells visitors to
   confirm technical details and pricing with your engineers.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Assistant always shows the "being set up" message | `mode` is still `'off'`, or `proxyUrl` / `apiKey` is blank |
| Same message after configuring the proxy | Open the `/exec` URL directly. If `keyConfigured` is `false`, the script property name is wrong — it must be exactly `GEMINI_API_KEY` |
| Worked, then stopped | Free quota exhausted, or you edited the Apps Script without deploying a **new version** |
| "Anyone with the link" warning during deploy | Expected. The script only accepts chat messages and never returns your key |


## Step 4 — Connect customer enquiries to Google Sheets

The updated shared chat includes a **Get a quote** form. It sends the visitor name, mobile, email, city, requirement, page URL and recent chat context to the same Apps Script endpoint. The existing Lift Designer lead form continues to use the same endpoint.

In the Apps Script project, add these Script Properties:

- `GEMINI_API_KEY` — your Gemini API key.
- `LEAD_SPREADSHEET_ID` — the ID from your Google Sheet URL.
- `LEAD_SHEET_NAME` — optional; use `CRM_Leads` if you want the default.

The script creates the sheet tab and header row automatically if they do not already exist. After changing the Apps Script, deploy a **new version** of the existing Web App. The Web App URL can remain the same.

The website now uses the same Tekton AI chat widget on both `index.html` and `designer.html`, and the designer canvas places the Tekton logo inside the cabin floor without covering the dimension labels.
