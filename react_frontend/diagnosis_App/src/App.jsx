import React, { useState } from 'react';
import Form from './Form';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    allergies: '',
    symptoms: ['', '', ''], // Initial three symptoms
  });

  const [formErrors, setFormErrors] = useState({
    name: '',
    age: '',
    allergies: '',
    symptoms: ['', '', ''],
  });

  const [apiResponse, setApiResponse] = useState(null); // State to store API response

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (value) {
      setFormErrors((prevErrors) => ({
        ...prevErrors,
        [name]: '',
      }));
    }
  };

  // Handle symptoms change dynamically
  const handleSymptomChange = (index, value) => {
    const updatedSymptoms = [...formData.symptoms];
    updatedSymptoms[index] = value;

    setFormData({
      ...formData,
      symptoms: updatedSymptoms,
    });

    if (value) {
      const updatedErrors = [...formErrors.symptoms];
      updatedErrors[index] = '';
      setFormErrors({ ...formErrors, symptoms: updatedErrors });
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = { ...formErrors };

    // Validate required fields
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.age) errors.age = 'Age is required';
    if (!formData.allergies) errors.allergies = 'Allergies are required';
    formData.symptoms.forEach((symptom, index) => {
      if (!symptom) errors.symptoms[index] = `Symptom ${index + 1} is required`;
    });

    setFormErrors(errors);

    // If no errors, submit the form
    if (!Object.values(errors).includes('')) {
      try {
        // Send data to FastAPI backend
        const response = await fetch('http://127.0.0.1:8000/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            age: formData.age,
            symptoms: formData.symptoms.filter((symptom) => symptom.trim() !== ''), // Filter out empty symptoms
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setApiResponse(data); // Store API response in state
      } catch (error) {
        console.error('Error submitting form:', error);
        setApiResponse({ error: 'Failed to fetch data from the API.' });
      }
    }
  };

  return (
    <div className="App">
      <h1>Patient Information Form</h1>
      <Form
        formData={formData}
        formErrors={formErrors}
        handleChange={handleChange}
        handleSymptomChange={handleSymptomChange}
        handleSubmit={handleSubmit}
      />

      {/* Display API response */}
      {apiResponse && (
        <div className="api-response">
          <h2>API Response:</h2>
          <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;