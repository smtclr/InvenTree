import { t } from '@lingui/macro';
import {
  Alert,
  FileInput,
  NumberInput,
  Stack,
  Switch,
  TextInput
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useId } from '@mantine/hooks';
import { IconX } from '@tabler/icons-react';
import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { Control, FieldValues, useController } from 'react-hook-form';

import { ModelType } from '../../../enums/ModelType';
import { isTrue } from '../../../functions/conversion';
import { ChoiceField } from './ChoiceField';
import DateField from './DateField';
import { DependentField } from './DependentField';
import { NestedObjectField } from './NestedObjectField';
import { RelatedModelField } from './RelatedModelField';
import { TableField } from './TableField';

export type ApiFormData = UseFormReturnType<Record<string, unknown>>;

export type ApiFormAdjustFilterType = {
  filters: any;
  data: FieldValues;
};

/** Definition of the ApiForm field component.
 * - The 'name' attribute *must* be provided
 * - All other attributes are optional, and may be provided by the API
 * - However, they can be overridden by the user
 *
 * @param name : The name of the field
 * @param label : The label to display for the field
 * @param value : The value of the field
 * @param default : The default value of the field
 * @param icon : An icon to display next to the field
 * @param field_type : The type of field to render
 * @param api_url : The API endpoint to fetch data from (for related fields)
 * @param pk_field : The primary key field for the related field (default = "pk")
 * @param model : The model to use for related fields
 * @param filters : Optional API filters to apply to related fields
 * @param required : Whether the field is required
 * @param hidden : Whether the field is hidden
 * @param disabled : Whether the field is disabled
 * @param placeholder : The placeholder text to display
 * @param description : The description to display for the field
 * @param preFieldContent : Content to render before the field
 * @param postFieldContent : Content to render after the field
 * @param onValueChange : Callback function to call when the field value changes
 * @param adjustFilters : Callback function to adjust the filters for a related field before a query is made
 * @param adjustValue : Callback function to adjust the value of the field before it is sent to the API
 */
export type ApiFormFieldType = {
  label?: string;
  value?: any;
  default?: any;
  icon?: ReactNode;
  field_type?:
    | 'related field'
    | 'email'
    | 'url'
    | 'string'
    | 'boolean'
    | 'date'
    | 'datetime'
    | 'integer'
    | 'decimal'
    | 'float'
    | 'number'
    | 'choice'
    | 'file upload'
    | 'nested object'
    | 'dependent field'
    | 'table';
  api_url?: string;
  pk_field?: string;
  model?: ModelType;
  modelRenderer?: (instance: any) => ReactNode;
  filters?: any;
  child?: ApiFormFieldType;
  children?: { [key: string]: ApiFormFieldType };
  required?: boolean;
  choices?: any[];
  hidden?: boolean;
  disabled?: boolean;
  read_only?: boolean;
  placeholder?: string;
  description?: string;
  preFieldContent?: JSX.Element;
  postFieldContent?: JSX.Element;
  adjustValue?: (value: any) => any;
  onValueChange?: (value: any, record?: any) => void;
  adjustFilters?: (value: ApiFormAdjustFilterType) => any;
  headers?: string[];
  depends_on?: string[];
};

/**
 * Render an individual form field
 */
