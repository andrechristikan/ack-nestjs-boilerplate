import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumAnalyticSnapshotSignal } from '@generated/prisma-client/client';
import type {
    IAnalyticRefreshSnapshotPayload,
    IAnalyticRefreshSnapshotQueueResponse,
} from '@modules/analytic/interfaces/analytic.interface';
import { AnalyticAnomalyService } from '@modules/analytic/services/analytic.anomaly.service';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import { AnalyticDeviceService } from '@modules/analytic/services/analytic.device.service';
import { AnalyticFraudService } from '@modules/analytic/services/analytic.fraud.service';
import { AnalyticSnapshotService } from '@modules/analytic/services/analytic.snapshot.service';
import { AnalyticWorkspaceService } from '@modules/analytic/services/analytic.workspace.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticProcessRefreshSnapshotUseCase implements IAppUseCase<
    [IAnalyticRefreshSnapshotPayload],
    IAnalyticRefreshSnapshotQueueResponse
> {
    constructor(
        private readonly analyticAnomalyService: AnalyticAnomalyService,
        private readonly analyticAuthService: AnalyticAuthService,
        private readonly analyticDeviceService: AnalyticDeviceService,
        private readonly analyticFraudService: AnalyticFraudService,
        private readonly analyticSnapshotService: AnalyticSnapshotService,
        private readonly analyticWorkspaceService: AnalyticWorkspaceService,
        private readonly messageService: MessageService
    ) {}

    private toResponse(
        signal: EnumAnalyticSnapshotSignal,
        count: number
    ): IAnalyticRefreshSnapshotQueueResponse {
        const message = this.messageService.setMessage(
            'analytic.queue.refreshSnapshot',
            { properties: { signal } }
        );

        return { message, signal, count };
    }

    async execute({
        signal,
    }: IAnalyticRefreshSnapshotPayload): Promise<IAnalyticRefreshSnapshotQueueResponse> {
        switch (signal) {
            case EnumAnalyticSnapshotSignal.sharedFingerprint: {
                const result =
                    await this.analyticFraudService.computeSharedFingerprint();
                await this.analyticSnapshotService.replace(signal, result);

                return this.toResponse(signal, result.items.length);
            }
            case EnumAnalyticSnapshotSignal.impossibleTravel: {
                const result =
                    await this.analyticAnomalyService.computeImpossibleTravel();
                await this.analyticSnapshotService.replace(signal, result);

                return this.toResponse(signal, result.items.length);
            }
            case EnumAnalyticSnapshotSignal.deviceProliferation: {
                const result =
                    await this.analyticAnomalyService.computeDeviceProliferation();
                await this.analyticSnapshotService.replace(signal, result);

                return this.toResponse(signal, result.items.length);
            }
            case EnumAnalyticSnapshotSignal.riskScore: {
                const result =
                    await this.analyticFraudService.computeRiskScore();
                await this.analyticSnapshotService.replace(signal, result);

                return this.toResponse(signal, result.items.length);
            }
            case EnumAnalyticSnapshotSignal.concurrentSessions: {
                const result =
                    await this.analyticAuthService.computeConcurrentSessions();
                await this.analyticSnapshotService.replace(signal, result);

                return this.toResponse(signal, result.items.length);
            }
            case EnumAnalyticSnapshotSignal.devicesPerUser: {
                const result =
                    await this.analyticDeviceService.computeDevicesPerUser();
                await this.analyticSnapshotService.replace(signal, result);

                return this.toResponse(signal, result.items.length);
            }
            case EnumAnalyticSnapshotSignal.workspaceMembership: {
                const result =
                    await this.analyticWorkspaceService.computeWorkspaceMembership();
                await this.analyticSnapshotService.replace(signal, result);

                return this.toResponse(signal, result.items.length);
            }
            case EnumAnalyticSnapshotSignal.mfaAdoption: {
                const result =
                    await this.analyticAuthService.computeMfaAdoption();
                await this.analyticSnapshotService.replace(signal, result);

                return this.toResponse(signal, result.items.length);
            }
            default: {
                const message = this.messageService.setMessage(
                    'analytic.queue.error.unknownProcess',
                    { properties: { process: signal } }
                );

                throw new QueueException(message, true);
            }
        }
    }
}
