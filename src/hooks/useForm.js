import { useState } from 'react';

export function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({
      ...values,
      [name]: value,
    });
    // clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate ? validate(values) : {};
    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.paymentStatus) {
        import('react-hot-toast').then(toast => toast.default.error(validationErrors.paymentStatus));
      }
      setErrors(validationErrors);
      return;
    }
    onSubmit(values);
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
  };

  return { values, errors, handleChange, handleSubmit, resetForm, setValues };
}
