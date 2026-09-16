import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import {
    AnalyticJsonResponseDto,
    AnalyticJsonResponseSchema,
    AnalyticWorkspaceSummaryResponseDto,
    AnalyticWorkspaceSummaryResponseSchema,
} from '@modules/analytic/dtos/response/analytic.metric.response.dto';
import { applyDecorators } from '@nestjs/common';

export function AnalyticUserSummaryDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'current workspace analytic summary' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: false, policy: false, termPolicy: true }),
        DocResponse<AnalyticWorkspaceSummaryResponseDto>(
            'analytic.workspaceSummary',
            { schema: AnalyticWorkspaceSummaryResponseSchema }
        )
    );
}

export function AnalyticUserMetricDoc(summary: string): MethodDecorator {
    return applyDecorators(
        Doc({ summary }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: false, policy: false, termPolicy: true }),
        DocResponse<AnalyticJsonResponseDto>('analytic.metric', {
            schema: AnalyticJsonResponseSchema,
        })
    );
}
