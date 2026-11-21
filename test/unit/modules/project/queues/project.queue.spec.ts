import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumProjectProcess,
    EnumProjectQueue,
} from '@modules/project/enums/project.enum';
import { ProjectQueue } from '@modules/project/queues/project.queue';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestUnitKitConfigValues } from '@test/unit/helpers/test.unit.kit.helper';

describe('ProjectQueue', () => {
    const bullQueue: MockProxy<Queue> = mock<Queue>();
    let queue: ProjectQueue;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                ProjectQueue,
                HelperDateService,
                {
                    provide: getQueueToken(EnumProjectQueue.project),
                    useValue: bullQueue,
                },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();
        queue = module.get(ProjectQueue);
    });

    describe('softDeleteByWorkspaceEffect', () => {
        it('returns the high-priority soft-delete-by-workspace effect carrying the workspace id, the ISO deleted date, the actor id, and no business key', () => {
            const effect = queue.softDeleteByWorkspaceEffect(
                'workspace-1',
                new Date('2026-02-01T10:20:30.000Z'),
                'user-1'
            );

            expect(effect).toEqual({
                queue: EnumProjectQueue.project,
                name: EnumProjectProcess.softDeleteByWorkspace,
                data: {
                    workspaceId: 'workspace-1',
                    deletedAt: '2026-02-01T10:20:30.000Z',
                    deletedBy: 'user-1',
                },
                priority: EnumQueuePriority.high,
                idempotencyKey: null,
            });
        });
    });
});
