export interface IKafkaRequest {
    key: string;
    value: Record<string, any>;
    headers?: Record<string, any>;
    token?: string;
    user?: Record<string, any>;
}

export type IKafkaResponse = {
    value: Record<string, any>;
};

export type IKafkaError = {
    value: Record<string, any>;
    statusCode: number;
};
