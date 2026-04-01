import {
    IHelperDateCreateOptions,
    IHelperEmailValidation,
    IHelperPasswordOptions,
} from '@common/helper/interfaces/helper.interface';
import { GeoLocation, UserAgent } from '@generated/prisma-client';
import { DateObjectUnits, DateTime, Duration, DurationLikeObject } from 'luxon';

/**
 * Contract for the application-wide helper utility service.
 * Covers array manipulation, encryption, hashing, date operations,
 * string utilities, email validation, and mathematical calculations.
 */
export interface IHelperService {
    /**
     * Removes duplicate values from an array.
     *
     * @template T - Type of array elements
     * @param {T[]} array - Array to deduplicate
     * @returns {T[]} New array containing only unique values
     */
    arrayUnique<T>(array: T[]): T[];

    /**
     * Shuffles array elements into a random order.
     *
     * @template T - Type of array elements
     * @param {T[]} array - Array to shuffle
     * @returns {T[]} New array with elements in random order
     */
    arrayShuffle<T>(array: T[]): T[];

    /**
     * Splits an array into smaller chunks of the specified size.
     *
     * @template T - Type of array elements
     * @param {T[]} a - Array to split
     * @param {number} size - Maximum number of elements per chunk
     * @returns {T[][]} Array of chunk arrays, each containing up to `size` elements
     */
    arrayChunk<T>(a: T[], size: number): T[][];

    /**
     * Returns elements that are present in both arrays (set intersection).
     *
     * @template T - Type of array elements
     * @param {T[]} a - First array
     * @param {T[]} b - Second array
     * @returns {T[]} Array of elements found in both `a` and `b`
     */
    arrayIntersection<T>(a: T[], b: T[]): T[];

    /**
     * Encodes a UTF-8 string to Base64 format.
     *
     * @param {string} data - Plain string to encode
     * @returns {string} Base64-encoded representation of the input
     */
    base64Encrypt(data: string): string;

    /**
     * Decodes a Base64 string back to its original UTF-8 representation.
     *
     * @param {string} data - Base64-encoded string to decode
     * @returns {string} Decoded plain string
     */
    base64Decrypt(data: string): string;

    /**
     * Compares two Base64 strings for exact equality.
     *
     * @param {string} basicToken1 - First Base64 string
     * @param {string} basicToken2 - Second Base64 string
     * @returns {boolean} True when both strings are identical
     */
    base64Compare(basicToken1: string, basicToken2: string): boolean;

    /**
     * Encrypts arbitrary data using AES-256-CBC.
     * The key is internally SHA-256-hashed to ensure a fixed 256-bit length.
     *
     * @template T - Type of the value to encrypt
     * @param {T} data - Value to serialize and encrypt
     * @param {string} key - Encryption key (hashed to 256 bits internally)
     * @param {string} iv - Initialization vector; supports `hex:`, `b64:`, or plain UTF-8 prefixes
     * @returns {string} Base64-encoded AES-256-CBC ciphertext
     */
    aes256Encrypt<T>(data: T, key: string, iv: string): string;

    /**
     * Encrypts a string with AES-256-CBC using a randomly generated IV.
     * The returned value embeds the IV as a prefix (`iv:ciphertext`) so that
     * `aes256DecryptSimple` can recover it without additional context.
     *
     * @param {string} data - Plain string to encrypt
     * @param {string} [extendEncryptionKey] - Optional suffix appended to the configured secret key
     * @returns {string} Combined string in the format `iv:ciphertext`
     */
    aes256EncryptSimple(data: string, extendEncryptionKey?: string): string;

    /**
     * Decrypts an AES-256-CBC ciphertext back to the original value.
     *
     * @template T - Expected type of the decrypted value
     * @param {string} encrypted - Base64-encoded ciphertext
     * @param {string} key - Decryption key matching the one used for encryption
     * @param {string} iv - Initialization vector matching the one used for encryption
     * @returns {T} Deserialized decrypted value
     * @throws {Error} When decryption produces no output (wrong key or IV)
     */
    aes256Decrypt<T>(encrypted: string, key: string, iv: string): T;

