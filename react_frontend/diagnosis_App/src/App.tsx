import React, { useState } from 'react';
import Form from './Form';
import Response from './Response';

function App() {
  // State for form data
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [symptoms, setSymptoms] = useState(['', '', '']);
  const [allergies, setAllergies] = useState(''); // Dummy field
  const [apiResponse, setApiResponse] = useState<any>(null); // API response
  const [formErrors, setFormErrors] = useState({
    name: '',
    age: '',
    symptoms: ['', '', ''],
    allergies: '', // Dummy field
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const errors = {
      name: '',
      age: '',
      symptoms: ['', '', ''],
      allergies: '', // Dummy field
    };

    if (!name) errors.name = 'Name is required';
    if (!age) errors.age = 'Age is required';
    symptoms.forEach((symptom, index) => {
      if (!symptom) {
        errors.symptoms[index] = `Symptom ${index + 1} is required`;
      }
    });

    if (errors.name || errors.age || errors.symptoms.some((error) => error)) {
      setFormErrors(errors);
      return;
    }

    try {
      console.log('Making API request...');
      const response = await fetch('http://127.0.0.1:8000/diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          age: parseInt(age, 10),
          symptoms: symptoms.filter((symptom) => symptom.trim() !== ''),
          // Do not include allergies in the API request
        }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      setApiResponse(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setApiResponse({ error: 'Failed to fetch data from the API.' });
    }
  };

  return (
    <div className="App" style={{ display: 'flex', textAlign: 'left', gap: '100px' }}>
      {/* Form */}
      <div style={{ flex: 6 }}>
        <h1>Patient Information Form</h1>
        <Form
          name={name}
          age={age}
          allergies={allergies}
          symptoms={symptoms}
          formErrors={formErrors}
          setName={setName}
          setAge={setAge}
          setAllergies={setAllergies}
          setSymptoms={setSymptoms}
          handleSubmit={handleSubmit}
        />
      </div>

      {/* Display API response */}
      <div style={{ flex: 3, textAlign: 'right', marginRight: '-400px' }}>
        {apiResponse && (
          <div className="api-response">
            <h2>API Response:</h2>
            <Response response={apiResponse} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;