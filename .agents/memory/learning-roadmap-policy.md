---
name: Learning roadmap product policy
description: User-selected external learning paths, recommendation constraints, and meaning of learning status.
---

Learning roadmap must begin empty, with users adding one of the 15 user-supplied roadmap.sh paths through Skills or Help me Decide. Do not replace this with generated todos.

**Why:** The user explicitly replaced the previous generic todos with this selection flow.

Questionnaire recommendations must use the supplied three questions and deterministic interest/activity/experience weights of 5/3/1, not an LLM. Beginners remain eligible for all fields; avoid compatibility percentages and career-suitability or market-demand claims.

**Why:** These requirements are explicit in the user's questionnaire attachment.

Start/stop learning is visual status with timestamps, not evidence of course completion or a verified achievement.

**Why:** The user specified this behavior as visual tracking only.

Store learning selections and timestamps separately for each user email.

**Why:** The user explicitly asked for learning information to be stored by email.

**How to apply:** The current demo uses this browser's persistent storage, keyed by normalized email. This does not provide secure account authentication or cross-device synchronization. Preserve status-versus-completion distinctions when extending learning paths, recommendation logic, or achievements.