    /**
     * Decrypts a string produced by `aes256EncryptSimple`.
     * Expects the input in the format `iv:ciphertext`.
     *
     * @param {string} encryptedData - Combined IV-prefixed ciphertext
     * @param {string} [extendEncryptionKey] - Optional suffix appended to the configured secret key, must match the value used during encryption
     * @returns {string} Decrypted original plain string
     * @throws {Error} When the input format is invalid or decryption fails
     */
    aes256DecryptSimple(
        encryptedData: string,
        extendEncryptionKey?: string
    ): string;

    /**
     * Compares two AES ciphertext strings for exact equality.
     *
     * @param {string} aes1 - First ciphertext
     * @param {string} aes2 - Second ciphertext
     * @returns {boolean} True when both ciphertexts are identical
     */
    aes256Compare(aes1: string, aes2: string): boolean;

    /**
     * Generates a bcrypt salt with the specified number of rounds.
     *
     * @param {number} length - Number of salt rounds (higher = slower but more secure)
     * @returns {string} Generated bcrypt salt string
     */
    bcryptGenerateSalt(length: number): string;

    /**
     * Hashes a plain-text password using bcrypt with the provided salt.
     *
     * @param {string} passwordString - Plain-text password to hash
     * @param {string} salt - Bcrypt salt generated by `bcryptGenerateSalt`
     * @returns {string} Bcrypt-hashed password
     */
    bcryptHash(passwordString: string, salt: string): string;

    /**
     * Verifies a plain-text password against a bcrypt hash.
     *
     * @param {string} passwordString - Plain-text password to check
     * @param {string} passwordHashed - Stored bcrypt hash to compare against
     * @returns {boolean} True when the password matches the hash
     */
    bcryptCompare(passwordString: string, passwordHashed: string): boolean;

    /**
     * Produces a SHA-256 hash of the input string.
     *
     * @param {string} string - Value to hash
     * @returns {string} Lowercase hexadecimal SHA-256 digest
     */
    sha256Hash(string: string): string;

    /**
     * Compares two SHA-256 hex digests for exact equality.
     *
     * @param {string} hashOne - First SHA-256 hash
     * @param {string} hashTwo - Second SHA-256 hash
     * @returns {boolean} True when both hashes are identical
     */
    sha256Compare(hashOne: string, hashTwo: string): boolean;

    /**
     * Produces an MD5 hash of the input string.
     * Used for non-security-sensitive purposes such as cache keys and deterministic rollout IDs.
     *
     * @param {string} string - Value to hash
     * @returns {string} Lowercase hexadecimal MD5 digest
     */
    md5Hash(string: string): string;

    /**
     * Compares two MD5 hex digests for exact equality.
     *
     * @param {string} hashOne - First MD5 hash
     * @param {string} hashTwo - Second MD5 hash
     * @returns {boolean} True when both hashes are identical
     */
    md5Compare(hashOne: string, hashTwo: string): boolean;

    /**
     * Checks whether a string contains only numeric characters (optionally negative).
     *
     * @param {string} number - String to validate
     * @returns {boolean} True when the string is a valid integer representation
     */
    checkNumberString(number: string): boolean;

    /**
     * Generates a random numeric string with exactly the specified number of digits.
     *
     * @param {number} length - Number of digits in the result
     * @returns {string} Numeric string of the requested length
     */
    randomDigits(length: number): string;

    /**
     * Generates a random integer within the given range.
     *
     * @param {number} min - Inclusive lower bound
     * @param {number} max - Exclusive upper bound
     * @returns {number} Random integer where `min <= result < max`
     */
    randomNumberInRange(min: number, max: number): number;

    /**
     * Calculates what percentage `value` represents of `total`.
     * Returns 0 when `total` is zero or the result is not finite.
     *
     * @param {number} value - The partial value
     * @param {number} total - The total reference value
     * @returns {number} Percentage rounded to two decimal places
     */
    calculatePercent(value: number, total: number): number;

    /**
     * Generates a random alphanumeric string of the specified length.
     *
     * @param {number} length - Number of characters to generate
     * @returns {string} Random string containing uppercase letters, lowercase letters, and digits
     */
    randomString(length: number): string;

    /**
     * Censors a string by replacing inner characters with asterisks while preserving a tail.
     * The number of revealed characters scales with the total string length.
     *
     * @param {string} text - Text to censor
     * @returns {string} Partially masked string with asterisks in place of hidden characters
     */
    censorString(text: string): string;

