import { FirebaseService } from '@common/firebase/services/firebase.service';
import {
    INotificationNewLoginPayload,
    INotificationWorkerPayload,
} from '@modules/notification/interfaces/notification.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { IQueueResponse } from 'src/queues/interfaces/queue.interface';

@Injectable()
export class NotificationProcessorService {
    constructor(private readonly firebaseService: FirebaseService) {}

    async processNewLogin({
        send: { deviceFingerprint, userId, username },
        data,
    }: INotificationWorkerPayload<INotificationNewLoginPayload>): Promise<IQueueResponse> {
        if (!this.firebaseService.isInitializedFlag) {
            return {
                message:
                    'Firebase not initialized, skipping new login notification',
            };
        }

        // TODO: NEXT - Implement new login notification logic here

        return {
            message: 'New login notification processed',
        };
    }

    //     async processLogin(job: NotificationPushJobDto): Promise<void> {
    //         const tokens =
    //             await this.notificationPushTokenRepository.findActiveTokensByUser(
    //                 job.userId
    //             );

    //         if (!tokens.length) {
    //             this.logger.log({
    //                 message: 'pushLoginSkipped',
    //                 reason: 'noActiveTokens',
    //                 userId: job.userId,
    //                 type: job.type,
    //                 title: job.title,
    //             });
    //             return;
    //         }

    //         // Create delivery record if notificationId provided
    //         let deliveryId: string | undefined;
    //         if (job.notificationId) {
    //             const delivery = await this.notificationDeliveryRepository.create(
    //                 job.notificationId,
    //                 EnumNotificationChannel.push
    //             );
    //             deliveryId = delivery.id;
    //         }

    //         // Check if Firebase is initialized
    //         if (!this.firebaseService.isInitialized()) {
    //             this.logger.warn({
    //                 message: 'firebaseNotInitialized',
    //                 userId: job.userId,
    //                 tokenCount: tokens.length,
    //             });

    //             if (deliveryId) {
    //                 await this.notificationDeliveryRepository.markFailed(
    //                     deliveryId,
    //                     'Firebase not initialized'
    //                 );
    //             }
    //             return;
    //         }

    //         // Convert data to string values for FCM
    //         const stringData: Record<string, string> = {};
    //         if (job.data) {
    //             for (const [key, value] of Object.entries(job.data)) {
    //                 stringData[key] = String(value);
    //             }
    //         }

    //         // Send to all tokens
    //         const tokenStrings = tokens.map(t => t.token);
    //         const result = await this.firebaseService.sendMulticast(
    //             tokenStrings,
    //             {
    //                 title: job.title,
    //                 body: job.body,
    //                 data: stringData,
    //             }
    //         );

    //         this.logger.log({
    //             message: 'pushLoginSent',
    //             userId: job.userId,
    //             type: job.type,
    //             title: job.title,
    //             successCount: result.successCount,
    //             failureCount: result.failureCount,
    //             invalidTokenCount: result.invalidTokens.length,
    //         });

    //         // Determine successful tokens (all tokens minus invalid ones)
    //         const invalidSet = new Set(result.invalidTokens);
    //         const successfulTokens = tokenStrings.filter(t => !invalidSet.has(t));

    //         // Update token failure counts (awaited - critical data)
    //         try {
    //             // Reset failure count for successful tokens
    //             if (successfulTokens.length > 0) {
    //                 await this.notificationPushTokenRepository.resetFailureCountBatch(
    //                     successfulTokens
    //                 );
    //             }

    //             // Increment failure count for invalid tokens
    //             // Don't immediately revoke - use lazy cleanup strategy
    //             if (result.invalidTokens.length > 0) {
    //                 await this.notificationPushTokenRepository.incrementFailureCountBatch(
    //                     result.invalidTokens
    //                 );

    //                 // Enqueue async cleanup job (fire-and-forget, low priority)
    //                 // This is just scheduling - not critical data storage
    //                 this.enqueueTokenCleanup().catch(err =>
    //                     this.logger.error('Failed to enqueue token cleanup', err)
    //                 );
    //             }
    //         } catch (error: unknown) {
    //             this.logger.error('Failed to update token failure counts', error);
    //         }

    //         // Update delivery status
    //         if (deliveryId) {
    //             if (result.successCount > 0) {
    //                 await this.notificationDeliveryRepository.markSent(deliveryId);
    //             } else {
    //                 await this.notificationDeliveryRepository.markFailed(
    //                     deliveryId,
    //                     `All ${result.failureCount} pushes failed`
    //                 );
    //             }
    //         }
    //     }

    //     /**
    //      * Enqueue async token cleanup job (fire-and-forget)
    //      */
    //     private async enqueueTokenCleanup(): Promise<void> {
    //         await this.notificationQueue.add(
    //             EnumNotificationProcess.cleanupInvalidTokens,
    //             {},
    //             {
    //                 jobId: `${EnumNotificationProcess.cleanupInvalidTokens}-${Date.now()}`,
    //                 priority: EnumQueuePriority.LOW,
    //                 delay: 60000, // Wait 1 minute before cleanup
    //             }
    //         );
    //     }

    //     /**
    //      * Process token cleanup job - revokes stale tokens
    //      * Called by queue processor
    //      */
    //     async processTokenCleanup(): Promise<void> {
    //         const revokedCount =
    //             await this.notificationPushTokenRepository.revokeStaleTokens(
    //                 3, // Max failures before revoke
    //                 7 // Days since last failure
    //             );

    //         if (revokedCount > 0) {
    //             this.logger.log({
    //                 message: 'staleTokensRevoked',
    //                 count: revokedCount,
    //             });
    //         }
    //     }
}
