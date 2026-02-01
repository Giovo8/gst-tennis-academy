import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation/schemas";
import { sanitizeEmail, sanitizeObject } from "@/lib/security/sanitize";
import { applyRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";
import logger from "@/lib/logger/secure-logger";
import env from "@/lib/config/env";
import { HTTP_STATUS, ERROR_MESSAGES, USER_ROLES } from "@/lib/constants/app";
import { z } from "zod";

/**
 * POST /api/auth/signup
 * User registration endpoint
 * 
 * Security features:
 * - Rate limiting to prevent abuse
 * - Strong password validation
 * - Input sanitization
 * - Secure logging (no password exposure)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userEmail: string | undefined;

  try {
    // Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = applyRateLimit(clientId, RATE_LIMITS.AUTH_SIGNUP);

    if (!rateLimit.allowed) {
      logger.security('Signup rate limit exceeded', { clientId });
      return NextResponse.json(
        {
          error: ERROR_MESSAGES.RATE_LIMIT,
          retryAfter: rateLimit.reset,
        },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.reset.toString(),
          },
        }
      );
    }

    // Parse and sanitize request body
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);

    // Validate input with Zod schema
    const validationResult = signupSchema.safeParse(sanitizedBody);

    if (!validationResult.success) {
      logger.warn('Signup validation failed', {
        errors: validationResult.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
        clientId,
      });

      return NextResponse.json(
        {
          error: ERROR_MESSAGES.INVALID_INPUT,
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { email, password, fullName, phone, role, inviteCode } = validationResult.data;
    userEmail = email;

    // Additional role validation - only allow specific roles
    const allowedRoles = [USER_ROLES.ATLETA, USER_ROLES.MAESTRO];
    if (!allowedRoles.includes(role as any)) {
      logger.security('Attempt to register with unauthorized role', {
        role,
        email,
        clientId,
      });
      return NextResponse.json(
        { error: 'Ruolo non autorizzato' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      env.supabaseUrl,
      env.supabaseServiceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      logger.warn('Signup attempt with existing email', { email });
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: HTTP_STATUS.CONFLICT }
      );
    }

    // Create user with auto-confirmation
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        role,
      },
    });

    if (authError || !authData.user) {
      logger.error('Auth user creation failed', authError, {
        email,
        role,
      });

      // Generic error to avoid user enumeration
      return NextResponse.json(
        { error: 'Errore durante la registrazione' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const userId = authData.user.id;

    // Wait for database trigger to create profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify profile was created
    const { data: profile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // Create profile if not auto-created by trigger
    if (!profile && !profileCheckError) {
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        email,
        full_name: fullName,
        role,
      });

      if (profileError) {
        logger.error('Profile creation failed', profileError, {
          userId,
          email,
        });
      }
    }

    // Mark invite code as used if provided
    if (inviteCode) {
      const { error: inviteError } = await supabaseAdmin
        .from('invite_codes')
        .update({
          used_by: userId,
          used_at: new Date().toISOString(),
        })
        .eq('code', inviteCode)
        .eq('used_by', null); // Only update if not already used

      if (!inviteError) {
        // Log invite code usage
        await supabaseAdmin.from('activity_logs').insert({
          action: 'invite_code_used',
          entity_type: 'invite_code',
          entity_id: inviteCode,
          user_id: userId,
          metadata: {
            code: inviteCode,
            role,
          },
        });
      }
    }

    // Log successful registration
    logger.auth('User registered', userId, true);
    await supabaseAdmin.from('activity_logs').insert({
      action: 'user_registered',
      entity_type: 'user',
      entity_id: userId,
      user_id: userId,
      metadata: {
        email,
        role,
        invite_code: inviteCode || null,
      },
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/auth/signup', HTTP_STATUS.CREATED, duration);

    return NextResponse.json(
      {
        message: 'Registrazione completata con successo',
        user: {
          id: userId,
          email,
        },
      },
      { status: HTTP_STATUS.CREATED }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Signup exception', error, { email: userEmail });
    logger.apiResponse('POST', '/api/auth/signup', HTTP_STATUS.INTERNAL_SERVER_ERROR, duration);

    return NextResponse.json(
      { error: ERROR_MESSAGES.SERVER_ERROR },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
