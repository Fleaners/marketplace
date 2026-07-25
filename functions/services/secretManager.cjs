/**
 * @fileoverview Google Secret Manager integration service.
 * Provides caching and fallback mechanisms.
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

/**
 * Service to manage secrets using Google Cloud Secret Manager.
 */
class SecretManagerService {
  /**
   * Initializes the Secret Manager Service.
   * @param {Object} options - Configuration options.
   * @param {string} [options.projectId] - Google Cloud project ID.
   */
  constructor(options = {}) {
    this.projectId = options.projectId || process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'marketplace-store-fef91';
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    try {
      this.client = new SecretManagerServiceClient();
    } catch (error) {
      console.warn(`[SecretManagerService] Failed to initialize client. Falling back to process.env. Error: ${error.message}`);
      this.client = null;
    }
  }

  /**
   * Clears the in-memory secret cache.
   */
  clearCache() {
    this.cache.clear();
    console.log('[SecretManagerService] Cache cleared.');
  }

  /**
   * Gets a secret value.
   * @param {string} secretName - The name of the secret.
   * @param {string} [version='latest'] - The secret version.
   * @returns {Promise<string|undefined>} The secret value.
   */
  async getSecret(secretName, version = 'latest') {
    const cacheKey = `${secretName}:${version}`;
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < this.cacheTTL)) {
      return cached.value;
    }

    if (!this.client) {
      console.warn(`[SecretManagerService] Client unavailable, falling back to process.env for secret: ${secretName}`);
      return process.env[secretName];
    }

    try {
      const name = `projects/${this.projectId}/secrets/${secretName}/versions/${version}`;
      const [response] = await this.client.accessSecretVersion({ name });
      const value = response.payload.data.toString('utf8');

      this.cache.set(cacheKey, {
        value,
        timestamp: Date.now()
      });

      console.log(`[SecretManagerService] Successfully retrieved secret metadata: ${secretName}`);
      return value;
    } catch (error) {
      console.warn(`[SecretManagerService] Failed to access secret: ${secretName}. Error: ${error.message}. Falling back to process.env.`);
      return process.env[secretName];
    }
  }

  /**
   * Creates a new secret resource.
   * @param {string} secretId - The ID of the secret to create.
   * @returns {Promise<Object|null>} The created secret or null on failure.
   */
  async createSecret(secretId) {
    if (!this.client) {
      console.warn('[SecretManagerService] Client unavailable, cannot create secret.');
      return null;
    }

    try {
      const [secret] = await this.client.createSecret({
        parent: `projects/${this.projectId}`,
        secretId: secretId,
        secret: {
          replication: {
            automatic: {},
          },
        },
      });
      console.log(`[SecretManagerService] Created secret resource: ${secretId}`);
      return secret;
    } catch (error) {
      console.error(`[SecretManagerService] Failed to create secret: ${secretId}. Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Adds a new version to a secret.
   * @param {string} secretId - The secret ID.
   * @param {string} payload - The string payload of the secret.
   * @returns {Promise<Object|null>} The created version or null on failure.
   */
  async addSecretVersion(secretId, payload) {
    if (!this.client) {
      console.warn('[SecretManagerService] Client unavailable, cannot add secret version.');
      return null;
    }

    try {
      const [version] = await this.client.addSecretVersion({
        parent: `projects/${this.projectId}/secrets/${secretId}`,
        payload: {
          data: Buffer.from(payload, 'utf8'),
        },
      });
      console.log(`[SecretManagerService] Added version to secret: ${secretId}`);
      return version;
    } catch (error) {
      console.error(`[SecretManagerService] Failed to add version to secret: ${secretId}. Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Disables a specific version of a secret.
   * @param {string} secretId - The secret ID.
   * @param {string|number} versionNumber - The version number to disable.
   * @returns {Promise<Object|null>} The disabled version or null on failure.
   */
  async disableSecretVersion(secretId, versionNumber) {
    if (!this.client) {
      console.warn('[SecretManagerService] Client unavailable, cannot disable secret version.');
      return null;
    }

    try {
      const name = `projects/${this.projectId}/secrets/${secretId}/versions/${versionNumber}`;
      const [version] = await this.client.disableSecretVersion({ name });
      console.log(`[SecretManagerService] Disabled version ${versionNumber} for secret: ${secretId}`);
      return version;
    } catch (error) {
      console.error(`[SecretManagerService] Failed to disable version ${versionNumber} for secret: ${secretId}. Error: ${error.message}`);
      return null;
    }
  }

  /**
   * Lists all secrets in the project.
   * @returns {Promise<Array>} List of secrets.
   */
  async listSecrets() {
    if (!this.client) {
      console.warn('[SecretManagerService] Client unavailable, cannot list secrets.');
      return [];
    }

    try {
      const [secrets] = await this.client.listSecrets({
        parent: `projects/${this.projectId}`,
      });
      console.log(`[SecretManagerService] Listed secrets for project: ${this.projectId}`);
      return secrets;
    } catch (error) {
      console.error(`[SecretManagerService] Failed to list secrets. Error: ${error.message}`);
      return [];
    }
  }

  /**
   * Loads multiple secrets and sets them on process.env.
   * @param {string[]} secretNames - Array of secret names to load.
   * @returns {Promise<void>}
   */
  async loadAll(secretNames) {
    if (!Array.isArray(secretNames)) {
      console.warn('[SecretManagerService] loadAll expects an array of secret names.');
      return;
    }

    console.log(`[SecretManagerService] Loading ${secretNames.length} secrets to process.env...`);
    const promises = secretNames.map(async (name) => {
      const value = await this.getSecret(name);
      if (value !== undefined) {
        process.env[name] = value;
      }
    });

    await Promise.all(promises);
    console.log('[SecretManagerService] Finished loading secrets to process.env.');
  }
}

const instance = new SecretManagerService();

module.exports = instance;
module.exports.SecretManagerService = SecretManagerService;
