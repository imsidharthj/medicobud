"""
Medical Prompt Templates Module
Contains specialized prompt templates for medical lab report analysis
"""

import json
import re
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate

class MedicalPromptTemplates:
    """Medical-specific prompt templates for LLM analysis"""
    
    LAB_ANALYSIS_TEMPLATE = """You are MedicoBud, a medical AI for lab report analysis. Your response MUST be a single, valid JSON object, without any markdown formatting like ```json.

## INTERNAL PROCESSING INSTRUCTIONS (DO NOT OUTPUT THESE STEPS):

1. **DATA TYPE RECOGNITION**:
Below is a raw blob of text. First, tell me in one sentence what kind of data this is (e.g. "OCR'ed CBC table with test names, values, units, and reference ranges, chemisty panel, etc").

2. **INTERPRETATION INSTRUCTIONS**:
You will then parse every lab test, value, unit, and reference range—even though formatting is noisy.  
- Test names may be in ALL-CAPS or abbreviated.  
- Whenever you see a test name (ALL-CAPS or common abbreviation), start a new entry—even if on the same line.
- Unique tests: Treat each distinct test label (e.g. "Basophils" vs. "Absolute Basophil Count" or "MCV" vs. "MCH") as its own item.
- Identify all test names and numeric values. Values may be followed by units such as: g/dL, ×10³/µL, ×10⁹/L, million/µL, fL, pg, %, mg/dL, IU/L, mmol/L, mEq/L, minutes (min), seconds (s).
- Reference ranges follow each value.
- Rows may be concatenated; separate them.

3. **ANALYSIS - CRITICAL REQUIREMENT**:
- You MUST analyze EVERY SINGLE parsed value from INTERPRETATION. Do not skip, omit, or exclude ANY test value.
- For each test you parsed in INTERPRETATION, you MUST include it in the VALUES section in REQUIRED FORMAT.
- If you detect any likely parsing or OCR errors, exclude that value from analyse, and mention it in the SUMMARY as INTERPRETATION error in parentheses().
- Your job is to tell the user whether ALL their lab values are normal or need medical attention.
- For all values, you can infer the standard normal ranges independently based on commonly accepted clinical standards.

## Data:
Text: {lab_text}
Entities: {medical_entities}
Values: {lab_values}
Analysis: {lab_analysis}

## INSTRUCTIONS:
- Carefully extract ALL laboratory test names, their corresponding measured values, units, and reference ranges from the text provided, even if the text is unstructured or noisy.
- Pay attention to any numeric values directly following test names.
- If abnormality markers like "L" (Low), "H" (High), or other flags appear after values, include them when determining status.
- If multiple values are combined on one line, separate them into individual tests.
- If reference ranges are present after values, capture them accurately.
- Ignore any random, non-medical text or OCR noise.
- Use your full reasoning capability to deduce the correct values even if formatting is inconsistent.
- Do not skip any values present in the text.
- Your final output must be a single JSON object.

## REQUIRED JSON FORMAT (use EXACTLY this structure):
```json
{{
  "summary": "A brief, 1-2 sentence summary of the key findings.",
  "values": [
    {{
      "test": "Name of the Lab Test",
      "value": "Measured Value",
      "unit": "Unit of Measurement",
      "range": "Reference Range (e.g., '70-110')",
      "status": "NORMAL | HIGH | LOW | CRITICAL"
    }}
  ],
  "status": {{
    "normal": 0,
    "abnormal": 0,
    "critical": 0
  }},
  "recommendations": {{
    "lifestyle": "Specific, actionable lifestyle advice.",
    "followUp": "Recommendations for follow-up tests and timing.",
    "doctor": "Urgency and points to discuss with a doctor."
  }}
}}
```

## Rules for JSON content:
1.  **summary**: Max 2 sentences, summarizing key findings.
2.  **values**: An array of objects. INCLUDE ALL TESTS YOU PARSE.
    -   `status` must be one of: "NORMAL", "HIGH", "LOW", "CRITICAL".
3.  **status**: An object with the integer counts of normal, abnormal, and critical values. These counts must match the `values` array.
4.  **recommendations**: An object with specific, actionable advice for each category.
5.  **Units**: Standardize units in the `unit` field (e.g., mg/dL, g/dL, K/uL, mEq/L).
6.  **Critical thresholds**: Use these to determine "CRITICAL" status: Glucose <50/>400, Hemoglobin <7/>20, WBC <1/>50, Platelets <20/>1000, K+ <2.5/>6.0, Na+ <120/>160.
7.  **MANDATORY**: Every test parsed MUST appear as an object in the `values` array.
8.  **Output**: Ensure the entire output is a single valid JSON object and nothing else. Do not wrap it in markdown."""

