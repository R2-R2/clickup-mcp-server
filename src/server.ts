import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClickUpServices } from "./services/clickup/index.js";
import config from "./config.js";
import { workspaceHierarchyTool, handleGetWorkspaceHierarchy } from "./tools/workspace.js";
import {
  createTaskTool, handleCreateTask,
  updateTaskTool, handleUpdateTask,
  moveTaskTool, handleMoveTask,
  duplicateTaskTool, handleDuplicateTask,
  getTaskTool, handleGetTask,
  getTasksTool, handleGetTasks,
  deleteTaskTool, handleDeleteTask,
  createBulkTasksTool, handleCreateBulkTasks,
  updateBulkTasksTool, handleUpdateBulkTasks,
  moveBulkTasksTool, handleMoveBulkTasks,
  deleteBulkTasksTool, handleDeleteBulkTasks
} from "./tools/task.js";
import {
  createListTool, handleCreateList,
  createListInFolderTool, handleCreateListInFolder,
  getListTool, handleGetList,
  updateListTool, handleUpdateList,
  deleteListTool, handleDeleteList
} from "./tools/list.js";
import {
  createFolderTool, handleCreateFolder,
  getFolderTool, handleGetFolder,
  updateFolderTool, handleUpdateFolder,
  deleteFolderTool, handleDeleteFolder
} from "./tools/folder.js";
import {
  getTimeTrackingTool, handleGetTimeTracking,
  startTimerTool, handleStartTimer,
  stopTimerTool, handleStopTimer,
  getTimeTrackingSummaryTool, handleGetTimeTrackingSummary,
  getCurrentTimerTool, handleGetCurrentTimer,
  addTimeEntryTool, handleAddTimeEntry
} from "./tools/timetracking.js";
import { getResourceList, getResourceContent } from "./resources/index.js";
import { getAllPrompts, handlePrompt } from "./prompts/index.js";

// Initialize ClickUp services
const services = createClickUpServices({
  apiKey: config.clickupApiKey,
  teamId: config.clickupTeamId
});

// Extract the workspace service for use in this module
const { workspace } = services;

/**
 * MCP Server for ClickUp integration
 */
export const server = new Server(
  {
    name: "clickup-mcp-server",
    version: "0.5.0", // Bump version for time tracking feature
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  }
);

/**
 * Configure the server routes and handlers
 */
export function configureServer() {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Workspace tools
        workspaceHierarchyTool,
        
        // Task tools
        createTaskTool,
        getTaskTool,
        getTasksTool,
        updateTaskTool,
        moveTaskTool,
        duplicateTaskTool,
        deleteTaskTool,
        createBulkTasksTool,
        updateBulkTasksTool,
        moveBulkTasksTool,
        deleteBulkTasksTool,
        
        // List tools
        createListTool,
        createListInFolderTool,
        getListTool,
        updateListTool,
        deleteListTool,
        
        // Folder tools
        createFolderTool,
        getFolderTool,
        updateFolderTool,
        deleteFolderTool,
        
        // Time tracking tools
        getTimeTrackingTool,
        startTimerTool,
        stopTimerTool,
        getTimeTrackingSummaryTool,
        getCurrentTimerTool,
        addTimeEntryTool
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: params } = req.params;
    
    // Handle tool calls by routing to the appropriate handler
    switch (name) {
      // Workspace handlers
      case "get_workspace_hierarchy":
        return handleGetWorkspaceHierarchy();
      
      // Task handlers
      case "create_task":
        return handleCreateTask(params);
      case "update_task":
        return handleUpdateTask(params);
      case "move_task":
        return handleMoveTask(params);
      case "duplicate_task":
        return handleDuplicateTask(params);
      case "get_task":
        return handleGetTask(params);
      case "get_tasks":
        return handleGetTasks(params);
      case "delete_task":
        return handleDeleteTask(params);
      case "create_bulk_tasks":
        return handleCreateBulkTasks(params);
      case "update_bulk_tasks":
        return handleUpdateBulkTasks(params as { tasks: any[] });
      case "move_bulk_tasks":
        return handleMoveBulkTasks(params as { tasks: any[], targetListId?: string, targetListName?: string });
      case "delete_bulk_tasks":
        return handleDeleteBulkTasks(params as { tasks: any[] });
      
      // List handlers
      case "create_list":
        return handleCreateList(params);
      case "create_list_in_folder":
        return handleCreateListInFolder(params);
      case "get_list":
        return handleGetList(params);
      case "update_list":
        return handleUpdateList(params);
      case "delete_list":
        return handleDeleteList(params);
      
      // Folder handlers
      case "create_folder":
        return handleCreateFolder(params);
      case "get_folder":
        return handleGetFolder(params);
      case "update_folder":
        return handleUpdateFolder(params);
      case "delete_folder":
        return handleDeleteFolder(params);
      
      // Time tracking handlers
      case "get_time_tracking":
        return handleGetTimeTracking(params);
      case "start_timer":
        return handleStartTimer(params);
      case "stop_timer":
        return handleStopTimer();
      case "get_time_tracking_summary":
        return handleGetTimeTrackingSummary(params);
      case "get_current_timer":
        return handleGetCurrentTimer();
      case "add_time_entry":
        return handleAddTimeEntry(params);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  // Setup prompts handlers
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return { prompts: getAllPrompts() };
  });

  server.setRequestHandler(GetPromptRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    
    try {
      return await handlePrompt(name, args);
    } catch (error: any) {
      throw new Error(`Error handling prompt ${name}: ${error.message}`);
    }
  });

  // Setup resources handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = await getResourceList();
    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const { uri } = req.params;
    
    const content = await getResourceContent(uri);
    
    if (!content) {
      throw new Error(`Resource not found: ${uri}`);
    }
    
    return {
      contents: [
        {
          uri,
          text: content,
          mimeType: "text/markdown"
        }
      ]
    };
  });

  return server;
}

/**
 * Export the clickup service for use in tool handlers
 */
export { workspace };