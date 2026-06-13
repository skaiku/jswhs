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
   * @param {string} [manualExpirationDate] - Optional manual expiration date override/fallback
   * @returns {Promise<import('./interfaces.js').DomainStatus>} Domain status information
   */
  async checkDomain(domain, manualExpirationDate) {
    const done = Logger.task(`Check domain: ${domain}`);
    try {
      let expirationDate = null;
      let nameserversRaw = null;
      let usingManualFallback = false;
      let fetchError = null;

      try {
        Logger.debug(`Starting WHOIS query for ${domain}`);
        const result = await whois(domain);
        
        // Log the full WHOIS response
        Logger.debug(`WHOIS Response for ${domain}:`, result);
        
        // Try different possible date fields
        expirationDate = this.findExpirationDate(result);
        nameserversRaw = this.findNameservers(result);
      } catch (err) {
        Logger.warn(`WHOIS query failed for ${domain}: ${err.message}`);
        fetchError = err;
      }

      if (!expirationDate) {
        if (manualExpirationDate) {
          const parsedManualDate = new Date(manualExpirationDate);
          if (!isNaN(parsedManualDate.getTime())) {
            Logger.info(`Using manual expiration date fallback for ${domain}: ${manualExpirationDate}`);
            expirationDate = parsedManualDate;
            usingManualFallback = true;
          } else {
            Logger.error(`Invalid manual expiration date format for ${domain}: ${manualExpirationDate}`);
            throw new Error(fetchError ? `WHOIS failed (${fetchError.message}) and manual date is invalid` : 'Could not find expiration date in WHOIS data and manual date is invalid');
          }
        } else {
          throw fetchError || new Error('Could not find expiration date in WHOIS data');
        }
      }

      const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate);
      Logger.debug(`${domain} expires in ${daysUntilExpiration} days (${expirationDate.toISOString()})`);

      done('completed');
      return {
        domain,
        expirationDate,
        daysUntilExpiration,
        needsWarning: daysUntilExpiration <= this.warningDays,
        usingManualFallback,
        nameserver: this.parseNameservers(nameserversRaw)
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
   * Find nameserver info in WHOIS data
   * @param {Object} whoisData - WHOIS data object
   * @returns {string|Array|null} Nameserver info or null if not found
   */
  findNameservers(whoisData) {
    const nsFields = [
      'nameserver',
      'nameServer',
      'nserver',
      'nameservers',
      'nameServers',
      'nservers'
    ];
    
    for (const field of nsFields) {
      if (whoisData[field]) {
        return whoisData[field];
      }
    }
    
    // Fallback using regex on keys
    const nsRegex = /^(nameserver|nserver|nameservers|nservers)$/i;
    for (const field in whoisData) {
      if (nsRegex.test(field) && whoisData[field]) {
        return whoisData[field];
      }
    }
    
    return null;
  }

  /**
   * Extract the main domain from a nameserver hostname
   * @param {string} hostname - Nameserver hostname
   * @returns {string} Main domain name
   */
  getMainDomain(hostname) {
    if (!hostname) return '';
    hostname = hostname.trim().toLowerCase();
    
    // Split by dot
    const parts = hostname.split('.');
    if (parts.length <= 2) {
      return hostname;
    }
    
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];
    
    // Common SLDs/suffixes where we want to take the last 3 parts instead of 2
    const commonSlds = new Set(['com', 'co', 'net', 'org', 'edu', 'gov', 'info', 'biz']);
    
    if (
      last.length === 2 && 
      (secondLast.length <= 3 || commonSlds.has(secondLast))
    ) {
      if (parts.length >= 3) {
        return parts.slice(-3).join('.');
      }
    }
    
    return parts.slice(-2).join('.');
  }

  /**
   * Parse nameserver field and extract base domain(s)
   * @param {string|Array|null} nameserverVal - Raw nameserver value
   * @returns {string} Base domain(s) separated by commas
   */
  parseNameservers(nameserverVal) {
    if (!nameserverVal) return '';
    
    let nsList = [];
    if (Array.isArray(nameserverVal)) {
      nsList = nameserverVal;
    } else if (typeof nameserverVal === 'string') {
      nsList = nameserverVal.split(/[\s,;\n]+/);
    } else {
      return '';
    }
    
    const mainDomains = nsList
      .map(ns => {
        let cleaned = ns.trim().toLowerCase();
        if (cleaned.endsWith('.')) {
          cleaned = cleaned.slice(0, -1);
        }
        return this.getMainDomain(cleaned);
      })
      .filter(domain => domain.length > 0);
      
    const uniqueMainDomains = [...new Set(mainDomains)];
    return uniqueMainDomains.join(', ');
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