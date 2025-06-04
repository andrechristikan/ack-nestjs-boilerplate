import { Module } from '@nestjs/common';
import { RouterModule } from '@router/router.module';
import { CommonModule } from '@common/common.module';
import { AppMiddlewareModule } from '@app/app.middleware.module';
import { WorkerModule } from '@worker/worker.module';

@Module({
    controllers: [],
    providers: [],
    imports: [
        // Common
        CommonModule,
        AppMiddlewareModule,

        // Routes
        RouterModule,

        // Workers
        WorkerModule,
    ],
})
export class AppModule {}
