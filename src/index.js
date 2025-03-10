import schedule from 'node-schedule';
import { DomainChecker } from './domainChecker.js';
import { Notifier } from './notifier.js';
import { WebInterface } from './webInterface.js';
import { Utils } from './utils.js';

let currentJob = null;
let recalculationJob = null;

/**
 * Check all domains and send notifications if needed
 * @returns {Promise<void>}
 */
async function checkDomains() {
  try {
    const { config, domains } = await Utils.loadConfig();
    const checker = new DomainChecker(config.warningDays);
    const notifier = new Notifier(config.ntfy);
    
    // Load existing cache if useCache is enabled
    let cachedData = [];
    if (config.useCache) {
      cachedData = await Utils.loadDomainStatusCache();
      console.log(`Cache usage is ENABLED. Loaded ${cachedData.length} cached domain records.`);
    } else {
      console.log('Cache usage is DISABLED. Will perform full WHOIS queries for all domains.');
    }

    console.log('Starting domain check...');

    const statusResults = [];
    const currentDate = new Date();
    let cacheHits = 0;
    let cacheSkips = 0;

    for (const domainObj of domains.domains) {
      const domain = domainObj.domain;
      let result;
      
      // Check if we can use cached data
      if (config.useCache) {
        const cachedDomain = cachedData.find(item => item.domain === domain);
        
        if (cachedDomain && !cachedDomain.error && cachedDomain.expirationDate) {
          // Calculate current days until expiration
          const expirationDate = new Date(cachedDomain.expirationDate);
          const diffTime = expirationDate - currentDate;
          const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // If days until expiration is significantly greater than warning days, use cache
          if (daysUntilExpiration > config.warningDays * 2) {
            console.log(`🔄 USING CACHE for ${domain}: ${daysUntilExpiration} days until expiration (${expirationDate.toISOString().split('T')[0]})`);
            cacheHits++;
            
            result = {
              ...cachedDomain,
              daysUntilExpiration,
              needsWarning: daysUntilExpiration <= config.warningDays
            };
            
            // Skip WHOIS query
            statusResults.push(result);
            continue;
          } else {
            console.log(`⚠️ NOT USING CACHE for ${domain}: Only ${daysUntilExpiration} days until expiration (below threshold of ${config.warningDays * 2} days)`);
            cacheSkips++;
          }
        } else {
          if (!cachedDomain) {
            console.log(`❓ NOT USING CACHE for ${domain}: No cached data found`);
          } else if (cachedDomain.error) {
            console.log(`❌ NOT USING CACHE for ${domain}: Previous error in cached data`);
          } else {
            console.log(`❌ NOT USING CACHE for ${domain}: Missing expiration date in cached data`);
          }
          cacheSkips++;
        }
      }
      
      // If we can't use cache or domain is approaching expiration, do a WHOIS query
      console.log(`🔍 Performing WHOIS query for ${domain}...`);
      result = await checker.checkDomain(domain);
      
      // Add description to the result
      result.description = domainObj.description;
      
      // Add to status results
      statusResults.push(result);
      
      if (result.error) {
        console.error(`❌ Error checking ${domain}:`, result.error);
        continue;
      }

      console.log(`✅ ${domain}: ${result.daysUntilExpiration} days until expiration (${new Date(result.expirationDate).toISOString().split('T')[0]})`);

      if (result.needsWarning) {
        console.log(`🚨 SENDING NOTIFICATION for ${domain}: ${result.daysUntilExpiration} days until expiration`);
        await notifier.sendNotification(result);
      }
    }

    // Save results to cache
    await Utils.saveDomainStatusCache(statusResults);
    
    // Log cache usage statistics
    if (config.useCache) {
      const totalDomains = domains.domains.length;
      const cacheHitPercentage = (cacheHits / totalDomains * 100).toFixed(2);
      console.log(`\n📊 CACHE USAGE SUMMARY:`);
      console.log(`Total domains: ${totalDomains}`);
      console.log(`Cache hits: ${cacheHits} (${cacheHitPercentage}%)`);
      console.log(`WHOIS queries: ${cacheSkips} (${(100 - parseFloat(cacheHitPercentage)).toFixed(2)}%)`);
      console.log(`Cache threshold: ${config.warningDays * 2} days (2x warning days)`);
    }
    
  } catch (error) {
    console.error('Error in checkDomains:', error);
  }
}

/**
 * Recalculate days until expiration without performing WHOIS queries
 * @returns {Promise<void>}
 */
