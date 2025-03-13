/**
 * ClickUp MCP Time Tracking Resources
 * 
 * This module provides resources for time tracking reports, making them
 * accessible as context for MCP-enabled AI assistants.
 */

import { timeTrackingService } from '../services/shared.js';
import { getDateRangeForPeriod } from '../tools/timetracking.js';
import { formatDuration } from '../tools/timetracking.js';

// Helper function for date formatting
function formatDate(timestamp: string | number): string {
  const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) : timestamp);
  return date.toLocaleString();
}

/**
 * Get time tracking report for a specific period
 * @param period The time period to get report for
 * @returns The report as a markdown string
 */
export async function getTimeTrackingReportAsText(period: string): Promise<string> {
  try {
    // Get date range based on period
    const dateRange = getDateRangeForPeriod(period);
    
    // Get time tracking report
    const report = await timeTrackingService.getTimeTrackingReport({
      start_date: dateRange.start_date,
      end_date: dateRange.end_date
    });

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

    // Format period name
    let periodName = '';
    switch (period) {
      case 'today': periodName = 'Today'; break;
      case 'yesterday': periodName = 'Yesterday'; break;
      case 'this_week': periodName = 'This Week'; break;
      case 'last_week': periodName = 'Last Week'; break;
      case 'this_month': periodName = 'This Month'; break;
      case 'last_month': periodName = 'Last Month'; break;
      default: periodName = 'Custom Period';
    }

    // Generate markdown report
    let markdown = `# Time Tracking Report: ${periodName}\n\n`;
    
    markdown += `**Period:** ${formatDate(dateRange.start_date)} to ${formatDate(dateRange.end_date)}\n`;
    markdown += `**Total Time Tracked:** ${formatDuration(totalTime)}\n\n`;
    
    if (taskSummaries.length === 0) {
      markdown += 'No time entries found for this period.\n';
    } else {
      markdown += '## Tasks Breakdown\n\n';
      markdown += '| Task | Time | Percentage |\n';
      markdown += '|------|------|------------|\n';
      
      for (const task of taskSummaries) {
        markdown += `| ${task.taskName} | ${task.timeFormatted} | ${task.percentage}% |\n`;
      }
    }
    
    return markdown;
  } catch (error: any) {
    return `Error generating time tracking report: ${error.message}`;
  }
}

/**
 * Get current timer status
 * @returns Current timer status as markdown
 */
export async function getCurrentTimerAsText(): Promise<string> {
  try {
    const currentTimer = await timeTrackingService.getCurrentTimer();
    
    if (!currentTimer) {
      return '# Timer Status\n\nNo timer is currently running.';
    }
    
    // Calculate elapsed time
    const startTime = parseInt(currentTimer.start);
    const now = Date.now();
    const elapsed = now - startTime;
    
    let markdown = '# Current Timer Status\n\n';
    markdown += `**Task:** ${currentTimer.task.name}\n`;
    markdown += `**Started:** ${formatDate(currentTimer.start)}\n`;
    markdown += `**Running For:** ${formatDuration(elapsed)}\n`;
    
    if (currentTimer.description) {
      markdown += `**Description:** ${currentTimer.description}\n`;
    }
    
    if (currentTimer.billable) {
      markdown += '**Billable:** Yes\n';
    }
    
    if (currentTimer.tags && currentTimer.tags.length > 0) {
      markdown += `**Tags:** ${currentTimer.tags.join(', ')}\n`;
    }
    
    return markdown;
  } catch (error: any) {
    return `Error getting current timer: ${error.message}`;
  }
}

/**
 * Get time tracking history
 * @param count Number of recent entries to include
 * @returns Time tracking history as markdown
 */
export async function getTimeTrackingHistoryAsText(count: number = 10): Promise<string> {
  try {
    // Get recent time entries
    const entries = await timeTrackingService.getTimeEntries();
    
    // Take only the requested number of entries
    const recentEntries = entries.slice(0, count);
    
    let markdown = '# Recent Time Entries\n\n';
    
    if (recentEntries.length === 0) {
      markdown += 'No recent time entries found.\n';
    } else {
      for (const entry of recentEntries) {
        markdown += `## ${entry.task.name}\n`;
        markdown += `**Time:** ${formatDuration(parseInt(entry.duration || '0'))}\n`;
        markdown += `**When:** ${formatDate(entry.start)}`;
        
        if (entry.end) {
          markdown += ` to ${formatDate(entry.end)}\n`;
        } else {
          markdown += ' (Running)\n';
        }
        
        if (entry.description) {
          markdown += `**Description:** ${entry.description}\n`;
        }
        
        if (entry.billable) {
          markdown += '**Billable:** Yes\n';
        }
        
        if (entry.tags && entry.tags.length > 0) {
          markdown += `**Tags:** ${entry.tags.join(', ')}\n`;
        }
        
        markdown += '\n';
      }
    }
    
    return markdown;
  } catch (error: any) {
    return `Error getting time tracking history: ${error.message}`;
  }
}