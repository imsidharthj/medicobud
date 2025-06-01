import React from 'react';

interface DiagnosisResult {
  disease: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  symptom_coverage: number;
  key_symptoms: string[];
  explanations?: string[];
}

interface SecondaryDiagnosisResult {
  disease: string;
  confidence: number;
}

interface DiagnosisData {
  diagnosis?: DiagnosisResult[];
  secondary_diagnosis?: SecondaryDiagnosisResult[];
  disclaimer?: string;
}

interface DiagnosisResultFormatterProps {
  diagnosisData?: DiagnosisData;
  message?: string;
}

// Move the formatting function here
export const formatDiagnosisResults = (diagnosisData: DiagnosisData, symptoms: string[] = []): string => {
  const { diagnosis: primaryDiagnosis, secondary_diagnosis: secondaryDiagnosis } = diagnosisData;
  
  let formattedMessage = "🩺 **MEDICAL ASSESSMENT RESULTS**\n\n";

  if (secondaryDiagnosis && secondaryDiagnosis.length > 0) {
    formattedMessage += "📋 **PRIMARY ASSESSMENT (AI-Enhanced Analysis):**\n\n";
    secondaryDiagnosis.forEach((result, index) => {
      const confidenceText = typeof result.confidence === 'number' 
        ? `${(result.confidence * 100).toFixed(1)}%` 
        : result.confidence;
      formattedMessage += `   ${index + 1}. **${result.disease}** - ${confidenceText} confidence\n`;
    });
    formattedMessage += "\n";
  }

  if (primaryDiagnosis && primaryDiagnosis.length > 0) {
    formattedMessage += "🔬 **SECONDARY ASSESSMENT (Statistical Model - Top 5):**\n\n";
    primaryDiagnosis.forEach((result, index) => {
      const severityIcon = result.severity === "high" ? "🔴" : 
                         result.severity === "medium" ? "🟡" : "🟢";
      
      formattedMessage += `   ${index + 1}. **${result.disease}** - ${result.confidence}% confidence ${severityIcon}\n`;
      formattedMessage += `      └ Symptom match: ${result.symptom_coverage}% | Severity: ${result.severity.charAt(0).toUpperCase() + result.severity.slice(1)}\n`;
      
      if (result.key_symptoms && result.key_symptoms.length > 0) {
        formattedMessage += `      └ Key symptoms: ${result.key_symptoms.slice(0, 3).join(', ')}\n`;
      }
      formattedMessage += "\n";
    });
  }

  if (symptoms.length > 0) {
    formattedMessage += "📝 **REPORTED SYMPTOMS:**\n";
    formattedMessage += `   ${symptoms.slice(0, 5).join(', ')}`;
    if (symptoms.length > 5) {
      formattedMessage += ` and ${symptoms.length - 5} more`;
    }
    formattedMessage += "\n\n";
  }

  formattedMessage += "⚠️ **IMPORTANT MEDICAL DISCLAIMER:**\n\n";
  formattedMessage += "This assessment is AI-generated for informational purposes only.\n\n";
  formattedMessage += "• NOT a substitute for professional medical advice\n";
  formattedMessage += "• Consult a qualified healthcare provider for proper diagnosis\n";
  formattedMessage += "• Seek immediate medical attention for severe or emergency symptoms";

  return formattedMessage;
};

export const DiagnosisResultFormatter: React.FC<DiagnosisResultFormatterProps> = ({ 
  diagnosisData, 
  message 
}) => {
  // If structured data is provided, use it
  if (diagnosisData) {
    return (
      <div className="space-y-2">
        <div className="font-bold text-base text-blue-800 border-b border-blue-200 pb-1 mb-1">
          MEDICAL ASSESSMENT RESULTS
        </div>
        
        {diagnosisData.diagnosis && diagnosisData.diagnosis.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-blue-700 mb-1">Primary Assessment:</h3>
            {diagnosisData.diagnosis.map((diagnosis, index) => (
              <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-2 ml-2 mb-1">
                <div className="font-semibold text-sm text-blue-900">{diagnosis.disease}</div>
                <div className="text-xs text-blue-700">Confidence: {diagnosis.confidence}%</div>
                <div className="text-xs text-gray-600">Severity: {diagnosis.severity}</div>
              </div>
            ))}
          </div>
        )}
        
        {diagnosisData.disclaimer && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
            ⚠️ {diagnosisData.disclaimer}
          </div>
        )}
      </div>
    );
  }

  // Fall back to string parsing for existing formatted messages
  if (message) {
    const lines = message.split('\n');
    
    const lineRenderers = [
      {
        match: (line: string) => line.includes('**') && 
          /MEDICAL ASSESSMENT|PRIMARY ASSESSMENT|SECONDARY ASSESSMENT|REPORTED SYMPTOMS|MEDICAL DISCLAIMER/.test(line),
        render: (line: string, index: number) => {
          const cleanLine = line.replace(/\*\*/g, '').trim();
          return (
            <div key={index} className="font-bold text-base text-blue-800 border-b border-blue-200 pb-1 mb-1">
              {cleanLine}
            </div>
          );
        }
      },
      {
        match: (line: string) => Boolean(line.match(/^\s+\d+\.\s/)),
        render: (line: string, index: number) => {
          const parts = line.split(' - ');
          const diseaseMatch = parts[0].match(/\d+\.\s\*\*(.*?)\*\*/);
          const diseaseName = diseaseMatch ? diseaseMatch[1] : parts[0];
          const confidence = parts[1] || '';
          
          return (
            <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-2 ml-2 mb-1">
              <div className="font-semibold text-sm text-blue-900">{diseaseName}</div>
              <div className="text-xs text-blue-700">{confidence}</div>
            </div>
          );
        }
      },
      {
        match: (line: string) => line.includes('└'),
        render: (line: string, index: number) => (
          <div key={index} className="text-xs text-gray-600 ml-6 pl-2 border-l-2 border-gray-200">
            {line.replace('└', '').trim()}
          </div>
        )
      },
      {
        match: (line: string) => line.trim().startsWith('•'),
        render: (line: string, index: number) => (
          <div key={index} className="flex items-start ml-3">
            <span className="text-orange-500 mr-1 text-xs">•</span>
            <span className="text-gray-700 text-xs">{line.replace('•', '').trim()}</span>
          </div>
        )
      },
      {
        match: (line: string) => line.includes('📝') && !line.includes('**'),
        render: (line: string, index: number) => (
          <div key={index} className="bg-green-50 border border-green-200 rounded p-2 ml-2">
            <span className="text-green-800 text-xs">{line.trim()}</span>
          </div>
        )
      },
      {
        match: (line: string, index: number, lines: string[]) => 
          line.includes('⚠️') || (index > 0 && lines[index-1].includes('DISCLAIMER')),
        render: (line: string, index: number) => (
          <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
            {line.trim()}
          </div>
        )
      },
      {
        match: (line: string) => line.trim().length > 0,
        render: (line: string, index: number) => (
          <div key={index} className="text-gray-700 text-xs">
            {line.trim()}
          </div>
        )
      }
    ];

    return (
      <div className="space-y-1">
        {lines.map((line, index) => {
          const renderer = lineRenderers.find(r => r.match(line, index, lines));
          return renderer 
            ? renderer.render(line, index) 
            : <div key={index} className="h-0.5"></div>;
        })}
      </div>
    );
  }

  return null;
};

export default DiagnosisResultFormatter;