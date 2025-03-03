import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Correct import
import Form from './Form';
import { Sidebar } from './components/sidebar';

function UserLayout() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [allergies, setAllergies] = useState('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [formErrors, setFormErrors] = useState({
    name: '',
    age: '',
    symptoms: ['', '', ''],
    allergies: '',
  });
  const navigate = useNavigate();

  const handleSubmit = async (data: {
    name: string;
    age: string;
    symptoms: string[];
    allergies?: string;
  }) => {
    const errors = {
      name: data.name ? '' : 'Name is required',
      age: data.age ? '' : 'Age is required',
      symptoms: data.symptoms.length > 0 ? '' : 'At least one symptom is required',
      allergies: '',
    };
  
    // if (!data.name) errors.name = 'Name is required';
    // if (!data.age) errors.age = 'Age is required';
    // if (data.symptoms.length === 0) errors.symptoms = 'At least one symptom is required';
  
    if (errors.name || errors.age || errors.symptoms) {
      setFormErrors({
        name: errors.name,
        age: errors.age,
        symptoms: [errors.symptoms],
        allergies: errors.allergies,
      });
      return;
    }
  
    try {
      const response = await fetch('http://127.0.0.1:8000/diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          age: parseInt(data.age, 10),
          symptoms: data.symptoms.filter((symptom: string) => symptom.trim() !== ''),
          // allergies: data.allergies || '',
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const responseData = await response.json();
      setApiResponse(responseData);
      navigate('/response', { state: { response: responseData } }); // Redirect to response page
    } catch (error) {
      console.error('Error fetching data:', error);
      setApiResponse({ error: 'Failed to fetch data from the API.' });
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 p-8">
        {/* <div className="flex gap-8"> */}
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-bold text-[#1576d1] mb-6">Patient Information Form</h1>
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
        {/* </div> */}
      </main>
    </div>
  );
}

export default UserLayout;