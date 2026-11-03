import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyUtil } from '@modules/policy/utils/policy.util';

describe('PolicyUtil', () => {
    const policy: Policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        roleId: 'role-1',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.read, EnumPolicyAction.update],
    };

    let util: PolicyUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PolicyUtil],
        }).compile();

        util = module.get(PolicyUtil);
    });

    describe('mapActivityLogMetadata', () => {
        it('maps the role id, the subject, and the actions joined by a comma', () => {
            const result = util.mapActivityLogMetadata(policy);

            expect(result).toEqual({
                roleId: 'role-1',
                subject: EnumPolicySubject.user,
                action: `${EnumPolicyAction.read},${EnumPolicyAction.update}`,
            });
        });
    });
});
