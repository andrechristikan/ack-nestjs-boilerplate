import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthPrivateController } from 'src/modules/health/controllers/health.private.controller';
import { HealthModule } from 'src/modules/health/health.module';

@Module({
    controllers: [HealthPrivateController],
    providers: [],
    exports: [],
    imports: [HealthModule, TerminusModule],
})
export class RoutesPrivateModule {}
