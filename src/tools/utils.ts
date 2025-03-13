/**
 * ClickUp MCP Utilities
 * 
 * This module provides shared utility functions for the MCP server tools.
 */

import { WorkspaceService } from '../services/clickup/workspace.js';
import { workspaceService, taskService } from '../services/shared.js';

/**
 * Parse a string date into Unix timestamp milliseconds
 * @param date ISO date string, Unix timestamp (string or number), or natural language date
 * @returns Unix timestamp in milliseconds
 */
export function parseDueDate(date: string | number): number | undefined {
  if (date === undefined || date === null) {
    return undefined;
  }
  
  if (typeof date === 'number') {
    return date;
  }
  
  // If it's a simple number string, parse as int
  if (/^\d+$/.test(date)) {
    return parseInt(date, 10);
  }
  
  // Try to parse as ISO date string
  try {
    const parsed = new Date(date).getTime();
    if (!isNaN(parsed)) {
      return parsed;
    }
  } catch {
    // Continue to other methods if this fails
  }
  
  // Fall back to regular Date parsing
  try {
    return new Date(date).getTime();
  } catch (error) {
    console.error(`Failed to parse date: ${date}`, error);
    return undefined;
  }
}

/**
 * Format a Unix timestamp (in milliseconds) to a readable date string
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatDueDate(timestamp: number): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch (error) {
    console.error(`Failed to format date: ${timestamp}`, error);
    return 'Invalid date';
  }
}

/**
 * Find a list ID by name using the workspace hierarchy
 * @param workspaceService The workspace service instance
 * @param listName The name of the list to find
 * @returns The list information object or undefined if not found
 */
export async function findListIDByName(
  workspaceService: WorkspaceService,
  listName: string
): Promise<{ id: string; name: string } | undefined> {
  const hierarchy = await workspaceService.getWorkspaceHierarchy();
  return workspaceService.findIDByNameInHierarchy(hierarchy, listName, 'list');
}

/**
 * Find a task ID by name across all lists
 * @param taskName The task name to search for
 * @returns The task ID or undefined if not found
 */
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
