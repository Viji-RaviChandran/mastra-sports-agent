import { Mastra } from '@mastra/core';
import { sportsAgent } from './agents/sportsAgent.js';

export const mastra = new Mastra({
  agents: {
    sportsAgent,
  },
});