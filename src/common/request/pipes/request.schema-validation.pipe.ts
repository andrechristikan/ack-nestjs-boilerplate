import { Injectable, StandardSchemaValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { RequestSchemaMissingException } from '@common/request/exceptions/request.schema-missing.exception';

/**
 * The global validation pipe. Fail-closed on body and param: a value reaching
 * a handler with no schema attached is a wiring defect. Query without a schema
 * still passes. Empty Standard Schema issue paths are stamped with the bound
 * argument name before exceptionFactory so errors[].property is the param name.
 */
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
            throw exception;
        }

        return this.isTransformEnabled ? result.value : value;
    }
}
