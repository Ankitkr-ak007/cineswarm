# CineSwarm Software Requirements Specification (SRS)

## Problem Statement
Movie recommendations are typically static, relying on collaborative filtering or basic metadata. Users often want a nuanced breakdown of a movie's qualities—from critical acclaim to visual vibes or hidden gem status. They need a system that evaluates movies dynamically through multiple distinct perspectives to arrive at a personalized consensus score.

## Target User
Cinephiles and casual movie-goers who want a deep, multi-faceted analysis of movies before watching them, combined with an easy-to-understand final consensus score that they can compare to public ratings.

## Success Criteria
- A working live agent debate system featuring four specific agents: Critic, Vibes, Hidden Gems, and Data.
- A Consensus agent that synthesizes the debate into a single personalized score.
- The system must display the dual rating (Consensus Score vs. Public Rating) on at least 3 test movies successfully.
- Agents should respond in real-time, leveraging the designated LLMs.
