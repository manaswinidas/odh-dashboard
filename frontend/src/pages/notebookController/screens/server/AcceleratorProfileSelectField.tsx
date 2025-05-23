import * as React from 'react';
import {
  Alert,
  AlertVariant,
  FormGroup,
  Icon,
  InputGroup,
  Label,
  Popover,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { AcceleratorProfileKind } from '~/k8sTypes';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { AcceleratorProfileFormData } from '~/utilities/useAcceleratorProfileFormState';
import { AcceleratorProfileState } from '~/utilities/useReadAcceleratorState';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import useAcceleratorCountWarning from './useAcceleratorCountWarning';

type AcceleratorProfileSelectFieldProps = {
  compatibleIdentifiers?: string[];
  resourceDisplayName?: string;
  infoContent?: string;
  initialState: AcceleratorProfileState;
  formData: AcceleratorProfileFormData;
  isRequired?: boolean;
  setFormData: UpdateObjectAtPropAndValue<AcceleratorProfileFormData>;
};

const AcceleratorProfileSelectField: React.FC<AcceleratorProfileSelectFieldProps> = ({
  compatibleIdentifiers,
  resourceDisplayName = 'image',
  infoContent,
  initialState,
  formData,
  isRequired = false,
  setFormData,
}) => {
  const acceleratorCountWarning = useAcceleratorCountWarning(
    formData.count,
    formData.profile?.spec.identifier,
  );

  const isAcceleratorProfileSupported = (cr: AcceleratorProfileKind) =>
    compatibleIdentifiers?.includes(cr.spec.identifier);

  const enabledAcceleratorProfiles = initialState.acceleratorProfiles.filter(
    (ac) => ac.spec.enabled,
  );

  const formatOption = (cr: AcceleratorProfileKind): SimpleSelectOption => {
    const displayName = `${cr.spec.displayName}${!cr.spec.enabled ? ' (disabled)' : ''}`;

    return {
      key: cr.metadata.name,
      label: displayName,
      description: cr.spec.description,
      dropdownLabel: (
        <Split>
          <SplitItem>{displayName}</SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            {isAcceleratorProfileSupported(cr) && (
              <Label color="blue">{`Compatible with ${resourceDisplayName}`}</Label>
            )}
          </SplitItem>
        </Split>
      ),
    };
  };

  const options: SimpleSelectOption[] = enabledAcceleratorProfiles
    .toSorted((a, b) => {
      const aSupported = isAcceleratorProfileSupported(a);
      const bSupported = isAcceleratorProfileSupported(b);
      if (aSupported && !bSupported) {
        return -1;
      }
      if (!aSupported && bSupported) {
        return 1;
      }
      return 0;
    })
    .map((ac) => formatOption(ac));

  let acceleratorAlertMessage: { title: string; variant: AlertVariant } | null = null;
  if (formData.profile && compatibleIdentifiers !== undefined) {
    if (compatibleIdentifiers.length === 0) {
      acceleratorAlertMessage = {
        title: `The ${resourceDisplayName} you have selected doesn't support the selected accelerator. It is recommended to use a compatible ${resourceDisplayName} for optimal performance.`,
        variant: AlertVariant.info,
      };
    } else if (!isAcceleratorProfileSupported(formData.profile)) {
      acceleratorAlertMessage = {
        title: `The ${resourceDisplayName} you have selected is not compatible with the selected accelerator`,
        variant: AlertVariant.warning,
      };
    }
  }

  // add none option
  options.push({
    key: 'none',
    label: 'None',
  });

  if (initialState.unknownProfileDetected) {
    options.push({
      key: 'use-existing',
      label: 'Existing settings',
      description: 'Use the existing accelerator settings from the notebook server',
    });
  } else if (formData.profile && !formData.profile.spec.enabled) {
    options.push(formatOption(formData.profile));
  }

  // if there is more than a none option, show the dropdown
  if (options.length === 1) {
    return null;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup
          label="Accelerator"
          fieldId="modal-notebook-accelerator"
          isRequired={isRequired}
          labelHelp={
            infoContent ? (
              <Popover bodyContent={<div>{infoContent}</div>}>
                <Icon aria-label="Accelerator info" role="button">
                  <OutlinedQuestionCircleIcon />
                </Icon>
              </Popover>
            ) : undefined
          }
        >
          <SimpleSelect
            isFullWidth
            options={options}
            value={
              formData.useExistingSettings
                ? 'use-existing'
                : formData.profile?.metadata.name ?? 'none'
            }
            onChange={(key) => {
              if (key === 'none') {
                // none
                setFormData('useExistingSettings', false);
                setFormData('profile', undefined);
                setFormData('count', 0);
              } else if (key === 'use-existing') {
                // use existing settings
                setFormData('useExistingSettings', true);
                setFormData('profile', undefined);
                setFormData('count', 0);
              } else {
                // normal flow
                setFormData('count', 1);
                setFormData('useExistingSettings', false);
                setFormData(
                  'profile',
                  initialState.acceleratorProfiles.find((ac) => ac.metadata.name === key),
                );
              }
            }}
            dataTestId="accelerator-profile-select"
          />
        </FormGroup>
      </StackItem>
      {acceleratorAlertMessage && (
        <StackItem>
          <Alert
            isInline
            isPlain
            variant={acceleratorAlertMessage.variant}
            title={acceleratorAlertMessage.title}
          />
        </StackItem>
      )}
      {formData.profile && (
        <StackItem>
          <FormGroup label="Number of accelerators" fieldId="number-of-accelerators">
            <InputGroup>
              <NumberInputWrapper
                inputAriaLabel="Number of accelerators"
                id="number-of-accelerators"
                name="number-of-accelerators"
                value={formData.count}
                validated={acceleratorCountWarning ? 'warning' : 'default'}
                min={1}
                max={999}
                onChange={(value) => {
                  const newSize = Number(value);
                  setFormData('count', Math.max(Math.min(newSize, 999), 1));
                }}
              />
            </InputGroup>
          </FormGroup>
        </StackItem>
      )}
      {acceleratorCountWarning && (
        <StackItem>
          <Alert isInline isPlain variant="warning" title={acceleratorCountWarning} />
        </StackItem>
      )}
    </Stack>
  );
};

export default AcceleratorProfileSelectField;
