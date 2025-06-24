import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle, CheckCircle, Loader2, Activity, Brain, Clock, AlertTriangle, Info, RefreshCw, Camera, FileImage, FileCheck } from 'lucide-react';
import { FASTAPI_URL } from '@/utils/api';
import { useAuth } from '@/authProvide';
import { tempUserService, FeatureType } from '@/utils/tempUser';

// --- NEW TYPE DEFINITIONS FOR JSON RESPONSE ---

interface AiAnalysisValue {
  test: string;
  value: string;
  unit: string;
  range: string;
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
}

interface AiAnalysis {
  summary: string;
  values: AiAnalysisValue[];
  status: {
    normal: number;
    abnormal: number;
    critical: number;
  };
  recommendations: {
    lifestyle: string;
    followUp: string;
    doctor: string;
  };
}

interface SystemInfo {
  llm_status: any;
}

interface LabAnalysisResponse {
  success: boolean;
  analysis_id?: string;
  raw_text?: string;
  ai_analysis?: AiAnalysis;
  processing_time?: number;
  system_info?: SystemInfo;
  error?: string;
}

// --- END OF NEW TYPE DEFINITIONS ---

interface LabReportAnalysisProps {
  visitId?: number;
  userProfile?: {
    name: string;
    age: number;
    gender: string;
    allergies: string[];
    medications?: string[];
  };
  onBack?: () => void;
  isGuestMode?: boolean;
  tempUserId?: string; // Add tempUserId prop
}

