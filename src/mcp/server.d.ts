/**
 * Type declarations for the agentic-rss-parser MCP server.
 *
 * Available via: import type { McpTool } from 'agentic-rss-parser/mcp'
 */

export interface McpToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean;
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, McpToolProperty>;
  required?: string[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
}

export interface McpContent {
  type: 'text';
  text: string;
}

export interface McpToolResponse {
  content: McpContent[];
}

export interface McpServerInfo {
  name: string;
  version: string;
}

/** The list of tools registered on this MCP server. */
export declare const tools: McpTool[];
