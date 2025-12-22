import { Autocomplete, FilterOptionsState, TextField, TextFieldProps, Typography } from "@mui/material";
import { Stack } from "@mui/system";
import { ReactNode, useMemo } from "react";

export type SearchableOption<T> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
  adornment?: ReactNode;
};

type SearchableSelectProps<T> = {
  label: string;
  options: SearchableOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  size?: "small" | "medium";
  textFieldProps?: Partial<TextFieldProps>;
  noOptionsText?: ReactNode;
};

export function SearchableSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  helperText,
  size = "medium",
  textFieldProps,
  noOptionsText,
}: SearchableSelectProps<T>) {
  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  const filterOptions = (opts: SearchableOption<T>[], state: FilterOptionsState<SearchableOption<T>>) => {
    const search = state.inputValue.trim().toLowerCase();
    if (!search) return opts;
    return opts.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  };

  return (
    <Autocomplete
      fullWidth
      options={options}
      value={selectedOption}
      filterOptions={filterOptions}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, val) => option.value === val.value}
      onChange={(_, newValue) => onChange(newValue?.value ?? null)}
      disableClearable={required}
      disabled={disabled}
      noOptionsText={noOptionsText ?? "Sin resultados"}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={placeholder}
          helperText={helperText}
          size={size}
          {...textFieldProps}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
            {option.adornment}
            <Stack spacing={0.3}>
              <Typography>{option.label}</Typography>
              {option.description && (
                <Typography variant="caption" color="text.secondary">
                  {option.description}
                </Typography>
              )}
            </Stack>
          </Stack>
        </li>
      )}
      getOptionDisabled={(option) => Boolean(option.disabled)}
      clearText="Limpiar"
      closeText="Cerrar"
      openText="Abrir"
      autoHighlight
    />
  );
}
