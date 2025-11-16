import crypto from 'crypto';
import fs from 'fs';
import path, { join } from 'path';

/**
 * Utility class for generating and managing JWT key pairs (ES256 for access, ES512 for refresh) and separate JWKS files.
 * Handles creation and environment configuration updates for JWT authentication keys.
 * Creates separate JWKS files for access and refresh tokens for better security isolation.
 */
class JwtKeysGenerator {
    private readonly keyDir: string;
    private readonly accessJwksOutputPath: string;
    private readonly refreshJwksOutputPath: string;
    private readonly accessTokenPrivateKeyPath: string;
    private readonly accessTokenPublicKeyPath: string;
    private readonly refreshTokenPrivateKeyPath: string;
    private readonly refreshTokenPublicKeyPath: string;

    constructor(keyDir: string) {
        this.keyDir = keyDir;
        this.accessTokenPrivateKeyPath = path.join(
            this.keyDir,
            'access-token.pem'
        );
        this.accessTokenPublicKeyPath = path.join(
            this.keyDir,
            'access-token.pub'
        );
        this.refreshTokenPrivateKeyPath = path.join(
            this.keyDir,
            'refresh-token.pem'
        );
        this.refreshTokenPublicKeyPath = path.join(
            this.keyDir,
            'refresh-token.pub'
        );
        this.accessJwksOutputPath = path.join(this.keyDir, 'access-jwks.json');
        this.refreshJwksOutputPath = path.join(
            this.keyDir,
            'refresh-jwks.json'
        );
    }

