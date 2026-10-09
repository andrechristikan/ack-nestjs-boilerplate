import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumUserStatus,
    Prisma,
} from '@generated/prisma-client/client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserImportHttpService } from '@modules/user/services/user.import.http.service';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';

describe('UserImportHttpService', () => {
    const userImportDomain: MockProxy<UserImportDomain> =
        mock<UserImportDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const policyAbilityDomain: MockProxy<PolicyAbilityDomain> =
        mock<PolicyAbilityDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const accessibleWhere = { roleId: 'role-id' };
    let service: UserImportHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityDomain.accessibleWhere.mockReturnValue(accessibleWhere);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportHttpService,
                { provide: UserImportDomain, useValue: userImportDomain },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                { provide: FileService, useValue: fileService },
                { provide: PolicyAbilityDomain, useValue: policyAbilityDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        service = module.get(UserImportHttpService);
    });

    describe('exportByAdmin', () => {
        it('requires the read predicate and passes it with the filters to the domain export', async () => {
            const statusWhere = { status: { in: [EnumUserStatus.active] } };
            const roleWhere = { roleId: { equals: 'role-id' } };
            const countryWhere = { countryId: { equals: 'country-id' } };
            paginationQueryUtil.inEnum.mockReturnValue({
                where: statusWhere,
                storeFilter: { status: [EnumUserStatus.active] },
            } as never);
            paginationQueryUtil.equalString
                .mockReturnValueOnce({
                    where: roleWhere,
                    storeFilter: { roleId: 'role-id' },
                } as never)
                .mockReturnValueOnce({
                    where: countryWhere,
                    storeFilter: { countryId: 'country-id' },
                } as never);
            userImportDomain.exportByAdmin.mockResolvedValue([]);
            fileService.writeCsv.mockReturnValue('csv');

            const result = await service.exportByAdmin({
                status: EnumUserStatus.active,
                roleId: 'role-id',
                countryId: 'country-id',
            });

            expect(policyAbilityDomain.accessibleWhere).toHaveBeenCalledWith(
                EnumPolicyAction.read,
                EnumPolicySubject.User
            );
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.UserScalarFieldEnum.status,
                EnumUserStatus.active,
                UserDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    filters: {
                        status: [EnumUserStatus.active],
                        roleId: 'role-id',
                        countryId: 'country-id',
                    },
                }
            );
            expect(userImportDomain.exportByAdmin).toHaveBeenCalledWith(
                statusWhere,
                roleWhere,
                countryWhere,
                accessibleWhere
            );
            expect(result).toEqual({
                data: 'csv',
                extension: EnumFileExtensionDocument.csv,
            });
        });

        it('throws PolicyForbiddenException and never exports when the ability has no read rule', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(service.exportByAdmin({})).rejects.toThrow(
                PolicyForbiddenException
            );
            expect(userImportDomain.exportByAdmin).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException and never exports when no ability is stored', async () => {
            policyAbilityDomain.accessibleWhere.mockImplementation(() => {
                throw new RequestContextMissingException(PolicyAbilityStoreKey);
            });

            await expect(service.exportByAdmin({})).rejects.toThrow(
                RequestContextMissingException
            );
            expect(userImportDomain.exportByAdmin).not.toHaveBeenCalled();
        });
    });
});
