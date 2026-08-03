import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IRequestApp } from '@common/request/interfaces/request.interface';

@Injectable()
export class RequestThrottleByUserGuard extends ThrottlerGuard {
    protected async getTracker(req: IRequestApp): Promise<string> {
        if (req.user?.userId) {
            return req.user.userId;
        }

        return req.ips.length ? req.ips[0] : (req.ip ?? '');
    }

    protected generateKey(
        _context: ExecutionContext,
        suffix: string,
        _name: string
    ): string {
        return suffix;
    }
}
