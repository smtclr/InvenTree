import { ApiFormFieldSet } from '../components/forms/fields/ApiFormField';

export function dataImporterSessionFields(): ApiFormFieldSet {
  return {
    data_file: {},
    model_type: {},
    field_detauls: {
      hidden: true
    }
  };
}
