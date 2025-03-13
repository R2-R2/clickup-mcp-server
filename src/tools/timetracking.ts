/**
 * ClickUp MCP Time Tracking Tools
 * 
 * This module defines time tracking-related tools and their handlers.
 * It provides functionality for analyzing time entries, starting/stopping timers,
 * and generating time reports.
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  TimeTrackingFilters,
  TimeEntry
} from '../services/clickup/timetracking.js';
import { timeTrackingService } from '../services/shared.js';
import { findTaskIDByName } from './utils.js';
import { workspaceService, taskService } from '../services/shared.js';

// Helper function to format duration in milliseconds to human-readable format
function formatDuration(millis: number): string {
  const seconds = Math.floor((millis / 1000) % 60);
  const minutes = Math.floor((millis / (1000 * 60)) % 60);
  const hours = Math.floor((millis / (1000 * 60 * 60)));

  return `${hours}h ${minutes}m ${seconds}s`;
}

// Helper function for date formatting
function formatDate(timestamp: string | number): string {
  const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) : timestamp);
  return date.toLocaleString();
}

// Helper function to calculate date ranges based on period
function getDateRangeForPeriod(period: string): { start_date: string, end_date: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return {
        start_date: today.getTime().toString(),
        end_date: now.getTime().toString()
      };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start_date: yesterday.getTime().toString(),
        end_date: today.getTime().toString()
      };
    }
    case 'this_week': {
      const firstDayOfWeek = new Date(today);
      const day = today.getDay();
      // Adjust to get first day of week (Sunday = 0)
      firstDayOfWeek.setDate(today.getDate() - day);
      return {
        start_date: firstDayOfWeek.getTime().toString(),
        end_date: now.getTime().toString()
      };
    }
    case 'last_week': {
      const firstDayOfLastWeek = new Date(today);
      const day = today.getDay();
      // Adjust to get first day of last week
      firstDayOfLastWeek.setDate(today.getDate() - day - 7);
      const lastDayOfLastWeek = new Date(firstDayOfLastWeek);
      lastDayOfLastWeek.setDate(firstDayOfLastWeek.getDate() + 6);
      lastDayOfLastWeek.setHours(23, 59, 59, 999);
      return {
        start_date: firstDayOfLastWeek.getTime().toString(),
        end_date: lastDayOfLastWeek.getTime().toString()
      };
    }
    case 'this_month': {
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start_date: firstDayOfMonth.getTime().toString(),
        end_date: now.getTime().toString()
      };
    }
    case 'last_month': {
      const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      lastDayOfLastMonth.setHours(23, 59, 59, 999);
      return {
        start_date: firstDayOfLastMonth.getTime().toString(),
        end_date: lastDayOfLastMonth.getTime().toString()
      };
    }
    default:
      return {
        start_date: today.getTime().toString(),
        end_date: now.getTime().toString()
      };
  }
}

/**
 * Tool definition for getting time tracking data
 */
export const getTimeTrackingTool: Tool = {
  name: 'get_time_tracking',
  description: 'Get time tracking data with optional filtering by date range, tasks, or lists.',
  inputSchema: {
    type: 'object',
    properties: {
      start_date: {
        type: 'string',
        description: 'Start date for the time tracking report (ISO date string or Unix timestamp in ms)'
      },
      end_date: {
        type: 'string',
        description: 'End date for the time tracking report (ISO date string or Unix timestamp in ms)'
      },
      taskId: {
        type: 'string',
        description: 'Optional task ID to filter time entries for a specific task'
      },
      taskName: {
        type: 'string',
        description: 'Optional task name to filter time entries (will be resolved to task ID)'
      },
      listId: {
        type: 'string',
        description: 'Optional list ID to filter time entries'
      },
      listName: {
        type: 'string',
        description: 'Optional list name to filter time entries (will be resolved to list ID)'
      },
      format: {
        type: 'string',
        enum: ['detailed', 'summary'],
        description: 'Format of the response (detailed shows individual entries, summary shows aggregated time)'
      }
    }
  }
};

/**
 * Tool definition for starting a timer
 */
