/**
 * Enhanced environment configuration
 * Validates and provides type-safe access to environment variables
 */

import { z } from 'zod';

// Check if we're on the client side
const isClient = typeof window !== 'undefined';

// Client-side schema (only public variables)
const clientEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

// Server-side schema (all variables)
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL deve essere un URL valido'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY è obbligatoria'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY è obbligatoria'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional().default('noreply@gst-tennis-academy.it'),
  EMAIL_REPLY_TO: z.string().optional().default('info@gst-tennis-academy.it'),
  ENABLE_RATE_LIMITING: z.enum(['true', 'false']).default('true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Use appropriate schema based on environment
const envSchema = isClient ? clientEnvSchema : serverEnvSchema;

type EnvConfig = z.infer<typeof serverEnvSchema>;

class EnvironmentConfig {
  private config: EnvConfig;
  private isValidated: boolean = false;

  constructor() {
    this.config = {} as EnvConfig;
  }

  /**
   * Validate environment variables
   * Should be called at application startup
   */
  public validate(): void {
    if (isClient) {
      this.config = process.env as unknown as EnvConfig;
      this.isValidated = true;
      return;
    }
    try {
      this.config = envSchema.parse(process.env);
      this.isValidated = true;
      
      // Only log on server-side in development
      if (!isClient && this.config.NODE_ENV === 'development') {
        console.log('✅ Environment variables validated successfully');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Only log errors on server-side
        if (!isClient) {
          console.error('❌ Environment validation failed:');
          error.errors.forEach((err) => {
            console.error(`  - ${err.path.join('.')}: ${err.message}`);
          });
        }
        
        // Use fallback values instead of crashing
        if (!isClient) {
          console.warn('⚠️  Continuing with partial configuration');
        }
        
        // Use raw process.env values as fallback
        this.config = {
          NODE_ENV: (process.env.NODE_ENV || 'development') as any,
          NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          SUPABASE_URL: process.env.SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
          RESEND_API_KEY: process.env.RESEND_API_KEY,
          EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@gst-tennis-academy.it',
          EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO || 'info@gst-tennis-academy.it',
          ENABLE_RATE_LIMITING: (process.env.ENABLE_RATE_LIMITING || 'true') as any,
          LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as any,
        } as EnvConfig;
        this.isValidated = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Get environment variable with type safety
   * Auto-validates if not already validated
   */
  private get<K extends keyof EnvConfig>(key: K): EnvConfig[K] | undefined {
    if (!this.isValidated) {
      this.validate();
    }
    if (this.config?.[key] !== undefined) {
      return this.config[key];
    }
    if (isClient) {
      return (process.env as any)?.[key];
    }
    return this.config?.[key];
  }

  // Public getters
  public get nodeEnv(): string {
    return this.get('NODE_ENV') || 'development';
  }

  public get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  public get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  public get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  public get appUrl(): string {
    return this.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';
  }

  // Supabase
  public get supabaseUrl(): string {
    return this.get('SUPABASE_URL') || this.get('NEXT_PUBLIC_SUPABASE_URL') || '';
  }

  public get supabaseAnonKey(): string {
    return this.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';
  }

  public get supabaseServiceRoleKey(): string {
    return this.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  }

  // Email
  public get resendApiKey(): string {
    return this.get('RESEND_API_KEY') || '';
  }

  public get emailFrom(): string {
    return this.get('EMAIL_FROM') || 'noreply@gst-tennis-academy.it';
  }

  public get emailReplyTo(): string {
    return this.get('EMAIL_REPLY_TO') || 'info@gst-tennis-academy.it';
  }

  // Features
  public get isRateLimitingEnabled(): boolean {
    return this.get('ENABLE_RATE_LIMITING') === 'true';
  }

  public get logLevel(): string {
    return this.get('LOG_LEVEL') || 'info';
  }
}

// Singleton instance
const env = new EnvironmentConfig();

// Auto-validate only in non-build scenarios and only if explicitly called
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  // Validation will happen automatically on first config access
}

export default env;
