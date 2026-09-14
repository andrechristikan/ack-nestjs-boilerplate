import { HealthDomainModule } from '@modules/health/health.domain.module';
import { HealthHttpService } from '@modules/health/services/health.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [HealthHttpService],
    exports: [HealthHttpService],
    imports: [HealthDomainModule],
})
export class HealthHttpModule {}
