import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Calendar } from 'lucide-react';

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

interface VisitPageProps {
  doctor: {
    id: string;
    name: string;
    specialty?: string;
  };
  SessionFormComponent?: React.ComponentType<any>;
  ReportFormComponent?: React.ComponentType<any>;
  sessionFormProps?: any;
  reportFormProps?: any;
}

export default function VisitPage({
  doctor,
  SessionFormComponent,
  ReportFormComponent,
  sessionFormProps = {},
  reportFormProps = {}
}: VisitPageProps) {
  const doctors = [doctor]
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  
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

  const handleAddSession = () => {
    setShowNewSessionForm(true);
  };

  const handleAddReport = () => {
    setShowNewReportForm(true);
  };

  const handleCloseSessionForm = () => {
    setShowNewSessionForm(false);
  };

  const handleCloseReportForm = () => {
    setShowNewReportForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{doctor.name}</h1>
          {doctor.specialty && <p className="text-gray-500">{doctor.specialty}</p>}
        </div>
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
          {showNewSessionForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Add New Symptom Session</CardTitle>
              </CardHeader>
              <CardContent>
                {SessionFormComponent ? (
                  <SessionFormComponent 
                    onClose={handleCloseSessionForm}
                    onSubmit={(sessionData: any) => {
                      setSessions([...sessions, sessionData]);
                      setShowNewSessionForm(false);
                    }}
                    {...sessionFormProps}
                    doctorId={doctor.id}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p>Session form component not provided</p>
                    <Button onClick={handleCloseSessionForm} className="mt-2">Close</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Add Session</h3>
                <Button 
                  onClick={handleAddSession}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add session
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
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
                {ReportFormComponent ? (
                  <ReportFormComponent 
                    onClose={handleCloseReportForm}
                    onSubmit={(reportData: any) => {
                      setReports([...reports, reportData]);
                      setShowNewReportForm(false);
                    }}
                    {...reportFormProps}
                    doctorId={doctor.id}
                    doctors={doctors}
                    handleSubmit={reportFormProps}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p>Report form component not provided</p>
                    <Button onClick={handleCloseReportForm} className="mt-2">Close</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Lab Reports</h3>
                <Button 
                  onClick={handleAddReport}
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