/**
 * ClickUp MCP Time Tracking Tools
 * 
 * This module defines time tracking-related tools including getting time reports,
 * managing timers, and utility functions for working with time tracking data.
 */

import { timeTrackingService } from '../services/shared.js';
import { TaskService } from '../services/clickup/task.js';
import { findListIDByName } from './list.js';
import { WorkspaceService } from '../services/clickup/workspace.js';
import { clickUpServices } from '../services/shared.js';

// Extract the services we need for task operations to find tasks by name
const { task: taskService, workspace: workspaceService } = clickUpServices;

/**
 * Date range for a time period
 */
export interface DateRange {
  start_date: number;
  end_date: number;
}

/**
 * Get a date range for a specified period
 * @param period Period identifier (today, yesterday, this_week, last_week, this_month, last_month)
 * @returns Object with start_date and end_date timestamps in milliseconds
 */
export function getDateRangeForPeriod(period: string): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result: DateRange = { start_date: 0, end_date: now.getTime() };

  switch (period) {
    case 'today':
      result.start_date = today.getTime();
      break;
    
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      result.start_date = yesterday.getTime();
      result.end_date = today.getTime() - 1; // End at 23:59:59 yesterday
      break;
    
    case 'this_week':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // First day of current week (Sunday)
      result.start_date = startOfWeek.getTime();
      break;
    
    case 'last_week':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7); // First day of last week
      const lastWeekEnd = new Date(today);
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1); // Last day of last week
      lastWeekEnd.setHours(23, 59, 59, 999);
      result.start_date = lastWeekStart.getTime();
      result.end_date = lastWeekEnd.getTime();
      break;
    
    case 'this_month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      result.start_date = startOfMonth.getTime();
      break;
    
    case 'last_month':
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      result.start_date = startOfLastMonth.getTime();
      result.end_date = endOfLastMonth.getTime();
      break;
    
    default:
      throw new Error(`Invalid period: ${period}`);
  }

  return result;
}

/**
 * Format duration in milliseconds to human-readable string
 * @param ms Duration in milliseconds
 * @returns Formatted duration string (e.g. "2h 30m")
 */
export function formatDuration(ms: number): string {
  if (!ms) return '0m';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;
  
  let result = '';
  
  if (days > 0) {
    result += `${days}d `;
  }
  
  if (remainingHours > 0 || days > 0) {
    result += `${remainingHours}h `;
  }
  
  if (remainingMinutes > 0 || result === '') {
    result += `${remainingMinutes}m`;
  }
  
  return result.trim();
}

/**
 * Task summary from time tracking data
 */
interface TaskTimeSummary {
  taskId: string;
  taskName: string;
  time: number;
  timeFormatted: string;
  percentage: number;
}

/**
 * Tool definition for getting time tracking report
 */
export const getTimeTrackingReportTool = {
  name: "get_time_tracking_report",
  description: "Get a time tracking report for a specific period to see how time has been spent across tasks",
  inputSchema: {
    type: "object",
    properties: {
      period: {
        type: "string",
        enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month"],
        description: "Time period to get report for"
      }
    },
    required: ["period"]
  },
  async handler({ period }: { period: string }) {
    // Get date range based on period
    const dateRange = getDateRangeForPeriod(period);
    
    // Get time tracking report
    const report = await timeTrackingService.getTimeTrackingReport({
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    });

    let totalTime = 0;
    const taskSummaries: TaskTimeSummary[] = [];
    
    if (report && report.data) {
      for (const userData of report.data) {
        totalTime += userData.time;
        
        // Process tasks for this user
        for (const taskId in userData.tasks) {
          const taskData = userData.tasks[taskId];
          taskSummaries.push({
            taskId: taskData.id,
            taskName: taskData.name,
            time: taskData.time,
            timeFormatted: formatDuration(taskData.time),
            percentage: Math.round((taskData.time / totalTime) * 100)
          });
        }
      }
    }
    
    // Sort by time spent (descending)
    taskSummaries.sort((a, b) => b.time - a.time);
    
    // Format response
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          period,
          date_range: {
            start: new Date(dateRange.start_date).toISOString(),
            end: new Date(dateRange.end_date).toISOString()
          },
          total_time: formatDuration(totalTime),
          tasks: taskSummaries
        }, null, 2)
      }]
    };
  }
};

/**
 * Input parameters for starting a timer
 */
interface StartTimerParams {
  taskId?: string;
  taskName?: string;
  listName?: string;
  description?: string;
  billable?: boolean;
  tags?: string[];
}

/**
 * Tool definition for starting a timer
 */
