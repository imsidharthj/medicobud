import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle, CheckCircle, Loader2, Activity, Pill, Brain, Clock, AlertTriangle, Info, RefreshCw, X, Camera, FileImage, FileCheck } from 'lucide-react';
import { FASTAPI_URL } from '@/utils/api';

interface ExtractedEntity {
  text: string;
  label: string[];
  confidence: number;
  start: number;
  end: number;
  cui?: string;
  description?: string;
  category?: string;
}

interface LabValue {
  test: string;
  value: number;
  unit: string;
  reference_range?: string;
  status: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL';
}

interface LabAnalysis {
  normal_values: LabValue[];
  abnormal_values: LabValue[];
  critical_values: LabValue[];
  missing_ranges: string[];
}

interface SystemInfo {
  device_used: string;
  gpu_available: boolean;
  model_info: {
    spacy_available: boolean;
    medcat_available: boolean;
    llm_model: string;
  };
}

interface LabAnalysisResponse {
  success: boolean;
  analysis_id?: string;
  raw_text?: string;
  extracted_entities?: {
    medical_entities: ExtractedEntity[];
    lab_values: Record<string, [string, string][]>;
    quantities: string[];
    spacy_entities: ExtractedEntity[];
    processing_info: {
      medcat_available: boolean;
      spacy_available: boolean;
      device_used: string;
    };
  };
  lab_analysis?: LabAnalysis;
  ai_analysis?: string;
  critical_assessment?: string;
  medication_analysis?: string;
  trend_analysis?: string;
  processing_time?: number;
  system_info?: SystemInfo;
  error?: string;
}

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
}

// New types for formatted lab report analysis
interface FormattedLabValue {
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  status: 'Normal' | 'Abnormal' | 'Critical';
}

interface StatusCounts {
  normal: number;
  abnormal: number;
  critical: number;
}

interface GroupedValues {
  normal: string[];
  abnormal: string[];
  critical: string[];
}

interface FormattedRecommendations {
  lifestyle: string;
  followUp: string;
  doctor: string;
}

interface FormattedLabAnalysis {
  summary: string;
  statusCounts: StatusCounts;
  labValues: FormattedLabValue[];
  groupedValues: GroupedValues;
  recommendations: FormattedRecommendations;
}