    /**
     * Validates that a password meets the minimum complexity requirements.
     * Requires at least one uppercase letter, one lowercase letter, and one digit.
     *
     * @param {string} password - Password to evaluate
     * @param {IHelperPasswordOptions} [options] - Optional overrides for minimum length (default: 8)
     * @returns {boolean} True when the password satisfies all complexity rules
     */
    checkPasswordStrength(
        password: string,
        options?: IHelperPasswordOptions
    ): boolean;

    /**
     * Performs comprehensive structural validation on an email address.
     * Checks format, domain structure, TLD validity, local-part constraints, and forbidden character patterns.
     *
     * @param {string} value - Email address string to validate
     * @returns {IHelperEmailValidation} Validation result with `validated` flag and an optional i18n `messagePath` on failure
     */
    checkEmail(value: string): IHelperEmailValidation;

    /**
     * Checks whether a URL path matches any pattern in the provided list.
     * Supports exact matching and wildcard (`*`) patterns; matching is case-insensitive.
     *
     * @param {string} url - Full URL or path to test (e.g., `https://example.com/api/v1` or `/api/v1`)
     * @param {string[]} patterns - List of patterns to test against (e.g., `['/api/*', '/health']`)
     * @returns {boolean} True when the URL path matches at least one pattern
     */
    checkUrlMatchesPatterns(url: string, patterns: string[]): boolean;

    /**
     * Calculates the age duration from a date of birth to now (or an optional reference year).
     *
     * @param {Date} dateOfBirth - The date of birth to calculate age from
     * @param {number} [fromYear] - Optional reference year to use instead of the current year
     * @returns {Duration} Luxon Duration representing the elapsed time since birth
     */
    calculateAge(dateOfBirth: Date, fromYear?: number): Duration;

    /**
     * Checks whether a string is a valid ISO 8601 date.
     *
     * @param {string} date - ISO date string to validate
     * @returns {boolean} True when the string parses to a valid date in the configured timezone
     */
    dateCheckIso(date: string): boolean;

    /**
     * Checks whether a number is a valid millisecond-precision Unix timestamp.
     *
     * @param {number} timestamp - Timestamp in milliseconds to validate
     * @returns {boolean} True when the timestamp represents a valid date
     */
    dateCheckTimestamp(timestamp: number): boolean;

    /**
     * Returns the IANA timezone name for the given date under the application's configured timezone.
     *
     * @param {Date} date - Date to inspect
     * @returns {string} IANA timezone name (e.g., `America/New_York`)
     */
    dateGetZone(date: Date): string;

    /**
     * Returns the short UTC offset string for the given date under the configured timezone.
     *
     * @param {Date} date - Date to inspect
     * @returns {string} Short offset name (e.g., `EST`, `UTC+7`)
     */
    dateGetZoneOffset(date: Date): string;

    /**
     * Converts a Date to a millisecond-precision Unix timestamp.
     *
     * @param {Date} date - Date to convert
     * @returns {number} Milliseconds since the Unix epoch
     */
    dateGetTimestamp(date: Date): number;

    /**
     * Formats a Date as an RFC 2822 string.
     *
     * @param {Date} date - Date to format
     * @returns {string} RFC 2822 formatted date string (e.g., `Tue, 01 Jan 2025 00:00:00 +0700`)
     */
    dateFormatToRFC2822(date: Date): string;

    /**
     * Formats a Date as a full ISO 8601 datetime string.
     *
     * @param {Date} date - Date to format
     * @returns {string} ISO 8601 string including time and timezone offset
     */
    dateFormatToIso(date: Date): string;

    /**
     * Formats a Date as an ISO 8601 date-only string (`YYYY-MM-DD`).
     *
     * @param {Date} date - Date to format
     * @returns {string} Date portion of the ISO 8601 representation
     */
    dateFormatToIsoDate(date: Date): string;

    /**
     * Formats a Date as an ISO 8601 time-only string.
     *
     * @param {Date} date - Date to format
     * @returns {string} Time portion of the ISO 8601 representation (e.g., `14:30:00.000+07:00`)
     */
    dateFormatToIsoTime(date: Date): string;

