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
import type { Prisma, Project } from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import {
    ProjectMemberPolicyRequiredMetaKey,
    ProjectMemberTargetStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPolicyGuard } from '@modules/project/guards/project.member.policy.guard';
import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';

type THttpArgumentsHost = ReturnType<ExecutionContext['switchToHttp']>;
type TTaggedMember = ReturnType<PolicyUtil['toSubject']>;

describe('ProjectMemberPolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const policyUtil: MockProxy<PolicyUtil> = mock<PolicyUtil>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const httpArgumentsHost: MockProxy<THttpArgumentsHost> =
        mock<THttpArgumentsHost>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const project = mock<Project>({ id: 'project-id' });
    const targetMember = mock<IProjectMemberWithRole>({
        id: 'target-member-id',
    });
    const tagged = mock<TTaggedMember>();
    const predicate: Prisma.ProjectMemberWhereInput = { userId: 'user-id' };
    const handler = () => undefined;
    let store: Record<string, unknown>;
    let guard: ProjectMemberPolicyGuard;

    const declare = (...actions: EnumPolicyAction[]): void => {
        reflector.get.mockReturnValue(actions);
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        store = {
            [PolicyAbilityStoreKey]: ability,
            [ProjectStoreKey]: project,
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
            params: { projectMemberId: 'target-member-id' },
        });
        databaseUtil.checkIdIsValid.mockReturnValue(true);
        policyDomain.requireAccessibleWhere.mockReturnValue(predicate);
        projectMemberDomain.getOneByIdAndProject.mockResolvedValue(
            targetMember
        );
        policyUtil.toSubject.mockReturnValue(tagged);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberPolicyGuard,
                { provide: Reflector, useValue: reflector },
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: PolicyUtil, useValue: policyUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: ProjectMemberDomain,
                    useValue: projectMemberDomain,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = moduleRef.get(ProjectMemberPolicyGuard);
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
                    ProjectMemberPolicyRequiredMetaKey,
                    handler
                );
            }
        );

        it.each([[PolicyAbilityStoreKey], [ProjectStoreKey]])(
            'throws RequestContextMissingException when %s is not stored',
            async key => {
                declare(EnumPolicyAction.update);
                delete store[key];

                await expect(guard.canActivate(context)).rejects.toThrow(
                    RequestContextMissingException
                );
                expect(policyDomain.requireStored).toHaveBeenCalledWith(key);
            }
        );

        it('loads the route projectMemberId through the policy predicate within the stored project', async () => {
            declare(EnumPolicyAction.update);

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(policyDomain.requireAccessibleWhere).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                EnumPolicySubject.ProjectMember
            );
            expect(
                projectMemberDomain.getOneByIdAndProject
            ).toHaveBeenCalledWith('project-id', 'target-member-id', predicate);
        });

        it('answers not found for a route projectMemberId that is not a valid id, without querying', async () => {
            declare(EnumPolicyAction.update);
            httpArgumentsHost.getRequest.mockReturnValue({
                params: { projectMemberId: 'not-a-uuid' },
            });
            databaseUtil.checkIdIsValid.mockReturnValue(false);

            await expect(guard.canActivate(context)).rejects.toThrow(
                ProjectMemberNotFoundException
            );
            expect(databaseUtil.checkIdIsValid).toHaveBeenCalledWith(
                'not-a-uuid'
            );
            expect(
                projectMemberDomain.getOneByIdAndProject
            ).not.toHaveBeenCalled();
        });

        it('judges the loaded target record tagged as a ProjectMember and stores it', async () => {
            declare(EnumPolicyAction.delete);

            await guard.canActivate(context);

            expect(policyUtil.toSubject).toHaveBeenCalledWith(
                EnumPolicySubject.ProjectMember,
                targetMember
            );
            expect(policyDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.delete,
                tagged
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ProjectMemberTargetStoreKey,
                targetMember
            );
        });

        it('checks the subject type only and loads no record when the route carries no projectMemberId', async () => {
            declare(EnumPolicyAction.create);
            httpArgumentsHost.getRequest.mockReturnValue({ params: {} });

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(policyDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.create,
                EnumPolicySubject.ProjectMember
            );
            expect(
                projectMemberDomain.getOneByIdAndProject
            ).not.toHaveBeenCalled();
            expect(policyDomain.requireAccessibleWhere).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('propagates a type-level denial when the route carries no projectMemberId', async () => {
            declare(EnumPolicyAction.create);
            httpArgumentsHost.getRequest.mockReturnValue({ params: {} });
            policyDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(guard.canActivate(context)).rejects.toThrow(
                PolicyForbiddenException
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
                projectMemberDomain.getOneByIdAndProject
            ).not.toHaveBeenCalled();
            expect(requestStoreService.set).not.toHaveBeenCalled();
        });

        it('propagates not found when the predicate-scoped query returns no row', async () => {
            declare(EnumPolicyAction.update);
            projectMemberDomain.getOneByIdAndProject.mockRejectedValue(
                new ProjectMemberNotFoundException()
            );

            await expect(guard.canActivate(context)).rejects.toThrow(
                ProjectMemberNotFoundException
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
    });

    describe('authorizeTarget', () => {
        it('returns the target after loading it through the predicate and asserting the tagged record', async () => {
            await expect(
                guard['authorizeTarget'](
                    ability,
                    EnumPolicyAction.update,
                    'project-id',
                    'target-member-id'
                )
            ).resolves.toBe(targetMember);

            expect(
                projectMemberDomain.getOneByIdAndProject
            ).toHaveBeenCalledWith('project-id', 'target-member-id', predicate);
            expect(policyDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                tagged
            );
        });
    });
});
