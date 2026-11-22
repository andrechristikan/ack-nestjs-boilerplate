import { HealthModule } from '@modules/health/health.module';
import { HealthCheckAwsUseCase } from '@modules/health/use-cases/health.check-aws.use-case';
import { HealthCheckDatabaseUseCase } from '@modules/health/use-cases/health.check-database.use-case';
import { HealthCheckThirdPartyUseCase } from '@modules/health/use-cases/health.check-third-party.use-case';
import { HealthCheckInstanceUseCase } from '@modules/health/use-cases/health.check-instance.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        HealthCheckAwsUseCase,
        HealthCheckDatabaseUseCase,
        HealthCheckThirdPartyUseCase,
        HealthCheckInstanceUseCase,
    ],
    exports: [
        HealthCheckAwsUseCase,
        HealthCheckDatabaseUseCase,
        HealthCheckThirdPartyUseCase,
        HealthCheckInstanceUseCase,
    ],
    imports: [HealthModule],
})
export class HealthUseCaseModule {}
