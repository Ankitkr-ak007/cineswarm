# ADR-001: Orchestration Framework
Status: Accepted
Context: We need an orchestration framework to manage four distinct AI agents (Critic, Vibes, Hidden Gems, Data) debating in real-time, followed by a Consensus agent synthesizing their outputs.
Decision: We will use LangGraph over CrewAI.
Consequences: LangGraph requires a deeper understanding of state graphs and potentially more boilerplate compared to CrewAI's more conversational abstraction, but we gain explicit parallel and sequential control, as well as native streaming capabilities essential for a real-time debate UI.
