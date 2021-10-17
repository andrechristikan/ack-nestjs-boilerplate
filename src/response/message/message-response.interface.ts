export interface IMessageRequest {
    key: string;
    value: Record<string, any>;
    headers?: Record<string, any>;
    token?: string;
    user?: Record<string, any>;
}

export interface IMessageResponse {
    key: string;
    value: Record<string, any>;
}