export const startTimerTool: Tool = {
  name: 'start_timer',
  description: 'Start a timer for a specific task. Use either taskId or taskName to identify the task.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'ID of the task to track time for'
      },
      taskName: {
        type: 'string',
        description: 'Name of the task to track time for (will be resolved to task ID)'
      },
      description: {
        type: 'string',
        description: 'Optional description for this time entry'
      },
      billable: {
        type: 'boolean',
        description: 'Whether this time entry is billable (default: false)'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional tags for this time entry'
      }
    }
  }
};

/**
 * Tool definition for stopping the current timer
 */
export const stopTimerTool: Tool = {
  name: 'stop_timer',
  description: 'Stop the currently running timer if any.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

/**
 * Tool definition for getting time tracking summary
 */
export const getTimeTrackingSummaryTool: Tool = {
  name: 'get_time_tracking_summary',
  description: 'Get summary of time tracked within a date range, grouped by tasks, with automatically selected date ranges like today, yesterday, this week, or this month.',
  inputSchema: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'custom'],
        description: 'Time period to generate report for'
      },
      start_date: {
        type: 'string',
        description: 'Custom start date (ISO date string or Unix timestamp in ms). Only used when period is "custom".'
      },
      end_date: {
        type: 'string',
        description: 'Custom end date (ISO date string or Unix timestamp in ms). Only used when period is "custom".'
      },
      groupBy: {
        type: 'string',
        enum: ['task', 'day', 'list', 'space'],
        description: 'How to group the time entries in the summary'
      }
    },
    required: ['period']
  }
};

/**
 * Tool definition for getting the current timer
 */
export const getCurrentTimerTool: Tool = {
  name: 'get_current_timer',
  description: 'Get information about the currently running timer if any.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

/**
 * Tool definition for adding a manual time entry
 */
export const addTimeEntryTool: Tool = {
  name: 'add_time_entry',
  description: 'Add a manual time entry for a task.',
  inputSchema: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'ID of the task to add time for'
      },
      taskName: {
        type: 'string',
        description: 'Name of the task to add time for (will be resolved to task ID)'
      },
      start: {
        type: 'string',
        description: 'Start time of the entry (ISO date string or Unix timestamp in ms)'
      },
      duration: {
        type: 'number',
        description: 'Duration in milliseconds'
      },
      description: {
        type: 'string',
        description: 'Optional description for this time entry'
      },
      billable: {
        type: 'boolean',
        description: 'Whether this time entry is billable (default: false)'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional tags for this time entry'
      }
    },
    required: ['duration']
  }
};

/**
 * Handler for get_time_tracking tool
 */
