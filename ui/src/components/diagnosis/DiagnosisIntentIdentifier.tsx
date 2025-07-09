import React, { useState, useEffect } from 'react';
// import { AlertCircle, X, FileText, Stethoscope } from 'lucide-react';

type Intent = 'disease_diagnosis' | 'lab_report_analysis';

interface IntentConfig {
  keywords: string[];
  phrases: string[];
  medicalTerms: string[];
  weight: number;
}

interface IntentMatch {
  service: Intent;
  confidence: number;
  matchedKeywords: string[];
  suggestedAction: string;
}

const INTENT_MAPPING: Record<Intent, IntentConfig> = {
  disease_diagnosis: {
    keywords: [
      // Symptoms
      'headache', 'fever', 'pain', 'hurt', 'ache', 'sick', 'ill', 'unwell',
      'nausea', 'vomit', 'dizzy', 'tired', 'fatigue', 'weak', 'cough',
      'sore', 'throat', 'chest', 'stomach', 'back', 'joint', 'muscle',
      'swollen', 'swelling', 'rash', 'itch', 'burn', 'sting', 'cut',
      'bleeding', 'bruise', 'bump', 'lump', 'tender', 'stiff', 'cramp',
      
      // Body parts + problems
      'leg', 'arm', 'foot', 'hand', 'head', 'neck', 'shoulder', 'knee',
      'ankle', 'wrist', 'elbow', 'hip', 'spine', 'abdomen', 'pelvis',
      'eye', 'ear', 'nose', 'mouth', 'tooth', 'gum', 'tongue',
      
      // Conditions
      'cold', 'flu', 'allergy', 'infection', 'virus', 'bacterial',
      'inflammation', 'fever', 'chills', 'sweats', 'dehydrated'
    ],
    phrases: [
      'i feel', 'i have', 'my leg is', 'my arm is', 'experiencing',
      'suffering from', 'dealing with', 'bothered by', 'trouble with',
      'not feeling', 'feeling sick', 'feeling ill', 'hurts when',
      'pain in', 'ache in', 'sore', 'tender', 'swollen'
    ],
    medicalTerms: [
      'symptoms', 'diagnosis', 'condition', 'infection', 'inflammation',
      'allergic', 'reaction', 'syndrome', 'disorder', 'disease',
      'acute', 'chronic', 'mild', 'severe', 'persistent'
    ],
    weight: 1.0
  },
  
  lab_report_analysis: {
    keywords: [
      // Lab tests
      'blood', 'urine', 'test', 'report', 'result', 'lab', 'laboratory',
      'analysis', 'analyze', 'check', 'examine', 'review', 'interpret',
      'upload', 'file', 'document', 'scan', 'image',
      
      // Specific tests
      'cbc', 'hemoglobin', 'glucose', 'cholesterol', 'thyroid', 'liver',
      'kidney', 'heart', 'diabetes', 'anemia', 'vitamin', 'mineral',
      'lipid', 'profile', 'panel', 'screening', 'biopsy', 'culture',
      'platelet', 'wbc', 'rbc', 'hba1c', 'creatinine', 'bun'
    ],
    phrases: [
      'lab report', 'test results', 'blood work', 'urine test',
      'medical report', 'lab analysis', 'check my', 'review my',
      'interpret my', 'understand my', 'upload report', 'analyze report',
      'blood test', 'lab values', 'test numbers'
    ],
    medicalTerms: [
      'pathology', 'hematology', 'biochemistry', 'microbiology',
      'serology', 'immunology', 'endocrinology', 'cardiology',
      'reference range', 'normal values', 'abnormal', 'elevated'
    ],
    weight: 1.2
  }
};

function calculateIntentConfidence(input: string, config: IntentConfig): number {
  const normalizedInput = input.toLowerCase().trim();
  let score = 0;
  let matches = 0;

  // Keyword matching (base score)
  config.keywords.forEach(keyword => {
    if (normalizedInput.includes(keyword)) {
      score += 10 * config.weight;
      matches++;
    }
  });

  // Phrase matching (higher weight)
  config.phrases.forEach(phrase => {
    if (normalizedInput.includes(phrase.toLowerCase())) {
      score += 20 * config.weight;
      matches++;
    }
  });

  // Medical term matching (highest weight)
  config.medicalTerms.forEach(term => {
    if (normalizedInput.includes(term.toLowerCase())) {
      score += 30 * config.weight;
      matches++;
    }
  });

  // Length penalty for very short inputs
  if (normalizedInput.length < 10 && matches > 0) {
    score *= 0.7;
  }

  // Boost for multiple matches
  if (matches > 2) {
    score *= 1.2;
  }

  return Math.min(score, 100); // Cap at 100
}

