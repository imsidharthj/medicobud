import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Calendar, ArrowLeft, Eye } from 'lucide-react';
import { getFileUrl } from '@/utils/fileHelpers';

interface Session {
  id: string;
  date?: string;
  session_date?: string;
  symptoms: (string | { name: string; imageUrl?: string })[];
  diagnosis?: string;
  notes?: string;
  symptom_image_url?: string;
}

interface Report {
  id?: string;
  name?: string;
  report_name?: string;
  date?: string;
  report_date?: string;
  type?: string;
  report_type?: string;
  file_url?: string;
  notes?: string;
  doctor_name?: string;
}

interface VisitPageProps {
  doctor: {
    id: string;
    name: string;
    specialty?: string;
  };
  visitId?: string;
  doctors?: any[];
  SessionFormComponent?: React.ComponentType<any>;
  ReportFormComponent?: React.ComponentType<any>;
  sessionFormProps?: any;
  reportFormProps?: any;
  fetchSymptomSessions?: (visitId?: string) => Promise<Session[]>;
  fetchSessionDetails?: (visitId?: string, sessionId?: string) => Promise<Session>;
  fetchLabReports?: () => Promise<Report[]>;
  fetchReportDetails?: (reportId: string) => Promise<Report>;
  deleteLabReport?: (reportId: string) => Promise<void>;
  labReports?: Report[];
  selectedReport?: Report | null;
  setSelectedReport?: (report: Report | null) => void;
  sessionsRefreshTrigger?: number;
}