export async function handleGetTimeTracking(parameters: any) {
  const { start_date, end_date, taskId, taskName, listId, listName, format = 'detailed' } = parameters;
  
  // Set up filters
  const filters: TimeTrackingFilters = {};
  
  if (start_date) filters.start_date = start_date;
  if (end_date) filters.end_date = end_date;
  
  // If task name is provided, resolve it to task ID
  let taskIdToUse = taskId;
  if (taskName && !taskIdToUse) {
    taskIdToUse = await findTaskIDByName(taskName);
    if (!taskIdToUse) {
      throw new Error(`Task with name "${taskName}" not found`);
    }
  }
  
  if (taskIdToUse) {
    filters.task_id = taskIdToUse;
  }
  
  // If list name is provided, resolve it to list ID
  let listIdToUse = listId;
  if (listName && !listIdToUse) {
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    const listInfo = workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
    
    if (!listInfo) {
      throw new Error(`List with name "${listName}" not found`);
    }
    listIdToUse = listInfo.id;
  }
  
  if (listIdToUse) {
    filters.list_id = listIdToUse;
  }
  
  try {
    if (format === 'summary') {
      // For summary format, get the time tracking report and process it
      const report = await timeTrackingService.getTimeTrackingReport(filters);
      
      let totalTime = 0;
      const taskSummaries: any[] = [];
      
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
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalTime,
            totalTimeFormatted: formatDuration(totalTime),
            tasks: taskSummaries,
            dateRange: {
              start: start_date ? formatDate(start_date) : undefined,
              end: end_date ? formatDate(end_date) : undefined
            }
          }, null, 2)
        }]
      };
    } else {
      // For detailed format, get the individual time entries
      const entries = await timeTrackingService.getTimeEntries(filters);
      
      // Format the entries
      const formattedEntries = entries.map(entry => ({
        id: entry.id,
        taskId: entry.task.id,
        taskName: entry.task.name,
        description: entry.description,
        start: formatDate(entry.start),
        end: entry.end ? formatDate(entry.end) : undefined,
        billable: entry.billable,
        duration: entry.duration ? parseInt(entry.duration) : undefined,
        durationFormatted: entry.duration ? formatDuration(parseInt(entry.duration)) : undefined,
        tags: entry.tags
      }));
      
      // Calculate total time
      let totalTime = 0;
      for (const entry of formattedEntries) {
        if (entry.duration) {
          totalTime += entry.duration;
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalTime,
            totalTimeFormatted: formatDuration(totalTime),
            entries: formattedEntries,
            count: formattedEntries.length,
            dateRange: {
              start: start_date ? formatDate(start_date) : undefined,
              end: end_date ? formatDate(end_date) : undefined
            }
          }, null, 2)
        }]
      };
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting time tracking data: ${error.message}`
      }]
    };
  }
}

/**
 * Handler for start_timer tool
 */
export async function handleStartTimer(parameters: any) {
  const { taskId, taskName, description, billable, tags } = parameters;
  
  // Resolve task ID if task name is provided
  let taskIdToUse = taskId;
  if (taskName && !taskIdToUse) {
    taskIdToUse = await findTaskIDByName(taskName);
    if (!taskIdToUse) {
      throw new Error(`Task with name "${taskName}" not found`);
    }
  }
  
  if (!taskIdToUse) {
    throw new Error('Either taskId or taskName must be provided');
  }
  
  try {
    // Check if there's already a timer running
    const currentTimer = await timeTrackingService.getCurrentTimer();
    if (currentTimer) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: `There's already a timer running for task "${currentTimer.task.name}". Please stop it first.`,
            currentTimer: {
              taskId: currentTimer.task.id,
              taskName: currentTimer.task.name,
              started: formatDate(currentTimer.start),
              description: currentTimer.description
            }
          }, null, 2)
        }]
      };
    }
    
    // Start the timer
    const timeEntry = await timeTrackingService.startTimer(taskIdToUse, {
      description: description || '',
      billable: billable !== undefined ? billable : false,
      tags: tags || []
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Timer started for task "${timeEntry.task.name}"`,
          timeEntry: {
            id: timeEntry.id,
            taskId: timeEntry.task.id,
            taskName: timeEntry.task.name,
            description: timeEntry.description,
            started: formatDate(timeEntry.start),
            billable: timeEntry.billable,
            tags: timeEntry.tags
          }
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error starting timer: ${error.message}`
      }]
    };
  }
}

/**
 * Handler for stop_timer tool
 */
export async function handleStopTimer() {
  try {
    // Check if there's a timer running
    const currentTimer = await timeTrackingService.getCurrentTimer();
    if (!currentTimer) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: 'No timer is currently running'
          }, null, 2)
        }]
      };
    }
    
    // Stop the timer
    const timeEntry = await timeTrackingService.stopTimer();
    
    // Calculate duration
    const duration = timeEntry.end && timeEntry.start ? 
      parseInt(timeEntry.end) - parseInt(timeEntry.start) : 
      undefined;
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Timer stopped for task "${timeEntry.task.name}"`,
          timeEntry: {
            id: timeEntry.id,
            taskId: timeEntry.task.id,
            taskName: timeEntry.task.name,
            description: timeEntry.description,
            started: formatDate(timeEntry.start),
            ended: timeEntry.end ? formatDate(timeEntry.end) : undefined,
            duration: duration,
            durationFormatted: duration ? formatDuration(duration) : undefined,
            billable: timeEntry.billable,
            tags: timeEntry.tags
          }
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error stopping timer: ${error.message}`
      }]
    };
  }
}

/**
 * Handler for get_time_tracking_summary tool
 */
