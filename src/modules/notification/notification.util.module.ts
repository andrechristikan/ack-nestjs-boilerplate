import { NotificationEmailUtil } from '@modules/notification/utils/notification.email.util';
import { NotificationPushUtil } from '@modules/notification/utils/notification.push.util';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
    controllers: [],
    providers: [NotificationUtil, NotificationEmailUtil, NotificationPushUtil],
    exports: [NotificationUtil, NotificationEmailUtil, NotificationPushUtil],
    imports: [],
})
export class NotificationUtilModule {}
