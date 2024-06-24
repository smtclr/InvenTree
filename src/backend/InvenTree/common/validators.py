"""Validation helpers for common models."""

import re

from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from common.settings import get_global_setting


def attachment_model_types():
    """Return a list of valid attachment model choices."""
    import InvenTree.models

    return list(
        InvenTree.helpers_model.getModelsWithMixin(
            InvenTree.models.InvenTreeAttachmentMixin
        )
    )


def attachment_model_options():
    """Return a list of options for models which support attachments."""
    return [
        (model.__name__.lower(), model._meta.verbose_name)
        for model in attachment_model_types()
    ]


def attachment_model_class_from_label(label: str):
    """Return the model class for the given label."""
    for model in attachment_model_types():
        if model.__name__.lower() == label.lower():
            return model

    raise ValueError(f'Invalid attachment model label: {label}')


def validate_attachment_model_type(value):
    """Ensure that the provided attachment model is valid."""
    model_names = [el[0] for el in attachment_model_options()]
    if value not in model_names:
        raise ValidationError(f'Model type does not support attachments')


def validate_notes_model_type(value):
    """Ensure that the provided model type is valid.

    The provided value must map to a model which implements the 'InvenTreeNotesMixin'.
    """
    import InvenTree.helpers_model
    import InvenTree.models

    if not value:
        # Empty values are allowed
        return

    model_types = list(
        InvenTree.helpers_model.getModelsWithMixin(InvenTree.models.InvenTreeNotesMixin)
    )

    model_names = [model.__name__.lower() for model in model_types]

    if value.lower() not in model_names:
        raise ValidationError(f"Invalid model type '{value}'")


def validate_decimal_places_min(value):
    """Validator for PRICING_DECIMAL_PLACES_MIN setting."""
    try:
        value = int(value)
        places_max = int(get_global_setting('PRICING_DECIMAL_PLACES', create=False))
    except Exception:
        return

    if value > places_max:
        raise ValidationError(_('Minimum places cannot be greater than maximum places'))


def validate_decimal_places_max(value):
    """Validator for PRICING_DECIMAL_PLACES_MAX setting."""
    try:
        value = int(value)
        places_min = int(get_global_setting('PRICING_DECIMAL_PLACES_MIN', create=False))
    except Exception:
        return

    if value < places_min:
        raise ValidationError(_('Maximum places cannot be less than minimum places'))


def validate_email_domains(setting):
    """Validate the email domains setting."""
    if not setting.value:
        return

    domains = setting.value.split(',')
    for domain in domains:
        if not domain:
            raise ValidationError(_('An empty domain is not allowed.'))
        if not re.match(r'^@[a-zA-Z0-9\.\-_]+$', domain):
            raise ValidationError(_(f'Invalid domain name: {domain}'))
