/**
 * ClickUp Time Tracking Service
 * 
 * This service handles time tracking functionalities including:
 * - Getting time tracking reports
 * - Managing timers (start, stop, check)
 * - Retrieving time entries
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { BaseClickUpService, ClickUpServiceError, ErrorCode } from './base.js';

/**
 * Parameters for time tracking report
 */
export interface TimeTrackingReportParams {
  start_date: number;
  end_date: number;
}

/**
 * Start timer parameters
 */
export interface StartTimerParams {
  task_id: string;
  description?: string;
  billable?: boolean;
  tags?: string[];
}

/**
 * Manual time entry parameters
 */
export interface CreateTimeEntryParams {
  task_id: string;
  start: number;
  duration: number;
  description?: string;
  billable?: boolean;
  tags?: string[];
}

/**
 * Update time entry parameters
 */
export interface UpdateTimeEntryParams {
  description?: string;
  billable?: boolean;
  tags?: string[];
}

/**
 * Time tracking service for ClickUp
 */
export class TimeTrackingService extends BaseClickUpService {
  /**
   * Creates a new TimeTrackingService instance
   * @param apiKey ClickUp API key
   * @param teamId ClickUp team ID
   * @param baseUrl Base URL for the ClickUp API (optional)
   */
  constructor(apiKey: string, teamId: string, baseUrl?: string) {
    super(apiKey, teamId, baseUrl);
  }

  /**
   * Makes a GET request to the ClickUp API
   * @param url API endpoint
   * @param params Query parameters
   * @returns Axios response
   */
  protected async get(url: string, params: Record<string, any> = {}): Promise<AxiosResponse> {
    return this.makeRequest(() => this.client.get(url, { params }));
  }

  /**
   * Makes a POST request to the ClickUp API
   * @param url API endpoint
   * @param data Request body
   * @returns Axios response
   */
  protected async post(url: string, data: any): Promise<AxiosResponse> {
    return this.makeRequest(() => this.client.post(url, data));
  }

  /**
   * Makes a PUT request to the ClickUp API
   * @param url API endpoint
   * @param data Request body
   * @returns Axios response
   */
  protected async put(url: string, data: any): Promise<AxiosResponse> {
    return this.makeRequest(() => this.client.put(url, data));
  }

  /**
   * Makes a DELETE request to the ClickUp API
   * @param url API endpoint
   * @returns Axios response
   */
  protected async delete(url: string): Promise<AxiosResponse> {
    return this.makeRequest(() => this.client.delete(url));
  }

  /**
   * Handles API errors
   * @param error Error to handle
   * @param message Error message prefix
   */
  protected handleApiError(error: any, message: string): never {
    if (error instanceof ClickUpServiceError) {
      throw error;
    }

    let errorCode = ErrorCode.UNKNOWN;
    let status: number | undefined = undefined;
    let details: any = null;

    if (axios.isAxiosError(error)) {
      if (error.response) {
        status = error.response.status;
        details = error.response.data;
        
        switch (status) {
          case 401:
            errorCode = ErrorCode.UNAUTHORIZED;
            break;
          case 404:
            errorCode = ErrorCode.NOT_FOUND;
            break;
          case 429:
            errorCode = ErrorCode.RATE_LIMIT;
            break;
          case 400:
            errorCode = ErrorCode.VALIDATION;
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            errorCode = ErrorCode.SERVER_ERROR;
            break;
        }
      } else if (error.request) {
        errorCode = ErrorCode.NETWORK_ERROR;
        details = { request: error.request };
      }

      message = `${message}: ${error.message}`;
    } else {
      message = `${message}: ${error?.message || 'Unknown error'}`;
    }

    throw new ClickUpServiceError(message, errorCode, details, status);
  }

  /**
   * Get a time tracking report for a specific period
   * @param params Parameters for the report
   * @returns Time tracking report data
   */
  async getTimeTrackingReport(params: TimeTrackingReportParams): Promise<any> {
    try {
      const response = await this.get(`/team/${this.teamId}/time_entries/report`, {
        start_date: params.start_date,
        end_date: params.end_date
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, 'Error getting time tracking report');
      return null;
    }
  }

  /**
   * Get the currently running timer
   * @returns Current timer data or null if no timer is running
   */
  async getCurrentTimer(): Promise<any> {
    try {
      const response = await this.get(`/team/${this.teamId}/time_entries/current`);
      return response.data.data;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        return null; // No timer running
      }
      this.handleApiError(error, 'Error getting current timer');
      return null;
    }
  }

  /**
   * Get recent time entries
   * @param params Parameters for querying time entries
   * @returns Array of time entries
   */
  async getTimeEntries(params: Record<string, any> = {}): Promise<any[]> {
    try {
      const response = await this.get(`/team/${this.teamId}/time_entries`, params);
      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'Error getting time entries');
      return [];
    }
  }

  /**
   * Start a timer for a task
   * @param params Timer parameters
   * @returns Timer data
   */
  async startTimer(params: StartTimerParams): Promise<any> {
    try {
      const requestData = {
        tid: params.task_id,
        description: params.description,
        billable: params.billable,
        tags: params.tags
      };
      
      const response = await this.post(`/team/${this.teamId}/time_entries/start`, requestData);
      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'Error starting timer');
      return null;
    }
  }

  /**
   * Stop the current timer
   * @returns Stopped timer data
   */
  async stopTimer(): Promise<any> {
    try {
      const response = await this.post(`/team/${this.teamId}/time_entries/stop`, {});
      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'Error stopping timer');
      return null;
    }
  }

  /**
   * Create a time entry manually
   * @param params Time entry parameters
   * @returns Created time entry data
   */
  async createTimeEntry(params: CreateTimeEntryParams): Promise<any> {
    try {
      const requestData = {
        tid: params.task_id,
        start: params.start,
        duration: params.duration,
        description: params.description,
        billable: params.billable,
        tags: params.tags
      };
      
      const response = await this.post(`/team/${this.teamId}/time_entries`, requestData);
      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'Error creating time entry');
      return null;
    }
  }

  /**
   * Delete a time entry
   * @param timeEntryId ID of the time entry to delete
   * @returns True if deletion was successful
   */
  async deleteTimeEntry(timeEntryId: string): Promise<boolean> {
    try {
      await this.delete(`/team/${this.teamId}/time_entries/${timeEntryId}`);
      return true;
    } catch (error) {
      this.handleApiError(error, 'Error deleting time entry');
      return false;
    }
  }

  /**
   * Update a time entry
   * @param timeEntryId ID of the time entry to update
   * @param params Update parameters
   * @returns Updated time entry data
   */
  async updateTimeEntry(timeEntryId: string, params: UpdateTimeEntryParams): Promise<any> {
    try {
      const requestData = {
        description: params.description,
        billable: params.billable,
        tags: params.tags
      };
      
      const response = await this.put(`/team/${this.teamId}/time_entries/${timeEntryId}`, requestData);
      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'Error updating time entry');
      return null;
    }
  }
}