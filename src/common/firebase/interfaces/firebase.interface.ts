export interface IFirebasePushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

export interface IFirebasePushResult {
    successCount: number;
    failureCount: number;
    failureTokens: string[];
}
