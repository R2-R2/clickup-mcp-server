/**
 * ClickUp Time Tracking Service
 * 
 * This service provides methods for interacting with ClickUp's time tracking features.
 * It supports retrieving time tracked for tasks, starting/stopping timers, and getting
 * time tracking reports.
 */

import { BaseClickUpService, ClickUpServiceError, ErrorCode, ServiceResponse } from './base.js';
import { WorkspaceService } from './workspace.js';

export interface TimeEntry {
  id: string;
  task: {
    id: string;
    name: string;
    status?: {
      status: string;
      color: string;
    };
  };
  wid: string;
  user: {
    id: number;
    username: string;
    email: string;
    profilePicture?: string;
  };
  billable: boolean;
  start: string;
  end?: string;
  duration: string;
  description: string;
  tags: string[];
  source: string;
  at: string;
  task_location: {
    list_id: string;
    folder_id?: string;
    space_id: string;
  };
}

export interface TimeReport {
  data: TimeReportData[];
}

export interface TimeReportData {
  user: {
    id: number;
    username: string;
    email: string;
  };
  time: number; // Duration in milliseconds
  tasks: {
    [taskId: string]: {
      id: string;
      name: string;
      time: number; // Duration in milliseconds
    };
  };
}

export interface StartTimerOptions {
  description?: string;
  billable?: boolean;
  tags?: string[];
}

export interface TimeTrackingFilters {
  start_date?: string;  // ISO string or Unix timestamp in ms
  end_date?: string;    // ISO string or Unix timestamp in ms
  assignee?: number | string; // User ID
  include_location_names?: boolean;
  space_id?: string;
  folder_id?: string;
  list_id?: string;
  task_id?: string;
  custom_task_ids?: boolean;
  team_id?: string;
}

/**
 * Service class for ClickUp time tracking operations
 */
export class TimeTrackingService extends BaseClickUpService {
  private workspaceService: WorkspaceService;

  /**
   * Creates a TimeTrackingService instance
   */
  constructor(apiKey: string, teamId: string, baseUrl?: string, workspaceService?: WorkspaceService) {
    super(apiKey, teamId, baseUrl);
    this.workspaceService = workspaceService || new WorkspaceService(apiKey, teamId, baseUrl);
  }

