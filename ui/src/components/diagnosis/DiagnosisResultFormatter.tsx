import React from "react";

// Legacy interfaces for backward compatibility
interface DiagnosisResult {
  disease: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  symptom_coverage: number;
  key_symptoms: string[];
  explanations?: string[];
}

interface SecondaryDiagnosisResult {
  disease: string;
  confidence: number;
}

interface LegacyDiagnosisData {
  diagnosis?: DiagnosisResult[];
  secondary_diagnosis?: SecondaryDiagnosisResult[];
  disclaimer?: string;
}

// New interfaces for enhanced backend response
interface PossibleCondition {
  condition: string;
  confidence_percent: number;
  severity: "low" | "medium" | "high";
  symptom_coverage_percent: number;
  key_symptoms: string[];
  explanation: string;
}

interface RiskAssessment {
  urgency_level: "low" | "medium" | "high";
  red_flags: string[];
  advice: string;
}

interface FollowUp {
  monitor: string[];
  timeline: string;
  next_steps: string;
}

interface NewDiagnosisData {
  possible_conditions: PossibleCondition[];
  treatment_plan: string[];
  risk_assessment: RiskAssessment;
  follow_up: FollowUp;
}

// Union type to handle both formats
type DiagnosisData = LegacyDiagnosisData | NewDiagnosisData;

interface DiagnosisResultFormatterProps {
  diagnosisData?: DiagnosisData;
  message?: string;
}

// Type guards to check which format we're dealing with
const isNewFormat = (data: DiagnosisData): data is NewDiagnosisData => {
  return "possible_conditions" in data;
};

const isLegacyFormat = (data: DiagnosisData): data is LegacyDiagnosisData => {
  return "diagnosis" in data || "secondary_diagnosis" in data;
};

