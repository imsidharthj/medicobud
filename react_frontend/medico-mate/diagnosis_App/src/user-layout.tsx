import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Correct import
import Form from './Form';
import { Sidebar } from './components/sidebar';

function UserLayout() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [symptoms, setSymptoms] = useState(['', '', '']);
  const [allergies, setAllergies] = useState('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [formErrors, setFormErrors] = useState({
    name: '',
    age: '',
    symptoms: ['', '', ''],
    allergies: '',
  });
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = {
      name: '',
      age: '',
      symptoms: ['', '', ''],
      allergies: '',
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
      const response = await fetch('http://127.0.0.1:8000/diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          age: parseInt(age, 10),
          symptoms: symptoms.filter((symptom) => symptom.trim() !== ''),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setApiResponse(data);
      navigate('/response', { state: { response: data } }); // Redirect to response page
    } catch (error) {
      console.error('Error fetching data:', error);
      setApiResponse({ error: 'Failed to fetch data from the API.' });
    }
  };

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 px-4 pb-24 pt-2 md:px-8">
        <div className="flex gap-8">
          <div className="flex-grow max-w-2xl">
            <h1 className="text-2xl font-bold mb-4">Patient Information Form</h1>
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
        </div>
      </main>
    </div>
  );
}

export default UserLayout;
