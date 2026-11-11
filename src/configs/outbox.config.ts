import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigOutbox {
    sweepIntervalInMs: number;
    pendingAfterInMs: number;
    sweepBatch: number;
}

export default registerAs('outbox', (): IConfigOutbox => ({
    sweepIntervalInMs: ms('1m'),
    pendingAfterInMs: ms('30s'),
    sweepBatch: 100,
}));
