import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/api/apiClient';

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Parse user agent for device/browser info
const parseUserAgent = () => {
  const ua = navigator.userAgent;

  let deviceType = 'desktop';
  if (/mobile/i.test(ua)) deviceType = 'mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

  let browser = 'unknown';
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'safari';
  else if (/firefox/i.test(ua)) browser = 'firefox';
  else if (/edg/i.test(ua)) browser = 'edge';

  let os = 'unknown';
  if (/windows/i.test(ua)) os = 'windows';
  else if (/mac/i.test(ua)) os = 'macos';
  else if (/linux/i.test(ua)) os = 'linux';
  else if (/android/i.test(ua)) os = 'android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'ios';

  return { deviceType, browser, os };
};

/**
 * Track page views automatically
 */
export const usePageTracking = () => {
  const location = useLocation();
  const pageLoadTime = useRef(Date.now());

  useEffect(() => {
    const sessionId = getSessionId();
    const { deviceType, browser, os } = parseUserAgent();

    // Track page view
    const trackPageView = async () => {
      try {
        await api.post('/logs/analytics/pageview/', {
          path: location.pathname + location.search,
          page_title: document.title,
          referrer: document.referrer,
          session_id: sessionId,
          device_type: deviceType,
          browser,
          os,
        });
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.debug('Analytics tracking failed:', error);
      }
    };

    trackPageView();
    pageLoadTime.current = Date.now();

    // Track time on page when leaving
    return () => {
      const timeOnPage = Math.floor((Date.now() - pageLoadTime.current) / 1000);

      // Use sendBeacon for reliable tracking on page unload
      if (timeOnPage > 1) {
        const data = new Blob([JSON.stringify({
          path: location.pathname,
          session_id: sessionId,
          time_on_page: timeOnPage,
        })], { type: 'application/json' });

        navigator.sendBeacon(`${api.defaults.baseURL}/logs/analytics/pageview/update-time/`, data);
      }
    };
  }, [location]);
};

/**
 * Track user interactions (clicks, etc)
 */
export const useInteractionTracking = () => {
  const location = useLocation();
  const sessionId = getSessionId();

  const trackInteraction = useCallback(async (
    interactionType: string,
    elementId?: string,
    elementText?: string,
    metadata?: any
  ) => {
    try {
      await api.post('/logs/analytics/interaction/', {
        interaction_type: interactionType,
        element_id: elementId,
        element_text: elementText,
        page_path: location.pathname,
        session_id: sessionId,
        metadata,
      });
    } catch (error) {
      console.debug('Interaction tracking failed:', error);
    }
  }, [location, sessionId]);

  const trackClick = useCallback((elementId: string, elementText?: string, metadata?: any) => {
    return trackInteraction('click', elementId, elementText, metadata);
  }, [trackInteraction]);

  const trackSearch = useCallback((searchTerm: string, metadata?: any) => {
    return trackInteraction('search', 'search-bar', searchTerm, { ...metadata, searchTerm });
  }, [trackInteraction]);

  const trackFilter = useCallback((filterName: string, filterValue: string, metadata?: any) => {
    return trackInteraction('filter', filterName, filterValue, { ...metadata, filterName, filterValue });
  }, [trackInteraction]);

  const trackFormSubmit = useCallback((formId: string, metadata?: any) => {
    return trackInteraction('form_submit', formId, undefined, metadata);
  }, [trackInteraction]);

  const trackModalOpen = useCallback((modalName: string, metadata?: any) => {
    return trackInteraction('modal_open', modalName, undefined, metadata);
  }, [trackInteraction]);

  const trackModalClose = useCallback((modalName: string, metadata?: any) => {
    return trackInteraction('modal_close', modalName, undefined, metadata);
  }, [trackInteraction]);

  const trackVideoPlay = useCallback((videoId: string, metadata?: any) => {
    return trackInteraction('video_play', videoId, undefined, metadata);
  }, [trackInteraction]);

  const trackVideoPause = useCallback((videoId: string, metadata?: any) => {
    return trackInteraction('video_pause', videoId, undefined, metadata);
  }, [trackInteraction]);

  return {
    trackClick,
    trackSearch,
    trackFilter,
    trackFormSubmit,
    trackModalOpen,
    trackModalClose,
    trackVideoPlay,
    trackVideoPause,
    trackInteraction,
  };
};

/**
 * Track A/B test variant impression
 */
export const useABTestTracking = (testName: string, variant: string) => {
  useEffect(() => {
    const trackImpression = async () => {
      try {
        await api.post('/logs/analytics/abtest/impression/', {
          test_name: testName,
          variant_name: variant,
        });
      } catch (error) {
        console.debug('A/B test tracking failed:', error);
      }
    };

    trackImpression();
  }, [testName, variant]);

  const trackConversion = useCallback(async (metadata?: any) => {
    try {
      await api.post('/logs/analytics/abtest/conversion/', {
        test_name: testName,
        variant_name: variant,
        metadata,
      });
    } catch (error) {
      console.debug('A/B test conversion tracking failed:', error);
    }
  }, [testName, variant]);

  return { trackConversion };
};
