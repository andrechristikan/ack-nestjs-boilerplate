import {
    IFirebasePushPayload,
    IFirebasePushResult,
} from '@common/firebase/interfaces/firebase.interface';

export interface IFirebaseService {
    isInitialized(): boolean;
    sendPush(token: string, payload: IFirebasePushPayload): Promise<boolean>;
    sendMulticast(
        tokens: string[],
        payload: IFirebasePushPayload,
        chunkSize?: number
    ): Promise<IFirebasePushResult>;
}
