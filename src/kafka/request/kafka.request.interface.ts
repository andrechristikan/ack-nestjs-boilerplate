export interface IKafkaRequestHeader {
    user?: string;
    token?: string;
}
export interface IKafkaRequest<T = Record<string, string>> {
    key?: string;
    value: T;
    headers?: IKafkaRequestHeader;
}