    /**
     * Creates directory if it doesn't exist.
     * @param dir - Directory path to create
     */
    ensureDir(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Generates ES256 elliptic curve key pair for access tokens and returns the key strings.
     * @param privateKeyPath - Path to save private key (optional for file creation)
     * @param publicKeyPath - Path to save public key (optional for file creation)
     * @param saveToFile - Whether to save keys to files (default: true)
     * @returns Object containing private and public key strings
     */
    generateES256KeyPair(
        privateKeyPath?: string,
        publicKeyPath?: string,
        saveToFile: boolean = true
    ): { privateKey: string; publicKey: string } {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        if (saveToFile && privateKeyPath && publicKeyPath) {
            fs.writeFileSync(privateKeyPath, keyPair.privateKey);
            fs.writeFileSync(publicKeyPath, keyPair.publicKey);

            try {
                fs.chmodSync(privateKeyPath, 0o600);
            } catch (err) {
                console.warn(`Could not set permissions for ${privateKeyPath}`);
            }
        }

        return {
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
        };
    }

    /**
     * Generates ES512 elliptic curve key pair for refresh tokens and returns the key strings.
     * @param privateKeyPath - Path to save private key (optional for file creation)
     * @param publicKeyPath - Path to save public key (optional for file creation)
     * @param saveToFile - Whether to save keys to files (default: true)
     * @returns Object containing private and public key strings
     */
    generateES512KeyPair(
        privateKeyPath?: string,
        publicKeyPath?: string,
        saveToFile: boolean = true
    ): { privateKey: string; publicKey: string } {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        if (saveToFile && privateKeyPath && publicKeyPath) {
            fs.writeFileSync(privateKeyPath, keyPair.privateKey);
            fs.writeFileSync(publicKeyPath, keyPair.publicKey);

            try {
                fs.chmodSync(privateKeyPath, 0o600);
            } catch (err) {
                console.warn(`Could not set permissions for ${privateKeyPath}`);
            }
        }

        return {
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
        };
    }

    /**
     * Extracts elliptic curve parameters from public key string for JWK creation.
     * @param publicKeyString - Public key string in PEM format
     * @returns Object containing x, y coordinates and curve type
     */
    extractECParamsFromString(publicKeyString: string): {
        x?: string;
        y?: string;
        crv?: string;
    } {
        try {
            const publicKey = crypto.createPublicKey({
                key: publicKeyString,
                format: 'pem',
            });

            const keyDetails = publicKey.export({ format: 'jwk' });

            return {
                x: keyDetails.x,
                y: keyDetails.y,
                crv: keyDetails.crv,
            };
        } catch (error) {
            console.error(
                `Error extracting EC parameters from public key: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Extracts elliptic curve parameters from public key file for JWK creation.
     * @param publicKeyPath - Path to public key file
     * @returns Object containing x, y coordinates and curve type
     */
    extractECParams(publicKeyPath: string): {
        x?: string;
        y?: string;
        crv?: string;
    } {
        try {
            const pemContent = fs.readFileSync(publicKeyPath, 'utf8');
            return this.extractECParamsFromString(pemContent);
        } catch (error) {
            console.error(
                `Error extracting EC parameters from ${publicKeyPath}: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Creates JSON Web Key (JWK) object from elliptic curve parameters.
     * @param params - EC parameters containing x, y coordinates and curve type
     * @param params.x - The x coordinate of the elliptic curve point
     * @param params.y - The y coordinate of the elliptic curve point
     * @param params.crv - The elliptic curve name (e.g., "P-256" for prime256v1, "P-521" for secp521r1)
     * @param kid - Key identifier (unique string to identify this key)
     * @param alg - Algorithm to use (ES256 or ES512)
     * @returns JWK object configured for specified algorithm with signature usage
     */
    createJwk(
        params: {
            x?: string;
            y?: string;
            crv?: string;
        },
        kid: string,
        alg: 'ES256' | 'ES512'
    ): {
        kty: string;
        crv?: string;
        x?: string;
        y?: string;
        use: string;
        alg: string;
        kid: string;
    } {
        return {
            kty: 'EC',
            crv: params.crv,
            x: params.x,
            y: params.y,
            use: 'sig',
            alg: alg,
            kid,
        };
    }

    /**
     * Creates JSON Web Key Set (JWKS) from access and refresh token public keys.
     * Generates random key identifiers and creates a complete JWKS structure.
     * @param accessKeyPath - File path to access token public key in PEM format
     * @param refreshKeyPath - File path to refresh token public key in PEM format
     * @param outputPath - File path where JWKS JSON will be written
     * @throws {Error} When key files cannot be read or JWKS cannot be created
     */
    createJwks(
        accessKeyPath: string,
        refreshKeyPath: string,
        outputPath: string
    ): void {
        try {
            const accessParams = this.extractECParams(accessKeyPath);
            const refreshParams = this.extractECParams(refreshKeyPath);

            // randomly generate a kid for the keys
            const accessKid = crypto.randomBytes(16).toString('hex');
            const refreshKid = crypto.randomBytes(16).toString('hex');
            const accessJwk = this.createJwk(accessParams, accessKid, 'ES256');
            const refreshJwk = this.createJwk(
                refreshParams,
                refreshKid,
                'ES512'
            );

            const jwks = {
                keys: [accessJwk, refreshJwk],
            };

            const outputDir = path.dirname(outputPath);
            this.ensureDir(outputDir);

            fs.writeFileSync(outputPath, JSON.stringify(jwks, null, 2));
            console.log(`JWKS successfully created at ${outputPath}`);
        } catch (error) {
            console.error(
                `Error creating JWKS: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Creates JWKS from public key strings and returns both JWKS and generated KIDs.
     * This method generates random key identifiers and creates a complete JWKS structure.
     * @param accessPublicKey - Access token public key string in PEM format
     * @param refreshPublicKey - Refresh token public key string in PEM format
     * @returns Object containing JWKS structure and the generated key identifiers
     * @returns returns.jwks - Complete JWKS object with keys array
     * @returns returns.accessKid - Generated access token key identifier
     * @returns returns.refreshKid - Generated refresh token key identifier
     */
    createJwksFromStrings(
        accessPublicKey: string,
        refreshPublicKey: string
    ): { jwks: any; accessKid: string; refreshKid: string } {
        const accessParams = this.extractECParamsFromString(accessPublicKey);
        const refreshParams = this.extractECParamsFromString(refreshPublicKey);

        // randomly generate a kid for the keys
        const accessKid = crypto.randomBytes(16).toString('hex');
        const refreshKid = crypto.randomBytes(16).toString('hex');
        const accessJwk = this.createJwk(accessParams, accessKid, 'ES256');
        const refreshJwk = this.createJwk(refreshParams, refreshKid, 'ES512');

        const jwks = {
            keys: [accessJwk, refreshJwk],
        };

        return { jwks, accessKid, refreshKid };
    }

    /**
     * Creates separate JWKS files for access and refresh tokens.
     * This creates individual JWKS files to provide better security isolation.
     * @param accessPublicKey - Access token public key string in PEM format
     * @param refreshPublicKey - Refresh token public key string in PEM format
     * @returns Object containing the generated key identifiers
     */
    createSeparateJwksFromStrings(
        accessPublicKey: string,
        refreshPublicKey: string
    ): { accessKid: string; refreshKid: string } {
        const accessParams = this.extractECParamsFromString(accessPublicKey);
        const refreshParams = this.extractECParamsFromString(refreshPublicKey);

        // Generate random key identifiers
        const accessKid = crypto.randomBytes(16).toString('hex');
        const refreshKid = crypto.randomBytes(16).toString('hex');

        // Create individual JWKs
        const accessJwk = this.createJwk(accessParams, accessKid, 'ES256');
        const refreshJwk = this.createJwk(refreshParams, refreshKid, 'ES512');

        // Create separate JWKS files
        const accessJwks = {
            keys: [accessJwk],
        };

        const refreshJwks = {
            keys: [refreshJwk],
        };

        // Ensure output directory exists
        const outputDir = path.dirname(this.accessJwksOutputPath);
        this.ensureDir(outputDir);

        // Write separate JWKS files
        fs.writeFileSync(
            this.accessJwksOutputPath,
            JSON.stringify(accessJwks, null, 2)
        );
        fs.writeFileSync(
            this.refreshJwksOutputPath,
            JSON.stringify(refreshJwks, null, 2)
        );

        console.log(`✅ Access JWKS created at ${this.accessJwksOutputPath}`);
        console.log(`✅ Refresh JWKS created at ${this.refreshJwksOutputPath}`);

        return { accessKid, refreshKid };
    }

    /**
     * Creates separate JWKS files from key file paths.
     * @param accessKeyPath - File path to access token public key
     * @param refreshKeyPath - File path to refresh token public key
     * @returns Object containing the generated key identifiers
     */
    createSeparateJwks(
        accessKeyPath: string,
        refreshKeyPath: string
    ): { accessKid: string; refreshKid: string } {
        try {
            const accessPublicKey = fs.readFileSync(accessKeyPath, 'utf8');
            const refreshPublicKey = fs.readFileSync(refreshKeyPath, 'utf8');

            return this.createSeparateJwksFromStrings(
                accessPublicKey,
                refreshPublicKey
            );
        } catch (error) {
            console.error(
                `Error creating separate JWKS: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    /**
     * Prints JWT keys and configuration to console in a formatted way.
     * Displays keys in base64 format (without PEM headers) for easy copying to environment variables.
     * @param accessKeys - Access token key pair object
     * @param accessKeys.privateKey - Access token private key in PEM format
     * @param accessKeys.publicKey - Access token public key in PEM format
     * @param refreshKeys - Refresh token key pair object
     * @param refreshKeys.privateKey - Refresh token private key in PEM format
     * @param refreshKeys.publicKey - Refresh token public key in PEM format
     * @param accessKid - Access token key identifier (hex string)
     * @param refreshKid - Refresh token key identifier (hex string)
     */
    printKeysToConsole(
        accessKeys: { privateKey: string; publicKey: string },
        refreshKeys: { privateKey: string; publicKey: string },
        accessKid: string,
        refreshKid: string
    ): void {
        console.log('\n' + '='.repeat(80));
        console.log('✅ Keys printed to console successfully!');
        console.log('='.repeat(80));

        // Extract raw key content without PEM headers/footers and whitespace
        const accessPrivateKeyRaw = accessKeys.privateKey
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\s/g, '');
        const accessPublicKeyRaw = accessKeys.publicKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/\s/g, '');
        const refreshPrivateKeyRaw = refreshKeys.privateKey
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\s/g, '');
        const refreshPublicKeyRaw = refreshKeys.publicKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/\s/g, '');

        console.log('\n🔐 Access Token Keys:');
        console.log('-'.repeat(50));
        console.log(`KID: ${accessKid}`);
        console.log('Private Key:');
        console.log(accessPrivateKeyRaw);
        console.log('\nPublic Key:');
        console.log(accessPublicKeyRaw);

        console.log('\n🔄 Refresh Token Keys:');
        console.log('-'.repeat(50));
        console.log(`KID: ${refreshKid}`);
        console.log('Private Key:');
        console.log(refreshPrivateKeyRaw);
        console.log('\nPublic Key:');
        console.log(refreshPublicKeyRaw);

        console.log('\n');
    }

    /**
     * Main method to generate all JWT keys and JWKS file.
     * Creates access token keys (ES256), refresh token keys (ES512), and JWKS configuration.
     * Supports multiple output modes: console display, file creation, and optional environment file update.
     * @param updateEnv - Whether to automatically update .env file with generated keys (default: false)
     * @throws {Error} When key generation or file operations fail
     */
    generateKeys(updateEnv: boolean = false): void {
        try {
            this.ensureDir(this.keyDir);

            // Generate access token keys using ES256
            console.log('Generating Access Token ES256 keys...');
            const accessKeys = this.generateES256KeyPair(
                this.accessTokenPrivateKeyPath,
                this.accessTokenPublicKeyPath,
                true
            );

            // Generate refresh token keys using ES512
            console.log('Generating Refresh Token ES512 keys...');
            const refreshKeys = this.generateES512KeyPair(
                this.refreshTokenPrivateKeyPath,
                this.refreshTokenPublicKeyPath,
                true
            );

            // Generate JWKS and get KIDs
            console.log('Generating separate JWKS files...');
            const { accessKid, refreshKid } =
                this.createSeparateJwksFromStrings(
                    accessKeys.publicKey,
                    refreshKeys.publicKey
                );

            // 1. Print to console
            this.printKeysToConsole(
                accessKeys,
                refreshKeys,
                accessKid,
                refreshKid
            );

            // 2. Update .env file (conditional)
            if (updateEnv) {
                this.updateEnvWithKeys(
                    accessKid,
                    refreshKid,
                    accessKeys,
                    refreshKeys
                );
            }

            console.log('✅ JWT keys and JWKS generated successfully!');
            console.log('� Algorithm Configuration:');
            console.log('   • Access Token:  ES256 (ECDSA with P-256 curve)');
            console.log('   • Refresh Token: ES512 (ECDSA with P-521 curve)');
            console.log('');
            console.log('�📝 Keys have been:');
            console.log(
                '   1. ✅ Printed to console (raw format for easy copy-paste)'
            );
            console.log('   2. ✅ Saved to ./keys directory as PEM files');
            console.log(
                '   3. ✅ Separate JWKS files created for better security'
            );
            console.log('');
            console.log('📁 JWKS Files Created:');
            console.log(
                `   • Access:   ${path.basename(this.accessJwksOutputPath)}`
            );
            console.log(
                `   • Refresh:  ${path.basename(this.refreshJwksOutputPath)}`
            );
            if (updateEnv) {
                console.log('');
                console.log(
                    '   4. ✅ Updated in .env file (--direct-insert mode enabled)'
                );
                console.log('   💡 Keys are ready for application use');
            } else {
                console.log('');
                console.log(
                    '   4. ⏭️  .env file update skipped (default behavior)'
                );
                console.log(
                    '   💡 Use --direct-insert flag to auto-update .env, or copy-paste manually'
                );
            }
        } catch (err) {
            console.error(
                `Failed to generate JWT keys: ${err instanceof Error ? err.message : String(err)}`
            );
            process.exit(1);
        }
    }

    /**
     * Updates .env file with new key identifiers and key strings.
     * Converts PEM formatted keys to base64 strings suitable for environment variables.
     * Creates .env file from .env.example if it doesn't exist.
     * @param accessKid - Access token key identifier (16-byte hex string)
     * @param refreshKid - Refresh token key identifier (16-byte hex string)
     * @param accessKeys - Access token key pair object
     * @param accessKeys.privateKey - Access token private key in PEM format
     * @param accessKeys.publicKey - Access token public key in PEM format
     * @param refreshKeys - Refresh token key pair object
     * @param refreshKeys.privateKey - Refresh token private key in PEM format
     * @param refreshKeys.publicKey - Refresh token public key in PEM format
     * @throws {Error} When .env.example is missing and .env doesn't exist
     */
    updateEnvWithKeys(
        accessKid: string,
        refreshKid: string,
        accessKeys: { privateKey: string; publicKey: string },
        refreshKeys: { privateKey: string; publicKey: string }
    ): void {
        const envPath = path.join(process.cwd(), '.env');
        const envExamplePath = path.join(process.cwd(), '.env.example');

        // Ensure .env exists
        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                fs.copyFileSync(envExamplePath, envPath);
                console.log('📄 .env file created from .env.example');
            } else {
                console.error('.env.example not found. Cannot create .env');
                process.exit(1);
            }
        }

        // Read current .env content
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Prepare key strings for env (remove PEM headers/footers and all newlines)
        const accessPrivateKeyForEnv = accessKeys.privateKey
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\n/g, '')
            .trim();
        const accessPublicKeyForEnv = accessKeys.publicKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/\n/g, '')
            .trim();
        const refreshPrivateKeyForEnv = refreshKeys.privateKey
            .replace(/-----BEGIN PRIVATE KEY-----/g, '')
            .replace(/-----END PRIVATE KEY-----/g, '')
            .replace(/\n/g, '')
            .trim();
        const refreshPublicKeyForEnv = refreshKeys.publicKey
            .replace(/-----BEGIN PUBLIC KEY-----/g, '')
            .replace(/-----END PUBLIC KEY-----/g, '')
            .replace(/\n/g, '')
            .trim();

