import { Module } from '@nestjs/common';
import { UserService } from '@modules/user/services/user.service';
import { UserUtil } from '@modules/user/utils/user.util';
import { BullModule } from '@nestjs/bullmq';
import { ENUM_WORKER_QUEUES } from '@workers/enums/worker.enum';

@Module({
    imports: [
        BullModule.registerQueue({
            name: ENUM_WORKER_QUEUES.EMAIL,
        }),
    ],
    exports: [UserService, UserUtil],
    providers: [UserService, UserUtil],
    controllers: [],
})
export class UserModule {}
