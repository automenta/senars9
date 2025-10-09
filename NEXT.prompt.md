# Develop SeNARS

## Use the following files as your reference for the development roadmap and component specifications:

  Primary Reference Files:
   - `NEXT.essential-details.md` - Contains the comprehensive, consolidated view of all essential details including
     component architecture, implementation strategy, success metrics, and development workflow
   - `NEXT.md` - Original comprehensive roadmap with complete specifications and validation criteria

  Secondary Reference Files (for specific component details):
   - `NEXT.lm.md` - Detailed Language Model component specifications and advanced capabilities
   - `NEXT.analysis.md` - Analysis and diagnostic components from senars8 integration
   - `NEXT.additional-features.md` - Additional helpful features and components from senars8

## Development Context:
- Foundation components (Rules, Memory) are completed with 60-80% performance improvement
- LM Component is complete with modular architecture and provider abstraction
- Current focus: WebSocket Server, Basic Reasoning Component, Messages System, and System Wrapper
- Next phase includes: BagAdjacencyCollection, Graph Traversal, HTN Planning, Plan Execution

## Implementation Guidelines:
- Follow the dependency flow: Foundation → LM → Planning/Graphs → Analysis
- Prioritize highest leverage components that enable multiple downstream capabilities
- Use the validation criteria to ensure proper implementation
- Apply the daily development process: Select → Implement → Integrate → Test → Document → Move to Next
- Maintain integration with existing components throughout development

## Current Priorities:
1. Complete WebSocket Server for real-time communication and monitoring
2. Implement Basic Reasoning Component with rule integration
3. Build Messages System middleware and error handling
4. Create System API Wrapper for unified access

# Implement the next logical component or feature
- based on these specifications
- ensuring integration with existing components
- adhering to the validation criteria and `AGENTS.md` code guidelines

## Work Items Completed
- If items have been totally completed, check them off in the list, ex: `[x]`.
- If a completed work item isn't on the list, add it as checked, noting its completion.
