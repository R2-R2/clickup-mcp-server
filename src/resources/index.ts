/**
 * ClickUp MCP Resources Entry Point
 * 
 * This module exports the resources functionality for the MCP server.
 * Resources allow Claude to access ClickUp data directly as context.
 */

import {
  getTimeTrackingReportAsText,
  getCurrentTimerAsText,
  getTimeTrackingHistoryAsText
} from './timetracking.js';

export interface ResourceInfo {
  uri: string;
  name: string;
  description: string;
}

/**
 * Get a list of all available resources
 * @returns Array of resource definitions
 */
export async function getResourceList(): Promise<ResourceInfo[]> {
  return [
    // Time tracking resources
    {
      uri: 'clickup://timetracking/today',
      name: 'Today\'s Time Tracking',
      description: 'Time tracking report for today'
    },
    {
      uri: 'clickup://timetracking/yesterday',
      name: 'Yesterday\'s Time Tracking',
      description: 'Time tracking report for yesterday'
    },
    {
      uri: 'clickup://timetracking/week',
      name: 'This Week\'s Time Tracking',
      description: 'Time tracking report for the current week'
    },
    {
      uri: 'clickup://timetracking/month',
      name: 'This Month\'s Time Tracking',
      description: 'Time tracking report for the current month'
    },
    {
      uri: 'clickup://timetracking/current',
      name: 'Current Timer',
      description: 'Information about the currently running timer'
    },
    {
      uri: 'clickup://timetracking/history',
      name: 'Time Tracking History',
      description: 'Recent time tracking entries'
    }
  ];
}

/**
 * Get the content of a specific resource
 * @param uri Resource URI
 * @returns Resource content or undefined if not found
 */
export async function getResourceContent(uri: string): Promise<string | undefined> {
  // Parse the URI
  const parts = uri.split('://')[1]?.split('/');
  
  if (!parts || parts.length < 2) {
    return undefined;
  }
  
  const resourceType = parts[0];
  const resourceId = parts[1];
  
  // Handle time tracking resources
  if (resourceType === 'timetracking') {
    switch (resourceId) {
      case 'today':
        return await getTimeTrackingReportAsText('today');
      case 'yesterday':
        return await getTimeTrackingReportAsText('yesterday');
      case 'week':
        return await getTimeTrackingReportAsText('this_week');
      case 'month':
        return await getTimeTrackingReportAsText('this_month');
      case 'current':
        return await getCurrentTimerAsText();
      case 'history':
        return await getTimeTrackingHistoryAsText();
      default:
        return undefined;
    }
  }
  
  return undefined;
}