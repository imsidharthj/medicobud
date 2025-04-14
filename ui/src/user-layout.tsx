import { useNavigate } from 'react-router-dom';
import { Sidebar } from './components/sidebar';
import { useUser } from '@clerk/clerk-react';
import NewMedicalForm from './form/diagnosis-form';

function UserLayout() {
  const navigate = useNavigate();
  const { user } = useUser();

  const handleSubmit = async (data: {
    symptoms: string[];
  }) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/diagnosis/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: data.symptoms.filter((symptom: string) => symptom.trim() !== ''),
          email: user?.emailAddresses[0].emailAddress,
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const responseData = await response.json();
      navigate('/response', { state: { response: {...responseData, status: response.status } } });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1">
          <div className="mx-auto max-w-3xl">
          </div>
          <div>
            <NewMedicalForm handleFormSubmit={handleSubmit} />
          </div>
      </main>
    </div>
  );
}

export default UserLayout;