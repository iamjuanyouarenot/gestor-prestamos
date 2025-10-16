# TODO: Add "Fin de mes" Payment Type and Enforce dd/mm/yyyy Date Format

- [x] Add "Fin de mes" option to paymentType select in add-loan-form.tsx
- [x] Modify endDate calculation useEffect to handle "end_of_month" payments at month-end
- [x] Change startDate and endDate inputs to type="text" with "dd/mm/yyyy" placeholder
- [x] Add date format validation in handleChange for dd/mm/yyyy format
- [x] Update endDate setting to format dates as dd/mm/yyyy
- [x] Conditionally hide paymentFrequency input for "end_of_month"
- [x] Update handleSubmit to parse dd/mm/yyyy dates, build paymentType string for "end_of_month", and adjust validations
- [x] Test the changes to ensure correct functionality
