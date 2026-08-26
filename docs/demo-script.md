# 90-second demo storyboard

The strongest demo is a story, not a feature tour. Record at 1080p, keep the cursor calm, and use captions.

## 0–08s — the problem

**Visual:** Landing page hero and Signal Map preview.

**Voiceover:** “Journaling captures thoughts. Northstar Vault goes one step further: it turns a tangled decision into evidence, options, and one small experiment—without giving up privacy.”

## 08–20s — authentication and private boundary

**Visual:** Sign in with Google, then briefly show the empty vault.

**Voiceover:** “Firebase Google Sign-In creates the identity boundary. Every private request is verified on Cloud Run, and every Firestore path is derived from that verified user—not from the browser.”

## 20–48s — the winning interaction

**Visual:** Paste the demo reflection below. Show the warm multi-turn reply and then pan to the populated Signal Map.

**Demo reflection:**

> I promised my team we would launch Friday, but two onboarding screens are still rough. Three pilot users completed the core flow, yet I keep delaying because I’m worried one bad first impression will damage trust. I can either launch quietly, delay another week, or cut the unfinished screens. Help me see what I know versus what I’m assuming.

**Voiceover:** “Gemini returns a structured, bounded response. Northstar separates observed facts from assumptions, surfaces the real tension, offers an honest counterpoint, and proposes a 48-hour experiment. It helps me choose—it never commands me.”

## 48–64s — multi-turn value

**Visual:** Ask: “Make the experiment specific enough that I can send it to the team today.” Show the refined answer and saved history.

**Voiceover:** “The conversation is multi-turn and persists privately. The model receives only a bounded recent context, so the experience stays responsive and predictable.”

## 64–80s — security as a product feature

**Visual:** Open Privacy Center, show export controls, then cut to the repository threat model and Firestore rules.

**Voiceover:** “Security is visible and testable: owner-bound Firestore rules, Firebase token verification, a deny-by-default data model, strict schemas, rate limits, CSP headers, export and erasure. Cloud Run calls Vertex AI with its least-privilege service identity, so no Gemini key reaches the browser.”

## 80–90s — close

**Visual:** Return to the hero, then show the Cloud Run service URL and green health response.

**Voiceover:** “Northstar Vault: private clarity, practical next steps—built with Firebase, Firestore, Gemini on Vertex AI, and Cloud Run.”

On-screen end card: `#AccelerateAIwithCloudRun`

## Suggested social post

I built **Northstar Vault** for the Gen AI Academy APAC Ideathon—a privacy-first Gemini decision journal that turns tangled reflections into facts, assumptions, options, an honest counterpoint, and one testable 48-hour experiment.

What makes it production-minded:

- Firebase Google Sign-In with server-side ID-token verification
- user-isolated Firestore paths and deny-by-default rules
- Gemini structured output with validation and prompt-injection boundaries
- keyless Vertex AI access through the Cloud Run service account
- export, erasure, rate limits, CSP headers, health checks, and a five-zone threat model

The most important design choice: Northstar helps people choose; it never pretends to decide for them.

Built on Cloud Run with Firebase, Firestore, and Gemini on Vertex AI.

#AccelerateAIwithCloudRun #Gemini #GoogleCloud #Firebase #CloudRun #BuildInPublic
