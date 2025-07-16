export interface RoutingResult {
  step: string;
  data: any;
  shouldSendStructured: boolean;
}

export interface RoutingContext {
  lastSystemMessage: string;
  input: string;
  selectedSymptoms?: string[];
  currentInput?: string;
  currentStep?: string;
}

/**
 * Determines the appropriate step and data structure based on the system message and user input
 */
export const determineRoutingStep = (context: RoutingContext): RoutingResult => {
  const { lastSystemMessage, input, currentInput = '' } = context;
  
  // Greeting step - initial response
  if (lastSystemMessage.includes('How are you feeling today')) {
    if (input.toLowerCase() === 'lab_report_analysis') {
      return {
        step: 'greeting',
        data: { 
          response: input, 
          redirect: 'lab_report_analysis' 
        },
        shouldSendStructured: true
      };
    } else {
      return {
        step: 'greeting',
        data: { 
          response: input,
          wants_analysis: ['sick', 'ill', 'unwell', 'yes'].includes(input.toLowerCase())
        },
        shouldSendStructured: true
      };
    }
  }
  
  // Symptom analysis confirmation step
  if (lastSystemMessage.includes('Would you like to start a Symptom Analysis session?')) {
    return {
      step: 'symptom_analysis_confirmation',
      data: {
        wants_analysis: input.toLowerCase() === 'yes'
      },
      shouldSendStructured: true
    };
  }
  
  // Background traits step - person identification
  if (lastSystemMessage.includes('yourself or someone else')) {
    return {
      step: 'background_traits',
      data: {
        person_type: input.toLowerCase().includes('myself') ? 'self' : 'other',
        person_details: input
      },
      shouldSendStructured: true
    };
  }
  
  // Substances step
  if (lastSystemMessage.includes('substances') || lastSystemMessage.includes('smoking') || lastSystemMessage.includes('alcohol')) {
    return {
      step: 'substances',
      data: {
        substances: input.toLowerCase().includes('yes') ? 'yes' : 'no',
        substance_details: input
      },
      shouldSendStructured: true
    };
  }
  
  // Travel step
  if (lastSystemMessage.includes('traveled')) {
    return {
      step: 'traveled',
      data: {
        travel_history: input.toLowerCase().includes('yes') ? 'yes' : 'no',
        travel_details: input
      },
      shouldSendStructured: true
    };
  }
  
  // Symptoms step
  if (lastSystemMessage.includes('symptoms') && !lastSystemMessage.includes('start')) {
    const symptoms = input.includes(',') ? 
      input.split(',').map(s => s.trim()).filter(Boolean) : 
      [input.trim()];
    
    return {
      step: 'symptoms',
      data: {
        symptoms: symptoms,
        raw_input: input
      },
      shouldSendStructured: true
    };
  }
  
  // Timing/onset step
  if (lastSystemMessage.includes('symptoms start') || lastSystemMessage.includes('when did')) {
    return {
      step: 'symptom_onset',
      data: {
        onset: input,
        timing_details: input
      },
      shouldSendStructured: true
    };
  }
  
  // Severity step
  if (lastSystemMessage.includes('severe') || lastSystemMessage.includes('scale')) {
    const severity = parseInt(input) || parseInt(currentInput) || 5;
    return {
      step: 'pain_severity',
      data: {
        severity: severity,
        severity_description: `${severity}/10 - ${severity <= 3 ? 'Mild' : severity <= 7 ? 'Moderate' : 'Severe'}`
      },
      shouldSendStructured: true
    };
  }
  
  // Temperature step
  if (lastSystemMessage.includes('temperature') || lastSystemMessage.includes('fever')) {
    return {
      step: 'temperature',
      data: {
        temperature: input,
        fever_level: input.toLowerCase().includes('normal') ? 'normal' : 
                    input.toLowerCase().includes('low') ? 'low_grade' :
                    input.toLowerCase().includes('moderate') ? 'moderate' : 'high'
      },
      shouldSendStructured: true
    };
  }
  
  // Care/medication step
  if (lastSystemMessage.includes('doctor') || lastSystemMessage.includes('medication')) {
    return {
      step: 'care_medication',
      data: {
        medical_care: input.toLowerCase().includes('yes') ? 'yes' : 'no',
        care_details: input
      },
      shouldSendStructured: true
    };
  }
  
  // Cross-questioning step
  if (lastSystemMessage.includes('Are you experiencing')) {
    const questionedSymptom = lastSystemMessage.match(/Are you experiencing ([^?]+)/)?.[1];
    return {
      step: 'cross_questioning',
      data: {
        questioned_symptom: questionedSymptom,
        response: input.toLowerCase().includes('yes') ? 'yes' : 'no',
        symptom_confirmed: input.toLowerCase().includes('yes')
      },
      shouldSendStructured: true
    };
  }
  
  // Fallback - no structured routing needed
  return {
    step: 'fallback',
    data: { text: input },
    shouldSendStructured: false
  };
};

/**
 * Helper function to check if a message requires special UI rendering
 */
export const getMessageUIType = (message: string): string => {
  if (message.includes('How are you feeling today') || message.includes('feeling today')) {
    return 'initial_options';
  }
  if (message.includes('Would you like to start a Symptom Analysis session?')) {
    return 'yes_no_analysis';
  }
  if (message.includes('yourself or someone else')) {
    return 'person_selection';
  }
  if (message.includes('substances') || message.includes('smoking') || message.includes('alcohol')) {
    return 'yes_no_substances';
  }
  if (message.includes('traveled')) {
    return 'yes_no_travel';
  }
  if (message.includes('doctor') || message.includes('medication')) {
    return 'yes_no_medical';
  }
  if (message.includes('symptoms start') || message.includes('when did')) {
    return 'timing_options';
  }
  if (message.includes('temperature') || message.includes('fever')) {
    return 'temperature_options';
  }
  if (message.includes('severe') || message.includes('scale')) {
    return 'severity_slider';
  }
  if (message.includes('symptoms') && !message.includes('start')) {
    return 'symptom_input';
  }
  if (message.includes('Are you experiencing')) {
    return 'yes_no_symptom';
  }
  
  return 'text_input';
};