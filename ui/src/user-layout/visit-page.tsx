import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, FileText, Calendar } from 'lucide-react';
import NewMedicalForm from '@/form/diagnosis-form';

interface Session {
  id: string;
  date: string;
  symptoms: {
    name: string;
    imageUrl?: string;
  }[];
  diagnosis?: string;
  notes?: string;
}

interface Report {
  id: string;
  name: string;
  date: string;
  type: string;
}

interface DoctorViewProps {
  doctor: {
    id: string;
    name: string;
    specialty?: string;
  };
}

export default function DoctorView({ doctor }: DoctorViewProps) {
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: '1',
      date: '2025-03-15',
      symptoms: [
        { name: 'Headache' },
        { name: 'Fatigue', imageUrl: '/placeholder-symptom.jpg' },
      ],
      diagnosis: 'Migraine',
      notes: 'Recommend rest and hydration',
    },
    {
      id: '2',
      date: '2024-11-05',
      symptoms: [
        { name: 'Cough' },
        { name: 'Fever' },
      ],
      diagnosis: 'Common Cold',
      notes: 'Prescribed cold medicine',
    },
  ]);

  const [reports, setReports] = useState<Report[]>([
    {
      id: '1',
      name: 'Blood Test',
      date: '2025-03-10',
      type: 'PDF',
    },
    {
      id: '2',
      name: 'X-Ray Results',
      date: '2024-11-01',
      type: 'Image',
    },
  ]);

  const [showNewSymptomForm, setShowNewSymptomForm] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{doctor.name}</h1>
          {doctor.specialty && <p className="text-gray-500">{doctor.specialty}</p>}
        </div>
        <Button 
          onClick={() => setShowNewSymptomForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center gap-2 variant-blue">
            <Calendar className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Lab Reports
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="sessions" className="space-y-4 mt-4">
          {showNewSymptomForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Add New Symptom Session</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Symptoms</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input type="text" placeholder="Enter symptom" className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                        <Button type="button" variant="outline" size="sm" className="flex items-center gap-1">
                          <Upload className="h-4 w-4" />
                          Upload
                        </Button>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="flex items-center gap-1 w-full">
                        <Plus className="h-4 w-4" />
                        Add Another Symptom
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Save Session</Button>
                    <Button type="button" variant="outline" onClick={() => setShowNewSymptomForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <CardTitle>Session: {new Date(session.date).toLocaleDateString()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium">Symptoms:</h3>
                        <ul className="list-disc list-inside">
                          {session.symptoms.map((symptom, index) => (
                            <li key={index} className="flex items-center gap-2">
                              {symptom.name}
                              {symptom.imageUrl && (
                                <Button variant="ghost" size="sm" className="text-blue-500 p-0 h-auto">
                                  View Image
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {session.diagnosis && (
                        <div>
                          <h3 className="font-medium">Diagnosis:</h3>
                          <p>{session.diagnosis}</p>
                        </div>
                      )}
                      
                      {session.notes && (
                        <div>
                          <h3 className="font-medium">Notes:</h3>
                          <p>{session.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4 mt-4">
          {showNewReportForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Add Lab Report</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Report Name</label>
                    <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Upload Report</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                            <span>Upload a file</span>
                            <input type="file" className="sr-only" />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Save Report</Button>
                    <Button type="button" variant="outline" onClick={() => setShowNewReportForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Lab Reports</h3>
                <Button 
                  onClick={() => setShowNewReportForm(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Report
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <p className="text-sm text-gray-500">{new Date(report.date).toLocaleDateString()}</p>
                        </div>
                        <Button>View {report.type}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}