"""
Medical Prompt Templates Module
Contains specialized prompt templates for medical lab report analysis
"""

import json
from typing import Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate

class MedicalPromptTemplates:
    """Medical-specific prompt templates for LLM analysis"""
    
    # Token-optimized lab analysis template with comprehensive response format
    LAB_ANALYSIS_TEMPLATE = """You are MedicoBud, a medical AI for lab report analysis.

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

## REQUIRED FORMAT (use EXACTLY this structure):

**SUMMARY:** [1-2 sentences max]

**VALUES:**
[Test]: [Value] ([Range]) [Status] | [Test]: [Value] ([Range]) [Status]
[CONTINUE FOR ALL PARSED VALUES - DO NOT LIMIT TO 8 TESTS]

**STATUS:** Normal: X | Abnormal: Y | Critical: Z

**RECOMMENDATIONS:**
🏃 Lifestyle: [2-3 specific actions]
🔬 Follow-up: [timing and tests]
👨‍⚕️ Doctor: [urgency and discussion points]

## Rules:
1. **SUMMARY**: Max 2 sentences, key findings only
2. **VALUES**: Pipe-separated format, INCLUDE ALL TESTS FROM INTERPRETATION, use emojis:
   - ✅ NORMAL | ⚠️ HIGH/LOW | 🚨 CRITICAL
3. **STATUS**: Count accurately from ALL values in VALUES section
4. **RECOMMENDATIONS**: Max 2 bullet points per section
5. Units: Use mg/dL, g/dL, K/uL, mEq/L (standardized)
6. Critical thresholds: Glucose <50/>400, Hemoglobin <7/>20, WBC <1/>50, Platelets <20/>1000, K+ <2.5/>6.0, Na+ <120/>160
7. **MANDATORY**: Every test parsed in INTERPRETATION MUST appear in the VALUES section

**Language**: Patient-friendly, avoid diagnosis terms, use "may suggest" not "indicates"."""

    # Compact trend analysis template  
    TREND_ANALYSIS_TEMPLATE = """**TREND ANALYSIS:**

Current: {current_results}
Previous: {previous_results}
Period: {time_period}

**FORMAT:**
**CHANGES:** [Test]: [Direction] [Rate] | [Test]: [Direction] [Rate]
**PATTERNS:** [Key observations]
**MONITORING:** [Frequency recommendations]

**Rules:** Use ↑↓→ arrows, keep concise."""

    # Compact medication interaction template
    MEDICATION_INTERACTION_TEMPLATE = """**MEDICATION ANALYSIS:**

Labs: {lab_results}
Meds: {medications}

**FORMAT:**
**EFFECTS:** [Med]: affects [Test] | [Med]: affects [Test] 
**MONITORING:** [Tests to watch]
**TIMING:** [Lab timing recommendations]

**Rules:** Focus on clinically significant interactions only."""
    
    # Removed CRITICAL_VALUES_TEMPLATE as it's now integrated

