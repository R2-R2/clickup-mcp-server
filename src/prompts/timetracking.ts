/**
 * ClickUp MCP Time Tracking Prompts
 * 
 * This module provides prompt templates for time tracking functionality.
 */

import { Prompt } from '@modelcontextprotocol/sdk/types.js';

/**
 * Prompt for analyzing time usage
 */
export const analyzeTimeUsagePrompt: Prompt = {
  name: 'analyze_time_usage',
  description: 'Analyze how time has been spent over a specific period',
  arguments: [
    {
      name: 'period',
      description: 'Time period to analyze (today, yesterday, this_week, last_week, this_month, last_month)',
      required: true
    }
  ]
};

/**
 * Prompt for managing the current timer
 */
export const manageTimerPrompt: Prompt = {
  name: 'manage_timer',
  description: 'Start, stop, or check the current timer',
  arguments: [
    {
      name: 'action',
      description: 'Action to perform (start, stop, check)',
      required: true
    },
    {
      name: 'taskName',
      description: 'Name of the task to track time for (only needed for start action)',
      required: false
    }
  ]
};

/**
 * Prompt for getting time tracking recommendations
 */
export const timeTrackingRecommendationsPrompt: Prompt = {
  name: 'time_tracking_recommendations',
  description: 'Get recommendations for improving time tracking and productivity',
  arguments: []
};

/**
 * Get prompt templates for time tracking
 * @returns Array of prompt templates
 */
export function getTimeTrackingPrompts(): Prompt[] {
  return [
    analyzeTimeUsagePrompt,
    manageTimerPrompt,
    timeTrackingRecommendationsPrompt
  ];
}

/**
 * Handle the analyze_time_usage prompt
 * @param args Prompt arguments
 * @returns Prompt message
 */
export async function handleAnalyzeTimeUsagePrompt(args: any): Promise<any> {
  const { period } = args;
  
  // Handle different periods
  let periodText = '';
  switch (period) {
    case 'today':
      periodText = 'today';
      break;
    case 'yesterday':
      periodText = 'yesterday';
      break;
    case 'this_week':
      periodText = 'this week so far';
      break;
    case 'last_week':
      periodText = 'last week';
      break;
    case 'this_month':
      periodText = 'this month so far';
      break;
    case 'last_month':
      periodText = 'last month';
      break;
    default:
      periodText = period;
  }
  
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please analyze my time usage for ${periodText}. Show me which tasks took the most time, identify any patterns or insights in how I'm spending my time, and suggest ways I could be more efficient.`
        }
      },
      {
        role: 'user',
        content: {
          type: 'resource',
          resource: {
            uri: `clickup://timetracking/${period === 'this_week' ? 'week' : period === 'this_month' ? 'month' : period}`
          }
        }
      }
    ]
  };
}

/**
 * Handle the manage_timer prompt
 * @param args Prompt arguments
 * @returns Prompt message
 */
export async function handleManageTimerPrompt(args: any): Promise<any> {
  const { action, taskName } = args;
  
  switch (action) {
    case 'start':
      if (!taskName) {
        throw new Error('Task name is required for starting a timer');
      }
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please start a timer for the task "${taskName}". Let me know when the timer is started, and confirm what task it's tracking time for.`
            }
          }
        ]
      };
    
    case 'stop':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Please stop the current timer if there is one running. Let me know how much time was tracked and for which task.'
            }
          }
        ]
      };
    
    case 'check':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Please check if I have a timer currently running. If so, tell me which task it\'s for and how long it\'s been running.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'resource',
              resource: {
                uri: 'clickup://timetracking/current'
              }
            }
          }
        ]
      };
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Handle the time_tracking_recommendations prompt
 * @returns Prompt message
 */
export async function handleTimeTrackingRecommendationsPrompt(): Promise<any> {
  return {
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Based on my time tracking history, please provide recommendations for how I could improve my time tracking habits and productivity. Analyze patterns in how I use my time and suggest concrete improvements.'
        }
      },
      {
        role: 'user',
        content: {
          type: 'resource',
          resource: {
            uri: 'clickup://timetracking/history'
          }
        }
      }
    ]
  };
}