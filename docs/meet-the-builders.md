# From a prompt to a product: building AI that earns its place

*Govind Yadav · Gen AI Academy APAC · 27 August 2026*

An AI demo can produce an impressive answer in seconds. A useful application has
to do more: understand the user's context, protect their data, handle failure and
make it clear when a human is still in charge.

That is the theme connecting my Gen AI Academy projects. Rather than stopping
at a chat box, the goal is to build small, complete workflows people can inspect
and control. Three examples are Northstar Vault, CymbalMart Shopping Agent and
Cymbal Kitchen.

## Northstar Vault: turn reflection into a next step

Northstar Vault starts with a familiar problem: a decision can feel tangled even
when all its pieces are already in your head.

The application turns an unstructured reflection into a **Signal Map**. It
separates observed facts from possible assumptions, identifies competing
tensions, offers options and an honest counterpoint, and proposes one testable
48-hour experiment. The intention is decision support—not to replace the user's
judgment or pretend to be a therapist.

The technical design follows that same principle of clarity. Firebase handles
Google sign-in. The backend verifies the Firebase ID token, derives the user's
storage path from that verified identity, and stores histories in Firestore.
Gemini is called through the Cloud Run service identity rather than an AI key
embedded in the browser.

The project includes a threat model, structured-output validation, bounded
requests, export and erasure controls. Those features are not a claim that every
security property has been exhaustively audited. They make the intended trust
boundaries visible and testable.

[Try Northstar Vault](https://northstar-vault-546899882968.asia-south1.run.app)
· [Explore its source](https://github.com/GtechGovind/northstar-vault)

## CymbalMart: recommendations should know where you are planning

A shopping plan that is useful in one country may be unhelpful somewhere else.
Currency, familiar products, pack sizes and ingredient availability all matter.

CymbalMart adds country/region selection and an optional city to an event-shopping
workflow. Gemini uses that context when proposing a checklist. The interface
lets the user edit quantities and prices, distinguish essential from optional
items, and see the remaining budget and cost per guest.

One important detail is easy to miss: changing regions resets the budget. It
does not silently relabel a rupee amount as dollars or pretend to perform a live
currency conversion. Prices are clearly described as estimates, not store
quotes or inventory guarantees.

The assistant can propose a revised list, but it cannot silently replace the
user's work. Changes are previewed first and take effect only after **Apply
changes**. A stale proposal cannot overwrite later edits.

Verification included actual Gemini-generated plans for US and Bengaluru
scenarios, editable budget calculations and the proposal/apply flow. The project
passed 30 automated tests, TypeScript checking and a production build.

[Try CymbalMart](https://ai.studio/apps/f13c7578-1e1e-4004-af58-6c3bd38cbf0c)
· [Explore its source](https://github.com/GtechGovind/cymbalmart-shopping-agent)

## Cymbal Kitchen: local ingredients, your choice of cuisine

Cymbal Kitchen applies a similar idea to recipe planning. A user can choose a
country/region, city, measurement system, cuisine, dietary preference, ingredient
exclusions, serving count and time limit.

Location and cuisine are separate choices. Someone in New York can ask for a
Japanese recipe with US customary measurements. Someone in Bengaluru can use
metric quantities and locally familiar ingredient names. The model is asked to
adapt the practical details without assuming that geography dictates taste.

The Streamlit application validates structured model responses with Pydantic,
renders recipe cards and supports Markdown and JSON downloads. A fixed sample is
explicitly labeled; a failed AI request is not hidden behind sample output.

There are important limits. The app's basic allergen checks are not comprehensive,
nutrition is unverified, and actual ingredient labels and cross-contact require
human review. Good product design includes saying where the product should not
be trusted.

The project passed 32 automated tests and live generation checks for both Indian
metric and US customary contexts. The related Google Skills challenge lab was
completed with 100/100; its earned badge is independently visible.

[Try Cymbal Kitchen](https://cymbal-kitchen-546899882968.asia-south1.run.app)
· [Explore its source](https://github.com/GtechGovind/cymbal-kitchen)
· [View the earned badge](https://www.skills.google/public_profiles/67d3bc9a-552d-443e-bde0-c60f3f3bf441/badges/27291223)

## What connects the projects

The strongest lesson from these builds is that the model is only one part of
the application. Useful AI also needs structured inputs, validation, identity,
human review, clear errors and evidence that the deployed workflow actually works.

These projects were developed with AI-assisted implementation and testing.
The aim is to make the resulting work inspectable: public source, honest
limitations and working demonstrations, rather than unsupported claims about
perfection, production readiness or prize outcomes.

The next step is to keep improving the boundary between suggestion and action.
An assistant should help people make a better decision, while making it easy
to understand the evidence, change the recommendation or say no.

#AccelerateAIwithCloudRun #GenAI #GoogleCloud #BuildWithAI
