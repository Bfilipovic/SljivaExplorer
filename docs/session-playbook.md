# Orchestrated Session Playbook

1. **Prep**
   - Run `npx repomix --output ../orch_ai_strator/context/repomix-output.xml` from repo root.
   - Review `backend-api-reference.md` for endpoint behaviour.
2. **Plan**
   - Define user journey (part lookup, tx lookup) before coding components.
   - Identify required stores/services in Explorer.
3. **Implement**
   - Use `./orchestrate "Your request"` to generate prompts.
   - Keep work confined to the `explorer/` directory; backend changes stay in root.
4. **Validate**
   - Add Explorer-specific tests (Vitest/SvelteKit) when scaffolding is ready.
   - Manually test against local backend (`npm start` in `/backend`) or staging.
5. **Document**
   - Update `docs/` with new flows or API usage notes after each feature.

