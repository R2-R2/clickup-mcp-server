# THIS IS A WORK IN PROGRESS. Partially working, but needs a tool to list lists in Spaces and to list tasks in lists.
# ClickUp MCP Server

Connect Claude and other AI assistants to ClickUp using the Model Context Protocol (MCP). This server enables AI assistants to manage tasks, track time, analyze progress, and provide insights based on your ClickUp data.

## Features

### Task Management
- Create, update, and organize tasks
- Move tasks between lists
- Query task details and status
- Bulk task operations

### Time Tracking
- Start and stop timers
- View time tracking data and reports
- Analyze time usage and productivity
- Get insights into how time is spent

### Project Navigation
- Browse workspace hierarchy
- Find tasks, lists, and folders
- Manage lists and folders

### AI-Enhanced Analysis
- Generate time tracking reports
- Analyze project progress
- Identify bottlenecks and inefficiencies
- Get productivity recommendations

## Using with Claude

When connected to Claude through the MCP, you can:

1. **Ask about time tracking**:
   - "How much time have I tracked today?"
   - "What task have I spent the most time on this week?"
   - "Show me my time tracking summary for this month"

2. **Manage timers**:
   - "Start a timer for task X"
   - "Stop the current timer"
   - "What am I currently tracking time for?"

3. **Analyze projects**:
   - "Review the progress of project X"
   - "Am I on track to meet the deadlines for project Y?"
   - "What tasks are at risk of missing their due dates?"

4. **Organize tasks**:
   - "Create a task for..."
   - "Move these tasks to the 'Done' list"
   - "Reword task descriptions for clarity"

## Setup

### Prerequisites
- Node.js 18+
- ClickUp account with API key
- A workspace/team in ClickUp

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/R2-R2/clickup-mcp-server.git
   cd clickup-mcp-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update the `.env` file with your ClickUp credentials:
   ```
   CLICKUP_API_KEY=your_api_key_here
   CLICKUP_TEAM_ID=your_team_id_here
   ```

   You can find your API key in ClickUp under Settings > Apps.
   The Team ID is part of your ClickUp URL (e.g., https://app.clickup.com/t/1234567/dashboard)

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the server:
   ```bash
   npm start
   ```

### Using with Claude Desktop

To connect with Claude Desktop:

1. Open Claude Desktop
2. Go to Settings > MCP Servers
3. Click "Add Server"
4. Run the command: `./node_modules/.bin/clickup-mcp-server --env CLICKUP_API_KEY=your_api_key --env CLICKUP_TEAM_ID=your_team_id`
5. Claude should detect the server and allow you to connect

## Available MCP Capabilities

### Tools

The server exposes the following tool categories:

1. **Task Management**
   - `create_task` - Create a new task
   - `update_task` - Update an existing task
   - `get_task` - Get information about a task
   - `get_tasks` - Get a list of tasks
   - `move_task` - Move a task to a different list
   - `duplicate_task` - Create a copy of a task
   - `delete_task` - Delete a task

2. **Time Tracking**
   - `get_time_tracking` - Get time tracking data
   - `start_timer` - Start a timer for a task
   - `stop_timer` - Stop the currently running timer
   - `get_time_tracking_summary` - Get summary of time tracked
   - `get_current_timer` - Get information about the current timer
   - `add_time_entry` - Add a manual time entry

3. **List Management**
   - `create_list` - Create a new list
   - `get_list` - Get information about a list
   - `update_list` - Update a list
   - `delete_list` - Delete a list

4. **Folder Management**
   - `create_folder` - Create a new folder
   - `get_folder` - Get information about a folder
   - `update_folder` - Update a folder
   - `delete_folder` - Delete a folder

5. **Workspace**
   - `get_workspace_hierarchy` - Get the hierarchy of spaces, folders, and lists

### Resources

The server provides the following resources that Claude can access:

1. **Time Tracking Reports**
   - Today's time tracking
   - Yesterday's time tracking
   - This week's time tracking
   - This month's time tracking

2. **Current Timer Status**
   - Information about the currently running timer

3. **Time Tracking History**
   - Recent time entries

### Prompts

The server includes the following prompt templates:

1. **Time Tracking**
   - `analyze_time_usage` - Analyze time usage for a specific period
   - `manage_timer` - Start, stop, or check the current timer
   - `time_tracking_recommendations` - Get recommendations for improving time tracking

## Development

### Project Structure

- `src/` - Source code
  - `services/` - ClickUp API integration
  - `tools/` - MCP tool implementations
  - `resources/` - MCP resource implementations
  - `prompts/` - MCP prompt implementations
  - `server.ts` - MCP server configuration

### Adding Features

To add new features:

1. Add new service methods in `src/services/`
2. Implement tools in `src/tools/`
3. Create resources in `src/resources/`
4. Add prompts in `src/prompts/`
5. Register new capabilities in `src/server.ts`

## License

MIT License - See LICENSE file for details.

## Acknowledgments

Based on the original [ClickUp MCP Server](https://github.com/TaazKareem/clickup-mcp-server) by Talib Kareem, enhanced with time tracking features and additional capabilities.
