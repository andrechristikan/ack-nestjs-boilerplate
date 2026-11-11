import { registerAs } from '@nestjs/config';
import ms from 'ms';

export interface IConfigOutbox {
    sweepIntervalInMs: number;
    pendingAfterInMs: number;
    enqueuedAfterInMs: number;
    sweepBatch: number;
    sweepKeepCompleted: number;
}

export default registerAs('outbox', (): IConfigOutbox => ({
    sweepIntervalInMs: ms('1m'),
    pendingAfterInMs: ms('30s'),
    enqueuedAfterInMs: ms('1h'),
    sweepBatch: 100,
    sweepKeepCompleted: 20,
}));
