import schedule from 'node-schedule';
import { DomainChecker } from './domainChecker.js';
import { Notifier } from './notifier.js';
import { WebInterface } from './webInterface.js';
import { Utils } from './utils.js';
import { Logger } from './logger.js';

let currentJob = null;
let recalculationJob = null;

/**
 * Check all domains and send notifications if needed
 * @returns {Promise<void>}
 */
async function checkDomains() {
  try {
    const done = Logger.task('Domain check');
    const { config, domains } = await Utils.loadConfig();
    
    // Set log level from config
    Logger.setLevel(config.logLevel || 'info');
    
    const checker = new DomainChecker(config.warningDays);
    const notifier = new Notifier(config.ntfy);
    
    // Load existing cache if useCache is enabled
    let cachedData = [];
    if (config.useCache) {
      cachedData = await Utils.loadDomainStatusCache();
      Logger.info(`Cache usage is ENABLED. Loaded ${cachedData.length} cached domain records.`);
    } else {
      Logger.info('Cache usage is DISABLED. Will perform full WHOIS queries for all domains.');
    }

    Logger.section('Starting Domain Check');

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
            Logger.info(`🔄 USING CACHE for ${domain}: ${daysUntilExpiration} days until expiration (${expirationDate.toISOString().split('T')[0]})`);
            cacheHits++;
            
            result = {
              ...cachedDomain,
              daysUntilExpiration,
              needsWarning: daysUntilExpiration <= config.warningDays,
              description: domainObj.description // Update description from config
            };
            
            // Skip WHOIS query
            statusResults.push(result);
            continue;
          } else {
            Logger.debug(`⚠️ NOT USING CACHE for ${domain}: Only ${daysUntilExpiration} days until expiration (below threshold of ${config.warningDays * 2} days)`);
            cacheSkips++;
          }
        } else {
          if (!cachedDomain) {
            Logger.debug(`❓ NOT USING CACHE for ${domain}: No cached data found`);
          } else if (cachedDomain.error) {
            Logger.debug(`❌ NOT USING CACHE for ${domain}: Previous error in cached data`);
          } else {
            Logger.debug(`❌ NOT USING CACHE for ${domain}: Missing expiration date in cached data`);
          }
          cacheSkips++;
        }
      }
      
      // If we can't use cache or domain is approaching expiration, do a WHOIS query
      const whoisDone = Logger.task(`WHOIS query for ${domain}`);
      Logger.info(`🔍 Performing WHOIS query for ${domain}...`);
      result = await checker.checkDomain(domain);
      whoisDone('completed');
      
      // Add description to the result
      result.description = domainObj.description;
      
      // Add to status results
      statusResults.push(result);
      
      if (result.error) {
        Logger.error(`❌ Error checking ${domain}: ${result.error}`);
        continue;
      }

      Logger.info(`✅ ${domain}: ${result.daysUntilExpiration} days until expiration (${new Date(result.expirationDate).toISOString().split('T')[0]})`);

      if (result.needsWarning) {
        Logger.warn(`🚨 SENDING NOTIFICATION for ${domain}: ${result.daysUntilExpiration} days until expiration`);
        await notifier.sendNotification(result);
      }
    }

    // Save results to cache
    await Utils.saveDomainStatusCache(statusResults);
    
    // Log cache usage statistics
    if (config.useCache) {
      const totalDomains = domains.domains.length;
      const cacheHitPercentage = (cacheHits / totalDomains * 100).toFixed(2);
      Logger.section('Cache Usage Summary');
      Logger.info(`Total domains: ${totalDomains}`);
      Logger.info(`Cache hits: ${cacheHits} (${cacheHitPercentage}%)`);
      Logger.info(`WHOIS queries: ${cacheSkips} (${(100 - parseFloat(cacheHitPercentage)).toFixed(2)}%)`);
      Logger.info(`Cache threshold: ${config.warningDays * 2} days (2x warning days)`);
    }
    
    done('completed');
  } catch (error) {
    Logger.error('Error in checkDomains:', error);
  }
}

/**
 * Recalculate days until expiration without performing WHOIS queries
 * @returns {Promise<void>}
 */
async function recalculateDaysUntilExpiration() {
  try {
    const done = Logger.task('Recalculate days until expiration');
    Logger.info('Recalculating days until expiration...');
    
    const { config } = await Utils.loadConfig();
    const statusData = await Utils.loadDomainStatusCache();
    
    if (!statusData || statusData.length === 0) {
      Logger.warn('No domain status data found to recalculate');
      done('no data');
      return;
    }
    
    const currentDate = new Date();
    const updatedStatusData = statusData.map(domain => {
      if (domain.expirationDate && !domain.error) {
        const expirationDate = new Date(domain.expirationDate);
        const diffTime = expirationDate - currentDate;
        const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        Logger.debug(`Recalculated ${domain.domain}: ${daysUntilExpiration} days until expiration`);
        
        return {
          ...domain,
          daysUntilExpiration,
          needsWarning: daysUntilExpiration <= config.warningDays
        };
      }
      return domain;
    });
    
    await Utils.saveDomainStatusCache(updatedStatusData);
    Logger.info('Days until expiration recalculated successfully');
    
    // Check for new warnings
    const notifier = new Notifier(config.ntfy);
    let newWarnings = 0;
    
    for (const domain of updatedStatusData) {
      if (domain.needsWarning && !domain.error) {
        // Check if this is a new warning (wasn't warning before)
        const oldDomain = statusData.find(d => d.domain === domain.domain);
        if (!oldDomain || !oldDomain.needsWarning) {
          Logger.warn(`New warning for ${domain.domain}: ${domain.daysUntilExpiration} days until expiration`);
          await notifier.sendNotification(domain);
          newWarnings++;
        }
      }
    }
    
    if (newWarnings > 0) {
      Logger.warn(`Sent ${newWarnings} new warning notifications`);
    } else {
      Logger.info('No new warnings detected');
    }
    
    done('completed');
  } catch (error) {
    Logger.error('Error recalculating days until expiration:', error);
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
  recalculationJob = schedule.scheduleJob(config.checkInterval, recalculateDaysUntilExpiration);
  console.log('Days until expiration recalculation. Running on schedule:', config.checkInterval);
  
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
    Logger.section('Domain Expiration Checker Starting');
    
    // Load initial config to set log level
    const { config } = await Utils.loadConfig();
    Logger.setLevel(config.logLevel || 'info');
    
    // Start web interface
    const webInterface = new WebInterface(updateSchedule);
    const port = await webInterface.start();
    Logger.info(`Web interface started on port ${port}`);

    // Initial setup
    Logger.info('Setting up initial schedule');
    await updateSchedule();
    
    // Run initial recalculation
    Logger.info('Running initial days recalculation');
    await recalculateDaysUntilExpiration();
    
    Logger.section('Domain Expiration Checker Started');
  } catch (error) {
    Logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

main().catch(error => {
  Logger.error('Unhandled error:', error);
  process.exit(1);
}); 