export default function VisitPage({
  doctor,
  visitId,
  doctors = [],
  SessionFormComponent,
  ReportFormComponent,
  sessionFormProps = {},
  reportFormProps = {},
  fetchSymptomSessions,
  fetchSessionDetails,
  fetchLabReports,
  fetchReportDetails,
  labReports,
  selectedReport,
  setSelectedReport,
  sessionsRefreshTrigger = 0,
}: VisitPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState({
    sessions: false,
    sessionDetails: false,
    reports: false,
    reportDetails: false,
  });
  const [error, setError] = useState({
    sessions: null,
    sessionDetails: null,
    reports: null,
    reportDetails: null,
  });
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  const [localSelectedReport, setLocalSelectedReport] = useState<Report | null>(null);

  const effectiveReports = labReports || reports;
  const effectiveSelectedReport = selectedReport || localSelectedReport;
  const setEffectiveSelectedReport = setSelectedReport || setLocalSelectedReport;

  useEffect(() => {
    if (fetchSymptomSessions && visitId) {
      setLoading(prev => ({...prev, sessions: true}));
      fetchSymptomSessions(visitId)
        .then(data => {
          setSessions(data);
          setLoading(prev => ({...prev, sessions: false}));
        })
        .catch(err => {
          console.error("Error fetching symptom sessions:", err);
          setError(prev => ({...prev, sessions: err.message}));
          setLoading(prev => ({...prev, sessions: false}));
        });
    }
  }, [fetchSymptomSessions, visitId, sessionsRefreshTrigger]);
  
  useEffect(() => {
    if (fetchLabReports && !labReports) {
      setLoading(prev => ({...prev, reports: true}));
      fetchLabReports()
        .then(data => {
          setReports(data);
          setLoading(prev => ({...prev, reports: false}));
        })
        .catch(err => {
          console.error("Error fetching lab reports:", err);
          setError(prev => ({...prev, reports: err.message}));
          setLoading(prev => ({...prev, reports: false}));
        });
    }
  }, [fetchLabReports, labReports]);

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

  const handleViewSessionDetails = async (sessionId: string) => {
    if (fetchSessionDetails && visitId) {
      try {
        setLoading(prev => ({...prev, sessionDetails: true}));
        const sessionDetails = await fetchSessionDetails(visitId, sessionId);
        setSelectedSession(sessionDetails);
        setLoading(prev => ({...prev, sessionDetails: false}));
      } catch (error) {
        console.error("Failed to fetch session details:", error);
        setLoading(prev => ({...prev, sessionDetails: false}));
      }
    } else {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setSelectedSession(session);
      }
    }
  };

  const handleViewReportDetails = async (reportId: string) => {
    if (fetchReportDetails) {
      try {
        setLoading(prev => ({...prev, reportDetails: true}));
        const reportDetails = await fetchReportDetails(reportId);
        setEffectiveSelectedReport(reportDetails);
        setLoading(prev => ({...prev, reportDetails: false}));
      } catch (error) {
        console.error("Failed to fetch report details:", error);
        // setError(prev => ({...prev, reportDetails: error.message}));
        setLoading(prev => ({...prev, reportDetails: false}));
      }
    } else {
      const report = effectiveReports.find(r => r.id === reportId);
      if (report) {
        setEffectiveSelectedReport(report);
      }
    }
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
  };

  const handleBackToReports = () => {
    setEffectiveSelectedReport(null);
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
          <TabsTrigger value="sessions" className="flex items-center gap-2">
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
                      if (sessionFormProps.handleFormSubmit) {
                        sessionFormProps.handleFormSubmit(sessionData);
                      }
                      setShowNewSessionForm(false);
                    }}
                    {...sessionFormProps}
                    doctorId={doctor.id}
                    visitId={visitId}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p>Session form component not provided</p>
                    <Button onClick={handleCloseSessionForm} className="mt-2">Close</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : selectedSession ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    onClick={handleBackToSessions}
                    className="flex items-center gap-1 px-2 py-1 h-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sessions
                  </Button>
                  <CardTitle>
                    Session: {new Date(selectedSession.session_date || selectedSession.date || '').toLocaleDateString()}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading.sessionDetails ? (
                  <div className="text-center py-8">
                    <p>Loading session details...</p>
                  </div>
                ) : error.sessionDetails ? (
                  <p className="text-red-500">Error loading session details: {error.sessionDetails}</p>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Symptoms</h3>
                      <ul className="list-disc list-inside space-y-2">
                        {(selectedSession.symptoms || []).map((symptom, index) => (
                          <li key={index} className="flex items-center gap-2">
                            {typeof symptom === 'string' ? symptom : symptom.name}
                            {(typeof symptom === 'object' && symptom.imageUrl) && (
                              <Button variant="outline" size="sm" className="text-blue-500">
                                <img 
                                  src={symptom.imageUrl} 
                                  alt={`${symptom.name} image`}
                                  className="max-h-20 object-cover rounded-md cursor-pointer"
                                />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {selectedSession.diagnosis && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Diagnosis</h3>
                        <p className="bg-slate-50 p-3 rounded-md">{selectedSession.diagnosis}</p>
                      </div>
                    )}
                    
                    {selectedSession.notes && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Notes</h3>
                        <p className="bg-slate-50 p-3 rounded-md whitespace-pre-line">{selectedSession.notes}</p>
                      </div>
                    )}
                    
                    {selectedSession.symptom_image_url && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Symptom Images</h3>
                        <div className="flex flex-wrap gap-4">
                          <img 
                            src={getFileUrl(selectedSession.symptom_image_url)}
                            alt="Symptom Image"
                            className="max-h-60 object-cover rounded-md cursor-pointer"
                            onClick={() => window.open(getFileUrl(selectedSession.symptom_image_url), '_blank')}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Symptom Sessions</h3>
                <Button 
                  onClick={handleAddSession}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add session
                </Button>
              </div>
              
              <div className="space-y-4">
                {loading.sessions ? (
                  <p>Loading sessions...</p>
                ) : error.sessions ? (
                  <p className="text-red-500">Error loading sessions: {error.sessions}</p>
                ) : sessions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {sessions.map((session) => (
                      <Card key={session.id || `session-${Math.random()}`} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">
                              Session: {new Date(session.session_date || session.date || '').toLocaleDateString()}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {(session.symptoms || []).slice(0, 2).map((s, i) => 
                                <span key={i}>{typeof s === 'string' ? s : s.name}{i < Math.min(1, (session.symptoms || []).length - 1) ? ', ' : ''}</span>
                              )}
                              {(session.symptoms || []).length > 2 && <span> and {(session.symptoms || []).length - 2} more...</span>}
                            </p>
                          </div>
                          <Button 
                            variant="blueButton"
                            size="sm"
                            onClick={() => handleViewSessionDetails(session.id)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-md">
                    <p className="text-gray-500">No symptom sessions recorded yet.</p>
                    <Button onClick={handleAddSession} className="mt-4">Record a session</Button>
                  </div>
                )}
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
                    handleSubmit={(reportData: any) => {
                      if (reportFormProps.handleFormSubmit) {
                        reportFormProps.handleFormSubmit(reportData);
                      }
                      if (!labReports) {
                        setReports([...reports, reportData]);
                      }
                      setShowNewReportForm(false);
                    }}
                    doctorId={doctor.id}
                    doctors={doctors}
                  />
                ) : (
                  <div className="text-center py-4">
                    <p>Report form component not provided</p>
                    <Button onClick={handleCloseReportForm} className="mt-2">Close</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : effectiveSelectedReport ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button 
                    variant="ghost" 
                    onClick={handleBackToReports}
                    className="flex items-center gap-1 px-2 py-1 h-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to reports
                  </Button>
                  <CardTitle>
                    {effectiveSelectedReport.report_name || effectiveSelectedReport.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading.reportDetails ? (
                  <div className="text-center py-8">
                    <p>Loading report details...</p>
                  </div>
                ) : error.reportDetails ? (
                  <p className="text-red-500">Error loading report details: {error.reportDetails}</p>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Report Type</h3>
                        <p>{effectiveSelectedReport.report_type || effectiveSelectedReport.type}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Date</h3>
                        <p>{new Date(effectiveSelectedReport.report_date || effectiveSelectedReport.date || '').toLocaleDateString()}</p>
                      </div>
                      {effectiveSelectedReport.doctor_name && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Doctor</h3>
                          <p>{effectiveSelectedReport.doctor_name}</p>
                        </div>
                      )}
                    </div>
                    
                    {effectiveSelectedReport.notes && (
                      <div>
                        <h3 className="text-lg font-medium mb-2">Notes</h3>
                        <p className="bg-slate-50 p-3 rounded-md whitespace-pre-line">{effectiveSelectedReport.notes}</p>
                      </div>
                    )}
                    
                    {effectiveSelectedReport.file_url && (
                      <div className="flex flex-col items-center space-y-4">
                        <Button 
                          onClick={() => effectiveSelectedReport.file_url && 
                            window.open(getFileUrl(effectiveSelectedReport.file_url), '_blank')}
                          className="w-full"
                        >
                          View Full Report
                        </Button>
                        {effectiveSelectedReport.file_url.toLowerCase().endsWith('.pdf') ? (
                          <div className="bg-slate-100 p-4 rounded-md w-full text-center">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                            <p>PDF Document</p>
                          </div>
                        ) : ['jpg', 'jpeg', 'png', 'gif'].some(ext => 
                          effectiveSelectedReport.file_url?.toLowerCase().endsWith(`.${ext}`)) ? (
                          <img 
                            src={getFileUrl(effectiveSelectedReport.file_url)} 
                            alt="Report Image"
                            className="max-h-80 object-contain rounded-md border"
                          />
                        ) : (
                          <div className="bg-slate-100 p-4 rounded-md w-full text-center">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                            <p>Document</p>
                          </div>
                        )}
                      </div>
                    )}
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
              
              <div className="space-y-4">
                {loading.reports ? (
                  <p>Loading reports...</p>
                ) : error.reports ? (
                  <p className="text-red-500">Error loading reports: {error.reports}</p>
                ) : effectiveReports && effectiveReports.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {effectiveReports.map((report) => (
                      <Card key={report.id || `report-${Math.random()}`} className="hover:bg-slate-50 transition-colors cursor-pointer">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <h4 className="font-medium">
                              {report.report_name || report.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {new Date(report.report_date || report.date || '').toLocaleDateString()} • {report.report_type || report.type}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="blueButton"
                              size="sm"
                              onClick={() => report.id && handleViewReportDetails(report.id.toString())}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-md">
                    <p className="text-gray-500">No lab reports uploaded yet.</p>
                    <Button onClick={handleAddReport} className="mt-4">Upload a report</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}