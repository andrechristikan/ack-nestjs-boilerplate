import 'reflect-metadata';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { mock } from 'vitest-mock-extended';
import type { ClsService } from 'nestjs-cls';
import { ClsServiceManager } from 'nestjs-cls';

import { EnumProjectMemberRole } from '@generated/prisma-client';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import {
    ProjectMemberStoreKey,
    ProjectRoleMetaKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import {
    ProjectCurrent,
    ProjectMemberCurrent,
    ProjectMemberProtected,
    ProjectProtected,
} from '@modules/project/decorators/project.decorator';

vi.mock('nestjs-cls', () => ({
    ClsServiceManager: { getClsService: vi.fn() },
}));
vi.mock('@modules/project/guards/project.guard', () => ({
    ProjectGuard: vi.fn(),
}));
vi.mock('@modules/project/guards/project.member.guard', () => ({
    ProjectMemberGuard: vi.fn(),
}));
vi.mock('@modules/project/guards/project.role.guard', () => ({
    ProjectRoleGuard: vi.fn(),
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

describe('project decorators', () => {
    it('registers project and membership guard variants', () => {
        const projectHandler = vi.fn();
        const memberHandler = vi.fn();
        const roleHandler = vi.fn();
        ProjectProtected()({}, 'project', { value: projectHandler });
        ProjectMemberProtected()({}, 'member', { value: memberHandler });
        ProjectMemberProtected(EnumProjectMemberRole.admin)({}, 'role', {
            value: roleHandler,
        });
        expect(
            Reflect.getMetadata(GUARDS_METADATA, projectHandler)
        ).toHaveLength(1);
        expect(
            Reflect.getMetadata(GUARDS_METADATA, memberHandler)
        ).toHaveLength(1);
        expect(Reflect.getMetadata(GUARDS_METADATA, roleHandler)).toHaveLength(
            1
        );
        expect(Reflect.getMetadata(ProjectRoleMetaKey, roleHandler)).toEqual([
            EnumProjectMemberRole.admin,
        ]);
    });

    it.each([
        [ProjectCurrent, ProjectStoreKey, { id: 'project-id' }],
        [ProjectMemberCurrent, ProjectMemberStoreKey, { id: 'member-id' }],
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

    it.each([ProjectCurrent, ProjectMemberCurrent])(
        'rejects missing context and selected fields',
        decorator => {
            const cls = mock<ClsService>();
            vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
            cls.get.mockReturnValueOnce(undefined);
            expect(() => extractFactory(() => decorator())(undefined)).toThrow(
                RequestContextMissingException
            );
            cls.get.mockReturnValueOnce(null);
            expect(() => extractFactory(() => decorator())(undefined)).toThrow(
                RequestContextMissingException
            );
            cls.get.mockReturnValueOnce({ id: null });
            expect(() => extractFactory(() => decorator())('id')).toThrow(
                RequestContextMissingException
            );
            cls.get.mockReturnValueOnce({ id: undefined });
            expect(() => extractFactory(() => decorator())('id')).toThrow(
                RequestContextMissingException
            );
        }
    );
});
