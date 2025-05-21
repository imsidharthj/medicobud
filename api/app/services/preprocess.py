import pandas as pd
import os
from typing import Dict, List

def create_symptom_relationships(dataset_path: str, output_path: str) -> None:
    """
    Create and save symptom relationships based on co-occurrence patterns
    
    Args:
        dataset_path: Path to the dataset CSV file
        output_path: Path to save the relationships CSV
    """
    print(f"Creating symptom relationships from {dataset_path} to {output_path}")
    
    try:
        df = pd.read_csv(dataset_path)
        
        # Extract all symptoms from dataset
        if "symptoms" in df.columns:
            # Handle case where symptoms are in a single column as comma-separated values
            all_symptoms = set()
            for symptoms in df['symptoms'].str.split(','):
                all_symptoms.update([s.strip() for s in symptoms])
        else:
            # Handle case where symptoms are in separate columns
            symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
            all_symptoms = set()
            for col in symptom_cols:
                symptoms = df[col].dropna().unique()
                all_symptoms.update([s.strip() for s in symptoms if pd.notna(s)])
        
        relationships = []
        
        # Process data in the format from dataset.csv (multiple Symptom_X columns)
        if "Disease" in df.columns and "Symptom_1" in df.columns:
            # Create a dictionary to track co-occurring symptoms
            co_occurrences = {}
            
            for _, row in df.iterrows():
                # Get all symptoms in this row (across multiple columns)
                symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
                row_symptoms = [row[col] for col in symptom_cols if pd.notna(row[col])]
                
                # Count co-occurrences
                for i, symptom1 in enumerate(row_symptoms):
                    symptom1 = symptom1.strip()
                    if symptom1 not in co_occurrences:
                        co_occurrences[symptom1] = {}
                        
                    for j, symptom2 in enumerate(row_symptoms):
                        symptom2 = symptom2.strip()
                        if i != j:  # Don't count a symptom with itself
                            co_occurrences[symptom1][symptom2] = co_occurrences[symptom1].get(symptom2, 0) + 1
            
            # Create relationships based on co-occurrences
            for symptom, related in co_occurrences.items():
                top_related = sorted(related.items(), key=lambda x: x[1], reverse=True)[:5]
                related_symptoms = [item[0] for item in top_related]
                relationships.append({'symptom': symptom, 'related_symptoms': ','.join(related_symptoms)})
        
        # Save relationships to CSV
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pd.DataFrame(relationships).to_csv(output_path, index=False)
        print(f"Saved symptom relationships to {output_path}")
    
    except Exception as e:
        print(f"Error creating symptom relationships: {e}")
        # Create an empty relationships file if we failed
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pd.DataFrame(columns=['symptom', 'related_symptoms']).to_csv(output_path, index=False)

def calculate_symptom_weights(dataset_path: str, output_path: str) -> None:
    """
    Calculate weights for symptoms based on their frequency in the dataset
    
    Args:
        dataset_path: Path to the dataset CSV file
        output_path: Path to save the weights CSV
    """
    print(f"Calculating symptom weights from {dataset_path} to {output_path}")
    
    try:
        df = pd.read_csv(dataset_path)
        
        # Count symptom frequency
        symptom_counts = {}
        
        if "symptoms" in df.columns:
            # For single column format
            for symptoms in df['symptoms'].str.split(','):
                for symptom in symptoms:
                    symptom = symptom.strip()
                    if symptom:
                        symptom_counts[symptom] = symptom_counts.get(symptom, 0) + 1
        else:
            # For multi-column format
            symptom_cols = [col for col in df.columns if col.startswith('Symptom_')]
            for _, row in df.iterrows():
                for col in symptom_cols:
                    if pd.notna(row[col]):
                        symptom = row[col].strip()
                        symptom_counts[symptom] = symptom_counts.get(symptom, 0) + 1
        
        # Convert counts to weights (more frequent = more weight)
        max_count = max(symptom_counts.values()) if symptom_counts else 1
        symptom_weights = [{"symptom": s, "weight": round(c/max_count, 2)} 
                          for s, c in symptom_counts.items()]
        
        # Save weights
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        weights_df = pd.DataFrame(symptom_weights)
        weights_df.to_csv(output_path, index=False)
        print(f"Saved symptom weights to {output_path}")
    
    except Exception as e:
        print(f"Error calculating symptom weights: {e}")
        # Create an empty weights file if we failed
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        pd.DataFrame(columns=['symptom', 'weight']).to_csv(output_path, index=False)