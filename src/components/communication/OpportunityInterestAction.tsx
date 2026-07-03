import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';

import { Button } from '@/components/ui';
import {
  formatCommunicationError,
  loadOpportunityResponseState,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type { OpportunityResponseState } from '@/types/communication';
import type { OpportunityRecord } from '@/types/opportunity';

import { ExpressInterestSheet } from './ExpressInterestSheet';

export function OpportunityInterestAction({
  deferLoad,
  buttonLabelStyle,
  buttonStyle,
  onError,
  opportunity,
}: {
  buttonLabelStyle?: StyleProp<TextStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  deferLoad?: boolean;
  onError?: (message: string) => void;
  opportunity: OpportunityRecord;
}) {
  const [state, setState] = useState<OpportunityResponseState>({
    responseId: null,
    status: 'none',
    conversationId: null,
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!deferLoad);
  const [hasLoaded, setHasLoaded] = useState(!deferLoad);

  useEffect(() => {
    if (deferLoad) return;
    let active = true;
    loadOpportunityResponseState(opportunity.id)
      .then((result) => {
        if (active) {
          setState(result);
          setHasLoaded(true);
        }
      })
      .catch((error) => onError?.(formatCommunicationError(error)))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [deferLoad, onError, opportunity.id]);

  const label =
    state.status === 'in_discussion'
      ? 'Open conversation'
      : state.status === 'submitted'
        ? 'Application sent'
        : state.status === 'declined'
          ? 'Response closed'
          : state.status === 'withdrawn'
            ? 'Withdrawn'
            : state.status === 'closed'
              ? 'Closed'
              : 'Apply';

  function actOnState(nextState: OpportunityResponseState) {
    if (nextState.status === 'in_discussion' && nextState.conversationId) {
      router.push(routes.conversation(nextState.conversationId));
    } else if (nextState.status === 'submitted') {
      router.push(routes.sentRequests);
    } else if (nextState.status === 'none') {
      setSheetOpen(true);
    }
  }

  async function handlePress() {
    if (!hasLoaded) {
      setIsLoading(true);
      try {
        const result = await loadOpportunityResponseState(opportunity.id);
        setState(result);
        setHasLoaded(true);
        actOnState(result);
      } catch (error) {
        onError?.(formatCommunicationError(error));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    actOnState(state);
  }

  return (
    <>
      <Button
        disabled={
          isLoading ||
          !['none', 'submitted', 'in_discussion'].includes(state.status)
        }
        label={label}
        labelStyle={buttonLabelStyle}
        onPress={() => void handlePress()}
        style={buttonStyle}
      />
      <ExpressInterestSheet
        onClose={() => setSheetOpen(false)}
        onSuccess={(responseId) =>
          setState({ responseId, status: 'submitted', conversationId: null })
        }
        opportunity={opportunity}
        visible={sheetOpen}
      />
    </>
  );
}
