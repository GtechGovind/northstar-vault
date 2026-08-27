# Social demo post — published 28 August 2026

The replacement text below was saved to the existing post after explicit owner approval: https://www.linkedin.com/feed/update/urn:li:activity:7498550271413809152/ . Its existing media and URL were preserved. The published page was checked for Gemini Developer API, the pinned Secret Manager credential, the blog-demo link and the required hashtag.

---

I built **Northstar Vault** for the Gen AI Academy APAC Ideathon: a privacy-first Gemini decision journal that turns a tangled reflection into a transparent Signal Map—facts, assumptions, tensions, options, an honest counterpoint, and one testable 48-hour experiment.

The part I care about most is trust. Northstar helps people choose; it never pretends to decide for them.

What makes it production-minded:

- Firebase Google Sign-In with server-side token verification
- user-isolated Firestore histories with owner-only reads and server-only writes
- Gemini Developer API with a pinned Secret Manager credential, used only on Cloud Run
- structured output validation and prompt-injection boundaries
- multi-turn context, export, erasure, rate limits, CSP, and health checks
- a documented five-zone threat model
- an AI Studio-generated Privacy Receipt: SHA-256 of the exact exported file, computed locally with no journal text or IDs in the receipt

The Gemini/Secret Manager release is live. Real multi-turn replies persist after reload, 36 automated checks pass, and the dependency audit reports no known vulnerabilities. Original AI Studio output and reviewed integration changes are preserved in the repository. A receipt is an integrity fingerprint—not proof of erasure, encryption or authenticity. Automated security tests use synthetic emulator identities.

Blog demo and walkthrough: https://github.com/GtechGovind/northstar-vault/blob/main/docs/meet-the-builders.md#demo-walkthrough-current-release

Live prototype: https://northstar-vault-546899882968.asia-south1.run.app

Code: https://github.com/GtechGovind/northstar-vault

#AccelerateAIwithCloudRun #Gemini #GoogleCloud #Firebase #CloudRun #BuildInPublic

---

## Publication checklist

- Public repository link resolves without sign-in.
- Live prototype opens from the post.
- The public blog link includes a step-by-step Northstar demo, not only a screenshot.
- Existing screenshot/media is preserved; any historical Vertex wording in the image is superseded by the dated release text.
- `#AccelerateAIwithCloudRun` appears exactly as written.
- The same published-post URL is saved in the corrected Ideathon submission.
