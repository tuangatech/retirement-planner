// src/lib/analytics.ts - Privacy-First Analytics Tracking

/**
 * Analytics Tracking System
 *
 * PRIVACY-FIRST DESIGN:
 * - No external services (Google Analytics, Mixpanel, etc.)
 * - All data stored locally in browser
 * - No PII (Personally Identifiable Information) collected
 *
 * WHAT WE TRACK:
 * - Page views (landing, wizard steps, results)
 * - Wizard progression (step completion, time per step)
 * - Calculation start
 *
 * WHAT WE DON'T TRACK:
 * - Financial data (balances, income, expenses)
 * - Personal information (name, email, age)
 * - Browser fingerprinting
 * - Cross-site tracking
 */

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

export interface AnalyticsEvent {
    id: string;
    timestamp: number;
    eventType: 'page_view' | 'wizard_step_complete' | 'calculation_start';
    eventData: Record<string, unknown>;
    sessionId: string;
}

export interface WizardStepMetrics {
    step: number;
    startTime: number;
    endTime: number | null;
    completedAt: number | null;
    timeSpent: number | null; // milliseconds
}

// ===================================================================
// LOCAL STORAGE KEYS
// ===================================================================

const STORAGE_KEYS = {
    SESSION_ID: 'analytics_session_id',
    EVENTS: 'analytics_events',
    WIZARD_PROGRESS: 'analytics_wizard_progress',
} as const;

// ===================================================================
// SESSION MANAGEMENT
// ===================================================================

/**
 * Gets or creates a session ID for this user session
 */
function getSessionId(): string {
    let sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);

    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
    }

    return sessionId;
}

// ===================================================================
// EVENT TRACKING
// ===================================================================

/**
 * Tracks an analytics event locally
 */
function trackEvent(
    eventType: AnalyticsEvent['eventType'],
    eventData: Record<string, unknown> = {}
): void {
    try {
        const event: AnalyticsEvent = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            eventType,
            eventData,
            sessionId: getSessionId(),
        };

        // Get existing events
        const eventsJson = localStorage.getItem(STORAGE_KEYS.EVENTS);
        const events: AnalyticsEvent[] = eventsJson ? JSON.parse(eventsJson) : [];

        // Add new event
        events.push(event);

        // Keep only last 1000 events (prevent localStorage overflow)
        const recentEvents = events.slice(-1000);

        // Save back to localStorage
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(recentEvents));

        // Optional: Log in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics]', eventType, eventData);
        }
    } catch (error) {
        console.error('Failed to track event:', error);
    }
}

// ===================================================================
// SPECIFIC EVENT TRACKERS
// ===================================================================

/**
 * Track page view
 */
export function trackPageView(page: string, additionalData?: Record<string, unknown>): void {
    trackEvent('page_view', {
        page,
        path: window.location.pathname,
        referrer: document.referrer,
        ...additionalData,
    });
}

/**
 * Track wizard step completion
 */
export function trackWizardStep(step: number, timeSpent: number): void {
    trackEvent('wizard_step_complete', {
        step,
        timeSpent, // milliseconds
        timeSpentSeconds: Math.round(timeSpent / 1000),
    });

    // Update wizard progress in localStorage
    updateWizardProgress(step, timeSpent);
}

/**
 * Track calculation start
 */
export function trackCalculationStart(numberOfRuns: number): void {
    trackEvent('calculation_start', {
        numberOfRuns,
        startTime: Date.now(),
    });
}

// ===================================================================
// WIZARD PROGRESS TRACKING
// ===================================================================

interface WizardProgress {
    [sessionId: string]: {
        steps: WizardStepMetrics[];
        completed: boolean;
        startTime: number;
        endTime: number | null;
    };
}

/**
 * Update wizard progress for current session
 */
function updateWizardProgress(step: number, timeSpent: number): void {
    try {
        const sessionId = getSessionId();
        const progressJson = localStorage.getItem(STORAGE_KEYS.WIZARD_PROGRESS);
        const progress: WizardProgress = progressJson ? JSON.parse(progressJson) : {};

        if (!progress[sessionId]) {
            progress[sessionId] = {
                steps: [],
                completed: false,
                startTime: Date.now(),
                endTime: null,
            };
        }

        // Add step metrics
        progress[sessionId].steps.push({
            step,
            startTime: Date.now() - timeSpent,
            endTime: Date.now(),
            completedAt: Date.now(),
            timeSpent,
        });

        // Check if wizard completed (step 6)
        if (step === 6) {
            progress[sessionId].completed = true;
            progress[sessionId].endTime = Date.now();
        }

        localStorage.setItem(STORAGE_KEYS.WIZARD_PROGRESS, JSON.stringify(progress));
    } catch (error) {
        console.error('Failed to update wizard progress:', error);
    }
}
