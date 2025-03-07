import whois from 'whois-json';

/**
 * Class to check domain expiration dates
 */
export class DomainChecker {
  /**
   * @param {number} warningDays - Days before expiration to start warning
   */
  constructor(warningDays) {
    this.warningDays = warningDays;
  }

  /**
   * Check a domain's expiration status
   * @param {string} domain - Domain name to check
   * @returns {Promise<import('./interfaces.js').DomainStatus>} Domain status information
   */
  async checkDomain(domain) {
    try {
      const result = await whois(domain);
      
      // Log the full WHOIS response
      console.log('\n=== WHOIS Response for', domain, '===');
      console.log(JSON.stringify(result, null, 2));
      console.log('=====================================\n');

      // Try different possible date fields
      const expirationDate = this.findExpirationDate(result);
      if (!expirationDate) {
        throw new Error('Could not find expiration date in WHOIS data');
      }

      const daysUntilExpiration = this.calculateDaysUntilExpiration(expirationDate);

      return {
        domain,
        expirationDate,
        daysUntilExpiration,
        needsWarning: daysUntilExpiration <= this.warningDays
      };
    } catch (error) {
      console.error(`Error checking domain ${domain}:`, error);
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
    // 1. First try direct field matching with common field names
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
          console.log(`Found expiration date in field: ${field}`);
          return date;
        }
      }
    }

    // 2. If direct matching fails, try regex matching on field names
    const expiryRegex = /(expir|renew|registr.*expir|expir.*date|valid.*until)/i;
    
    for (const field in whoisData) {
      if (expiryRegex.test(field) && whoisData[field]) {
        const date = new Date(whoisData[field]);
        if (!isNaN(date.getTime())) {
          console.log(`Found expiration date using regex in field: ${field}`);
          return date;
        }
      }
    }

    // 3. If all else fails, try to find a date-like string in any field that looks like it's about expiration
    for (const field in whoisData) {
      const fieldValue = whoisData[field];
      if (typeof fieldValue === 'string' && 
          (field.toLowerCase().includes('expir') || field.toLowerCase().includes('renew'))) {
        // Look for date patterns in the string
        const dateMatch = fieldValue.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}|[A-Za-z]{3} \d{1,2} \d{4}/);
        if (dateMatch) {
          const date = new Date(dateMatch[0]);
          if (!isNaN(date.getTime())) {
            console.log(`Found expiration date in field value: ${field}`);
            return date;
          }
        }
      }
    }

    console.log('Could not find expiration date in WHOIS data');
    console.log('Available fields:', Object.keys(whoisData).join(', '));
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