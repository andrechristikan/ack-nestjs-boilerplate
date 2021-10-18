export interface IKafkaRequest {
    key?: string;
    value: Record<string, any>;
    headers?: Record<string, any>;
    token?: string;
    user?: Record<string, any>;
}