async function recalculateDaysUntilExpiration() {
  try {
    console.log('Recalculating days until expiration...');
    
    const { config } = await Utils.loadConfig();
    const statusData = await Utils.loadDomainStatusCache();
    
    if (!statusData || statusData.length === 0) {
      console.log('No domain status data found to recalculate');
      return;
    }
    
    const updatedStatusData = statusData.map(domain => {
      if (domain.expirationDate && !domain.error) {
        const expirationDate = new Date(domain.expirationDate);
        const today = new Date();
        const diffTime = expirationDate - today;
        const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...domain,
          daysUntilExpiration,
          needsWarning: daysUntilExpiration <= config.warningDays
        };
      }
      return domain;
    });
    
    await Utils.saveDomainStatusCache(updatedStatusData);
    console.log('Days until expiration recalculated successfully');
    
    // Check for new warnings
    const notifier = new Notifier(config.ntfy);
    
    for (const domain of updatedStatusData) {
      if (domain.needsWarning && !domain.error) {
        // Check if this is a new warning (wasn't warning before)
        const oldDomain = statusData.find(d => d.domain === domain.domain);
        if (!oldDomain || !oldDomain.needsWarning) {
          await notifier.sendNotification(domain);
        }
      }
    }
    
  } catch (error) {
    console.error('Error recalculating days until expiration:', error);
  }
}

/**
 * Update the schedule for domain checks
 * @returns {Promise<void>}
 */
async function updateSchedule() {
  if (currentJob) {
    currentJob.cancel();
  }
  
  if (recalculationJob) {
    recalculationJob.cancel();
  }
  
  const { config, domains } = await Utils.loadConfig();
  
  // Schedule full domain checks
  currentJob = schedule.scheduleJob(config.checkInterval, checkDomains);
  console.log('Domain check schedule updated. Running on schedule:', config.checkInterval);
  
  // Schedule daily recalculation at midnight
  recalculationJob = schedule.scheduleJob('0 0 * * *', recalculateDaysUntilExpiration);
  console.log('Days until expiration recalculation scheduled daily at midnight');
  
  // Run an immediate check or recalculation after config update
  if (config.recalculateAfterSave) {
    console.log('Checking configuration after save...');
    
    // Load current cache
    const cachedData = await Utils.loadDomainStatusCache();
    const checker = new DomainChecker(config.warningDays);
    const notifier = new Notifier(config.ntfy);
    
    // Create a map of cached domains for quick lookup
    const cachedDomainsMap = new Map();
    cachedData.forEach(item => {
      cachedDomainsMap.set(item.domain, item);
    });
    
    // Prepare updated status results
    const statusResults = [];
    const currentDate = new Date();
    
    console.log('Checking for new or existing domains...');
    
    // Process each domain in the configuration
    for (const domainObj of domains.domains) {
      const domain = domainObj.domain;
      let result;
      
      // Check if domain exists in cache
      if (cachedDomainsMap.has(domain)) {
        // Domain exists in cache, recalculate days
        const cachedDomain = cachedDomainsMap.get(domain);
        
        if (!cachedDomain.error && cachedDomain.expirationDate) {
          // Calculate current days until expiration
          const expirationDate = new Date(cachedDomain.expirationDate);
          const diffTime = expirationDate - currentDate;
          const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          console.log(`🔄 Recalculating for existing domain ${domain}: ${daysUntilExpiration} days until expiration`);
          
          result = {
            ...cachedDomain,
            daysUntilExpiration,
            needsWarning: daysUntilExpiration <= config.warningDays,
            description: domainObj.description // Update description from config
          };
          
          // Check if warning status changed
          if (result.needsWarning && !cachedDomain.needsWarning) {
            console.log(`🚨 Domain ${domain} now needs warning`);
            await notifier.sendNotification(result);
          }
        } else {
          // Cached domain has error, perform a new WHOIS query
          console.log(`❌ Previous error for ${domain}, performing new WHOIS query`);
          result = await checker.checkDomain(domain);
          result.description = domainObj.description;
          
          if (result.needsWarning) {
            await notifier.sendNotification(result);
          }
        }
      } else {
        // New domain not in cache, perform WHOIS query
        console.log(`🆕 New domain ${domain}, performing WHOIS query`);
        result = await checker.checkDomain(domain);
        result.description = domainObj.description;
        
        if (result.needsWarning) {
          await notifier.sendNotification(result);
        }
      }
      
      // Add to status results
      statusResults.push(result);
    }
    
    // Save updated results to cache
    await Utils.saveDomainStatusCache(statusResults);
    console.log(`Updated cache with ${statusResults.length} domains`);
    
  } else {
    // Perform full check for all domains
    await checkDomains();
  }
}

async function main() {
  try {
    // Start web interface
    const webInterface = new WebInterface(updateSchedule);
    await webInterface.start();

    // Initial setup
    await updateSchedule();
    
    // Run initial recalculation
    await recalculateDaysUntilExpiration();
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 