export const startTimerTool = {
  name: "start_timer",
  description: "Start a timer for tracking time on a specific task",
  inputSchema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to start timer for (preferred). Use this instead of taskName if you have it."
      },
      taskName: {
        type: "string",
        description: "Name of the task to start timer for. Warning: Task names may not be unique."
      },
      listName: {
        type: "string",
        description: "Name of the list containing the task. Helps find the right task when using taskName."
      },
      description: {
        type: "string",
        description: "Optional description for the time entry"
      },
      billable: {
        type: "boolean",
        description: "Whether the time entry is billable"
      },
      tags: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Optional tags for the time entry"
      }
    },
    required: []
  },
  async handler(params: StartTimerParams) {
    try {
      let targetTaskId = params.taskId;
      
      // If no taskId but taskName is provided, look up the task ID
      if (!targetTaskId && params.taskName) {
        let listId: string | undefined;
        
        // If listName is provided, find the list ID first
        if (params.listName) {
          const hierarchy = await workspaceService.getWorkspaceHierarchy();
          const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, params.listName, 'list');
          
          if (!listInfo) {
            throw new Error(`List "${params.listName}" not found`);
          }
          listId = listInfo.id;
        }
        
        // Now find the task
        const tasks = await taskService.getTasks(listId || '');
        const foundTask = tasks.find(t => t.name.toLowerCase() === params.taskName?.toLowerCase());
        
        if (!foundTask) {
          throw new Error(`Task "${params.taskName}" not found${params.listName ? ` in list "${params.listName}"` : ""}`);
        }
        targetTaskId = foundTask.id;
      }
      
      if (!targetTaskId) {
        throw new Error("Either taskId or taskName must be provided");
      }

      // Start the timer
      const timer = await timeTrackingService.startTimer({
        task_id: targetTaskId,
        description: params.description,
        billable: params.billable,
        tags: params.tags
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "Timer started",
            task_id: targetTaskId,
            task_name: timer.task.name,
            started_at: new Date(parseInt(timer.start)).toISOString(),
            description: params.description || ''
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "Error",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
};

/**
 * Tool definition for stopping a timer
 */
export const stopTimerTool = {
  name: "stop_timer",
  description: "Stop the currently running timer",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  async handler() {
    try {
      const stoppedTimer = await timeTrackingService.stopTimer();
      
      if (!stoppedTimer) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "No timer was running"
            }, null, 2)
          }]
        };
      }
      
      // Calculate duration
      const startTime = parseInt(stoppedTimer.start);
      const endTime = parseInt(stoppedTimer.end);
      const duration = endTime - startTime;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "Timer stopped",
            task: {
              id: stoppedTimer.task.id,
              name: stoppedTimer.task.name,
              url: stoppedTimer.task.url
            },
            duration: formatDuration(duration),
            duration_ms: duration,
            started_at: new Date(startTime).toISOString(),
            ended_at: new Date(endTime).toISOString(),
            description: stoppedTimer.description || ''
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "Error",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
};

/**
 * Tool definition for getting the current timer
 */
export const getCurrentTimerTool = {
  name: "get_current_timer",
  description: "Get information about the currently running timer",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  async handler() {
    try {
      const currentTimer = await timeTrackingService.getCurrentTimer();
      
      if (!currentTimer) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              status: "No timer running"
            }, null, 2)
          }]
        };
      }
      
      // Calculate elapsed time
      const startTime = parseInt(currentTimer.start);
      const now = Date.now();
      const elapsed = now - startTime;
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "Timer running",
            task: {
              id: currentTimer.task.id,
              name: currentTimer.task.name
            },
            started: new Date(startTime).toISOString(),
            running_for: formatDuration(elapsed),
            description: currentTimer.description || '',
            billable: currentTimer.billable || false,
            tags: currentTimer.tags || []
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "Error",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
};

/**
 * Time entry from the API response
 */
interface TimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
    url?: string;
  };
  duration: string;
  start: string;
  end?: string;
  description?: string;
  billable?: boolean;
  tags?: string[];
}

/**
 * Parameters for getting time history
 */
interface GetTimeHistoryParams {
  count?: number;
}

/**
 * Tool definition for getting time tracking history
 */
export const getTimeHistoryTool = {
  name: "get_time_history",
  description: "Get recent time tracking entries",
  inputSchema: {
    type: "object",
    properties: {
      count: {
        type: "number",
        description: "Number of recent entries to include (default: 10)"
      }
    },
    required: []
  },
  async handler({ count = 10 }: GetTimeHistoryParams) {
    try {
      // Get recent time entries
      const entries = await timeTrackingService.getTimeEntries();
      
      // Take only the requested number of entries
      const recentEntries = entries.slice(0, count);
      
      // Format entries
      const formattedEntries = recentEntries.map((entry: TimeEntry) => ({
        id: entry.id,
        task: {
          id: entry.task.id,
          name: entry.task.name
        },
        duration: formatDuration(parseInt(entry.duration || '0')),
        start: new Date(entry.start).toISOString(),
        end: entry.end ? new Date(entry.end).toISOString() : null,
        running: !entry.end,
        description: entry.description || '',
        billable: entry.billable || false,
        tags: entry.tags || []
      }));
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total: formattedEntries.length,
            entries: formattedEntries
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "Error",
            message: error.message
          }, null, 2)
        }]
      };
    }
  }
};