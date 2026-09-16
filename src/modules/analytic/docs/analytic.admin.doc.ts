import {
    Doc,
    DocAuth,
    DocGuard,
    DocRequest,
    DocResponse,
    DocResponsePaging,
} from '@common/doc/decorators/doc.decorator';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { AnalyticDefaultAvailableOrderBy } from '@modules/analytic/constants/analytic.list.constant';
import {
    AnalyticFraudRiskScoreResponseDto,
    AnalyticFraudRiskScoreResponseSchema,
    AnalyticJsonResponseDto,
    AnalyticJsonResponseSchema,
    AnalyticSummaryResponseDto,
    AnalyticSummaryResponseSchema,
} from '@modules/analytic/dtos/response/analytic.metric.response.dto';
import { applyDecorators } from '@nestjs/common';

export function AnalyticAdminMetricDoc(summary: string): MethodDecorator {
    return applyDecorators(
        Doc({ summary }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticJsonResponseDto>('analytic.metric', {
            schema: AnalyticJsonResponseSchema,
        })
    );
}

export function AnalyticAdminSummaryDoc(summary: string): MethodDecorator {
    return applyDecorators(
        Doc({ summary }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticSummaryResponseDto>('analytic.summary', {
            schema: AnalyticSummaryResponseSchema,
        })
    );
}

export function AnalyticAdminListDoc(summary: string): MethodDecorator {
    return applyDecorators(
        Doc({ summary }),
        DocRequest({}),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponsePaging<AnalyticJsonResponseDto>('analytic.list', {
            schema: AnalyticJsonResponseSchema,
            availableOrderBy: AnalyticDefaultAvailableOrderBy,
            type: EnumPaginationType.offset,
        })
    );
}

export function AnalyticAdminRiskScoreDoc(): MethodDecorator {
    return applyDecorators(
        Doc({ summary: 'fraud risk score for a user (report-only)' }),
        DocAuth({ xApiKey: true, jwtAccessToken: true }),
        DocGuard({ role: true, policy: true, termPolicy: true }),
        DocResponse<AnalyticFraudRiskScoreResponseDto>(
            'analytic.fraudRiskScore',
            {
                schema: AnalyticFraudRiskScoreResponseSchema,
            }
        )
    );
}
