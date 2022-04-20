import { Module } from '@nestjs/common';
import { CoreModule } from 'src/core/core.module';
import { AppRouterModule } from './app.router.module';
@Module({
    controllers: [],
    providers: [],
    imports: [
        // Core
        CoreModule,

        // Router
        AppRouterModule,
    ],
})
export class AppModule {}
