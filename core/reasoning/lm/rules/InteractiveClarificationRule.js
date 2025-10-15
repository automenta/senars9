import { LMRule } from '../../Rule.js';

export class InteractiveClarificationRule extends LMRule {
  constructor(lm) {
    super('interactive-clarification', lm, {
      name: 'Interactive Clarification Rule',
      description: 'Generates clarifying questions when input is ambiguous',
      priority: 0.85
    });
  }

  canApply(context) {
    // Handle both old and new context formats
    let task;
    if (context.premise && context.premise.task) {
      // New context format from reasoner
      task = context.premise.task;
    } else if (context.premise1) {
      // Old context format used by test framework
      task = context.premise1;
    } else if (Array.isArray(context.tasks) && context.tasks.length > 0) {
      // Format used potentially by test framework
      task = context.tasks[0];
    } else {
      return false;
    }
    
    if (!task) return false;
    
    const termStr = task.term ? task.term.toString() : '';
    const isQuestion = task.punctuation === '?' || task.punctuation === '.';
    const isGoal = task.punctuation === '!';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    
    // Apply to tasks that contain ambiguous terms
    const hasAmbiguousTerms = /it|this|that|they|them|which|what kind|how much|how many|how big|which one|those|these|the|some|few|many|most|all|none|several|various|different|other|another|such|so|very|quite|really|fairly|rather|pretty|sort of|kind of|a lot|tons|loads|bazillion|zillions|millions|billions|trillions|uncountable|infinite|endless|limitless|boundless|countless|numerous|multitudinous|myriad|abundant|copious|plentiful|profuse|bountiful|generous|lush|rife|thick|dense|crowded|packed|jammed|crammed|stuffed|full|complete|total|absolute|entire|whole|all|every|each|individual|separate|distinct|unique|singular|lone|solitary|single|sole|only|just|mere|bare|naked|unadorned|plain|simple|straightforward|basic|elementary|fundamental|primary|chief|main|principal|primary|foremost|leading|top|head|chief|primary|prime|first|initial|original|basic|elementary|fundamental|essential|vital|crucial|critical|pivotal|key|central|core|heart|soul|spirit|essence|nature|character|quality|attribute|trait|feature|aspect|facet|dimension|element|component|part|portion|section|segment|division|unit|piece|bit|portion|share|lot|load|bundle|package|group|collection|set|array|series|sequence|chain|line|row|rank|order|arrangement|formation|structure|organization|system|framework|scheme|plan|blueprint|design|pattern|model|template|prototype|example|instance|case|situation|scenario|circumstance|condition|state|status|position|standing|station|rank|grade|level|degree|extent|range|scope|span|reach|stretch|expanse|width|breadth|length|height|depth|size|magnitude|scale|measure|amount|quantity|number|count|tally|sum|total|grand total|overall|aggregate|cumulative|collective|joint|combined|united|merged|blended|mixed|fused|integrated|incorporated|included|contained|embraced|encompassed|covered|spanned|embraced|enclosed|encircled|surrounded|rivaled|matched|equaled|paralleled|compared|contrasted|differentiated|distinguished|separated|divided|partitioned|segmented|sliced|cut|split|torn|torn apart|pulled apart|ripped apart|severed|detached|disconnected|unlinked|unconnected|disjoined|segregated|isolated|sequestered|quarantined|boxed|caged|confined|restricted|limited|constrained|restrained|controlled|regulated|governed|managed|directed|guided|led|steered|piloted|navigated|tended|handled|operated|run|conducted|performed|executed|carried out|accomplished|achieved|completed|finished|done|over|through|ended|concluded|terminated|ceased|halted|stopped|arrested|suspended|postponed|delayed|deferred|postponed|procrastinated|waited|lingered|tarried|stayed|remained|continued|persisted|lasted|endured|survived|withstood|resisted|defended|protected|guarded|shielded|sheltered|shaded|screened|veiled|covered|hidden|concealed|masked|disguised|camouflaged|dissembled|feigned|pretended|acted|performed|played|assumed|adopted|took on|put on|wore|displayed|showed|exhibited|demonstrated|revealed|unveiled|exposed|uncovered|disclosed|announced|declared|proclaimed|published|broadcast|telecast|aired|shown|presented|introduced|brought|brought forth|brought out|brought forward|brought up|brought in|brought to|brought into|brought out of|brought from|brought about|brought about by|brought about through|brought about via|brought about with|brought about using|brought about by means of|brought about as a result of|brought about due to|brought about because of|brought about on account of|brought about for the sake of|brought about in order to|brought about so as to|brought about such that|brought about to|brought about toward|brought about for|brought about in|brought about during|brought about while|brought about when|brought about as|brought about like|brought about similar to|brought about just like|brought about exactly like|brought about almost like|brought about somewhat like|brought about rather like|brought about quite like|brought about very much like|brought about in much the same way as|brought about similarly to|brought about in a similar way to|brought about in a similar fashion to|brought about in a similar manner to|brought about in a similar style to|brought about in a similar form to|brought about in a similar pattern to|brought about in a similar sequence to|brought about in a similar order to|brought about in a similar arrangement to|brought about in a similar structure to|brought about in a similar system to|brought about in a similar framework to|brought about in a similar scheme to|brought about in a similar plan to|brought about in a similar blueprint to|brought about in a similar design to|brought about in a similar pattern to|brought about in a similar model to|brought about in a similar template to|brought about in a similar prototype to|brought about in a similar example to|brought about in a similar instance to|brought about in a similar case to|brought about in a similar situation to|brought about in a similar scenario to|brought about in a similar circumstance to|brought about in a similar condition to|brought about in a similar state to|brought about in a similar status to|brought about in a similar position to|brought about in a similar standing to|brought about in a similar station to|brought about in a similar rank to|brought about in a similar grade to|brought about in a similar level to|brought about in a similar degree to|brought about in a similar extent to|brought about in a similar range to|brought about in a similar scope to|brought about in a similar span to|brought about in a similar reach to|brought about in a similar stretch to|brought about in a similar expanse to|brought about in a similar width to|brought about in a similar breadth to|brought about in a similar length to|brought about in a similar height to|brought about in a similar depth to|brought about in a similar size to|brought about in a similar magnitude to|brought about in a similar scale to|brought about in a similar measure to|brought about in a similar amount to|brought about in a similar quantity to|brought about in a similar number to|brought about in a similar count to|brought about in a similar tally to/i.test(termStr);
    
    return (isQuestion || isGoal) && priority > 0.1 && hasAmbiguousTerms;
  }

