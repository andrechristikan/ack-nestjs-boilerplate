import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticFraudDomain } from '@modules/analytic/domains/analytic.fraud.domain';
import { AnalyticFraudHttpService } from '@modules/analytic/services/analytic.fraud.http.service';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';

describe('AnalyticFraudHttpService', () => {
    const analyticFraudDomain: MockProxy<AnalyticFraudDomain> =
        mock<AnalyticFraudDomain>();
    const analyticDateDomain: MockProxy<AnalyticDateDomain> =
        mock<AnalyticDateDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');
    const windowMs: number = 3600000;
    const pagination = {
        skip: 0,
        limit: 20,
        orderBy: [],
    };
    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
    };

    let service: AnalyticFraudHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();
        paginationQueryUtil.offset.mockReturnValue({
            params: pagination,
            storePatch: {},
        } as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticFraudHttpService,
                { provide: AnalyticFraudDomain, useValue: analyticFraudDomain },
                { provide: AnalyticDateDomain, useValue: analyticDateDomain },
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

        service = module.get(AnalyticFraudHttpService);
    });

    describe('credentialStuffingSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.credentialStuffingSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.credentialStuffingSummary(windowMs);

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.credentialStuffingSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudDomain.credentialStuffingSummary.mockResolvedValue({
                count: 0,
            });

            await service.credentialStuffingSummary();

            expect(
                analyticFraudDomain.credentialStuffingSummary
            ).toHaveBeenCalledWith(null);
        });
    });

    describe('credentialStuffingList', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        ipAddress: '10.0.0.1',
                        uniqueUsers: 5,
                        failCount: 9,
                    },
                ],
            };
            analyticFraudDomain.credentialStuffingList.mockResolvedValue(page);

            const result = await service.credentialStuffingList({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudDomain.credentialStuffingList
            ).toHaveBeenCalledWith(windowMs, pagination);
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.credentialStuffingList.mockResolvedValue(page);

            await service.credentialStuffingList({ page: 1, perPage: 20 });

            expect(
                analyticFraudDomain.credentialStuffingList
            ).toHaveBeenCalledWith(null, pagination);
        });
    });

    describe('accountTakeoverSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticFraudDomain.accountTakeoverSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.accountTakeoverSummary(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.accountTakeoverSummary
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticFraudDomain.accountTakeoverSummary.mockResolvedValue({
                count: 0,
            });

            await service.accountTakeoverSummary();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('accountTakeoverList', () => {
        it('hands the required range and pagination to the domain', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        indicatorCodes: ['newDeviceAfterPasswordChange'],
                        passwordChangedAt: startDate,
                    },
                ],
            };
            analyticFraudDomain.accountTakeoverList.mockResolvedValue(page);

            const result = await service.accountTakeoverList({
                startDate,
                endDate,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudDomain.accountTakeoverList
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
        });

        it('passes null dates when query dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.accountTakeoverList.mockResolvedValue(page);

            await service.accountTakeoverList({
                page: 1,
                perPage: 20,
            } as never);

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('massRegistrationSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.massRegistrationSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.massRegistrationSummary(windowMs);

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.massRegistrationSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudDomain.massRegistrationSummary.mockResolvedValue({
                count: 0,
            });

            await service.massRegistrationSummary();

            expect(
                analyticFraudDomain.massRegistrationSummary
            ).toHaveBeenCalledWith(null);
        });
    });

    describe('massRegistrationList', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [{ key: '10.0.0.1', count: 8 }],
            };
            analyticFraudDomain.massRegistrationList.mockResolvedValue(page);

            const result = await service.massRegistrationList({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudDomain.massRegistrationList
            ).toHaveBeenCalledWith(windowMs, pagination);
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.massRegistrationList.mockResolvedValue(page);

            await service.massRegistrationList({ page: 1, perPage: 20 });

            expect(
                analyticFraudDomain.massRegistrationList
            ).toHaveBeenCalledWith(null, pagination);
        });
    });

    describe('passwordResetEnumerationSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.passwordResetEnumerationSummary.mockResolvedValue(
                { count: 6, window: '24h', meta: { minUniqueAccounts: 5 } }
            );

            const result =
                await service.passwordResetEnumerationSummary(windowMs);

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.passwordResetEnumerationSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudDomain.passwordResetEnumerationSummary.mockResolvedValue(
                { count: 0 }
            );

            await service.passwordResetEnumerationSummary();

            expect(
                analyticFraudDomain.passwordResetEnumerationSummary
            ).toHaveBeenCalledWith(null);
        });
    });

    describe('passwordResetEnumerationList', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [{ key: 'example.com', count: 7 }],
            };
            analyticFraudDomain.passwordResetEnumerationList.mockResolvedValue(
                page
            );

            const result = await service.passwordResetEnumerationList({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudDomain.passwordResetEnumerationList
            ).toHaveBeenCalledWith(windowMs, pagination);
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.passwordResetEnumerationList.mockResolvedValue(
                page
            );

            await service.passwordResetEnumerationList({
                page: 1,
                perPage: 20,
            });

            expect(
                analyticFraudDomain.passwordResetEnumerationList
            ).toHaveBeenCalledWith(null, pagination);
        });
    });

    describe('sharedFingerprintSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.sharedFingerprintSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.sharedFingerprintSummary();

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.sharedFingerprintSummary
            ).toHaveBeenCalledWith();
        });
    });

    describe('sharedFingerprintList', () => {
        it('hands pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        fingerprint: 'fp-1',
                        userCount: 3,
                        userIds: ['user-1', 'user-2', 'user-3'],
                    },
                ],
            };
            analyticFraudDomain.sharedFingerprintList.mockResolvedValue(page);

            const result = await service.sharedFingerprintList({
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudDomain.sharedFingerprintList
            ).toHaveBeenCalledWith(pagination);
        });
    });

    describe('sessionAfterAdminSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticFraudDomain.sessionAfterAdminSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.sessionAfterAdminSummary(
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.sessionAfterAdminSummary
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticFraudDomain.sessionAfterAdminSummary.mockResolvedValue({
                count: 0,
            });

            await service.sessionAfterAdminSummary();

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('sessionAfterAdminList', () => {
        it('hands the required range and pagination to the domain', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        revokedAt: startDate,
                        loginAt: endDate,
                    },
                ],
            };
            analyticFraudDomain.sessionAfterAdminList.mockResolvedValue(page);

            const result = await service.sessionAfterAdminList({
                startDate,
                endDate,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudDomain.sessionAfterAdminList
            ).toHaveBeenCalledWith(startDate, endDate, pagination);
        });

        it('passes null dates when query dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.sessionAfterAdminList.mockResolvedValue(page);

            await service.sessionAfterAdminList({
                page: 1,
                perPage: 20,
            } as never);

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('forgotPasswordTokenAbuseSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.forgotPasswordTokenAbuseSummary.mockResolvedValue(
                { count: 6, window: '24h', meta: { minUniqueAccounts: 5 } }
            );

            const result =
                await service.forgotPasswordTokenAbuseSummary(windowMs);

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.forgotPasswordTokenAbuseSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudDomain.forgotPasswordTokenAbuseSummary.mockResolvedValue(
                { count: 0 }
            );

            await service.forgotPasswordTokenAbuseSummary();

            expect(
                analyticFraudDomain.forgotPasswordTokenAbuseSummary
            ).toHaveBeenCalledWith(null);
        });
    });

    describe('forgotPasswordTokenAbuseList', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [{ userId: 'user-1', tokenCount: 4 }],
            };
            analyticFraudDomain.forgotPasswordTokenAbuseList.mockResolvedValue(
                page
            );

            const result = await service.forgotPasswordTokenAbuseList({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudDomain.forgotPasswordTokenAbuseList
            ).toHaveBeenCalledWith(windowMs, pagination);
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.forgotPasswordTokenAbuseList.mockResolvedValue(
                page
            );

            await service.forgotPasswordTokenAbuseList({
                page: 1,
                perPage: 20,
            });

            expect(
                analyticFraudDomain.forgotPasswordTokenAbuseList
            ).toHaveBeenCalledWith(null, pagination);
        });
    });

    describe('refreshSpikeSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.refreshSpikeSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.refreshSpikeSummary(windowMs);

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.refreshSpikeSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudDomain.refreshSpikeSummary.mockResolvedValue({
                count: 0,
            });

            await service.refreshSpikeSummary();

            expect(
                analyticFraudDomain.refreshSpikeSummary
            ).toHaveBeenCalledWith(null);
        });
    });

    describe('refreshSpikeList', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [{ userId: 'user-1', count: 12 }],
            };
            analyticFraudDomain.refreshSpikeList.mockResolvedValue(page);

            const result = await service.refreshSpikeList({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticFraudDomain.refreshSpikeList).toHaveBeenCalledWith(
                windowMs,
                pagination
            );
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.refreshSpikeList.mockResolvedValue(page);

            await service.refreshSpikeList({ page: 1, perPage: 20 });

            expect(analyticFraudDomain.refreshSpikeList).toHaveBeenCalledWith(
                null,
                pagination
            );
        });
    });

    describe('backupCodeNewDeviceSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.backupCodeNewDeviceSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.backupCodeNewDeviceSummary(windowMs);

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(
                analyticFraudDomain.backupCodeNewDeviceSummary
            ).toHaveBeenCalledWith(windowMs);
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudDomain.backupCodeNewDeviceSummary.mockResolvedValue({
                count: 0,
            });

            await service.backupCodeNewDeviceSummary();

            expect(
                analyticFraudDomain.backupCodeNewDeviceSummary
            ).toHaveBeenCalledWith(null);
        });
    });

    describe('backupCodeNewDeviceList', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [{ userId: 'user-1', regeneratedAt: startDate }],
            };
            analyticFraudDomain.backupCodeNewDeviceList.mockResolvedValue(page);

            const result = await service.backupCodeNewDeviceList({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(
                analyticFraudDomain.backupCodeNewDeviceList
            ).toHaveBeenCalledWith(windowMs, pagination);
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.backupCodeNewDeviceList.mockResolvedValue(page);

            await service.backupCodeNewDeviceList({ page: 1, perPage: 20 });

            expect(
                analyticFraudDomain.backupCodeNewDeviceList
            ).toHaveBeenCalledWith(null, pagination);
        });
    });

    describe('apiKeyBurstSummary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.apiKeyBurstSummary.mockResolvedValue({
                count: 6,
                window: '24h',
                meta: { minUniqueAccounts: 5 },
            });

            const result = await service.apiKeyBurstSummary(windowMs);

            expect(result).toEqual({
                data: {
                    count: 6,
                    window: '24h',
                    meta: { minUniqueAccounts: 5 },
                },
            });
            expect(analyticFraudDomain.apiKeyBurstSummary).toHaveBeenCalledWith(
                windowMs
            );
        });

        it('passes null when windowMs is omitted', async () => {
            analyticFraudDomain.apiKeyBurstSummary.mockResolvedValue({
                count: 0,
            });

            await service.apiKeyBurstSummary();

            expect(analyticFraudDomain.apiKeyBurstSummary).toHaveBeenCalledWith(
                null
            );
        });
    });

    describe('apiKeyBurstList', () => {
        it('hands the window and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [{ userId: 'user-1', count: 9 }],
            };
            analyticFraudDomain.apiKeyBurstList.mockResolvedValue(page);

            const result = await service.apiKeyBurstList({
                windowMs,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticFraudDomain.apiKeyBurstList).toHaveBeenCalledWith(
                windowMs,
                pagination
            );
        });

        it('passes null when windowMs is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.apiKeyBurstList.mockResolvedValue(page);

            await service.apiKeyBurstList({ page: 1, perPage: 20 });

            expect(analyticFraudDomain.apiKeyBurstList).toHaveBeenCalledWith(
                null,
                pagination
            );
        });
    });

    describe('riskScore', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticFraudDomain.riskScore.mockResolvedValue({
                userId: 'user-1',
                score: 42,
                band: 'medium',
                contributingSignalCodes: ['signal-1'],
            });

            const result = await service.riskScore('user-1');

            expect(result).toEqual({
                data: {
                    userId: 'user-1',
                    score: 42,
                    band: 'medium',
                    contributingSignalCodes: ['signal-1'],
                },
            });
            expect(analyticFraudDomain.riskScore).toHaveBeenCalledWith(
                'user-1'
            );
        });
    });

    describe('riskScores', () => {
        it('hands the minScore and pagination to the domain', async () => {
            const page = {
                ...offsetPage,
                data: [
                    {
                        userId: 'user-1',
                        score: 42,
                        band: 'medium',
                        contributingSignalCodes: ['nearLockout'],
                    },
                ],
            };
            analyticFraudDomain.riskScores.mockResolvedValue(page);

            const result = await service.riskScores({
                minScore: 30,
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(page);
            expect(analyticFraudDomain.riskScores).toHaveBeenCalledWith(
                30,
                pagination
            );
        });

        it('passes null when minScore is omitted', async () => {
            const page = { ...offsetPage, data: [] };
            analyticFraudDomain.riskScores.mockResolvedValue(page);

            await service.riskScores({
                minScore: undefined,
                page: 1,
                perPage: 20,
            });

            expect(analyticFraudDomain.riskScores).toHaveBeenCalledWith(
                null,
                pagination
            );
        });
    });
});
