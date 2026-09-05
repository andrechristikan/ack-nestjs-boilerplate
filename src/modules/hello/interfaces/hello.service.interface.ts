import {
    IHelloApp,
    IHelloMessage,
} from '@modules/hello/interfaces/hello.interface';

export interface IHelloService {
    getApp(): IHelloApp;
    getMessage(): IHelloMessage;
}
