import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Prisma, Workspace } from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import {
    WorkspaceMemberPolicyRequiredMetaKey,
    WorkspaceMemberStoreKey,
    WorkspaceMemberTargetStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPolicyGuard } from '@modules/workspace/guards/workspace.member.policy.guard';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';

type THttpArgumentsHost = ReturnType<ExecutionContext['switchToHttp']>;
type TTaggedMember = ReturnType<PolicyUtil['toSubject']>;

describe('WorkspaceMemberPolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const policyUtil: MockProxy<PolicyUtil> = mock<PolicyUtil>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<THttpArgumentsHost> =
        mock<THttpArgumentsHost>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const workspace = mock<Workspace>({ id: 'workspace-id' });
    const actingMember = mock<IWorkspaceMemberWithRole>({
        id: 'acting-member-id',
    });
    const targetMember = mock<IWorkspaceMemberWithRole>({
        id: 'target-member-id',
    });
    const tagged = mock<TTaggedMember>();
    const predicate: Prisma.WorkspaceMemberWhereInput = {
        role: { key: 'member' },
    };
    const handler = () => undefined;
    let store: Record<string, unknown>;
    let guard: WorkspaceMemberPolicyGuard;

    const declare = (...actions: EnumPolicyAction[]): void => {
        reflector.get.mockReturnValue(actions);
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        store = {
            [PolicyAbilityStoreKey]: ability,
            [WorkspaceStoreKey]: workspace,
            [WorkspaceMemberStoreKey]: actingMember,
        };
        requestStoreService.get.mockImplementation(key => store[key] ?? null);
        policyDomain.requireStored.mockImplementation(key => {
            const value = store[key];
            if (value === undefined) {
                throw new RequestContextMissingException(key);
            }

            return value as never;
        });
        context.getHandler.mockReturnValue(handler);
        context.switchToHttp.mockReturnValue(httpArgumentsHost);
        httpArgumentsHost.getRequest.mockReturnValue({
            params: { workspaceMemberId: 'target-member-id' },
        });
        databaseUtil.checkIdIsValid.mockReturnValue(true);
        policyDomain.requireAccessibleWhere.mockReturnValue(predicate);
        workspaceMemberDomain.getOneByIdAndWorkspace.mockResolvedValue(
            targetMember
        );
        policyUtil.toSubject.mockReturnValue(tagged);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberPolicyGuard,
                { provide: Reflector, useValue: reflector },
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: PolicyUtil, useValue: policyUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = moduleRef.get(WorkspaceMemberPolicyGuard);
    });

    describe('canActivate', () => {
        it.each([
            ['empty', []],
            ['absent', undefined],
        ])(
            'throws PolicyPredefinedNotFoundException when the action metadata is %s',
            async (_name, metadata) => {
                reflector.get.mockReturnValue(metadata);

                await expect(guard.canActivate(context)).rejects.toThrow(
                    PolicyPredefinedNotFoundException
                );
                expect(reflector.get).toHaveBeenCalledWith(
                    WorkspaceMemberPolicyRequiredMetaKey,
                    handler
                );
            }
        );

        it.each([
            [PolicyAbilityStoreKey],
            [WorkspaceStoreKey],
            [WorkspaceMemberStoreKey],
        ])(
            'throws RequestContextMissingException when %s is not stored',
            async key => {
                declare(EnumPolicyAction.update);
                delete store[key];

                await expect(guard.canActivate(context)).rejects.toThrow(
                    RequestContextMissingException
                );
                expect(policyDomain.requireStored).toHaveBeenCalledWith(key);
                expect(
                    workspaceMemberDomain.getOneByIdAndWorkspace
                ).not.toHaveBeenCalled();
            }
        );

        it('loads the route workspaceMemberId through the policy predicate, never the acting member', async () => {
            declare(EnumPolicyAction.update);

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(policyDomain.requireAccessibleWhere).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                EnumPolicySubject.WorkspaceMember
            );
            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).toHaveBeenCalledWith(
                'workspace-id',
                'target-member-id',
                predicate
            );
            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).not.toHaveBeenCalledWith(
                'workspace-id',
                'acting-member-id',
                predicate
            );
        });

        it('answers not found for a route workspaceMemberId that is not a valid id, without querying', async () => {
            declare(EnumPolicyAction.update);
            httpArgumentsHost.getRequest.mockReturnValue({
                params: { workspaceMemberId: 'not-a-uuid' },
            });
            databaseUtil.checkIdIsValid.mockReturnValue(false);

            await expect(guard.canActivate(context)).rejects.toThrow(
                WorkspaceMemberNotFoundException
            );
            expect(databaseUtil.checkIdIsValid).toHaveBeenCalledWith(
                'not-a-uuid'
            );
            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(policyDomain.requireAccessibleWhere).not.toHaveBeenCalled();
        });

        it('falls back to the acting member only when the route carries no workspaceMemberId', async () => {
            declare(EnumPolicyAction.read);
            httpArgumentsHost.getRequest.mockReturnValue({ params: {} });

            await guard.canActivate(context);

            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).toHaveBeenCalledWith(
                'workspace-id',
                'acting-member-id',
                predicate
            );
        });

        it('judges the loaded target record tagged as a WorkspaceMember and stores it', async () => {
            declare(EnumPolicyAction.delete);

            await guard.canActivate(context);

            expect(policyUtil.toSubject).toHaveBeenCalledWith(
                EnumPolicySubject.WorkspaceMember,
                targetMember
            );
            expect(policyDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.delete,
                tagged
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                WorkspaceMemberTargetStoreKey,
                targetMember
            );
        });

        it('answers forbidden without querying when the ability holds no rule for the subject', async () => {
            declare(EnumPolicyAction.update);
            policyDomain.requireAccessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(guard.canActivate(context)).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('propagates not found when the predicate-scoped query returns no row', async () => {
            declare(EnumPolicyAction.update);
            workspaceMemberDomain.getOneByIdAndWorkspace.mockRejectedValue(
                new WorkspaceMemberNotFoundException()
            );

            await expect(guard.canActivate(context)).rejects.toThrow(
                WorkspaceMemberNotFoundException
            );
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('propagates a denying assertCan on the record and stores nothing', async () => {
            declare(EnumPolicyAction.update);
            policyDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(guard.canActivate(context)).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('judges every declared action with its own predicate and stores the last target', async () => {
            declare(EnumPolicyAction.read, EnumPolicyAction.update);

            await guard.canActivate(context);

            expect(policyDomain.requireAccessibleWhere).toHaveBeenNthCalledWith(
                1,
                ability,
                EnumPolicyAction.read,
                EnumPolicySubject.WorkspaceMember
            );
            expect(policyDomain.requireAccessibleWhere).toHaveBeenNthCalledWith(
                2,
                ability,
                EnumPolicyAction.update,
                EnumPolicySubject.WorkspaceMember
            );
            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).toHaveBeenCalledTimes(2);
            expect(policyDomain.assertCan).toHaveBeenCalledTimes(2);
        });
    });

    describe('authorizeTarget', () => {
        it('returns the target after loading it through the predicate and asserting the tagged record', async () => {
            await expect(
                guard['authorizeTarget'](
                    ability,
                    EnumPolicyAction.update,
                    'workspace-id',
                    'target-member-id'
                )
            ).resolves.toBe(targetMember);

            expect(
                workspaceMemberDomain.getOneByIdAndWorkspace
            ).toHaveBeenCalledWith(
                'workspace-id',
                'target-member-id',
                predicate
            );
            expect(policyDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                tagged
            );
        });
    });
});
