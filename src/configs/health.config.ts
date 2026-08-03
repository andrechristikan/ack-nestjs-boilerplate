import { registerAs } from '@nestjs/config';
import bytes from 'bytes';

export interface IConfigHealth {
    memoryRssThresholdInBytes: number;
    memoryHeapThresholdInBytes: number;
    diskThresholdPercent: number;
    diskPath: string;
}

export default registerAs(
    'health',
    (): IConfigHealth => ({
        memoryRssThresholdInBytes: bytes('300mb') ?? 0,
        memoryHeapThresholdInBytes: bytes('300mb') ?? 0,
        diskThresholdPercent: 0.75,
        diskPath: '/',
    })
);
