import { useState, useEffect } from 'react';
import { Sidebar } from './components/sidebar';
import { DoctorSidebar } from './user-layout/new-sidebar';
import { useUser } from '@clerk/clerk-react';
import NewMedicalForm from './form/diagnosis-form';
import LaboratoryReportForm from './form/LabReport-form';
import VisitPage from './user-layout/visit-page';
import PersonalInformationPage from "@/user-profile/personal-information";
import { AddDoctorForm } from './form/add-doctor-form';
import { Toaster } from 'sonner';
import SymptomSessionModal from './user-layout/popup';

function UserLayout() {
  const { user } = useUser();
  const [showDoctorSidebar, setShowDoctorSidebar] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<null | { id: string; doctorName: string; visitDate: string; }>(null);
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [activeView, setActiveView] = useState<'doctor' | 'personal'>('doctor');
  const [refreshDocterList, setRefreshDoctorList] = useState(0);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | undefined>(undefined);

  const handleAddDoctorFormSubmit = async (data: {
    name: string;
    specialty: string;
    location: string;
    contactNumber: string;
  }) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/visits/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerk_user_id: user?.id,
          email: user?.emailAddresses[0].emailAddress,
          visit_date: new Date().toISOString().split('T')[0],
          doctor_name: data.name,
          facility_name: data.location,
          notes: data.specialty
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Doctor visit added successfully:', responseData);
      setShowAddDoctorForm(false);
      setSelectedVisit({ 
        id: responseData.id.toString(), 
        doctorName: data.name,
        visitDate: responseData.visit_date
      });

      setRefreshDoctorList(prev => prev + 1);
    } catch (error) {
      console.error('Error adding doctor visit:', error);
      alert('Error adding doctor visit. Please try again.');
    }
  };

  const handleSubmit = async (data: {
    date: string;
    symptoms: string[];
    images: string[];
  }) => {
    if (!selectedVisit || !selectedVisit.id) {
      alert("Please select a doctor visit first");
      return;
    }

    setSessionLoading(true);
    setSessionError(undefined);

    try {
      let symptomImageUrl = null;
      if (data.images && data.images.length > 0) {
        symptomImageUrl = data.images[0];
      }

      const response = await fetch(`http://127.0.0.1:8000/visits/${selectedVisit?.id}/symptoms/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_date: data.date || new Date().toISOString(),
          symptoms: data.symptoms.filter((symptom: string) => symptom.trim() !== ''),
          symptom_image_url: symptomImageUrl,
          notes: null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseData = await response.json();
      
      setSessionData(responseData);
      setModalOpen(true);
      
      if (selectedVisit?.id) {
        fetchSymptomSessions()
          .catch(error => {
            console.error("Error refreshing symptom sessions:", error);
          });
      }
      
      return responseData;
    } catch (error) {
      console.error('Error submitting symptoms:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving symptoms. Please try again.';
      setSessionError(errorMessage);
      setModalOpen(true);
      return null;
    } finally {
      setSessionLoading(false);
    }
  };

  const handleLabReportSubmit = async (data: {
    reportName: string;
    doctorId?: string;
    doctorName?: string; 
    reportDate: Date;
    reportType: string;
    notes?: string;
    file?: File;
  }) => {
    if (!selectedVisit || !selectedVisit.id) {
      alert('Please select a doctor visit first');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('report_name', data.reportName);
      formData.append('report_type', data.reportType);
      formData.append('report_date', data.reportDate.toISOString().split('T')[0]);
      if (data.notes) formData.append('notes', data.notes);
      if (data.doctorId) formData.append('doctor_id', data.doctorId);
      if (data.doctorName) formData.append('doctor_name', data.doctorName);
      if (data.file) formData.append('file', data.file);
      
      const response = await fetch(`http://127.0.0.1:8000/visits/${selectedVisit.id}/lab-reports/`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const responseData = await response.json();
      
      setLabReports(prevReports => [responseData, ...prevReports]);
      
      setSelectedReport(responseData);
      
      alert('Lab report saved successfully!');
    } catch (error) {
      console.error('Error submitting lab report:', error);
      alert('Error saving lab report. Please try again.');
    }
  };

  const deleteLabReport = async (reportId: string) => {
    if (!selectedVisit?.id || !reportId) {
      alert('Cannot delete report - missing visit ID or report ID');
      return;
    }
    
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/visits/${selectedVisit.id}/lab-reports/${reportId}`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      setLabReports(prevReports => prevReports.filter(report => report.id !== reportId));
      
      if (selectedReport && selectedReport.id === reportId) {
        setSelectedReport(null);
      }
      
      alert('Lab report deleted successfully!');
    } catch (error) {
      console.error('Error deleting lab report:', error);
      alert('Error deleting lab report. Please try again.');
    }
  };

  const fetchSymptomSessions = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/visits/${selectedVisit?.id}/symptoms/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching symptom sessions:', error);
      throw error;
    }
  };

  const fetchSessionDetails = async (visitId?: string, sessionId?: string): Promise<any> => {
    try {
      const effectiveVisitId = visitId || selectedVisit?.id;
      
      if (!effectiveVisitId || !sessionId) {
        throw new Error("Missing visit ID or session ID");
      }
      
      const response = await fetch(`http://127.0.0.1:8000/visits/${effectiveVisitId}/symptoms/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching session details:', error);
      throw error;
    }
  };

  const fetchLabReports = async () => {
    if (!selectedVisit?.id) {
      return [];
    }
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/visits/${selectedVisit.id}/lab-reports/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setLabReports(data);
      return data;
    } catch (error) {
      console.error('Error fetching lab reports:', error);
      throw error;
    }
  };

  const fetchReportDetails = async (reportId: string) => {
    if (!selectedVisit?.id || !reportId) {
      throw new Error("Missing visit ID or report ID");
    }
    
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/visits/${selectedVisit.id}/lab-reports/${reportId}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching lab report details:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (selectedVisit?.id) {
      fetchLabReports();
    } else {
      setLabReports([]);
      setSelectedReport(null);
    }
  }, [selectedVisit?.id]);

  const handleLibraryClick = () => {
    setShowDoctorSidebar(true);
    setActiveView('doctor');
  };

  const handlePersonalInfoClick = () => {
    setShowDoctorSidebar(false);
    setActiveView('personal');
    setSelectedVisit(null);
  };

  useEffect(() => {
    handleLibraryClick();
  }, []); 

  const handleDoctorSelect = (doctor: { id: string; name: string, visit_date?: string }) => {
    setSelectedVisit({
      id: doctor.id, 
      doctorName: doctor.name, 
      visitDate: doctor.visit_date || new Date().toISOString().split('T')[0]
    });
    setShowAddDoctorForm(false);
  };

  const handleAddDoctor = () => {
    setSelectedVisit(null);
    setShowAddDoctorForm(true);
  };

  const adaptSessionData = (data: any) => {
    if (!data) return null;
    
    return {
      session_date: data.session_date || new Date().toISOString(),
      symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
      diagnosis: data.diagnosis || [],
      notes: data.notes || '',
      symptom_image_url: data.symptom_image_url || ''
    };
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Toaster />
      <Sidebar 
        onLibraryClick={handleLibraryClick} 
        onPersonalInfoClick={handlePersonalInfoClick}
        activeView={activeView}
      />
      
      <main className="flex-1 flex">
        {showDoctorSidebar && (
          <DoctorSidebar 
            onDoctorSelect={handleDoctorSelect}
            onAddDoctor={handleAddDoctor}
            selectedDoctorId={selectedVisit?.id}
            refreshTrigger={refreshDocterList}
          />
        )}
        
        <div className="flex-1 overflow-auto">
          {activeView === 'personal' ? (
            <div className="mx-auto p-6">
              <PersonalInformationPage />
            </div>
          ) : (
            <div className="p-6">
              {selectedVisit ? (
                <VisitPage 
                  doctor={{
                    id: selectedVisit.id,
                    name: selectedVisit.doctorName,
                  }}
                  visitId={selectedVisit.id}
                  SessionFormComponent={NewMedicalForm}
                  ReportFormComponent={LaboratoryReportForm}
                  sessionFormProps={{ handleFormSubmit: handleSubmit }}
                  reportFormProps={{ handleFormSubmit: handleLabReportSubmit }}
                  fetchSymptomSessions={fetchSymptomSessions}
                  fetchSessionDetails={fetchSessionDetails}
                  fetchLabReports={fetchLabReports}
                  fetchReportDetails={fetchReportDetails}
                  deleteLabReport={deleteLabReport}
                  labReports={labReports}
                  selectedReport={selectedReport}
                  setSelectedReport={setSelectedReport}
                />
              ) : showAddDoctorForm ? (
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h2 className="text-2xl font-bold mb-4">Add New Doctor</h2>
                  <AddDoctorForm handleSubmit={handleAddDoctorFormSubmit}/>
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
      
      <SymptomSessionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          if (selectedVisit?.id) {
            fetchSymptomSessions().catch(error => {
              console.error("Error refreshing symptom sessions after modal close:", error);
            });
          }
        }}
        sessionData={adaptSessionData(sessionData)}
        loading={sessionLoading}
        error={sessionError}
      />
    </div>
  );
}

export default UserLayout;