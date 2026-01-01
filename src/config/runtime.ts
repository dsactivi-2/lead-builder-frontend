export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
  workspaceId: process.env.NEXT_PUBLIC_WORKSPACE_ID || "ws_default",
  userId: process.env.NEXT_PUBLIC_USER_ID || "u_default",
} as const

export const RUNTIME = config
