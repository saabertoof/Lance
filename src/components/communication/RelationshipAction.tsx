import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';

import { Button } from '@/components/ui';
import {
  formatCommunicationError,
  loadRelationshipStatus,
} from '@/lib/communication';
import { routes } from '@/lib/routes';
import type {
  ConnectResult,
  RelationshipStatus,
} from '@/types/communication';
import type { PublicProfile } from '@/types/profile';

import { ConnectSheet } from './ConnectSheet';

const emptyStatus: RelationshipStatus = {
  state: 'none',
  requestId: null,
  connectionId: null,
  conversationId: null,
  blockedByMe: false,
  blocked: false,
};

export function RelationshipAction({
  compact,
  deferLoad,
  buttonLabelStyle,
  buttonStyle,
  onError,
  profile,
}: {
  buttonLabelStyle?: StyleProp<TextStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  compact?: boolean;
  deferLoad?: boolean;
  onError?: (message: string) => void;
  profile: PublicProfile;
}) {
  const [status, setStatus] = useState(emptyStatus);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!deferLoad);
  const [hasLoaded, setHasLoaded] = useState(!deferLoad);

  useEffect(() => {
    if (deferLoad) return;
    let active = true;
    loadRelationshipStatus(profile.id)
      .then((result) => {
        if (active) {
          setStatus(result);
          setHasLoaded(true);
        }
      })
      .catch((error) => onError?.(formatCommunicationError(error)))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [deferLoad, onError, profile.id]);

  function handleSuccess(result: ConnectResult) {
    setStatus({
      state: result.state === 'connected' ? 'connected' : 'outgoing_pending',
      requestId: result.requestId,
      connectionId: result.connectionId,
      conversationId: result.conversationId,
      blockedByMe: false,
      blocked: false,
    });
  }

  const label =
    status.state === 'connected'
      ? 'Message'
      : status.state === 'outgoing_pending'
        ? 'Requested'
        : status.state === 'incoming_pending'
          ? 'Review request'
          : status.state === 'blocked'
            ? 'Unavailable'
            : 'Connect';

  function actOnStatus(nextStatus: RelationshipStatus) {
    if (nextStatus.state === 'connected' && nextStatus.conversationId) {
      router.push(routes.conversation(nextStatus.conversationId));
    } else if (
      nextStatus.state === 'incoming_pending' &&
      nextStatus.requestId
    ) {
      router.push(routes.connectRequest(nextStatus.requestId));
    } else if (nextStatus.state === 'outgoing_pending') {
      router.push(routes.sentRequests);
    } else if (nextStatus.state !== 'blocked') {
      setSheetOpen(true);
    }
  }

  async function handlePress() {
    if (!hasLoaded) {
      setIsLoading(true);
      try {
        const result = await loadRelationshipStatus(profile.id);
        setStatus(result);
        setHasLoaded(true);
        actOnStatus(result);
      } catch (error) {
        onError?.(formatCommunicationError(error));
      } finally {
        setIsLoading(false);
      }
      return;
    }
    actOnStatus(status);
  }

  return (
    <View style={compact ? styles.compact : undefined}>
      <Button
        disabled={isLoading || status.state === 'blocked'}
        label={label}
        labelStyle={buttonLabelStyle}
        onPress={() => void handlePress()}
        style={buttonStyle}
        variant={status.state === 'connected' ? 'primary' : 'secondary'}
      />
      <ConnectSheet
        onClose={() => setSheetOpen(false)}
        onSuccess={handleSuccess}
        profile={profile}
        visible={sheetOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { minWidth: 116 },
});
