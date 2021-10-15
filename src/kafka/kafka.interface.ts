export interface IKafkaMessage {
    key: string;
    value: Record<string, any>;
    headers?: Record<string, any>;
    token?: string;
    user?: Record<string, any>;
}

export interface IKafkaMessageResponse {
    key: string;
    value: Record<string, any>;
}
