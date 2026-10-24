---
name: CV matching policy
description: Product constraints for explainable matching, sample CV demonstrations and self-reported levels.
---

Use synthetic/sample CVs for demonstrations and tests, not real personal documents. Keep extraction deterministic, without LLMs, embeddings or a vector database, and match against the existing real vacancy cache rather than fetching new jobs in the CV flow.

**Why:** The user's CV-to-job MVP attachment explicitly required these boundaries.

Missing or uncertain requirements and experience must remain Unknown, not zero or an eligibility guarantee. Manual proficiency levels are self-reported; they do not change the requested required-skill overlap formula.

**Why:** The user requested explainable skill-overlap scores rather than hiring probabilities. No proficiency assessment or employer-specific proficiency scoring was requested.

**How to apply:** Preserve these distinctions when improving extraction or matching. Browser email scoping is a demo convenience, not secure identity; do not turn arbitrary submitted emails into authorization for server-side personal profiles.
