# Northstar Vault

> Private clarity. Practical next steps.

Northstar Vault is a production-minded Gemini decision journal built for the Gen AI Academy APAC Cloud Run Ideathon. It turns an unstructured reflection into a transparent **Signal Map**: observed facts, possible assumptions, competing tensions, reasonable options, an honest counterpoint, and one testable 48-hour experiment.

The starter challenge asks for a journal. Northstar Vault adds an opinionated decision-support workflow, visible trust controls, structured AI output, complete data export/erasure, adversarial prompt boundaries, and a polished responsive experience.

## Why it stands out

- **Authenticity:** a distinct “Signal Map” interaction rather than a reskinned chat template.
- **Usability:** Google SSO, quick-start prompts, multi-turn reflections, history, responsive design, keyboard shortcut, and plain-language errors.
- **Stability:** bounded reads, strict schemas, rate limits, structured-output normalization, health endpoint, safe failure states, and container checks.
- **Security:** Firebase token verification, per-user Firestore paths, deny-by-default rules, CSP/security headers, keyless Vertex AI access, least-privilege deployment, export, and erasure.

## Architecture

```text
Browser
  ├─ Firebase Google Sign-In
  └─ HTTPS + Firebase ID token
          ↓
Cloud Run / Express
  ├─ Verify ID token (Firebase Admin)
  ├─ Validate + rate-limit
  ├─ Read/write users/{verified uid}/...
  └─ Keyless service-account call to Vertex AI
          ↓                         ↓
Cloud Firestore                Gemini on Vertex AI
```

The browser never receives AI credentials and never chooses a Firestore user path. See [the threat model](docs/threat-model.md) and [AI Studio constitution](docs/AI_STUDIO_CUSTOM_INSTRUCTIONS.md).

## Prerequisites

- Google Cloud project with billing enabled
- Firebase added to that project
- Google Sign-In enabled in Firebase Authentication
- Firestore Native database
- Vertex AI API enabled in the Google Cloud project
- `gcloud`, `firebase-tools`, and Node.js 20+

## Local development

Application Default Credentials are used by Firebase Admin:

```bash
gcloud auth application-default login
cp .env.example .env
npm ci
set -a && source .env && set +a
npm run dev
```

Do not put a real `.env` file or service-account key in Git. For team development, use user ADC.

## Firebase setup

1. Add Firebase to the existing Google Cloud project.
2. Register a Web app and copy its public web configuration into the four `FIREBASE_*` runtime variables.
3. Enable Google as a Firebase Authentication provider and set a support email.
4. Create a Firestore Native database in a nearby region.
5. Deploy the owner-bound rules:

```bash
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
```

## Secure Google Cloud deployment

Choose a nearby Cloud Run region, for example `asia-south1`. Replace placeholders before running.

```bash
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="asia-south1"
export SERVICE="northstar-vault"
export SERVICE_ACCOUNT="northstar-vault-sa@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud services enable \
  run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  aiplatform.googleapis.com firestore.googleapis.com firebase.googleapis.com

gcloud iam service-accounts create northstar-vault-sa \
  --display-name="Northstar Vault Cloud Run"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/firebaseauth.viewer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/aiplatform.user"

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --service-account "$SERVICE_ACCOUNT" \
  --allow-unauthenticated \
  --min=0 --max=3 --concurrency=40 --cpu=1 --memory=512Mi \
  --set-env-vars="GOOGLE_GENAI_USE_VERTEXAI=1,GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=global,FIREBASE_PROJECT_ID=${PROJECT_ID},FIREBASE_API_KEY=YOUR_PUBLIC_FIREBASE_API_KEY,FIREBASE_AUTH_DOMAIN=${PROJECT_ID}.firebaseapp.com,FIREBASE_APP_ID=YOUR_PUBLIC_FIREBASE_APP_ID,GEMINI_MODEL=gemini-3.1-flash-lite" \
  --labels="dev-tutorial=cloud-run-ai-challenge"
```

The service is public only so the landing page and sign-in flow are reachable. All reflection APIs remain authenticated.

## Verification checklist

```bash
npm run check
curl -fsS "https://YOUR_SERVICE_URL/api/health"
```

Then verify:

1. Signed-out visitors cannot call `/api/private/*`.
2. Google Sign-In reaches an empty private vault.
3. A reflection produces a reply and Signal Map.
4. Refresh preserves the session; sign-out hides it.
5. A second account cannot read the first account's session URL.
6. Export downloads valid JSON.
7. Deleting one reflection and erasing the vault work only after confirmation.
8. Browser network tools never show AI credentials.
9. Firestore rules contain no open wildcard grants.
10. Cloud Run has the required `dev-tutorial=cloud-run-ai-challenge` label.

## Challenge stack

- Firebase Authentication — federated Google Sign-In
- Cloud Firestore — user-isolated histories and structured Signal Maps
- Gemini on Vertex AI — multi-turn reflection and structured analysis
- Cloud Run service identity — keyless, least-privilege AI access
- Cloud Run — containerized production endpoint

Northstar Vault is reflection support, not medical, legal, or financial advice.

## Demo evidence

- `docs/northstar-social-preview.png` — polished Signal Map and multi-turn demo frame
- `docs/northstar-submission-screenshot.png` — production viewport evidence
- `docs/demo-script.md` — 90-second recording storyboard
- `docs/social-post.md` — approval-ready social post copy
