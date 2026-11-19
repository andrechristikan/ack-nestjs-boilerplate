import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import {
    EnumAnalyticFraudBand,
    EnumAnalyticFraudContributingSignal,
} from '@modules/analytic/enums/analytic.enum';
import type { IAnalyticSnapshotResult } from '@modules/analytic/interfaces/analytic.interface';
import type { IAnalyticSharedFingerprint } from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { AnalyticProcessRefreshSnapshotUseCase } from '@modules/analytic/use-cases/analytic.process-refresh-snapshot.use-case';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

describe('AnalyticProcessRefreshSnapshotUseCase', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const analyticDeviceService: MockProxy<AnalyticDeviceService> =
        mock<AnalyticDeviceService>();
    const analyticAuthService: MockProxy<AnalyticAuthService> =
        mock<AnalyticAuthService>();
    const analyticFraudService: MockProxy<AnalyticFraudService> =
        mock<AnalyticFraudService>();
    const analyticAnomalyService: MockProxy<AnalyticAnomalyService> =
        mock<AnalyticAnomalyService>();
    const analyticSnapshotService: MockProxy<AnalyticSnapshotService> =
        mock<AnalyticSnapshotService>();
    const analyticWorkspaceService: MockProxy<AnalyticWorkspaceService> =
        mock<AnalyticWorkspaceService>();

    const sharedFingerprintResult: IAnalyticSnapshotResult<
        IAnalyticSharedFingerprint,
        null
    > = {
        items: [
            {
                key: 'fp-1',
                value: 3,
                occurredAt: null,
                data: {
                    fingerprint: 'fp-1',
                    userCount: 3,
                    userIds: ['user-1', 'user-2', 'user-3'],
                },
            },
            {
                key: 'fp-2',
                value: 2,
                occurredAt: null,
                data: {
                    fingerprint: 'fp-2',
                    userCount: 2,
                    userIds: ['user-4', 'user-5'],
                },
            },
        ],
        metadata: null,
        windowStart: null,
        windowEnd: null,
    };

    let useCase: AnalyticProcessRefreshSnapshotUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        messageService.setMessage.mockImplementation((path: string) => path);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticProcessRefreshSnapshotUseCase,
                { provide: MessageService, useValue: messageService },
                {
                    provide: AnalyticDeviceService,
                    useValue: analyticDeviceService,
                },
                {
                    provide: AnalyticAuthService,
                    useValue: analyticAuthService,
                },
                {
                    provide: AnalyticFraudService,
                    useValue: analyticFraudService,
                },
                {
                    provide: AnalyticAnomalyService,
                    useValue: analyticAnomalyService,
                },
                {
                    provide: AnalyticSnapshotService,
                    useValue: analyticSnapshotService,
                },
                {
                    provide: AnalyticWorkspaceService,
                    useValue: analyticWorkspaceService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticProcessRefreshSnapshotUseCase);
    });

    describe('execute', () => {
        it('computes the shared-fingerprint rows once, replaces the snapshot with them, and returns the signal with the row count', async () => {
            analyticFraudService.computeSharedFingerprint.mockResolvedValue(
                sharedFingerprintResult
            );

            const result = await useCase.execute({
                signal: EnumAnalyticSnapshotSignal.sharedFingerprint,
            });

            expect(
                analyticFraudService.computeSharedFingerprint
            ).toHaveBeenCalledTimes(1);
            expect(analyticSnapshotService.replace).toHaveBeenCalledTimes(1);
            expect(analyticSnapshotService.replace).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.sharedFingerprint,
                sharedFingerprintResult
            );
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'analytic.queue.refreshSnapshot',
                {
                    properties: {
                        signal: EnumAnalyticSnapshotSignal.sharedFingerprint,
                    },
                }
            );
            expect(result).toEqual({
                message: 'analytic.queue.refreshSnapshot',
                signal: EnumAnalyticSnapshotSignal.sharedFingerprint,
                count: 2,
            });
        });

        it('computes the impossible-travel rows, replaces the snapshot with them, and returns the row count', async () => {
            const snapshot = {
                items: [
                    {
                        key: 'user-1',
                        value: 5570.2,
                        occurredAt: new Date('2026-01-01T00:20:00.000Z'),
                        data: {
                            userId: 'user-1',
                            fromSessionId: 'session-1',
                            toSessionId: 'session-2',
                            distanceKm: 5570.2,
                            deltaMs: 1200000,
                        },
                    },
                ],
                metadata: { minDistanceKm: 500, maxDeltaInMs: 3600000 },
                windowStart: new Date('2025-12-02T00:00:00.000Z'),
                windowEnd: new Date('2026-01-01T00:00:00.000Z'),
            };
            analyticAnomalyService.computeImpossibleTravel.mockResolvedValue(
                snapshot
            );

            const result = await useCase.execute({
                signal: EnumAnalyticSnapshotSignal.impossibleTravel,
            });

            expect(
                analyticAnomalyService.computeImpossibleTravel
            ).toHaveBeenCalledTimes(1);
            expect(analyticSnapshotService.replace).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.impossibleTravel,
                snapshot
            );
            expect(result).toEqual({
                message: 'analytic.queue.refreshSnapshot',
                signal: EnumAnalyticSnapshotSignal.impossibleTravel,
                count: 1,
            });
        });

        it.each([
            'loginSpikeIp',
            'credentialStuffing',
            'accountTakeover',
            'sessionAfterAdmin',
        ])(
            'throws the fatal unknownProcess queue exception for %s, which no job computes',
            async name => {
                const signal = name as EnumAnalyticSnapshotSignal;
                const execution = useCase.execute({ signal });

                await expect(execution).rejects.toBeInstanceOf(QueueException);
                await expect(execution).rejects.toMatchObject({
                    message: 'analytic.queue.error.unknownProcess',
                    isFatal: true,
                });
                expect(analyticSnapshotService.replace).not.toHaveBeenCalled();
            }
        );

        it('computes the workspace-membership rows, replaces the snapshot with them, and returns the row count', async () => {
            const snapshot = {
                items: [
                    {
                        key: 'workspace-1',
                        value: 3,
                        occurredAt: null,
                        data: { workspaceId: 'workspace-1', count: 3 },
                    },
                    {
                        key: 'workspace-2',
                        value: 1,
                        occurredAt: null,
                        data: { workspaceId: 'workspace-2', count: 1 },
                    },
                ],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            };
            analyticWorkspaceService.computeWorkspaceMembership.mockResolvedValue(
                snapshot
            );

            const result = await useCase.execute({
                signal: EnumAnalyticSnapshotSignal.workspaceMembership,
            });

            expect(
                analyticWorkspaceService.computeWorkspaceMembership
            ).toHaveBeenCalledTimes(1);
            expect(analyticSnapshotService.replace).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.workspaceMembership,
                snapshot
            );
            expect(result).toEqual({
                message: 'analytic.queue.refreshSnapshot',
                signal: EnumAnalyticSnapshotSignal.workspaceMembership,
                count: 2,
            });
        });

        it('computes the mfa adoption header through the auth service, replaces the snapshot with it, and returns count 0', async () => {
            const snapshot = {
                items: [],
                metadata: { enabled: 40, total: 200 },
                windowStart: null,
                windowEnd: null,
            };
            analyticAuthService.computeMfaAdoption.mockResolvedValue(snapshot);

            const result = await useCase.execute({
                signal: EnumAnalyticSnapshotSignal.mfaAdoption,
            });

            expect(
                analyticAuthService.computeMfaAdoption
            ).toHaveBeenCalledTimes(1);
            expect(analyticSnapshotService.replace).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.mfaAdoption,
                snapshot
            );
            expect(result).toEqual({
                message: 'analytic.queue.refreshSnapshot',
                signal: EnumAnalyticSnapshotSignal.mfaAdoption,
                count: 0,
            });
        });

        it('computes the device-proliferation rows, replaces the snapshot with them, and returns the row count', async () => {
            const snapshot = {
                items: [
                    {
                        key: 'user-1',
                        value: 9,
                        occurredAt: null,
                        data: { userId: 'user-1', deviceCount: 9, zScore: 4.2 },
                    },
                ],
                metadata: { avg: 2.5, stdDev: 0.5, zScoreThreshold: 3 },
                windowStart: null,
                windowEnd: null,
            };
            analyticAnomalyService.computeDeviceProliferation.mockResolvedValue(
                snapshot
            );

            const result = await useCase.execute({
                signal: EnumAnalyticSnapshotSignal.deviceProliferation,
            });

            expect(
                analyticAnomalyService.computeDeviceProliferation
            ).toHaveBeenCalledTimes(1);
            expect(analyticSnapshotService.replace).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.deviceProliferation,
                snapshot
            );
            expect(result).toEqual({
                message: 'analytic.queue.refreshSnapshot',
                signal: EnumAnalyticSnapshotSignal.deviceProliferation,
                count: 1,
            });
        });

        it('computes the risk-score rows, replaces the snapshot with them, and returns the row count', async () => {
            const snapshot = {
                items: [
                    {
                        key: 'user-1',
                        value: 42,
                        occurredAt: null,
                        data: {
                            userId: 'user-1',
                            score: 42,
                            band: EnumAnalyticFraudBand.review,
                            contributingSignalCodes: [
                                EnumAnalyticFraudContributingSignal.nearLockout,
                            ],
                        },
                    },
                ],
                metadata: null,
                windowStart: new Date('2025-12-31T00:00:00.000Z'),
                windowEnd: new Date('2026-01-01T00:00:00.000Z'),
            };
            analyticFraudService.computeRiskScore.mockResolvedValue(snapshot);

            const result = await useCase.execute({
                signal: EnumAnalyticSnapshotSignal.riskScore,
            });

            expect(analyticFraudService.computeRiskScore).toHaveBeenCalledTimes(
                1
            );
            expect(analyticSnapshotService.replace).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.riskScore,
                snapshot
            );
            expect(result).toEqual({
                message: 'analytic.queue.refreshSnapshot',
                signal: EnumAnalyticSnapshotSignal.riskScore,
                count: 1,
            });
        });

        it('computes the concurrentSessions bucket rows, replaces the snapshot with them, and returns the row count', async () => {
            const snapshot = {
                items: [
                    {
                        key: '1',
                        value: 0,
                        occurredAt: null,
                        data: { key: '1', count: 2 },
                    },
                    {
                        key: '2',
                        value: 1,
                        occurredAt: null,
                        data: { key: '2', count: 0 },
                    },
                ],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            };
            analyticAuthService.computeConcurrentSessions.mockResolvedValue(
                snapshot
            );

            const result = await useCase.execute({
                signal: EnumAnalyticSnapshotSignal.concurrentSessions,
            });

            expect(
                analyticAuthService.computeConcurrentSessions
            ).toHaveBeenCalledTimes(1);
            expect(analyticSnapshotService.replace).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.concurrentSessions,
                snapshot
            );
            expect(result).toEqual({
                message: 'analytic.queue.refreshSnapshot',
                signal: EnumAnalyticSnapshotSignal.concurrentSessions,
                count: 2,
            });
        });

        it('computes the devicesPerUser bucket rows, replaces the snapshot with them, and returns the row count', async () => {
            const snapshot = {
                items: [
                    {
                        key: '1',
                        value: 0,
                        occurredAt: null,
                        data: { key: '1', count: 2 },
                    },
                    {
                        key: '2',
                        value: 1,
                        occurredAt: null,
                        data: { key: '2', count: 0 },
                    },
                ],
                metadata: null,
                windowStart: null,
                windowEnd: null,
            };
            analyticDeviceService.computeDevicesPerUser.mockResolvedValue(
                snapshot
            );

            const result = await useCase.execute({
                signal: EnumAnalyticSnapshotSignal.devicesPerUser,
            });

            expect(
                analyticDeviceService.computeDevicesPerUser
            ).toHaveBeenCalledTimes(1);
            expect(analyticSnapshotService.replace).toHaveBeenCalledWith(
                EnumAnalyticSnapshotSignal.devicesPerUser,
                snapshot
            );
            expect(result).toEqual({
                message: 'analytic.queue.refreshSnapshot',
                signal: EnumAnalyticSnapshotSignal.devicesPerUser,
                count: 2,
            });
        });

        it('throws the fatal unknownProcess queue exception for a signal outside the switch', async () => {
            const unknownSignal = 'unknown' as EnumAnalyticSnapshotSignal;
            const execution = useCase.execute({ signal: unknownSignal });

            await expect(execution).rejects.toBeInstanceOf(QueueException);
            await expect(execution).rejects.toMatchObject({
                message: 'analytic.queue.error.unknownProcess',
                isFatal: true,
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'analytic.queue.error.unknownProcess',
                {
                    properties: {
                        process: unknownSignal,
                    },
                }
            );
            expect(analyticSnapshotService.replace).not.toHaveBeenCalled();
        });
    });
});
