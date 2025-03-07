import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Utility functions for the application
 */
export class Utils {
  /**
   * Load configuration from files
   * @returns {Promise<{config: import('./interfaces.js').AppConfig, domains: import('./interfaces.js').DomainsConfig}>}
   */
  static async loadConfig() {
    const config = JSON.parse(
      await readFile(new URL('../config.json', import.meta.url))
    );
    const domains = JSON.parse(
      await readFile(new URL('../domains.json', import.meta.url))
    );
    return { config, domains };
  }

  /**
   * Save configuration to files
   * @param {import('./interfaces.js').AppConfig} config - Application configuration
   * @param {import('./interfaces.js').DomainsConfig} domains - Domains configuration
   * @returns {Promise<void>}
   */
  static async saveConfig(config, domains) {
    await writeFile(
      new URL('../config.json', import.meta.url),
      JSON.stringify(config, null, 2)
    );
    await writeFile(
      new URL('../domains.json', import.meta.url),
      JSON.stringify(domains, null, 2)
    );
  }

  /**
   * Load domain status cache
   * @returns {Promise<import('./interfaces.js').DomainStatus[]>}
   */
  static async loadDomainStatusCache() {
    try {
      return JSON.parse(
        await readFile(new URL('../cache/domain-status.json', import.meta.url))
      );
    } catch (error) {
      console.log('No domain status cache found or error reading cache');
      return [];
    }
  }

  /**
   * Save domain status cache
   * @param {import('./interfaces.js').DomainStatus[]} statusData - Domain status data
   * @returns {Promise<void>}
   */
  static async saveDomainStatusCache(statusData) {
    try {
      // Ensure cache directory exists
      const fs = await import('fs');
      const cachePath = join(__dirname, '../cache');
      
      if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, { recursive: true });
      }
      
      await writeFile(
        new URL('../cache/domain-status.json', import.meta.url),
        JSON.stringify(statusData, null, 2)
      );
    } catch (error) {
      console.error('Error saving domain status cache:', error);
    }
  }
} 