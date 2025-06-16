# MedicoBud API - Lab Report Analysis System

## Overview
Advanced medical lab report analysis system with OCR, Medical NER, and AI-powered insights using SNOMED CT integration.

## Features
- 🔬 **Medical Entity Extraction** with 50,000 SNOMED CT concepts
- 📊 **Lab Value Analysis** with reference ranges
- 🖼️ **OCR Processing** for images and PDFs
- 🤖 **AI-Powered Analysis** using LangChain and OpenAI
- 📋 **Smart Categorization** (lab_test, condition, finding, anatomy, etc.)

## System Requirements
- Python 3.12
- pip
- Git
- Tesseract OCR
- GPU (optional, for faster processing)

## Installation

### 1. Clone and Setup Environment
```bash
cd /home/sid/Workspace/python/medicobud/api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install System Dependencies
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract

# Windows - Download from GitHub releases
```

### 3. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 4. Install Custom Dependencies

#### MedCAT (Development Version)
⚠️ **Important**: We use a development version of MedCAT that differs from PyPI
```bash
pip uninstall medcat  # Remove if installed from requirements.txt
pip install git+https://github.com/CogStack/MedCAT.git
```

#### spaCy Language Model
```bash
python -m spacy download en_core_web_sm
```

#### Biomedical NER Models
Models are downloaded automatically on first use:
- `dmis-lab/biobert-v1.1-base-cased-ner` (GPU version)
- `allenai/scibert_scivocab_uncased` (CPU fallback)

### 5. SNOMED CT Setup
Place your licensed SNOMED CT file:
```
api/app/lab_report/MedCat_model/SnomedCT_InternationalRF2_PRODUCTION_20250601T120000Z.zip
```

### 6. Environment Variables
Create `.env` file:
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration (if using)
DATABASE_URL=postgresql://user:password@localhost/medicobud

# OCR Configuration (optional)
OCR_SPACE_API_KEY=your_ocr_space_key_here
```

## Lab Report System Architecture

### Core Components
1. **OCR Processor** (`ocr_processor.py`) - Text extraction from images/PDFs
2. **Medical Extractor** (`medical_extractor.py`) - NER with SNOMED CT integration
3. **LLM Client** (`llm_client.py`) - AI analysis using LangChain
4. **Lab Report** (`lab_report.py`) - Main integration module
5. **API Routes** (`lab_report_api.py`) - FastAPI endpoints

### Data Flow
```
Image/PDF → OCR → Medical NER → Entity Categorization → AI Analysis → Results
```

## Usage

### Testing the System
```bash
cd api/app/lab_report
python medical_extractor.py  # Test medical entity extraction
```

### Running the API
```bash
cd api
uvicorn main:app --reload --port 8000
```

### API Endpoints
- `POST /lab-report/analyze` - Analyze lab report from image/PDF
- `GET /lab-report/health` - System health check

## Medical Entity Categories
The system categorizes medical entities into:
- **lab_test**: Glucose, Hemoglobin, Cholesterol, etc.
- **condition**: Diabetes, Hypertension, Anemia, etc.
- **anatomy**: Heart, Liver, Kidney, etc.
- **medication**: Drugs, Treatments, etc.
- **procedure**: Surgery, Scans, etc.
- **finding**: Normal, Abnormal, High, Low, etc.

## Model Performance
- **SNOMED CT Concepts**: 50,000 medical concepts
- **Vocabulary Size**: ~48,800 terms
- **Entity Detection**: Direct SNOMED matching + regex fallback
- **Confidence Scoring**: 0.95 for exact SNOMED matches

## Troubleshooting

### Common Issues

#### MedCAT Version Conflicts
```bash
pip show medcat  # Check version
# Should show: Version: 0.0.2.dev138 (development version)
# If different, reinstall from GitHub
```

#### Missing spaCy Model
```bash
python -c "import spacy; spacy.load('en_core_web_sm')"
# If error, run: python -m spacy download en_core_web_sm
```

#### SNOMED CT Model Building
First run builds the model (takes ~5 minutes):
```bash
# Logs should show:
# INFO: Building MedCAT model manually from SNOMED CT
# INFO: Processed 50000 concepts...
# INFO: ✅ Model built and saved successfully
```

#### GPU Issues
```bash
python -c "import torch; print(torch.cuda.is_available())"
# System automatically falls back to CPU if GPU unavailable
```

## Development

### Project Structure
```
api/
├── app/
│   └── lab_report/
│       ├── medical_extractor.py    # Medical NER with SNOMED CT
│       ├── ocr_processor.py        # OCR processing
│       ├── llm_client.py          # LangChain integration
│       ├── lab_report.py          # Main integration
│       ├── lab_report_api.py      # API routes
│       └── MedCat_model/          # SNOMED CT data
├── requirements.txt
└── README.md
```

### Adding New Medical Categories
Modify `_categorize_medical_entity_from_cui()` in `medical_extractor.py`

### Custom OCR Providers
Extend `ocr_processor.py` with new OCR services

## License
- MedicoBud: [Your License]
- SNOMED CT: Licensed content (requires valid license)
- MedCAT: Apache 2.0
- Other dependencies: See individual licenses

## Support
For issues related to:
- SNOMED CT licensing: Contact SNOMED International
- MedCAT: GitHub Issues on CogStack/MedCAT
- System setup: Check troubleshooting section above