import { Module, Global } from '@nestjs/common';
import { LanguageService } from 'src/language/language.service';

@Global()
@Module({
    providers: [
        {
            provide: 'LanguageService',
            useClass: LanguageService
        }
    ],
    exports: [LanguageService],
    imports: []
})
export class LanguageModule {}
