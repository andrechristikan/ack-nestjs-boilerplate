import 'reflect-metadata';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { mock } from 'vitest-mock-extended';
import type { ClsService } from 'nestjs-cls';
import { ClsServiceManager } from 'nestjs-cls';

import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import {
    PolicyCurrent,
    PolicyProtected,
} from '@modules/policy/decorators/policy.decorator';

vi.mock('nestjs-cls', () => ({
    ClsServiceManager: { getClsService: vi.fn() },
}));
vi.mock('@modules/policy/guards/policy.guard', () => ({
    PolicyGuard: vi.fn(),
}));

const extractFactory = () => {
    const target = { constructor: vi.fn() };
    PolicyCurrent()(target, 'handler', 0);
    const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        'handler'
    );
    return metadata[Object.keys(metadata)[0]].factory as () => unknown;
};

describe('policy decorators', () => {
    it('registers the policy guard and required policy metadata', () => {
        const handler = vi.fn();
        const required = {
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
        };
        PolicyProtected(required)({}, 'handler', { value: handler });
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(1);
        expect(Reflect.getMetadata(PolicyRequiredMetaKey, handler)).toEqual([
            required,
        ]);
    });

    it('returns an empty or populated policy context', () => {
        const cls = mock<ClsService>();
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        cls.get.mockReturnValueOnce([]);
        expect(extractFactory()()).toEqual([]);
        const policies = [{ id: 'policy-id' }];
        cls.get.mockReturnValueOnce(policies);
        expect(extractFactory()()).toBe(policies);
        expect(cls.get).toHaveBeenCalledWith(PolicyStoreKey);
    });

    it.each([undefined, null])('rejects missing policy context', value => {
        const cls = mock<ClsService>();
        cls.get.mockReturnValue(value);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        expect(() => extractFactory()()).toThrow(
            RequestContextMissingException
        );
    });
});
