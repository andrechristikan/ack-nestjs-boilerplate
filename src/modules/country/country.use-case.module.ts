import { CountryModule } from '@modules/country/country.module';
import { CountryGetListCursorUseCase } from '@modules/country/use-cases/country.get-list-cursor.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [CountryGetListCursorUseCase],
    exports: [CountryGetListCursorUseCase],
    imports: [CountryModule],
})
export class CountryUseCaseModule {}
