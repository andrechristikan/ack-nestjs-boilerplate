export interface IEmailSendPayload {
    username: string;
    email: string;
    cc?: string[];
    bcc?: string[];
}

export interface IEmailWorkerPayload<T = unknown> {
    send: IEmailSendPayload;
    data?: T;
}
