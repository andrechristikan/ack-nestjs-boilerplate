import 'reflect-metadata';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { CanActivate, ExecutionContext, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { ClsService } from 'nestjs-cls';
import { ClsServiceManager } from 'nestjs-cls';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPolicyAction, EnumPolicySubject } from '@generated/prisma-client';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import { PlatformPolicyProtected } from '@modules/policy/decorators/policy.decorator';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import { PlatformPolicyAbilityGuard } from '@modules/policy/guards/policy.platform.ability.guard';
import { WorkspacePolicyAbilityGuard } from '@modules/policy/guards/policy.workspace.ability.guard';
import {
    WorkspaceMemberPolicyRequiredMetaKey,
    WorkspaceMemberStoreKey,
    WorkspaceMemberTargetStoreKey,
    WorkspacePolicyRequiredMetaKey,
    WorkspaceStoreKey,
    WorkspaceTargetStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import {
    WorkspaceCurrent,
    WorkspaceMemberCurrent,
    WorkspaceMemberPolicyProtected,
    WorkspaceMemberProtected,
    WorkspaceMemberTargetCurrent,
    WorkspacePolicyProtected,
    WorkspaceProtected,
    WorkspaceSubjectPolicyProtected,
    WorkspaceTargetCurrent,
} from '@modules/workspace/decorators/workspace.decorator';
import { WorkspaceGuard } from '@modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import { WorkspaceMemberPolicyGuard } from '@modules/workspace/guards/workspace.member.policy.guard';
import { WorkspacePolicyGuard } from '@modules/workspace/guards/workspace.policy.guard';

vi.mock('nestjs-cls', async importOriginal => ({
    ...(await importOriginal<typeof import('nestjs-cls')>()),
    ClsServiceManager: { getClsService: vi.fn() },
}));
vi.mock('@modules/workspace/guards/workspace.guard', () => ({
    WorkspaceGuard: vi.fn(),
}));
vi.mock('@modules/workspace/guards/workspace.member.guard', () => ({
    WorkspaceMemberGuard: vi.fn(),
}));
vi.mock('@modules/workspace/guards/workspace.policy.guard', () => ({
    WorkspacePolicyGuard: vi.fn(),
}));
vi.mock('@modules/workspace/guards/workspace.member.policy.guard', () => ({
    WorkspaceMemberPolicyGuard: vi.fn(),
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

describe('workspace decorators', () => {
    it('mounts the workspace guard and the membership guard as the only metadata of each decorator', () => {
        const workspaceHandler = vi.fn();
        const memberHandler = vi.fn();
        WorkspaceProtected()({}, 'workspace', { value: workspaceHandler });
        WorkspaceMemberProtected()({}, 'member', { value: memberHandler });
        expect(Reflect.getMetadata(GUARDS_METADATA, workspaceHandler)).toEqual([
            WorkspaceGuard,
        ]);
        expect(Reflect.getMetadata(GUARDS_METADATA, memberHandler)).toEqual([
            WorkspaceMemberGuard,
        ]);
        expect(Reflect.getMetadataKeys(memberHandler)).toEqual([
            GUARDS_METADATA,
        ]);
    });

    it('WorkspacePolicyProtected stacks the workspace ability guard then the workspace policy guard and declares the actions', () => {
        const handler = vi.fn();

        WorkspacePolicyProtected(
            EnumPolicyAction.read,
            EnumPolicyAction.update
        )({}, 'handler', { value: handler });

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            WorkspacePolicyAbilityGuard,
            WorkspacePolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(WorkspacePolicyRequiredMetaKey, handler)
        ).toEqual([EnumPolicyAction.read, EnumPolicyAction.update]);
    });

    it('WorkspaceMemberPolicyProtected stacks the workspace ability guard and the member policy guard, never the workspace policy guard', () => {
        const handler = vi.fn();

        WorkspaceMemberPolicyProtected(EnumPolicyAction.delete)({}, 'handler', {
            value: handler,
        });

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            WorkspacePolicyAbilityGuard,
            WorkspaceMemberPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(WorkspaceMemberPolicyRequiredMetaKey, handler)
        ).toEqual([EnumPolicyAction.delete]);
    });

    it('WorkspaceSubjectPolicyProtected stacks the workspace ability guard and the generic policy guard', () => {
        const handler = vi.fn();
        const required = {
            subject: EnumPolicySubject.WorkspaceInvite,
            action: [EnumPolicyAction.create],
        };

        WorkspaceSubjectPolicyProtected(required)({}, 'handler', {
            value: handler,
        });

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            WorkspacePolicyAbilityGuard,
            PolicyGuard,
        ]);
        expect(Reflect.getMetadata(PolicyRequiredMetaKey, handler)).toEqual([
            required,
        ]);
    });

    describe('admin resource route stack', () => {
        const policyAbilityDomain = mock<PolicyAbilityDomain>();
        const policyDomain = mock<PolicyDomain>();
        const requestStoreService = mock<RequestStoreService>();
        const databaseUtil = mock<DatabaseUtil>();
        const context = mock<ExecutionContext>();
        let moduleRef: TestingModule;

        beforeEach(async () => {
            vi.resetAllMocks();
            requestStoreService.get.mockReturnValue(null);
            policyDomain.requireStored.mockImplementation(key => {
                throw new RequestContextMissingException(key);
            });

            moduleRef = await Test.createTestingModule({
                providers: [
                    PlatformPolicyAbilityGuard,
                    WorkspacePolicyAbilityGuard,
                    {
                        provide: PolicyAbilityDomain,
                        useValue: policyAbilityDomain,
                    },
                    { provide: PolicyDomain, useValue: policyDomain },
                    { provide: DatabaseUtil, useValue: databaseUtil },
                    {
                        provide: RequestStoreService,
                        useValue: requestStoreService,
                    },
                ],
            }).compile();
        });

        it('runs the platform ability guard before the workspace ability guard when the workspace decorator is written above the platform decorator', () => {
            const handler = vi.fn();

            PlatformPolicyProtected({
                subject: EnumPolicySubject.Workspace,
                action: [EnumPolicyAction.read],
            })({}, 'handler', { value: handler });
            WorkspacePolicyProtected(EnumPolicyAction.read)({}, 'handler', {
                value: handler,
            });

            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                PlatformPolicyAbilityGuard,
                PolicyGuard,
                WorkspacePolicyAbilityGuard,
                WorkspacePolicyGuard,
            ]);
        });

        it('throws RequestContextMissingException when the workspace decorator is written below the platform decorator', async () => {
            const handler = vi.fn();

            WorkspacePolicyProtected(EnumPolicyAction.read)({}, 'handler', {
                value: handler,
            });
            PlatformPolicyProtected({
                subject: EnumPolicySubject.Workspace,
                action: [EnumPolicyAction.read],
            })({}, 'handler', { value: handler });

            const guards: Type<CanActivate>[] = Reflect.getMetadata(
                GUARDS_METADATA,
                handler
            );
            expect(guards).toEqual([
                WorkspacePolicyAbilityGuard,
                WorkspacePolicyGuard,
                PlatformPolicyAbilityGuard,
                PolicyGuard,
            ]);

            const first = moduleRef.get<CanActivate>(guards[0]);
            await expect(first.canActivate(context)).rejects.toThrow(
                RequestContextMissingException
            );
            expect(policyAbilityDomain.buildAbility).not.toHaveBeenCalled();
        });
    });

    it('reads the authorized workspace target from CLS and rejects when absent', () => {
        const cls = mock<ClsService>();
        const target = { id: 'target-workspace-id' };
        cls.get.mockReturnValue(target);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        const factory = extractFactory(() => WorkspaceTargetCurrent());

        expect(factory(undefined)).toBe(target);
        expect(factory('id')).toBe('target-workspace-id');
        expect(cls.get).toHaveBeenCalledWith(WorkspaceTargetStoreKey);

        cls.get.mockReturnValue(undefined);
        expect(() => factory(undefined)).toThrow(
            RequestContextMissingException
        );

        cls.get.mockReturnValue({ field: null });
        expect(() => factory('field')).toThrow(RequestContextMissingException);
    });

    it('reads the authorized member target from CLS and rejects when absent', () => {
        const cls = mock<ClsService>();
        const target = { id: 'target-member-id' };
        cls.get.mockReturnValue(target);
        vi.mocked(ClsServiceManager.getClsService).mockReturnValue(cls);
        const factory = extractFactory(() => WorkspaceMemberTargetCurrent());

        expect(factory(undefined)).toBe(target);
        expect(factory('id')).toBe('target-member-id');
        expect(cls.get).toHaveBeenCalledWith(WorkspaceMemberTargetStoreKey);

        cls.get.mockReturnValue(undefined);
        expect(() => factory(undefined)).toThrow(
            RequestContextMissingException
        );

        cls.get.mockReturnValue({ field: null });
        expect(() => factory('field')).toThrow(RequestContextMissingException);
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