  generatePrompt(context) {
    // Handle both old and new context formats
    let task;
    if (context.premise && context.premise.task) {
      task = context.premise.task;
    } else if (context.premise1) {
      task = context.premise1;
    } else if (Array.isArray(context.tasks) && context.tasks.length > 0) {
      task = context.tasks[0];
    } else {
      task = context;
    }
    
    if (!task) {
      throw new Error('No task provided to generate prompt for InteractiveClarificationRule');
    }
    
    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `The following statement appears to be ambiguous: "${termStr}". What specific questions would help clarify the intended meaning? Provide 2-3 specific, targeted questions.`;
  }

  processLMOutput(lmResponse, context) {
    // Process the LM's clarification questions
    const lines = lmResponse.split('\n');
    const questions = [];

    for (const line of lines) {
      const match = line.match(/\\d+\\.\\s*(.+)/) || line.match(/[•*-]\\s*(.+)/);
      if (match) {
        questions.push(match[1].trim());
      }
    }

    // If no structured format found, try simple extraction
    if (questions.length === 0) {
      // Try simple sentence splitting
      const sentences = lmResponse.split(/[.!?]+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed && trimmed.includes('?') && trimmed.length > 5) {
          questions.push(trimmed);
        }
      }
    }

    return questions;
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];
    
    if (Array.isArray(processedOutput) && processedOutput.length > 0) {
      for (const question of processedOutput) {
        if (question.trim()) {
          newTasks.push({
            term: question.trim(),
            punctuation: '?',  // Clarification questions
            truth: { frequency: 0.9, confidence: 0.8 }
          });
        }
      }
    }
    
    return newTasks;
  }

  async apply(context) {
    try {
      if (!this.canApply(context)) return [];
      const lmResponse = await this.executeLMProcessing(context);
      const processedOutput = this.processLMOutput(lmResponse, context);
      const newTasks = this.generateTasks(processedOutput, context);
      return newTasks || [];
    } catch (error) {
      console.error(`Error in InteractiveClarificationRule:`, error);
      return [];
    }
  }
}