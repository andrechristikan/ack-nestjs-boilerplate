import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';

@Injectable()
export class ApiKeyPutToRequestGuard implements CanActivate {
    constructor(private readonly apiKeyService: ApiKeyService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { params } = request;
        const { apiKey } = params;

        const check: ApiKeyDoc = await this.apiKeyService.findOneById(apiKey);
        request.__apiKey = check;

        return true;
    }
}
