import { supabase } from "@/integrations/supabase/client";

export type AuditEventType =
  | "login"
  | "logout"
  | "signup"
  | "trade_executed"
  | "stake_created"
  | "stake_paused"
  | "stake_active"
  | "stake_cancelled"
  | "stake_completed"
  | "role_assigned"
  | "role_removed"
  | "password_changed"
  | "profile_updated"
  | "jvc_pool_created"
  | "jvc_pool_updated"
  | "jvc_pool_deleted";

export type RateLimitAction =
  | "login_attempt"
  | "trade_execution"
  | "password_reset"
  | "transaction_query";

/**
 * Log an audit event for security tracking
 */
export const logAuditEvent = async (eventType: AuditEventType, eventDetails?: Record<string, any>) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("Cannot log audit event: no authenticated user");
      return;
    }

    const { error } = await supabase.rpc("log_audit_event", {
      _user_id: user.id,
      _event_type: eventType,
      _event_details: eventDetails || null,
      _ip_address: null, // Could be enhanced with IP detection
      _user_agent: navigator.userAgent,
    });

    if (error) {
      console.error("Failed to log audit event:", error);
    }
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
};

/**
 * Log a security event with user ID (for admin actions)
 */
export const logSecurityEvent = async (
  userId: string,
  eventType: string,
  eventDetails?: Record<string, any>
) => {
  try {
    const { error } = await supabase.rpc("log_audit_event", {
      _user_id: userId,
      _event_type: eventType,
      _event_details: eventDetails || null,
      _ip_address: null,
      _user_agent: navigator.userAgent,
    });

    if (error) {
      console.error("Failed to log security event:", error);
    }
  } catch (error) {
    console.error("Error logging security event:", error);
  }
};

/**
 * Check if an action is rate-limited
 * @returns true if allowed, false if rate limit exceeded
 */
export const checkRateLimit = async (
  actionType: RateLimitAction,
  maxAttempts: number = 10,
  windowMinutes: number = 15,
): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // For unauthenticated actions (like login), use a session identifier
    let userId = user?.id;

    if (!userId) {
      // Generate or retrieve a session-based identifier for anonymous users
      let sessionId = localStorage.getItem("_rate_limit_session");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("_rate_limit_session", sessionId);
      }
      userId = sessionId;
    }

    const { data, error } = await supabase.rpc("check_rate_limit", {
      _user_id: userId,
      _action_type: actionType,
      _max_attempts: maxAttempts,
      _window_minutes: windowMinutes,
    });

    if (error) {
      console.error("Rate limit check failed:", error);
      return true; // Fail open to not block legitimate users
    }

    return data as boolean;
  } catch (error) {
    console.error("Error checking rate limit:", error);
    return true; // Fail open
  }
};

/**
 * Check if current user has a specific role
 */
export const hasRole = async (role: "admin" | "moderator" | "user"): Promise<boolean> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: role,
    });

    if (error) {
      console.error("Role check failed:", error);
      return false;
    }

    return data as boolean;
  } catch (error) {
    console.error("Error checking role:", error);
    return false;
  }
};

/**
 * Get current user's roles
 */
export const getUserRoles = async (): Promise<string[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);

    if (error) {
      console.error("Failed to fetch user roles:", error);
      return [];
    }

    return data.map((r) => r.role);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return [];
  }
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (
  password: string,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
