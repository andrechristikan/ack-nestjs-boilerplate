import { Inject } from '@nestjs/common';

export function ApiResponse(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number,
) => void {
    return Inject(`ApiResponseService`);
}
