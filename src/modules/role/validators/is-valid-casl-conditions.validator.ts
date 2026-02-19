import {
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

const ALLOWED_CASL_OPERATORS = new Set([
    '$eq',
    '$ne',
    '$in',
    '$nin',
    '$lt',
    '$lte',
    '$gt',
    '$gte',
    '$exists',
    '$regex',
    '$all',
    '$size',
    '$elemMatch',
    '$or',
    '$and',
    '$not',
    '$nor',
]);

function validateOperators(
    obj: Record<string, unknown>,
    path: string
): string[] {
    const errors: string[] = [];

    for (const key of Object.keys(obj)) {
        if (key.startsWith('$') && !ALLOWED_CASL_OPERATORS.has(key)) {
            errors.push(`Invalid CASL operator "${key}" at path "${path}"`);
        }

        const value = obj[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            errors.push(
                ...validateOperators(
                    value as Record<string, unknown>,
                    `${path}.${key}`
                )
            );
        }

        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    errors.push(
                        ...validateOperators(
                            item as Record<string, unknown>,
                            `${path}.${key}[${i}]`
                        )
                    );
                }
            }
        }
    }

    return errors;
}

@ValidatorConstraint({ name: 'isValidCaslConditions', async: false })
export class IsValidCaslConditionsConstraint
    implements ValidatorConstraintInterface
{
    private lastErrors: string[] = [];

    validate(value: unknown): boolean {
        if (value === undefined || value === null) {
            return true;
        }

        if (typeof value !== 'object' || Array.isArray(value)) {
            this.lastErrors = ['Conditions must be a plain object'];
            return false;
        }

        this.lastErrors = validateOperators(
            value as Record<string, unknown>,
            'conditions'
        );
        return this.lastErrors.length === 0;
    }

    defaultMessage(): string {
        return this.lastErrors.length > 0
            ? this.lastErrors.join('; ')
            : 'Invalid CASL conditions';
    }
}

export function IsValidCaslConditions(
    validationOptions?: ValidationOptions
): PropertyDecorator {
    return function (object: object, propertyName: string | symbol) {
        registerDecorator({
            target: object.constructor,
            propertyName: String(propertyName),
            options: validationOptions,
            constraints: [],
            validator: IsValidCaslConditionsConstraint,
        });
    };
}
