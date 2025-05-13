import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, User, MoreVertical, Trash } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [localRefresh, setLocalRefresh] = useState(0);

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
        // if (process.env.NODE_ENV === 'development') {
        //   setDoctors([
        //     { id: '1', name: 'Dr. Sarah Johnson', specialty: 'Cardiology', lastVisit: '2025-03-15' },
        //     { id: '2', name: 'Dr. Michael Chen', specialty: 'Dermatology', lastVisit: '2025-01-22' },
        //     { id: '3', name: 'Dr. Emily Wilson', specialty: 'Neurology', lastVisit: '2024-11-05' },
        //   ]);
        // }
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorVisits();
  }, [user, refreshTrigger, localRefresh]);

  const deleteVisit = async (visitId: string) => {
    if (!user) return;
    
    const email = user.emailAddresses[0]?.emailAddress;
    const userId = user.id;

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/visits/${visitId}?clerk_user_id=${encodeURIComponent(userId)}&email=${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 204) {
        console.log('Visit deleted successfully');
        setLocalRefresh(prev => prev + 1); // Trigger a refresh
      } else {
        const error = await response.json();
        throw new Error(error.detail);
      }
    } catch (error) {
      console.error('Error deleting visit:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

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
                <div key={doctor.id} className="relative flex items-center">
                  <Button
                    variant={selectedDoctorId === doctor.id ? "blueButton" : "blueButtonGhost"}
                    className="w-full justify-start text-left h-full pr-10"
                    onClick={() => onDoctorSelect(doctor)}
                  >
                    <div>
                      <p className="font-medium">{doctor.name}</p>
                      {doctor.specialty && (
                        <p className="text-xs text-gray-500">{doctor.specialty}</p>
                      )}
                      {doctor.lastVisit && (
                        <p className="text-xs text-gray-500">
                          Last visit: {new Date(doctor.lastVisit).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 absolute right-2"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-600 cursor-pointer"
                        onClick={() => deleteVisit(doctor.id)}
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}