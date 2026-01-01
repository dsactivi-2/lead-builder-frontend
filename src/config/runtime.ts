export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
  workspaceId: process.env.NEXT_PUBLIC_WORKSPACE_ID || 'ws_default',
  userId: process.env.NEXT_PUBLIC_USER_ID || 'u_default',
} as const;
