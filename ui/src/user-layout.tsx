import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './components/sidebar';
import { DoctorSidebar } from './user-layout/new-sidebar';
import { useUser } from '@clerk/clerk-react';
import NewMedicalForm from './form/diagnosis-form';
import LaboratoryReportForm from './form/LabReport-form';
import VisitPage from './user-layout/visit-page';
import PersonalInformationPage from "@/user-profile/personal-information";
import { AddDoctorForm } from './form/add-doctor-form';
import { Toaster } from 'sonner';

function UserLayout() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [showDoctorSidebar, setShowDoctorSidebar] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<null | { id: string; name: string }>(null);
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [activeView, setActiveView] = useState<'form' | 'doctor' | 'personal'>('form');

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

  const handleLabReportSubmit = async (data: any) => {
    try {
      console.log('Lab report submitted:', data);
      
      const response = await fetch('http://127.0.0.1:8000/api/labreports/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          email: user?.emailAddresses[0].emailAddress,
        }),
      });
      console.log('Response:', response);
      
      alert('Lab report saved successfully!');
    } catch (error) {
      console.error('Error submitting lab report:', error);
      alert('Error saving lab report. Please try again.');
    }
  };

  const handleLibraryClick = () => {
    setShowDoctorSidebar(true);
    setActiveView('doctor');
  };

  const handlePersonalInfoClick = () => {
    setShowDoctorSidebar(false);
    setActiveView('personal');
    setSelectedDoctor(null);
  };

  const handleDiagnosisFormClick = () => {
    setShowDoctorSidebar(false);
    setActiveView('form');
    setSelectedDoctor(null);
  };

  const handleDoctorSelect = (doctor: { id: string; name: string }) => {
    setSelectedDoctor(doctor);
    setShowAddDoctorForm(false);
  };

  const handleAddDoctor = () => {
    setSelectedDoctor(null);
    setShowAddDoctorForm(true);
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Toaster />
      <Sidebar 
        onLibraryClick={handleLibraryClick} 
        onPersonalInfoClick={handlePersonalInfoClick}
        onDiagnosisFormClick={handleDiagnosisFormClick}
        activeView={activeView}
      />
      
      <main className="flex-1 flex">
        {/* Show doctor sidebar on the left when in doctor view */}
        {showDoctorSidebar && (
          <DoctorSidebar 
            onDoctorSelect={handleDoctorSelect}
            onAddDoctor={handleAddDoctor}
            selectedDoctorId={selectedDoctor?.id}
          />
        )}
        
        {/* Main content area - now on the right side */}
        <div className="flex-1 overflow-auto">
          {activeView === 'personal' ? (
            <div className="mx-auto p-6">
              <PersonalInformationPage />
            </div>
          ) : (
            <div className="p-6">
              {selectedDoctor ? (
                <VisitPage 
                  doctor={selectedDoctor}
                  SessionFormComponent={NewMedicalForm}
                  ReportFormComponent={LaboratoryReportForm}
                  sessionFormProps={{ handleFormSubmit: handleSubmit }}
                  reportFormProps={{ handleFormSubmit: handleLabReportSubmit }}
                />
              ) : showAddDoctorForm ? (
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h2 className="text-2xl font-bold mb-4">Add New Doctor</h2>
                  <AddDoctorForm />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Select a doctor from the sidebar or add a new one</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default UserLayout;