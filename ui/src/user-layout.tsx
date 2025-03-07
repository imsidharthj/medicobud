// import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Correct import
// import Form from './Form';
import { Sidebar } from './components/sidebar';
import MedicalForm from './form/form-wizard';

function UserLayout() {
  // const [name, setName] = useState('');
  // const [age, setAge] = useState('');
  // const [symptoms, setSymptoms] = useState<string[]>([]);
  // const [allergies, setAllergies] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleSubmit = async (data: {
    name: string;
    age: string;
    symptoms: string[];
    allergies?: string[];
  }) => {
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
      navigate('/response', { state: { response: {...responseData, status: response.status } } }); // Redirect to response page
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1">
          <div className="mx-auto max-w-3xl">
            {/* <h1 className="text-3xl font-bold text-[#1576d1] mb-6">Patient Information Form</h1> */}
            {/* <Form
              name={name}
              age={age}
              allergies={allergies}
              symptoms={symptoms}
              setName={setName}
              setAge={setAge}
              setAllergies={setAllergies}
              setSymptoms={setSymptoms}
              handleSubmit={handleSubmit}
            /> */}
          </div>
          <div>
            <MedicalForm handleFormSubmit={handleSubmit} />
          </div>
      </main>
    </div>
  );
}

export default UserLayout;