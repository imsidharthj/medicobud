import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, User } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

interface Doctor {
  id: string;
  name: string;
  specialty?: string;
  lastVisit?: string;
  facilityName?: string;
}

interface DoctorApiResponse {
  id: number;
  doctor_name: string;
  notes?: string;
  visit_date: string;
  facility_name: string;
}

interface DoctorSidebarProps {
  onDoctorSelect: (doctor: Doctor) => void;
  onAddDoctor: () => void;
  selectedDoctorId: string | undefined;
  refreshTrigger?: number;
}

export function DoctorSidebar({ onDoctorSelect, onAddDoctor, selectedDoctorId, refreshTrigger = 0 }: DoctorSidebarProps) {
  const { user } = useUser();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctorVisits = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);
        
        const email = user.emailAddresses[0]?.emailAddress;
        const userId = user.id;
        
        if (!email || !userId) {
          throw new Error("User email or ID not available");
        }

        const response = await fetch(
          `http://127.0.0.1:8000/visits/?clerk_user_id=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching doctor visits: ${response.status}`);
        }

        const visits: DoctorApiResponse[] = await response.json();
        
        const doctorVisits: Doctor[] = visits.map(visit => ({
          id: visit.id.toString(),
          name: visit.doctor_name,
          specialty: visit.notes || undefined,
          lastVisit: visit.visit_date,
          facilityName: visit.facility_name
        }));
        
        setDoctors(doctorVisits);
      } catch (error) {
        console.error('Error fetching doctor visits:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
        if (process.env.NODE_ENV === 'development') {
          setDoctors([
            { id: '1', name: 'Dr. Sarah Johnson', specialty: 'Cardiology', lastVisit: '2025-03-15' },
            { id: '2', name: 'Dr. Michael Chen', specialty: 'Dermatology', lastVisit: '2025-01-22' },
            { id: '3', name: 'Dr. Emily Wilson', specialty: 'Neurology', lastVisit: '2024-11-05' },
          ]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorVisits();
  }, [user, refreshTrigger]);

  return (
    <div className="h-screen w-72 border-l border-gray-200 bg-white shadow-lg">
      <div className="px-4 py-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Doctors</h2>
          <Button
            variant="blueButton"
            size="sm"
            className="flex items-center gap-1"
            onClick={onAddDoctor}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        <Button
          variant="blueButton"
          className="w-full mb-4 flex items-center justify-center gap-2"
          onClick={onAddDoctor}
        >
          <User className="h-4 w-4" />
          All Doctors
        </Button>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-5">
              {doctors.map((doctor) => (
                <Button
                  key={doctor.id}
                  variant={
                    selectedDoctorId === doctor.id ? "blueButton" : "ghost"
                  }
                  className="w-full justify-start text-left h-full"
                  onClick={() => onDoctorSelect(doctor)}
                >
                  <div>
                    <p className="font-medium">{doctor.name}</p>
                    {doctor.specialty && (
                      <p className="text-xs text-gray-500">
                        {doctor.specialty}
                      </p>
                    )}
                    {doctor.lastVisit && (
                      <p className="text-xs text-gray-500">
                        Last visit:{" "}
                        {new Date(doctor.lastVisit).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}