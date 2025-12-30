export interface IFirebaseConfig {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
}

export interface IFirebasePushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}

export interface IFirebasePushResult {
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
}