export const LabReportAnalysis: React.FC<LabReportAnalysisProps> = ({
  visitId,
  userProfile,
  onBack,
  // isGuestMode = false
}) => {
  useUser();
  
  // State Management - Remove text and history related states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [medications, setMedications] = useState<string[]>(userProfile?.medications || []);
  const [medicationInput, setMedicationInput] = useState('');
  
  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStage, setAnalysisStage] = useState('');
  const [analysisResult, setAnalysisResult] = useState<LabAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // System Status
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load system status on component mount
  useEffect(() => {
    checkSystemStatus();
  }, [visitId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const checkSystemStatus = async () => {
    try {
      // Updated to use simplified endpoint without visit_id
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
    const stages = [
      { progress: 20, stage: 'Processing file...' },
      { progress: 40, stage: 'Extracting text with OCR...' },
      { progress: 60, stage: 'Analyzing medical entities...' },
      { progress: 80, stage: 'Generating AI insights...' },
      { progress: 95, stage: 'Finalizing analysis...' },
    ];

    let currentStage = 0;
    progressIntervalRef.current = setInterval(() => {
      if (currentStage < stages.length) {
        setAnalysisProgress(stages[currentStage].progress);
        setAnalysisStage(stages[currentStage].stage);
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
      // Validate file type
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 
        'image/tiff', 'image/tif', 'application/pdf'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('Unsupported file format. Please upload JPG, PNG, TIFF, BMP, or PDF files.');
        return;
      }

      // Validate file size (max 10MB)
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

    try {
      setIsAnalyzing(true);
      setError(null);
      simulateProgress();

      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (medications.length > 0) {
        formData.append('medications', JSON.stringify(medications));
      }

      // Updated to use simplified endpoint
      const response = await fetch(`${FASTAPI_URL}/lab-reports/analyze-file`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to upload and analyze file');
      }

      const result = await response.json();
      setAnalysisResult(result);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File analysis failed');
    } finally {
      stopProgressSimulation();
      setIsAnalyzing(false);
    }
  };

  const addMedication = () => {
    if (medicationInput.trim() && !medications.includes(medicationInput.trim())) {
      setMedications([...medications, medicationInput.trim()]);
      setMedicationInput('');
    }
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setSelectedFile(null);
    setError(null);
    setAnalysisProgress(0);
    setAnalysisStage('');
  };

  // Function to remove unwanted emojis from text, keeping only allowed status emojis
  const cleanEmojiFromText = (text: string): string => {
    // Define allowed emojis for status
    const allowedEmojis = ['✅', '⚠️', '🚨', '🏃', '🔬', '👨‍⚕️'];
    
    // More comprehensive emoji regex that specifically catches the blood drop emoji
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1FA70}-\u{1FAFF}]/gu;
    
    return text.replace(emojiRegex, (match) => {
      // Keep the emoji if it's in our allowed list, otherwise remove it
      return allowedEmojis.includes(match) ? match : '';
    }).trim();
  };

  // Additional function to clean text that may have emojis at the beginning
  const removeLeadingEmojis = (text: string): string => {
    // Remove any emoji at the start of the string, followed by optional whitespace
    return text.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/gu, '').trim();
  };

  // Function to parse API response format like the example you provided
  const parseFormattedLabAnalysis = (aiAnalysis: string): FormattedLabAnalysis | null => {
    try {
      // Parse the structured API response format
      const summaryMatch = aiAnalysis.match(/\*\*SUMMARY:\*\*\s*(.*?)(?=\*\*VALUES:\*\*)/s);
      const valuesMatch = aiAnalysis.match(/\*\*VALUES:\*\*\s*(.*?)(?=\*\*STATUS:\*\*)/s);
      const statusMatch = aiAnalysis.match(/\*\*STATUS:\*\*\s*Normal:\s*(\d+)\s*\|\s*Abnormal:\s*(\d+)\s*\|\s*Critical:\s*(\d+)/s);
      const recommendationsMatch = aiAnalysis.match(/\*\*RECOMMENDATIONS:\*\*\s*(.*?)$/s);

      if (!summaryMatch || !valuesMatch || !statusMatch) {
        return null;
      }

      const summary = cleanEmojiFromText(summaryMatch[1].trim());
      const valuesText = valuesMatch[1].trim();
      const recommendationsText = recommendationsMatch?.[1]?.trim() || '';

      // Parse status counts
      const statusCounts: StatusCounts = {
        normal: parseInt(statusMatch[1]),
        abnormal: parseInt(statusMatch[2]),
        critical: parseInt(statusMatch[3])
      };

      // Parse lab values
      const labValues: FormattedLabValue[] = [];
      const groupedValues: GroupedValues = { normal: [], abnormal: [], critical: [] };

      // Split values by | and parse each one
      const valueEntries = valuesText.split('|').map(v => v.trim()).filter(v => v.length > 0);
      
      valueEntries.forEach(entry => {
        // Clean emojis from the entry first, but preserve status emojis
        const cleanedEntry = entry.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, (match) => {
          // Keep only status emojis (✅, ⚠️, 🚨)
          return ['✅', '⚠️', '🚨'].includes(match) ? match : '';
        }).trim();
        
        // Parse format: "Test Name: value unit (range) status"
        const match = cleanedEntry.match(/^(.*?):\s*([\d.]+)\s*([^(]+)\s*\(([^)]+)\)\s*([^|]+)$/);
        if (match) {
          const [, testName, value, unit, range, statusText] = match;
          
          let status: 'Normal' | 'Abnormal' | 'Critical' = 'Normal';
          if (statusText.includes('⚠️') || statusText.includes('LOW') || statusText.includes('HIGH')) {
            status = 'Abnormal';
          } else if (statusText.includes('🚨') || statusText.includes('CRITICAL')) {
            status = 'Critical';
          }

          const cleanTestName = cleanEmojiFromText(testName.trim());
          const cleanValue = cleanEmojiFromText(value.trim());
          const cleanUnit = cleanEmojiFromText(unit.trim());
          const cleanRange = cleanEmojiFromText(range.trim());

          labValues.push({
            testName: cleanTestName,
            value: cleanValue,
            unit: cleanUnit,
            normalRange: cleanRange,
            status
          });

          // Group values by status
          if (status === 'Normal') {
            groupedValues.normal.push(cleanTestName);
          } else if (status === 'Abnormal') {
            groupedValues.abnormal.push(cleanTestName);
          } else {
            groupedValues.critical.push(cleanTestName);
          }
        }
      });

      // Parse recommendations (keep emojis for recommendations section)
      const lifestyleMatch = recommendationsText.match(/🏃\s*Lifestyle:\s*(.*?)(?=🔬|👨‍⚕️|$)/s);
      const followUpMatch = recommendationsText.match(/🔬\s*Follow-up:\s*(.*?)(?=👨‍⚕️|$)/s);
      const doctorMatch = recommendationsText.match(/👨‍⚕️\s*Doctor:\s*(.*?)$/s);

      const recommendations: FormattedRecommendations = {
        lifestyle: lifestyleMatch?.[1]?.trim() || '',
        followUp: followUpMatch?.[1]?.trim() || '',
        doctor: doctorMatch?.[1]?.trim() || ''
      };

      return {
        summary,
        statusCounts,
        labValues,
        groupedValues,
        recommendations
      };
    } catch (error) {
      console.error('Error parsing formatted lab analysis:', error);
      return null;
    }
  };

  // Function to clean and display lab values from the original analysis format
  const cleanLabValue = (labValue: LabValue) => {
    return {
      ...labValue,
      test: removeLeadingEmojis(cleanEmojiFromText(labValue.test))
    };
  };

  // Function to render formatted lab report analysis
  const renderFormattedAnalysis = (formattedData: FormattedLabAnalysis) => (
    <div className="space-y-8">
      {/* Summary Section */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Summary</h4>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-700 leading-relaxed">{formattedData.summary}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Overview</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {formattedData.statusCounts.normal}
                  </p>
                  <p className="text-sm text-gray-600">Normal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {formattedData.statusCounts.abnormal}
                  </p>
                  <p className="text-sm text-gray-600">Abnormal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {formattedData.statusCounts.critical}
                  </p>
                  <p className="text-sm text-gray-600">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lab Values Table */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Lab Values</h4>
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
                  {formattedData.labValues.map((value, index) => (
                    <tr key={index} className={
                      value.status === 'Normal' ? 'bg-green-50' :
                      value.status === 'Critical' ? 'bg-red-50' :
                      value.status === 'Abnormal' ? 'bg-yellow-50' : 
                      'bg-white'
                    }>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {value.testName}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {value.value} {value.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {value.normalRange}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge 
                          variant={
                            value.status === 'Critical' ? 'destructive' :
                            value.status === 'Abnormal' ? 'secondary' : 'default'
                          }
                          className={
                            value.status === 'Normal' ? 'bg-green-100 text-green-800' : ''
                          }
                        >
                          {value.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grouped Values */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Grouped Values</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Normal Values */}
          {formattedData.groupedValues.normal.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span>Normal Values</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formattedData.groupedValues.normal.map((test, index) => (
                    <div key={index} className="px-3 py-2 bg-green-50 rounded text-sm">
                      {test}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Abnormal Values */}
          {formattedData.groupedValues.abnormal.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-yellow-700">
                  <AlertCircle className="w-5 h-5" />
                  <span>Abnormal Values</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formattedData.groupedValues.abnormal.map((test, index) => (
                    <div key={index} className="px-3 py-2 bg-yellow-50 rounded text-sm">
                      {test}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Values */}
          {formattedData.groupedValues.critical.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Critical Values</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formattedData.groupedValues.critical.map((test, index) => (
                    <div key={index} className="px-3 py-2 bg-red-50 rounded text-sm">
                      {test}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Recommendations</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lifestyle */}
          {formattedData.recommendations.lifestyle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-700">
                  <Activity className="w-5 h-5" />
                  <span>Lifestyle</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  {formattedData.recommendations.lifestyle}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Follow-Up */}
          {formattedData.recommendations.followUp && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-700">
                  <Clock className="w-5 h-5" />
                  <span>Follow-Up</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  {formattedData.recommendations.followUp}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Doctor */}
          {formattedData.recommendations.doctor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-purple-700">
                  <Brain className="w-5 h-5" />
                  <span>Doctor</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  {formattedData.recommendations.doctor}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  const renderFileUpload = () => (
    <div className="space-y-6">
      {/* File Upload Area */}
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

      {/* Configuration Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medications */}
        <div className="space-y-2">
          <Label>Current Medications (Optional)</Label>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter medication name"
              value={medicationInput}
              onChange={(e) => setMedicationInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMedication()}
            />
            <Button type="button" onClick={addMedication} variant="blueButton">
              <Pill className="w-4 h-4" />
            </Button>
          </div>
          {medications.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {medications.map((med, index) => (
                <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                  <span>{med}</span>
                  <button
                    onClick={() => removeMedication(index)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Button */}
      <Button
        onClick={handleFileUploadAnalysis}
        disabled={!selectedFile || isAnalyzing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        size="lg"
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
    if (!analysisResult) return null;

    // Check if AI analysis contains the formatted structure
    const formattedData = analysisResult.ai_analysis ? 
      parseFormattedLabAnalysis(analysisResult.ai_analysis) : null;

    return (
      <div className="space-y-6">
        {/* Analysis Header */}
        <div className="flex items-center justify-between">
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
            {/* Use formatted analysis if available, otherwise fall back to original */}
            {formattedData ? (
              renderFormattedAnalysis(formattedData)
            ) : (
              <>
                {/* Original Analysis Display - Keep existing code as fallback */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Overview</h4>
                  
                  {/* Critical Assessment */}
                  {analysisResult.critical_assessment && (
                    <Alert className={analysisResult.critical_assessment.includes('🚨') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="whitespace-pre-wrap">
                        {analysisResult.critical_assessment}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Lab Analysis Summary */}
                  {analysisResult.lab_analysis && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="text-2xl font-bold text-green-600">
                                {analysisResult.lab_analysis.normal_values.length}
                              </p>
                              <p className="text-sm text-gray-600">Normal Values</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-yellow-200">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                            <div>
                              <p className="text-2xl font-bold text-yellow-600">
                                {analysisResult.lab_analysis.abnormal_values.length}
                              </p>
                              <p className="text-sm text-gray-600">Abnormal Values</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-red-200">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <div>
                              <p className="text-2xl font-bold text-red-600">
                                {analysisResult.lab_analysis.critical_values.length}
                              </p>
                              <p className="text-sm text-gray-600">Critical Values</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Processing Info */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-5 h-5 text-blue-500" />
                          <span className="font-medium">Processing Summary</span>
                        </div>
                        <Badge variant="outline">
                          {analysisResult.processing_time?.toFixed(2)}s
                        </Badge>
                      </div>
                      {analysisResult.system_info && (
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Device:</span>
                            <span className="ml-2 font-medium">{analysisResult.system_info.device_used.toUpperCase()}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">GPU Available:</span>
                            <span className="ml-2 font-medium">
                              {analysisResult.system_info.gpu_available ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Lab Values Section */}
                {analysisResult.lab_analysis && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Lab Values</h4>
                    
                    {/* Normal Values */}
                    {analysisResult.lab_analysis.normal_values.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2 text-green-700">
                            <CheckCircle className="w-5 h-5" />
                            <span>Normal Values</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analysisResult.lab_analysis.normal_values.map((value, index) => {
                              const cleanedValue = cleanLabValue(value);
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <span className="font-medium text-green-800">{cleanedValue.test}</span>
                                  <div className="text-right">
                                    <span className="font-mono text-green-800">{cleanedValue.value} {cleanedValue.unit}</span>
                                    {cleanedValue.reference_range && (
                                      <p className="text-xs text-green-600">Normal: {cleanedValue.reference_range}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Abnormal Values */}
                    {analysisResult.lab_analysis.abnormal_values.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2 text-yellow-700">
                            <AlertCircle className="w-5 h-5" />
                            <span>Abnormal Values</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analysisResult.lab_analysis.abnormal_values.map((value, index) => {
                              const cleanedValue = cleanLabValue(value);
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div>
                                    <span className="font-medium text-yellow-800">{cleanedValue.test}</span>
                                    <Badge 
                                      variant={cleanedValue.status === 'HIGH' ? 'destructive' : 'secondary'}
                                      className="ml-2"
                                    >
                                      {cleanedValue.status}
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-yellow-800">{cleanedValue.value} {cleanedValue.unit}</span>
                                    {cleanedValue.reference_range && (
                                      <p className="text-xs text-yellow-600">Normal: {cleanedValue.reference_range}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Critical Values */}
                    {analysisResult.lab_analysis.critical_values.length > 0 && (
                      <Card className="border-red-200">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2 text-red-700">
                            <AlertTriangle className="w-5 h-5" />
                            <span>Critical Values - Immediate Attention Required</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analysisResult.lab_analysis.critical_values.map((value, index) => {
                              const cleanedValue = cleanLabValue(value);
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                                  <div>
                                    <span className="font-medium text-red-800">{cleanedValue.test}</span>
                                    <Badge variant="destructive" className="ml-2">
                                      CRITICAL
                                    </Badge>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-red-800 font-bold">{cleanedValue.value} {cleanedValue.unit}</span>
                                    {cleanedValue.reference_range && (
                                      <p className="text-xs text-red-600">Normal: {cleanedValue.reference_range}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* AI Insights Section */}
                {/* <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">AI Insights</h4>
                   */}
                  {/* Main AI Analysis */}
                  {/* {analysisResult.ai_analysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Brain className="w-5 h-5 text-blue-500" />
                          <span>AI Medical Analysis</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap">{analysisResult.ai_analysis}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )} */}

                  {/* Medication Analysis */}
                  {/* {analysisResult.medication_analysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Pill className="w-5 h-5 text-purple-500" />
                          <span>Medication Interaction Analysis</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap">{analysisResult.medication_analysis}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )} */}

                  {/* Trend Analysis */}
                  {/* {analysisResult.trend_analysis && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                          <span>Trend Analysis</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm max-w-none">
                          <div className="whitespace-pre-wrap">{analysisResult.trend_analysis}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )} */}
                {/* </div> */}
              </>
            )}
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

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lab Report Analysis</h1>
          <p className="text-gray-600 mt-1">
            Upload and analyze your medical lab reports with AI-powered insights
          </p>
        </div>
        {onBack && (
          <Button variant="blueButton" onClick={onBack}>
            ← Back to Diagnosis
          </Button>
        )}
      </div>

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

      {/* Main Content - Simplified to only show upload */}
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