// Enhanced formatting function to handle both old and new formats
export const formatDiagnosisResults = (
  diagnosisData: DiagnosisData,
  symptoms: string[] = []
): string => {
  let formattedMessage = "🩺 **MEDICAL ASSESSMENT RESULTS**\n\n";

  // Debug logging
  console.log("Formatting diagnosis data:", diagnosisData);
  console.log("Is new format:", isNewFormat(diagnosisData));
  console.log("Is legacy format:", isLegacyFormat(diagnosisData));

  if (isNewFormat(diagnosisData)) {
    // Handle new format
    const { possible_conditions, treatment_plan, risk_assessment, follow_up } =
      diagnosisData;

    // Possible Conditions Section
    if (possible_conditions && possible_conditions.length > 0) {
      formattedMessage += "🔍 **POSSIBLE CONDITIONS:**\n\n";
      possible_conditions.forEach((condition, index) => {
        const severityIcon =
          condition.severity === "high"
            ? "🔴"
            : condition.severity === "medium"
            ? "🟡"
            : "🟢";

        formattedMessage += `   ${index + 1}. **${
          condition.condition
        }** - ${condition.confidence_percent.toFixed(
          1
        )}% confidence ${severityIcon}\n`;
        formattedMessage += `      └ Symptom match: ${
          condition.symptom_coverage_percent
        }% | Severity: ${
          condition.severity.charAt(0).toUpperCase() +
          condition.severity.slice(1)
        }\n`;

        if (condition.key_symptoms && condition.key_symptoms.length > 0) {
          formattedMessage += `      └ Key symptoms: ${condition.key_symptoms
            .slice(0, 3)
            .join(", ")}\n`;
        }

        if (condition.explanation) {
          formattedMessage += `      └ ${condition.explanation}\n`;
        }
        formattedMessage += "\n";
      });
    }

    // Treatment Plan Section
    if (treatment_plan && treatment_plan.length > 0) {
      formattedMessage += "💊 **TREATMENT RECOMMENDATIONS:**\n\n";
      treatment_plan.forEach((treatment) => {
        formattedMessage += `   • ${treatment}\n`;
      });
      formattedMessage += "\n";
    }

    // Risk Assessment Section
    if (risk_assessment) {
      const urgencyIcon =
        risk_assessment.urgency_level === "high"
          ? "🚨"
          : risk_assessment.urgency_level === "medium"
          ? "⚠️"
          : "ℹ️";

      formattedMessage += `${urgencyIcon} **RISK ASSESSMENT:**\n\n`;
      formattedMessage += `   Urgency Level: ${risk_assessment.urgency_level.toUpperCase()}\n\n`;

      if (risk_assessment.red_flags && risk_assessment.red_flags.length > 0) {
        formattedMessage += "   🚩 **Red Flags:**\n";
        risk_assessment.red_flags.forEach((flag) => {
          formattedMessage += `      • ${flag}\n`;
        });
        formattedMessage += "\n";
      }

      if (risk_assessment.advice) {
        formattedMessage += `   📋 **Advice:** ${risk_assessment.advice}\n\n`;
      }
    }

    // Follow-up Section
    if (follow_up) {
      formattedMessage += "📅 **FOLLOW-UP CARE:**\n\n";

      if (follow_up.monitor && follow_up.monitor.length > 0) {
        formattedMessage += "   🔍 **Monitor:**\n";
        follow_up.monitor.forEach((item) => {
          formattedMessage += `      • ${item}\n`;
        });
        formattedMessage += "\n";
      }

      if (follow_up.timeline) {
        formattedMessage += `   ⏰ **Timeline:** ${follow_up.timeline}\n\n`;
      }

      if (follow_up.next_steps) {
        formattedMessage += `   👩‍⚕️ **Next Steps:** ${follow_up.next_steps}\n\n`;
      }
    }
  } else if (isLegacyFormat(diagnosisData)) {
    // Handle legacy format
    const {
      diagnosis: primaryDiagnosis,
      secondary_diagnosis: secondaryDiagnosis,
    } = diagnosisData;

    if (secondaryDiagnosis && secondaryDiagnosis.length > 0) {
      formattedMessage +=
        "📋 **PRIMARY ASSESSMENT (AI-Enhanced Analysis):**\n\n";
      secondaryDiagnosis.forEach((result, index) => {
        const confidenceText =
          typeof result.confidence === "number"
            ? `${(result.confidence * 100).toFixed(1)}%`
            : result.confidence;
        formattedMessage += `   ${index + 1}. **${
          result.disease
        }** - ${confidenceText} confidence\n`;
      });
      formattedMessage += "\n";
    }

    if (primaryDiagnosis && primaryDiagnosis.length > 0) {
      formattedMessage +=
        "🔬 **SECONDARY ASSESSMENT (Statistical Model - Top 5):**\n\n";
      primaryDiagnosis.forEach((result, index) => {
        const severityIcon =
          result.severity === "high"
            ? "🔴"
            : result.severity === "medium"
            ? "🟡"
            : "🟢";

        formattedMessage += `   ${index + 1}. **${result.disease}** - ${
          result.confidence
        }% confidence ${severityIcon}\n`;
        formattedMessage += `      └ Symptom match: ${
          result.symptom_coverage
        }% | Severity: ${
          result.severity.charAt(0).toUpperCase() + result.severity.slice(1)
        }\n`;

        if (result.key_symptoms && result.key_symptoms.length > 0) {
          formattedMessage += `      └ Key symptoms: ${result.key_symptoms
            .slice(0, 3)
            .join(", ")}\n`;
        }
        formattedMessage += "\n";
      });
    }
  } else {
    // Fallback for unexpected format
    console.warn("Unexpected diagnosis data format:", diagnosisData);
    formattedMessage += "📋 **DIAGNOSIS DATA (Raw):**\n\n";
    formattedMessage += "```json\n";
    formattedMessage += JSON.stringify(diagnosisData, null, 2);
    formattedMessage += "\n```\n\n";
  }

  // Reported Symptoms Section (common for both formats)
  if (symptoms.length > 0) {
    formattedMessage += "📝 **REPORTED SYMPTOMS:**\n";
    formattedMessage += `   ${symptoms.slice(0, 5).join(", ")}`;
    if (symptoms.length > 5) {
      formattedMessage += ` and ${symptoms.length - 5} more`;
    }
    formattedMessage += "\n\n";
  }

  // Medical Disclaimer (common for both formats)
  formattedMessage += "⚠️ **IMPORTANT MEDICAL DISCLAIMER:**\n\n";
  formattedMessage +=
    "This assessment is AI-generated for informational purposes only.\n\n";
  formattedMessage += "• NOT a substitute for professional medical advice\n";
  formattedMessage +=
    "• Consult a qualified healthcare provider for proper diagnosis\n";
  formattedMessage +=
    "• Seek immediate medical attention for severe or emergency symptoms";

  return formattedMessage;
};

