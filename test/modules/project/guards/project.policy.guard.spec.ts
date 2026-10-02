import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import {
    ProjectPolicyRequiredMetaKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectPolicyGuard } from '@modules/project/guards/project.policy.guard';

type TTaggedProject = ReturnType<PolicyUtil['toSubject']>;

describe('ProjectPolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const policyDomain: MockProxy<PolicyDomain> = mock<PolicyDomain>();
    const policyUtil: MockProxy<PolicyUtil> = mock<PolicyUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const ability: MockProxy<PolicyAbility> = mock<PolicyAbility>();
    const project = mock<Project>({ id: 'project-id' });
    const tagged = mock<TTaggedProject>();
    const handler = () => undefined;
    let store: Record<string, unknown>;
    let guard: ProjectPolicyGuard;

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
        policyUtil.toSubject.mockReturnValue(tagged);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectPolicyGuard,
                { provide: Reflector, useValue: reflector },
                { provide: PolicyDomain, useValue: policyDomain },
                { provide: PolicyUtil, useValue: policyUtil },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = moduleRef.get(ProjectPolicyGuard);
    });

    describe('canActivate', () => {
        it.each([
            ['empty', []],
            ['absent', undefined],
        ])(
            'throws PolicyPredefinedNotFoundException when the action metadata is %s',
            (_name, metadata) => {
                reflector.get.mockReturnValue(metadata);

                expect(() => guard.canActivate(context)).toThrow(
                    PolicyPredefinedNotFoundException
                );
                expect(reflector.get).toHaveBeenCalledWith(
                    ProjectPolicyRequiredMetaKey,
                    handler
                );
            }
        );

        it.each([[PolicyAbilityStoreKey], [ProjectStoreKey]])(
            'throws RequestContextMissingException when %s is not stored',
            key => {
                declare(EnumPolicyAction.read);
                delete store[key];

                expect(() => guard.canActivate(context)).toThrow(
                    RequestContextMissingException
                );
                expect(policyDomain.requireStored).toHaveBeenCalledWith(key);
                expect(policyDomain.assertCan).not.toHaveBeenCalled();
            }
        );

        it('judges the stored project record, tagged as a Project', () => {
            declare(EnumPolicyAction.update);

            expect(guard.canActivate(context)).toBe(true);

            expect(policyUtil.toSubject).toHaveBeenCalledWith(
                EnumPolicySubject.Project,
                project
            );
            expect(policyDomain.assertCan).toHaveBeenCalledTimes(1);
            expect(policyDomain.assertCan).toHaveBeenCalledWith(
                ability,
                EnumPolicyAction.update,
                tagged
            );
        });

        it('asserts every declared action in order', () => {
            declare(EnumPolicyAction.read, EnumPolicyAction.delete);

            guard.canActivate(context);

            expect(policyDomain.assertCan).toHaveBeenNthCalledWith(
                1,
                ability,
                EnumPolicyAction.read,
                tagged
            );
            expect(policyDomain.assertCan).toHaveBeenNthCalledWith(
                2,
                ability,
                EnumPolicyAction.delete,
                tagged
            );
        });

        it('propagates a denying assertCan and never returns true', () => {
            declare(EnumPolicyAction.update);
            policyDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            expect(() => guard.canActivate(context)).toThrow(
                PolicyForbiddenException
            );
        });
    });
});
