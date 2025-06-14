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

# Configure logging
logger = logging.getLogger(__name__)

class OCRProcessor:
    """Advanced OCR processing with Tesseract + OCR.space API fallback"""
    
    def __init__(self):
        self.tesseract_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,%():/-'
        self.ocr_space_api_key = os.getenv("OCR_SPACE_API_KEY")
        self.ocr_space_url = "https://api.ocr.space/parse/image"
        
        # Test Tesseract installation
        try:
            pytesseract.get_tesseract_version()
            logger.info("Tesseract OCR is available")
        except Exception as e:
            logger.warning(f"Tesseract OCR not available: {e}")
    
    def preprocess_image(self, image_path: str) -> Image.Image:
        """Enhance image quality for better OCR"""
        try:
            image = Image.open(image_path)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(2.0)
            
            # Apply slight blur to reduce noise
            image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
            
            logger.info(f"Image preprocessed: {image_path}")
            return image
            
        except Exception as e:
            logger.error(f"Error preprocessing image {image_path}: {e}")
            return Image.open(image_path)
    
    def extract_text_tesseract(self, image_path: str) -> str:
        """Extract text using Tesseract OCR"""
        try:
            processed_image = self.preprocess_image(image_path)
            
            text = pytesseract.image_to_string(
                processed_image,
                config=self.tesseract_config
            )
            
            logger.info(f"Tesseract extracted {len(text)} characters from {image_path}")
            return text.strip()
            
        except Exception as e:
            logger.error(f"Tesseract OCR failed for {image_path}: {e}")
            return ""
    
    def extract_text_ocr_space(self, image_path: str) -> str:
        """Extract text from image using OCR.space API"""
        try:
            if not self.ocr_space_api_key:
                logger.warning("OCR.space API key not provided. Set OCR_SPACE_API_KEY environment variable.")
                return ""
            
            with open(image_path, "rb") as image_file:
                # Prepare files for upload
                files = {
                    'file': (os.path.basename(image_path), image_file, 'image/jpeg')
                }
                
                # Prepare API request payload
                data = {
                    'apikey': self.ocr_space_api_key,
                    'language': 'eng',
                    'ocrEngine': '2',  # Engine 2 is more accurate for complex layouts
                    'detectOrientation': 'true',
                    'isTable': 'true',  # Better for lab reports with tabular data
                    'scale': 'true',
                    'isSearchablePdfHideTextLayer': 'true'
                }
                
                # Send POST request to OCR.space API
                response = requests.post(
                    self.ocr_space_url,
                    files=files,
                    data=data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if result.get("IsErroredOnProcessing"):
                        error_msg = result.get("ErrorMessage", ["Unknown error"])[0]
                        logger.error(f"OCR.space API error: {error_msg}")
                        return ""
                    
                    if result.get("ParsedResults"):
                        parsed_text = result["ParsedResults"][0]["ParsedText"]
                        logger.info(f"OCR.space API extracted {len(parsed_text)} characters from {image_path}")
                        return parsed_text
                    else:
                        logger.error("No parsed results from OCR.space API")
                        return ""
                else:
                    logger.error(f"OCR.space API request failed: {response.status_code} {response.text}")
                    return ""
        
        except Exception as e:
            logger.error(f"Error in OCR.space API processing: {e}")
            return ""
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            
            # First try direct text extraction from PDF
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page_num, page in enumerate(pdf_reader.pages):
                    page_text = page.extract_text()
                    if page_text.strip():
                        text += page_text + "\n"
                        logger.info(f"Extracted text from PDF page {page_num + 1}")
            
            # If direct extraction fails, convert to images and OCR
            if not text.strip():
                logger.info("PDF direct text extraction failed. Converting to images for OCR...")
                try:
                    images = convert_from_path(pdf_path)
                    
                    for i, image in enumerate(images):
                        # Save temporary image
                        temp_image_path = f"temp_pdf_page_{i}_{os.getpid()}.jpg"
                        image.save(temp_image_path, 'JPEG')
                        
                        try:
                            # Extract text from image
                            page_text = self.extract_text(temp_image_path)
                            text += page_text + "\n"
                        finally:
                            # Clean up temporary file
                            if os.path.exists(temp_image_path):
                                os.remove(temp_image_path)
                
                except Exception as pdf_to_image_error:
                    logger.error(f"PDF to image conversion failed: {pdf_to_image_error}")
                    return ""
            
            return self._clean_text(text)
            
        except Exception as e:
            logger.error(f"PDF processing failed for {pdf_path}: {e}")
            return ""
    
    def extract_text(self, file_path: str) -> str:
        """Extract text from image or PDF using Tesseract + OCR.space API fallback"""
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # Check file extension
            file_ext = os.path.splitext(file_path)[1].lower()
            
            if file_ext == '.pdf':
                return self.extract_text_from_pdf(file_path)
            
            # For image files - try multiple OCR methods
            logger.info(f"Starting OCR processing for {file_path}")
            
            # Step 1: Try Tesseract OCR first
            logger.info("Attempting Tesseract OCR...")
            tesseract_text = self.extract_text_tesseract(file_path)
            
            # Step 2: If Tesseract fails or returns poor results, try OCR.space API
            if not tesseract_text or len(tesseract_text.strip()) < 10:
                logger.info("Tesseract OCR failed or returned poor results. Trying OCR.space API...")
                ocr_space_text = self.extract_text_ocr_space(file_path)
                
                # Use the better result
                if ocr_space_text and len(ocr_space_text.strip()) > len(tesseract_text.strip()):
                    text = ocr_space_text
                    logger.info("OCR.space API provided better results")
                else:
                    text = tesseract_text
                    logger.info("Using Tesseract OCR results")
            else:
                text = tesseract_text
                logger.info("Tesseract OCR successful")
            
            # Clean extracted text
            cleaned_text = self._clean_text(text)
            
            logger.info(f"OCR completed. Extracted {len(cleaned_text)} characters from {file_path}")
            return cleaned_text
            
        except Exception as e:
            logger.error(f"OCR failed for {file_path}: {e}")
            raise Exception(f"OCR processing failed: {str(e)}")
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters that might be OCR artifacts
        text = re.sub(r'[^\w\s\.,\(\)\-\%\:\;\/\<\>]', '', text)
        
        # Fix common OCR mistakes in medical context
        replacements = {
            r'\bO\b(?=\s*\d)': '0',  # Letter O to number 0 before digits
            r'\bl\b(?=\s*\d)': '1',  # Letter l to number 1 before digits
            r'\bS\b(?=\s*\d)': '5',  # Letter S to number 5 before digits
            r'mg/dl': 'mg/dL',       # Standardize units
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
        """Get list of supported file formats"""
        return ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.pdf']
    
    def is_supported_format(self, file_path: str) -> bool:
        """Check if file format is supported"""
        file_ext = os.path.splitext(file_path)[1].lower()
        return file_ext in self.get_supported_formats()

# Usage example
if __name__ == "__main__":
    ocr = OCRProcessor()
    
    # Test with a sample image
    test_file = "sample_lab_report.jpg"
    if os.path.exists(test_file):
        try:
            text = ocr.extract_text(test_file)
            print(f"Extracted text ({len(text)} characters):")
            print(text[:500] + "..." if len(text) > 500 else text)
        except Exception as e:
            print(f"OCR failed: {e}")
    else:
        print(f"Test file not found: {test_file}")
        print("Supported formats:", ocr.get_supported_formats())