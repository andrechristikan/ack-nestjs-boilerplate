import 'reflect-metadata';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { mock } from 'vitest-mock-extended';
import type { ClsService } from 'nestjs-cls';
import { ClsServiceManager } from 'nestjs-cls';

import { HttpStatus } from '@nestjs/common';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { EnumPolicyAction } from '@generated/prisma-client';
import { ProjectPolicyAbilityGuard } from '@modules/policy/guards/policy.project.ability.guard';
import {
    ProjectMemberStoreKey,
    ProjectMemberPolicyRequiredMetaKey,
    ProjectMemberRequiredMetaKey,
    ProjectMemberTargetStoreKey,
    ProjectPolicyRequiredMetaKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import {
    ProjectCurrent,
    ProjectMemberCurrent,
    ProjectMemberPolicyProtected,
    ProjectMemberProtected,
    ProjectMemberTargetCurrent,
    ProjectPolicyProtected,
    ProjectProtected,
} from '@modules/project/decorators/project.decorator';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectMemberPolicyGuard } from '@modules/project/guards/project.member.policy.guard';
import { ProjectPolicyGuard } from '@modules/project/guards/project.policy.guard';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';

vi.mock('nestjs-cls', () => ({
    ClsServiceManager: { getClsService: vi.fn() },
}));
vi.mock('@modules/project/guards/project.guard', () => ({
    ProjectGuard: vi.fn(),
}));
vi.mock('@modules/project/guards/project.member.guard', () => ({
    ProjectMemberGuard: vi.fn(),
}));
vi.mock('@modules/project/guards/project.policy.guard', () => ({
    ProjectPolicyGuard: vi.fn(),
}));
vi.mock('@modules/project/guards/project.member.policy.guard', () => ({
    ProjectMemberPolicyGuard: vi.fn(),
}));
vi.mock('@modules/policy/guards/policy.project.ability.guard', () => ({
    ProjectPolicyAbilityGuard: vi.fn(),
}));
vi.mock('@modules/policy/guards/policy.guard', () => ({
    PolicyGuard: vi.fn(),
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
    it('mounts the project guard for ProjectProtected', () => {
        const projectHandler = vi.fn();
        ProjectProtected()({}, 'project', { value: projectHandler });
        expect(Reflect.getMetadata(GUARDS_METADATA, projectHandler)).toEqual([
            ProjectGuard,
        ]);
    });

    it('mounts the one member guard, strict by default, and documents memberForbidden', () => {
        const handler = vi.fn();
        ProjectMemberProtected()({}, 'member', { value: handler });
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            ProjectMemberGuard,
        ]);
        expect(Reflect.getMetadata(ProjectMemberRequiredMetaKey, handler)).toBe(
            true
        );
        expect(Reflect.getMetadata(DocResponseEntryMetaKey, handler)).toEqual([
            expect.objectContaining({
                httpStatus: HttpStatus.FORBIDDEN,
                statusCode: EnumProjectStatusCodeError.memberForbidden,
            }),
        ]);
    });

    it('treats an empty options object as strict', () => {
        const handler = vi.fn();
        ProjectMemberProtected({})({}, 'member', { value: handler });
        expect(Reflect.getMetadata(ProjectMemberRequiredMetaKey, handler)).toBe(
            true
        );
    });

    it('mounts the same guard non-rejecting with required false and no project-member error', () => {
        const handler = vi.fn();
        ProjectMemberProtected({ required: false })({}, 'member', {
            value: handler,
        });
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            ProjectMemberGuard,
        ]);
        expect(Reflect.getMetadata(ProjectMemberRequiredMetaKey, handler)).toBe(
            false
        );
        expect(
            Reflect.getMetadata(DocResponseEntryMetaKey, handler)
        ).toBeUndefined();
    });

    it('ProjectPolicyProtected stacks the project ability guard then the project policy guard and declares the actions', () => {
        const handler = vi.fn();

        ProjectPolicyProtected(EnumPolicyAction.read, EnumPolicyAction.update)(
            {},
            'handler',
            { value: handler }
        );

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            ProjectPolicyAbilityGuard,
            ProjectPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(ProjectPolicyRequiredMetaKey, handler)
        ).toEqual([EnumPolicyAction.read, EnumPolicyAction.update]);
    });

    it('ProjectMemberPolicyProtected stacks the project ability guard and the member policy guard, never the project policy guard', () => {
        const handler = vi.fn();

        ProjectMemberPolicyProtected(EnumPolicyAction.delete)({}, 'handler', {
            value: handler,
        });

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            ProjectPolicyAbilityGuard,
            ProjectMemberPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(ProjectMemberPolicyRequiredMetaKey, handler)
        ).toEqual([EnumPolicyAction.delete]);
    });

    it('reads the authorized project member target from CLS and rejects when absent', () => {
        const cls = mock<ClsService>();
        const target = { id: 'target-member-id' };
        cls.get.mockReturnValue(target);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        const factory = extractFactory(() => ProjectMemberTargetCurrent());

        expect(factory(undefined)).toBe(target);
        expect(factory('id')).toBe('target-member-id');
        expect(cls.get).toHaveBeenCalledWith(ProjectMemberTargetStoreKey);

        cls.get.mockReturnValue(undefined);
        expect(() => factory(undefined)).toThrow(
            RequestContextMissingException
        );

        cls.get.mockReturnValue({ field: null });
        expect(() => factory('field')).toThrow(RequestContextMissingException);
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