  /**
   * Get time entries with filtering options
   * @param filters Optional filters for time entries
   * @returns Promise with time entries
   */
  async getTimeEntries(filters: TimeTrackingFilters = {}): Promise<TimeEntry[]> {
    try {
      // Build the URL with query parameters
      let url = `/team/${this.teamId}/time_entries`;

      // Add query parameters from filters
      const queryParams: string[] = [];
      if (filters.start_date) queryParams.push(`start_date=${filters.start_date}`);
      if (filters.end_date) queryParams.push(`end_date=${filters.end_date}`);
      if (filters.assignee) queryParams.push(`assignee=${filters.assignee}`);
      if (filters.include_location_names) queryParams.push(`include_location_names=true`);
      if (filters.space_id) queryParams.push(`space_id=${filters.space_id}`);
      if (filters.folder_id) queryParams.push(`folder_id=${filters.folder_id}`);
      if (filters.list_id) queryParams.push(`list_id=${filters.list_id}`);
      if (filters.task_id) queryParams.push(`task_id=${filters.task_id}`);
      if (filters.custom_task_ids) queryParams.push(`custom_task_ids=true`);
      if (filters.team_id) queryParams.push(`team_id=${filters.team_id}`);

      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      // Make the API request
      const response = await this.makeRequest(() => this.client.get(url));
      
      if (!response.data || !response.data.data) {
        throw new ClickUpServiceError(
          'Invalid API response structure from time entries endpoint',
          ErrorCode.SERVER_ERROR,
          response.data
        );
      }

      return response.data.data as TimeEntry[];
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to get time entries: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * Get a time tracking report
   * @param filters Optional filters for the report
   * @returns Promise with time report data
   */
  async getTimeTrackingReport(filters: TimeTrackingFilters = {}): Promise<TimeReport> {
    try {
      // Build the URL with query parameters
      let url = `/team/${this.teamId}/time_tracking/report`;

      // Add query parameters from filters
      const queryParams: string[] = [];
      if (filters.start_date) queryParams.push(`start_date=${filters.start_date}`);
      if (filters.end_date) queryParams.push(`end_date=${filters.end_date}`);
      if (filters.assignee) queryParams.push(`assignee=${filters.assignee}`);
      if (filters.space_id) queryParams.push(`space_id=${filters.space_id}`);
      if (filters.folder_id) queryParams.push(`folder_id=${filters.folder_id}`);
      if (filters.list_id) queryParams.push(`list_id=${filters.list_id}`);
      if (filters.task_id) queryParams.push(`task_id=${filters.task_id}`);
      if (filters.custom_task_ids) queryParams.push(`custom_task_ids=true`);

      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      // Make the API request
      const response = await this.makeRequest(() => this.client.get(url));
      
      if (!response.data) {
        throw new ClickUpServiceError(
          'Invalid API response structure from time tracking report endpoint',
          ErrorCode.SERVER_ERROR,
          response.data
        );
      }

      return response.data as TimeReport;
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to get time tracking report: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * Start a timer for a specific task
   * @param taskId ID of the task to track time for
   * @param options Optional timer settings (description, billable, tags)
   * @returns Promise with the created time entry
   */
  async startTimer(taskId: string, options: StartTimerOptions = {}): Promise<TimeEntry> {
    try {
      const url = `/team/${this.teamId}/time_entries/start`;
      
      const payload = {
        tid: taskId,
        description: options.description || '',
        billable: options.billable !== undefined ? options.billable : false,
        tags: options.tags || []
      };

      // Make the API request
      const response = await this.makeRequest(() => this.client.post(url, payload));
      
      if (!response.data || !response.data.data) {
        throw new ClickUpServiceError(
          'Invalid API response structure from start timer endpoint',
          ErrorCode.SERVER_ERROR,
          response.data
        );
      }

      return response.data.data as TimeEntry;
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to start timer: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * Stop the currently running timer
   * @returns Promise with the completed time entry
   */
  async stopTimer(): Promise<TimeEntry> {
    try {
      const url = `/team/${this.teamId}/time_entries/stop`;
      
      // Make the API request
      const response = await this.makeRequest(() => this.client.post(url));
      
      if (!response.data || !response.data.data) {
        throw new ClickUpServiceError(
          'Invalid API response structure from stop timer endpoint',
          ErrorCode.SERVER_ERROR,
          response.data
        );
      }

      return response.data.data as TimeEntry;
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to stop timer: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * Get the currently running timer if any
   * @returns Promise with the current time entry or null if no timer is running
   */
  async getCurrentTimer(): Promise<TimeEntry | null> {
    try {
      const url = `/team/${this.teamId}/time_entries/current`;
      
      // Make the API request
      const response = await this.makeRequest(() => this.client.get(url));
      
      if (!response.data) {
        throw new ClickUpServiceError(
          'Invalid API response structure from current timer endpoint',
          ErrorCode.SERVER_ERROR,
          response.data
        );
      }

      // If no timer is running, the API returns an empty object
      if (!response.data.data) {
        return null;
      }

      return response.data.data as TimeEntry;
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to get current timer: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * Delete a time entry
   * @param timeEntryId ID of the time entry to delete
   * @returns Promise with success indication
   */
  async deleteTimeEntry(timeEntryId: string): Promise<ServiceResponse<boolean>> {
    try {
      const url = `/team/${this.teamId}/time_entries/${timeEntryId}`;
      
      // Make the API request
      const response = await this.makeRequest(() => this.client.delete(url));
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to delete time entry: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * Add a time entry manually
   * @param taskId ID of the task
   * @param start Start time (Unix timestamp in milliseconds)
   * @param duration Duration in milliseconds
   * @param options Additional options (description, billable, tags)
   * @returns Promise with the created time entry
   */
  async addTimeEntry(
    taskId: string, 
    start: number, 
    duration: number, 
    options: StartTimerOptions = {}
  ): Promise<TimeEntry> {
    try {
      const url = `/team/${this.teamId}/time_entries`;
      
      const payload = {
        tid: taskId,
        start,
        duration,
        description: options.description || '',
        billable: options.billable !== undefined ? options.billable : false,
        tags: options.tags || []
      };

      // Make the API request
      const response = await this.makeRequest(() => this.client.post(url, payload));
      
      if (!response.data || !response.data.data) {
        throw new ClickUpServiceError(
          'Invalid API response structure from add time entry endpoint',
          ErrorCode.SERVER_ERROR,
          response.data
        );
      }

      return response.data.data as TimeEntry;
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to add time entry: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * Calculate total time tracked with optional filtering
   * @param filters Optional filters for time entries
   * @returns Promise with the total time in milliseconds
   */
  async getTotalTimeTracked(filters: TimeTrackingFilters = {}): Promise<number> {
    try {
      const report = await this.getTimeTrackingReport(filters);
      
      let totalTime = 0;
      if (report && report.data) {
        for (const userData of report.data) {
          totalTime += userData.time;
        }
      }

      return totalTime;
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to calculate total time tracked: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }

  /**
   * Get time tracked for a specific task
   * @param taskId ID of the task
   * @param filters Optional additional filters
   * @returns Promise with the total time in milliseconds
   */
  async getTaskTimeTracked(taskId: string, filters: TimeTrackingFilters = {}): Promise<number> {
    try {
      // Update filters to include the task ID
      const taskFilters = { ...filters, task_id: taskId };
      
      const report = await this.getTimeTrackingReport(taskFilters);
      
      let totalTime = 0;
      if (report && report.data) {
        for (const userData of report.data) {
          // Check if this user has tracked time for this task
          if (userData.tasks && userData.tasks[taskId]) {
            totalTime += userData.tasks[taskId].time;
          }
        }
      }

      return totalTime;
    } catch (error) {
      if (error instanceof ClickUpServiceError) {
        throw error;
      }
      throw new ClickUpServiceError(
        `Failed to get task time tracked: ${(error as Error).message}`,
        ErrorCode.UNKNOWN,
        error
      );
    }
  }
}
