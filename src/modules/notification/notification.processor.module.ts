import { DeviceDomainModule } from '@modules/device/device.domain.module';
import { NotificationEmailProcessor } from '@modules/notification/processors/notification.email.processor';
import { NotificationProcessor } from '@modules/notification/processors/notification.processor';
import { NotificationPushProcessor } from '@modules/notification/processors/notification.push.processor';
import { NotificationEmailProcessorService } from '@modules/notification/services/processor/notification.email.processor.service';
import { NotificationProcessorService } from '@modules/notification/services/processor/notification.processor.service';
import { NotificationPushProcessorService } from '@modules/notification/services/processor/notification.push.processor.service';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        NotificationProcessor,
        NotificationEmailProcessor,
        NotificationPushProcessor,
        NotificationProcessorService,
        NotificationEmailProcessorService,
        NotificationPushProcessorService,
    ],
    exports: [],
    imports: [DeviceDomainModule, UserDomainModule],
})
export class NotificationProcessorModule {}
