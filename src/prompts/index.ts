/**
 * ClickUp MCP Prompts Entry Point
 * 
 * This module exports prompt functionality for the MCP server.
 * Prompts provide template interactions for common ClickUp workflows.
 */

import { 
  getTimeTrackingPrompts,
  handleAnalyzeTimeUsagePrompt,
  handleManageTimerPrompt,
  handleTimeTrackingRecommendationsPrompt
} from './timetracking.js';

/**
 * Get all prompt templates
 * @returns Array of all prompt templates
 */
export function getAllPrompts() {
  return [
    ...getTimeTrackingPrompts(),
    // Add other prompt categories here
  ];
}

/**
 * Handle a specific prompt request
 * @param promptName Name of the prompt
 * @param args Arguments for the prompt
 * @returns Prompt messages
 */
export async function handlePrompt(promptName: string, args: any) {
  switch (promptName) {
    // Time tracking prompts
    case 'analyze_time_usage':
      return handleAnalyzeTimeUsagePrompt(args);
    case 'manage_timer':
      return handleManageTimerPrompt(args);
    case 'time_tracking_recommendations':
      return handleTimeTrackingRecommendationsPrompt();
    
    // Add other prompt handlers here
    
    default:
      throw new Error(`Unknown prompt: ${promptName}`);
  }
}
