import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { subject } from '@casl/ability';

import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyHttpService } from '@modules/term-policy/services/term-policy.http.service';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';

describe('TermPolicyHttpService', () => {
    const termPolicyDomain: MockProxy<TermPolicyDomain> =
        mock<TermPolicyDomain>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const scopeWhere = { deletedAt: null };
    const now = new Date('2026-01-01T00:00:00.000Z');
    const termPolicy = mock<TermPolicy>();
    const loadedTermPolicy = {
        id: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        contents: [],
    } satisfies ITermPolicy;
    const offsetParams = {
        where: undefined,
        limit: 20,
        skip: 0,
        orderBy: [],
    };
    const offsetStorePatch = {
        page: 1,
        perPage: 20,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['createdAt'],
        filters: {},
    };
    const cursorParams = {
        where: undefined,
        limit: 20,
        cursor: undefined,
        cursorField: 'id',
        orderBy: [],
    };
    const cursorStorePatch = {
        perPage: 20,
        cursor: undefined,
        orderBy: [],
        availableSearch: [],
        availableOrderBy: ['createdAt'],
        filters: {},
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [termPolicy],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        count: 1,
        perPage: 20,
        hasNext: false,
        cursor: undefined,
        data: [termPolicy],
    };

    let service: TermPolicyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.scope.mockReturnValue(scopeWhere);
        termPolicyDomain.getOne.mockResolvedValue(loadedTermPolicy);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyHttpService,
                { provide: TermPolicyDomain, useValue: termPolicyDomain },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                { provide: PaginationQueryUtil, useValue: paginationQueryUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = module.get(TermPolicyHttpService);
    });

    describe('getListByAdmin', () => {
        it('passes the type and status filters and the read predicate of TermPolicy to the domain list', async () => {
            const query = { type: 'privacy', status: 'published' };
            const typeWhere = { type: { in: ['privacy'] } };
            const statusWhere = { status: { in: ['published'] } };
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.inEnum
                .mockReturnValueOnce({
                    where: typeWhere,
                    storeFilter: { type: ['privacy'] },
                } as never)
                .mockReturnValueOnce({
                    where: statusWhere,
                    storeFilter: { status: ['published'] },
                } as never);
            termPolicyDomain.getListByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListByAdmin(query);

            expect(policyAbilityDomain.scope).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.TermPolicy
            );
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenNthCalledWith(
                1,
                Prisma.TermPolicyScalarFieldEnum.type,
                'privacy',
                TermPolicyDefaultType
            );
            expect(paginationQueryUtil.inEnum).toHaveBeenNthCalledWith(
                2,
                Prisma.TermPolicyScalarFieldEnum.status,
                'published',
                TermPolicyDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    ...offsetStorePatch,
                    filters: { type: ['privacy'], status: ['published'] },
                }
            );
            expect(termPolicyDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                typeWhere,
                statusWhere,
                scopeWhere
            );
            expect(result).toEqual(offsetPage);
        });

        it('merges an empty filter set and passes undefined filters when none are given', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: offsetStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            termPolicyDomain.getListByAdmin.mockResolvedValue(offsetPage);

            await service.getListByAdmin({});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...offsetStorePatch, filters: {} }
            );
            expect(termPolicyDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined,
                undefined,
                scopeWhere
            );
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.scope.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(service.getListByAdmin({})).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(termPolicyDomain.getListByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('getListPublished', () => {
        it('passes the type filter to the domain without a policy predicate', async () => {
            const query = { type: 'privacy' };
            const typeWhere = { type: { in: ['privacy'] } };
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue({
                where: typeWhere,
                storeFilter: { type: ['privacy'] },
            } as never);
            termPolicyDomain.getListPublished.mockResolvedValue(cursorPage);

            const result = await service.getListPublished(query);

            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.TermPolicyScalarFieldEnum.type,
                'privacy',
                TermPolicyDefaultType
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...cursorStorePatch, filters: { type: ['privacy'] } }
            );
            expect(termPolicyDomain.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                typeWhere
            );
            expect(policyAbilityDomain.scope).not.toHaveBeenCalled();
            expect(result).toEqual(cursorPage);
        });

        it('merges an empty filter set when no type is given', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: cursorStorePatch,
            } as never);
            paginationQueryUtil.inEnum.mockReturnValue(undefined);
            termPolicyDomain.getListPublished.mockResolvedValue(cursorPage);

            await service.getListPublished({});

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { ...cursorStorePatch, filters: {} }
            );
            expect(termPolicyDomain.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                undefined
            );
        });
    });

    describe('createByAdmin', () => {
        const body = {
            type: EnumTermPolicyType.privacy,
            version: 1,
            contents: [],
        } satisfies TermPolicyCreateRequestDto;

        it('delegates to the domain and wraps the created draft', async () => {
            termPolicyDomain.createByAdmin.mockResolvedValue(termPolicy);

            await expect(service.createByAdmin(body)).resolves.toEqual({
                data: termPolicy,
            });
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(termPolicyDomain.createByAdmin).toHaveBeenCalledWith(body);
        });
    });

    describe('deleteByAdmin', () => {
        it('loads the policy by identity, authorizes delete, and writes', async () => {
            termPolicyDomain.deleteByAdmin.mockResolvedValue(termPolicy);

            await expect(
                service.deleteByAdmin('term-policy-id')
            ).resolves.toEqual({ data: termPolicy });
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.TermPolicy, loadedTermPolicy)
            );
            expect(termPolicyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'term-policy-id'
            );
        });

        it('propagates TermPolicyNotFoundException from the identity load and does not authorize or write', async () => {
            termPolicyDomain.getOne.mockRejectedValue(
                new TermPolicyNotFoundException()
            );

            await expect(
                service.deleteByAdmin('term-policy-id')
            ).rejects.toThrow(TermPolicyNotFoundException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(termPolicyDomain.deleteByAdmin).not.toHaveBeenCalled();
        });

        it('throws PolicyForbiddenException from authorize after the identity load and never writes', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.deleteByAdmin('term-policy-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.TermPolicy, loadedTermPolicy)
            );
            expect(termPolicyDomain.deleteByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException from authorize after the identity load and writes nothing', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.deleteByAdmin('term-policy-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(termPolicyDomain.deleteByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('publishByAdmin', () => {
        it('loads the policy by identity, authorizes update, and writes', async () => {
            termPolicyDomain.publishByAdmin.mockResolvedValue(undefined);

            await expect(
                service.publishByAdmin('term-policy-id', 'admin-id')
            ).resolves.toEqual({});
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, loadedTermPolicy)
            );
            expect(termPolicyDomain.publishByAdmin).toHaveBeenCalledWith(
                'term-policy-id',
                'admin-id'
            );
        });

        it('propagates TermPolicyNotFoundException from the identity load and does not authorize or write', async () => {
            termPolicyDomain.getOne.mockRejectedValue(
                new TermPolicyNotFoundException()
            );

            await expect(
                service.publishByAdmin('term-policy-id', 'admin-id')
            ).rejects.toThrow(TermPolicyNotFoundException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).not.toHaveBeenCalled();
            expect(termPolicyDomain.publishByAdmin).not.toHaveBeenCalled();
        });

        it('throws PolicyForbiddenException from authorize after the identity load and never writes', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.publishByAdmin('term-policy-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.authorize).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, loadedTermPolicy)
            );
            expect(termPolicyDomain.publishByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException from authorize after the identity load and writes nothing', async () => {
            policyAbilityDomain.authorize.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.publishByAdmin('term-policy-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(termPolicyDomain.publishByAdmin).not.toHaveBeenCalled();
        });
    });
});
