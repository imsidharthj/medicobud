"""
OCR Processing Module
Handles text extraction from images and PDFs using Tesseract and OCR.space API
"""

import os
import re
import logging
from typing import Optional
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import PyPDF2
from pdf2image import convert_from_path
import requests

logger = logging.getLogger(__name__)

class OCRProcessor:
    """Advanced OCR processing with Tesseract + OCR.space API fallback"""
    
    def __init__(self):
        self.tesseract_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,%():/-'
        self.ocr_space_api_key = os.getenv("OCR_SPACE_API_KEY")
        self.ocr_space_url = "https://api.ocr.space/parse/image"
        self.max_retries = 2
        
        try:
            pytesseract.get_tesseract_version()
            logger.info("Tesseract OCR available")
        except Exception as e:
            logger.warning(f"Tesseract OCR unavailable: {e}")
    
    def preprocess_image(self, image_path: str) -> Image.Image:
        """Enhance image quality for better OCR"""
        try:
            image = Image.open(image_path)
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(2.0)
            
            image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
            
            return image
            
        except Exception as e:
            logger.error(f"Image preprocessing failed {image_path}: {e}")
            return Image.open(image_path)
    
    def extract_text_tesseract(self, image_path: str) -> str:
        """Extract text using Tesseract OCR with retry logic"""
        for attempt in range(self.max_retries + 1):
            try:
                processed_image = self.preprocess_image(image_path)
                text = pytesseract.image_to_string(processed_image, config=self.tesseract_config)
                
                if text.strip():
                    logger.info(f"Tesseract extracted {len(text)} characters")
                    return text.strip()
                elif attempt < self.max_retries:
                    logger.warning(f"Tesseract attempt {attempt + 1} returned empty, retrying...")
                    continue
                    
            except Exception as e:
                if attempt < self.max_retries:
                    logger.warning(f"Tesseract attempt {attempt + 1} failed: {e}, retrying...")
                    continue
                else:
                    logger.error(f"Tesseract failed after {self.max_retries + 1} attempts: {e}")
                    
        return ""
    
    def extract_text_ocr_space(self, image_path: str) -> str:
        """Extract text using OCR.space API with retry logic"""
        if not self.ocr_space_api_key:
            logger.warning("OCR.space API key not provided")
            return ""
        
        for attempt in range(self.max_retries + 1):
            try:
                with open(image_path, "rb") as image_file:
                    files = {'file': (os.path.basename(image_path), image_file, 'image/jpeg')}
                    
                    data = {
                        'apikey': self.ocr_space_api_key,
                        'language': 'eng',
                        'ocrEngine': '2',
                        'detectOrientation': 'true',
                        'isTable': 'true',
                        'scale': 'true',
                        'isSearchablePdfHideTextLayer': 'true'
                    }
                    
                    response = requests.post(self.ocr_space_url, files=files, data=data, timeout=30)
                    
                    if response.status_code == 200:
                        result = response.json()
                        
                        if result.get("IsErroredOnProcessing"):
                            error_msg = result.get("ErrorMessage", ["Unknown error"])[0]
                            if attempt < self.max_retries:
                                logger.warning(f"OCR.space attempt {attempt + 1} error: {error_msg}, retrying...")
                                continue
                            else:
                                logger.error(f"OCR.space failed after retries: {error_msg}")
                                return ""
                        
                        if result.get("ParsedResults"):
                            parsed_text = result["ParsedResults"][0]["ParsedText"]
                            if parsed_text.strip():
                                logger.info(f"OCR.space extracted {len(parsed_text)} characters")
                                return parsed_text
                            elif attempt < self.max_retries:
                                logger.warning(f"OCR.space attempt {attempt + 1} returned empty, retrying...")
                                continue
                    else:
                        if attempt < self.max_retries:
                            logger.warning(f"OCR.space attempt {attempt + 1} failed: {response.status_code}, retrying...")
                            continue
                        else:
                            logger.error(f"OCR.space failed after retries: {response.status_code}")
            
            except Exception as e:
                if attempt < self.max_retries:
                    logger.warning(f"OCR.space attempt {attempt + 1} error: {e}, retrying...")
                    continue
                else:
                    logger.error(f"OCR.space failed after {self.max_retries + 1} attempts: {e}")
                    
        return ""
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF with retry logic"""
        try:
            text = ""
            
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text.strip():
                        text += page_text + "\n"
            
            if not text.strip():
                logger.info("PDF direct extraction failed, converting to images")
                try:
                    images = convert_from_path(pdf_path)
                    
                    for i, image in enumerate(images):
                        temp_image_path = f"temp_pdf_page_{i}_{os.getpid()}.jpg"
                        image.save(temp_image_path, 'JPEG')
                        
                        try:
                            page_text = self.extract_text(temp_image_path)
                            text += page_text + "\n"
                        finally:
                            if os.path.exists(temp_image_path):
                                os.remove(temp_image_path)
                
                except Exception as pdf_error:
                    logger.error(f"PDF to image conversion failed: {pdf_error}")
                    raise Exception(f"PDF processing failed: {pdf_error}")
            
            return self._clean_text(text)
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            raise Exception(f"PDF processing failed: {e}")
    
    def extract_text(self, file_path: str) -> str:
        """Extract text with Tesseract + OCR.space fallback"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        
        logger.info(f"Processing {file_path}")
        
        tesseract_text = self.extract_text_tesseract(file_path)
        
        if not tesseract_text or len(tesseract_text.strip()) < 10:
            logger.info("Tesseract insufficient, trying OCR.space")
            ocr_space_text = self.extract_text_ocr_space(file_path)
            
            if ocr_space_text and len(ocr_space_text.strip()) > len(tesseract_text.strip()):
                text = ocr_space_text
                logger.info("Using OCR.space results")
            else:
                text = tesseract_text
                logger.info("Using Tesseract results")
        else:
            text = tesseract_text
            logger.info("Tesseract successful")
        
        if not text or len(text.strip()) < 5:
            raise Exception("No readable text found in image. Please ensure image is clear and contains text.")
        
        cleaned_text = self._clean_text(text)
        logger.info(f"Extracted {len(cleaned_text)} characters")
        return cleaned_text
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s\.,\(\)\-\%\:\;\/\<\>]', '', text)
        
        replacements = {
            r'\bO\b(?=\s*\d)': '0',
            r'\bl\b(?=\s*\d)': '1',
            r'\bS\b(?=\s*\d)': '5',
            r'mg/dl': 'mg/dL',
            r'g/dl': 'g/dL',
            r'meq/l': 'mEq/L',
            r'mmol/l': 'mmol/L',
            r'iu/l': 'IU/L',
            r'u/l': 'U/L'
        }
        
        for pattern, replacement in replacements.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def get_supported_formats(self) -> list:
        """Get supported file formats"""
        return ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.pdf']
    
    def is_supported_format(self, file_path: str) -> bool:
        """Check if file format is supported"""
        file_ext = os.path.splitext(file_path)[1].lower()
        return file_ext in self.get_supported_formats()