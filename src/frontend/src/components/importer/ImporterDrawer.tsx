import { t } from '@lingui/macro';
import {
  ActionIcon,
  Divider,
  Drawer,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Stepper,
  Text,
  Tooltip
} from '@mantine/core';
import { IconCircleX } from '@tabler/icons-react';
import { ReactNode, useCallback, useMemo, useState } from 'react';

import { ModelType } from '../../enums/ModelType';
import {
  ImportSessionStatus,
  useImportSession
} from '../../hooks/UseImportSession';
import { StylishText } from '../items/StylishText';
import { StatusRenderer } from '../render/StatusRenderer';
import ImporterDataSelector from './ImportDataSelector';
import ImporterColumnSelector from './ImporterColumnSelector';
import ImporterImportProgress from './ImporterImportProgress';

/*
 * Stepper component showing the current step of the data import process.
 */
function ImportDrawerStepper({ currentStep }: { currentStep: number }) {
  /* TODO: Enhance this with:
   * - Custom icons
   * - Loading indicators for "background" states
   */

  return (
    <Stepper
      active={currentStep}
      onStepClick={undefined}
      allowNextStepsSelect={false}
      size="xs"
    >
      <Stepper.Step label={t`Import Data`} />
      <Stepper.Step label={t`Map Columns`} />
      <Stepper.Step label={t`Process Data`} />
      <Stepper.Step label={t`Complete Import`} />
    </Stepper>
  );
}

export default function ImporterDrawer({
  sessionId,
  opened,
  onClose
}: {
  sessionId: number;
  opened: boolean;
  onClose: () => void;
}) {
  const session = useImportSession({ sessionId: sessionId });

  const widget = useMemo(() => {
    switch (session.status) {
      case ImportSessionStatus.INITIAL:
        return <Text>Initial : TODO</Text>;
      case ImportSessionStatus.MAPPING:
        return <ImporterColumnSelector session={session} />;
      case ImportSessionStatus.IMPORTING:
        return <ImporterImportProgress session={session} />;
      case ImportSessionStatus.PROCESSING:
        return <ImporterDataSelector session={session} />;
      case ImportSessionStatus.COMPLETE:
        return <Text>Complete!</Text>;
      default:
        return <Text>Unknown status code: {session?.status}</Text>;
    }
  }, [session.status]);

  const title: ReactNode = useMemo(() => {
    return (
      <Stack gap="xs" style={{ width: '100%' }}>
        <Group
          gap="xs"
          wrap="nowrap"
          justify="space-apart"
          grow
          preventGrowOverflow={false}
        >
          <StylishText>
            {session.sessionData?.statusText ?? t`Importing Data`}
          </StylishText>
          {StatusRenderer({
            status: session.status,
            type: ModelType.importsession
          })}
          <Tooltip label={t`Cancel import session`}>
            <ActionIcon color="red" variant="transparent" onClick={onClose}>
              <IconCircleX />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Divider />
      </Stack>
    );
  }, [session.sessionData]);

  return (
    <Drawer
      position="bottom"
      size="80%"
      title={title}
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      closeOnEscape={false}
      closeOnClickOutside={false}
      styles={{
        header: {
          width: '100%'
        },
        title: {
          width: '100%'
        }
      }}
    >
      <Stack gap="xs">
        <LoadingOverlay visible={session.sessionQuery.isFetching} />
        <Paper p="md">{session.sessionQuery.isFetching || widget}</Paper>
      </Stack>
    </Drawer>
  );
}
