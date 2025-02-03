export interface IAwsPinpointService {
    checkConnection(): Promise<boolean>;
    sendSMS(phoneNumber: string, message: string): Promise<void>;
}
