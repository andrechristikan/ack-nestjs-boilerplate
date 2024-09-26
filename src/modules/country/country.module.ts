import { Module } from '@nestjs/common';
import { AwsModule } from 'src/modules/aws/aws.module';
import { CountryRepositoryModule } from 'src/modules/country/repository/country.repository.module';
import { CountryService } from 'src/modules/country/services/country.service';

@Module({
    imports: [CountryRepositoryModule, AwsModule],
    exports: [CountryService],
    providers: [CountryService],
    controllers: [],
})
export class CountryModule {}
