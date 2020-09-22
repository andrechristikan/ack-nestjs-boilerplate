import { IsString, Length } from 'class-validator';

import { LanguageService } from 'language/language.service';
import { Language } from 'language/language.decorator';

export class CountryStore {
    constructor(
        @Language() private readonly languageService: LanguageService,
    ) {}

    @IsString()
    @Length(1, 3)
    mobileNumberCode: string;

    @IsString()
    @Length(1, 3)
    countryCode: number;

    @IsString()
    countryName: string;
}