const STATUS_CONFIG = {
  NORMAL: { color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200', variant: 'default' as const },
  HIGH: { color: 'yellow', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', variant: 'secondary' as const },
  LOW: { color: 'yellow', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', variant: 'secondary' as const },
  CRITICAL: { color: 'red', bgColor: 'bg-red-50', borderColor: 'border-red-200', variant: 'destructive' as const }
};

const OVERVIEW_CARDS = [
  { key: 'normal' as const, icon: CheckCircle, color: 'green', label: 'Normal' },
  { key: 'abnormal' as const, icon: AlertCircle, color: 'yellow', label: 'Abnormal' },
  { key: 'critical' as const, icon: AlertTriangle, color: 'red', label: 'Critical' }
];

const RECOMMENDATION_CARDS = [
  { key: 'lifestyle' as const, icon: Activity, color: 'blue', label: 'Lifestyle' },
  { key: 'followUp' as const, icon: Clock, color: 'green', label: 'Follow-Up' },
  { key: 'doctor' as const, icon: Brain, color: 'purple', label: 'Doctor' }
];

const PROGRESS_STAGES = [
  { progress: 20, stage: 'Processing file...' },
  { progress: 40, stage: 'Extracting text with OCR...' },
  { progress: 60, stage: 'Analyzing medical entities...' },
  { progress: 80, stage: 'Generating AI insights...' },
  { progress: 95, stage: 'Finalizing analysis...' },
];

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 
  'image/tiff', 'image/tif', 'application/pdf'
];

export const LabReportAnalysis: React.FC<LabReportAnalysisProps> = ({
  visitId,
  onBack,
  isGuestMode = false,
  tempUserId: propTempUserId
}) => {
  const { user, isSignedIn } = useUser();
  const { isTempUser, tempUserId: authTempUserId, canUseFeature, getRemainingLimits } = useAuth();
  
  // Use temp user system
  const effectiveTempUserId = propTempUserId || authTempUserId;
  const actualIsGuestMode = isGuestMode || isTempUser || !isSignedIn;
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<LabAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    status: string;
    gpu_available: boolean;
    device: string;
    ocr_configured: boolean;
    medcat_available: boolean;
    spacy_available: boolean;
    models_loaded: Record<string, boolean>;
    recommendations: string[];
  } | null>(null);

  const [rateLimitInfo, setRateLimitInfo] = useState<{
    canUse: boolean;
    remainingDaily: number;
    error?: string;
  }>({ canUse: true, remainingDaily: 5 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkSystemStatus();
    initializeRateLimits();
  }, [visitId]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const initializeRateLimits = async () => {
    if (actualIsGuestMode) {
      try {
        const canUse = await canUseFeature(FeatureType.LAB_REPORT);
        const limits = await getRemainingLimits();
        setRateLimitInfo({
          canUse,
          remainingDaily: limits.lab_report?.daily_remaining || 0
        });
      } catch (error) {
        setRateLimitInfo({
          canUse: false,
          remainingDaily: 0,
          error: error instanceof Error ? error.message : 'Rate limit check failed'
        });
      }
    } else {
      setRateLimitInfo({ canUse: true, remainingDaily: -1 }); // Unlimited for authenticated users
    }
  };

  const checkSystemStatus = async () => {
    try {
      const response = await fetch(`${FASTAPI_URL}/lab-reports/system/status`);
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
      }
    } catch (err) {
      console.warn('Failed to check system status:', err);
    }
  };

  const simulateProgress = () => {
    setAnalysisProgress(0);
    let currentStage = 0;
    progressIntervalRef.current = setInterval(() => {
      if (currentStage < PROGRESS_STAGES.length) {
        setAnalysisProgress(PROGRESS_STAGES[currentStage].progress);
        setAnalysisStage(PROGRESS_STAGES[currentStage].stage);
        currentStage++;
      }
    }, 1500);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setAnalysisProgress(100);
    setAnalysisStage('Analysis complete!');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setError('Unsupported file format. Please upload JPG, PNG, TIFF, BMP, or PDF files.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File size too large. Please upload files smaller than 10MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleFileUploadAnalysis = async () => {
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }

    // Check rate limits before starting analysis
    if (!rateLimitInfo.canUse) {
      setError(rateLimitInfo.error || 'Daily lab report analysis limit reached. Please try again tomorrow.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      simulateProgress();

      const formData = new FormData();
      formData.append('file', selectedFile);

      // Handle temp user vs authenticated user
      if (actualIsGuestMode) {
        // Use temp user system
        const finalTempUserId = effectiveTempUserId || await tempUserService.getTempUserId();
        if (finalTempUserId) {
          formData.append('temp_user_id', finalTempUserId);
        }
      } else if (isSignedIn && user) {
        // Authenticated user
        formData.append('user_id', user.id);
        const email = user.emailAddresses?.[0]?.emailAddress;
        if (email) {
          formData.append('email', email);
        }
      }
      
      const response = await fetch(`${FASTAPI_URL}/lab-reports/analyze-file`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.error || 'Failed to upload and analyze file');
      }

      const result = await response.json();
      
      // Update rate limit info if returned
      if (result.remaining_daily !== undefined) {
        setRateLimitInfo(prev => ({
          ...prev,
          remainingDaily: result.remaining_daily
        }));
      }

      setAnalysisResult(result);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File analysis failed');
    } finally {
      stopProgressSimulation();
      setIsAnalyzing(false);
    }
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setSelectedFile(null);
    setError(null);
    setAnalysisProgress(0);
    setAnalysisStage('');
  };

  const renderLabValueRow = (value: AiAnalysisValue, index: number) => {
    const statusConfig = STATUS_CONFIG[value.status];
    return (
      <tr key={index} className={statusConfig.bgColor}>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{value.test}</td>
        <td className="px-4 py-3 text-sm font-mono text-gray-900">{value.value} {value.unit}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{value.range}</td>
        <td className="px-4 py-3 text-sm">
          <Badge
            variant={statusConfig.variant}
            className={value.status === 'NORMAL' ? 'bg-green-100 text-green-800' : ''}
          >
            {value.status}
          </Badge>
        </td>
      </tr>
    );
  };

  const renderLabValueCard = (value: AiAnalysisValue, index: number) => {
    const statusConfig = STATUS_CONFIG[value.status];
    return (
      <Card key={index} className={`${statusConfig.bgColor} ${statusConfig.borderColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <h5 className="pr-2 font-semibold text-gray-800">{value.test}</h5>
            <Badge
              variant={statusConfig.variant}
              className={`flex-shrink-0 ${value.status === 'NORMAL' ? 'bg-green-100 text-green-800' : ''}`}
            >
              {value.status}
            </Badge>
          </div>
          <div className="mt-3 space-y-1 text-sm text-gray-700">
            <div>
              <span className="font-medium text-gray-500">Value: </span>
              <span className="font-mono">{value.value} {value.unit}</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Range: </span>
              <span>{value.range}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFileUpload = () => (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.bmp,.tiff,.tif,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <FileCheck className="w-16 h-16 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type}
              </p>
            </div>
            <Button 
              variant="blueButton" 
              onClick={() => fileInputRef.current?.click()}
            >
              Change File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <FileImage className="w-12 h-12 text-gray-400" />
              <Camera className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">Upload Lab Report</p>
              <p className="text-sm text-gray-500">
                Support for images (JPG, PNG, TIFF) and PDF files up to 10MB
              </p>
            </div>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
        )}
      </div>

      <Button
        onClick={handleFileUploadAnalysis}
        disabled={!selectedFile || isAnalyzing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        size="lg"
        variant="blueButton"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Report...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4 mr-2" />
            Analyze Lab Report
          </>
        )}
      </Button>
    </div>
  );

  const renderAnalysisResults = () => {
    if (!analysisResult || !analysisResult.ai_analysis) return null;

    const { ai_analysis } = analysisResult;

    return (
      <div className="space-y-6">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Analysis Results</h3>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={analysisResult.success ? "default" : "destructive"}
              className={analysisResult.success ? "bg-green-100 text-green-800" : ""}
            >
              {analysisResult.success ? 'Success' : 'Failed'}
            </Badge>
            <Button variant="blueButton" size="sm" onClick={clearAnalysis}>
              <RefreshCw className="w-4 h-4 mr-1" />
              New Analysis
            </Button>
          </div>
        </div>

        {analysisResult.success ? (
          <div className="space-y-8">
            {/* Summary Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Summary</h4>
              <Card>
                <CardContent className="p-4">
                  <p className="text-gray-700 leading-relaxed">{ai_analysis.summary}</p>
                </CardContent>
              </Card>
            </div>

            {/* Overview Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Overview</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {OVERVIEW_CARDS.map(config => {
                  const Icon = config.icon;
                  const value = ai_analysis.status[config.key];
                  return (
                    <Card key={config.key} className={`border-${config.color}-200`}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-5 h-5 text-${config.color}-500`} />
                          <div>
                            <p className={`text-2xl font-bold text-${config.color}-600`}>
                              {value}
                            </p>
                            <p className="text-sm text-gray-600">{config.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Lab Values Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Lab Values</h4>
              
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-y-2">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Test Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Value (Unit)</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Normal Range</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {ai_analysis.values.map(renderLabValueRow)}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Mobile Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {ai_analysis.values.map(renderLabValueCard)}
              </div>
            </div>

            {/* Recommendations Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Recommendations</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {RECOMMENDATION_CARDS.map(config => {
                  const content = ai_analysis.recommendations[config.key];
                  if (!content) return null;
                  
                  const Icon = config.icon;
                  return (
                    <Card key={config.key}>
                      <CardHeader>
                        <CardTitle className={`flex items-center space-x-2 text-${config.color}-700`}>
                          <Icon className="w-5 h-5" />
                          <span>{config.label}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">{content}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Analysis failed: {analysisResult.error || 'Unknown error occurred'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  const renderProgressBar = () => {
    if (!isAnalyzing) return null;

    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Processing Lab Report</h4>
              <span className="text-sm text-gray-500">{analysisProgress}%</span>
            </div>
            <Progress value={analysisProgress} className="w-full" />
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{analysisStage}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRateLimitWarning = () => {
    if (!actualIsGuestMode) return null;
    
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {rateLimitInfo.canUse ? (
            <>
              <strong>Guest Mode:</strong> You have {rateLimitInfo.remainingDaily} lab report analyses remaining today.
              {rateLimitInfo.remainingDaily <= 1 && (
                <span className="text-orange-600"> Consider signing up for unlimited access.</span>
              )}
            </>
          ) : (
            <>
              <strong>Daily Limit Reached:</strong> {rateLimitInfo.error || 'You have reached your daily lab report analysis limit. Please try again tomorrow or sign up for unlimited access.'}
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="w-full max-w-6xl px-4 mx-auto space-y-6 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lab Report Analysis</h1>
          <p className="mt-1 text-gray-600">
            Upload and analyze your medical lab reports with AI-powered insights
          </p>
          {actualIsGuestMode && (
            <p className="mt-1 text-sm text-blue-600">
              Guest Mode • {rateLimitInfo.remainingDaily} analyses remaining today
            </p>
          )}
        </div>
        {onBack && (
          <Button variant="blueButton" onClick={onBack}>
            ← Back to Diagnosis
          </Button>
        )}
      </div>

      {/* Rate Limit Warning */}
      {renderRateLimitWarning()}

      {/* System Status Alert */}
      {systemStatus && systemStatus.recommendations.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>System Status:</strong> {systemStatus.status}
            <ul className="mt-2 list-disc list-inside text-sm">
              {systemStatus.recommendations.slice(0, 2).map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Analysis Results */}
      {analysisResult && renderAnalysisResults()}

      {/* File Upload */}
      {!analysisResult && (
        <Card>
          <CardContent className="p-6">
            {renderFileUpload()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LabReportAnalysis;