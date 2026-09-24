import 'reflect-metadata';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { mock } from 'vitest-mock-extended';
import type { ClsService } from 'nestjs-cls';
import { ClsServiceManager } from 'nestjs-cls';

import { EnumWorkspaceMemberRole } from '@generated/prisma-client';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    WorkspaceMemberStoreKey,
    WorkspaceRoleMetaKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import {
    WorkspaceCurrent,
    WorkspaceMemberCurrent,
    WorkspaceMemberProtected,
    WorkspaceProtected,
} from '@modules/workspace/decorators/workspace.decorator';

vi.mock('nestjs-cls', () => ({
    ClsServiceManager: { getClsService: vi.fn() },
}));
vi.mock('@modules/workspace/guards/workspace.guard', () => ({
    WorkspaceGuard: vi.fn(),
}));
vi.mock('@modules/workspace/guards/workspace.member.guard', () => ({
    WorkspaceMemberGuard: vi.fn(),
}));
vi.mock('@modules/workspace/guards/workspace.role.guard', () => ({
    WorkspaceRoleGuard: vi.fn(),
}));

const extractFactory = (decorator: () => ParameterDecorator) => {
    const target = { constructor: vi.fn() };
    decorator()(target, 'handler', 0);
    const metadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        'handler'
    );
    return metadata[Object.keys(metadata)[0]].factory as (
        data: unknown
    ) => unknown;
};

describe('workspace decorators', () => {
    it('registers workspace and membership guard variants', () => {
        const workspaceHandler = vi.fn();
        const memberHandler = vi.fn();
        const roleHandler = vi.fn();
        WorkspaceProtected()({}, 'workspace', { value: workspaceHandler });
        WorkspaceMemberProtected()({}, 'member', { value: memberHandler });
        WorkspaceMemberProtected(EnumWorkspaceMemberRole.admin)({}, 'role', {
            value: roleHandler,
        });
        expect(
            Reflect.getMetadata(GUARDS_METADATA, workspaceHandler)
        ).toHaveLength(1);
        expect(
            Reflect.getMetadata(GUARDS_METADATA, memberHandler)
        ).toHaveLength(1);
        expect(Reflect.getMetadata(GUARDS_METADATA, roleHandler)).toHaveLength(
            2
        );
        expect(Reflect.getMetadata(WorkspaceRoleMetaKey, roleHandler)).toEqual([
            EnumWorkspaceMemberRole.admin,
        ]);
    });

    it.each([
        [
            WorkspaceCurrent,
            WorkspaceStoreKey,
            { id: 'workspace-id', description: null },
        ],
        [
            WorkspaceMemberCurrent,
            WorkspaceMemberStoreKey,
            { id: 'member-id', updatedBy: null },
        ],
    ] as const)(
        'reads complete and selected CLS values',
        (decorator, key, value) => {
            const cls = mock<ClsService>();
            cls.get.mockReturnValue(value);
            vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
            const factory = extractFactory(() => decorator());
            expect(factory(undefined)).toBe(value);
            expect(factory(null)).toBe(value);
            expect(factory('id')).toBe(value.id);
            expect(cls.get).toHaveBeenCalledWith(key);
        }
    );

    it.each([
        [WorkspaceCurrent, undefined],
        [WorkspaceCurrent, null],
        [WorkspaceMemberCurrent, undefined],
        [WorkspaceMemberCurrent, null],
    ] as const)('rejects missing CLS context', (decorator, value) => {
        const cls = mock<ClsService>();
        cls.get.mockReturnValue(value);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        expect(() => extractFactory(() => decorator())(undefined)).toThrow(
            RequestContextMissingException
        );
    });

    it.each([WorkspaceCurrent, WorkspaceMemberCurrent])(
        'rejects missing selected fields',
        decorator => {
            const cls = mock<ClsService>();
            cls.get.mockReturnValue({ field: null });
            vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
            expect(() => extractFactory(() => decorator())('field')).toThrow(
                RequestContextMissingException
            );
        }
    );
});