export async function handleGetTimeTrackingSummary(parameters: any) {
  const { period, start_date, end_date, groupBy = 'task' } = parameters;
  
  try {
    // Determine date range based on period
    let dateRange = { start_date: '', end_date: '' };
    
    if (period === 'custom') {
      if (!start_date || !end_date) {
        throw new Error('Custom period requires both start_date and end_date');
      }
      dateRange = { start_date, end_date };
    } else {
      dateRange = getDateRangeForPeriod(period);
    }
    
    // Get time tracking report with date range
    const report = await timeTrackingService.getTimeTrackingReport({
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    });
    
    // Process report based on groupBy parameter
    let totalTime = 0;
    const summaryItems: Record<string, any> = {};
    
    if (report && report.data) {
      for (const userData of report.data) {
        totalTime += userData.time;
        
        // Process tasks for this user based on groupBy parameter
        for (const taskId in userData.tasks) {
          const taskData = userData.tasks[taskId];
          const task = await taskService.getTask(taskId);
          
          // Determine grouping key based on groupBy parameter
          let groupingKey = '';
          let groupName = '';
          
          switch (groupBy) {
            case 'task':
              groupingKey = taskId;
              groupName = taskData.name;
              break;
            case 'list':
              groupingKey = task.list.id;
              groupName = task.list.name;
              break;
            case 'space':
              groupingKey = task.space.id;
              groupName = task.space.name;
              break;
            case 'day': {
              // Group by day (using the start date of the task's time entries)
              const entries = await timeTrackingService.getTimeEntries({
                task_id: taskId,
                start_date: dateRange.start_date,
                end_date: dateRange.end_date
              });
              
              // Process each entry separately for day grouping
              for (const entry of entries) {
                const entryDate = new Date(parseInt(entry.start));
                const dayKey = `${entryDate.getFullYear()}-${entryDate.getMonth() + 1}-${entryDate.getDate()}`;
                const entryDuration = entry.duration ? parseInt(entry.duration) : 0;
                
                if (!summaryItems[dayKey]) {
                  summaryItems[dayKey] = {
                    groupName: formatDate(entryDate).split(',')[0], // Just the date part
                    time: 0,
                    tasks: {}
                  };
                }
                
                summaryItems[dayKey].time += entryDuration;
                
                // Track tasks within this day
                if (!summaryItems[dayKey].tasks[taskId]) {
                  summaryItems[dayKey].tasks[taskId] = {
                    id: taskId,
                    name: task.name,
                    time: 0
                  };
                }
                
                summaryItems[dayKey].tasks[taskId].time += entryDuration;
              }
              
              // Skip the regular grouping for day since we've already processed it
              continue;
            }
            default:
              groupingKey = taskId;
              groupName = taskData.name;
          }
          
          if (groupBy !== 'day') {
            // For non-day grouping
            if (!summaryItems[groupingKey]) {
              summaryItems[groupingKey] = {
                groupName,
                time: 0,
                tasks: {}
              };
            }
            
            summaryItems[groupingKey].time += taskData.time;
            
            // Track tasks within this group
            if (!summaryItems[groupingKey].tasks[taskId]) {
              summaryItems[groupingKey].tasks[taskId] = {
                id: taskId,
                name: task.name,
                time: 0
              };
            }
            
            summaryItems[groupingKey].tasks[taskId].time += taskData.time;
          }
        }
      }
    }
    
    // Convert summaryItems from object to array and add formatting
    const summaryArray = Object.keys(summaryItems).map(key => {
      const item = summaryItems[key];
      
      // Convert tasks object to array
      const tasksArray = Object.keys(item.tasks).map(taskId => ({
        id: taskId,
        name: item.tasks[taskId].name,
        time: item.tasks[taskId].time,
        timeFormatted: formatDuration(item.tasks[taskId].time),
        percentage: Math.round((item.tasks[taskId].time / item.time) * 100)
      }));
      
      // Sort tasks by time (descending)
      tasksArray.sort((a, b) => b.time - a.time);
      
      return {
        groupKey: key,
        groupName: item.groupName,
        time: item.time,
        timeFormatted: formatDuration(item.time),
        percentage: Math.round((item.time / totalTime) * 100),
        tasks: tasksArray
      };
    });
    
    // Sort groups by time (descending)
    summaryArray.sort((a, b) => b.time - a.time);
    
    // Format the period in human-readable text
    let periodText = '';
    switch (period) {
      case 'today': periodText = 'Today'; break;
      case 'yesterday': periodText = 'Yesterday'; break;
      case 'this_week': periodText = 'This week'; break;
      case 'last_week': periodText = 'Last week'; break;
      case 'this_month': periodText = 'This month'; break;
      case 'last_month': periodText = 'Last month'; break;
      case 'custom': periodText = 'Custom period'; break;
    }
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          period: periodText,
          groupedBy: groupBy,
          totalTime,
          totalTimeFormatted: formatDuration(totalTime),
          dateRange: {
            start: formatDate(parseInt(dateRange.start_date)),
            end: formatDate(parseInt(dateRange.end_date))
          },
          summary: summaryArray
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting time tracking summary: ${error.message}`
      }]
    };
  }
}

/**
 * Handler for get_current_timer tool
 */
export async function handleGetCurrentTimer() {
  try {
    const currentTimer = await timeTrackingService.getCurrentTimer();
    
    if (!currentTimer) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            running: false,
            message: 'No timer is currently running'
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
        type: 'text',
        text: JSON.stringify({
          running: true,
          timeEntry: {
            id: currentTimer.id,
            taskId: currentTimer.task.id,
            taskName: currentTimer.task.name,
            description: currentTimer.description,
            started: formatDate(currentTimer.start),
            elapsedTime: elapsed,
            elapsedTimeFormatted: formatDuration(elapsed),
            billable: currentTimer.billable,
            tags: currentTimer.tags
          }
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error getting current timer: ${error.message}`
      }]
    };
  }
}

