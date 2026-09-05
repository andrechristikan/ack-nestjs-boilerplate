import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestActorStoreKey } from '@common/request/constants/request.constant';

@Injectable()
export class RequestActorInterceptor implements NestInterceptor {
    constructor(private readonly requestStoreService: RequestStoreService) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        const request = context.switchToHttp().getRequest<IRequestApp>();
        const userId = request.user?.userId ?? null;
        if (userId) {
            this.requestStoreService.set(RequestActorStoreKey, userId);
        }

        return next.handle();
    }
}
