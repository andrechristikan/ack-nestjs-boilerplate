import 'reflect-metadata';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { mock } from 'vitest-mock-extended';
import type { ClsService } from 'nestjs-cls';
import { ClsServiceManager } from 'nestjs-cls';

import { EnumRoleType } from '@generated/prisma-client';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';
import {
    RoleCurrent,
    RoleProtected,
} from '@modules/role/decorators/role.decorator';
import { UserStoreKey } from '@modules/user/constants/user.constant';

vi.mock('nestjs-cls', () => ({
    ClsServiceManager: { getClsService: vi.fn() },
}));
vi.mock('@modules/role/guards/role.guard', () => ({ RoleGuard: vi.fn() }));

const extractFactory = () => {
    const target = { constructor: vi.fn() };
    RoleCurrent()(target, 'handler', 0);
    const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        'handler'
    );
    return metadata[Object.keys(metadata)[0]].factory as (
        data: unknown
    ) => unknown;
};

describe('role decorators', () => {
    it('registers the role guard and required role metadata', () => {
        const handler = vi.fn();
        RoleProtected(EnumRoleType.admin)({}, 'handler', { value: handler });
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toHaveLength(1);
        expect(Reflect.getMetadata(RoleRequiredMetaKey, handler)).toEqual([
            EnumRoleType.admin,
        ]);
    });

    it('reads the complete role and a selected field', () => {
        const role = { id: 'role-id', description: null };
        const cls = mock<ClsService>();
        cls.get.mockReturnValue({ role });
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        const factory = extractFactory();
        expect(factory(undefined)).toBe(role);
        expect(factory(null)).toBe(role);
        expect(factory('id')).toBe(role.id);
        expect(cls.get).toHaveBeenCalledWith(UserStoreKey);
    });

    it.each([undefined, null])('rejects missing user context', value => {
        const cls = mock<ClsService>();
        cls.get.mockReturnValue(value);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        expect(() => extractFactory()(undefined)).toThrow(
            RequestContextMissingException
        );
    });

    it.each([undefined, null])('rejects missing role context', value => {
        const cls = mock<ClsService>();
        cls.get.mockReturnValue({ role: value });
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        expect(() => extractFactory()(undefined)).toThrow(
            RequestContextMissingException
        );
    });

    it.each([undefined, null])('rejects missing role fields', value => {
        const cls = mock<ClsService>();
        cls.get.mockReturnValue({ role: { id: value } });
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        expect(() => extractFactory()('id')).toThrow(
            RequestContextMissingException
        );
    });
});
