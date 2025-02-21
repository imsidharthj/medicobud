import React, { useState } from 'react';
import Form from './Form';
import Response from './Response';
import "./App.css";
// import { Inter } from "next/font/google";
import { Navbar } from "./components/navbar";
import { Sidebar } from "./components/sidebar";
import { Footer } from "./components/footer";
import HomePage from "./Homepage";
import './index.css';
import { useLocation } from 'react-router-dom';

// const inter = Inter({ subsets: ["latin"] });

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
  const [showSymptom, setSoSymptom] = useState(false);
  const lacation = useLocation();
  console.log(lacation, "*********");

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
    <>
    <Navbar />
    <div className="relative min-h-screen flex flex-col">
      <div className="flex">
        <Sidebar />
        {lacation.pathname==="/diagnosis" ? 
          (
            <main className="flex-1 px-4 pb-24 pt-2 md:px-8">
          <div className="flex gap-8">
            {/* Form section */}
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

            {/* Response section */}
            {apiResponse && (
              <div className="w-96">
                <h2 className="text-xl font-semibold mb-4">API Response:</h2>
                <Response response={apiResponse} />
              </div>
            )}
          </div>
        </main>
          )
        : <HomePage/>}
      </div>
      <Footer />
    </div>
    </>
  );
}

export default App;