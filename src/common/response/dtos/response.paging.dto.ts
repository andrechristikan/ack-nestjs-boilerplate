import { IMessage } from 'src/common/message/message.interface';

export class ResponsePagingMetadataDto {
    nextPage?: string;
    previousPage?: string;
    firstPage: string;
    lastPage: string;
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
    readonly metadata?: Record<string, any> & ResponsePagingMetadataDto;
    readonly data?: T[];
}
