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
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
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
    const accessibleWhere = { deletedAt: null };
    const termPolicy = mock<TermPolicy>();
    const stored = {
        id: 'term-policy-id',
        type: EnumTermPolicyType.privacy,
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
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
        policyAbilityDomain.accessibleWhere.mockReturnValue(accessibleWhere);

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

            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
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
                accessibleWhere
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
                accessibleWhere
            );
        });

        it('propagates PolicyForbiddenException and skips the domain when the ability has no read rule', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
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
            expect(policyAbilityDomain.accessibleWhere).not.toHaveBeenCalled();
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
            expect(policyAbilityDomain.assertCan).not.toHaveBeenCalled();
            expect(termPolicyDomain.createByAdmin).toHaveBeenCalledWith(body);
        });
    });

    describe('deleteByAdmin', () => {
        it('checks delete on the loaded policy, delegates to the domain and wraps the deleted policy', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);
            termPolicyDomain.deleteByAdmin.mockResolvedValue(termPolicy);

            await expect(
                service.deleteByAdmin('term-policy-id')
            ).resolves.toEqual({ data: termPolicy });
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.delete,
                subject(EnumPolicySubject.TermPolicy, stored)
            );
            expect(termPolicyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'term-policy-id'
            );
        });

        it('throws PolicyForbiddenException and never calls the domain mutation when the record is denied', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.deleteByAdmin('term-policy-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(termPolicyDomain.deleteByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.deleteByAdmin('term-policy-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(termPolicyDomain.deleteByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('publishByAdmin', () => {
        it('checks update on the loaded policy, delegates to the domain and answers an empty envelope', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);
            termPolicyDomain.publishByAdmin.mockResolvedValue(undefined);

            await expect(
                service.publishByAdmin('term-policy-id', 'admin-id')
            ).resolves.toEqual({});
            expect(termPolicyDomain.getOne).toHaveBeenCalledWith(
                'term-policy-id'
            );
            expect(policyAbilityDomain.assertCan).toHaveBeenCalledWith(
                EnumPolicyAction.update,
                subject(EnumPolicySubject.TermPolicy, stored)
            );
            expect(termPolicyDomain.publishByAdmin).toHaveBeenCalledWith(
                'term-policy-id',
                'admin-id'
            );
        });

        it('throws PolicyForbiddenException and never calls the domain mutation when the record is denied', async () => {
            termPolicyDomain.getOne.mockResolvedValue(stored);
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                service.publishByAdmin('term-policy-id', 'admin-id')
            ).rejects.toThrow(PolicyForbiddenException);
            expect(termPolicyDomain.publishByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and writes nothing when no ability is stored', async () => {
            policyAbilityDomain.assertCan.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(
                service.publishByAdmin('term-policy-id', 'admin-id')
            ).rejects.toThrow(RequestContextMissingException);
            expect(termPolicyDomain.publishByAdmin).not.toHaveBeenCalled();
        });
    });
});
