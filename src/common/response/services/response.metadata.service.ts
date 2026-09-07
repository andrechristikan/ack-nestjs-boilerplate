import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    RequestCorrelationIdStoreKey,
    RequestIdStoreKey,
    RequestLanguageStoreKey,
    RequestVersionStoreKey,
} from '@common/request/constants/request.constant';
import { ResponseMetadataDto } from '@common/response/dtos/response.metadata.dto';
import { IResponseMetadataService } from '@common/response/interfaces/response.metadata.service.interface';

/**
 * Builds the standard response metadata from the request store and mirrors it to response headers.
 */
@Injectable()
export class ResponseMetadataService implements IResponseMetadataService {
    private readonly defaultLanguage: EnumMessageLanguage;
    private readonly urlVersion: string;
    private readonly repoVersion: string;

    constructor(
        private readonly requestStoreService: RequestStoreService,
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService
    ) {
        this.defaultLanguage =
            this.configService.get<EnumMessageLanguage>('message.language')!;
        this.urlVersion = this.configService.get<string>(
            'app.urlVersion.version'
        )!;
        this.repoVersion = this.configService.get<string>('app.version')!;
    }

    create(): ResponseMetadataDto {
        const today = this.helperDateService.create();

        return {
            language:
                (this.requestStoreService.get<string>(
                    RequestLanguageStoreKey
                ) as EnumMessageLanguage) ?? this.defaultLanguage,
            timestamp: this.helperDateService.getTimestamp(today),
            timezone: this.helperDateService.getZone(today),
            version:
                this.requestStoreService.get<string>(RequestVersionStoreKey) ??
                this.urlVersion,
            repoVersion: this.repoVersion,
            requestId: this.requestStoreService.get<string>(RequestIdStoreKey)!,
            correlationId: this.requestStoreService.get<string>(
                RequestCorrelationIdStoreKey
            )!,
        };
    }

    setHeaders(response: Response, metadata: ResponseMetadataDto): void {
        response.setHeader('x-custom-lang', metadata.language);
        response.setHeader('x-timestamp', metadata.timestamp);
        response.setHeader('x-timezone', metadata.timezone);
        response.setHeader('x-version', metadata.version);
        response.setHeader('x-repo-version', metadata.repoVersion);
        response.setHeader('x-request-id', metadata.requestId);
        response.setHeader('x-correlation-id', metadata.correlationId);
    }
}
