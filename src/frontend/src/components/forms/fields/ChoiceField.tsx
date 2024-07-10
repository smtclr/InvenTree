import { Select } from '@mantine/core';
import { useId } from '@mantine/hooks';
import { useCallback, useMemo } from 'react';
import { FieldValues, UseControllerReturn } from 'react-hook-form';

import { ApiFormFieldType } from './ApiFormField';

/**
 * Render a 'select' field for selecting from a list of choices
 */
export function ChoiceField({
  controller,
  definition
}: {
  controller: UseControllerReturn<FieldValues, any>;
  definition: ApiFormFieldType;
  fieldName: string;
}) {
  const fieldId = useId();

  const {
    field,
    fieldState: { error }
  } = controller;

  // Build a set of choices for the field
  const choices: any[] = useMemo(() => {
    let choices = definition.choices ?? [];

    // TODO: Allow provision of custom render function also

    return choices.map((choice) => {
      return {
        value: choice.value.toString(),
        label: choice.display_name ?? choice.value
      };
    });
  }, [definition.choices]);

  // Update form values when the selected value changes
  const onChange = useCallback(
    (value: any) => {
      field.onChange(value);

      // Run custom callback for this field (if provided)
      definition.onValueChange?.(value);
    },
    [field.onChange, definition]
  );

  return (
    <Select
      id={fieldId}
      aria-label={`choice-field-${field.name}`}
      error={error?.message}
      radius="sm"
      {...field}
      onChange={onChange}
      data={choices}
      value={field.value}
      label={definition.label}
      description={definition.description}
      placeholder={definition.placeholder}
      required={definition.required}
      disabled={definition.disabled}
      leftSection={definition.icon}
      comboboxProps={{ withinPortal: true }}
      searchable
    />
  );
}
