import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';

interface RateLimitInfo {
  core: {
    limit: number;
    remaining: number;
    reset: Date;
    used: number;
  };
  graphql?: {
    limit: number;
    remaining: number;
    reset: Date;
    cost: number;
  };
  search?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

export class RateLimitMonitor {
  private static instance: RateLimitMonitor;
  private rateLimits: Map<string, RateLimitInfo> = new Map();

  static getInstance(): RateLimitMonitor {
    if (!RateLimitMonitor.instance) {
      RateLimitMonitor.instance = new RateLimitMonitor();
    }
    return RateLimitMonitor.instance;
  }

  /**
   * Check REST API rate limits
   */
  async checkRestRateLimit(token?: string): Promise<RateLimitInfo> {
    try {
      const octokit = new Octokit({
        auth: token,
        userAgent: 'Software-Project-Architect/1.0'
      });

      const { data } = await octokit.rest.rateLimit.get();

      const info: RateLimitInfo = {
        core: {
          limit: data.rate.limit,
          remaining: data.rate.remaining,
          reset: new Date(data.rate.reset * 1000),
          used: data.rate.used
        },
        search: data.resources.search ? {
          limit: data.resources.search.limit,
          remaining: data.resources.search.remaining,
          reset: new Date(data.resources.search.reset * 1000)
        } : undefined
      };

      // Cache the rate limit info
      const key = token || 'anonymous';
      this.rateLimits.set(key, info);

      return info;
    } catch (error) {
      console.error('Failed to check REST rate limit:', error);
      throw error;
    }
  }

  /**
   * Check GraphQL API rate limits
   */
  async checkGraphQLRateLimit(token: string): Promise<RateLimitInfo> {
    try {
      const client = graphql.defaults({
        headers: {
          authorization: `token ${token}`,
        },
      });

      const query = `
        query {
          rateLimit {
            limit
            remaining
            resetAt
            cost
          }
        }
      `;

      const response = await client(query) as any;

      const info: RateLimitInfo = {
        core: {
          limit: 5000, // Default for authenticated requests
          remaining: 5000,
          reset: new Date(),
          used: 0
        },
        graphql: {
          limit: response.rateLimit.limit,
          remaining: response.rateLimit.remaining,
          reset: new Date(response.rateLimit.resetAt),
          cost: response.rateLimit.cost
        }
      };

      // Cache the rate limit info
      this.rateLimits.set(`graphql-${token}`, info);

      return info;
    } catch (error) {
      console.error('Failed to check GraphQL rate limit:', error);
      throw error;
    }
  }

  /**
   * Get cached rate limit info
   */
  getCachedRateLimit(token?: string, type: 'rest' | 'graphql' = 'rest'): RateLimitInfo | undefined {
    const key = type === 'graphql' ? `graphql-${token}` : (token || 'anonymous');
    return this.rateLimits.get(key);
  }

  /**
   * Determine if we should use GraphQL based on rate limits
   */
  async shouldUseGraphQL(token?: string): Promise<boolean> {
    if (!token) {
      console.log('❌ shouldUseGraphQL: No token provided');
      return false;
    }

    try {
      console.log('🔍 Checking rate limits for decision...');

      // Check both rate limits in parallel
      const [restInfo, graphqlInfo] = await Promise.all([
        this.checkRestRateLimit(token).catch(err => {
          console.error('Failed to check REST rate limit:', err);
          return null;
        }),
        this.checkGraphQLRateLimit(token).catch(err => {
          console.error('Failed to check GraphQL rate limit:', err);
          return null;
        })
      ]);

      if (!restInfo || !graphqlInfo) {
        console.error('❌ Could not check rate limits, defaulting to REST');
        return false;
      }

      // GraphQL is generally more efficient, prefer it if available
      // Only switch to REST if GraphQL is severely limited
      const graphqlRemaining = graphqlInfo.graphql?.remaining || 0;
      const restRemaining = restInfo.core.remaining;

      console.log(`📊 Rate Limits - REST: ${restRemaining}/5000, GraphQL: ${graphqlRemaining}/5000`);

      // Use GraphQL if it has at least 100 requests remaining
      const decision = graphqlRemaining > 100;
      console.log(`✅ Decision: Use ${decision ? 'GraphQL' : 'REST'} API`);

      return decision;

    } catch (error: any) {
      console.error('❌ Error in shouldUseGraphQL:', error.message || error);
      // Default to REST on error
      return false;
    }
  }

  /**
   * Wait for rate limit reset if needed
   */
  async waitForRateLimitReset(token?: string, type: 'rest' | 'graphql' = 'rest'): Promise<void> {
    const info = this.getCachedRateLimit(token, type);

    if (!info) return;

    const relevant = type === 'graphql' ? info.graphql : info.core;

    if (!relevant || relevant.remaining > 100) return;

    const resetTime = relevant.reset;
    const now = new Date();
    const waitTime = resetTime.getTime() - now.getTime();

    if (waitTime > 0) {
      console.log(`Rate limit low (${relevant.remaining} remaining). Waiting ${Math.ceil(waitTime / 1000)} seconds until reset...`);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 60000))); // Max 1 minute wait
    }
  }

  /**
   * Format rate limit info for logging
   */
  formatRateLimitInfo(info: RateLimitInfo): string {
    const parts = [];

    if (info.core) {
      parts.push(`Core API: ${info.core.remaining}/${info.core.limit} (Reset: ${info.core.reset.toLocaleTimeString()})`);
    }

    if (info.graphql) {
      parts.push(`GraphQL: ${info.graphql.remaining}/${info.graphql.limit} (Cost: ${info.graphql.cost}, Reset: ${info.graphql.reset.toLocaleTimeString()})`);
    }

    if (info.search) {
      parts.push(`Search: ${info.search.remaining}/${info.search.limit}`);
    }

    return parts.join(' | ');
  }
}

export default RateLimitMonitor;