    /**
     * Creates a JavaScript Date object, optionally snapped to the start or end of the day.
     *
     * @param {Date} [date] - Base date; defaults to the current moment
     * @param {IHelperDateCreateOptions} [options] - Optional day-boundary snapping via `dayOf`
     * @returns {Date} Resulting Date object in the configured timezone
     */
    dateCreate(date?: Date, options?: IHelperDateCreateOptions): Date;

    /**
     * Wraps a Date in a Luxon DateTime instance for further manipulation.
     *
     * @param {Date} [date] - Date to wrap; defaults to the current moment
     * @returns {DateTime} Luxon DateTime instance
     */
    dateCreateInstance(date?: Date): DateTime;

    /**
     * Parses an ISO 8601 string into a Date, optionally snapped to a day boundary.
     *
     * @param {string} iso - ISO 8601 date string to parse
     * @param {IHelperDateCreateOptions} [options] - Optional day-boundary snapping via `dayOf`
     * @returns {Date} Parsed Date object in the configured timezone
     */
    dateCreateFromIso(iso: string, options?: IHelperDateCreateOptions): Date;

    /**
     * Creates a Date from a millisecond-precision Unix timestamp, optionally snapped to a day boundary.
     *
     * @param {number} [timestamp] - Milliseconds since epoch; defaults to the current time
     * @param {IHelperDateCreateOptions} [options] - Optional day-boundary snapping via `dayOf`
     * @returns {Date} Resulting Date object in the configured timezone
     */
    dateCreateFromTimestamp(
        timestamp?: number,
        options?: IHelperDateCreateOptions
    ): Date;

    /**
     * Overrides specific calendar units (year, month, day, etc.) on an existing Date.
     *
     * @param {Date} date - Date to modify
     * @param {DateObjectUnits} units - Luxon DateObjectUnits specifying which fields to set
     * @returns {Date} New Date with the specified units applied
     */
    dateSet(date: Date, units: DateObjectUnits): Date;

    /**
     * Advances a Date by the given duration.
     *
     * @param {Date} date - Starting date
     * @param {Duration} duration - Luxon Duration to add
     * @returns {Date} New Date shifted forward by `duration`
     */
    dateForward(date: Date, duration: Duration): Date;

    /**
     * Moves a Date backward by the given duration.
     *
     * @param {Date} date - Starting date
     * @param {Duration} duration - Luxon Duration to subtract
     * @returns {Date} New Date shifted backward by `duration`
     */
    dateBackward(date: Date, duration: Duration): Date;

    /**
     * Constructs a Luxon Duration from a plain duration-like object.
     *
     * @param {DurationLikeObject} duration - Object specifying duration components (e.g., `{ days: 1, hours: 2 }`)
     * @returns {Duration} Equivalent Luxon Duration instance
     */
    dateCreateDuration(duration: DurationLikeObject): Duration;

    /**
     * Calculates the signed difference between two dates.
     *
     * @param {Date} dateOne - Minuend date (the date to subtract from)
     * @param {Date} dateTwo - Subtrahend date (the date being subtracted)
     * @returns {Duration} Luxon Duration representing `dateOne - dateTwo`
     */
    dateDiff(dateOne: Date, dateTwo: Date): Duration;

    /**
     * Returns the hostname of the machine running the application.
     *
     * @returns {string} OS-level hostname of the current server or container
     */
    getHostname(): string;

    /**
     * Resolves a human-readable city name from a GeoLocation record.
     * Falls back to `'Unknown Location'` when the argument is absent or has no city.
     *
     * @param {GeoLocation} [geoLocation] - Optional GeoLocation object from IP geolocation
     * @returns {string} City name, or `'Unknown Location'` if unavailable
     */
    resolveCity(geoLocation?: GeoLocation): string;

    /**
     * Resolves a human-readable device description from a parsed UserAgent object.
     * Prefers `vendor + model`, then falls back to OS name, then browser name.
     *
     * @param {UserAgent} userAgent - Parsed UserAgent object containing device, OS, and browser fields
     * @returns {string} Device description string, or `'Unknown Device'` if no information is available
     */
    resolveDevice(userAgent: UserAgent): string;
}
