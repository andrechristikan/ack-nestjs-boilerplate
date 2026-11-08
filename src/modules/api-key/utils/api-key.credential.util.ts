import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { EnumAppEnvironment } from '@app/enums/app.enum';

@Injectable()
export class ApiKeyCredentialUtil {
    private readonly env: EnumAppEnvironment;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService,
        private readonly helperHashService: HelperHashService
    ) {
        this.env = this.configService.get<EnumAppEnvironment>('app.env')!;
    }

    /** Prefixes the key with the environment; a null or empty key draws a random one. */
    createKey(key: string | null): string {
        if (key !== null && key !== '') {
            return `${this.env}_${key}`;
        }

        const random: string = this.helperStringService.random(25);
        return `${this.env}_${random}`;
    }

    createHash(key: string, secret: string): string {
        return this.helperHashService.sha256Hash(`${key}:${secret}`);
    }
}
