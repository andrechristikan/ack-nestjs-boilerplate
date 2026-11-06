import { Injectable, StandardSchemaValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { RequestSchemaMissingException } from '@common/request/exceptions/request.schema-missing.exception';

@Injectable()
export class RequestSchemaValidationPipe extends StandardSchemaValidationPipe {
    private stampEmptyIssuePaths(
        issues: readonly StandardSchemaV1.Issue[],
        data: string | undefined
    ): readonly StandardSchemaV1.Issue[] {
        if (!data) {
            return issues;
        }

        return issues.map(issue =>
            issue.path?.length ? issue : { ...issue, path: [data] }
        );
    }

    async transform<T = unknown>(
        value: T,
        metadata: ArgumentMetadata
    ): Promise<T> {
        if (
            (metadata.type === 'body' || metadata.type === 'param') &&
            !metadata.schema
        ) {
            throw new RequestSchemaMissingException();
        }

        const schema = metadata.schema;
        const isValidated = this.toValidate(metadata);
        if (!schema || !isValidated) {
            return value;
        }

        this.stripProtoKeys(value);
        const result = await this.validate<T>(
            value,
            schema,
            this.validateOptions
        );
        if (result.issues) {
            const stampedIssues = this.stampEmptyIssuePaths(
                result.issues,
                metadata.data
            );
            const exception = this.exceptionFactory(stampedIssues);
            if (exception instanceof AppBaseException) {
                throw exception;
            }

            throw new AppUnknownException(exception);
        }

        return this.isTransformEnabled ? result.value : value;
    }
}