        // Define env variables to update
        const envUpdates = [
            { key: 'AUTH_JWT_ACCESS_TOKEN_KID', value: accessKid },
            { key: 'AUTH_JWT_REFRESH_TOKEN_KID', value: refreshKid },
            {
                key: 'AUTH_JWT_ACCESS_TOKEN_PRIVATE_KEY',
                value: accessPrivateKeyForEnv,
            },
            {
                key: 'AUTH_JWT_ACCESS_TOKEN_PUBLIC_KEY',
                value: accessPublicKeyForEnv,
            },
            {
                key: 'AUTH_JWT_REFRESH_TOKEN_PRIVATE_KEY',
                value: refreshPrivateKeyForEnv,
            },
            {
                key: 'AUTH_JWT_REFRESH_TOKEN_PUBLIC_KEY',
                value: refreshPublicKeyForEnv,
            },
        ];

        // Update or add each environment variable
        for (const { key, value } of envUpdates) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (regex.test(envContent)) {
                envContent = envContent.replace(regex, `${key}=${value}`);
            } else {
                envContent += `\n${key}=${value}`;
            }
        }

        // Write updated content back to .env
        fs.writeFileSync(envPath, envContent);
        console.log('📝 .env file updated with new keys and KIDs');
    }
}

function main() {
    const argv = process.argv.slice(2);

    // Check for --direct-insert option
    const directInsertIndex = argv.indexOf('--direct-insert');
    const useDirectInsert = directInsertIndex !== -1;

    // Get command (filter out flags)
    const command = argv.find(arg => !arg.startsWith('--')) || 'generate';

    // Always use ./keys directory
    const keyDir = join(process.cwd(), 'keys');

    const generator = new JwtKeysGenerator(keyDir);

    if (command === 'generate') {
        generator.generateKeys(useDirectInsert); // Pass true if --direct-insert is used
        // Note: generateKeys() now handles outputs based on options:
        // 1. Console printing (always)
        // 2. File creation (always)
        // 3. .env update (only when --direct-insert flag is used)
    } else {
        console.log(`
Usage: node generate-keys.js [command] [options]

Commands:
  generate    Generate JWT keys (ES256 for access tokens, ES512 for refresh tokens) and JWKS with outputs:
              1. Print keys to console (always)
              2. Save keys to ./keys directory (always)
              3. Update .env with keys and KIDs (only with --direct-insert flag)

Options:
  --direct-insert   [OPTIONAL] Enable automatic .env file update
                    By default, .env is NOT updated automatically for safety
                    Use this flag when you want keys inserted directly into .env

Examples:
  # Default behavior - NO .env update (manual copy-paste required)
  yarn generate:keys
  node generate-keys.js generate

  # Auto-update .env file - keys inserted automatically
  yarn generate:keys --direct-insert
  node generate-keys.js generate --direct-insert
        `);
    }
}

/**
 * CLI entry point that processes command line arguments and executes appropriate operations.
 * Supports generate command with configurable options.
 */
main();
