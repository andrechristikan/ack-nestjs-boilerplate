import { IErrorHttpFilterMetadata } from 'src/common/error/interfaces/error.interface';
import { IMessage } from 'src/common/message/interfaces/message.interface';

export class ResponsePagingMetadataDto {
    nextPage?: string;
    previousPage?: string;
    firstPage?: string;
    lastPage?: string;
}

export class ResponsePagingDto<T = Record<string, any>> {
    readonly statusCode: number;
    readonly message: string | IMessage;
    readonly totalData: number;
    totalPage?: number;
    currentPage?: number;
    perPage?: number;
    availableSearch?: string[];
    availableSort?: string[];
    readonly metadata?: IErrorHttpFilterMetadata & ResponsePagingMetadataDto;
    readonly data?: T[];
}
