import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { ITermPolicyTemplateService } from '@modules/term-policy/interfaces/term-policy.template.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TermPolicyTemplateService implements ITermPolicyTemplateService {
    private readonly uploadPath: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.uploadPath = this.configService.get<string>(
            'termPolicy.uploadPath'
        );
    }

    createDocumentFilename(mime: string): string {
        let path: string = `${this.uploadPath}/${this.helperStringService.randomReference(10)}`;
        const extension = mime.split('/')[1];

        if (path.startsWith('/')) {
            path = path.replace('/', '');
        }

        return `${path}.${extension.toLowerCase()}`;
    }

    createDocumentFilenameForMigration(
        type: ENUM_TERM_POLICY_TYPE,
        country: string,
        language: string,
        mime: string,
        version?: number
    ): string {
        let path: string = `${this.uploadPath}/${type}_v${version ?? 1}_${country}-${language}`;
        const extension = mime.split('/')[1];

        if (path.startsWith('/')) {
            path = path.replace('/', '');
        }

        return `${path}.${extension}`.toLowerCase();
    }
}