function detectUserIntent(input: string): IntentMatch | null {
  const results: IntentMatch[] = [];

  Object.entries(INTENT_MAPPING).forEach(([service, config]) => {
    const confidence = calculateIntentConfidence(input, config);
    
    if (confidence > 20) { // Minimum threshold
      const matchedKeywords: string[] = [];
      
      // Find matched keywords for display
      const normalizedInput = input.toLowerCase();
      [...config.keywords, ...config.phrases, ...config.medicalTerms].forEach(term => {
        if (normalizedInput.includes(term.toLowerCase())) {
          matchedKeywords.push(term);
        }
      });

      results.push({
        service: service as Intent,
        confidence,
        matchedKeywords: matchedKeywords.slice(0, 3), // Show top 3 matches
        suggestedAction: service === 'disease_diagnosis' 
          ? 'Start symptom analysis session' 
          : 'Upload lab reports for analysis'
      });
    }
  });

  // Return highest confidence match
  return results.sort((a, b) => b.confidence - a.confidence)[0] || null;
}

interface ClarificationProps {
  userInput: string;
  detectedIntent: IntentMatch;
  onConfirm: (service: string) => void;
  onReject: () => void;
}

const ClarificationPrompt: React.FC<ClarificationProps> = ({
  userInput, detectedIntent, onConfirm, onReject
}) => {
  const getServiceDescription = (service: string) => {
    switch (service) {
      case 'disease_diagnosis':
        return {
          title: "Symptom Analysis & Diagnosis",
          description: "Get a comprehensive health assessment based on your symptoms",
          action: "Start symptom analysis session",
          icon: "🩺",
          color: "red"
        };
      case 'lab_report_analysis':
        return {
          title: "Lab Report Analysis",
          description: "Upload and analyze your medical test results",
          action: "Upload lab reports",
          icon: "📋",
          color: "blue"
        };
      default:
        return null;
    }
  };

  const serviceInfo = getServiceDescription(detectedIntent.service);
  if (!serviceInfo) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">{serviceInfo.icon}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-blue-800 mb-1">
            I detected you might need: {serviceInfo.title}
          </h4>
          <p className="text-blue-700 text-sm mb-2">
            Based on: "{userInput}"
          </p>
          {detectedIntent.matchedKeywords.length > 0 && (
            <p className="text-blue-600 text-xs mb-2">
              Matched terms: {detectedIntent.matchedKeywords.join(', ')}
            </p>
          )}
          <p className="text-blue-600 text-sm mb-3">
            {serviceInfo.description}
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onConfirm(detectedIntent.service)}
              className={`bg-${serviceInfo.color}-600 text-white px-4 py-2 rounded-md text-sm hover:bg-${serviceInfo.color}-700 transition-colors`}
            >
              Yes, {serviceInfo.action}
            </button>
            <button
              onClick={onReject}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-300 transition-colors"
            >
              No, show other options
            </button>
          </div>
          
          <div className="mt-2">
            <div className="text-xs text-gray-500">
              Confidence: {Math.round(detectedIntent.confidence)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ServiceSelectorProps {
  onServiceSelect: (service: string) => void;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({ onServiceSelect }) => {
  return (
    <div className="space-y-3">
      <p className="text-gray-600 text-sm mb-3">
        I couldn't determine what you need. Please choose a service:
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => onServiceSelect('disease_diagnosis')}
          className="border border-gray-200 rounded-lg p-4 hover:border-red-500 hover:bg-red-50 transition-all text-left"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🩺</span>
            <div>
              <h4 className="font-semibold text-gray-800">Symptom Analysis</h4>
              <p className="text-sm text-gray-600">Diagnosis and Care Guide</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => onServiceSelect('lab_report_analysis')}
          className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📋</span>
            <div>
              <h4 className="font-semibold text-gray-800">Lab Report Analysis</h4>
              <p className="text-sm text-gray-600">Upload & analyze test results</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export interface DiagnosisIntentIdentifierProps {
  userInput: string;
  
  // Function props for direct service invocation
  startSession?: () => Promise<void> | void;
  setShowLabReportAnalysis?: (show: boolean) => void;
  
  // Future extensibility - add more service functions as needed
  setShowPharmacyService?: (show: boolean) => void;
  setShowTeleconsultation?: (show: boolean) => void;
  setShowHealthMonitoring?: (show: boolean) => void;
  
  // Fallback props (keep existing for backward compatibility)
  onIntentDetected?: (service: string) => void;
  onShowServiceSelector?: () => void;
}

export const DiagnosisIntentIdentifier: React.FC<DiagnosisIntentIdentifierProps> = ({
  userInput,
  startSession,
  setShowLabReportAnalysis,
  setShowPharmacyService,
  setShowTeleconsultation,
  setShowHealthMonitoring,
  onIntentDetected,
  onShowServiceSelector
}) => {
  const [showClarification, setShowClarification] = useState(false);
  const [detectedIntent, setDetectedIntent] = useState<IntentMatch | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (userInput.trim().length > 0) {
      const intent = detectUserIntent(userInput);
      
      if (intent && intent.confidence > 60) {
        // High confidence - show clarification
        setDetectedIntent(intent);
        setShowClarification(true);
        setShowFallback(false);
      } else if (intent && intent.confidence > 30) {
        // Medium confidence - still show clarification but with different messaging
        setDetectedIntent(intent);
        setShowClarification(true);
        setShowFallback(false);
      } else {
        // Low confidence - show service selector
        setShowClarification(false);
        setShowFallback(true);
      }
    }
  }, [userInput]);

  const handleConfirmIntent = async (service: string) => {
    setShowClarification(false);
    setShowFallback(false);
    
    // Use direct function props if available, otherwise fallback to callback
    if (service === 'disease_diagnosis' && startSession) {
      await startSession();
    } else if (service === 'lab_report_analysis' && setShowLabReportAnalysis) {
      setShowLabReportAnalysis(true);
    } else if (service === 'pharmacy_service' && setShowPharmacyService) {
      setShowPharmacyService(true);
    } else if (service === 'teleconsultation' && setShowTeleconsultation) {
      setShowTeleconsultation(true);
    } else if (service === 'health_monitoring' && setShowHealthMonitoring) {
      setShowHealthMonitoring(true);
    } else if (onIntentDetected) {
      // Fallback to callback pattern
      onIntentDetected(service);
    }
  };

  const handleRejectIntent = () => {
    setShowClarification(false);
    setShowFallback(true);
  };

  const handleServiceSelect = async (service: string) => {
    setShowFallback(false);
    
    // Use direct function props if available, otherwise fallback to callback
    if (service === 'disease_diagnosis' && startSession) {
      await startSession();
    } else if (service === 'lab_report_analysis' && setShowLabReportAnalysis) {
      setShowLabReportAnalysis(true);
    } else if (service === 'pharmacy_service' && setShowPharmacyService) {
      setShowPharmacyService(true);
    } else if (service === 'teleconsultation' && setShowTeleconsultation) {
      setShowTeleconsultation(true);
    } else if (service === 'health_monitoring' && setShowHealthMonitoring) {
      setShowHealthMonitoring(true);
    } else if (onIntentDetected) {
      // Fallback to callback pattern
      onIntentDetected(service);
    } else if (onShowServiceSelector) {
      // Final fallback
      onShowServiceSelector();
    }
  };

  if (showClarification && detectedIntent) {
    return (
      <ClarificationPrompt
        userInput={userInput}
        detectedIntent={detectedIntent}
        onConfirm={handleConfirmIntent}
        onReject={handleRejectIntent}
      />
    );
  }

  if (showFallback) {
    return <ServiceSelector onServiceSelect={handleServiceSelect} />;
  }

  return null;
};

export default DiagnosisIntentIdentifier;