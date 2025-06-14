"""
Medical Prompt Templates Module
Contains specialized prompt templates for medical lab report analysis
"""

import json
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate

class MedicalPromptTemplates:
    """Medical-specific prompt templates for LLM analysis"""
    
    # Main lab analysis template
    LAB_ANALYSIS_TEMPLATE = """You are MedicoBud, a specialized medical AI assistant for laboratory report analysis.

**IMPORTANT MEDICAL DISCLAIMER**: This analysis is for informational purposes only and should NOT replace professional medical consultation, diagnosis, or treatment.

## Lab Report Data Analysis

**Raw Extracted Text**: 
{lab_text}

**Medical Entities Detected**: 
{medical_entities}

**Lab Values Identified**: 
{lab_values}

**Additional Quantities Found**: 
{quantities}

**Lab Values Analysis**:
{lab_analysis}

## Please provide a comprehensive medical analysis with the following sections:

### 1. TEST RESULTS SUMMARY
- List all identified laboratory tests with their values and units
- Identify reference ranges where mentioned in the report
- Note any missing, unclear, or potentially misread values
- Highlight data quality issues if any

### 2. ABNORMAL FINDINGS ASSESSMENT
- Flag any values that appear outside typical normal ranges
- Classify deviations as: **MILD**, **MODERATE**, or **SEVERE**
- Highlight any **CRITICAL** values requiring immediate medical attention
- Consider age, gender, and other factors that might affect normal ranges

### 3. CLINICAL SIGNIFICANCE & INTERPRETATION
- Explain what abnormal values might indicate medically
- Discuss potential correlations between different test results
- Note any patterns that might suggest specific conditions or syndromes
- Explain the clinical relevance of each finding

### 4. HEALTH IMPLICATIONS
- Describe potential health implications in clear, patient-friendly language
- Explain why certain values are important for health monitoring
- Discuss how lifestyle factors might influence these results
- Address any potential concerns or reassuring findings

### 5. RECOMMENDATIONS & NEXT STEPS
- Suggest appropriate follow-up actions (retesting, specialist consultation)
- Recommend lifestyle modifications if applicable
- Indicate urgency level for medical consultation (routine, urgent, immediate)
- Suggest additional tests that might be helpful

### 6. IMPORTANT LIMITATIONS & DISCLAIMERS
- Emphasize that this AI analysis cannot replace professional medical expertise
- Note any limitations in the analysis due to incomplete or unclear data
- Stress the importance of consulting with healthcare professionals
- Mention that individual patient context is crucial for proper interpretation

**Response Guidelines:**
- Use clear, patient-friendly language while maintaining medical accuracy
- Include specific numerical values and units when discussing results
- Avoid definitive diagnoses - use terms like "may indicate", "could suggest", "might be associated with"
- Always emphasize the importance of professional medical interpretation
- Be thorough but not alarming - balance accuracy with appropriate concern level
"""

    # Critical values assessment template
    CRITICAL_VALUES_TEMPLATE = """You are MedicoBud's emergency assessment module. Your role is to identify CRITICAL LAB VALUES that require immediate medical attention.

**Lab Data for Critical Assessment**: 
{lab_data}

**CRITICAL VALUE RANGES TO ASSESS:**

**Immediately Life-Threatening Ranges:**
- **Glucose**: <50 or >400 mg/dL
- **Hemoglobin**: <7 or >20 g/dL  
- **Platelets**: <20,000 or >1,000,000 /μL
- **Creatinine**: >5.0 mg/dL
- **Potassium**: <2.5 or >6.0 mEq/L
- **Sodium**: <125 or >155 mEq/L
- **WBC**: <1.0 or >50.0 K/uL
- **Calcium**: <7.0 or >12.0 mg/dL
- **pH**: <7.20 or >7.60 (if available)

**For EACH CRITICAL finding identified:**

🚨 **CRITICAL ALERT: [Test Name]**
1. **Value Found**: [Exact value with units]
2. **Normal Range**: [Standard reference range]
3. **Why This Is Life-Threatening**: [Medical explanation of immediate danger]
4. **Immediate Action Required**: 
   - Emergency Room visit IMMEDIATELY
   - Call 911 if symptoms present
   - Do not delay medical care
5. **Potential Consequences if Untreated**: [Serious complications that could occur]
6. **Symptoms to Watch For**: [Warning signs patient should monitor]

**If NO critical values are identified:**
✅ **No immediately life-threatening values identified in this analysis.**

**IMPORTANT EMERGENCY PROTOCOLS:**
- ANY critical value requires IMMEDIATE medical attention
- Do not wait for symptoms to appear
- This is a medical emergency screening tool
- When in doubt, seek immediate medical care
- Critical values can be fatal if not treated promptly

**Remember**: This assessment is for emergency screening only. Professional medical evaluation is essential for any concerning lab results.
"""

    # Trend analysis template
    TREND_ANALYSIS_TEMPLATE = """You are MedicoBud's trend analysis specialist. Analyze changes in lab values over time to identify patterns and trends.

**Current Lab Results**:
{current_results}

**Previous Lab Results** (if available):
{previous_results}

**Time Period**: {time_period}

## Trend Analysis Report:

### 1. VALUE CHANGES OVER TIME
For each lab test, identify:
- Direction of change (improving, worsening, stable)
- Rate of change (rapid, gradual, minimal)
- Clinical significance of the trend

### 2. PATTERN RECOGNITION
- Identify any concerning patterns
- Note improvements in health markers
- Highlight values moving toward or away from normal ranges

### 3. TREND INTERPRETATION
- Explain what these trends might indicate about health status
- Discuss whether trends suggest treatment effectiveness
- Note any cyclical or seasonal patterns if applicable

### 4. MONITORING RECOMMENDATIONS
- Suggest optimal frequency for retesting
- Identify which values need closer monitoring
- Recommend when to seek medical review based on trends

If no previous results available, respond: "No previous lab results provided for trend analysis. Single-point analysis completed instead."
"""

    # Medication interaction template
    MEDICATION_INTERACTION_TEMPLATE = """You are MedicoBud's medication interaction specialist. Analyze how medications might affect lab results.

**Lab Results**:
{lab_results}

**Current Medications** (if provided):
{medications}

**Analysis Focus:**

### 1. MEDICATION EFFECTS ON LAB VALUES
- Identify which medications could influence specific lab results
- Explain expected vs. unexpected changes due to medications
- Note any values that might be medication-related

### 2. DRUG-LAB INTERACTIONS
- Highlight potential medication-induced changes
- Distinguish between therapeutic effects and side effects
- Note any values requiring medication adjustment

### 3. MONITORING RECOMMENDATIONS
- Suggest which lab values need frequent monitoring due to medications
- Identify early warning signs of medication toxicity
- Recommend timing of lab draws relative to medication doses

If no medications provided, focus only on general lab interpretation without medication context.
"""

