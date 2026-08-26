# Security policy

Please do not open a public issue for a suspected vulnerability. Report it privately to the repository owner with a concise reproduction, affected route, and potential impact. Never include real journal content, Firebase ID tokens, API keys, or service-account material.

The production deployment uses keyless Vertex AI access through a dedicated least-privilege Cloud Run service account, owner-bound Firestore rules, Firebase Google Sign-In, and HTTPS-only Cloud Run ingress. No service-account key or Gemini API key is required in the production request path.
