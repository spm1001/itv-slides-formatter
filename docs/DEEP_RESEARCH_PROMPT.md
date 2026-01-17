# Deep Research Prompt: Architectural Foresight for ITV Slides Formatter

*A prompt designed to help Claude research and anticipate architectural decisions for a Google Workspace automation system that will scale from prototype to enterprise deployment.*

---

## The Prompt

You are a senior systems architect and Google Workspace API specialist. You've been brought in at the foundations of a project that will grow significantly. Your task is to research deeply and send a message back to the present: what mistakes will we be glad we avoided? What opportunities were we about to miss? What will future developers be grateful for?

### The System Being Built

**Current State (January 2026):**
- A Google Apps Script tool for automated Google Slides formatting
- 20-second iteration cycle: edit → deploy → run → observe logs → observe changes → iterate
- Phase 1 complete: Font swapping (Comic Sans MS ↔ Arial) as proof of concept
- Architecture: SlideFormatter class, SlidesApiClient with retry/batching, YAML config
- Distribution: Three-project model (2 dev sandboxes + 1 production), ~20 users

**The Vision:**
- Take any Google Slides presentation based on ITV's official template
- Automatically correct formatting errors and improve aesthetics across up to 100 slides
- Handle embedded Google Sheets chart objects (requiring the Sheets API for styling)
- Accumulate an 'in-code' representation of the correct look for slides and charts
- Surface as a Slides add-on or Card-based Workspace add-on (Slides + Sheets)
- Scale to potentially hundreds of users across ITV

### The Unique Development Context

A Claude AI is working in a loop:
1. Observe the Slides document (via MCP integration)
2. Modify Apps Script code
3. Push changes (via CLI tooling)
4. Run the script in user context
5. Observe Cloud Logs AND directly observe the modified Slides/Sheets
6. Iterate with 20-second cycle time

This creates a unique opportunity for rapid, empirical learning about the Slides API's quirks and behaviors. The AI can test hypotheses and observe results directly.

### What We Know So Far (The "Goblin Census")

Through empirical testing, we've discovered these behaviors:

| Element Type | Default Font | Inherits from Master? | Formatter Strategy |
|--------------|--------------|----------------------|-------------------|
| Title/Body/Subtitle placeholders | (from master) | ✅ Yes | Clear overrides |
| Speaker notes | (from master) | ✅ Yes | Clear overrides |
| Plain text boxes | Arial 18pt | ❌ No | Explicit SET |
| Shapes with text | Arial 14pt | ❌ No | Explicit SET |
| Table cells | Arial 14pt | ❌ No | Explicit SET |
| Chart text | Roboto (Sheets) | ❌ No | Sheets API |

This creates a bifurcated strategy: placeholders use field mask clearing to inherit from master, while "goblin" elements require explicit styling.

### Research Questions for Deep Investigation

#### 1. Data Structure Design for Template Representation

The system will need to represent "the correct look" as data. Research these questions:

- **Hierarchical vs flat**: Should we model the template as nested (Presentation → Slide → Element → TextRun) or as a flat list of rules? What are the trade-offs for a system that needs both read (discovery) and write (application) capabilities?

- **Declarative vs procedural**: Is it better to store "what it should look like" (declarative: `{ font: 'ITV Reem', size: 18 }`) or "what to do" (procedural: `[ {action: 'setFont', value: 'ITV Reem'} ]`)? Consider undo, diffing, debugging.

- **Schema versioning**: When the ITV brand guidelines change (they will), how do we version the template definition? How do we handle presentations created under old guidelines?

- **Placeholder semantics**: How do we represent "inherit from master" vs "explicit override" vs "clear and inherit"? The Slides API distinguishes these but it's not obvious how to serialize that intent.

#### 2. The Two-API Reality for Charts

Embedded charts require both Slides API (position, size, linking) and Sheets API (all styling). Research:

- **Sync strategies**: When a chart is embedded, what's the source of truth? If we modify the source Sheet, when and how does the Slide update? What are the cache/invalidation behaviors?

- **Batch coordination**: The Sheets API has its own batch update mechanism. How do we coordinate batches across two APIs? What happens if one succeeds and one fails? Is there any transactional semantics we can exploit?

- **Chart types**: Which chart types can be fully controlled via API? Are there chart configurations that can only be set through the UI? What's the coverage gap?

- **Refresh triggers**: How do we force a chart refresh after modifying the source Sheet? Is there a reliable API call, or do we rely on eventual consistency?

#### 3. Iteration Strategies for 100+ Slides

Processing a large presentation efficiently while keeping users informed. Research:

- **Batch sizing**: The Slides API has a batch update endpoint. What's the optimal batch size? Does it vary by operation type? Are there diminishing returns or cliff edges?

- **Parallelism**: Can we parallelize across slides? What are the locking/conflict semantics? Does the API handle concurrent batch updates to different slides?

- **Progress reporting**: Apps Script has limited UI options (Toast notifications, modal dialogs, sidebar). For operations taking 30+ seconds, what's the best UX pattern? Are there any async/callback mechanisms we can exploit?

- **Incremental saves**: If the script times out (6-minute limit for add-ons), how do we resume? What's the state management strategy for checkpointing progress?

- **Quota management**: What are the relevant quotas (API calls per minute, per day, per user)? How do we stay within them for large presentations? Can we use GCP quota increases for enterprise deployments?

#### 4. Error Handling and Recovery

In a production system processing user presentations:

- **Partial failure**: If element 47 of 200 fails, what's the correct behavior? Skip and continue? Roll back all changes? The Slides API batch update appears to be all-or-nothing per batch—verify this.

