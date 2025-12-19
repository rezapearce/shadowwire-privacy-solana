'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

/**
 * Custom hook for real-time screening updates
 * Subscribes to changes in screenings and clinical_reviews tables
 * Triggers router refresh when updates occur
 * Shows toast notifications when clinical reviews are completed
 * 
 * @param familyId - Family ID to filter subscriptions by
 */
export function useScreeningRealtime(familyId: string | null) {
  const router = useRouter();
  const processedReviewsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!familyId) {
      return;
    }

    // 1. Subscribe to changes in the 'screenings' table
    const screeningChannel = supabase
      .channel('screening-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'screenings',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          console.log('Screening status changed:', payload.new.status);
          // Trigger Next.js to revalidate the server data
          router.refresh();
        }
      )
      .subscribe();

    // 2. Subscribe to new 'clinical_reviews' inserts
    // We need to verify the screening belongs to this family before showing notification
    const reviewChannel = supabase
      .channel('new-reviews')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clinical_reviews',
        },
        async (payload) => {
          const reviewId = payload.new.review_id as string;
          const screeningId = payload.new.screening_id as string;

          // Prevent duplicate notifications for the same review
          if (processedReviewsRef.current.has(reviewId)) {
            return;
          }

          try {
            // Fetch screening data to verify it belongs to this family
            const { data: screening, error } = await supabase
              .from('screenings')
              .select('id, child_name, family_id, reviewed_by')
              .eq('id', screeningId)
              .eq('family_id', familyId)
              .single();

            // Only show notification if screening belongs to this family
            if (error || !screening) {
              console.log('Clinical review not for this family, skipping notification');
              return;
            }

            // Mark this review as processed
            processedReviewsRef.current.add(reviewId);

            // Get pediatrician name (fallback to default if not available)
            const pediatricianName = screening.reviewed_by || 'Dr. Smith';

            // Show success toast with deep link
            toast.success('New Clinical Report Ready!', {
              description: `${pediatricianName} has finalized ${screening.child_name}'s developmental assessment.`,
              action: {
                label: 'View Report',
                onClick: () => {
                  router.push(`/dashboard/report/${screeningId}`);
                },
              },
              duration: 10000, // Show for 10 seconds to give user time to click
            });

            // Refresh dashboard to show updated status
            router.refresh();
          } catch (err) {
            console.error('Error processing clinical review notification:', err);
            // Still refresh even if notification fails
            router.refresh();
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(screeningChannel);
      supabase.removeChannel(reviewChannel);
      // Clear processed reviews when component unmounts
      processedReviewsRef.current.clear();
    };
  }, [familyId, router]);
}