class PromptManager:
    """Manages prompt templates and provides formatted prompts"""
    
    def __init__(self):
        self.templates = MedicalPromptTemplates()
    
    def get_lab_analysis_prompt(self, lab_data: Dict[str, Any]) -> ChatPromptTemplate:
        """Get formatted lab analysis prompt"""
        return ChatPromptTemplate.from_template(self.templates.LAB_ANALYSIS_TEMPLATE)
    
    def format_lab_data_for_prompt(self, lab_data: Dict[str, Any]) -> Dict[str, str]:
        """Format lab data for use in prompts"""
        return {
            "lab_text": lab_data.get("raw_text", "")[:2000],
            "medical_entities": self._format_entities(lab_data.get("medical_entities", [])),
            "lab_values": self._format_lab_values(lab_data.get("lab_values", {})),
            "quantities": ", ".join(lab_data.get("quantities", [])),
            "lab_analysis": self._format_lab_analysis(lab_data.get("lab_analysis", {}))
        }
    
    def _format_entities(self, entities: List[Dict[str, Any]]) -> str:
        """Format medical entities for prompt display"""
        if not entities:
            return "None"
        
        categories = {}
        for entity in entities[:10]:
            category = entity.get('category', 'Other')
            if category not in categories:
                categories[category] = []
            categories[category].append(entity.get('text', 'N/A'))
        
        formatted = []
        for category, texts in categories.items():
            formatted.append(f"{category}: {', '.join(texts[:3])}")
        
        return " | ".join(formatted)
    
    def _format_lab_values(self, lab_values: Dict[str, Any]) -> str:
        """Format lab values for prompt display"""
        if not lab_values:
            return "None"
        
        formatted = []
        for test_name, values in list(lab_values.items()):
            if isinstance(values, list) and values:
                value, unit = values[0]
                formatted.append(f"{test_name}: {value} {unit}")
            else:
                formatted.append(f"{test_name}: {values}")
        
        return " | ".join(formatted)
    
    def _format_lab_analysis(self, lab_analysis: Dict[str, Any]) -> str:
        """Format lab analysis results for prompt display"""
        if not lab_analysis:
            return "None"
        
        normal_count = len(lab_analysis.get("normal_values", []))
        abnormal_count = len(lab_analysis.get("abnormal_values", []))
        critical_count = len(lab_analysis.get("critical_values", []))
        
        summary = f"Normal: {normal_count}, Abnormal: {abnormal_count}, Critical: {critical_count}"
        
        critical = lab_analysis.get("critical_values", [])
        if critical:
            critical_details = []
            for item in critical[:3]:
                critical_details.append(f"{item.get('test', 'N/A')}: {item.get('value', 'N/A')}")
            summary += f" | CRITICAL: {', '.join(critical_details)}"
        
        return summary
    
    def validate_prompt_data(self, lab_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean lab data for prompts"""
        validated_data = {
            "raw_text": str(lab_data.get("raw_text", ""))[:1500],
            "medical_entities": lab_data.get("medical_entities", []),
            "lab_values": lab_data.get("lab_values", {}),
            "quantities": lab_data.get("quantities", []),
            "lab_analysis": lab_data.get("lab_analysis", {})
        }
        
        if not isinstance(validated_data["medical_entities"], list):
            validated_data["medical_entities"] = []
        
        if not isinstance(validated_data["lab_values"], dict):
            validated_data["lab_values"] = {}
        
        if not isinstance(validated_data["quantities"], list):
            validated_data["quantities"] = []
        
        return validated_data
    
    def parse_compact_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the JSON response from the LLM into a dictionary"""
        json_match = re.search(r'```json\s*([\s\S]*?)\s*```|({[\s\S]*})', response_text)
        
        if not json_match:
            return {"error": "Failed to parse LLM response", "raw_response": response_text}

        json_str = json_match.group(1) or json_match.group(2)
        
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            return {"error": "Invalid JSON format from LLM", "raw_response": json_str}

