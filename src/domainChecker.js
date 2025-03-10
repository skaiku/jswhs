import whois from 'whois-json';
import { Logger } from './logger.js';

/**
 * Class to check domain expiration dates
 */
export class DomainChecker {
  /**
   * @param {number} warningDays - Days before expiration to start warning
   */
  constructor(warningDays) {
    this.warningDays = warningDays;
    Logger.debug(`DomainChecker initialized with warning days: ${warningDays}`);
  }

  /**
   * Check a domain's expiration status
   * @param {string} domain - Domain name to check
   * @returns {Promise<import('./interfaces.js').DomainStatus>} Domain status information
   */
  async checkDomain(domain) {
    const done = Logger.task(`Check domain: ${domain}`);
    try {
      Logger.debug(`Starting WHOIS query for ${domain}`);
      const result = await whois(domain);
      
      // Log the full WHOIS response
      Logger.debug(`WHOIS Response for ${domain}:`, result);
      
      // Try different possible date fields
      const expirationDate = this.findExpirationDate(result);
      if (!expirationDate) {
        Logger.error(`Could not find expiration date for ${domain}`);
        throw new Error('Could not find expiration date in WHOIS data');
      }

      const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate);
      Logger.debug(`${domain} expires in ${daysUntilExpiration} days (${expirationDate.toISOString()})`);

      done('completed');
      return {
        domain,
        expirationDate,
        daysUntilExpiration,
        needsWarning: daysUntilExpiration <= this.warningDays
      };
    } catch (error) {
      Logger.error(`Error checking domain ${domain}:`, error);
      done('failed');
      return {
        domain,
        error: error.message
      };
    }
  }

  /**
   * Find expiration date in WHOIS data
   * @param {Object} whoisData - WHOIS data object
   * @returns {Date|null} Expiration date or null if not found
   */
  findExpirationDate(whoisData) {
    // List of possible field names for expiration date
    const dateFields = [
      'expiresOn',
      'expirationDate',
      'registryExpiryDate',
      'registrarRegistrationExpirationDate',
      'expires',
      'paid-till',
      'expiry'
    ];

    for (const field of dateFields) {
      if (whoisData[field]) {
        const date = new Date(whoisData[field]);
        if (!isNaN(date.getTime())) {
          Logger.debug(`Found expiration date in field: ${field} = ${whoisData[field]}`);
          return date;
        }
      }
    }

    // If direct matching fails, try regex matching on field names
    const expiryRegex = /(expir|renew|registr.*expir|expir.*date|valid.*until)/i;
    
    for (const field in whoisData) {
      if (expiryRegex.test(field) && whoisData[field]) {
        const date = new Date(whoisData[field]);
        if (!isNaN(date.getTime())) {
          Logger.debug(`Found expiration date using regex in field: ${field} = ${whoisData[field]}`);
          return date;
        }
      }
    }

    Logger.warn('Could not find expiration date in WHOIS data');
    Logger.debug('Available fields:', Object.keys(whoisData).join(', '));
    return null;
  }

  /**
   * Calculate days until expiration
   * @param {Date} expirationDate - Domain expiration date
   * @returns {number} Days until expiration
   */
  calculateDaysUntilExpiration(expirationDate) {
    const today = new Date();
    const diffTime = expirationDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
} 