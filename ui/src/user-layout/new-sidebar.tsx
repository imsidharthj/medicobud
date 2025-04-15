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
}

interface DoctorSidebarProps {
  onDoctorSelect: (doctor: Doctor) => void;
  onAddDoctor: () => void;
  selectedDoctorId: string | undefined;
}

export function DoctorSidebar({ onDoctorSelect, onAddDoctor, selectedDoctorId }: DoctorSidebarProps) {
  const { user } = useUser();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        // In a real application, you would fetch this from your API
        // For now, we'll use mock data
        const mockDoctors: Doctor[] = [
          { id: '1', name: 'Dr. Sarah Johnson', specialty: 'Cardiology', lastVisit: '2025-03-15' },
          { id: '2', name: 'Dr. Michael Chen', specialty: 'Dermatology', lastVisit: '2025-01-22' },
          { id: '3', name: 'Dr. Emily Wilson', specialty: 'Neurology', lastVisit: '2024-11-05' },
        ];
        
        setDoctors(mockDoctors);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [user]);

  return (
    <div className="h-screen w-72 border-l border-gray-200 bg-white shadow-lg">
      <div className="px-4 py-6">
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
                  variant={selectedDoctorId === doctor.id ? "blueButton" : "ghost"}
                  className="w-full justify-start text-left h-full"
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
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}