import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';

describe('TermPolicyQueue', () => {
    const bullQueue: MockProxy<Queue> = mock<Queue>();
    let queue: TermPolicyQueue;
    let databaseUtil: DatabaseUtil;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'termPolicy.idempotencyKey.publishPattern':
                            '{process}-{termPolicyId}',
                        'termPolicy.idempotencyKey.resendPublishPattern':
                            '{process}-{termPolicyId}-{resendNonce}',
                    }),
                },
                TermPolicyQueue,
                {
                    provide: getQueueToken(EnumTermPolicyQueue.termPolicy),
                    useValue: bullQueue,
                },
            ],
        }).compile();
        queue = module.get(TermPolicyQueue);
        databaseUtil = module.get(DatabaseUtil);
    });

    describe('publishEffect', () => {
        it('returns the medium-priority publish effect keyed by process and term policy', () => {
            const payload = {
                termPolicyId: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                version: 1,
                recipientCutoffAt: '2026-01-01T00:00:00.000Z',
                resendNonce: null,
            };

            const effect = queue.publishEffect(payload, 'admin-1');

            expect(effect).toEqual({
                queue: EnumTermPolicyQueue.termPolicy,
                name: EnumTermPolicyProcess.publish,
                data: { proceedBy: 'admin-1', data: payload },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'publish-term-policy-1',
            });
        });
    });

    describe('resendPublishEffect', () => {
        it('returns a publish effect with one fresh nonce in its data and its key', () => {
            const createId = vi
                .spyOn(databaseUtil, 'createId')
                .mockReturnValue('nonce-1');

            const effect = queue.resendPublishEffect(
                {
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    recipientCutoffAt: '2026-01-01T00:00:00.000Z',
                },
                'admin-1'
            );

            expect(createId).toHaveBeenCalledTimes(1);
            expect(effect).toEqual({
                queue: EnumTermPolicyQueue.termPolicy,
                name: EnumTermPolicyProcess.publish,
                data: {
                    proceedBy: 'admin-1',
                    data: {
                        termPolicyId: 'term-policy-1',
                        type: EnumTermPolicyType.privacy,
                        version: 1,
                        recipientCutoffAt: '2026-01-01T00:00:00.000Z',
                        resendNonce: 'nonce-1',
                    },
                },
                priority: EnumQueuePriority.medium,
                idempotencyKey: 'publish-term-policy-1-nonce-1',
            });
        });
    });

    describe('deleteContentEffect', () => {
        it('returns the low-priority deleteContent effect carrying the keys and no business key', () => {
            const effect = queue.deleteContentEffect(['a/en-x.hbs']);

            expect(effect).toEqual({
                queue: EnumTermPolicyQueue.termPolicy,
                name: EnumTermPolicyProcess.deleteContent,
                data: { keys: ['a/en-x.hbs'] },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
            });
        });
    });
});
