import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { Prisma } from '@generated/prisma-client/client';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import type {
    ITermPolicyRef,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';

describe('TermPolicyAcceptanceService', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const tx = {} as IDatabaseTransactionClient;

    let service: TermPolicyAcceptanceService;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAcceptanceService,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        service = module.get(TermPolicyAcceptanceService);
    });

    describe('getPendingForUser', () => {
        const privacyV2: ITermPolicyRef = {
            id: 'privacy-2',
            type: EnumTermPolicyType.privacy,
            version: 2,
        };
        const termsV1: ITermPolicyRef = {
            id: 'terms-1',
            type: EnumTermPolicyType.termsOfService,
            version: 1,
        };

        it('defaults to terms-of-service and privacy when no required types are given', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue(
                []
            );

            await service.getPendingForUser('user-1', []);

            expect(
                termPolicyRepository.findLatestPublishedByTypes
            ).toHaveBeenCalledWith([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
        });

        it('returns an empty list and reads no acceptance when no required type is published', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue(
                []
            );

            const result = await service.getPendingForUser('user-1', [
                EnumTermPolicyType.marketing,
            ]);

            expect(result).toEqual([]);
            expect(
                termPolicyRepository.findAcceptedTermPolicyIdsByUser
            ).not.toHaveBeenCalled();
        });

        it('returns the latest published policy the user accepted only at an earlier version', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue([
                termsV1,
                privacyV2,
            ]);
            termPolicyRepository.findAcceptedTermPolicyIdsByUser.mockResolvedValue(
                ['terms-1', 'privacy-1']
            );

            const result = await service.getPendingForUser('user-1', []);

            expect(
                termPolicyRepository.findAcceptedTermPolicyIdsByUser
            ).toHaveBeenCalledWith('user-1', ['terms-1', 'privacy-2']);
            expect(result).toEqual([privacyV2]);
        });

        it('returns an empty list when the user accepted every latest published policy', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue([
                termsV1,
                privacyV2,
            ]);
            termPolicyRepository.findAcceptedTermPolicyIdsByUser.mockResolvedValue(
                ['terms-1', 'privacy-2']
            );

            const result = await service.getPendingForUser('user-1', []);

            expect(result).toEqual([]);
        });
    });

    describe('validateTermPolicyGuard', () => {
        it('resolves when nothing is pending', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue(
                []
            );

            await expect(
                service.validateTermPolicyGuard('user-1', [])
            ).resolves.toBeUndefined();
        });

        it('throws TermPolicyRequiredInvalidException when the user accepted only version 1 and version 2 is published', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue([
                {
                    id: 'privacy-2',
                    type: EnumTermPolicyType.privacy,
                    version: 2,
                },
            ]);
            termPolicyRepository.findAcceptedTermPolicyIdsByUser.mockResolvedValue(
                []
            );

            const promise = service.validateTermPolicyGuard('user-1', [
                EnumTermPolicyType.privacy,
            ]);

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.requiredInvalid
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'termPolicy.error.requiredInvalid',
            });
        });
    });

    describe('assertRequiredPublishedInTx', () => {
        it('returns the latest published policy of every required type', async () => {
            const refs: ITermPolicyRef[] = [
                {
                    id: 'terms-1',
                    type: EnumTermPolicyType.termsOfService,
                    version: 1,
                },
                {
                    id: 'privacy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
            ];
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                refs
            );

            const result = await service.assertRequiredPublishedInTx(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);

            expect(result).toBe(refs);
            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
        });

        it('throws TermPolicyRequiredNotPublishedException when privacy has no published row', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [
                    {
                        id: 'terms-1',
                        type: EnumTermPolicyType.termsOfService,
                        version: 1,
                    },
                ]
            );

            const promise = service.assertRequiredPublishedInTx(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.requiredNotPublished,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.requiredNotPublished
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'termPolicy.error.requiredNotPublished',
            });
        });
    });

    describe('getListUserAccepted', () => {
        it('delegates to the repository with the user id and pagination params', async () => {
            const params = {
                limit: 20,
                orderBy: [],
                fingerprint: 'aaaaaaaaaaaaaaaa',
            };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [] as ITermPolicyUserAcceptance[],
            };
            termPolicyRepository.findUserAccepted.mockResolvedValue(page);

            const result = await service.getListUserAccepted('user-1', params);

            expect(result).toBe(page);
            expect(termPolicyRepository.findUserAccepted).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });

    describe('acceptPublishedManyInTx', () => {
        const privacyRef: ITermPolicyRef = {
            id: 'term-policy-privacy',
            type: EnumTermPolicyType.privacy,
            version: 2,
        };
        const marketingRef: ITermPolicyRef = {
            id: 'term-policy-marketing',
            type: EnumTermPolicyType.marketing,
            version: 1,
        };

        it('writes the acceptance rows of every entry in one repository statement', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [privacyRef, marketingRef]
            );

            await service.acceptPublishedManyInTx(tx, [
                {
                    userId: 'user-one',
                    types: [
                        EnumTermPolicyType.privacy,
                        EnumTermPolicyType.marketing,
                    ],
                    createdBy: 'user-one',
                },
                {
                    userId: 'user-two',
                    types: [EnumTermPolicyType.privacy],
                    createdBy: 'admin-id',
                },
            ]);

            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.marketing,
            ]);
            expect(termPolicyRepository.acceptManyInTx).toHaveBeenCalledTimes(
                1
            );
            expect(termPolicyRepository.acceptManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-one',
                        termPolicyId: 'term-policy-privacy',
                        createdBy: 'user-one',
                        acceptedAt: timestamp,
                    },
                    {
                        userId: 'user-one',
                        termPolicyId: 'term-policy-marketing',
                        createdBy: 'user-one',
                        acceptedAt: timestamp,
                    },
                    {
                        userId: 'user-two',
                        termPolicyId: 'term-policy-privacy',
                        createdBy: 'admin-id',
                        acceptedAt: timestamp,
                    },
                ]
            );
        });

        it('skips a type with no published policy', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [privacyRef]
            );

            await service.acceptPublishedManyInTx(tx, [
                {
                    userId: 'user-one',
                    types: [
                        EnumTermPolicyType.privacy,
                        EnumTermPolicyType.marketing,
                    ],
                    createdBy: 'user-one',
                },
            ]);

            expect(termPolicyRepository.acceptManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-one',
                        termPolicyId: 'term-policy-privacy',
                        createdBy: 'user-one',
                        acceptedAt: timestamp,
                    },
                ]
            );
        });

        it('issues no statement for an empty list', async () => {
            await service.acceptPublishedManyInTx(tx, []);

            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).not.toHaveBeenCalled();
            expect(termPolicyRepository.acceptManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('userAccept', () => {
        const latest: ITermPolicyRef = {
            id: 'term-policy-1',
            type: EnumTermPolicyType.privacy,
            version: 1,
        };

        it('throws TermPolicyNotFoundException when the transaction finds no published policy of the type', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                []
            );
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );

            const promise = service.userAccept(
                'user-1',
                EnumTermPolicyType.privacy
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'termPolicy.error.notFound',
            });
            expect(termPolicyRepository.acceptInTx).not.toHaveBeenCalled();
        });

        it('throws TermPolicyAlreadyAcceptedException when the acceptance insert collides on the unique index', async () => {
            const collision = new Prisma.PrismaClientKnownRequestError(
                'unique',
                { code: 'P2002', clientVersion: 'test' }
            );
            databaseService.withTransaction.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const promise = service.userAccept(
                'user-1',
                EnumTermPolicyType.privacy
            );

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyAlreadyAcceptedException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.alreadyAccepted
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'termPolicy.error.alreadyAccepted',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'termPolicyId'
            );
        });

        it('throws TermPolicyAlreadyAcceptedException when the transaction hits a write conflict', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            const promise = service.userAccept(
                'user-1',
                EnumTermPolicyType.privacy
            );

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyAlreadyAcceptedException,
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
                httpStatus: HttpStatus.BAD_REQUEST,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('accepts the latest published policy re-read inside the transaction and returns it', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [latest]
            );
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );

            const result = await service.userAccept(
                'user-1',
                EnumTermPolicyType.privacy
            );

            expect(result).toBe(latest);
            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledWith(tx, [EnumTermPolicyType.privacy]);
            expect(termPolicyRepository.acceptInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'term-policy-1',
                'user-1',
                timestamp
            );
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            const rawError = new Error('write failed');
            databaseService.withTransaction.mockRejectedValue(rawError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(null);

            const promise = service.userAccept(
                'user-1',
                EnumTermPolicyType.privacy
            );

            await expect(promise).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                rawError,
            });
        });
    });
});
