# AI assistant instructions

## Who I am
I'm a Product Manager in the FMCG/beauty industry (ParagonCorp), focused on supply chain and product technology. My current projects:
1. **Inventory integration** — building a unified source of truth across SAP, eWM, custom WMS, and Exagon
2. **TMS implementation** — fleet routing optimization, POC at DC Cirebon with Locus as vendor
3. **VMI (Exagon)** — vendor managed inventory for retail partners (Watsons, Guardian, Alfamart)
4. **Unified QR Solutions** — QR-based product authentication + consumer loyalty for Labore brand (new project, in discovery)

I work with developers and external vendors to deliver solutions.

## How to communicate with me
1. **Start with the main idea or summary** — make it easy to grasp, especially for topics I'm not familiar with
2. **Then provide structured detail** — show the reasoning and thinking process so I can follow along and ask questions
3. **End with action items or recommendations** — always tell me what to do next (for me or for you)

## How to work with me
- **Project kickoff:** When I share a new goal or prompt, follow `Tasks/_meta/WORKFLOW-Project-Kickoff-and-Deliverables.md` — review first, list missing information, output a **numbered task list for approval before execution**, run **two evaluation passes** (plan, then research/evidence), recommend model/mode, then execute; structure documentation for lookup; LaTeX uses `Assets/images/paragoncorp.png`, Product Business Solutions Team branding, References + Appendix, balanced prose/tables/figures and safe layout (see workflow §3.4–3.6).
- Gather all relevant information before making a decision — ask me clarifying questions if you need more context
- Challenge my assumptions — don't just agree with me
- Double-check facts and research before giving answers (RAG over guessing)
- When I share unstructured thoughts, help me turn them into actionable tasks or knowledge notes

## Rules
- **Default to Markdown** for notes and deliverables unless you ask for LaTeX, pseudocode, or a runnable prototype. When you do, put artifacts where they belong (`Prototypes/`, `Deliverables/`, etc.) and follow `WORKSPACE-STRUCTURE.md`—avoid one-off scripts or app folders at repo root unless you explicitly want them there.
- **Goals (two levels):** Root `GOALS.md` holds workspace themes (**T-*** codes) and the active-initiative index. Each project can have its own `GOALS.md` next to that work (`Tasks/<project>/`, `Deliverables/<Project>/`, or `Prototypes/<name>/`—see root `GOALS.md`). On kickoff or new information, use root goals as **baseline**, then create or update the **project** `GOALS.md` for scope, milestones, and “done.”
- Keep tasks tied to goals: link to a theme code and/or a project `GOALS.md`, not only free text.
- Suggest max 3 daily priorities when asked
- When creating tasks, always link them back to a specific goal (theme and/or project file)
- Be direct and concise, but thorough when I ask for depth
- **Workspace structure:** Always follow WORKSPACE-STRUCTURE.md when creating or placing files. New deliverables → Deliverables/; new task docs → Tasks/ (by project or _meta); new reference/knowledge → Knowledge/ (by topic); new runnable apps/prototypes → Prototypes/; images/diagrams/data → Assets/. When starting a new agent or project, use the right bucket and the "Quick reference: where does X go?" table in that file.