/**
 * Handler for add_time_entry tool
 */
export async function handleAddTimeEntry(parameters: any) {
  const { taskId, taskName, start, duration, description, billable, tags } = parameters;
  
  if (!duration) {
    throw new Error('Duration is required');
  }
  
  // Resolve task ID if task name is provided
  let taskIdToUse = taskId;
  if (taskName && !taskIdToUse) {
    taskIdToUse = await findTaskIDByName(taskName);
    if (!taskIdToUse) {
      throw new Error(`Task with name "${taskName}" not found`);
    }
  }
  
  if (!taskIdToUse) {
    throw new Error('Either taskId or taskName must be provided');
  }
  
  try {
    // Use current time if start is not provided
    const startTime = start ? (typeof start === 'string' ? parseInt(start) : start) : Date.now();
    
    // Add the time entry
    const timeEntry = await timeTrackingService.addTimeEntry(
      taskIdToUse,
      startTime,
      duration,
      {
        description: description || '',
        billable: billable !== undefined ? billable : false,
        tags: tags || []
      }
    );
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: `Time entry added for task "${timeEntry.task.name}"`,
          timeEntry: {
            id: timeEntry.id,
            taskId: timeEntry.task.id,
            taskName: timeEntry.task.name,
            description: timeEntry.description,
            start: formatDate(timeEntry.start),
            end: timeEntry.end ? formatDate(timeEntry.end) : undefined,
            duration: timeEntry.duration ? parseInt(timeEntry.duration) : undefined,
            durationFormatted: timeEntry.duration ? formatDuration(parseInt(timeEntry.duration)) : undefined,
            billable: timeEntry.billable,
            tags: timeEntry.tags
          }
        }, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error adding time entry: ${error.message}`
      }]
    };
  }
}

// Helper function to find a task ID by name
export async function findTaskIDByName(taskName: string): Promise<string | undefined> {
  try {
    // Get all tasks and find the one matching the name
    const hierarchy = await workspaceService.getWorkspaceHierarchy();
    
    // Look through all lists
    for (const spaceNode of hierarchy.root.children) {
      // Check direct lists in space
      for (const listNode of spaceNode.children.filter(c => c.type === 'list')) {
        const tasks = await taskService.getTasks(listNode.id);
        const task = tasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
        if (task) {
          return task.id;
        }
      }
      
      // Check lists in folders
      for (const folderNode of spaceNode.children.filter(c => c.type === 'folder')) {
        for (const listNode of folderNode.children.filter(c => c.type === 'list')) {
          const tasks = await taskService.getTasks(listNode.id);
          const task = tasks.find(t => t.name.toLowerCase() === taskName.toLowerCase());
          if (task) {
            return task.id;
          }
        }
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error finding task by name:', error);
    return undefined;
  }
}
