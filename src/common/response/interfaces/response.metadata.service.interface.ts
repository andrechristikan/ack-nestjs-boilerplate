import { Response } from 'express';
import { ResponseMetadataDto } from '@common/response/dtos/response.dto';

export interface IResponseMetadataService {
    create(): ResponseMetadataDto;
    setHeaders(response: Response, metadata: ResponseMetadataDto): void;
}