class PromptManager:
    """Manages prompt templates and provides formatted prompts"""
    
    def __init__(self):
        self.templates = MedicalPromptTemplates()
    
    def get_lab_analysis_prompt(self, lab_data: Dict[str, Any]) -> ChatPromptTemplate:
        """Get formatted lab analysis prompt"""
        prompt = ChatPromptTemplate.from_template(
            self.templates.LAB_ANALYSIS_TEMPLATE
        )
        return prompt
    
    def get_critical_values_prompt(self, lab_data: Dict[str, Any]) -> ChatPromptTemplate:
        """Get formatted critical values assessment prompt"""
        prompt = ChatPromptTemplate.from_template(
            self.templates.CRITICAL_VALUES_TEMPLATE
        )
        return prompt
    
    def get_trend_analysis_prompt(self, current_results: Dict[str, Any], 
                                 previous_results: Dict[str, Any] = None,
                                 time_period: str = "Not specified") -> ChatPromptTemplate:
        """Get formatted trend analysis prompt"""
        prompt = ChatPromptTemplate.from_template(
            self.templates.TREND_ANALYSIS_TEMPLATE
        )
        return prompt
    
    def get_medication_interaction_prompt(self, lab_results: Dict[str, Any],
                                        medications: List[str] = None) -> ChatPromptTemplate:
        """Get formatted medication interaction prompt"""
        prompt = ChatPromptTemplate.from_template(
            self.templates.MEDICATION_INTERACTION_TEMPLATE
        )
        return prompt
    
    def format_lab_data_for_prompt(self, lab_data: Dict[str, Any]) -> Dict[str, str]:
        """Format lab data for use in prompts"""
        return {
            "lab_text": lab_data.get("raw_text", "")[:2000],  # Limit text length
            "medical_entities": self._format_entities(lab_data.get("medical_entities", [])),
            "lab_values": self._format_lab_values(lab_data.get("lab_values", {})),
            "quantities": ", ".join(lab_data.get("quantities", [])),
            "lab_analysis": self._format_lab_analysis(lab_data.get("lab_analysis", {}))
        }
    
    def _format_entities(self, entities: List[Dict[str, Any]]) -> str:
        """Format medical entities for prompt display"""
        if not entities:
            return "No medical entities detected"
        
        formatted = []
        for entity in entities[:20]:  # Limit to first 20 entities
            confidence = entity.get('confidence', 0)
            formatted.append(f"- {entity.get('text', 'N/A')} ({entity.get('category', 'Unknown')}) [Confidence: {confidence:.2f}]")
        
        return "\n".join(formatted)
    
    def _format_lab_values(self, lab_values: Dict[str, Any]) -> str:
        """Format lab values for prompt display"""
        if not lab_values:
            return "No lab values detected"
        
        formatted = []
        for test_name, values in lab_values.items():
            if isinstance(values, list) and values:
                for value, unit in values:
                    formatted.append(f"- {test_name.title()}: {value} {unit}")
            else:
                formatted.append(f"- {test_name.title()}: {values}")
        
        return "\n".join(formatted)
    
    def _format_lab_analysis(self, lab_analysis: Dict[str, Any]) -> str:
        """Format lab analysis results for prompt display"""
        if not lab_analysis:
            return "No lab analysis available"
        
        formatted = []
        
        # Normal values
        normal = lab_analysis.get("normal_values", [])
        if normal:
            formatted.append(f"**Normal Values ({len(normal)}):**")
            for item in normal[:5]:  # Limit display
                formatted.append(f"- {item.get('test', 'N/A')}: {item.get('value', 'N/A')} {item.get('unit', '')}")
        
        # Abnormal values
        abnormal = lab_analysis.get("abnormal_values", [])
        if abnormal:
            formatted.append(f"\n**Abnormal Values ({len(abnormal)}):**")
            for item in abnormal:
                status = item.get('status', 'ABNORMAL')
                formatted.append(f"- {item.get('test', 'N/A')}: {item.get('value', 'N/A')} {item.get('unit', '')} [{status}]")
        
        # Critical values
        critical = lab_analysis.get("critical_values", [])
        if critical:
            formatted.append(f"\n**🚨 CRITICAL Values ({len(critical)}):**")
            for item in critical:
                formatted.append(f"- {item.get('test', 'N/A')}: {item.get('value', 'N/A')} {item.get('unit', '')} [CRITICAL]")
        
        return "\n".join(formatted) if formatted else "No detailed analysis available"
    
    def create_custom_prompt(self, template: str, variables: Dict[str, Any]) -> ChatPromptTemplate:
        """Create a custom prompt template"""
        return ChatPromptTemplate.from_template(template)
    
    def get_available_templates(self) -> List[str]:
        """Get list of available template names"""
        return [
            "LAB_ANALYSIS_TEMPLATE",
            "CRITICAL_VALUES_TEMPLATE", 
            "TREND_ANALYSIS_TEMPLATE",
            "MEDICATION_INTERACTION_TEMPLATE"
        ]
    
    def validate_prompt_data(self, lab_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean lab data for prompts"""
        validated_data = {
            "raw_text": str(lab_data.get("raw_text", ""))[:3000],  # Limit text length
            "medical_entities": lab_data.get("medical_entities", []),
            "lab_values": lab_data.get("lab_values", {}),
            "quantities": lab_data.get("quantities", []),
            "spacy_entities": lab_data.get("spacy_entities", []),
            "lab_analysis": lab_data.get("lab_analysis", {}),
            "processing_info": lab_data.get("processing_info", {})
        }
        
        # Ensure medical_entities is a list
        if not isinstance(validated_data["medical_entities"], list):
            validated_data["medical_entities"] = []
        
        # Ensure lab_values is a dict
        if not isinstance(validated_data["lab_values"], dict):
            validated_data["lab_values"] = {}
        
        # Ensure quantities is a list
        if not isinstance(validated_data["quantities"], list):
            validated_data["quantities"] = []
        
        return validated_data

# Usage example and testing
if __name__ == "__main__":
    prompt_manager = PromptManager()
    
    # Test data
    sample_lab_data = {
        "raw_text": "Glucose: 145 mg/dL, Hemoglobin: 12.5 g/dL, Cholesterol: 220 mg/dL",
        "medical_entities": [
            {"text": "glucose", "category": "lab_test", "confidence": 0.95},
            {"text": "hemoglobin", "category": "lab_test", "confidence": 0.92}
        ],
        "lab_values": {
            "glucose": [("145", "mg/dL")],
            "hemoglobin": [("12.5", "g/dL")],
            "cholesterol": [("220", "mg/dL")]
        },
        "quantities": ["145", "12.5", "220"],
        "lab_analysis": {
            "normal_values": [{"test": "hemoglobin", "value": 12.5, "unit": "g/dL", "status": "NORMAL"}],
            "abnormal_values": [
                {"test": "glucose", "value": 145, "unit": "mg/dL", "status": "HIGH"},
                {"test": "cholesterol", "value": 220, "unit": "mg/dL", "status": "HIGH"}
            ],
            "critical_values": []
        }
    }
    
    print("🧪 Testing Prompt Templates...")
    
    # Test lab analysis prompt
    formatted_data = prompt_manager.format_lab_data_for_prompt(sample_lab_data)
    lab_prompt = prompt_manager.get_lab_analysis_prompt(sample_lab_data)
    
    print("✅ Lab analysis prompt created")
    print(f"✅ Formatted data keys: {list(formatted_data.keys())}")
    
    # Test critical values prompt
    critical_prompt = prompt_manager.get_critical_values_prompt(sample_lab_data)
    print("✅ Critical values prompt created")
    
    # Test available templates
    templates = prompt_manager.get_available_templates()
    print(f"✅ Available templates: {len(templates)}")
    
    print("🎯 Prompt templates module ready for use!")