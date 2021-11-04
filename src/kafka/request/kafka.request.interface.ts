export interface IKafkaRequestHeader {
    user?: string;
    token?: string;
}
export interface IKafkaRequest<T> {
    key?: string;
    value: T;
    headers?: IKafkaRequestHeader;
}