- **Idempotency**: If a user runs the formatter twice, does it produce the same result? If we're "clearing to inherit from master" and the master changes between runs, is that desired?

- **Error classification**: Which API errors are retryable (rate limits, transient failures) vs fatal (invalid request, permission denied)? Build a comprehensive taxonomy.

- **User communication**: How do we report errors usefully? Element IDs mean nothing to users. How do we translate to "Slide 5, the blue text box in the upper right corner"?

#### 5. Template Discovery vs Template Application

The system needs to both discover what formatting exists and apply correct formatting:

- **Discovery**: What's the most efficient way to extract all formatting from a "golden" slide deck that represents the ITV template? Can we generate our template definition automatically from an exemplar?

- **Diff-based application**: Instead of "apply this template," should we compute "what changes are needed from current to target"? This could enable preview, selective application, and undo.

- **Master slide manipulation**: Should we modify the master slides programmatically to enforce inheritance? Or only work with individual slide elements? What are the implications for existing presentations?

#### 6. Workspace Add-on Architecture

Looking forward to distribution:

- **Traditional vs Card-based**: Cards (new model) work across Slides, Sheets, Docs. Traditional add-ons are app-specific. Given we need both Slides and Sheets, is a Card-based add-on the better choice? What are the trade-offs in capability?

- **Triggers and events**: What events can we hook into? onOpen, onEdit? Can we trigger on "slide changed" or "element added"? Is there any way to provide real-time formatting feedback?

- **OAuth scopes**: The principle of least privilege says request minimal scopes. But the Slides and Sheets APIs require broad scopes. How do we balance user trust with functional requirements?

- **Marketplace vs direct install**: For an internal ITV tool, what's the real benefit of Marketplace publishing vs the current direct-install model? At what user count does it matter?

#### 7. Feedback and Learning Loops

The system should get smarter over time:

- **Implicit feedback**: If a user runs the formatter and then manually changes something back, that's signal. Can we detect this? Is there any way to hook into edit history?

- **Explicit feedback**: What's the least intrusive way to ask "was this helpful?" in an add-on context? Toast with thumbs up/down? Sidebar survey?

- **Aggregate learning**: If many users are manually fixing the same thing, that's a bug in our template definition. How do we aggregate signals across users while respecting privacy?

- **A/B testing**: Can we run formatting experiments? Apply style A to half of users, style B to half, measure satisfaction? Is this appropriate for an internal tool?

#### 8. Performance and Scaling

Looking at enterprise deployment:

- **GCP resource allocation**: Apps Script runs on Google's infrastructure with limited configurability. What execution environment options exist? Can we use Cloud Functions for heavy lifting?

- **Caching strategies**: Presentations are read frequently but change infrequently. What caching is appropriate? Where does it live? How do we invalidate?

- **Execution limits**: The 6-minute timeout for add-on triggers is well-known. What are the actual limits we'll hit first? Memory? API calls? Something else?

#### 9. Security and Data Handling

For an enterprise tool handling business presentations:

- **Data residency**: If ITV has data residency requirements, how does that interact with Apps Script and the APIs? Are there any gotchas?

- **Audit logging**: What access logs are automatically generated? What should we log explicitly for compliance purposes?

- **Least privilege**: Our script needs write access to presentations. Can we scope this more narrowly? What about requiring explicit user action before modifying?

#### 10. The Unknown Unknowns

Based on your research of similar projects, Google Workspace API limitations, and enterprise add-on deployments:

- What questions haven't we asked that we should have?
- What assumptions are we making that are likely wrong?
- What features of the Slides/Sheets API are underutilized and could unlock capabilities we haven't imagined?
- What are the common failure modes of projects like this?

### Expected Output Format

Structure your research findings as:

1. **Critical Path Decisions**: The 3-5 architectural decisions that will have the most impact. For each, provide the options, trade-offs, and a recommendation.

2. **Mistakes to Avoid**: Specific patterns or approaches that seem reasonable but lead to problems. Include concrete examples from similar projects or API documentation.

3. **Opportunities to Seize**: Capabilities or approaches that aren't obvious but could provide significant value. Things the current team might not know to look for.

4. **Technical Deep Dives**: For the most critical questions above, provide detailed technical analysis with code patterns, API specifics, and references to documentation.

5. **Timeline-Independent Roadmap**: A sequence of capabilities to build, ordered by dependency and value, without time estimates. What must come before what, and why.

6. **Risk Register**: What could go wrong, how likely is it, and what's the mitigation strategy?

### Constraints and Context

- The development team has full access to ITV's GCP environment
- OAuth and authentication are solved (itv-appscript-deploy CLI handles this)
- The MCP integration allows Claude to read Slides documents directly
- This is an internal tool, not a public product
- ITV is a large media company; presentations often contain sensitive business data
- The tool should feel like it "just works" for non-technical users

### What Does Success Look Like?

In one year:
- A user opens any presentation based on the ITV template
- Clicks one button
- In under a minute, all formatting is corrected
- Embedded charts are styled consistently
- The user is informed of progress and any issues
- The tool learns from usage patterns to get better over time

In three years:
- New presentation templates are onboarded in hours, not weeks
- The system catches and flags deviations from brand guidelines in real-time
- Formatting decisions are explainable ("this was changed because...")
- The architecture has scaled to new document types with minimal rework

---

*This prompt was crafted in January 2026, at the transition from Phase 1 (font swapping proof of concept) to the full vision. We stand at the ground, looking up at where the edifice will stand. Help us see.*
