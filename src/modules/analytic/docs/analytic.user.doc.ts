import {
    Doc,
    DocAuth,
    DocGuard,
    DocResponse,
} from '@common/doc/decorators/doc.decorator';
import { AnalyticJsonResponseSchema } from '@modules/analytic/dtos/response/analytic.json.response.dto';
import { AnalyticWorkspaceSummaryResponseSchema } from '@modules/analytic/dtos/response/analytic.workspace-summary.response.dto';
import type { AnalyticJsonResponseDto } from '@modules/analytic/dtos/response/analytic.json.response.dto';
import type { AnalyticWorkspaceSummaryResponseDto } from '@modules/analytic/dtos/response/analytic.workspace-summary.response.dto';
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
