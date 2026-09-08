import { registerAs } from '@nestjs/config';
import bytes from 'bytes';
import ms from 'ms';

export interface IConfigHealth {
    memoryRssThresholdInBytes: number;
    memoryHeapThresholdInBytes: number;
    diskThresholdPercent: number;
    diskPath: string;
    gracefulShutdownTimeoutInMs: number;
}

export default registerAs('health', (): IConfigHealth => ({
    memoryRssThresholdInBytes: bytes('300mb') ?? 0,
    memoryHeapThresholdInBytes: bytes('300mb') ?? 0,
    diskThresholdPercent: 0.75,
    diskPath: '/',
    gracefulShutdownTimeoutInMs: ms('30s'),
}));