class PromptManager:
    """Manages prompt templates and provides formatted prompts"""
    
    def __init__(self):
        self.templates = MedicalPromptTemplates()
    
    def get_lab_analysis_prompt(self, lab_data: Dict[str, Any]) -> ChatPromptTemplate:
        """Get formatted lab analysis prompt"""
        # The prompt will now implicitly handle critical values
        prompt = ChatPromptTemplate.from_template(
            self.templates.LAB_ANALYSIS_TEMPLATE
        )
        return prompt
    
    # Removed get_critical_values_prompt as it's no longer needed

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
        """Format medical entities for prompt display - compact version"""
        if not entities:
            return "None"
        
        # Group by category for more compact display
        categories = {}
        for entity in entities[:10]:  # Reduced from 20 to 10
            category = entity.get('category', 'Other')
            if category not in categories:
                categories[category] = []
            categories[category].append(entity.get('text', 'N/A'))
        
        formatted = []
        for category, texts in categories.items():
            formatted.append(f"{category}: {', '.join(texts[:3])}")  # Max 3 per category
        
        return " | ".join(formatted)
    
    def _format_lab_values(self, lab_values: Dict[str, Any]) -> str:
        """Format lab values for prompt display - compact version"""
        if not lab_values:
            return "None"
        
        formatted = []
        for test_name, values in list(lab_values.items()):  # Max 8 tests
            if isinstance(values, list) and values:
                value, unit = values[0]  # Take first value only
                formatted.append(f"{test_name}: {value} {unit}")
            else:
                formatted.append(f"{test_name}: {values}")
        
        return " | ".join(formatted)
    
    def _format_lab_analysis(self, lab_analysis: Dict[str, Any]) -> str:
        """Format lab analysis results for prompt display - compact version"""
        if not lab_analysis:
            return "None"
        
        # Count totals for compact display
        normal_count = len(lab_analysis.get("normal_values", []))
        abnormal_count = len(lab_analysis.get("abnormal_values", []))
        critical_count = len(lab_analysis.get("critical_values", []))
        
        summary = f"Normal: {normal_count}, Abnormal: {abnormal_count}, Critical: {critical_count}"
        
        # Add critical details if any
        critical = lab_analysis.get("critical_values", [])
        if critical:
            critical_details = []
            for item in critical[:3]:  # Max 3 critical items
                critical_details.append(f"{item.get('test', 'N/A')}: {item.get('value', 'N/A')}")
            summary += f" | CRITICAL: {', '.join(critical_details)}"
        
        return summary
    
    def create_custom_prompt(self, template: str, variables: Dict[str, Any]) -> ChatPromptTemplate:
        """Create a custom prompt template"""
        return ChatPromptTemplate.from_template(template)
    
    def get_available_templates(self) -> List[str]:
        """Get list of available template names"""
        return [
            "LAB_ANALYSIS_TEMPLATE",
            "TREND_ANALYSIS_TEMPLATE",
            "MEDICATION_INTERACTION_TEMPLATE"
        ]
    
    def validate_prompt_data(self, lab_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean lab data for prompts"""
        validated_data = {
            "raw_text": str(lab_data.get("raw_text", ""))[:1500],  # Further reduced for token optimization
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
    
    def parse_compact_response(self, response_text: str) -> Dict[str, Any]:
        """Parse the compact response format into structured data for UI"""
        import re
        
        parsed = {
            "summary": "",
            "values": [],
            "status": {"normal": 0, "abnormal": 0, "critical": 0},
            "recommendations": {
                "lifestyle": "",
                "followup": "",
                "doctor": ""
            }
        }
        
        # Extract summary
        summary_match = re.search(r'\*\*SUMMARY:\*\*\s*(.+)', response_text)
        if summary_match:
            parsed["summary"] = summary_match.group(1).strip()
        
        # Extract values (pipe-separated format)
        values_match = re.search(r'\*\*VALUES:\*\*\s*(.+)', response_text)
        if values_match:
            values_line = values_match.group(1).strip()
            # Split by | and parse each value
            for value_item in values_line.split('|'):
                value_item = value_item.strip()
                if ':' in value_item:
                    # Parse format: "Test: Value (Range) Status"
                    test_match = re.match(r'([^:]+):\s*([^(]+)\s*\(([^)]+)\)\s*(.*)', value_item)
                    if test_match:
                        test_name, value, range_info, status = test_match.groups()
                        # Determine status from emoji or text
                        if '🚨' in status or 'CRITICAL' in status:
                            status_type = 'critical'
                        elif '⚠️' in status or 'HIGH' in status or 'LOW' in status:
                            status_type = 'abnormal'
                        else:
                            status_type = 'normal'
                        
                        parsed["values"].append({
                            "test": test_name.strip(),
                            "value": value.strip(),
                            "range": range_info.strip(),
                            "status": status_type,
                            "display_status": status.strip()
                        })
        
        # Extract status counts
        status_match = re.search(r'\*\*STATUS:\*\*\s*Normal:\s*(\d+)\s*\|\s*Abnormal:\s*(\d+)\s*\|\s*Critical:\s*(\d+)', response_text)
        if status_match:
            parsed["status"]["normal"] = int(status_match.group(1))
            parsed["status"]["abnormal"] = int(status_match.group(2))
            parsed["status"]["critical"] = int(status_match.group(3))
        
        # Extract recommendations
        recs_section = re.search(r'\*\*RECOMMENDATIONS:\*\*\s*(.*?)(?:\*\*|$)', response_text, re.DOTALL)
        if recs_section:
            recs_text = recs_section.group(1)
            
            lifestyle_match = re.search(r'🏃\s*Lifestyle:\s*([^🔬👨‍⚕️]+)', recs_text)
            if lifestyle_match:
                parsed["recommendations"]["lifestyle"] = lifestyle_match.group(1).strip()
            
            followup_match = re.search(r'🔬\s*Follow-up:\s*([^🏃👨‍⚕️]+)', recs_text)
            if followup_match:
                parsed["recommendations"]["followup"] = followup_match.group(1).strip()
            
            doctor_match = re.search(r'👨‍⚕️\s*Doctor:\s*([^🏃🔬]+)', recs_text)
            if doctor_match:
                parsed["recommendations"]["doctor"] = doctor_match.group(1).strip()
        
        return parsed

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
            "critical_values": [] # Example: if glucose was 45, it would be here
        }
    }
    
    print("🧪 Testing Prompt Templates...")
    
    # Test lab analysis prompt (now includes critical values logic)
    formatted_data = prompt_manager.format_lab_data_for_prompt(sample_lab_data)
    lab_prompt_messages = prompt_manager.get_lab_analysis_prompt(sample_lab_data).format_prompt(**formatted_data).to_messages()
    
    print("✅ Lab analysis prompt created (now includes critical values logic)")
    print(f"✅ Formatted data keys: {list(formatted_data.keys())}")
    
    # Test available templates
    templates = prompt_manager.get_available_templates()
    print(f"✅ Available templates: {len(templates)} - 'CRITICAL_VALUES_TEMPLATE' should be gone")
    
    # You can print the generated prompt to inspect it
    # print("\n--- Generated Lab Analysis Prompt ---")
    # for message in lab_prompt_messages:
    #    print(f"Role: {message.type}\nContent: {message.content}\n---")

    print("\n🎯 Prompt templates module ready for consolidated analysis!")

