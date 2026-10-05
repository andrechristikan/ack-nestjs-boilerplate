import type { Job } from 'bullmq';
import { EnumWorkspaceProcess } from '@modules/workspace/enums/workspace.enum';

export function buildQueueJob<T, R, N extends string>(data: T): Job<T, R, N> {
    return { data } as Job<T, R, N>;
}

export function buildProcessorJob(overrides: Partial<Job>): Job {
    return {
        id: 'job-1',
        name: EnumWorkspaceProcess.expireStaleInvites,
        attemptsMade: 0,
        opts: { attempts: 3 },
        log: vi.fn().mockResolvedValue(1),
        ...overrides,
    } as unknown as Job;
}
