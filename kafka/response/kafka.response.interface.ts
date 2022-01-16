export type IKafkaResponse = {
    key?: string;
    headers?: Record<string, any>;
    value: Record<string, any>;
};
