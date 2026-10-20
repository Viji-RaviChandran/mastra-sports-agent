import { Agent } from '@mastra/core/agent';
import { sportsDayTool } from '../tools/sqlBuilder/controller/sqlTool.js';
import { agentPromt } from './prompt/agentPrompt.js';

export const sportsAgent = new Agent({
  name: 'sportsAgent',
  description:'A friendly Sports day agent',
  instructions: agentPromt,
  model: 'openrouter/meta-llama/llama-3.3-70b-instruct',
  tools: {
    sportsDayTool,
  },
});