export function ApiFormField({
  fieldName,
  definition,
  control,
  hideLabels,
  url,
  setFields
}: {
  fieldName: string;
  definition: ApiFormFieldType;
  control: Control<FieldValues, any>;
  hideLabels?: boolean;
  url?: string;
  setFields?: React.Dispatch<React.SetStateAction<ApiFormFieldSet>>;
}) {
  const fieldId = useId();
  const controller = useController({
    name: fieldName,
    control
  });
  const {
    field,
    fieldState: { error }
  } = controller;
  const { value, ref } = field;

  useEffect(() => {
    if (
      definition.field_type === 'nested object' ||
      definition.field_type === 'dependent field'
    )
      return;

    // hook up the value state to the input field
    if (definition.value !== undefined) {
      field.onChange(definition.value);
    }
  }, [definition.value]);

  const fieldDefinition: ApiFormFieldType = useMemo(() => {
    return {
      ...definition,
      label: hideLabels ? undefined : definition.label,
      description: hideLabels ? undefined : definition.description
    };
  }, [definition]);

  // pull out onValueChange as this can cause strange errors when passing the
  // definition to the input components via spread syntax
  const reducedDefinition = useMemo(() => {
    return {
      ...fieldDefinition,
      onValueChange: undefined,
      adjustFilters: undefined,
      adjustValue: undefined,
      read_only: undefined,
      children: undefined
    };
  }, [fieldDefinition]);

  // Callback helper when form value changes
  const onChange = useCallback(
    (value: any) => {
      // Allow for custom value adjustments (per field)
      if (definition.adjustValue) {
        value = definition.adjustValue(value);
      }

      field.onChange(value);

      // Run custom callback for this field
      definition.onValueChange?.(value);
    },
    [fieldName, definition]
  );

  // Coerce the value to a numerical value
  const numericalValue: number | '' = useMemo(() => {
    let val: number | '' = 0;

    switch (definition.field_type) {
      case 'integer':
        val = parseInt(value) ?? '';
        break;
      case 'decimal':
      case 'float':
      case 'number':
        val = parseFloat(value) ?? '';
        break;
      default:
        break;
    }

    if (isNaN(val) || !isFinite(val)) {
      val = '';
    }

    return val;
  }, [value]);

  // Coerce the value to a (stringified) boolean value
  const booleanValue: boolean = useMemo(() => {
    return isTrue(value);
  }, [value]);

  // Construct the individual field
  function buildField() {
    switch (definition.field_type) {
      case 'related field':
        return (
          <RelatedModelField
            controller={controller}
            definition={fieldDefinition}
            fieldName={fieldName}
          />
        );
      case 'email':
      case 'url':
      case 'string':
        return (
          <TextInput
            {...reducedDefinition}
            ref={field.ref}
            id={fieldId}
            aria-label={`text-field-${field.name}`}
            type={definition.field_type}
            value={value || ''}
            error={error?.message}
            radius="sm"
            onChange={(event) => onChange(event.currentTarget.value)}
            rightSection={
              value && !definition.required ? (
                <IconX size="1rem" color="red" onClick={() => onChange('')} />
              ) : null
            }
          />
        );
      case 'boolean':
        return (
          <Switch
            {...reducedDefinition}
            checked={booleanValue}
            ref={ref}
            id={fieldId}
            aria-label={`boolean-field-${field.name}`}
            radius="lg"
            size="sm"
            error={error?.message}
            onChange={(event) => onChange(event.currentTarget.checked)}
          />
        );
      case 'date':
      case 'datetime':
        return (
          <DateField controller={controller} definition={fieldDefinition} />
        );
      case 'integer':
      case 'decimal':
      case 'float':
      case 'number':
        return (
          <NumberInput
            {...reducedDefinition}
            radius="sm"
            ref={field.ref}
            id={fieldId}
            aria-label={`number-field-${field.name}`}
            value={numericalValue}
            error={error?.message}
            decimalScale={definition.field_type == 'integer' ? 0 : 10}
            onChange={(value: number | string | null) => onChange(value)}
            step={1}
          />
        );
      case 'choice':
        return (
          <ChoiceField
            controller={controller}
            fieldName={fieldName}
            definition={fieldDefinition}
          />
        );
      case 'file upload':
        return (
          <FileInput
            {...reducedDefinition}
            id={fieldId}
            ref={field.ref}
            radius="sm"
            value={value}
            error={error?.message}
            onChange={(payload: File | null) => onChange(payload)}
          />
        );
      case 'nested object':
        return (
          <NestedObjectField
            definition={fieldDefinition}
            fieldName={fieldName}
            control={control}
            url={url}
            setFields={setFields}
          />
        );
      case 'dependent field':
        return (
          <DependentField
            definition={fieldDefinition}
            fieldName={fieldName}
            control={control}
            url={url}
            setFields={setFields}
          />
        );
      case 'table':
        return (
          <TableField
            definition={fieldDefinition}
            fieldName={fieldName}
            control={controller}
          />
        );
      default:
        return (
          <Alert color="red" title={t`Error`}>
            Invalid field type for field '{fieldName}': '
            {fieldDefinition.field_type}'
          </Alert>
        );
    }
  }

  if (definition.hidden) {
    return null;
  }

  return (
    <Stack>
      {definition.preFieldContent}
      {buildField()}
      {definition.postFieldContent}
    </Stack>
  );
}

export type ApiFormFieldSet = Record<string, ApiFormFieldType>;
