# ADR-003: LLM Providers
Status: Accepted
Context: We need to power multiple debate agents in parallel. We want genuine reasoning diversity between the personas and need to stay within free-tier throughput limits during the MVP phase.
Decision: We will use a combination of Groq (Llama 3.3 70B) and Gemini (2.5 Flash).
Consequences: Using two providers complicates the API client setup and error handling, but it gives us doubled free-tier throughput and provides distinct model "personalities" which naturally enhances the debate dynamics.