export const DiagnosisResultFormatter: React.FC<DiagnosisResultFormatterProps> =
  React.memo(({ diagnosisData, message }) => {
    // Prioritize structured data over message string
    if (diagnosisData) {
      // Validate structured data
      if (
        typeof diagnosisData !== "object" ||
        !isNewFormat(diagnosisData) || !diagnosisData.possible_conditions
      ) {
        console.warn("Invalid diagnosis data format:", diagnosisData);
        console.warn(
          "Expected object with possible_conditions, received:",
          typeof diagnosisData,
          diagnosisData
        );

        // Fall back to string parsing if available
        if (message) {
          console.info("Falling back to string parsing for diagnosis data");
          return <DiagnosisResultFormatter message={message} />;
        }

        // Show error state with debug info
        return (
          <div className="space-y-3">
            <div className="font-bold text-base text-red-800 border-b border-red-200 pb-1 mb-2">
              ⚠️ DIAGNOSIS DATA ERROR
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-800">
              <div className="mb-2">
                Unable to display diagnosis results due to data format issues.
              </div>
              <div className="text-xs text-red-600">
                Debug: Expected structured data with 'possible_conditions' field
              </div>
              <div className="mt-2">
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded border border-red-300"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Log successful structured data processing
      console.info(
        "Processing structured diagnosis data with",
        diagnosisData.possible_conditions?.length || 0,
        "conditions"
      );
      return (
        <div
          className="space-y-3"
          role="region"
          aria-label="Medical Assessment Results"
        >
          <div className="font-bold text-base text-blue-800 border-b border-blue-200 pb-1 mb-2">
            🩺 MEDICAL ASSESSMENT RESULTS
          </div>

          {isNewFormat(diagnosisData) && (
            <>
              {/* Possible Conditions */}
              {diagnosisData.possible_conditions &&
                diagnosisData.possible_conditions.length > 0 && (
                  <section
                    className="space-y-2"
                    aria-labelledby="possible-conditions-heading"
                  >
                    <h3
                      id="possible-conditions-heading"
                      className="font-semibold text-sm text-blue-700 mb-2"
                    >
                      🔍 Possible Conditions:
                    </h3>
                    {diagnosisData.possible_conditions.map(
                      (condition, index) => {
                        const severityColor =
                          condition.severity === "high"
                            ? "border-red-400 bg-red-50"
                            : condition.severity === "medium"
                            ? "border-yellow-400 bg-yellow-50"
                            : "border-green-400 bg-green-50";
                        const severityIcon =
                          condition.severity === "high"
                            ? "🔴"
                            : condition.severity === "medium"
                            ? "🟡"
                            : "🟢";

                        return (
                          <div
                            key={index}
                            className={`${severityColor} border-l-4 p-3 ml-2 mb-2 rounded-r`}
                          >
                            <div className="font-semibold text-sm text-gray-900 flex items-center">
                              {severityIcon} {condition.condition}
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {condition.confidence_percent.toFixed(1)}%
                                confidence
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              Symptom match:{" "}
                              {condition.symptom_coverage_percent}% | Severity:{" "}
                              {condition.severity}
                            </div>
                            {condition.key_symptoms &&
                              condition.key_symptoms.length > 0 && (
                                <div className="text-xs text-gray-600 mt-1">
                                  Key symptoms:{" "}
                                  {condition.key_symptoms
                                    .slice(0, 3)
                                    .join(", ")}
                                </div>
                              )}
                            {condition.explanation && (
                              <div className="text-xs text-gray-700 mt-2 italic">
                                {condition.explanation}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </section>
                )}

              {/* Treatment Plan */}
              {diagnosisData.treatment_plan &&
                diagnosisData.treatment_plan.length > 0 && (
                  <section
                    className="bg-green-50 border border-green-200 rounded p-3"
                    aria-labelledby="treatment-heading"
                  >
                    <h3
                      id="treatment-heading"
                      className="font-semibold text-sm text-green-700 mb-2"
                    >
                      💊 Treatment Recommendations:
                    </h3>
                    <ul className="space-y-1">
                      {diagnosisData.treatment_plan.map((treatment, index) => (
                        <li
                          key={index}
                          className="text-xs text-green-800 flex items-start"
                        >
                          <span className="mr-2">•</span>
                          <span>{treatment}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

              {/* Risk Assessment */}
              {diagnosisData.risk_assessment && (
                <section
                  className={`border rounded p-3 ${
                    diagnosisData.risk_assessment.urgency_level === "high"
                      ? "bg-red-50 border-red-200"
                      : diagnosisData.risk_assessment.urgency_level === "medium"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-blue-50 border-blue-200"
                  }`}
                  aria-labelledby="risk-assessment-heading"
                >
                  <h3
                    id="risk-assessment-heading"
                    className="font-semibold text-sm mb-2"
                  >
                    {diagnosisData.risk_assessment.urgency_level === "high"
                      ? "🚨"
                      : diagnosisData.risk_assessment.urgency_level === "medium"
                      ? "⚠️"
                      : "ℹ️"}
                    Risk Assessment
                  </h3>
                  <div className="text-xs mb-2">
                    <span className="font-medium">Urgency Level: </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        diagnosisData.risk_assessment.urgency_level === "high"
                          ? "bg-red-100 text-red-800"
                          : diagnosisData.risk_assessment.urgency_level ===
                            "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {diagnosisData.risk_assessment.urgency_level.toUpperCase()}
                    </span>
                  </div>

                  {diagnosisData.risk_assessment.red_flags &&
                    diagnosisData.risk_assessment.red_flags.length > 0 && (
                      <div className="mb-2">
                        <div className="font-medium text-xs text-red-700 mb-1">
                          🚩 Red Flags:
                        </div>
                        <ul className="space-y-1">
                          {diagnosisData.risk_assessment.red_flags.map(
                            (flag, index) => (
                              <li
                                key={index}
                                className="text-xs text-red-800 flex items-start"
                              >
                                <span className="mr-2">•</span>
                                <span>{flag}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {diagnosisData.risk_assessment.advice && (
                    <div className="text-xs text-gray-700 italic">
                      📋 {diagnosisData.risk_assessment.advice}
                    </div>
                  )}
                </section>
              )}

              {/* Follow-up Care */}
              {diagnosisData.follow_up && (
                <section
                  className="bg-purple-50 border border-purple-200 rounded p-3"
                  aria-labelledby="followup-heading"
                >
                  <h3
                    id="followup-heading"
                    className="font-semibold text-sm text-purple-700 mb-2"
                  >
                    📅 Follow-up Care:
                  </h3>

                  {diagnosisData.follow_up.monitor &&
                    diagnosisData.follow_up.monitor.length > 0 && (
                      <div className="mb-2">
                        <div className="font-medium text-xs text-purple-700 mb-1">
                          🔍 Monitor:
                        </div>
                        <ul className="space-y-1">
                          {diagnosisData.follow_up.monitor.map(
                            (item, index) => (
                              <li
                                key={index}
                                className="text-xs text-purple-800 flex items-start"
                              >
                                <span className="mr-2">•</span>
                                <span>{item}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {diagnosisData.follow_up.timeline && (
                    <div className="text-xs text-purple-800 mb-1">
                      <span className="font-medium">⏰ Timeline: </span>
                      {diagnosisData.follow_up.timeline}
                    </div>
                  )}

                  {diagnosisData.follow_up.next_steps && (
                    <div className="text-xs text-purple-800">
                      <span className="font-medium">👩‍⚕️ Next Steps: </span>
                      {diagnosisData.follow_up.next_steps}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {isLegacyFormat(diagnosisData) && (
            <>
              {diagnosisData.diagnosis &&
                diagnosisData.diagnosis.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-blue-700 mb-1">
                      Primary Assessment:
                    </h3>
                    {diagnosisData.diagnosis.map((diagnosis, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 border-l-4 border-blue-400 p-2 ml-2 mb-1"
                      >
                        <div className="font-semibold text-sm text-blue-900">
                          {diagnosis.disease}
                        </div>
                        <div className="text-xs text-blue-700">
                          Confidence: {diagnosis.confidence}%
                        </div>
                        <div className="text-xs text-gray-600">
                          Severity: {diagnosis.severity}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              {diagnosisData.disclaimer && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
                  ⚠️ {diagnosisData.disclaimer}
                </div>
              )}
            </>
          )}

          {/* Medical Disclaimer */}
          <section
            className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800"
            aria-labelledby="disclaimer-heading"
            role="alert"
          >
            <div id="disclaimer-heading" className="font-medium mb-1">
              ⚠️ IMPORTANT MEDICAL DISCLAIMER:
            </div>
            <div className="space-y-1">
              <div>
                • This assessment is AI-generated for informational purposes
                only
              </div>
              <div>• NOT a substitute for professional medical advice</div>
              <div>
                • Consult a qualified healthcare provider for proper diagnosis
              </div>
              <div>
                • Seek immediate medical attention for severe or emergency
                symptoms
              </div>
            </div>
          </section>
        </div>
      );
    }

    // Fall back to string parsing for existing formatted messages
    if (message) {
      const lines = message.split("\n");

      const lineRenderers = [
        {
          match: (line: string) =>
            line.includes("**") &&
            /MEDICAL ASSESSMENT|PRIMARY ASSESSMENT|SECONDARY ASSESSMENT|REPORTED SYMPTOMS|MEDICAL DISCLAIMER/.test(
              line
            ),
          render: (line: string, index: number) => {
            const cleanLine = line.replace(/\*\*/g, "").trim();
            return (
              <div
                key={index}
                className="font-bold text-base text-blue-800 border-b border-blue-200 pb-1 mb-1"
              >
                {cleanLine}
              </div>
            );
          },
        },
        {
          match: (line: string) => Boolean(line.match(/^\s+\d+\.\s/)),
          render: (line: string, index: number) => {
            const parts = line.split(" - ");
            const diseaseMatch = parts[0].match(/\d+\.\s\*\*(.*?)\*\*/);
            const diseaseName = diseaseMatch ? diseaseMatch[1] : parts[0];
            const confidence = parts[1] || "";

            return (
              <div
                key={index}
                className="bg-blue-50 border-l-4 border-blue-400 p-2 ml-2 mb-1"
              >
                <div className="font-semibold text-sm text-blue-900">
                  {diseaseName}
                </div>
                <div className="text-xs text-blue-700">{confidence}</div>
              </div>
            );
          },
        },
        {
          match: (line: string) => line.includes("└"),
          render: (line: string, index: number) => (
            <div
              key={index}
              className="text-xs text-gray-600 ml-6 pl-2 border-l-2 border-gray-200"
            >
              {line.replace("└", "").trim()}
            </div>
          ),
        },
        {
          match: (line: string) => line.trim().startsWith("•"),
          render: (line: string, index: number) => (
            <div key={index} className="flex items-start ml-3">
              <span className="text-orange-500 mr-1 text-xs">•</span>
              <span className="text-gray-700 text-xs">
                {line.replace("•", "").trim()}
              </span>
            </div>
          ),
        },
        {
          match: (line: string) => line.includes("📝") && !line.includes("**"),
          render: (line: string, index: number) => (
            <div
              key={index}
              className="bg-green-50 border border-green-200 rounded p-2 ml-2"
            >
              <span className="text-green-800 text-xs">{line.trim()}</span>
            </div>
          ),
        },
        {
          match: (line: string, index: number, lines: string[]) =>
            line.includes("⚠️") ||
            (index > 0 && lines[index - 1].includes("DISCLAIMER")),
          render: (line: string, index: number) => (
            <div
              key={index}
              className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800"
            >
              {line.trim()}
            </div>
          ),
        },
        {
          match: (line: string) => line.trim().length > 0,
          render: (line: string, index: number) => (
            <div key={index} className="text-gray-700 text-xs">
              {line.trim()}
            </div>
          ),
        },
      ];

      return (
        <div className="space-y-1">
          {lines.map((line, index) => {
            const renderer = lineRenderers.find((r) =>
              r.match(line, index, lines)
            );
            return renderer ? (
              renderer.render(line, index)
            ) : (
              <div key={index} className="h-0.5"></div>
            );
          })}
        </div>
      );
    }

    return null;
  });

export default DiagnosisResultFormatter;
