import { Injectable } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { IRequestStoreParam } from '@common/request/interfaces/request.interface';

@Injectable()
export class RequestStorePipe implements PipeTransform<
    IRequestStoreParam,
    unknown
> {
    constructor(private readonly requestStoreService: RequestStoreService) {}

    transform({ storeKey, field, nullable }: IRequestStoreParam): unknown {
        const stored =
            this.requestStoreService.get<Record<string, unknown>>(storeKey);
        if (stored === null) {
            if (nullable) {
                return null;
            }

            throw new RequestContextMissingException(storeKey);
        }

        return field === null ? stored : stored[field];
    }
}
