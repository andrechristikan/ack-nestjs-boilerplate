import { Response } from 'express';
import { IRequestThrottlePolicy } from '@common/request/interfaces/request.interface';

export interface IRequestThrottleService {
    evaluate(
        response: Response,
        name: string,
        tracker: string,
        policy: IRequestThrottlePolicy
    ): Promise<void>;
}
