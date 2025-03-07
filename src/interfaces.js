/**
 * @typedef {Object} NtfyConfig
 * @property {string} url - The URL for the ntfy.sh notification service
 * @property {('low'|'default'|'high')} priority - The priority level for notifications
 */

/**
 * @typedef {Object} AppConfig
 * @property {NtfyConfig} ntfy - Configuration for ntfy.sh notifications
 * @property {string} checkInterval - Cron expression for check schedule
 * @property {number} warningDays - Number of days before expiration to start warning
 */

/**
 * @typedef {Object} DomainInfo
 * @property {string} domain - The domain name to check
 * @property {string} [description] - Optional description of the domain
 */

/**
 * @typedef {Object} DomainsConfig
 * @property {DomainInfo[]} domains - Array of domains to monitor
 */

/**
 * @typedef {Object} DomainStatus
 * @property {string} domain - The domain name
 * @property {Date} expirationDate - When the domain expires
 * @property {number} daysUntilExpiration - Days until expiration
 * @property {boolean} needsWarning - Whether a warning should be shown
 * @property {string} [description] - Optional description of the domain
 * @property {string} [error] - Error message if check failed
 */

// Export empty object to make this a proper ES module
export default {}; 