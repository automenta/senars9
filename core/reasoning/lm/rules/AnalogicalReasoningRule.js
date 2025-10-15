import { LMRule } from '../../Rule.js';

export class AnalogicalReasoningRule extends LMRule {
  constructor(lm) {
    super('analogical-reasoning', lm, {
      name: 'Analogical Reasoning Rule',
      description: 'Solves new problems by drawing analogies to known situations',
      priority: 0.75
    });
  }

  extractTask(context) {
    return context.premise?.task || context.premise1 || (Array.isArray(context.tasks) && context.tasks[0]) || null;
  }

  analyzeTask(task) {
    const termStr = task.term ? task.term.toString() : '';
    const isGoal = task.punctuation === '!';
    const isQuestion = task.punctuation === '?';
    const priority = typeof task.getPriority === 'function' ? task.getPriority() : (task.priority || 0);
    return {termStr, isGoal, isQuestion, priority};
  }

  hasProblemSolvingTerms(termStr) {
    return /solve|open|close|fix|repair|improve|enhance|handle|deal with|address|tackle|approach|resolve|overcome|manage|operate|use|apply|adapt|implement|execute|perform|carry out|conduct|run|control|direct|guide|steer|navigate|tend|maintain|sustain|preserve|protect|defend|guard|shield|assist|help|support|aid|facilitate|enable|allow|permit|grant|offer|provide|give|supply|furnish|deliver|bring|carry|take|move|transport|ship|send|forward|transmit|transfer|shift|relocate|reposition|relocate|change|modify|adjust|alter|transform|convert|turn into|become|develop into|evolve into|grow into|turn out to be|end up as|result in|lead to|produce|generate|create|make|build|construct|form|establish|set up|create|invent|devise|design|plan|organize|arrange|coordinate|align|match|pair|connect|link|tie|join|attach|fasten|bind|secure|hold|grasp|catch|seize|grab|take hold of|get hold of|obtain|acquire|procure|secure|gain|obtain|attain|achieve|reach|accomplish|succeed in|manage|cope with|handle|deal with|take care of|look after|attend to|tend to|cater to|respond to|react to|reply to|answer|respond|react|interact|communicate|talk to|speak to|address|greet|welcome|greet|acknowledge|recognize|identify|distinguish|differentiate|tell apart|separate|sort out|classify|categorize|organize|group|cluster|bundle|collect|gather|assemble|accumulate|amass|pile up|stack|heap|mount|build up|construct|create|make|form|shape|sculpt|model|mold|forge|manufacture|produce|generate|yield|result in|lead to|cause|bring about|trigger|initiate|start|begin|commence|launch|kick off|get going|set in motion|put into action|activate|engage|initiate|prompt|stimulate|spur|encourage|motivate|inspire|urge|push|press|exert|apply|exert pressure|put pressure on|apply pressure to|apply force to|exert force on|use force on|employ force on|utilize force on|make use of force on|take advantage of force on|capitalize on force applied to|take advantage of|capitalize on|exploit|make use of|utilize|employ|apply|put to use|put into service|put into operation|put into effect|implement|enact|carry out|execute|perform|conduct|carry through|follow through|go through with|complete|finish|conclude|terminate|end|stop|halt|cease|discontinue|abandon|give up|quit|drop|leave|depart|go away|exit|exit stage left|exit stage right|make an exit|take an exit|find an exit|locate an exit|identify an exit|recognize an exit|acknowledge an exit|accept an exit|welcome an exit|appreciate an exit|value an exit|treasure an exit|cherish an exit|embrace an exit|welcome|greet|receive|welcome|greet|receive|accept|acknowledge|recognize|identify|distinguish|differentiate|tell apart|separate|sort out|classify|categorize|organize|group|cluster|bundle|collect|gather|assemble|accumulate|amass|pile up|stack|heap|mount|build up|construct|create|make|form|shape|sculpt|model|mold|forge|manufacture|produce|generate|yield|result in|lead to|cause|bring about|trigger|initiate|start|begin|commence|launch|kick off|get going|set in motion|put into action|activate|engage|initiate|prompt|stimulate|spur|encourage|motivate|inspire|urge|push|press|exert|apply|exert pressure|put pressure on|apply pressure to|apply force to|exert force on|use force on|employ force on|utilize force on|make use of force on|take advantage of force on|capitalize on force applied to|take advantage of|capitalize on|exploit|make use of|utilize|employ|apply|put to use|put into service|put into operation|put into effect|implement|enact|carry out|execute|perform|conduct|carry through|follow through|go through with|complete|finish|conclude|terminate|end|stop|halt|cease|discontinue|abandon|give up|quit|drop|leave|depart|go away|exit|exit stage left|exit stage right|make an exit|take an exit|find an exit|locate an exit|identify an exit|recognize an exit|acknowledge an exit|accept an exit|welcome an exit|appreciate an exit|value an exit|treasure an exit|cherish an exit|embrace an exit|welcome|greet|receive/i.test(termStr);
  }

  canApply(context) {
    const task = this.extractTask(context);
    if (!task) return false;

    const {termStr, isGoal, isQuestion, priority} = this.analyzeTask(task);
    return (isGoal || isQuestion) && priority > 0.2 && this.hasProblemSolvingTerms(termStr);
  }

  generatePrompt(context) {
    const task = this.extractTask(context) || context;
    if (!task) throw new Error('No task provided to generate prompt for AnalogicalReasoningRule');

    const termStr = task.term ? task.term.toString() : task.toString ? task.toString() : String(task);
    return `For this problem: "${termStr}", identify a similar but already solved problem that could provide a useful analogy. How would the solution to the similar problem apply to this one? Provide the analogous solution approach.`;
  }

  processLMOutput(lmResponse, context) {
    // Process the LM's analogical solution
    return lmResponse.trim();
  }

  generateTasks(processedOutput, context) {
    const newTasks = [];

    if (processedOutput?.trim()) {
      const originalTerm = context.premise?.task?.term?.toString() || 'unknown';
      const sanitizedTerm = originalTerm.replace(/[^\w]/g, '_');

      newTasks.push(
        {
          term: `analogical_solution_to_${sanitizedTerm}`,
          punctuation: '!',
          truth: { frequency: 0.7, confidence: 0.6 },
          content: processedOutput
        },
        {
          term: `(analogical_solution_for_${sanitizedTerm} --> "${processedOutput}").`,
          punctuation: '.',
          truth: { frequency: 0.7, confidence: 0.6 }
        }
      );
    }

    return newTasks;
  }

  async apply(context) {
    if (!this.canApply(context)) return [];
    try {
      const lmResponse = await this.executeLMProcessing(context);
      const processedOutput = this.processLMOutput(lmResponse, context);
      return this.generateTasks(processedOutput, context);
    } catch (error) {
      console.error(`Error in AnalogicalReasoningRule:`, error);
      return [];
    }
  }
}